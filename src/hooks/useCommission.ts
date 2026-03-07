import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ServiceDeduction {
  name: string;
  deduction: number;
}

export function useCommission() {
  const [commissionRate, setCommissionRate] = useState(0.6);
  const [serviceDeductions, setServiceDeductions] = useState<ServiceDeduction[]>([]);

  const fetchConfig = useCallback(async () => {
    const { data } = await supabase
      .from("system_config")
      .select("*")
      .eq("key", "commission_rate")
      .single();
    if (data) setCommissionRate(parseFloat(data.value as string) || 0.6);
  }, []);

  const fetchDeductions = useCallback(async () => {
    const { data } = await supabase.from("services").select("name, deduction");
    if (data) setServiceDeductions(data as ServiceDeduction[]);
  }, []);

  useEffect(() => {
    fetchConfig();
    fetchDeductions();
  }, [fetchConfig, fetchDeductions]);

  const getDeduction = (serviceName: string): number => {
    const match = serviceDeductions.find((s) => serviceName.includes(s.name) || s.name.includes(serviceName));
    return match?.deduction || 0;
  };

  const calcBase = (totalPrice: number, serviceName: string) => {
    return totalPrice - getDeduction(serviceName);
  };

  const calcTherapist = (totalPrice: number, serviceName: string) => {
    return Math.floor(calcBase(totalPrice, serviceName) * commissionRate);
  };

  const calcShop = (totalPrice: number, serviceName: string) => {
    return Math.floor(calcBase(totalPrice, serviceName) * (1 - commissionRate));
  };

  const updateRate = async (rate: number) => {
    await supabase.from("system_config").update({ value: rate.toString(), updated_at: new Date().toISOString() } as any).eq("key", "commission_rate");
    setCommissionRate(rate);
  };

  return {
    commissionRate,
    updateRate,
    getDeduction,
    calcBase,
    calcTherapist,
    calcShop,
    refetch: () => { fetchConfig(); fetchDeductions(); },
  };
}
