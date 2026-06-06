/* ===================================================================
   StockFlow WMS — Stock Movement (transaction history) + MovementTable
   =================================================================== */
function WhCell({ id, lang }) {
  if (!id) return React.createElement("span", { style: { color: "var(--ink-soft)" } }, "—");
  const w = window.WMS.whById[id];
  return React.createElement("span", { className: "tag" }, w.code);
}

function MovementTable({ rows, lang, compact, onNav }) {
  const W = window.WMS;
  const T = (en, th) => (lang === "th" ? th : en);
  if (!rows.length) return React.createElement("div", { className: "empty" }, T("No transactions found.", "ไม่พบรายการ"));
  return React.createElement("div", { className: "tbl-wrap" },
    React.createElement("table", { className: "tbl" },
      React.createElement("thead", null,
        React.createElement("tr", null,
          React.createElement("th", null, T("Reference", "เลขที่อ้างอิง")),
          React.createElement("th", null, T("Type", "ประเภท")),
          React.createElement("th", null, T("Product", "สินค้า")),
          React.createElement("th", { className: "r" }, T("Qty", "จำนวน")),
          React.createElement("th", { className: "c" }, T("From → To", "จาก → ไป")),
          !compact && React.createElement("th", null, T("Party / Reason", "คู่ค้า / เหตุผล")),
          !compact && React.createElement("th", null, T("Operator", "ผู้ทำรายการ")),
          React.createElement("th", { className: "r" }, T("Time", "เวลา")))),
      React.createElement("tbody", null,
        rows.map((m) => {
          const p = W.prodById[m.productId];
          const sign = m.type === "INBOUND" ? "+" : m.type === "TRANSFER" ? "±" : "−";
          const col = m.type === "INBOUND" ? "var(--pos)" : m.type === "TRANSFER" ? "var(--move)" : m.type === "DAMAGE" ? "oklch(0.6 0.14 70)" : "var(--neg)";
          return React.createElement("tr", { key: m.id, style: m.fresh ? { animation: "pageIn .5s ease" } : null },
            React.createElement("td", null, React.createElement("span", { className: "mono", style: { fontSize: 12, fontWeight: 600, color: "var(--ink)" } }, m.id),
              m.fresh && React.createElement("span", { className: "badge green", style: { marginLeft: 7, padding: "1px 6px", fontSize: 10 } }, T("NEW", "ใหม่")),
              m.docRef && React.createElement("div", { className: "tag", style: { background: "none", padding: 0, color: "var(--ink-3)", marginTop: 2 } }, T("Doc: ", "เอกสาร: ") + m.docRef)),
            React.createElement("td", null, React.createElement(MoveBadge, { type: m.type, lang })),
            React.createElement("td", null, React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }, onClick: () => onNav && onNav("product", p.id) },
              React.createElement(ProductThumb, { product: p, size: 30 }),
              React.createElement("div", null,
                React.createElement("div", { style: { fontWeight: 600, color: "var(--ink)", fontSize: 12.5 } }, p.brand + " " + p.size + " · " + p.form),
                React.createElement("div", { className: "tag", style: { background: "none", padding: 0, color: "var(--ink-3)" } }, p.sku)))),
            React.createElement("td", { className: "r" }, React.createElement("span", { className: "mono", style: { fontWeight: 700, color: col } }, sign + W.fmt(m.qty))),
            React.createElement("td", { className: "c" }, React.createElement("div", { style: { display: "inline-flex", alignItems: "center", gap: 5 } },
              React.createElement(WhCell, { id: m.fromWh, lang }),
              (m.fromWh && m.toWh) && React.createElement(Icon, { name: "arrowR", size: 12, style: { color: "var(--ink-soft)" } }),
              React.createElement(WhCell, { id: m.toWh, lang }))),
            !compact && React.createElement("td", null, m.partner ? React.createElement("span", { style: { color: "var(--ink-2)" } }, m.partner) : m.reason ? React.createElement("span", { className: "badge amber" }, lang === "th" ? m.reason.th : m.reason.en) : React.createElement("span", { style: { color: "var(--ink-soft)" } }, "—")),
            !compact && React.createElement("td", null, React.createElement("span", { style: { color: "var(--ink-2)", fontSize: 12.5 } }, m.operator)),
            React.createElement("td", { className: "r" }, React.createElement("span", { style: { color: "var(--ink-3)", fontSize: 12 } }, timeAgo(m.ts))));
        }))
    )
  );
}

function StockMovement({ lang, onNav }) {
  const { state } = useWMS();
  const W = window.WMS;
  const T = (en, th) => (lang === "th" ? th : en);
  const [type, setType] = uState("ALL");
  const [wh, setWh] = uState("ALL");
  const [q, setQ] = uState("");

  const filtered = state.movements.filter((m) => {
    if (type !== "ALL" && m.type !== type) return false;
    if (wh !== "ALL" && m.fromWh !== wh && m.toWh !== wh) return false;
    if (q) {
      const p = W.prodById[m.productId];
      const hay = (m.id + " " + p.sku + " " + p.name + " " + p.nameTh + " " + (m.partner || "")).toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  const counts = {
    ALL: state.movements.length,
    INBOUND: state.movements.filter((m) => m.type === "INBOUND").length,
    OUTBOUND: state.movements.filter((m) => m.type === "OUTBOUND").length,
    TRANSFER: state.movements.filter((m) => m.type === "TRANSFER").length,
    DAMAGE: state.movements.filter((m) => m.type === "DAMAGE").length,
  };
  const tabs = [["ALL", T("All", "ทั้งหมด")], ["INBOUND", T("Inbound", "รับเข้า")], ["OUTBOUND", T("Outbound", "จัดส่ง")], ["TRANSFER", T("Transfer", "โอนคลัง")], ["DAMAGE", T("Damage", "เสียหาย")]];

  return React.createElement("div", { className: "page" },
    React.createElement("div", { className: "page-head" },
      React.createElement("div", null,
        React.createElement("div", { className: "page-title" }, T("Stock Movement", "ความเคลื่อนไหวสต็อก")),
        React.createElement("div", { className: "page-sub" }, T("Complete audit trail of every inventory transaction", "บันทึกการเคลื่อนไหวสินค้าทั้งหมด"))),
      React.createElement("div", { className: "spacer" }),
      React.createElement("button", { className: "btn sm" }, React.createElement(Icon, { name: "download", size: 15 }), T("Export CSV", "ส่งออก CSV"))),

    React.createElement("div", { className: "card" },
      React.createElement("div", { className: "card-head", style: { gap: 12, flexWrap: "wrap" } },
        React.createElement("div", { className: "seg" },
          tabs.map(([k, lab]) => React.createElement("button", { key: k, className: type === k ? "on" : "", onClick: () => setType(k) },
            lab, React.createElement("span", { style: { marginLeft: 6, opacity: .6, fontFamily: "var(--mono)", fontSize: 11 } }, counts[k])))),
        React.createElement("div", { className: "spacer" }),
        React.createElement("select", { className: "select", style: { width: 180 }, value: wh, onChange: (e) => setWh(e.target.value) },
          React.createElement("option", { value: "ALL" }, T("All warehouses", "ทุกคลัง")),
          W.warehouses.map((w) => React.createElement("option", { key: w.id, value: w.id }, w.code + " · " + (lang === "th" ? w.cityTh : w.city)))),
        React.createElement("div", { className: "searchbox", style: { width: 230 } },
          React.createElement(Icon, { name: "search", size: 15 }),
          React.createElement("input", { placeholder: T("Search ref, SKU, party…", "ค้นหา…"), value: q, onChange: (e) => setQ(e.target.value) }))),
      React.createElement("div", { style: { padding: "9px 20px", fontSize: 12, color: "var(--ink-3)", borderBottom: "1px solid var(--line)", display: "flex", gap: 16 } },
        React.createElement("span", null, T("Showing ", "แสดง ") + filtered.length + " " + T("of", "จาก") + " " + state.movements.length + " " + T("transactions", "รายการ"))),
      React.createElement(MovementTable, { rows: filtered, lang, onNav })
    )
  );
}

Object.assign(window, { MovementTable, StockMovement, WhCell });
