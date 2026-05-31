import { supabase } from "../lib/supabase";

/**
 * Upload a local image URI to a Supabase Storage bucket (deleting any existing
 * object at the same path first so caches don't block the upsert) and return a
 * cache-busted public URL.
 */
export async function uploadImageToStorage(
  bucket: string,
  path: string,
  uri: string,
  mimeType = "image/jpeg",
): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
  await supabase.storage.from(bucket).remove([path]);
  const { error } = await supabase.storage.from(bucket).upload(path, arrayBuffer, { contentType: mimeType, upsert: true });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
  return `${publicUrl}?t=${Date.now()}`;
}
