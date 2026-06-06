/* ===================================================================
   StockFlow WMS — mock data
   5 warehouses · 30 diaper SKUs · deterministic stock matrix · seed log
   Exposed on window.WMS
   =================================================================== */
(function () {
  // tiny seeded PRNG so the dataset is stable across reloads
  let _s = 20260606;
  const rnd = () => { _s = (_s * 1103515245 + 12345) & 0x7fffffff; return _s / 0x7fffffff; };
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

  // ---------- warehouses ----------
  const warehouses = [
    { id: "WH-BKK", code: "WH01", name: "Bangkok Central DC", nameTh: "ศูนย์กระจายสินค้ากรุงเทพฯ", city: "Bangkok", cityTh: "กรุงเทพฯ", region: "Central", cap: 60000 },
    { id: "WH-CBI", code: "WH02", name: "Chonburi Hub",        nameTh: "คลังสินค้าชลบุรี",          city: "Chonburi", cityTh: "ชลบุรี", region: "East", cap: 24000 },
    { id: "WH-CNX", code: "WH03", name: "Chiang Mai Depot",    nameTh: "คลังสินค้าเชียงใหม่",        city: "Chiang Mai", cityTh: "เชียงใหม่", region: "North", cap: 20000 },
    { id: "WH-KKC", code: "WH04", name: "Khon Kaen Depot",     nameTh: "คลังสินค้าขอนแก่น",         city: "Khon Kaen", cityTh: "ขอนแก่น", region: "Northeast", cap: 24000 },
    { id: "WH-HDY", code: "WH05", name: "Hat Yai Depot",       nameTh: "คลังสินค้าหาดใหญ่",         city: "Hat Yai", cityTh: "หาดใหญ่", region: "South", cap: 22000 },
  ];

  // ---------- product master (fictional brands to avoid trademarks) ----------
  const brands = [
    { b: "BabySoft",   th: "เบบี้ซอฟท์" },
    { b: "DryNight",   th: "ดรายไนท์" },
    { b: "PureCare",   th: "เพียวแคร์" },
    { b: "CloudBaby",  th: "คลาวด์เบบี้" },
    { b: "LittleStep", th: "ลิตเทิลสเต็ป" },
    { b: "NanoDry",    th: "นาโนดราย" },
  ];
  const sizes = [
    { s: "NB", th: "แรกเกิด", kg: "<5kg" },
    { s: "S",  th: "เล็ก",    kg: "4–8kg" },
    { s: "M",  th: "กลาง",    kg: "6–11kg" },
    { s: "L",  th: "ใหญ่",    kg: "9–14kg" },
    { s: "XL", th: "ใหญ่พิเศษ", kg: "12–17kg" },
    { s: "XXL",th: "จัมโบ้",  kg: ">15kg" },
  ];
  const forms = [
    { f: "Tape",  th: "แบบเทป" },
    { f: "Pants", th: "แบบกางเกง" },
  ];

  const sizeIdx = { NB: 0, S: 1, M: 2, L: 3, XL: 4, XXL: 5 };
  // a representative catalog of 30 SKUs
  const combos = [
    ["BabySoft","NB","Tape",44],["BabySoft","S","Tape",64],["BabySoft","M","Pants",54],["BabySoft","L","Pants",48],["BabySoft","XL","Pants",42],
    ["DryNight","M","Pants",56],["DryNight","L","Pants",50],["DryNight","XL","Pants",44],["DryNight","XXL","Pants",38],
    ["PureCare","NB","Tape",48],["PureCare","S","Tape",60],["PureCare","M","Tape",52],["PureCare","L","Tape",46],["PureCare","XL","Pants",40],
    ["CloudBaby","S","Pants",62],["CloudBaby","M","Pants",54],["CloudBaby","L","Pants",46],["CloudBaby","XL","Pants",40],["CloudBaby","XXL","Pants",34],
    ["LittleStep","NB","Tape",46],["LittleStep","S","Tape",58],["LittleStep","M","Pants",50],["LittleStep","L","Pants",44],["LittleStep","XL","Pants",38],
    ["NanoDry","S","Pants",60],["NanoDry","M","Pants",52],["NanoDry","L","Pants",46],["NanoDry","XL","Pants",40],["NanoDry","XXL","Pants",36],
    ["DryNight","S","Tape",58],
  ];

  const brandMap = Object.fromEntries(brands.map(x => [x.b, x.th]));
  const sizeMap = Object.fromEntries(sizes.map(x => [x.s, x]));
  const formMap = Object.fromEntries(forms.map(x => [x.f, x.th]));

  const products = combos.map((c, i) => {
    const [brand, size, form, count] = c;
    const bcode = brand.replace(/[a-z]/g, "").slice(0, 2).toUpperCase().padEnd(2, "X");
    const sku = `DP-${bcode}-${size}-${count}`;
    const ean = "885" + String(1000000000 + ri(0, 8999999999)).slice(0, 10);
    const cost = +(2.2 + sizeIdx[size] * 0.55 + (form === "Pants" ? 0.7 : 0)).toFixed(2);
    const price = +(cost * (1.55 + rnd() * 0.25)).toFixed(2);
    const reorder = [600, 700, 800, 650, 500][i % 5];
    return {
      id: sku, sku,
      name: `${brand} ${form} ${size} ×${count}`,
      nameTh: `${brandMap[brand]} ${formMap[form]} ไซส์ ${size} ${count} ชิ้น`,
      brand, brandTh: brandMap[brand],
      size, sizeTh: sizeMap[size].th, weight: sizeMap[size].kg,
      form, formTh: formMap[form],
      count, ean,
      cost, price,
      uom: "Carton", uomPcs: count,
      reorder,
      category: "Baby Diapers",
      categoryTh: "ผ้าอ้อมเด็ก",
      shelfLife: "36 months",
      origin: pick(["Thailand", "Thailand", "Japan", "Malaysia"]),
    };
  });

  // ---------- stock matrix: stock[productId][warehouseId] = qty (cartons) ----------
  const stock = {};
  products.forEach((p, i) => {
    stock[p.id] = {};
    warehouses.forEach((w, wi) => {
      // central holds more; some intentionally low / zero for alerts
      const base = wi === 0 ? ri(900, 2600) : ri(120, 1100);
      let q = base;
      if ((i + wi) % 11 === 0) q = ri(0, 90);        // low / critical
      if ((i * 3 + wi) % 17 === 0) q = 0;            // out of stock
      stock[p.id][w.id] = q;
    });
  });

  // ---------- seed movement history ----------
  const refTypes = {
    INBOUND:  { prefix: "GRN", labelEn: "Receiving",  labelTh: "รับสินค้า" },
    OUTBOUND: { prefix: "DO",  labelEn: "Shipping",   labelTh: "จัดส่งสินค้า" },
    TRANSFER: { prefix: "TRF", labelEn: "Transfer",   labelTh: "โอนระหว่างคลัง" },
    DAMAGE:   { prefix: "DMG", labelEn: "Damaged",    labelTh: "สินค้าเสียหาย" },
  };
  const partnersIn = ["Thai Hygiene Mfg.", "Siam Nonwoven Co.", "Asia Pulp Supplies", "Bangkok Converting"];
  const partnersOut = ["Lotus's DC", "Big C Distribution", "7-Eleven CDC", "Tops Market", "Watsons TH", "Shopee Mall"];
  const damageReasons = [
    { en: "Water damage", th: "เปียกน้ำ" },
    { en: "Torn packaging", th: "บรรจุภัณฑ์ฉีกขาด" },
    { en: "Crushed in transit", th: "เสียหายจากการขนส่ง" },
    { en: "Expired", th: "หมดอายุ" },
    { en: "Pest contamination", th: "ปนเปื้อนจากแมลง" },
  ];
  const operators = ["S. Phuwadon", "N. Chaiyaporn", "K. Wannisa", "T. Apinya", "R. Suchart"];

  const now = new Date("2026-06-06T09:30:00");
  let seq = 4820;
  const movements = [];
  const seedCount = 46;
  const forceToday = ["INBOUND", "OUTBOUND", "INBOUND", "TRANSFER", "OUTBOUND", "INBOUND", "OUTBOUND", "DAMAGE"];
  for (let i = 0; i < seedCount; i++) {
    const type = i < forceToday.length ? forceToday[i] : pick(["INBOUND", "OUTBOUND", "OUTBOUND", "TRANSFER", "INBOUND", "DAMAGE"]);
    const p = pick(products);
    const qty = type === "DAMAGE" ? ri(2, 30) : ri(40, 480);
    const minsAgo = i < forceToday.length ? ri(20, 60) + i * ri(25, 55) : i * ri(35, 240) + ri(5, 60);
    const ts = new Date(now.getTime() - minsAgo * 60000);
    const m = {
      id: `${refTypes[type].prefix}-26${String(seq--).padStart(5, "0")}`,
      type, productId: p.id, qty,
      ts: ts.toISOString(),
      operator: pick(operators),
      status: "Posted",
    };
    if (type === "INBOUND") { m.toWh = pick(warehouses).id; m.partner = pick(partnersIn); }
    else if (type === "OUTBOUND") { m.fromWh = pick(warehouses).id; m.partner = pick(partnersOut); }
    else if (type === "TRANSFER") {
      const a = pick(warehouses); let b = pick(warehouses);
      while (b.id === a.id) b = pick(warehouses);
      m.fromWh = a.id; m.toWh = b.id;
    } else if (type === "DAMAGE") { m.fromWh = pick(warehouses).id; m.reason = pick(damageReasons); }
    movements.push(m);
  }
  movements.sort((a, b) => new Date(b.ts) - new Date(a.ts));

  // 14-day trend (units in, units out) for dashboard
  const trend = [];
  for (let d = 13; d >= 0; d--) {
    const date = new Date(now.getTime() - d * 86400000);
    trend.push({
      date: date.toISOString().slice(0, 10),
      inb: ri(1800, 4200),
      out: ri(1600, 4000),
    });
  }

  // ---------- helpers ----------
  const fmt = (n) => (n == null ? "—" : Number(n).toLocaleString("en-US"));
  const baht = (n) => "฿" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  window.WMS = {
    warehouses, products, stock, movements, trend,
    refTypes, partnersIn, partnersOut, damageReasons, operators,
    brands, sizes, forms,
    fmt, baht,
    whById: Object.fromEntries(warehouses.map(w => [w.id, w])),
    prodById: Object.fromEntries(products.map(p => [p.id, p])),
    // OCR simulation samples — what the "scanner" extracts
    ocrSamples: [
      { brand: "BabySoft", brandTh: "เบบี้ซอฟท์", form: "Pants", formTh: "แบบกางเกง", size: "L", count: 48, ean: "8851047720193", weight: "9–14kg", origin: "Thailand", category: "Baby Diapers", confidence: 0.97 },
      { brand: "DryNight", brandTh: "ดรายไนท์", form: "Pants", formTh: "แบบกางเกง", size: "XL", count: 44, ean: "8852236610047", weight: "12–17kg", origin: "Thailand", category: "Baby Diapers", confidence: 0.94 },
      { brand: "PureCare", brandTh: "เพียวแคร์", form: "Tape", formTh: "แบบเทป", size: "M", count: 52, ean: "8859920184471", weight: "6–11kg", origin: "Japan", category: "Baby Diapers", confidence: 0.96 },
      { brand: "CloudBaby", brandTh: "คลาวด์เบบี้", form: "Pants", formTh: "แบบกางเกง", size: "S", count: 62, ean: "8853310550288", weight: "4–8kg", origin: "Malaysia", category: "Baby Diapers", confidence: 0.92 },
    ],
  };
})();
