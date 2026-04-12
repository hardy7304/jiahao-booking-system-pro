import { adminApi } from "@/lib/adminApi";
import { blobToBase64, compressImageToJpeg } from "@/lib/imageCompress";

/**
 * 後台上傳首頁圖片（經 api-admin + service role 寫入 `landing-images` bucket）
 */
export async function uploadLandingImageFromFile(
  storeId: string,
  file: File,
): Promise<string> {
  const jpeg = await compressImageToJpeg(file);
  const b64 = await blobToBase64(jpeg);
  const res = await adminApi(
    "landing.upload_image",
    { file_base64: b64, content_type: "image/jpeg" },
    storeId,
  );
  const url = res.public_url;
  if (typeof url !== "string" || !url.startsWith("http")) {
    throw new Error("上傳成功但未取得圖片網址");
  }
  return url;
}
