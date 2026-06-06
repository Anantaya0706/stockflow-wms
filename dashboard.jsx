/* ===================================================================
   StockFlow WMS — Dashboard
   =================================================================== */
function Dashboard({ lang, onNav }) {
  const { state, selectors } = useWMS();
  const W = window.WMS;
  const T = (en, th) => (lang === "th" ? th : en);

  const grand = selectors.grandTotal();
  const low = selectors.lowStock();
  const today = "2026-06-06";
  const todayMoves = state.movements.filter((m) => m.ts.slice(0, 10) === today);
  const inToday = todayMoves.filter((m) => m.type === "INBOUND").reduce((a, m) => a + m.qty, 0);
  const outToday = todayMoves.filter((m) => m.type === "OUTBOUND").reduce((a, m) => a + m.qty, 0);
  const dmgToday = todayMoves.filter((m) => m.type === "DAMAGE").reduce((a, m) => a + m.qty, 0);

  const whBars = W.warehouses.map((w) => ({ w, total: selectors.totalForWarehouse(w.id) }));
  const maxWh = Math.max(...whBars.map((b) => b.total));

  // size distribution
  const sizeAgg = {};
  W.products.forEach((p) => { sizeAgg[p.size] = (sizeAgg[p.size] || 0) + selectors.totalForProduct(p.id); });
  const sizeColors = { NB: "oklch(0.7 0.12 200)", S: "oklch(0.62 0.13 175)", M: "oklch(0.6 0.13 155)", L: "oklch(0.6 0.13 130)", XL: "oklch(0.62 0.14 95)", XXL: "oklch(0.65 0.14 60)" };
  const donutSegs = ["NB", "S", "M", "L", "XL", "XXL"].filter((s) => sizeAgg[s]).map((s) => ({ label: s, value: sizeAgg[s], color: sizeColors[s] }));

  const recent = state.movements.slice(0, 7);

  return React.createElement("div", { className: "page" },
    // header
    React.createElement("div", { className: "page-head" },
      React.createElement("div", null,
        React.createElement("div", { className: "page-title" }, T("Operations Dashboard", "แดชบอร์ดการดำเนินงาน")),
        React.createElement("div", { className: "page-sub" }, T("Real-time inventory across 5 warehouses · ", "ภาพรวมสต็อกแบบเรียลไทม์ 5 คลัง · ") + "Fri, 6 Jun 2026")),
      React.createElement("div", { className: "spacer" }),
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--ink-3)" } },
        React.createElement("div", { className: "pulse-dot" }),
        T("Live sync active", "ซิงค์ข้อมูลสด"))),

    // KPI row
    React.createElement("div", { className: "grid", style: { gridTemplateColumns: "repeat(6, 1fr)", marginBottom: 16 } },
      React.createElement(KPI, { icon: "layers", iconBg: "var(--accent-soft)", iconColor: "var(--accent)", label: T("Total Stock", "สต็อกรวม"), value: grand, unit: T("ctn", "ลัง"), delta: "+2.4%", deltaDir: "up", foot: T("vs last week", "เทียบสัปดาห์ก่อน") }),
      React.createElement(KPI, { icon: "box", iconBg: "var(--move-bg)", iconColor: "var(--move)", label: T("Active SKUs", "รายการสินค้า"), value: 30, animate: false, foot: T("1 category", "1 หมวดหมู่") }),
      React.createElement(KPI, { icon: "warehouse", iconBg: "oklch(0.95 0.03 280)", iconColor: "oklch(0.55 0.13 280)", label: T("Warehouses", "คลังสินค้า"), value: 5, animate: false, foot: T("all online", "ออนไลน์ทั้งหมด") }),
      React.createElement(KPI, { icon: "inbound", iconBg: "var(--pos-bg)", iconColor: "var(--pos)", label: T("Inbound Today", "รับเข้าวันนี้"), value: inToday, unit: T("ctn", "ลัง"), delta: `${todayMoves.filter(m=>m.type==='INBOUND').length} ${T("GRNs","ใบ")}`, deltaDir: "up", foot: T("received", "รับแล้ว") }),
      React.createElement(KPI, { icon: "outbound", iconBg: "var(--neg-bg)", iconColor: "var(--neg)", label: T("Outbound Today", "จัดส่งวันนี้"), value: outToday, unit: T("ctn", "ลัง"), delta: `${todayMoves.filter(m=>m.type==='OUTBOUND').length} ${T("DOs","ใบ")}`, deltaDir: "down", foot: T("shipped", "ส่งแล้ว") }),
      React.createElement(KPI, { icon: "damage", iconBg: "var(--warn-bg)", iconColor: "oklch(0.6 0.14 70)", label: T("Low-stock Alerts", "แจ้งเตือนสต็อกต่ำ"), value: low.length, animate: false, foot: T("need reorder", "ต้องสั่งเพิ่ม") })
    ),

    // main grid: trend + side
    React.createElement("div", { className: "grid", style: { gridTemplateColumns: "1.7fr 1fr", marginBottom: 16, alignItems: "start" } },
      // trend card
      React.createElement("div", { className: "card" },
        React.createElement("div", { className: "card-head" },
          React.createElement("h3", null, T("Stock Movement — last 14 days", "ความเคลื่อนไหวสต็อก — 14 วัน")),
          React.createElement("div", { className: "spacer" }),
          React.createElement("div", { style: { display: "flex", gap: 16 } },
            React.createElement(Legend, { color: "var(--accent)", label: T("Inbound", "รับเข้า") }),
            React.createElement(Legend, { color: "var(--neg)", label: T("Outbound", "จัดส่ง") }))),
        React.createElement("div", { className: "card-pad" },
          React.createElement(AreaChart, { data: W.trend, height: 168 }))),
      // size distribution
      React.createElement("div", { className: "card" },
        React.createElement("div", { className: "card-head" }, React.createElement("h3", null, T("Stock by Size", "สต็อกตามไซส์"))),
        React.createElement("div", { className: "card-pad", style: { display: "flex", gap: 18, alignItems: "center" } },
          React.createElement(Donut, { segments: donutSegs, center: React.createElement("div", null,
            React.createElement("div", { className: "mono", style: { fontSize: 19, fontWeight: 600 } }, W.fmt(grand)),
            React.createElement("div", { style: { fontSize: 10.5, color: "var(--ink-3)" } }, T("cartons", "ลัง"))) }),
          React.createElement("div", { style: { flex: 1, display: "flex", flexDirection: "column", gap: 7 } },
            donutSegs.map((s) => React.createElement("div", { key: s.label, style: { display: "flex", alignItems: "center", gap: 8, fontSize: 12 } },
              React.createElement("span", { style: { width: 9, height: 9, borderRadius: 3, background: s.color, flex: "none" } }),
              React.createElement("span", { style: { fontWeight: 600, width: 30 } }, s.label),
              React.createElement("span", { style: { color: "var(--ink-3)", marginLeft: "auto" }, className: "mono" }, W.fmt(s.value))))))
      )
    ),

    // warehouse + low stock + recent
    React.createElement("div", { className: "grid", style: { gridTemplateColumns: "1fr 1fr", marginBottom: 16, alignItems: "start" } },
      // warehouse capacity
      React.createElement("div", { className: "card" },
        React.createElement("div", { className: "card-head" },
          React.createElement("h3", null, T("Stock by Warehouse", "สต็อกตามคลัง")),
          React.createElement("div", { className: "spacer" }),
          React.createElement("button", { className: "btn sm ghost", onClick: () => onNav("balance") }, T("Balance", "ยอดคงเหลือ"), React.createElement(Icon, { name: "chevR", size: 14 }))),
        React.createElement("div", { className: "card-pad", style: { paddingTop: 8, paddingBottom: 12 } },
          whBars.map((b) => React.createElement(BarRow, {
            key: b.w.id, label: b.w.code, sub: lang === "th" ? b.w.cityTh : b.w.city,
            value: b.total, max: maxWh, caption: W.fmt(b.total),
            color: `oklch(0.6 0.13 ${155 - W.warehouses.indexOf(b.w) * 10})`,
          })))),
      // low stock
      React.createElement("div", { className: "card" },
        React.createElement("div", { className: "card-head" },
          React.createElement("div", { className: "kpi-ico", style: { width: 26, height: 26, background: "var(--warn-bg)", color: "oklch(0.6 0.14 70)" } }, React.createElement(Icon, { name: "damage", size: 14 })),
          React.createElement("h3", null, T("Reorder Alerts", "แจ้งเตือนสั่งซื้อ")),
          React.createElement("span", { className: "badge amber" }, low.length),
          React.createElement("div", { className: "spacer" }),
          React.createElement("button", { className: "btn sm primary", onClick: () => onNav("inbound") }, React.createElement(Icon, { name: "plus", size: 14 }), T("Receive", "รับเข้า"))),
        React.createElement("div", { style: { maxHeight: 250, overflowY: "auto" } },
          React.createElement("table", { className: "tbl" },
            React.createElement("tbody", null,
              low.slice(0, 6).map(({ product, total, ratio }) => React.createElement("tr", { key: product.id, style: { cursor: "pointer" }, onClick: () => onNav("product", product.id) },
                React.createElement("td", { style: { width: 48 } }, React.createElement(ProductThumb, { product, size: 34 })),
                React.createElement("td", null,
                  React.createElement("div", { className: "cell-strong" }, product.brand + " " + product.size),
                  React.createElement("div", { className: "tag", style: { background: "none", padding: 0, color: "var(--ink-3)" } }, product.sku)),
                React.createElement("td", { className: "r" },
                  React.createElement("div", { className: "mono cell-strong" }, W.fmt(total)),
                  React.createElement("div", { style: { fontSize: 10.5, color: "var(--ink-soft)" } }, T("min ", "ขั้นต่ำ ") + W.fmt(product.reorder))),
                React.createElement("td", { style: { width: 70 } },
                  React.createElement("span", { className: `badge ${ratio < 0.4 ? "red" : "amber"}` }, ratio < 0.4 ? T("Critical", "วิกฤต") : T("Low", "ต่ำ"))))))))
      )
    ),

    // recent movements
    React.createElement("div", { className: "card" },
      React.createElement("div", { className: "card-head" },
        React.createElement(Icon, { name: "activity", size: 16, style: { color: "var(--ink-3)" } }),
        React.createElement("h3", null, T("Recent Transactions", "รายการล่าสุด")),
        React.createElement("div", { className: "spacer" }),
        React.createElement("button", { className: "btn sm ghost", onClick: () => onNav("movement") }, T("View all", "ดูทั้งหมด"), React.createElement(Icon, { name: "chevR", size: 14 }))),
      React.createElement(MovementTable, { rows: recent, lang, compact: true, onNav })
    )
  );
}

function Legend({ color, label }) {
  return React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink-2)", fontWeight: 500 } },
    React.createElement("span", { style: { width: 16, height: 3, borderRadius: 2, background: color } }), label);
}

Object.assign(window, { Dashboard, Legend });
