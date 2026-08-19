/**
 * Convert a `data:` URL into a Blob/File without going through `fetch()`.
 *
 * `fetch(dataUrl)` is governed by the CSP `connect-src` directive, and our
 * policy (see proxy.ts) only allows 'self' + a few analytics hosts — so in
 * production every such call is refused by the browser and the surrounding
 * try/catch swallowed it as a generic "upload failed". Decoding with atob()
 * is not a network request, so it works under any policy.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const commaIdx = dataUrl.indexOf(",");
  if (!dataUrl.startsWith("data:") || commaIdx === -1) {
    throw new Error("Not a data URL");
  }

  const meta = dataUrl.slice(5, commaIdx); // e.g. "image/png;base64"
  const isBase64 = /;base64/i.test(meta);
  const mime = meta.split(";")[0] || "image/png";
  const payload = dataUrl.slice(commaIdx + 1);

  if (!isBase64) {
    return new Blob([decodeURIComponent(payload)], { type: mime });
  }

  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function dataUrlToFile(dataUrl: string, filename: string): File {
  const blob = dataUrlToBlob(dataUrl);
  return new File([blob], filename, { type: blob.type || "image/png" });
}
