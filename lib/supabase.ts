import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
const configured = Boolean(url && serviceKey);

export const supabaseAdmin = configured
  ? createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

export const PRODUCT_IMAGES_BUCKET = "product-images";
export const ATTACHMENTS_BUCKET = "attachments";

export function isSupabaseStorageConfigured() {
  return configured;
}
