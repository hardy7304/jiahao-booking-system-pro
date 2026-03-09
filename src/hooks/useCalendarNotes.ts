import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_NOTES = `• 請於預約時間前 5 分鐘到場
• 如需取消或更改，請至少提前 2 小時聯繫
• 未到或遲到超過 15 分鐘視為放棄預約
• 聯繫方式：請透過預約系統或電話聯繫`;

export function useCalendarNotes() {
  const [notes, setNotes] = useState(DEFAULT_NOTES);

  const fetchNotes = useCallback(async () => {
    const { data } = await supabase
      .from("system_config")
      .select("*")
      .eq("key", "calendar_notes")
      .single();
    if (data) setNotes(data.value as string);
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const updateNotes = async (newNotes: string) => {
    await supabase
      .from("system_config")
      .update({ value: newNotes, updated_at: new Date().toISOString() } as any)
      .eq("key", "calendar_notes");
    setNotes(newNotes);
  };

  return { notes, updateNotes, refetch: fetchNotes };
}
