import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { uploadLandingImageFromFile } from "@/lib/uploadLandingImage";

type Props = {
  storeId: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
};

/**
 * 圖片網址輸入 + 後台上傳（api-admin → landing-images bucket）
 */
export function AdminLandingImageField({ storeId, label, hint, value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!storeId?.trim()) {
      toast.error("請先選擇店家");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadLandingImageFromFile(storeId.trim(), file);
      onChange(url);
      toast.success("圖片上傳完成");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "上傳失敗";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Input
          className="min-w-[200px] flex-1 font-mono text-xs"
          placeholder="https://…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFile}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={uploading}
          className="shrink-0 gap-1"
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          上傳
        </Button>
        {value.trim() ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
            清除
          </Button>
        ) : null}
      </div>
      {value.trim() ? (
        <div className="mt-2 overflow-hidden rounded-md border bg-muted/30">
          <img
            src={value.trim()}
            alt=""
            className="max-h-40 w-full object-contain object-center"
          />
        </div>
      ) : null}
    </div>
  );
}
