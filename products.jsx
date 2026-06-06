/* ===================================================================
   StockFlow WMS — Products (master data) list + detail
   =================================================================== */
function Products({ lang, onNav, openScanner }) {
  const { selectors } = useWMS();
  const W = window.WMS;
  const T = (en, th) => (lang === "th" ? th : en);
  const [q, setQ] = uState("");
  const [brand, setBrand] = uState("ALL");
  const [view, setView] = uState("grid");

  let rows = W.products.map((p) => ({ p, total: selectors.totalForProduct(p.id) }));
  if (q) rows = rows.filter((r) => (r.p.sku + " " + r.p.name + " " + r.p.nameTh + " " + r.p.brand).toLowerCase().includes(q.toLowerCase()));
  if (brand !== "ALL") rows = rows.filter((r) => r.p.brand === brand);
  const brands = ["ALL", ...new Set(W.products.map((p) => p.brand))];

  return React.createElement("div", { className: "page" },
    React.createElement("div", { className: "page-head" },
      React.createElement("div", null,
        React.createElement("div", { className: "page-title" }, T("Product Master", "ข้อมูลสินค้า")),
        React.createElement("div", { className: "page-sub" }, "30 " + T("active SKUs · Baby Diapers", "รายการ · ผ้าอ้อมเด็ก"))),
      React.createElement("div", { className: "spacer" }),
      React.createElement("button", { className: "btn primary", onClick: openScanner },
        React.createElement(Icon, { name: "scan", size: 16 }), T("Scan New Product", "สแกนสินค้าใหม่"),
        React.createElement("span", { style: { fontSize: 10, fontWeight: 700, padding: "1px 5px", background: "oklch(1 0 0 / 0.22)", borderRadius: 4, marginLeft: 2 } }, "OCR"))),

    React.createElement("div", { className: "card", style: { marginBottom: 16 } },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" } },
        React.createElement("div", { className: "searchbox", style: { width: 280 } },
          React.createElement(Icon, { name: "search", size: 15 }),
          React.createElement("input", { placeholder: T("Search products…", "ค้นหาสินค้า…"), value: q, onChange: (e) => setQ(e.target.value) })),
        React.createElement("select", { className: "select", style: { width: 160 }, value: brand, onChange: (e) => setBrand(e.target.value) },
          brands.map((b) => React.createElement("option", { key: b, value: b }, b === "ALL" ? T("All brands", "ทุกแบรนด์") : b))),
        React.createElement("div", { className: "spacer" }),
        React.createElement("span", { style: { fontSize: 12.5, color: "var(--ink-3)" } }, rows.length + " " + T("products", "รายการ")),
        React.createElement("div", { className: "seg" },
          React.createElement("button", { className: view === "grid" ? "on" : "", onClick: () => setView("grid") }, React.createElement(Icon, { name: "grid", size: 14 })),
          React.createElement("button", { className: view === "table" ? "on" : "", onClick: () => setView("table") }, React.createElement(Icon, { name: "balance", size: 14 }))))),

    view === "grid"
      ? React.createElement("div", { className: "grid", style: { gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))" } },
          rows.map((r) => React.createElement(ProductCard, { key: r.p.id, p: r.p, total: r.total, lang, onNav })))
      : React.createElement("div", { className: "card" },
          React.createElement("table", { className: "tbl" },
            React.createElement("thead", null, React.createElement("tr", null,
              React.createElement("th", null, T("Product", "สินค้า")),
              React.createElement("th", null, "SKU"),
              React.createElement("th", null, T("Type", "ชนิด")),
              React.createElement("th", { className: "r" }, T("Pcs/ctn", "ชิ้น/ลัง")),
              React.createElement("th", { className: "r" }, T("Cost", "ทุน")),
              React.createElement("th", { className: "r" }, T("On hand", "คงเหลือ")),
              React.createElement("th", { className: "c" }, T("Status", "สถานะ")))),
            React.createElement("tbody", null,
              rows.map((r) => {
                const st = r.total <= r.p.reorder * 0.4 ? 2 : r.total <= r.p.reorder ? 1 : 0;
                return React.createElement("tr", { key: r.p.id, style: { cursor: "pointer" }, onClick: () => onNav("product", r.p.id) },
                  React.createElement("td", null, React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
                    React.createElement(ProductThumb, { product: r.p, size: 32 }),
                    React.createElement("div", { className: "cell-strong" }, lang === "th" ? r.p.nameTh : r.p.name))),
                  React.createElement("td", null, React.createElement("span", { className: "mono", style: { fontSize: 12 } }, r.p.sku)),
                  React.createElement("td", null, R(r.p.form, lang === "th" ? r.p.formTh : r.p.form)),
                  React.createElement("td", { className: "r mono" }, r.p.count),
                  React.createElement("td", { className: "r mono" }, W.baht(r.p.cost)),
                  React.createElement("td", { className: "r mono cell-strong" }, W.fmt(r.total)),
                  React.createElement("td", { className: "c" }, React.createElement("span", { className: `badge ${st === 2 ? "red" : st === 1 ? "amber" : "green"}` }, st === 2 ? T("Reorder", "สั่งซื้อ") : st === 1 ? T("Low", "ต่ำ") : T("In stock", "พร้อม"))));
              })))
        )
  );
}
function R(a) { return a; }

function ProductCard({ p, total, lang, onNav }) {
  const W = window.WMS;
  const T = (en, th) => (lang === "th" ? th : en);
  const st = total <= p.reorder * 0.4 ? 2 : total <= p.reorder ? 1 : 0;
  return React.createElement("div", { className: "card", style: { cursor: "pointer", transition: "transform .15s, box-shadow .15s", overflow: "hidden" },
    onClick: () => onNav("product", p.id),
    onMouseEnter: (e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "var(--shadow)"; },
    onMouseLeave: (e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; } },
    React.createElement("div", { className: "swatch-stripes", style: { height: 96, display: "grid", placeItems: "center", borderBottom: "1px solid var(--line)", position: "relative" } },
      React.createElement(ProductThumb, { product: p, size: 52 }),
      React.createElement("span", { className: `badge ${st === 2 ? "red" : st === 1 ? "amber" : "green"}`, style: { position: "absolute", top: 10, right: 10 } },
        React.createElement("span", { className: "dot" }), st === 2 ? T("Reorder", "สั่งซื้อ") : st === 1 ? T("Low", "ต่ำ") : T("OK", "พร้อม"))),
    React.createElement("div", { style: { padding: "13px 15px" } },
      React.createElement("div", { className: "tag", style: { background: "none", padding: 0, color: "var(--ink-3)", marginBottom: 3 } }, p.sku),
      React.createElement("div", { style: { fontWeight: 600, fontSize: 13.5, lineHeight: 1.3, marginBottom: 2 } }, p.brand + " " + p.form),
      React.createElement("div", { style: { fontSize: 12, color: "var(--ink-3)" } }, T("Size", "ไซส์") + " " + p.size + " · ×" + p.count + " " + T("pcs", "ชิ้น")),
      React.createElement("div", { style: { display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 11, paddingTop: 11, borderTop: "1px solid var(--line)" } },
        React.createElement("div", null,
          React.createElement("span", { className: "mono", style: { fontSize: 17, fontWeight: 700 } }, W.fmt(total)),
          React.createElement("span", { style: { fontSize: 11, color: "var(--ink-3)", marginLeft: 4 } }, T("ctn", "ลัง"))),
        React.createElement("span", { className: "mono", style: { fontSize: 12.5, color: "var(--accent-ink)", fontWeight: 600 } }, W.baht(p.price)))));
}

/* ===================== PRODUCT DETAIL ===================== */
function ProductDetail({ productId, lang, onNav, openScanner }) {
  const { state, selectors } = useWMS();
  const W = window.WMS;
  const T = (en, th) => (lang === "th" ? th : en);
  const p = W.prodById[productId];
  if (!p) return React.createElement("div", { className: "page" }, "Not found");

  const total = selectors.totalForProduct(p.id);
  const perWh = W.warehouses.map((w) => ({ w, qty: selectors.stockAt(p.id, w.id) }));
  const maxWh = Math.max(...perWh.map((x) => x.qty), 1);
  const moves = state.movements.filter((m) => m.productId === p.id).slice(0, 8);
  const st = total <= p.reorder * 0.4 ? 2 : total <= p.reorder ? 1 : 0;

  const facts = [
    ["Barcode (EAN-13)", "บาร์โค้ด", p.ean, true],
    ["Category", "หมวดหมู่", lang === "th" ? p.categoryTh : p.category],
    ["Diaper type", "ชนิด", lang === "th" ? p.formTh : p.form],
    ["Size / weight", "ไซส์ / น้ำหนัก", p.size + " · " + p.weight],
    ["Pieces per carton", "ชิ้นต่อลัง", p.count + " " + T("pcs", "ชิ้น"), true],
    ["Unit cost", "ราคาทุน", W.baht(p.cost), true],
    ["Sell price", "ราคาขาย", W.baht(p.price), true],
    ["Country of origin", "ประเทศต้นทาง", p.origin],
    ["Shelf life", "อายุการเก็บ", p.shelfLife],
    ["Reorder point", "จุดสั่งซื้อ", W.fmt(p.reorder) + " " + T("ctn", "ลัง"), true],
  ];

  return React.createElement("div", { className: "page" },
    React.createElement("button", { className: "btn sm ghost", style: { marginBottom: 14 }, onClick: () => onNav("products") },
      React.createElement(Icon, { name: "chevL", size: 15 }), T("All products", "สินค้าทั้งหมด")),

    React.createElement("div", { className: "page-head" },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 14 } },
        React.createElement(ProductThumb, { product: p, size: 52 }),
        React.createElement("div", null,
          React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
            React.createElement("div", { className: "page-title" }, p.brand + " " + p.form + " " + p.size),
            React.createElement("span", { className: `badge ${st === 2 ? "red" : st === 1 ? "amber" : "green"}` }, st === 2 ? T("Reorder", "สั่งซื้อ") : st === 1 ? T("Low stock", "สต็อกต่ำ") : T("In stock", "พร้อมขาย"))),
          React.createElement("div", { className: "page-sub" }, (lang === "th" ? p.nameTh : p.name) + " · " + p.sku))),
      React.createElement("div", { className: "spacer" }),
      React.createElement("button", { className: "btn sm", onClick: openScanner }, React.createElement(Icon, { name: "scan", size: 15 }), T("Re-scan (OCR)", "สแกนใหม่")),
      React.createElement("button", { className: "btn sm" }, React.createElement(Icon, { name: "edit", size: 15 }), T("Edit", "แก้ไข"))),

    React.createElement("div", { className: "grid", style: { gridTemplateColumns: "340px 1fr", alignItems: "start" } },
      // left column
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 16 } },
        React.createElement("div", { className: "card" },
          React.createElement("div", { className: "swatch-stripes", style: { aspectRatio: "4/3", display: "grid", placeItems: "center", position: "relative" } },
            React.createElement("div", { style: { textAlign: "center", color: "var(--ink-3)", fontFamily: "var(--mono)", fontSize: 11.5 } },
              React.createElement(ProductThumb, { product: p, size: 64 }),
              React.createElement("div", { style: { marginTop: 10 } }, T("PRODUCT PHOTO", "รูปสินค้า"))),
            React.createElement("span", { className: "badge gray", style: { position: "absolute", top: 12, left: 12, gap: 5 } },
              React.createElement(Icon, { name: "sparkle", size: 11 }), T("Captured via OCR", "บันทึกด้วย OCR"))),
          React.createElement("div", { style: { padding: "13px 16px", borderTop: "1px solid var(--line)", display: "flex", gap: 8 } },
            React.createElement("button", { className: "btn sm", style: { flex: 1 }, onClick: openScanner }, React.createElement(Icon, { name: "camera", size: 14 }), T("Re-capture", "ถ่ายใหม่")))),
        // master data
        React.createElement("div", { className: "card" },
          React.createElement("div", { className: "card-head" }, React.createElement(Icon, { name: "tag", size: 15, style: { color: "var(--ink-3)" } }), React.createElement("h3", null, T("Master Data", "ข้อมูลสินค้า"))),
          React.createElement("div", null,
            facts.map(([en, th, val, mono], i) => React.createElement("div", { key: i, style: { display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 16px", borderBottom: i < facts.length - 1 ? "1px solid var(--line)" : "none", fontSize: 12.5 } },
              React.createElement("span", { style: { color: "var(--ink-3)" } }, lang === "th" ? th : en),
              React.createElement("span", { className: (mono ? "mono " : "") + "cell-strong", style: { textAlign: "right" } }, val))))),
      ),

      // right column
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 16 } },
        // stock summary
        React.createElement("div", { className: "grid", style: { gridTemplateColumns: "1fr 1fr 1fr" } },
          React.createElement(KPI, { icon: "layers", iconBg: "var(--accent-soft)", iconColor: "var(--accent)", label: T("Total on hand", "คงเหลือรวม"), value: total, unit: T("ctn", "ลัง"), foot: total * p.count + " " + T("pcs", "ชิ้น") }),
          React.createElement(KPI, { icon: "warehouse", iconBg: "var(--move-bg)", iconColor: "var(--move)", label: T("In warehouses", "อยู่ในคลัง"), value: perWh.filter((x) => x.qty > 0).length, animate: false, foot: T("of 5 stocked", "จาก 5 คลัง") }),
          React.createElement(KPI, { icon: "tag", iconBg: "oklch(0.95 0.04 155)", iconColor: "var(--accent-ink)", label: T("Stock value", "มูลค่าสต็อก"), value: Math.round(total * p.cost * p.count), animate: true, format: (n) => "฿" + Math.round(n).toLocaleString() })),

        // stock by warehouse
        React.createElement("div", { className: "card" },
          React.createElement("div", { className: "card-head" }, React.createElement("h3", null, T("Stock by Warehouse", "สต็อกตามคลัง")),
            React.createElement("div", { className: "spacer" }),
            React.createElement("div", { style: { display: "flex", gap: 7 } },
              React.createElement("button", { className: "btn sm", onClick: () => onNav("inbound") }, React.createElement(Icon, { name: "inbound", size: 14, style: { color: "var(--pos)" } }), T("Receive", "รับเข้า")),
              React.createElement("button", { className: "btn sm", onClick: () => onNav("transfer") }, React.createElement(Icon, { name: "transfer", size: 14, style: { color: "var(--move)" } }), T("Transfer", "โอน")),
              React.createElement("button", { className: "btn sm", onClick: () => onNav("outbound") }, React.createElement(Icon, { name: "outbound", size: 14, style: { color: "var(--neg)" } }), T("Ship", "จัดส่ง")))),
          React.createElement("div", { className: "card-pad", style: { paddingTop: 6, paddingBottom: 12 } },
            perWh.map(({ w, qty }) => React.createElement(BarRow, { key: w.id, label: w.code, sub: lang === "th" ? w.cityTh : w.city, value: qty, max: maxWh, caption: W.fmt(qty) + " " + T("ctn", "ลัง"), color: qty === 0 ? "var(--neg)" : "var(--accent)" })))),

        // movement history
        React.createElement("div", { className: "card" },
          React.createElement("div", { className: "card-head" }, React.createElement(Icon, { name: "activity", size: 15, style: { color: "var(--ink-3)" } }), React.createElement("h3", null, T("Movement History", "ประวัติการเคลื่อนไหว"))),
          React.createElement(MovementTable, { rows: moves, lang, compact: true, onNav: () => {} }))
      )
    )
  );
}

Object.assign(window, { Products, ProductCard, ProductDetail });
