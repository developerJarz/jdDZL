import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { ObjectId } from "mongodb";
import { db } from "./db";
import { HttpError } from "./http";
import { apiPermissions, canAny, isStaffRole, type StaffUser } from "@/lib/permissions";

const COOKIE = "dazzle_session";
const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export async function user() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const database = await db();
  const session = await database
    .collection("sessions")
    .findOne({ tokenHash: digest(token), expiresAt: { $gt: new Date() } });
  if (!session) return null;
  return database
    .collection("users")
    .findOne(
      { _id: new ObjectId(session.userId), active: { $ne: false } },
      { projection: { passwordHash: 0 } },
    );
}
export async function requireUser(admin = false) {
  const current = await user();
  if (!current) throw new HttpError(401, "Please sign in.");
  if (admin && !isStaffRole(current.role))
    throw new HttpError(403, "Administrator access required.");
  return current;
}
/** Staff guard for `/api/commerce/admin/...`: role check plus the area's permission. */
export async function authorizeAdmin(path: string[], method: string) {
  const current = await requireUser(true);
  const need = apiPermissions(path, method);
  if (need !== "any-staff" && !canAny(current as unknown as StaffUser, need))
    throw new HttpError(403, "Your staff role does not include access to this area.");
  return current;
}
export async function startSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 86400_000);
  await (
    await db()
  )
    .collection("sessions")
    .insertOne({ tokenHash: digest(token), userId, expiresAt });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}
export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token)
    await (
      await db()
    )
      .collection("sessions")
      .deleteOne({ tokenHash: digest(token) });
  jar.delete(COOKIE);
}
