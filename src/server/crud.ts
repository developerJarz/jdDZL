import { ObjectId, type Db, type Document } from "mongodb";
import type { ZodTypeAny } from "zod";
import { HttpError, json } from "./http";

export const oid = (value: string | undefined) => {
  if (!/^[a-f0-9]{24}$/i.test(value || "")) throw new HttpError(400, "Invalid record ID.");
  return new ObjectId(value);
};
export const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function audit(database: Db, actorId: string, action: string, entityId: string, detail: string) {
  await database.collection("audit").insertOne({ action, entityId, actorId, detail, createdAt: new Date() });
}

export interface CrudOptions {
  collection: string;
  schema: ZodTypeAny;
  /** Fields searched by `?q=`. */
  search: string[];
  sort?: Document;
  label: (doc: Document) => string;
  /** Turns validated input into the stored document (e.g. dates, derived fields). */
  prepare?: (input: Document) => Document;
  /** Throws to block a delete (e.g. record in use). */
  beforeDelete?: (doc: Document, database: Db) => Promise<void>;
  /** Extra filters from query params. */
  filter?: (params: URLSearchParams) => Document;
}

/** List / get / create / update / delete for simple dashboard collections. */
export async function crud(
  options: CrudOptions,
  method: string,
  recordId: string | undefined,
  request: Request,
  database: Db,
  actorId: string,
  input?: unknown,
) {
  const collection = database.collection(options.collection);
  const name = options.collection;
  if (method === "GET") {
    if (recordId) {
      const item = await collection.findOne({ _id: oid(recordId) });
      if (!item) throw new HttpError(404, "Record not found.");
      return json({ item });
    }
    const params = new URL(request.url).searchParams;
    const page = Math.max(1, Math.floor(Number(params.get("page")) || 1));
    const limit = Math.min(200, Math.max(1, Math.floor(Number(params.get("limit")) || 25)));
    const filter: Document = { ...(options.filter?.(params) ?? {}) };
    const q = params.get("q")?.trim().slice(0, 100);
    if (q) filter.$or = options.search.map((f) => ({ [f]: { $regex: escapeRegex(q), $options: "i" } }));
    const [items, total] = await Promise.all([
      collection.find(filter).sort(options.sort ?? { createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
      collection.countDocuments(filter),
    ]);
    return json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  }
  if (method === "DELETE") {
    const doc = await collection.findOne({ _id: oid(recordId) });
    if (!doc) throw new HttpError(404, "Record not found.");
    await options.beforeDelete?.(doc, database);
    await collection.deleteOne({ _id: doc._id });
    await audit(database, actorId, `${name}.delete`, String(doc._id), options.label(doc));
    return json({ ok: true });
  }
  const data = options.schema.parse(input);
  const document = options.prepare ? options.prepare(data) : data;
  if (method === "POST" && !recordId) {
    const result = await collection.insertOne({ ...document, createdAt: new Date(), updatedAt: new Date() });
    await audit(database, actorId, `${name}.create`, String(result.insertedId), options.label(document));
    return json({ ok: true, id: result.insertedId }, 201);
  }
  if (method === "PATCH" && recordId) {
    const result = await collection.updateOne({ _id: oid(recordId) }, { $set: { ...document, updatedAt: new Date() } });
    if (!result.matchedCount) throw new HttpError(404, "Record not found.");
    await audit(database, actorId, `${name}.update`, recordId, options.label(document));
    return json({ ok: true });
  }
  throw new HttpError(405, "Method not allowed.");
}
