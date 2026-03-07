const services = [
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

const addons = [
  { name: '加購：足湯肩頸 (20分)', duration: 20, price: 450, type: 'addon' },
  { name: '加購：刮痧 (30分)', duration: 30, price: 650, type: 'addon' },
  { name: '加購：筋膜刀肩頸 (30分)', duration: 30, price: 800, type: 'addon' },
  { name: '升級：腳底精油 (含乳液/油)', duration: 0, price: 300, type: 'upgrade' },
];

const aromas = [
  { name: '精油香味：苦橙 (協助放鬆)', type: 'aroma' },
  { name: '精油香味：玫瑰 (愉悅心情)', type: 'aroma' },
  { name: '精油香味：薰衣草 (幫助睡眠)', type: 'aroma' },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
  }

  return new Response(
    JSON.stringify({ services, addons, aromas, business_hours: { open: 14, close: 26, timezone: "Asia/Taipei" } }),
    { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
  );
});
