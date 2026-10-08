import { v2 as cloudinary } from "cloudinary";
import { randomUUID } from "crypto";

/**
 * Public media — avatars, company logos, product images — lives on Cloudinary.
 *
 * Sensitive files (passport and CNIC scans, attachments, invoices) do not come
 * here: they stay in the private Supabase bucket behind signed URLs. Anything
 * uploaded through this module is reachable by anyone holding its URL.
 *
 * Until CLOUDINARY_URL (or the three CLOUDINARY_* keys) is set, every helper
 * reports "not configured" and the calling route keeps its old storage path,
 * so the keys can be added without a deploy breaking uploads.
 */

const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim() || "";
const apiKey = process.env.CLOUDINARY_API_KEY?.trim() || "";
const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim() || "";
const hasUrl = Boolean(process.env.CLOUDINARY_URL?.trim());
const configured = hasUrl || Boolean(cloudName && apiKey && apiSecret);

if (configured && !hasUrl) {
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
} else if (configured) {
  // CLOUDINARY_URL is read from the environment by the SDK itself.
  cloudinary.config({ secure: true });
}

/** Top-level folder, so dev and production uploads never share a namespace. */
const ROOT = process.env.CLOUDINARY_FOLDER?.trim() || (process.env.NODE_ENV === "production" ? "finova" : "finova-dev");

export type MediaKind = "avatars" | "logos" | "products";

export function isMediaConfigured(): boolean {
  return configured;
}

const DATA_URL = /^data:([a-z]+\/[a-z0-9+.-]+);base64,(.+)$/i;

/** Decode a base64 data URL into bytes and its MIME type, or null if it is not one. */
export function decodeDataUrl(value: string): { buffer: Buffer; mime: string } | null {
  const match = DATA_URL.exec(value);
  if (!match) return null;
  return { mime: match[1].toLowerCase(), buffer: Buffer.from(match[2], "base64") };
}

/**
 * Upload an image and return its HTTPS URL.
 * `scope` is the company or user id the file belongs to, and becomes a folder.
 */
export async function uploadMedia(
  input: Buffer | string,
  opts: { kind: MediaKind; scope: string },
): Promise<string> {
  if (!configured) throw new Error("Cloudinary is not configured");

  let buffer: Buffer;
  if (typeof input === "string") {
    const decoded = decodeDataUrl(input);
    if (!decoded) throw new Error("Not a data URL");
    buffer = decoded.buffer;
  } else {
    buffer = input;
  }

  const folder = `${ROOT}/${opts.kind}/${opts.scope.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, public_id: randomUUID(), resource_type: "image", overwrite: false },
      (error, res) => (error || !res ? reject(error || new Error("Upload failed")) : resolve(res)),
    );
    stream.end(buffer);
  });
  return result.secure_url;
}

/** True for a URL this module produced (any Cloudinary delivery URL on our cloud). */
export function isCloudinaryUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    return new URL(url).hostname === "res.cloudinary.com";
  } catch {
    return false;
  }
}

/**
 * Delete a previously uploaded image by its URL. Best-effort: a failure here
 * leaves an orphan on Cloudinary, never a broken record, so it only logs.
 * `scope` guards against one tenant deleting another tenant's file.
 */
export async function deleteMedia(url: string | null | undefined, opts: { kind: MediaKind; scope: string }): Promise<void> {
  if (!configured || !isCloudinaryUrl(url)) return;
  const folder = `${ROOT}/${opts.kind}/${opts.scope.replace(/[^a-zA-Z0-9_-]/g, "_")}/`;
  // .../image/upload/v1712345678/<folder>/<uuid>.<ext>
  const match = /\/image\/upload\/(?:v\d+\/)?(.+)\.[a-z0-9]+$/i.exec(new URL(url!).pathname);
  const publicId = match?.[1];
  if (!publicId || !publicId.startsWith(folder)) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  } catch (err) {
    console.error("Cloudinary delete failed:", err);
  }
}
