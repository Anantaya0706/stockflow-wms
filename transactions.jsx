/* ===================================================================
   StockFlow WMS — Transaction forms
   One engine, four modes. Posting mutates the live stock matrix.
   =================================================================== */
const TX_CONFIG = {
  INBOUND: {
    titleEn: "Receiving", titleTh: "รับสินค้าเข้าคลัง", refEn: "Goods Receipt Note", icon: "inbound",
    color: "var(--pos)", bg: "var(--pos-bg)", needs: ["toWh", "partner"],
    partyEn: "Supplier", partyTh: "ผู้จัดส่ง", partyList: "partnersIn", signEn: "added to", signTh: "เพิ่มเข้า",
  },
  OUTBOUND: {
    titleEn: "Shipping", titleTh: "จัดส่งสินค้าออก", refEn: "Delivery Order", icon: "outbound",
    color: "var(--neg)", bg: "var(--neg-bg)", needs: ["fromWh", "partner"],
    partyEn: "Customer", partyTh: "ลูกค้า", partyList: "partnersOut", signEn: "deducted from", signTh: "ตัดออกจาก",
  },
  TRANSFER: {
    titleEn: "Inter-warehouse Transfer", titleTh: "โอนสินค้าระหว่างคลัง", refEn: "Transfer Order", icon: "transfer",
    color: "var(--move)", bg: "var(--move-bg)", needs: ["fromWh", "toWh"], signEn: "moved between", signTh: "โอนระหว่าง",
  },
  DAMAGE: {
    titleEn: "Damaged / Defective Goods", titleTh: "สินค้าเสียหาย / ชำรุด", refEn: "Damage Write-off", icon: "damage",
    color: "oklch(0.6 0.14 70)", bg: "var(--warn-bg)", needs: ["fromWh", "reason"], signEn: "written off from", signTh: "ตัดจำหน่ายจาก",
  },
};

function TransactionForm({ kind, lang, onNav }) {
  const cfg = TX_CONFIG[kind];
  const { state, post, pushToast, selectors } = useWMS();
  const W = window.WMS;
  const T = (en, th) => (lang === "th" ? th : en);

  const [fromWh, setFromWh] = uState(kind === "INBOUND" ? "" : "WH-BKK");
  const [toWh, setToWh] = uState(kind === "INBOUND" ? "WH-BKK" : (kind === "TRANSFER" ? "WH-CBI" : ""));
  const [partner, setPartner] = uState("");
  const [reason, setReason] = uState(0);
  const [operator, setOperator] = uState("");
  const [docRef, setDocRef] = uState("");
  const [lines, setLines] = uState([]);
  const [search, setSearch] = uState("");
  const [posted, setPosted] = uState(null);

  uEffect(() => { // reset everything when switching transaction kind
    setFromWh(kind === "INBOUND" ? "" : "WH-BKK");
    setToWh(kind === "INBOUND" ? "WH-BKK" : (kind === "TRANSFER" ? "WH-CBI" : ""));
    setPartner(""); setReason(0); setDocRef(""); setLines([]); setSearch(""); setPosted(null); setOperator("");
  }, [kind]);

  const srcWh = kind === "INBOUND" ? null : fromWh;
  const avail = (pid) => (srcWh ? selectors.stockAt(pid, srcWh) : Infinity);

  const addLine = (p) => {
    if (lines.find((l) => l.productId === p.id)) { setSearch(""); return; }
    setLines((ls) => [...ls, { productId: p.id, qty: 10 }]);
    setSearch("");
  };
  const setQty = (pid, qty) => setLines((ls) => ls.map((l) => l.productId === pid ? { ...l, qty: Math.max(0, qty) } : l));
  const removeLine = (pid) => setLines((ls) => ls.filter((l) => l.productId !== pid));

  // validation
  const errors = [];
  if (cfg.needs.includes("toWh") && !toWh) errors.push(T("Select destination warehouse", "เลือกคลังปลายทาง"));
  if (cfg.needs.includes("fromWh") && !fromWh) errors.push(T("Select source warehouse", "เลือกคลังต้นทาง"));
  if (kind === "TRANSFER" && fromWh && fromWh === toWh) errors.push(T("Source and destination must differ", "คลังต้นทางและปลายทางต้องต่างกัน"));
  if (cfg.needs.includes("partner") && !partner) errors.push(T(`Select ${cfg.partyEn.toLowerCase()}`, "เลือกคู่ค้า"));
  if (!lines.length) errors.push(T("Add at least one product line", "เพิ่มรายการสินค้าอย่างน้อย 1 รายการ"));
  lines.forEach((l) => {
    if (l.qty <= 0) errors.push(W.prodById[l.productId].sku + ": " + T("quantity must be > 0", "จำนวนต้องมากกว่า 0"));
    if (srcWh && l.qty > avail(l.productId)) errors.push(W.prodById[l.productId].sku + ": " + T("exceeds available stock", "เกินจำนวนคงเหลือ"));
  });
  const valid = errors.length === 0;

  const totalQty = lines.reduce((a, l) => a + (Number(l.qty) || 0), 0);
  const totalPcs = lines.reduce((a, l) => a + (Number(l.qty) || 0) * W.prodById[l.productId].count, 0);
  const totalValue = lines.reduce((a, l) => a + (Number(l.qty) || 0) * W.prodById[l.productId].cost * W.prodById[l.productId].count, 0);

  const submit = () => {
    if (!valid) return;
    const payload = {
      kind, lines: lines.map((l) => ({ productId: l.productId, qty: Number(l.qty) })),
      fromWh: kind === "INBOUND" ? undefined : fromWh,
      toWh: kind === "OUTBOUND" ? undefined : toWh,
      partner: cfg.needs.includes("partner") ? partner : undefined,
      reason: kind === "DAMAGE" ? W.damageReasons[reason] : undefined,
      docRef: docRef.trim() || undefined,
      operator: operator.trim() || "—",
    };
    post(payload);
    pushToast({
      kind, title: T(cfg.titleEn + " posted", cfg.titleTh + " สำเร็จ"),
      msg: `${lines.length} ${T("lines", "รายการ")} · ${W.fmt(totalQty)} ${T("cartons", "ลัง")}`,
    });
    setPosted({ count: lines.length, qty: totalQty, value: totalValue });
    setLines([]); setPartner(""); setDocRef(""); setSearch("");
  };

  const filtered = W.products.filter((p) =>
    !lines.find((l) => l.productId === p.id) &&
    (p.sku + " " + p.name + " " + p.nameTh + " " + p.brand).toLowerCase().includes(search.toLowerCase())
  ).slice(0, 7);

  return React.createElement("div", { className: "page" },
    React.createElement("div", { className: "page-head" },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 13 } },
        React.createElement("div", { className: "kpi-ico", style: { width: 42, height: 42, borderRadius: 11, background: cfg.bg, color: cfg.color } }, React.createElement(Icon, { name: cfg.icon, size: 22, sw: 2.2 })),
        React.createElement("div", null,
          React.createElement("div", { className: "page-title" }, T(cfg.titleEn, cfg.titleTh)),
          React.createElement("div", { className: "page-sub" }, cfg.refEn + " · " + T("posting updates stock instantly", "บันทึกแล้วสต็อกอัปเดตทันที")))),
      React.createElement("div", { className: "spacer" }),
      React.createElement("button", { className: "btn sm ghost", onClick: () => onNav("movement") }, React.createElement(Icon, { name: "activity", size: 15 }), T("Transaction log", "ประวัติรายการ"))),

    posted
      ? React.createElement(PostedPanel, { posted, cfg, kind, lang, onNav, onAgain: () => setPosted(null) })
      : React.createElement("div", { className: "grid", style: { gridTemplateColumns: "1.6fr 1fr", alignItems: "start" } },
        // ---- left: form ----
        React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 16 } },
          // step 1 — header info
          React.createElement("div", { className: "card" },
            React.createElement("div", { className: "card-head" }, React.createElement(StepDot, { n: 1 }), React.createElement("h3", null, T("Transaction details", "รายละเอียดรายการ"))),
            React.createElement("div", { className: "card-pad", style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 } },
              (kind === "OUTBOUND" || kind === "TRANSFER" || kind === "DAMAGE") &&
                React.createElement(WhField, { label: T("Source warehouse", "คลังต้นทาง"), value: fromWh, onChange: setFromWh, lang, exclude: kind === "TRANSFER" ? toWh : null }),
              (kind === "INBOUND" || kind === "TRANSFER") &&
                React.createElement(WhField, { label: T("Destination warehouse", "คลังปลายทาง"), value: toWh, onChange: setToWh, lang, exclude: kind === "TRANSFER" ? fromWh : null }),
              cfg.needs.includes("partner") &&
                React.createElement("div", { className: "field" },
                  React.createElement("label", null, T(cfg.partyEn, cfg.partyTh),
                    React.createElement("span", { className: "opt" }, " *")),
                  React.createElement("input", { className: "input", value: partner, onChange: (e) => setPartner(e.target.value),
                    placeholder: kind === "INBOUND" ? T("e.g. ABC Co., Ltd.", "เช่น บริษัท ABC จำกัด") : T("e.g. XYZ Supermarket", "เช่น ซูเปอร์มาร์เก็ต XYZ") })),
              kind === "DAMAGE" &&
                React.createElement("div", { className: "field" },
                  React.createElement("label", null, T("Damage reason", "สาเหตุความเสียหาย")),
                  React.createElement("select", { className: "select", value: reason, onChange: (e) => setReason(+e.target.value) },
                    W.damageReasons.map((r, i) => React.createElement("option", { key: i, value: i }, lang === "th" ? r.th : r.en)))),
              React.createElement("div", { className: "field" },
                React.createElement("label", null, T("Document reference no.", "เลขที่อ้างอิงเอกสาร"),
                  React.createElement("span", { className: "opt" }, T(" · optional", " · ไม่บังคับ"))),
                React.createElement("input", { className: "input", value: docRef, onChange: (e) => setDocRef(e.target.value),
                  placeholder: { INBOUND: "e.g. INV-2026-0148", OUTBOUND: "e.g. PO-LOTUS-88421", TRANSFER: "e.g. TRF-REQ-0091", DAMAGE: "e.g. QA-2026-014" }[kind] })),
              React.createElement("div", { className: "field" },
                React.createElement("label", null, T("Operator", "ผู้ทำรายการ")),
                React.createElement("input", { className: "input", value: operator, onChange: (e) => setOperator(e.target.value),
                  placeholder: T("Enter name…", "กรอกชื่อผู้ทำรายการ…") })))),

          // step 2 — product lines
          React.createElement("div", { className: "card" },
            React.createElement("div", { className: "card-head" }, React.createElement(StepDot, { n: 2 }), React.createElement("h3", null, T("Products", "รายการสินค้า")),
              React.createElement("div", { className: "spacer" }),
              lines.length > 0 && React.createElement("span", { className: "badge gray" }, lines.length + " " + T("lines", "รายการ"))),
            React.createElement("div", { style: { padding: "14px 20px", borderBottom: lines.length ? "1px solid var(--line)" : "none", position: "relative" } },
              React.createElement("div", { className: "searchbox", style: { width: "100%" } },
                React.createElement(Icon, { name: "search", size: 15 }),
                React.createElement("input", { placeholder: T("Search product by name or SKU to add…", "ค้นหาสินค้าเพื่อเพิ่ม…"), value: search, onChange: (e) => setSearch(e.target.value) })),
              search && React.createElement("div", { style: { position: "absolute", left: 20, right: 20, top: 54, zIndex: 20, background: "var(--surface)", border: "1px solid var(--line-2)", borderRadius: 10, boxShadow: "var(--shadow-lg)", overflow: "hidden" } },
                filtered.length === 0
                  ? React.createElement("div", { style: { padding: 14, color: "var(--ink-3)", fontSize: 13 } }, T("No matches", "ไม่พบสินค้า"))
                  : filtered.map((p) => {
                    const a = avail(p.id);
                    return React.createElement("div", { key: p.id, onClick: () => addLine(p), style: { display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", cursor: "pointer", borderBottom: "1px solid var(--line)" }, onMouseEnter: (e) => e.currentTarget.style.background = "var(--surface-2)", onMouseLeave: (e) => e.currentTarget.style.background = "" },
                      React.createElement(ProductThumb, { product: p, size: 30 }),
                      React.createElement("div", { style: { flex: 1 } },
                        React.createElement("div", { style: { fontWeight: 600, fontSize: 12.5 } }, lang === "th" ? p.nameTh : p.name),
                        React.createElement("div", { className: "tag", style: { background: "none", padding: 0, color: "var(--ink-3)" } }, p.sku)),
                      srcWh && React.createElement("span", { className: `badge ${a === 0 ? "red" : "gray"}` }, T("avail ", "คงเหลือ ") + W.fmt(a)),
                      React.createElement(Icon, { name: "plus", size: 15, style: { color: "var(--accent)" } }));
                  }))),
            lines.length === 0
              ? React.createElement("div", { className: "empty", style: { padding: "30px 20px" } },
                  React.createElement(Icon, { name: "pkg", size: 26, style: { color: "var(--ink-soft)", marginBottom: 8 } }),
                  React.createElement("div", { style: { fontSize: 13 } }, T("No products yet — search above to add lines", "ยังไม่มีสินค้า — ค้นหาด้านบนเพื่อเพิ่ม")))
              : React.createElement("div", null,
                  lines.map((l) => {
                    const p = W.prodById[l.productId];
                    const a = avail(l.productId);
                    const over = srcWh && l.qty > a;
                    return React.createElement("div", { key: l.productId, style: { display: "flex", alignItems: "center", gap: 12, padding: "11px 20px", borderBottom: "1px solid var(--line)" } },
                      React.createElement(ProductThumb, { product: p, size: 36 }),
                      React.createElement("div", { style: { flex: 1, minWidth: 0 } },
                        React.createElement("div", { style: { fontWeight: 600, fontSize: 13 } }, p.brand + " " + p.form + " " + p.size),
                        React.createElement("div", { className: "tag", style: { background: "none", padding: 0, color: "var(--ink-3)" } }, p.sku + " · ×" + p.count + " " + T("pcs/ctn", "ชิ้น/ลัง")),
                        srcWh && React.createElement("span", { style: { fontSize: 11, color: over ? "var(--danger)" : "var(--ink-soft)", fontWeight: over ? 600 : 400 } }, T("Available: ", "คงเหลือ: ") + W.fmt(a) + (over ? " · " + T("exceeds!", "เกิน!") : ""))),
                      React.createElement(Stepper, { value: l.qty, onChange: (v) => setQty(l.productId, v), max: srcWh ? a : null, over }),
                      React.createElement("button", { className: "x-btn", onClick: () => removeLine(l.productId) }, React.createElement(Icon, { name: "trash", size: 15 })));
                  }))
          )
        ),

        // ---- right: summary ----
        React.createElement("div", { style: { position: "sticky", top: 76 } },
          React.createElement("div", { className: "card" },
            React.createElement("div", { className: "card-head" }, React.createElement("h3", null, T("Summary", "สรุปรายการ"))),
            React.createElement("div", { className: "card-pad" },
              React.createElement(SumRow, { label: T("Transaction", "ประเภท"), value: React.createElement(MoveBadge, { type: kind, lang }) }),
              React.createElement(SumRow, { label: T("Route", "เส้นทาง"), value: React.createElement("span", { className: "mono", style: { fontSize: 12 } },
                (srcWh ? W.whById[srcWh]?.code : T("External", "ภายนอก")) + "  →  " + (toWh ? W.whById[toWh]?.code : T("External", "ภายนอก"))) }),
              docRef.trim() && React.createElement(SumRow, { label: T("Document ref.", "เลขที่อ้างอิงเอกสาร"), value: React.createElement("span", { className: "mono", style: { fontSize: 12, color: "var(--ink)", fontWeight: 600 } }, docRef.trim()) }),
              React.createElement("hr", { className: "divider", style: { margin: "12px 0" } }),
              React.createElement(SumRow, { label: T("Product lines", "จำนวนรายการ"), value: lines.length }),
              React.createElement(SumRow, { label: T("Total cartons", "ลังรวม"), value: React.createElement("b", { className: "mono" }, W.fmt(totalQty)) }),
              React.createElement(SumRow, { label: T("Total pieces", "ชิ้นรวม"), value: React.createElement("span", { className: "mono" }, W.fmt(totalPcs)) }),
              React.createElement(SumRow, { label: T("Est. value", "มูลค่าประมาณ"), value: React.createElement("b", { className: "mono", style: { color: cfg.color } }, W.baht(totalValue)) }))),

          errors.length > 0 && lines.length > 0 && React.createElement("div", { className: "card", style: { marginTop: 14, borderColor: "var(--line-2)" } },
            React.createElement("div", { style: { padding: "12px 16px" } },
              React.createElement("div", { style: { fontSize: 11.5, fontWeight: 600, color: "var(--ink-3)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 } }, React.createElement(Icon, { name: "info", size: 14 }), T("Before posting", "ก่อนบันทึก")),
              errors.slice(0, 4).map((e, i) => React.createElement("div", { key: i, style: { fontSize: 12, color: "var(--ink-2)", padding: "2px 0", display: "flex", gap: 7 } },
                React.createElement("span", { style: { color: "var(--warn)" } }, "•"), e)))),

          React.createElement("button", { className: "btn primary", disabled: !valid, onClick: submit, style: { width: "100%", marginTop: 14, padding: "12px", fontSize: 14, background: valid ? cfg.color : null, borderColor: valid ? cfg.color : null } },
            React.createElement(Icon, { name: "check", size: 17 }), T("Post " + cfg.titleEn, "บันทึก" + cfg.titleTh))
        )
      )
  );
}

/* ---- sub-components ---- */
function StepDot({ n }) {
  return React.createElement("span", { style: { width: 22, height: 22, borderRadius: 7, background: "var(--accent-soft)", color: "var(--accent-ink)", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, fontFamily: "var(--mono)" } }, n);
}
function WhField({ label, value, onChange, lang, exclude }) {
  return React.createElement("div", { className: "field" },
    React.createElement("label", null, label),
    React.createElement("select", { className: "select", value: value, onChange: (e) => onChange(e.target.value) },
      React.createElement("option", { value: "" }, lang === "th" ? "เลือกคลัง…" : "Select…"),
      window.WMS.warehouses.filter((w) => w.id !== exclude).map((w) => React.createElement("option", { key: w.id, value: w.id }, w.code + " · " + (lang === "th" ? w.nameTh : w.name)))));
}
function Stepper({ value, onChange, max, over }) {
  return React.createElement("div", { style: { display: "flex", alignItems: "center", border: `1px solid ${over ? "var(--danger)" : "var(--line-2)"}`, borderRadius: 8, overflow: "hidden", flex: "none" } },
    React.createElement("button", { onClick: () => onChange(Math.max(0, (Number(value) || 0) - 5)), style: stepBtn }, "−"),
    React.createElement("input", { value: value, onChange: (e) => onChange(e.target.value.replace(/[^0-9]/g, "") === "" ? 0 : parseInt(e.target.value.replace(/[^0-9]/g, ""))), className: "mono", style: { width: 56, textAlign: "center", border: "none", borderLeft: "1px solid var(--line)", borderRight: "1px solid var(--line)", padding: "7px 0", outline: "none", fontWeight: 600, color: over ? "var(--danger)" : "var(--ink)" } }),
    React.createElement("button", { onClick: () => onChange((Number(value) || 0) + 5), style: stepBtn }, "+"));
}
const stepBtn = { width: 30, border: "none", background: "var(--surface-2)", color: "var(--ink-2)", fontSize: 16, fontWeight: 600, cursor: "pointer", alignSelf: "stretch" };

function SumRow({ label, value }) {
  return React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0", fontSize: 13 } },
    React.createElement("span", { style: { color: "var(--ink-3)" } }, label),
    React.createElement("span", { style: { color: "var(--ink)" } }, value));
}

function PostedPanel({ posted, cfg, kind, lang, onNav, onAgain }) {
  const T = (en, th) => (lang === "th" ? th : en);
  return React.createElement("div", { className: "card", style: { maxWidth: 560, margin: "20px auto", textAlign: "center", padding: "40px 32px" } },
    React.createElement("div", { style: { width: 64, height: 64, borderRadius: 18, background: cfg.bg, color: cfg.color, display: "grid", placeItems: "center", margin: "0 auto 18px", animation: "popIn .4s ease" } }, React.createElement(Icon, { name: "check", size: 32, sw: 2.6 })),
    React.createElement("h3", { style: { fontSize: 19 } }, T(cfg.titleEn + " posted successfully", cfg.titleTh + "สำเร็จ")),
    React.createElement("p", { style: { color: "var(--ink-3)", fontSize: 13.5, margin: "8px 0 22px" } }, T(`Stock has been ${cfg.signEn} the warehouse in real time.`, "สต็อกได้รับการอัปเดตแบบเรียลไทม์แล้ว")),
    React.createElement("div", { style: { display: "flex", gap: 12, justifyContent: "center", marginBottom: 26 } },
      React.createElement(MiniStat, { value: posted.count, label: T("lines", "รายการ") }),
      React.createElement(MiniStat, { value: window.WMS.fmt(posted.qty), label: T("cartons", "ลัง") }),
      React.createElement(MiniStat, { value: window.WMS.baht(posted.value), label: T("value", "มูลค่า"), mono: true })),
    React.createElement("div", { style: { display: "flex", gap: 10, justifyContent: "center" } },
      React.createElement("button", { className: "btn", onClick: () => onNav("movement") }, React.createElement(Icon, { name: "activity", size: 15 }), T("View in log", "ดูในประวัติ")),
      React.createElement("button", { className: "btn primary", onClick: onAgain, style: { background: cfg.color, borderColor: cfg.color } }, React.createElement(Icon, { name: "plus", size: 15 }), T("New " + cfg.titleEn, "ทำรายการใหม่"))));
}
function MiniStat({ value, label, mono }) {
  return React.createElement("div", { style: { padding: "12px 18px", background: "var(--surface-2)", borderRadius: 10, minWidth: 90 } },
    React.createElement("div", { className: mono ? "mono" : "mono", style: { fontSize: mono ? 15 : 20, fontWeight: 700 } }, value),
    React.createElement("div", { style: { fontSize: 11, color: "var(--ink-3)", marginTop: 2 } }, label));
}

Object.assign(window, { TransactionForm, TX_CONFIG });
