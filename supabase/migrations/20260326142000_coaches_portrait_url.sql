-- 搭班師傅頭像（可由後台上傳或貼網址）
ALTER TABLE public.coaches
ADD COLUMN IF NOT EXISTS portrait_url TEXT;
