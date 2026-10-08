import { createHash } from "node:crypto";
import { hash } from "bcryptjs";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { db, mongo } from "./db";
import { body, HttpError, json, rateLimit } from "./http";
export async function recovery(request: Request, reset: boolean) {
  await rateLimit(request, reset ? "reset-password" : "recovery-request", 5);
  const database = await db();
  if (!reset) {
    const { username } = z
      .object({ username: z.string().trim().min(3).max(180) })
      .parse(await body(request));
    const account = await database
      .collection("users")
      .findOne({
        $or: [{ email: username.toLowerCase() }, { phone: username }],
        role: "customer",
        active: { $ne: false },
      });
    if (account)
      await database
        .collection("messages")
        .updateOne(
          {
            kind: "account-recovery",
            "data.userId": account._id.toString(),
            status: "new",
          },
          {
            $setOnInsert: {
              kind: "account-recovery",
              data: {
                userId: account._id.toString(),
                name: account.name,
                email: account.email,
                phone: account.phone,
                message:
                  "Customer requests account recovery. Verify identity using the existing account contact details before issuing a reset link.",
              },
              status: "new",
              createdAt: new Date(),
            },
          },
          { upsert: true },
        );
    return json({
      ok: true,
      message:
        "If a matching customer account exists, a recovery request has been sent to the store. Staff will verify your identity through your registered contact details.",
    });
  }
  const { token, password } = z
    .object({
      token: z.string().regex(/^[a-f0-9]{64}$/),
      password: z.string().min(8).max(72),
    })
    .parse(await body(request));
  const passwordHash = await hash(password, 12);
  const session = (await mongo()).startSession();
  try {
    await session.withTransaction(async () => {
      const resetToken = await database
        .collection("passwordResets")
        .findOneAndDelete(
          {
            tokenHash: createHash("sha256").update(token).digest("hex"),
            expiresAt: { $gt: new Date() },
          },
          { session },
        );
      if (!resetToken)
        throw new HttpError(
          400,
          "This reset link is invalid or expired. Request a new link from the store.",
        );
      const updated = await database
        .collection("users")
        .updateOne(
          {
            _id: new ObjectId(resetToken.userId),
            role: "customer",
            active: { $ne: false },
          },
          { $set: { passwordHash, updatedAt: new Date() } },
          { session },
        );
      if (!updated.matchedCount)
        throw new HttpError(
          400,
          "Account recovery is unavailable for this account.",
        );
      await database
        .collection("sessions")
        .deleteMany({ userId: resetToken.userId }, { session });
      await database
        .collection("passwordResets")
        .deleteMany({ userId: resetToken.userId }, { session });
      await database
        .collection("audit")
        .insertOne(
          {
            action: "customer.password-reset",
            entityId: resetToken.userId,
            actorId: resetToken.userId,
            detail: "Password reset completed; sessions revoked",
            createdAt: new Date(),
          },
          { session },
        );
    });
  } finally {
    await session.endSession();
  }
  return json({
    ok: true,
    message: "Password updated. Sign in with your new password.",
  });
}
