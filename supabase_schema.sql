-- ================================================================
-- StockFlow WMS — Supabase Schema
-- วิธีใช้: Supabase Dashboard → SQL Editor → New query → วางทั้งหมด → Run
-- ================================================================

-- ================================================================
-- 1. TABLES
-- ================================================================

CREATE TABLE IF NOT EXISTS warehouses (
  id          TEXT PRIMARY KEY,        -- WH-BKK, WH-CBI, …
  code        TEXT NOT NULL UNIQUE,    -- WH01, WH02, …
  name        TEXT NOT NULL,
  name_th     TEXT NOT NULL,
  city        TEXT NOT NULL,
  city_th     TEXT NOT NULL,
  region      TEXT NOT NULL,
  capacity    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id              TEXT PRIMARY KEY,    -- same as SKU: DP-BS-NB-44
  sku             TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  name_th         TEXT NOT NULL,
  brand           TEXT NOT NULL,
  brand_th        TEXT NOT NULL,
  size            TEXT NOT NULL,
  size_th         TEXT NOT NULL,
  weight_range    TEXT,
  form            TEXT NOT NULL,       -- Tape | Pants
  form_th         TEXT NOT NULL,
  pieces_per_ctn  INTEGER NOT NULL,
  ean             TEXT,
  cost            NUMERIC(10,2) NOT NULL,
  price           NUMERIC(10,2) NOT NULL,
  uom             TEXT NOT NULL DEFAULT 'Carton',
  reorder_point   INTEGER NOT NULL DEFAULT 0,
  category        TEXT NOT NULL DEFAULT 'Baby Diapers',
  category_th     TEXT NOT NULL DEFAULT 'ผ้าอ้อมเด็ก',
  shelf_life      TEXT DEFAULT '36 months',
  origin          TEXT,
  image_url       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock (
  product_id    TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  warehouse_id  TEXT NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  qty           INTEGER NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (product_id, warehouse_id),
  CONSTRAINT qty_non_negative CHECK (qty >= 0)
);

CREATE TABLE IF NOT EXISTS movements (
  id          TEXT PRIMARY KEY,        -- GRN-264820, DO-264819, …
  type        TEXT NOT NULL CHECK (type IN ('INBOUND','OUTBOUND','TRANSFER','DAMAGE')),
  product_id  TEXT NOT NULL REFERENCES products(id),
  qty         INTEGER NOT NULL CHECK (qty > 0),
  from_wh     TEXT REFERENCES warehouses(id),
  to_wh       TEXT REFERENCES warehouses(id),
  partner     TEXT,
  reason_en   TEXT,
  reason_th   TEXT,
  doc_ref     TEXT,
  operator    TEXT NOT NULL DEFAULT 'Admin',
  status      TEXT NOT NULL DEFAULT 'Posted',
  ts          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- 2. INDEXES
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_movements_ts       ON movements(ts DESC);
CREATE INDEX IF NOT EXISTS idx_movements_type     ON movements(type);
CREATE INDEX IF NOT EXISTS idx_movements_product  ON movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_from_wh  ON movements(from_wh);
CREATE INDEX IF NOT EXISTS idx_movements_to_wh    ON movements(to_wh);
CREATE INDEX IF NOT EXISTS idx_stock_warehouse    ON stock(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_products_brand     ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_size      ON products(size);

-- ================================================================
-- 3. ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE products   ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock      ENABLE ROW LEVEL SECURITY;
ALTER TABLE movements  ENABLE ROW LEVEL SECURITY;

-- Authenticated users: full access
CREATE POLICY "auth_all_warehouses" ON warehouses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_products"   ON products   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_stock"      ON stock      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_movements"  ON movements  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Anonymous: read-only (ลบ policy นี้เมื่อ go-live จริง)
CREATE POLICY "anon_read_warehouses" ON warehouses FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_products"   ON products   FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_stock"      ON stock      FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_movements"  ON movements  FOR SELECT TO anon USING (true);

-- ================================================================
-- 4. VIEWS
-- ================================================================

-- ยอดสต็อกรวมต่อสินค้า (ทุกคลัง)
CREATE OR REPLACE VIEW v_stock_by_product AS
SELECT
  p.id,
  p.sku,
  p.name,
  p.name_th,
  p.brand,
  p.brand_th,
  p.size,
  p.size_th,
  p.form,
  p.form_th,
  p.pieces_per_ctn,
  p.cost,
  p.price,
  p.reorder_point,
  COALESCE(SUM(s.qty), 0)                        AS total_qty,
  COALESCE(SUM(s.qty) * p.pieces_per_ctn, 0)     AS total_pcs,
  COALESCE(SUM(s.qty) * p.price, 0)              AS total_value,
  CASE
    WHEN COALESCE(SUM(s.qty), 0) = 0               THEN 'OUT'
    WHEN COALESCE(SUM(s.qty), 0) <= p.reorder_point THEN 'LOW'
    ELSE 'OK'
  END AS stock_status
FROM products p
LEFT JOIN stock s ON s.product_id = p.id
GROUP BY p.id;

-- ยอดสต็อกต่อคลัง
CREATE OR REPLACE VIEW v_stock_by_warehouse AS
SELECT
  w.id,
  w.code,
  w.name,
  w.name_th,
  w.city,
  w.city_th,
  w.region,
  w.capacity,
  COALESCE(SUM(s.qty), 0)                                                    AS total_qty,
  COALESCE(SUM(s.qty * p.pieces_per_ctn), 0)                                 AS total_pcs,
  COALESCE(SUM(s.qty * p.price), 0)                                           AS total_value,
  COUNT(DISTINCT CASE WHEN s.qty > 0 THEN s.product_id END)                   AS sku_count,
  ROUND(COALESCE(SUM(s.qty)::NUMERIC / NULLIF(w.capacity, 0) * 100, 0), 1)   AS utilization_pct
FROM warehouses w
LEFT JOIN stock s      ON s.warehouse_id = w.id
LEFT JOIN products p   ON p.id = s.product_id
GROUP BY w.id;

-- ประวัติความเคลื่อนไหวพร้อมชื่อสินค้าและคลัง
CREATE OR REPLACE VIEW v_movements_detail AS
SELECT
  m.id,
  m.type,
  m.qty,
  m.partner,
  m.reason_en,
  m.reason_th,
  m.doc_ref,
  m.operator,
  m.status,
  m.ts,
  p.sku,
  p.name        AS product_name,
  p.name_th     AS product_name_th,
  p.size        AS product_size,
  p.pieces_per_ctn,
  (m.qty * p.pieces_per_ctn) AS total_pcs,
  fw.code       AS from_wh_code,
  fw.name       AS from_wh_name,
  fw.name_th    AS from_wh_name_th,
  tw.code       AS to_wh_code,
  tw.name       AS to_wh_name,
  tw.name_th    AS to_wh_name_th
FROM movements m
JOIN  products   p  ON p.id  = m.product_id
LEFT JOIN warehouses fw ON fw.id = m.from_wh
LEFT JOIN warehouses tw ON tw.id = m.to_wh
ORDER BY m.ts DESC;

-- แดชบอร์ด: สรุปรายวัน (14 วันล่าสุด)
CREATE OR REPLACE VIEW v_daily_trend AS
SELECT
  DATE_TRUNC('day', ts)::DATE            AS day,
  SUM(CASE WHEN type = 'INBOUND'  THEN qty ELSE 0 END) AS inbound_qty,
  SUM(CASE WHEN type = 'OUTBOUND' THEN qty ELSE 0 END) AS outbound_qty,
  COUNT(*)                                AS movement_count
FROM movements
WHERE ts >= NOW() - INTERVAL '14 days'
GROUP BY 1
ORDER BY 1;

-- ================================================================
-- 5. FUNCTIONS
-- ================================================================

-- โพสต์รายการและอัปเดตสต็อกแบบ Atomic (ใช้แทน localStorage dispatch)
CREATE OR REPLACE FUNCTION post_transaction(
  p_type       TEXT,
  p_product_id TEXT,
  p_qty        INTEGER,
  p_from_wh    TEXT    DEFAULT NULL,
  p_to_wh      TEXT    DEFAULT NULL,
  p_partner    TEXT    DEFAULT NULL,
  p_reason_en  TEXT    DEFAULT NULL,
  p_reason_th  TEXT    DEFAULT NULL,
  p_doc_ref    TEXT    DEFAULT NULL,
  p_operator   TEXT    DEFAULT 'Admin'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prefix  TEXT;
  v_ref     TEXT;
  v_avail   INTEGER;
BEGIN
  -- prefix per type
  v_prefix := CASE p_type
    WHEN 'INBOUND'  THEN 'GRN'
    WHEN 'OUTBOUND' THEN 'DO'
    WHEN 'TRANSFER' THEN 'TRF'
    WHEN 'DAMAGE'   THEN 'DMG'
    ELSE 'TXN'
  END;

  -- สร้างเลขอ้างอิง (ปี + millisecond tail)
  v_ref := v_prefix || '-26' || LPAD(
    ((EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT % 100000)::TEXT, 5, '0'
  );

  -- ตรวจสต็อกพอ (OUTBOUND, DAMAGE, TRANSFER ต้นทาง)
  IF p_type IN ('OUTBOUND', 'DAMAGE', 'TRANSFER') THEN
    SELECT COALESCE(qty, 0) INTO v_avail
    FROM stock
    WHERE product_id = p_product_id AND warehouse_id = p_from_wh;

    IF v_avail < p_qty THEN
      RAISE EXCEPTION 'ยอดสต็อกไม่เพียงพอ: มีอยู่ % ลัง ต้องการ % ลัง',
                      COALESCE(v_avail, 0), p_qty;
    END IF;
  END IF;

  -- อัปเดตสต็อก
  CASE p_type
    WHEN 'INBOUND' THEN
      INSERT INTO stock (product_id, warehouse_id, qty, updated_at)
      VALUES (p_product_id, p_to_wh, p_qty, NOW())
      ON CONFLICT (product_id, warehouse_id)
      DO UPDATE SET qty = stock.qty + EXCLUDED.qty, updated_at = NOW();

    WHEN 'OUTBOUND' THEN
      UPDATE stock SET qty = qty - p_qty, updated_at = NOW()
      WHERE product_id = p_product_id AND warehouse_id = p_from_wh;

    WHEN 'TRANSFER' THEN
      UPDATE stock SET qty = qty - p_qty, updated_at = NOW()
      WHERE product_id = p_product_id AND warehouse_id = p_from_wh;

      INSERT INTO stock (product_id, warehouse_id, qty, updated_at)
      VALUES (p_product_id, p_to_wh, p_qty, NOW())
      ON CONFLICT (product_id, warehouse_id)
      DO UPDATE SET qty = stock.qty + EXCLUDED.qty, updated_at = NOW();

    WHEN 'DAMAGE' THEN
      UPDATE stock SET qty = qty - p_qty, updated_at = NOW()
      WHERE product_id = p_product_id AND warehouse_id = p_from_wh;
  END CASE;

  -- บันทึก movement
  INSERT INTO movements (
    id, type, product_id, qty,
    from_wh, to_wh, partner,
    reason_en, reason_th, doc_ref,
    operator, ts
  )
  VALUES (
    v_ref, p_type, p_product_id, p_qty,
    p_from_wh, p_to_wh, p_partner,
    p_reason_en, p_reason_th, p_doc_ref,
    p_operator, NOW()
  );

  RETURN v_ref;
END;
$$;

-- ยอดรวมทุกคลัง (สำหรับ Dashboard KPI)
CREATE OR REPLACE FUNCTION get_grand_total()
RETURNS TABLE(total_qty BIGINT, total_pcs BIGINT, total_value NUMERIC)
LANGUAGE sql STABLE
AS $$
  SELECT
    COALESCE(SUM(s.qty), 0)::BIGINT,
    COALESCE(SUM(s.qty * p.pieces_per_ctn), 0)::BIGINT,
    COALESCE(SUM(s.qty * p.price), 0)
  FROM stock s
  JOIN products p ON p.id = s.product_id;
$$;

-- สินค้าที่ต้องสั่งซื้อเพิ่ม (total ≤ reorder_point)
CREATE OR REPLACE FUNCTION get_low_stock()
RETURNS TABLE(
  sku TEXT, name TEXT, name_th TEXT,
  total_qty BIGINT, reorder_point INTEGER, ratio NUMERIC
)
LANGUAGE sql STABLE
AS $$
  SELECT
    p.sku, p.name, p.name_th,
    COALESCE(SUM(s.qty), 0)::BIGINT    AS total_qty,
    p.reorder_point,
    ROUND(COALESCE(SUM(s.qty), 0)::NUMERIC / NULLIF(p.reorder_point, 0), 3) AS ratio
  FROM products p
  LEFT JOIN stock s ON s.product_id = p.id
  GROUP BY p.id
  HAVING COALESCE(SUM(s.qty), 0) <= p.reorder_point
  ORDER BY ratio;
$$;

-- ================================================================
-- 6. SEED DATA — WAREHOUSES
-- ================================================================

INSERT INTO warehouses (id, code, name, name_th, city, city_th, region, capacity) VALUES
  ('WH-BKK', 'WH01', 'Bangkok Central DC',  'ศูนย์กระจายสินค้ากรุงเทพฯ', 'Bangkok',    'กรุงเทพฯ',   'Central',   60000),
  ('WH-CBI', 'WH02', 'Chonburi Hub',         'คลังสินค้าชลบุรี',           'Chonburi',   'ชลบุรี',     'East',      24000),
  ('WH-CNX', 'WH03', 'Chiang Mai Depot',     'คลังสินค้าเชียงใหม่',        'Chiang Mai', 'เชียงใหม่',  'North',     20000),
  ('WH-KKC', 'WH04', 'Khon Kaen Depot',      'คลังสินค้าขอนแก่น',          'Khon Kaen',  'ขอนแก่น',    'Northeast', 24000),
  ('WH-HDY', 'WH05', 'Hat Yai Depot',        'คลังสินค้าหาดใหญ่',          'Hat Yai',    'หาดใหญ่',    'South',     22000)
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- 7. SEED DATA — PRODUCTS (30 SKUs)
-- cost  = 2.20 + sizeIdx*0.55 + (Pants ? 0.70 : 0)
-- price = cost * 1.65  (midpoint ของช่วง 1.55–1.80)
-- ================================================================

INSERT INTO products
  (id, sku, name, name_th, brand, brand_th, size, size_th, weight_range, form, form_th,
   pieces_per_ctn, ean, cost, price, reorder_point, origin)
VALUES
-- BabySoft (i 0–4)
('DP-BS-NB-44','DP-BS-NB-44','BabySoft Tape NB ×44',   'เบบี้ซอฟท์ แบบเทป ไซส์ NB 44 ชิ้น',  'BabySoft','เบบี้ซอฟท์','NB','แรกเกิด','<5kg',   'Tape','แบบเทป',  44,'8851047720193', 2.20, 3.63, 600,'Thailand'),
('DP-BS-S-64', 'DP-BS-S-64', 'BabySoft Tape S ×64',    'เบบี้ซอฟท์ แบบเทป ไซส์ S 64 ชิ้น',   'BabySoft','เบบี้ซอฟท์','S', 'เล็ก',   '4–8kg',  'Tape','แบบเทป',  64,'8851047720200', 2.75, 4.54, 700,'Thailand'),
('DP-BS-M-54', 'DP-BS-M-54', 'BabySoft Pants M ×54',   'เบบี้ซอฟท์ แบบกางเกง ไซส์ M 54 ชิ้น','BabySoft','เบบี้ซอฟท์','M', 'กลาง',   '6–11kg', 'Pants','แบบกางเกง',54,'8851047720217', 4.00, 6.60, 800,'Japan'),
('DP-BS-L-48', 'DP-BS-L-48', 'BabySoft Pants L ×48',   'เบบี้ซอฟท์ แบบกางเกง ไซส์ L 48 ชิ้น','BabySoft','เบบี้ซอฟท์','L', 'ใหญ่',   '9–14kg', 'Pants','แบบกางเกง',48,'8851047720224', 4.55, 7.51, 650,'Malaysia'),
('DP-BS-XL-42','DP-BS-XL-42','BabySoft Pants XL ×42',  'เบบี้ซอฟท์ แบบกางเกง ไซส์ XL 42 ชิ้น','BabySoft','เบบี้ซอฟท์','XL','ใหญ่พิเศษ','12–17kg','Pants','แบบกางเกง',42,'8851047720231', 5.10, 8.42, 500,'Thailand'),
-- DryNight (i 5–8)
('DP-DN-M-56', 'DP-DN-M-56', 'DryNight Pants M ×56',   'ดรายไนท์ แบบกางเกง ไซส์ M 56 ชิ้น',  'DryNight','ดรายไนท์', 'M', 'กลาง',   '6–11kg', 'Pants','แบบกางเกง',56,'8852236610047', 4.00, 6.60, 600,'Thailand'),
('DP-DN-L-50', 'DP-DN-L-50', 'DryNight Pants L ×50',   'ดรายไนท์ แบบกางเกง ไซส์ L 50 ชิ้น',  'DryNight','ดรายไนท์', 'L', 'ใหญ่',   '9–14kg', 'Pants','แบบกางเกง',50,'8852236610054', 4.55, 7.51, 700,'Thailand'),
('DP-DN-XL-44','DP-DN-XL-44','DryNight Pants XL ×44',  'ดรายไนท์ แบบกางเกง ไซส์ XL 44 ชิ้น', 'DryNight','ดรายไนท์', 'XL','ใหญ่พิเศษ','12–17kg','Pants','แบบกางเกง',44,'8852236610061', 5.10, 8.42, 800,'Japan'),
('DP-DN-XXL-38','DP-DN-XXL-38','DryNight Pants XXL ×38','ดรายไนท์ แบบกางเกง ไซส์ XXL 38 ชิ้น','DryNight','ดรายไนท์', 'XXL','จัมโบ้', '>15kg',  'Pants','แบบกางเกง',38,'8852236610078', 5.65, 9.32, 650,'Malaysia'),
-- PureCare (i 9–13)
('DP-PC-NB-48','DP-PC-NB-48','PureCare Tape NB ×48',   'เพียวแคร์ แบบเทป ไซส์ NB 48 ชิ้น',  'PureCare','เพียวแคร์','NB','แรกเกิด','<5kg',   'Tape','แบบเทป',  48,'8859920184471', 2.20, 3.63, 500,'Japan'),
('DP-PC-S-60', 'DP-PC-S-60', 'PureCare Tape S ×60',    'เพียวแคร์ แบบเทป ไซส์ S 60 ชิ้น',   'PureCare','เพียวแคร์','S', 'เล็ก',   '4–8kg',  'Tape','แบบเทป',  60,'8859920184488', 2.75, 4.54, 600,'Japan'),
('DP-PC-M-52', 'DP-PC-M-52', 'PureCare Tape M ×52',    'เพียวแคร์ แบบเทป ไซส์ M 52 ชิ้น',   'PureCare','เพียวแคร์','M', 'กลาง',   '6–11kg', 'Tape','แบบเทป',  52,'8859920184495', 3.30, 5.45, 700,'Japan'),
('DP-PC-L-46', 'DP-PC-L-46', 'PureCare Tape L ×46',    'เพียวแคร์ แบบเทป ไซส์ L 46 ชิ้น',   'PureCare','เพียวแคร์','L', 'ใหญ่',   '9–14kg', 'Tape','แบบเทป',  46,'8859920184501', 3.85, 6.35, 800,'Japan'),
('DP-PC-XL-40','DP-PC-XL-40','PureCare Pants XL ×40',  'เพียวแคร์ แบบกางเกง ไซส์ XL 40 ชิ้น','PureCare','เพียวแคร์','XL','ใหญ่พิเศษ','12–17kg','Pants','แบบกางเกง',40,'8859920184518', 5.10, 8.42, 650,'Japan'),
-- CloudBaby (i 14–18)
('DP-CB-S-62', 'DP-CB-S-62', 'CloudBaby Pants S ×62',  'คลาวด์เบบี้ แบบกางเกง ไซส์ S 62 ชิ้น','CloudBaby','คลาวด์เบบี้','S','เล็ก',  '4–8kg',  'Pants','แบบกางเกง',62,'8853310550288', 3.45, 5.69, 500,'Malaysia'),
('DP-CB-M-54', 'DP-CB-M-54', 'CloudBaby Pants M ×54',  'คลาวด์เบบี้ แบบกางเกง ไซส์ M 54 ชิ้น','CloudBaby','คลาวด์เบบี้','M','กลาง',  '6–11kg', 'Pants','แบบกางเกง',54,'8853310550295', 4.00, 6.60, 600,'Malaysia'),
('DP-CB-L-46', 'DP-CB-L-46', 'CloudBaby Pants L ×46',  'คลาวด์เบบี้ แบบกางเกง ไซส์ L 46 ชิ้น','CloudBaby','คลาวด์เบบี้','L','ใหญ่',  '9–14kg', 'Pants','แบบกางเกง',46,'8853310550301', 4.55, 7.51, 700,'Japan'),
('DP-CB-XL-40','DP-CB-XL-40','CloudBaby Pants XL ×40', 'คลาวด์เบบี้ แบบกางเกง ไซส์ XL 40 ชิ้น','CloudBaby','คลาวด์เบบี้','XL','ใหญ่พิเศษ','12–17kg','Pants','แบบกางเกง',40,'8853310550318', 5.10, 8.42, 800,'Malaysia'),
('DP-CB-XXL-34','DP-CB-XXL-34','CloudBaby Pants XXL ×34','คลาวด์เบบี้ แบบกางเกง ไซส์ XXL 34 ชิ้น','CloudBaby','คลาวด์เบบี้','XXL','จัมโบ้','>15kg','Pants','แบบกางเกง',34,'8853310550325', 5.65, 9.32, 650,'Malaysia'),
-- LittleStep (i 19–23)
('DP-LS-NB-46','DP-LS-NB-46','LittleStep Tape NB ×46', 'ลิตเทิลสเต็ป แบบเทป ไซส์ NB 46 ชิ้น','LittleStep','ลิตเทิลสเต็ป','NB','แรกเกิด','<5kg', 'Tape','แบบเทป',  46,'8854421630147', 2.20, 3.63, 500,'Thailand'),
('DP-LS-S-58', 'DP-LS-S-58', 'LittleStep Tape S ×58',  'ลิตเทิลสเต็ป แบบเทป ไซส์ S 58 ชิ้น', 'LittleStep','ลิตเทิลสเต็ป','S', 'เล็ก',  '4–8kg',  'Tape','แบบเทป',  58,'8854421630154', 2.75, 4.54, 600,'Thailand'),
('DP-LS-M-50', 'DP-LS-M-50', 'LittleStep Pants M ×50', 'ลิตเทิลสเต็ป แบบกางเกง ไซส์ M 50 ชิ้น','LittleStep','ลิตเทิลสเต็ป','M','กลาง',  '6–11kg', 'Pants','แบบกางเกง',50,'8854421630161', 4.00, 6.60, 700,'Japan'),
('DP-LS-L-44', 'DP-LS-L-44', 'LittleStep Pants L ×44', 'ลิตเทิลสเต็ป แบบกางเกง ไซส์ L 44 ชิ้น','LittleStep','ลิตเทิลสเต็ป','L','ใหญ่',  '9–14kg', 'Pants','แบบกางเกง',44,'8854421630178', 4.55, 7.51, 800,'Malaysia'),
('DP-LS-XL-38','DP-LS-XL-38','LittleStep Pants XL ×38','ลิตเทิลสเต็ป แบบกางเกง ไซส์ XL 38 ชิ้น','LittleStep','ลิตเทิลสเต็ป','XL','ใหญ่พิเศษ','12–17kg','Pants','แบบกางเกง',38,'8854421630185', 5.10, 8.42, 650,'Thailand'),
-- NanoDry (i 24–28)
('DP-ND-S-60', 'DP-ND-S-60', 'NanoDry Pants S ×60',   'นาโนดราย แบบกางเกง ไซส์ S 60 ชิ้น',  'NanoDry','นาโนดราย','S', 'เล็ก',   '4–8kg',  'Pants','แบบกางเกง',60,'8855790440162', 3.45, 5.69, 500,'Thailand'),
('DP-ND-M-52', 'DP-ND-M-52', 'NanoDry Pants M ×52',   'นาโนดราย แบบกางเกง ไซส์ M 52 ชิ้น',  'NanoDry','นาโนดราย','M', 'กลาง',   '6–11kg', 'Pants','แบบกางเกง',52,'8855790440179', 4.00, 6.60, 600,'Thailand'),
('DP-ND-L-46', 'DP-ND-L-46', 'NanoDry Pants L ×46',   'นาโนดราย แบบกางเกง ไซส์ L 46 ชิ้น',  'NanoDry','นาโนดราย','L', 'ใหญ่',   '9–14kg', 'Pants','แบบกางเกง',46,'8855790440186', 4.55, 7.51, 700,'Japan'),
('DP-ND-XL-40','DP-ND-XL-40','NanoDry Pants XL ×40',  'นาโนดราย แบบกางเกง ไซส์ XL 40 ชิ้น', 'NanoDry','นาโนดราย','XL','ใหญ่พิเศษ','12–17kg','Pants','แบบกางเกง',40,'8855790440193', 5.10, 8.42, 800,'Malaysia'),
('DP-ND-XXL-36','DP-ND-XXL-36','NanoDry Pants XXL ×36','นาโนดราย แบบกางเกง ไซส์ XXL 36 ชิ้น','NanoDry','นาโนดราย','XXL','จัมโบ้', '>15kg',  'Pants','แบบกางเกง',36,'8855790440209', 5.65, 9.32, 650,'Thailand'),
-- DryNight S Tape (i 29)
('DP-DN-S-58', 'DP-DN-S-58', 'DryNight Tape S ×58',   'ดรายไนท์ แบบเทป ไซส์ S 58 ชิ้น',    'DryNight','ดรายไนท์','S', 'เล็ก',   '4–8kg',  'Tape','แบบเทป',  58,'8852236610085', 2.75, 4.54, 500,'Thailand')
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- 8. SEED DATA — STOCK MATRIX (30 products × 5 warehouses)
-- WH01=Bangkok Central (ใหญ่สุด), WH02–WH05=regional
-- บาง row ตั้งใจต่ำ/ศูนย์เพื่อ reorder alert
-- ================================================================

INSERT INTO stock (product_id, warehouse_id, qty) VALUES
-- DP-BS-NB-44
('DP-BS-NB-44','WH-BKK',1820),('DP-BS-NB-44','WH-CBI',520),('DP-BS-NB-44','WH-CNX',380),('DP-BS-NB-44','WH-KKC',0),  ('DP-BS-NB-44','WH-HDY',450),
-- DP-BS-S-64
('DP-BS-S-64', 'WH-BKK',2210),('DP-BS-S-64', 'WH-CBI',680),('DP-BS-S-64', 'WH-CNX',510),('DP-BS-S-64', 'WH-KKC',590),('DP-BS-S-64', 'WH-HDY',0),
-- DP-BS-M-54
('DP-BS-M-54', 'WH-BKK',1650),('DP-BS-M-54', 'WH-CBI',450),('DP-BS-M-54', 'WH-CNX',60), ('DP-BS-M-54', 'WH-KKC',400),('DP-BS-M-54', 'WH-HDY',310),
-- DP-BS-L-48
('DP-BS-L-48', 'WH-BKK',2400),('DP-BS-L-48', 'WH-CBI',750),('DP-BS-L-48', 'WH-CNX',620),('DP-BS-L-48', 'WH-KKC',0),  ('DP-BS-L-48', 'WH-HDY',530),
-- DP-BS-XL-42
('DP-BS-XL-42','WH-BKK',1100),('DP-BS-XL-42','WH-CBI',320),('DP-BS-XL-42','WH-CNX',280),('DP-BS-XL-42','WH-KKC',410),('DP-BS-XL-42','WH-HDY',45),
-- DP-DN-M-56
('DP-DN-M-56', 'WH-BKK',1980),('DP-DN-M-56', 'WH-CBI',0),  ('DP-DN-M-56', 'WH-CNX',490),('DP-DN-M-56', 'WH-KKC',560),('DP-DN-M-56', 'WH-HDY',420),
-- DP-DN-L-50
('DP-DN-L-50', 'WH-BKK',2100),('DP-DN-L-50', 'WH-CBI',640),('DP-DN-L-50', 'WH-CNX',75), ('DP-DN-L-50', 'WH-KKC',480),('DP-DN-L-50', 'WH-HDY',390),
-- DP-DN-XL-44
('DP-DN-XL-44','WH-BKK',1440),('DP-DN-XL-44','WH-CBI',410),('DP-DN-XL-44','WH-CNX',330),('DP-DN-XL-44','WH-KKC',0),  ('DP-DN-XL-44','WH-HDY',280),
-- DP-DN-XXL-38
('DP-DN-XXL-38','WH-BKK',980), ('DP-DN-XXL-38','WH-CBI',200),('DP-DN-XXL-38','WH-CNX',165),('DP-DN-XXL-38','WH-KKC',220),('DP-DN-XXL-38','WH-HDY',0),
-- DP-PC-NB-48
('DP-PC-NB-48','WH-BKK',1760),('DP-PC-NB-48','WH-CBI',490),('DP-PC-NB-48','WH-CNX',370),('DP-PC-NB-48','WH-KKC',55), ('DP-PC-NB-48','WH-HDY',410),
-- DP-PC-S-60
('DP-PC-S-60', 'WH-BKK',2050),('DP-PC-S-60', 'WH-CBI',610),('DP-PC-S-60', 'WH-CNX',0),  ('DP-PC-S-60', 'WH-KKC',540),('DP-PC-S-60', 'WH-HDY',460),
-- DP-PC-M-52
('DP-PC-M-52', 'WH-BKK',1870),('DP-PC-M-52', 'WH-CBI',530),('DP-PC-M-52', 'WH-CNX',420),('DP-PC-M-52', 'WH-KKC',470),('DP-PC-M-52', 'WH-HDY',350),
-- DP-PC-L-46
('DP-PC-L-46', 'WH-BKK',1340),('DP-PC-L-46', 'WH-CBI',0),  ('DP-PC-L-46', 'WH-CNX',290),('DP-PC-L-46', 'WH-KKC',340),('DP-PC-L-46', 'WH-HDY',270),
-- DP-PC-XL-40
('DP-PC-XL-40','WH-BKK',2280),('DP-PC-XL-40','WH-CBI',700),('DP-PC-XL-40','WH-CNX',580),('DP-PC-XL-40','WH-KKC',620),('DP-PC-XL-40','WH-HDY',40),
-- DP-CB-S-62
('DP-CB-S-62', 'WH-BKK',1620),('DP-CB-S-62', 'WH-CBI',440),('DP-CB-S-62', 'WH-CNX',350),('DP-CB-S-62', 'WH-KKC',0),  ('DP-CB-S-62', 'WH-HDY',390),
-- DP-CB-M-54
('DP-CB-M-54', 'WH-BKK',2380),('DP-CB-M-54', 'WH-CBI',730),('DP-CB-M-54', 'WH-CNX',600),('DP-CB-M-54', 'WH-KKC',660),('DP-CB-M-54', 'WH-HDY',510),
-- DP-CB-L-46
('DP-CB-L-46', 'WH-BKK',1200),('DP-CB-L-46', 'WH-CBI',360),('DP-CB-L-46', 'WH-CNX',80), ('DP-CB-L-46', 'WH-KKC',300),('DP-CB-L-46', 'WH-HDY',250),
-- DP-CB-XL-40
('DP-CB-XL-40','WH-BKK',1730),('DP-CB-XL-40','WH-CBI',510),('DP-CB-XL-40','WH-CNX',400),('DP-CB-XL-40','WH-KKC',450),('DP-CB-XL-40','WH-HDY',0),
-- DP-CB-XXL-34
('DP-CB-XXL-34','WH-BKK',870), ('DP-CB-XXL-34','WH-CBI',180),('DP-CB-XXL-34','WH-CNX',140),('DP-CB-XXL-34','WH-KKC',190),('DP-CB-XXL-34','WH-HDY',120),
-- DP-LS-NB-46
('DP-LS-NB-46','WH-BKK',1560),('DP-LS-NB-46','WH-CBI',0),  ('DP-LS-NB-46','WH-CNX',320),('DP-LS-NB-46','WH-KKC',380),('DP-LS-NB-46','WH-HDY',300),
-- DP-LS-S-58
('DP-LS-S-58', 'WH-BKK',2120),('DP-LS-S-58', 'WH-CBI',650),('DP-LS-S-58', 'WH-CNX',520),('DP-LS-S-58', 'WH-KKC',570),('DP-LS-S-58', 'WH-HDY',430),
-- DP-LS-M-50
('DP-LS-M-50', 'WH-BKK',1490),('DP-LS-M-50', 'WH-CBI',420),('DP-LS-M-50', 'WH-CNX',330),('DP-LS-M-50', 'WH-KKC',50), ('DP-LS-M-50', 'WH-HDY',370),
-- DP-LS-L-44
('DP-LS-L-44', 'WH-BKK',2290),('DP-LS-L-44', 'WH-CBI',710),('DP-LS-L-44', 'WH-CNX',570),('DP-LS-L-44', 'WH-KKC',630),('DP-LS-L-44', 'WH-HDY',0),
-- DP-LS-XL-38
('DP-LS-XL-38','WH-BKK',1060),('DP-LS-XL-38','WH-CBI',300),('DP-LS-XL-38','WH-CNX',240),('DP-LS-XL-38','WH-KKC',270),('DP-LS-XL-38','WH-HDY',210),
-- DP-ND-S-60
('DP-ND-S-60', 'WH-BKK',1900),('DP-ND-S-60', 'WH-CBI',570),('DP-ND-S-60', 'WH-CNX',0),  ('DP-ND-S-60', 'WH-KKC',500),('DP-ND-S-60', 'WH-HDY',440),
-- DP-ND-M-52
('DP-ND-M-52', 'WH-BKK',2170),('DP-ND-M-52', 'WH-CBI',670),('DP-ND-M-52', 'WH-CNX',540),('DP-ND-M-52', 'WH-KKC',590),('DP-ND-M-52', 'WH-HDY',470),
-- DP-ND-L-46
('DP-ND-L-46', 'WH-BKK',1380),('DP-ND-L-46', 'WH-CBI',390),('DP-ND-L-46', 'WH-CNX',310),('DP-ND-L-46', 'WH-KKC',30), ('DP-ND-L-46', 'WH-HDY',260),
-- DP-ND-XL-40
('DP-ND-XL-40','WH-BKK',1810),('DP-ND-XL-40','WH-CBI',550),('DP-ND-XL-40','WH-CNX',440),('DP-ND-XL-40','WH-KKC',490),('DP-ND-XL-40','WH-HDY',0),
-- DP-ND-XXL-36
('DP-ND-XXL-36','WH-BKK',920), ('DP-ND-XXL-36','WH-CBI',210),('DP-ND-XXL-36','WH-CNX',170),('DP-ND-XXL-36','WH-KKC',190),('DP-ND-XXL-36','WH-HDY',150),
-- DP-DN-S-58
('DP-DN-S-58', 'WH-BKK',1970),('DP-DN-S-58', 'WH-CBI',600),('DP-DN-S-58', 'WH-CNX',480),('DP-DN-S-58', 'WH-KKC',0),  ('DP-DN-S-58', 'WH-HDY',420)
ON CONFLICT (product_id, warehouse_id) DO NOTHING;

-- ================================================================
-- 9. SEED DATA — MOVEMENTS (ตัวอย่าง 24 รายการ ครบ 4 ประเภท)
-- ================================================================

INSERT INTO movements (id, type, product_id, qty, from_wh, to_wh, partner, reason_en, reason_th, operator, ts) VALUES
-- INBOUND (รับสินค้า)
('GRN-264820','INBOUND', 'DP-BS-M-54',  240, NULL,     'WH-BKK', 'Thai Hygiene Mfg.',  NULL, NULL, 'S. Phuwadon',  NOW() - INTERVAL '25 minutes'),
('GRN-264818','INBOUND', 'DP-PC-S-60',  180, NULL,     'WH-CBI', 'Siam Nonwoven Co.',  NULL, NULL, 'N. Chaiyaporn',NOW() - INTERVAL '80 minutes'),
('GRN-264815','INBOUND', 'DP-DN-L-50',  320, NULL,     'WH-BKK', 'Asia Pulp Supplies', NULL, NULL, 'K. Wannisa',   NOW() - INTERVAL '3 hours'),
('GRN-264810','INBOUND', 'DP-CB-XL-40', 150, NULL,     'WH-KKC', 'Bangkok Converting', NULL, NULL, 'T. Apinya',    NOW() - INTERVAL '5 hours'),
('GRN-264800','INBOUND', 'DP-LS-M-50',  280, NULL,     'WH-HDY', 'Thai Hygiene Mfg.',  NULL, NULL, 'R. Suchart',   NOW() - INTERVAL '1 day'),
('GRN-264790','INBOUND', 'DP-ND-XL-40', 200, NULL,     'WH-BKK', 'Siam Nonwoven Co.',  NULL, NULL, 'S. Phuwadon',  NOW() - INTERVAL '2 days'),
-- OUTBOUND (จัดส่ง)
('DO-264819', 'OUTBOUND','DP-BS-L-48',  120, 'WH-BKK', NULL,     'Lotus''s DC',        NULL, NULL, 'N. Chaiyaporn',NOW() - INTERVAL '45 minutes'),
('DO-264816', 'OUTBOUND','DP-DN-M-56',  200, 'WH-CBI', NULL,     'Big C Distribution', NULL, NULL, 'S. Phuwadon',  NOW() - INTERVAL '2 hours'),
('DO-264812', 'OUTBOUND','DP-PC-M-52',  160, 'WH-BKK', NULL,     '7-Eleven CDC',       NULL, NULL, 'K. Wannisa',   NOW() - INTERVAL '4 hours'),
('DO-264806', 'OUTBOUND','DP-CB-S-62',   80, 'WH-CNX', NULL,     'Tops Market',        NULL, NULL, 'T. Apinya',    NOW() - INTERVAL '6 hours'),
('DO-264795', 'OUTBOUND','DP-LS-L-44',  300, 'WH-BKK', NULL,     'Watsons TH',         NULL, NULL, 'R. Suchart',   NOW() - INTERVAL '1 day'),
('DO-264780', 'OUTBOUND','DP-ND-M-52',  240, 'WH-KKC', NULL,     'Shopee Mall',        NULL, NULL, 'S. Phuwadon',  NOW() - INTERVAL '2 days'),
-- TRANSFER (โอนระหว่างคลัง)
('TRF-264817','TRANSFER','DP-BS-S-64',  100, 'WH-BKK', 'WH-CBI', NULL, NULL, NULL, 'K. Wannisa',   NOW() - INTERVAL '1 hour'),
('TRF-264813','TRANSFER','DP-PC-NB-48',  60, 'WH-BKK', 'WH-CNX', NULL, NULL, NULL, 'T. Apinya',    NOW() - INTERVAL '3.5 hours'),
('TRF-264808','TRANSFER','DP-DN-XL-44', 140, 'WH-BKK', 'WH-HDY', NULL, NULL, NULL, 'N. Chaiyaporn',NOW() - INTERVAL '7 hours'),
('TRF-264798','TRANSFER','DP-CB-M-54',   90, 'WH-BKK', 'WH-KKC', NULL, NULL, NULL, 'R. Suchart',   NOW() - INTERVAL '1 day'),
('TRF-264785','TRANSFER','DP-LS-S-58',  200, 'WH-BKK', 'WH-CBI', NULL, NULL, NULL, 'S. Phuwadon',  NOW() - INTERVAL '2 days'),
('TRF-264770','TRANSFER','DP-ND-L-46',  120, 'WH-CBI', 'WH-CNX', NULL, NULL, NULL, 'K. Wannisa',   NOW() - INTERVAL '3 days'),
-- DAMAGE (สินค้าเสียหาย)
('DMG-264814','DAMAGE',  'DP-BS-XL-42',  15, 'WH-BKK', NULL, NULL, 'Water damage',       'เปียกน้ำ',                'T. Apinya',    NOW() - INTERVAL '2.5 hours'),
('DMG-264809','DAMAGE',  'DP-DN-XXL-38',  8, 'WH-CBI', NULL, NULL, 'Torn packaging',     'บรรจุภัณฑ์ฉีกขาด',       'N. Chaiyaporn',NOW() - INTERVAL '5.5 hours'),
('DMG-264803','DAMAGE',  'DP-PC-L-46',   12, 'WH-CNX', NULL, NULL, 'Crushed in transit', 'เสียหายจากการขนส่ง',     'R. Suchart',   NOW() - INTERVAL '8 hours'),
('DMG-264793','DAMAGE',  'DP-CB-XXL-34',  5, 'WH-KKC', NULL, NULL, 'Expired',            'หมดอายุ',                'S. Phuwadon',  NOW() - INTERVAL '1 day'),
('DMG-264778','DAMAGE',  'DP-LS-XL-38',  20, 'WH-BKK', NULL, NULL, 'Pest contamination', 'ปนเปื้อนจากแมลง',        'K. Wannisa',   NOW() - INTERVAL '2 days'),
('DMG-264760','DAMAGE',  'DP-ND-XXL-36', 10, 'WH-HDY', NULL, NULL, 'Water damage',       'เปียกน้ำ',                'T. Apinya',    NOW() - INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- ✅ ตรวจสอบหลัง Run
-- ================================================================

-- SELECT COUNT(*) FROM warehouses;    -- ควรได้ 5
-- SELECT COUNT(*) FROM products;      -- ควรได้ 30
-- SELECT COUNT(*) FROM stock;         -- ควรได้ 150
-- SELECT COUNT(*) FROM movements;     -- ควรได้ 24
-- SELECT * FROM v_stock_by_warehouse ORDER BY code;
-- SELECT * FROM get_grand_total();
-- SELECT * FROM get_low_stock();
