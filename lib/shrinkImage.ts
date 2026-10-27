/**
 * Phone photos run 4–8 MB; a vision model reads print and handwriting fine at
 * ~1800px, and the smaller upload is far kinder to mobile data and to the
 * request size limit. Browser-only.
 */
export function shrinkImage(file: File, maxSide = 1800): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error("Could not process the photo"))), "image/jpeg", 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not open this image")); };
    img.src = url;
  });
}
