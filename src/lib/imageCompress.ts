/**
 * 將圖片壓縮為 JPEG（後台上傳用，降低 Edge payload）
 */
export async function compressImageToJpeg(
  file: File,
  maxWidth = 1600,
  quality = 0.88,
): Promise<Blob> {
  if (!file.type.startsWith("image/")) {
    throw new Error("請選擇圖片檔（JPG / PNG / WebP 等）");
  }
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxWidth / bitmap.width);
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("無法處理圖片");
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", quality),
    );
    if (!blob) throw new Error("圖片壓縮失敗");
    return blob;
  } finally {
    bitmap.close();
  }
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = r.result as string;
      const i = s.indexOf(",");
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    r.onerror = () => reject(new Error("讀取圖片失敗"));
    r.readAsDataURL(blob);
  });
}
