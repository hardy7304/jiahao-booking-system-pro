import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ServiceDeduction {
  name: string;
  deduction: number;
}

interface AddonPrice {
  name: string;
  extra_price: number;
  deduction: number;
}

export function useCommission() {
  const [commissionRate, setCommissionRate] = useState(0.6);
  const [serviceDeductions, setServiceDeductions] = useState<ServiceDeduction[]>([]);
  const [addonPrices, setAddonPrices] = useState<AddonPrice[]>([]);

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

  const fetchAddonPrices = useCallback(async () => {
    const { data } = await supabase.from("addons").select("name, extra_price, deduction");
    if (data) setAddonPrices(data as AddonPrice[]);
  }, []);

  useEffect(() => {
    fetchConfig();
    fetchDeductions();
    fetchAddonPrices();
  }, [fetchConfig, fetchDeductions, fetchAddonPrices]);

  const getDeduction = (serviceName: string): number => {
    const match = serviceDeductions.find((s) => serviceName.includes(s.name) || s.name.includes(serviceName));
    return match?.deduction || 0;
  };

  /** Calculate total addon price from a booking's addons array */
  const getAddonTotal = (addons?: string[] | null): number => {
    if (!addons || addons.length === 0) return 0;
    return addons.reduce((sum, addonName) => {
      const match = addonPrices.find((a) => addonName.includes(a.name) || a.name.includes(addonName));
      return sum + (match?.extra_price || 0);
    }, 0);
  };

  /** Calculate total addon deductions from a booking's addons array */
  const getAddonDeduction = (addons?: string[] | null): number => {
    if (!addons || addons.length === 0) return 0;
    return addons.reduce((sum, addonName) => {
      const match = addonPrices.find((a) => addonName.includes(a.name) || a.name.includes(addonName));
      return sum + (match?.deduction || 0);
    }, 0);
  };

  /** Base = (totalPrice - addonPrices - addonDeductions - serviceDeduction) */
  const calcBase = (totalPrice: number, serviceName: string, addons?: string[] | null) => {
    const addonTotal = getAddonTotal(addons);
    const addonDed = getAddonDeduction(addons);
    return totalPrice - addonTotal - addonDed - getDeduction(serviceName);
  };

  const calcTherapist = (totalPrice: number, serviceName: string, addons?: string[] | null) => {
    return Math.floor(calcBase(totalPrice, serviceName, addons) * commissionRate);
  };

  const calcShop = (totalPrice: number, serviceName: string, addons?: string[] | null) => {
    return Math.floor(calcBase(totalPrice, serviceName, addons) * (1 - commissionRate));
  };

  const updateRate = async (rate: number) => {
    await supabase.from("system_config").update({ value: rate.toString(), updated_at: new Date().toISOString() } as any).eq("key", "commission_rate");
    setCommissionRate(rate);
  };

  return {
    commissionRate,
    updateRate,
    getDeduction,
    getAddonTotal,
    getAddonDeduction,
    calcBase,
    calcTherapist,
    calcShop,
    refetch: () => { fetchConfig(); fetchDeductions(); fetchAddonPrices(); },
  };
}
