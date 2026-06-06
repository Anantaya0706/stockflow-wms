/* ===================================================================
   StockFlow WMS — Supabase client
   แก้ไข SUPABASE_URL และ SUPABASE_ANON_KEY ด้านล่างก่อนใช้งาน
   =================================================================== */

const SUPABASE_URL      = "REPLACE_WITH_YOUR_PROJECT_URL";   // https://xxxx.supabase.co
const SUPABASE_ANON_KEY = "REPLACE_WITH_YOUR_ANON_KEY";      // eyJhbG...

/* สร้าง lightweight Supabase REST client (ไม่ต้องใช้ npm) */
const SB = (() => {
  const base = SUPABASE_URL + "/rest/v1";
  const rpc  = SUPABASE_URL + "/rest/v1/rpc";
  const headers = {
    "apikey":        SUPABASE_ANON_KEY,
    "Authorization": "Bearer " + SUPABASE_ANON_KEY,
    "Content-Type":  "application/json",
    "Prefer":        "return=representation",
  };

  async function get(path, params = {}) {
    const q = new URLSearchParams(params).toString();
    const res = await fetch(`${base}/${path}${q ? "?" + q : ""}`, { headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function post(path, body) {
    const res = await fetch(`${rpc}/${path}`, {
      method: "POST", headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  async function patch(path, match, body) {
    const q = new URLSearchParams(match).toString();
    const res = await fetch(`${base}/${path}?${q}`, {
      method: "PATCH", headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return true;
  }

  return { get, post, patch };
})();

/* ────────────────────────────────────────────────────────────────
   API helpers — mirror the shape that store.jsx expects
   ──────────────────────────────────────────────────────────────── */

const SBAPI = {
  /* ดึง warehouses ทั้งหมด */
  async getWarehouses() {
    return SB.get("warehouses", { order: "code" });
  },

  /* ดึง products ทั้งหมด */
  async getProducts() {
    return SB.get("products", { order: "brand,size" });
  },

  /* ดึง stock matrix → { [productId]: { [warehouseId]: qty } } */
  async getStock() {
    const rows = await SB.get("stock", { select: "product_id,warehouse_id,qty" });
    const matrix = {};
    for (const r of rows) {
      if (!matrix[r.product_id]) matrix[r.product_id] = {};
      matrix[r.product_id][r.warehouse_id] = r.qty;
    }
    return matrix;
  },

  /* ดึง movements ล่าสุด 200 รายการ */
  async getMovements(limit = 200) {
    const rows = await SB.get("movements", {
      order: "ts.desc",
      limit,
      select: "id,type,product_id,qty,from_wh,to_wh,partner,reason_en,reason_th,doc_ref,operator,status,ts",
    });
    /* แปลง column name ให้ตรงกับ shape ที่ store.jsx ใช้ */
    return rows.map(r => ({
      id: r.id, type: r.type, productId: r.product_id, qty: r.qty,
      fromWh: r.from_wh, toWh: r.to_wh,
      partner: r.partner, reason: r.reason_en ? { en: r.reason_en, th: r.reason_th } : undefined,
      docRef: r.doc_ref, operator: r.operator, status: r.status, ts: r.ts,
    }));
  },

  /* โพสต์รายการ (เรียก SQL function ใน Supabase) */
  async postTransaction({ kind, lines, fromWh, toWh, partner, reason, docRef, operator }) {
    const refs = [];
    for (const ln of lines) {
      const ref = await SB.post("post_transaction", {
        p_type:       kind,
        p_product_id: ln.productId,
        p_qty:        ln.qty,
        p_from_wh:    fromWh   || null,
        p_to_wh:      toWh     || null,
        p_partner:    partner  || null,
        p_reason_en:  reason?.en || null,
        p_reason_th:  reason?.th || null,
        p_doc_ref:    docRef   || null,
        p_operator:   operator || "Admin",
      });
      refs.push(ref);
    }
    return refs;
  },

  /* ยอดรวมทุกคลัง */
  async getGrandTotal() {
    const rows = await SB.post("get_grand_total", {});
    return rows?.[0] || { total_qty: 0, total_pcs: 0, total_value: 0 };
  },

  /* สินค้า reorder alert */
  async getLowStock() {
    return SB.post("get_low_stock", {});
  },
};

window.SB     = SB;
window.SBAPI  = SBAPI;

/* flag ให้ store.jsx รู้ว่าใช้ Supabase */
window.WMS_USE_SUPABASE = (
  SUPABASE_URL !== "REPLACE_WITH_YOUR_PROJECT_URL" &&
  SUPABASE_ANON_KEY !== "REPLACE_WITH_YOUR_ANON_KEY"
);
