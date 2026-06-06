/* ===================================================================
   StockFlow WMS — app shell, sidebar, routing
   =================================================================== */
const { useState: aState } = React;

function App() {
  const { selectors, state, reset, pushToast } = useWMS();
  const W = window.WMS;
  const [view, setView] = aState("dashboard");
  const [productId, setProductId] = aState(null);
  const [lang, setLang] = aState("en");
  const [scanner, setScanner] = aState(false);
  const T = (en, th) => (lang === "th" ? th : en);

  const onNav = (v, arg) => {
    if (v === "product") { setProductId(arg); setView("product"); }
    else setView(v);
    document.querySelector(".main")?.scrollTo({ top: 0 });
  };

  const lowCount = selectors.lowStock().length;

  const NAV = [
    { group: T("Overview", "ภาพรวม"), items: [
      { id: "dashboard", icon: "dash", en: "Dashboard", th: "แดชบอร์ด" },
    ]},
    { group: T("Inventory", "คลังสินค้า"), items: [
      { id: "balance", icon: "balance", en: "Inventory Balance", th: "ยอดคงเหลือ" },
      { id: "movement", icon: "activity", en: "Stock Movement", th: "ความเคลื่อนไหว", badge: state.movements.length },
      { id: "products", icon: "box", en: "Products", th: "สินค้า", badge: 30 },
    ]},
    { group: T("Transactions", "ทำรายการ"), items: [
      { id: "inbound", icon: "inbound", en: "Receiving", th: "รับสินค้า" },
      { id: "outbound", icon: "outbound", en: "Shipping", th: "จัดส่ง" },
      { id: "transfer", icon: "transfer", en: "Transfer", th: "โอนระหว่างคลัง" },
      { id: "damage", icon: "damage", en: "Damaged Goods", th: "สินค้าเสียหาย" },
    ]},
  ];

  const crumbMap = {
    dashboard: [T("Overview", "ภาพรวม"), T("Dashboard", "แดชบอร์ด")],
    balance: [T("Inventory", "คลังสินค้า"), T("Inventory Balance", "ยอดคงเหลือ")],
    movement: [T("Inventory", "คลังสินค้า"), T("Stock Movement", "ความเคลื่อนไหว")],
    products: [T("Inventory", "คลังสินค้า"), T("Products", "สินค้า")],
    product: [T("Inventory", "คลังสินค้า"), T("Products", "สินค้า"), productId],
    inbound: [T("Transactions", "ทำรายการ"), T("Receiving", "รับสินค้า")],
    outbound: [T("Transactions", "ทำรายการ"), T("Shipping", "จัดส่ง")],
    transfer: [T("Transactions", "ทำรายการ"), T("Transfer", "โอนระหว่างคลัง")],
    damage: [T("Transactions", "ทำรายการ"), T("Damaged Goods", "สินค้าเสียหาย")],
  };
  const crumb = crumbMap[view] || ["", ""];

  let body;
  if (view === "dashboard") body = React.createElement(Dashboard, { lang, onNav });
  else if (view === "balance") body = React.createElement(InventoryBalance, { lang, onNav });
  else if (view === "movement") body = React.createElement(StockMovement, { lang, onNav });
  else if (view === "products") body = React.createElement(Products, { lang, onNav, openScanner: () => setScanner(true) });
  else if (view === "product") body = React.createElement(ProductDetail, { productId, lang, onNav, openScanner: () => setScanner(true) });
  else if (["inbound", "outbound", "transfer", "damage"].includes(view))
    body = React.createElement(TransactionForm, { kind: { inbound: "INBOUND", outbound: "OUTBOUND", transfer: "TRANSFER", damage: "DAMAGE" }[view], lang, onNav });

  return React.createElement("div", { className: "app" },
    // ---------- sidebar ----------
    React.createElement("aside", { className: "sidebar" },
      React.createElement("div", { className: "brand" },
        React.createElement("div", { className: "brand-mark" }, React.createElement(Icon, { name: "layers", size: 19, sw: 2.2 })),
        React.createElement("div", null,
          React.createElement("div", { className: "brand-name" }, "StockFlow"),
          React.createElement("div", { className: "brand-sub" }, "WMS"))),
      React.createElement("nav", { className: "nav" },
        NAV.map((g) => React.createElement("div", { className: "nav-group", key: g.group },
          React.createElement("div", { className: "nav-label" }, g.group),
          g.items.map((it) => React.createElement("button", { key: it.id, className: "nav-item" + (view === it.id || (view === "product" && it.id === "products") ? " active" : ""), onClick: () => onNav(it.id) },
            React.createElement(Icon, { name: it.icon, size: 18, sw: 2, className: "nav-ico" }),
            React.createElement("span", null, lang === "th" ? it.th : it.en),
            it.badge != null && React.createElement("span", { className: "nav-badge" }, it.badge),
            it.id === "balance" && lowCount > 0 && React.createElement("span", { className: "nav-badge alert" }, lowCount))))) ,
        // CTA
        React.createElement("div", { style: { padding: "10px 8px 0" } },
          React.createElement("button", { className: "btn primary", style: { width: "100%" }, onClick: () => { onNav("products"); setScanner(true); } },
            React.createElement(Icon, { name: "scan", size: 16 }), T("Scan Product", "สแกนสินค้า")))),
      React.createElement("div", { className: "sidebar-foot" },
        React.createElement("div", { className: "avatar" }, "PV"),
        React.createElement("div", { style: { lineHeight: 1.2, flex: 1, minWidth: 0 } },
          React.createElement("div", { style: { fontSize: 12.5, fontWeight: 600 } }, "P+V Operations"),
          React.createElement("div", { style: { fontSize: 11, color: "var(--ink-3)" } }, T("Admin", "ผู้ดูแลระบบ"))),
        React.createElement("button", { className: "x-btn", title: T("Reset demo data", "รีเซ็ตข้อมูล"), onClick: () => { reset(); pushToast({ kind: "INFO", icon: "refresh", title: T("Demo data reset", "รีเซ็ตข้อมูลแล้ว") }); onNav("dashboard"); } },
          React.createElement(Icon, { name: "refresh", size: 16 })))),

    // ---------- main ----------
    React.createElement("div", { className: "main" },
      React.createElement("header", { className: "topbar" },
        React.createElement("div", { className: "crumb" },
          crumb.map((c, i) => React.createElement(React.Fragment, { key: i },
            i > 0 && React.createElement(Icon, { name: "chevR", size: 13, style: { color: "var(--ink-soft)" } }),
            i === crumb.length - 1 ? React.createElement("b", null, c) : React.createElement("span", null, c)))),
        React.createElement("div", { className: "topbar-spacer" }),
        React.createElement("div", { className: "searchbox" },
          React.createElement(Icon, { name: "search", size: 15 }),
          React.createElement("input", { placeholder: T("Search SKU, transaction…", "ค้นหาสินค้า, รายการ…"), onFocus: () => onNav("balance") })),
        React.createElement("div", { className: "seg", style: { padding: 2 } },
          React.createElement("button", { className: lang === "en" ? "on" : "", onClick: () => setLang("en"), style: { padding: "5px 11px", fontSize: 12 } }, "EN"),
          React.createElement("button", { className: lang === "th" ? "on" : "", onClick: () => setLang("th"), style: { padding: "5px 11px", fontSize: 12 } }, "ไทย")),
        React.createElement("button", { className: "btn icon ghost", style: { position: "relative" } },
          React.createElement(Icon, { name: "bell", size: 18 }),
          lowCount > 0 && React.createElement("span", { style: { position: "absolute", top: 6, right: 6, width: 7, height: 7, borderRadius: 4, background: "var(--warn)", border: "1.5px solid var(--surface)" } }))),
      body
    ),

    scanner && React.createElement(OCRScanner, { lang, onClose: () => setScanner(false) }),
    React.createElement(ToastHost, null)
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(React.createElement(WMSProvider, null, React.createElement(App, null)));
