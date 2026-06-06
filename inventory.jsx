/* ===================================================================
   StockFlow WMS — Inventory Balance (SKU × warehouse matrix)
   =================================================================== */
function InventoryBalance({ lang, onNav }) {
  const { state, selectors } = useWMS();
  const W = window.WMS;
  const T = (en, th) => (lang === "th" ? th : en);
  const [q, setQ] = uState("");
  const [sort, setSort] = uState({ key: "total", dir: "desc" });
  const [brand, setBrand] = uState("ALL");

  let rows = W.products.map((p) => {
    const perWh = {};
    W.warehouses.forEach((w) => (perWh[w.id] = selectors.stockAt(p.id, w.id)));
    const total = Object.values(perWh).reduce((a, b) => a + b, 0);
    return { p, perWh, total, status: total <= p.reorder * 0.4 ? 2 : total <= p.reorder ? 1 : 0 };
  });

  if (q) rows = rows.filter((r) => (r.p.sku + " " + r.p.name + " " + r.p.nameTh + " " + r.p.brand).toLowerCase().includes(q.toLowerCase()));
  if (brand !== "ALL") rows = rows.filter((r) => r.p.brand === brand);
  rows.sort((a, b) => {
    let av, bv;
    if (sort.key === "total") { av = a.total; bv = b.total; }
    else if (sort.key === "name") { av = a.p.brand; bv = b.p.brand; }
    else { av = a.perWh[sort.key]; bv = b.perWh[sort.key]; }
    const r = av < bv ? -1 : av > bv ? 1 : 0;
    return sort.dir === "asc" ? r : -r;
  });

  const setS = (key) => setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }));
  const sortMark = (key) => sort.key === key ? React.createElement(Icon, { name: "chevD", size: 12, style: { transform: sort.dir === "asc" ? "rotate(180deg)" : "none", verticalAlign: "middle" } }) : null;

  const whTotals = {};
  W.warehouses.forEach((w) => (whTotals[w.id] = rows.reduce((a, r) => a + r.perWh[w.id], 0)));
  const grand = rows.reduce((a, r) => a + r.total, 0);

  const cellStyle = (v, reorder) => {
    if (v === 0) return { color: "oklch(0.55 0.15 28)", fontWeight: 700 };
    if (v <= reorder * 0.12) return { color: "oklch(0.58 0.13 70)", fontWeight: 600 };
    return { color: "var(--ink)", fontWeight: 500 };
  };

  const brands = ["ALL", ...new Set(W.products.map((p) => p.brand))];

  // full per-warehouse totals (independent of search/brand filters) for the summary
  const whFull = W.warehouses.map((w) => {
    let ctn = 0, pcs = 0, val = 0, skus = 0;
    W.products.forEach((p) => { const x = selectors.stockAt(p.id, w.id); ctn += x; pcs += x * p.count; val += x * p.cost * p.count; if (x > 0) skus++; });
    return { w, ctn, pcs, val, skus, util: ctn / w.cap, over: ctn > w.cap };
  });
  const grandAll = whFull.reduce((a, x) => a + x.ctn, 0);
  const pcsAll = whFull.reduce((a, x) => a + x.pcs, 0);
  const valAll = whFull.reduce((a, x) => a + x.val, 0);
  const maxCtn = Math.max(...whFull.map((x) => x.ctn), 1);

  return React.createElement("div", { className: "page" },
    React.createElement("div", { className: "page-head" },
      React.createElement("div", null,
        React.createElement("div", { className: "page-title" }, T("Inventory Balance", "ยอดสต็อกคงเหลือ")),
        React.createElement("div", { className: "page-sub" }, T("Live stock levels per SKU across all warehouses", "ยอดคงเหลือรายสินค้าในทุกคลังแบบเรียลไทม์"))),
      React.createElement("div", { className: "spacer" }),
      React.createElement("div", { style: { display: "flex", gap: 14, alignItems: "center" } },
        React.createElement(StatPill, { label: T("Total cartons", "ลังทั้งหมด"), value: W.fmt(grand) }),
        React.createElement(StatPill, { label: T("SKUs", "รายการ"), value: rows.length }),
        React.createElement("button", { className: "btn sm" }, React.createElement(Icon, { name: "download", size: 15 }), T("Export", "ส่งออก")))),

    // ===== balance summary: grand total + per-warehouse levels =====
    React.createElement("div", { className: "balance-summary" },
      React.createElement("div", { className: "card balance-hero" },
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, color: "var(--accent-ink)", fontSize: 12, fontWeight: 600, letterSpacing: ".02em" } },
          React.createElement(Icon, { name: "layers", size: 16 }),
          T("Total Inventory Balance", "ยอดสต็อกรวมทั้งหมด"),
          React.createElement("span", { className: "pulse-dot", style: { marginLeft: 2 } })),
        React.createElement("div", { style: { display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 } },
          React.createElement("span", { className: "mono", style: { fontSize: 38, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1, color: "var(--ink)" } }, React.createElement(CountUp, { value: grandAll })),
          React.createElement("span", { style: { fontSize: 14, color: "var(--ink-3)", fontWeight: 500 } }, T("cartons", "ลัง"))),
        React.createElement("div", { style: { display: "flex", gap: 22, marginTop: 16, flexWrap: "wrap" } },
          React.createElement(HeroStat, { label: T("Total pieces", "จำนวนชิ้นรวม"), value: W.fmt(pcsAll) }),
          React.createElement(HeroStat, { label: T("Stock value", "มูลค่าสต็อก"), value: W.baht(valAll) }),
          React.createElement(HeroStat, { label: T("Warehouses", "คลังสินค้า"), value: "5" }),
          React.createElement(HeroStat, { label: T("Active SKUs", "รายการสินค้า"), value: "30" }))),
      React.createElement("div", { className: "balance-wh-grid" },
        whFull.map((d) => React.createElement(WarehouseBalanceCard, { key: d.w.id, d, lang, share: d.ctn / (grandAll || 1) })))),

    React.createElement("div", { className: "card" },
      React.createElement("div", { className: "card-head", style: { gap: 12 } },
        React.createElement("div", { className: "searchbox", style: { width: 260 } },
          React.createElement(Icon, { name: "search", size: 15 }),
          React.createElement("input", { placeholder: T("Search SKU or product…", "ค้นหาสินค้า…"), value: q, onChange: (e) => setQ(e.target.value) })),
        React.createElement("select", { className: "select", style: { width: 160 }, value: brand, onChange: (e) => setBrand(e.target.value) },
          brands.map((b) => React.createElement("option", { key: b, value: b }, b === "ALL" ? T("All brands", "ทุกแบรนด์") : b))),
        React.createElement("div", { className: "spacer" }),
        React.createElement("div", { style: { display: "flex", gap: 14, fontSize: 11.5, color: "var(--ink-3)" } },
          React.createElement(DotKey, { color: "oklch(0.55 0.15 28)", label: T("Out", "หมด") }),
          React.createElement(DotKey, { color: "oklch(0.58 0.13 70)", label: T("Low", "ต่ำ") }),
          React.createElement(DotKey, { color: "var(--ink)", label: T("OK", "ปกติ") }))),
      React.createElement("div", { className: "tbl-wrap" },
        React.createElement("table", { className: "tbl" },
          React.createElement("thead", null,
            React.createElement("tr", null,
              React.createElement("th", { className: "th-sort", onClick: () => setS("name"), style: { minWidth: 230 } }, T("Product", "สินค้า"), " ", sortMark("name")),
              W.warehouses.map((w) => React.createElement("th", { key: w.id, className: "r th-sort", onClick: () => setS(w.id) },
                React.createElement("div", { title: lang === "th" ? w.nameTh : w.name }, w.code), sortMark(w.id))),
              React.createElement("th", { className: "r th-sort", onClick: () => setS("total"), style: { borderLeft: "1px solid var(--line)" } }, T("Total", "รวม"), " ", sortMark("total")),
              React.createElement("th", { className: "c" }, T("Status", "สถานะ")))),
          React.createElement("tbody", null,
            rows.map((r) => React.createElement("tr", { key: r.p.id, style: { cursor: "pointer" }, onClick: () => onNav("product", r.p.id) },
              React.createElement("td", null, React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
                React.createElement(ProductThumb, { product: r.p, size: 32 }),
                React.createElement("div", null,
                  React.createElement("div", { className: "cell-strong", style: { fontSize: 12.5 } }, r.p.brand + " " + r.p.form + " " + r.p.size),
                  React.createElement("div", { className: "tag", style: { background: "none", padding: 0, color: "var(--ink-3)" } }, r.p.sku + " · ×" + r.p.count)))),
              W.warehouses.map((w) => React.createElement("td", { key: w.id, className: "r mono", style: { fontSize: 12.5, ...cellStyle(r.perWh[w.id], r.p.reorder) } }, W.fmt(r.perWh[w.id]))),
              React.createElement("td", { className: "r mono cell-strong", style: { borderLeft: "1px solid var(--line)", fontSize: 13 } }, W.fmt(r.total)),
              React.createElement("td", { className: "c" }, React.createElement("span", { className: `badge ${r.status === 2 ? "red" : r.status === 1 ? "amber" : "green"}` },
                r.status === 2 ? T("Reorder", "สั่งซื้อ") : r.status === 1 ? T("Low", "ต่ำ") : T("In stock", "พร้อม"))))),
            // totals row
            React.createElement("tr", { style: { background: "var(--surface-2)", fontWeight: 700 } },
              React.createElement("td", { className: "cell-strong" }, T("Total on hand", "รวมทั้งหมด")),
              W.warehouses.map((w) => React.createElement("td", { key: w.id, className: "r mono cell-strong", style: { fontSize: 12.5 } }, W.fmt(whTotals[w.id]))),
              React.createElement("td", { className: "r mono cell-strong", style: { borderLeft: "1px solid var(--line)" } }, W.fmt(grand)),
              React.createElement("td", null)))))
    )
  );
}

function StatPill({ label, value }) {
  return React.createElement("div", { style: { textAlign: "right" } },
    React.createElement("div", { className: "mono", style: { fontSize: 17, fontWeight: 600, lineHeight: 1 } }, value),
    React.createElement("div", { style: { fontSize: 10.5, color: "var(--ink-3)", marginTop: 2 } }, label));
}
function HeroStat({ label, value }) {
  return React.createElement("div", null,
    React.createElement("div", { className: "mono", style: { fontSize: 16, fontWeight: 600, color: "var(--ink)", lineHeight: 1.1 } }, value),
    React.createElement("div", { style: { fontSize: 11, color: "var(--ink-3)", marginTop: 3 } }, label));
}
function WarehouseBalanceCard({ d, lang, share }) {
  const W = window.WMS;
  const T = (en, th) => (lang === "th" ? th : en);
  const utilPct = Math.round(d.util * 100);
  const barPct = Math.min(100, d.util * 100);
  const col = d.over ? "var(--neg)" : d.util > 0.85 ? "oklch(0.62 0.14 70)" : "var(--accent)";
  return React.createElement("div", { className: "card wh-balance-card" },
    React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 12 } },
      React.createElement("div", { style: { width: 30, height: 30, borderRadius: 8, background: "var(--surface-3)", display: "grid", placeItems: "center", color: "var(--ink-2)", flex: "none" } }, React.createElement(Icon, { name: "warehouse", size: 16 })),
      React.createElement("div", { style: { minWidth: 0 } },
        React.createElement("div", { style: { fontWeight: 600, fontSize: 13, lineHeight: 1.1 } }, d.w.code),
        React.createElement("div", { className: "clamp1", style: { fontSize: 11, color: "var(--ink-3)" } }, lang === "th" ? d.w.cityTh : d.w.city)),
      React.createElement("span", { className: "tag", style: { marginLeft: "auto", flex: "none" } }, Math.round(share * 100) + "%")),
    React.createElement("div", { style: { display: "flex", alignItems: "baseline", gap: 5 } },
      React.createElement("span", { className: "mono", style: { fontSize: 23, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink)" } }, W.fmt(d.ctn)),
      React.createElement("span", { style: { fontSize: 11.5, color: "var(--ink-3)" } }, T("ctn", "ลัง"))),
    React.createElement("div", { style: { fontSize: 11, color: "var(--ink-soft)", marginTop: 1 } }, W.fmt(d.pcs) + " " + T("pcs", "ชิ้น") + " · " + d.skus + "/30 " + T("SKUs", "รายการ")),
    React.createElement("div", { className: "bar-track", style: { marginTop: 11 } },
      React.createElement("div", { className: "bar-fill", style: { width: barPct + "%", background: col } })),
    React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10.5, color: "var(--ink-3)" } },
      React.createElement("span", null, T("Capacity", "ความจุ") + " " + W.fmt(d.w.cap)),
      React.createElement("span", { style: { fontWeight: 600, color: d.over ? "var(--neg)" : "var(--ink-2)" } }, utilPct + "%" + (d.over ? " · " + T("over", "เกิน") : ""))));
}
function DotKey({ color, label }) {
  return React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 5 } },
    React.createElement("span", { style: { width: 8, height: 8, borderRadius: 3, background: color } }), label);
}

Object.assign(window, { InventoryBalance, StatPill, DotKey, HeroStat, WarehouseBalanceCard });
