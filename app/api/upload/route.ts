import { NextRequest, NextResponse } from "next/server";
import { isSupabaseStorageConfigured, supabaseAdmin, PRODUCT_IMAGES_BUCKET } from "@/lib/supabase";
import { resolveCompanyId } from "@/lib/tenant";
import { randomUUID } from "crypto";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type))
      return NextResponse.json({ error: "Only JPEG, PNG, WebP, or GIF allowed" }, { status: 400 });
    if (file.size > MAX_BYTES)
      return NextResponse.json({ error: "Image must be under 2 MB" }, { status: 400 });

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${companyId}/${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    if (isSupabaseStorageConfigured() && supabaseAdmin) {
      try {
        const { error } = await supabaseAdmin.storage
          .from(PRODUCT_IMAGES_BUCKET)
          .upload(path, buffer, { contentType: file.type, upsert: false });

        if (!error) {
          const { data: { publicUrl } } = supabaseAdmin.storage
            .from(PRODUCT_IMAGES_BUCKET)
            .getPublicUrl(path);

          return NextResponse.json({ url: publicUrl });
        }

        console.error("Supabase upload error:", error.message, error);
      } catch (error) {
        console.error("Supabase upload exception:", error);
      }
    } else {
      console.error("UPLOAD: Supabase storage is not configured; using inline image fallback");
    }

    const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;
    return NextResponse.json({ url: dataUrl, storage: "inline" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Upload failed";
    console.error("UPLOAD exception:", msg, e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { url: imageUrl } = await req.json();
    if (!imageUrl) return NextResponse.json({ error: "URL required" }, { status: 400 });
    if (String(imageUrl).startsWith("data:")) return NextResponse.json({ ok: true });

    // Extract path from public URL: .../product-images/companyId/uuid.ext
    const bucketPrefix = `${PRODUCT_IMAGES_BUCKET}/`;
    const idx = imageUrl.indexOf(bucketPrefix);
    if (idx === -1) return NextResponse.json({ error: "Invalid URL" }, { status: 400 });

    const path = imageUrl.slice(idx + bucketPrefix.length);

    // Only allow deleting own company's files
    if (!path.startsWith(`${companyId}/`))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    if (supabaseAdmin) {
      await supabaseAdmin.storage.from(PRODUCT_IMAGES_BUCKET).remove([path]);
    }
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Delete failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
