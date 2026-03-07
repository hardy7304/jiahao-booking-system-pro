export interface Service {
  name: string;
  duration: number;
  price: number;
  category: 'combo' | 'foot' | 'body' | 'fascia-foot' | 'fascia-body' | 'package';
}

export interface AddOn {
  name: string;
  duration: number;
  price: number;
  type: 'addon' | 'upgrade' | 'aroma';
}

export const services: Service[] = [
  { name: '深層雙拼 (筋膜刀身體60分 + 全身指壓60分)', duration: 120, price: 2900, category: 'combo' },
  { name: '腳底按摩 (40分)', duration: 40, price: 800, category: 'foot' },
  { name: '腳底按摩 (60分)', duration: 60, price: 1200, category: 'foot' },
  { name: '腳底按摩 (80分)', duration: 80, price: 1600, category: 'foot' },
  { name: '全身指壓 (60分)', duration: 60, price: 1100, category: 'body' },
  { name: '全身指壓 (90分)', duration: 90, price: 1650, category: 'body' },
  { name: '全身指壓 (120分)', duration: 120, price: 2200, category: 'body' },
  { name: '筋膜刀【腳底】(40分)', duration: 40, price: 1200, category: 'fascia-foot' },
  { name: '筋膜刀【腳底】(60分)', duration: 60, price: 1750, category: 'fascia-foot' },
  { name: '筋膜刀【身體】(60分)', duration: 60, price: 1800, category: 'fascia-body' },
  { name: '筋膜刀【身體】(90分)', duration: 90, price: 2600, category: 'fascia-body' },
  { name: '筋膜刀【身體】(120分)', duration: 120, price: 3400, category: 'fascia-body' },
  { name: '延禧套餐 (腳底精油60分+肩頸10分)', duration: 70, price: 1549, category: 'package' },
  { name: '如懿套餐 (腳底精油80分+肩頸10分)', duration: 90, price: 1949, category: 'package' },
  { name: '甄環套餐 (指壓60分+腳底60分+肩頸10分)', duration: 130, price: 2349, category: 'package' },
  { name: '乾隆套餐 (全身精油60分+腳底精油40分+肩頸10分)', duration: 110, price: 2699, category: 'package' },
];

export const addons: AddOn[] = [
  { name: '加購：足湯肩頸 (20分)', duration: 20, price: 450, type: 'addon' },
  { name: '加購：刮痧 (30分)', duration: 30, price: 650, type: 'addon' },
  { name: '加購：筋膜刀肩頸 (30分)', duration: 30, price: 800, type: 'addon' },
  { name: '升級：腳底精油 (含乳液/油)', duration: 0, price: 300, type: 'upgrade' },
];

export const aromas: AddOn[] = [
  { name: '精油香味：苦橙 (協助放鬆)', duration: 0, price: 0, type: 'aroma' },
  { name: '精油香味：玫瑰 (愉悅心情)', duration: 0, price: 0, type: 'aroma' },
  { name: '精油香味：薰衣草 (幫助睡眠)', duration: 0, price: 0, type: 'aroma' },
];

export function getAvailableAddons(service: Service | null): AddOn[] {
  if (!service) return [];
  
  // 服務名稱包含「套餐」、「深層雙拼」或「筋膜刀」: 完全隱藏所有加購
  if (service.name.includes('套餐') || service.name.includes('深層雙拼') || service.name.includes('筋膜刀')) return [];
  
  return addons.filter(addon => {
    // 非腳底按摩類服務: 隱藏「筋膜刀肩頸」
    if (service.category !== 'foot' && service.category !== 'fascia-foot' && addon.name.includes('筋膜刀肩頸')) {
      return false;
    }
    
    // 全身指壓 / 筋膜刀【身體】: 隱藏「精油升級」和「足湯肩頸」
    if (['body', 'fascia-body'].includes(service.category)) {
      if (addon.type === 'upgrade' || addon.name.includes('足湯肩頸')) return false;
    }
    
    // 筋膜刀【身體】: 額外隱藏「刮痧」
    if (service.category === 'fascia-body' && addon.name.includes('刮痧')) {
      return false;
    }
    
    return true;
  });
}

export function formatHourToTime(hour: number): string {
  const displayHour = hour >= 24 ? hour - 24 : hour;
  const h = Math.floor(displayHour);
  const m = (displayHour % 1) * 60;
  return `${h.toString().padStart(2, '0')}:${m === 0 ? '00' : '30'}`;
}

export function generateTimeSlots(): number[] {
  const slots: number[] = [];
  for (let h = 14; h < 26; h += 0.5) {
    slots.push(h);
  }
  return slots;
}

export const BUFFER_MINUTES = 10;
