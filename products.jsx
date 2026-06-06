/* ===================================================================
   StockFlow WMS — Products (master data) list + detail + add form
   =================================================================== */

/* ══════════════════════════════════════════════════════════════════
   FormField — นิยามนอก component เพื่อไม่ให้ unmount เมื่อ state เปลี่ยน
   ══════════════════════════════════════════════════════════════════ */
function FormField({ id, label, required, children, hint, errors }) {
  return React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 5 } },
    React.createElement("label", { style: { fontSize: 12, fontWeight: 600, color: "var(--ink-2)" } },
      label, required && React.createElement("span", { style: { color: "var(--neg)", marginLeft: 2 } }, "*")),
    children,
    errors && errors[id] && React.createElement("span", { style: { fontSize: 11, color: "var(--neg)" } }, errors[id]),
    hint && !(errors && errors[id]) && React.createElement("span", { style: { fontSize: 11, color: "var(--ink-3)" } }, hint));
}

/* ══════════════════════════════════════════════════════════════════
   ProductFormModal — Add (existing=null) หรือ Edit (existing=product)
   ══════════════════════════════════════════════════════════════════ */
const PROD_CATEGORIES = ["Tape", "Pants", "Pull-up", "Swim Pants", "Training Pants", "Newborn", "Other"];

function ProductFormModal({ lang, onClose, onSaved, existing }) {
  const { addProduct, editProduct, pushToast } = useWMS();
  const isEdit = existing != null;
  const T = (en, th) => lang === "th" ? th : en;

  const [saving, setSaving] = uState(false);
  const [form, setForm] = uState(() => isEdit ? {
    sku:          existing.sku || existing.id,
    nameEn:       existing.name    || "",
    nameTh:       existing.nameTh  || "",
    brand:        existing.brand   || "",
    category:     existing.form    || existing.category || "",
    size:         existing.size    || "",
    piecesPerCtn: String(existing.count || existing.uomPcs || 1),
    uom:          existing.uom     || "Unit",
    ean:          existing.ean     || "",
    cost:         String(existing.cost  || ""),
    price:        String(existing.price || ""),
    reorder:      String(existing.reorder || 0),
  } : {
    sku: "", nameEn: "", nameTh: "",
    brand: "", category: "", size: "",
    piecesPerCtn: "1", uom: "Unit",
    ean: "", cost: "", price: "", reorder: "0",
  });
  const [errors, setErrors] = uState({});

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  function validate() {
    const e = {};
    if (!isEdit && !form.sku.trim()) e.sku = T("Required", "จำเป็น");
    if (!form.nameEn.trim() && !form.nameTh.trim()) e.nameEn = T("At least one name required", "ต้องกรอกชื่ออย่างน้อย 1 ภาษา");
    if (!form.brand.trim()) e.brand = T("Required", "จำเป็น");
    if (isNaN(parseFloat(form.cost))  || parseFloat(form.cost)  < 0) e.cost  = T("Enter valid cost",  "กรุณากรอกราคาทุน");
    if (isNaN(parseFloat(form.price)) || parseFloat(form.price) < 0) e.price = T("Enter valid price", "กรุณากรอกราคาขาย");
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      if (isEdit) {
        await editProduct(existing.id, form);
        pushToast({ kind: "INBOUND", icon: "check", title: T("Product updated", "อัปเดตสินค้าแล้ว"), msg: existing.id });
      } else {
        await addProduct(form);
        pushToast({ kind: "INBOUND", icon: "check", title: T("Product added", "เพิ่มสินค้าแล้ว"), msg: form.sku.trim().toUpperCase() });
      }
      onSaved();
      onClose();
    } catch (err) {
      pushToast({ kind: "DAMAGE", icon: "damage", title: "Error", msg: err.message });
    } finally {
      setSaving(false);
    }
  }

  function inp(k, placeholder, type, readOnly) {
    return React.createElement("input", {
      className: "select",
      style: { width: "100%", border: errors[k] ? "1.5px solid var(--neg)" : "", background: readOnly ? "var(--surface-2)" : "" },
      type: type || "text", placeholder, value: form[k],
      onChange: readOnly ? undefined : set(k),
      readOnly: !!readOnly,
    });
  }

  const overlay = { position: "fixed", inset: 0, background: "oklch(0 0 0 / 0.45)", display: "grid", placeItems: "center", zIndex: 999, padding: 20 };
  const modal   = { background: "var(--surface)", borderRadius: 16, boxShadow: "0 24px 64px oklch(0 0 0 / 0.22)", width: "100%", maxWidth: 680, maxHeight: "90vh", overflow: "auto", display: "flex", flexDirection: "column" };
  const secHd   = { fontSize: 11, fontWeight: 700, color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 };

  return React.createElement("div", { style: overlay, onClick: (e) => e.target === e.currentTarget && onClose() },
    React.createElement("div", { style: modal },

      /* ── header ── */
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, padding: "18px 24px", borderBottom: "1px solid var(--line)" } },
        React.createElement("div", { style: { width: 36, height: 36, borderRadius: 10, background: isEdit ? "oklch(0.93 0.04 240)" : "var(--accent-soft)", display: "grid", placeItems: "center", color: isEdit ? "oklch(0.45 0.12 240)" : "var(--accent)" } },
          React.createElement(Icon, { name: isEdit ? "edit" : "plus", size: 18 })),
        React.createElement("div", null,
          React.createElement("div", { style: { fontWeight: 700, fontSize: 15 } }, isEdit ? T("Edit Product", "แก้ไขสินค้า") : T("Add New Product", "เพิ่มสินค้าใหม่")),
          React.createElement("div", { style: { fontSize: 12, color: "var(--ink-3)" } }, isEdit ? (existing.sku || existing.id) : T("Fill in the details below", "กรอกข้อมูลสินค้าด้านล่าง"))),
        React.createElement("div", { style: { marginLeft: "auto" } },
          React.createElement("button", { className: "btn sm ghost", onClick: onClose },
            React.createElement(Icon, { name: "x", size: 16 })))),

      /* ── body ── */
      React.createElement("div", { style: { padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 } },

        /* ข้อมูลพื้นฐาน */
        React.createElement("div", null,
          React.createElement("div", { style: secHd }, T("Basic Info", "ข้อมูลพื้นฐาน")),
          React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 } },
            React.createElement(FormField, { id: "sku", label: "SKU / รหัสสินค้า", required: !isEdit, errors },
              inp("sku", "เช่น PVI-TAP-S-001", "text", isEdit)),
            React.createElement(FormField, { id: "brand", label: T("Brand", "แบรนด์"), required: true, errors },
              inp("brand", "เช่น Agewell, Mamy Poko")),
            React.createElement(FormField, { id: "nameEn", label: T("Product name (EN)", "ชื่อสินค้า (อังกฤษ)"), required: true, errors },
              inp("nameEn", "Agewell Gold Tape S")),
            React.createElement(FormField, { id: "nameTh", label: "ชื่อสินค้า (ไทย)", errors },
              inp("nameTh", "เอจเวล โกลด์ เทป S")))),

        /* ลักษณะสินค้า */
        React.createElement("div", null,
          React.createElement("div", { style: secHd }, T("Product Details", "รายละเอียดสินค้า")),
          React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 } },
            React.createElement(FormField, { id: "category", label: T("Category / Type", "ประเภท"), errors },
              React.createElement("select", { className: "select", value: form.category, onChange: set("category") },
                React.createElement("option", { value: "" }, T("— Select —", "— เลือก —")),
                PROD_CATEGORIES.map(c => React.createElement("option", { key: c, value: c }, c)))),
            React.createElement(FormField, { id: "size", label: T("Size", "ไซส์"), hint: "S / M / L / XL / XXL / NB", errors },
              inp("size", "S")),
            React.createElement(FormField, { id: "ean", label: "Barcode (EAN)", hint: T("optional", "ถ้ามี"), errors },
              inp("ean", "8851234567890")),
            React.createElement(FormField, { id: "piecesPerCtn", label: T("Pcs / carton", "ชิ้น / ลัง"), errors },
              inp("piecesPerCtn", "1", "number")),
            React.createElement(FormField, { id: "uom", label: "UOM", errors },
              React.createElement("select", { className: "select", value: form.uom, onChange: set("uom") },
                ["Unit", "Carton", "Pack", "Bag", "Box"].map(u =>
                  React.createElement("option", { key: u, value: u }, u)))),
            React.createElement(FormField, { id: "reorder", label: T("Reorder point (ctn)", "จุดสั่งซื้อ (ลัง)"), errors },
              inp("reorder", "0", "number")))),

        /* ราคา */
        React.createElement("div", null,
          React.createElement("div", { style: secHd }, T("Pricing", "ราคา")),
          React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 } },
            React.createElement(FormField, { id: "cost",  label: T("Unit cost (฿/ctn)",  "ราคาทุน (฿/ลัง)"),  required: true, errors },
              inp("cost",  "0.00", "number")),
            React.createElement(FormField, { id: "price", label: T("Selling price (฿/ctn)", "ราคาขาย (฿/ลัง)"), required: true, errors },
              inp("price", "0.00", "number"))))),

      /* ── footer ── */
      React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 24px", borderTop: "1px solid var(--line)", background: "var(--surface-2)" } },
        React.createElement("button", { className: "btn ghost", onClick: onClose, disabled: saving },
          T("Cancel", "ยกเลิก")),
        React.createElement("button", { className: "btn primary", onClick: handleSave, disabled: saving, style: { minWidth: 130 } },
          saving ? T("Saving…", "กำลังบันทึก…")
                 : T(isEdit ? "Save Changes" : "Save Product", isEdit ? "บันทึกการแก้ไข" : "บันทึกสินค้า")))
    )
  );
}

/* ══════════════════════════════════════════════════════════════════
   PRODUCTS PAGE
   ══════════════════════════════════════════════════════════════════ */
function Products({ lang, onNav, openScanner }) {
  const { selectors, products } = useWMS();
  const W = window.WMS;
  const T = (en, th) => lang === "th" ? th : en;
  const [q, setQ]           = uState("");
  const [brand, setBrand]   = uState("ALL");
  const [view, setView]     = uState("grid");
  const [showAdd, setShowAdd] = uState(false);
  const [tick, setTick]     = uState(0); // force re-render after add

  let rows = products.map((p) => ({ p, total: selectors.totalForProduct(p.id) }));
  if (q) rows = rows.filter((r) => (r.p.sku + " " + r.p.name + " " + r.p.nameTh + " " + r.p.brand).toLowerCase().includes(q.toLowerCase()));
  if (brand !== "ALL") rows = rows.filter((r) => r.p.brand === brand);
  const brands = ["ALL", ...new Set(products.map((p) => p.brand))];

  return React.createElement("div", { className: "page" },
    showAdd && React.createElement(ProductFormModal, {
      lang, existing: null,
      onClose: () => setShowAdd(false),
      onSaved: () => setTick(t => t + 1),
    }),

    React.createElement("div", { className: "page-head" },
      React.createElement("div", null,
        React.createElement("div", { className: "page-title" }, T("Product Master", "ข้อมูลสินค้า")),
        React.createElement("div", { className: "page-sub" }, products.length + " " + T("active SKUs", "รายการ"))),
      React.createElement("div", { className: "spacer" }),
      /* ── ปุ่มเพิ่มสินค้าด้วยมือ ── */
      React.createElement("button", { className: "btn", onClick: () => setShowAdd(true),
        style: { marginRight: 8 } },
        React.createElement(Icon, { name: "plus", size: 16 }),
        T("Add Product", "เพิ่มสินค้า")),
      /* ── ปุ่มสแกน OCR ── */
      React.createElement("button", { className: "btn primary", onClick: openScanner },
        React.createElement(Icon, { name: "scan", size: 16 }),
        T("Scan (OCR)", "สแกน (OCR)"),
        React.createElement("span", { style: { fontSize: 10, fontWeight: 700, padding: "1px 5px", background: "oklch(1 0 0 / 0.22)", borderRadius: 4, marginLeft: 2 } }, "AI"))),

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
                  React.createElement("td", null, r.p.form || r.p.category || "—"),
                  React.createElement("td", { className: "r mono" }, r.p.count),
                  React.createElement("td", { className: "r mono" }, W.baht(r.p.cost)),
                  React.createElement("td", { className: "r mono cell-strong" }, W.fmt(r.total)),
                  React.createElement("td", { className: "c" },
                    React.createElement("span", { className: `badge ${st === 2 ? "red" : st === 1 ? "amber" : "green"}` },
                      st === 2 ? T("Reorder", "สั่งซื้อ") : st === 1 ? T("Low", "ต่ำ") : T("In stock", "พร้อม"))));
              })))
        )
  );
}

/* ══════════════════════════════════════════════════════════════════
   PRODUCT CARD (grid tile)
   ══════════════════════════════════════════════════════════════════ */
function ProductCard({ p, total, lang, onNav }) {
  const W = window.WMS;
  const T = (en, th) => lang === "th" ? th : en;
  const st = total <= p.reorder * 0.4 ? 2 : total <= p.reorder ? 1 : 0;
  return React.createElement("div", {
    className: "card", style: { cursor: "pointer", transition: "transform .15s, box-shadow .15s", overflow: "hidden" },
    onClick: () => onNav("product", p.id),
    onMouseEnter: (e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "var(--shadow)"; },
    onMouseLeave: (e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; } },
    React.createElement("div", { className: "swatch-stripes", style: { height: 96, display: "grid", placeItems: "center", borderBottom: "1px solid var(--line)", position: "relative" } },
      React.createElement(ProductThumb, { product: p, size: 52 }),
      React.createElement("span", { className: `badge ${st === 2 ? "red" : st === 1 ? "amber" : "green"}`, style: { position: "absolute", top: 10, right: 10 } },
        React.createElement("span", { className: "dot" }),
        st === 2 ? T("Reorder", "สั่งซื้อ") : st === 1 ? T("Low", "ต่ำ") : T("OK", "พร้อม"))),
    React.createElement("div", { style: { padding: "13px 15px" } },
      React.createElement("div", { className: "tag", style: { background: "none", padding: 0, color: "var(--ink-3)", marginBottom: 3 } }, p.sku),
      React.createElement("div", { style: { fontWeight: 600, fontSize: 13.5, lineHeight: 1.3, marginBottom: 2 } },
        p.brand + (p.form ? " " + p.form : "") + (p.size ? " " + p.size : "")),
      React.createElement("div", { style: { fontSize: 12, color: "var(--ink-3)" } },
        (p.size ? T("Size", "ไซส์") + " " + p.size + " · " : "") + "×" + p.count + " " + T("pcs", "ชิ้น")),
      React.createElement("div", { style: { display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 11, paddingTop: 11, borderTop: "1px solid var(--line)" } },
        React.createElement("div", null,
          React.createElement("span", { className: "mono", style: { fontSize: 17, fontWeight: 700 } }, W.fmt(total)),
          React.createElement("span", { style: { fontSize: 11, color: "var(--ink-3)", marginLeft: 4 } }, T("ctn", "ลัง"))),
        React.createElement("span", { className: "mono", style: { fontSize: 12.5, color: "var(--accent-ink)", fontWeight: 600 } }, W.baht(p.price)))));
}

/* ══════════════════════════════════════════════════════════════════
   PRODUCT DETAIL
   ══════════════════════════════════════════════════════════════════ */
function ProductDetail({ productId, lang, onNav, openScanner }) {
  const { state, selectors, products, deleteProduct, pushToast } = useWMS();
  const W = window.WMS;
  const T = (en, th) => lang === "th" ? th : en;

  const [showEdit, setShowEdit]         = uState(false);
  const [confirmDelete, setConfirmDelete] = uState(false);
  const [deleting, setDeleting]         = uState(false);

  /* ค้นหาจาก products ใน context (อัปเดตทุกครั้งที่ save) */
  const p = products.find(x => x.id === productId) || (window.WMS.prodById || {})[productId];
  if (!p) return React.createElement("div", { className: "page" }, "Not found");

  const total = selectors.totalForProduct(p.id);
  const perWh = (window.WMS.warehouses || []).map((w) => ({ w, qty: selectors.stockAt(p.id, w.id) }));
  const maxWh = Math.max(...perWh.map((x) => x.qty), 1);
  const moves = state.movements.filter((m) => m.productId === p.id).slice(0, 8);
  const st = total <= p.reorder * 0.4 ? 2 : total <= p.reorder ? 1 : 0;

  const facts = [
    ["Barcode (EAN-13)", "บาร์โค้ด", p.ean || "—", true],
    ["Category", "หมวดหมู่", lang === "th" ? (p.categoryTh || p.category || "—") : (p.category || "—")],
    ["Diaper type", "ชนิด", lang === "th" ? (p.formTh || p.form || "—") : (p.form || "—")],
    ["Size / weight", "ไซส์ / น้ำหนัก", [p.size, p.weight].filter(Boolean).join(" · ") || "—"],
    ["Pieces per carton", "ชิ้นต่อลัง", p.count + " " + T("pcs", "ชิ้น"), true],
    ["Unit cost", "ราคาทุน", W.baht(p.cost), true],
    ["Sell price", "ราคาขาย", W.baht(p.price), true],
    ["Country of origin", "ประเทศต้นทาง", p.origin || "—"],
    ["Shelf life", "อายุการเก็บ", p.shelfLife || "—"],
    ["Reorder point", "จุดสั่งซื้อ", W.fmt(p.reorder) + " " + T("ctn", "ลัง"), true],
  ];

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteProduct(p.id);
      pushToast({ kind: "DAMAGE", icon: "damage", title: T("Product deleted", "ลบสินค้าแล้ว"), msg: p.sku || p.id });
      onNav("products");
    } catch (err) {
      pushToast({ kind: "DAMAGE", icon: "damage", title: "Error", msg: err.message });
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return React.createElement("div", { className: "page" },

    /* ── Edit modal ── */
    showEdit && React.createElement(ProductFormModal, {
      lang, existing: p,
      onClose: () => setShowEdit(false),
      onSaved: () => setShowEdit(false),
    }),

    React.createElement("button", { className: "btn sm ghost", style: { marginBottom: 14 }, onClick: () => onNav("products") },
      React.createElement(Icon, { name: "chevL", size: 15 }), T("All products", "สินค้าทั้งหมด")),

    React.createElement("div", { className: "page-head" },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 14 } },
        React.createElement(ProductThumb, { product: p, size: 52 }),
        React.createElement("div", null,
          React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
            React.createElement("div", { className: "page-title" }, p.brand + (p.form ? " " + p.form : "") + (p.size ? " " + p.size : "")),
            React.createElement("span", { className: "badge " + (st === 2 ? "red" : st === 1 ? "amber" : "green") },
              st === 2 ? T("Reorder", "สั่งซื้อ") : st === 1 ? T("Low stock", "สต็อกต่ำ") : T("In stock", "พร้อมขาย"))),
          React.createElement("div", { className: "page-sub" }, (lang === "th" ? p.nameTh : p.name) + " · " + p.sku))),
      React.createElement("div", { className: "spacer" }),

      /* ── Delete confirm inline ── */
      confirmDelete
        ? React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, background: "oklch(0.97 0.02 25)", border: "1.5px solid var(--neg)", borderRadius: 10, padding: "7px 14px" } },
            React.createElement("span", { style: { fontSize: 12.5, color: "var(--neg)", fontWeight: 600 } },
              T("Delete this product?", "ลบสินค้านี้ออก?")),
            React.createElement("button", { className: "btn sm", onClick: () => setConfirmDelete(false), disabled: deleting },
              T("Cancel", "ยกเลิก")),
            React.createElement("button", { className: "btn sm", style: { background: "var(--neg)", color: "#fff", borderColor: "var(--neg)" }, onClick: handleDelete, disabled: deleting },
              deleting ? T("Deleting…", "กำลังลบ…") : T("Confirm Delete", "ยืนยันลบ")))
        : React.createElement("div", { style: { display: "flex", gap: 8 } },
            React.createElement("button", { className: "btn sm", onClick: openScanner },
              React.createElement(Icon, { name: "scan", size: 15 }), T("Re-scan (OCR)", "สแกนใหม่")),
            React.createElement("button", { className: "btn sm", onClick: () => setShowEdit(true) },
              React.createElement(Icon, { name: "edit", size: 15 }), T("Edit", "แก้ไข")),
            React.createElement("button", { className: "btn sm", style: { color: "var(--neg)", borderColor: "var(--neg)" }, onClick: () => setConfirmDelete(true) },
              React.createElement(Icon, { name: "x", size: 14 }), T("Delete", "ลบ")))),

    React.createElement("div", { className: "grid", style: { gridTemplateColumns: "340px 1fr", alignItems: "start" } },
      // left column
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 16 } },
        React.createElement("div", { className: "card" },
          React.createElement("div", { className: "swatch-stripes", style: { aspectRatio: "4/3", display: "grid", placeItems: "center", position: "relative" } },
            React.createElement("div", { style: { textAlign: "center", color: "var(--ink-3)", fontFamily: "var(--mono)", fontSize: 11.5 } },
              React.createElement(ProductThumb, { product: p, size: 64 }),
              React.createElement("div", { style: { marginTop: 10 } }, T("PRODUCT PHOTO", "รูปสินค้า"))),
            React.createElement("span", { className: "badge gray", style: { position: "absolute", top: 12, left: 12, gap: 5 } },
              React.createElement(Icon, { name: "tag", size: 11 }), p.sku)),
          React.createElement("div", { style: { padding: "13px 16px", borderTop: "1px solid var(--line)", display: "flex", gap: 8 } },
            React.createElement("button", { className: "btn sm", style: { flex: 1 }, onClick: openScanner },
              React.createElement(Icon, { name: "camera", size: 14 }), T("Re-capture", "ถ่ายใหม่")))),
        React.createElement("div", { className: "card" },
          React.createElement("div", { className: "card-head" },
            React.createElement(Icon, { name: "tag", size: 15, style: { color: "var(--ink-3)" } }),
            React.createElement("h3", null, T("Master Data", "ข้อมูลสินค้า"))),
          React.createElement("div", null,
            facts.map(([en, th, val, mono], i) =>
              React.createElement("div", { key: i, style: { display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 16px", borderBottom: i < facts.length - 1 ? "1px solid var(--line)" : "none", fontSize: 12.5 } },
                React.createElement("span", { style: { color: "var(--ink-3)" } }, lang === "th" ? th : en),
                React.createElement("span", { className: (mono ? "mono " : "") + "cell-strong", style: { textAlign: "right" } }, val)))))),

      // right column
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 16 } },
        React.createElement("div", { className: "grid", style: { gridTemplateColumns: "1fr 1fr 1fr" } },
          React.createElement(KPI, { icon: "layers", iconBg: "var(--accent-soft)", iconColor: "var(--accent)", label: T("Total on hand", "คงเหลือรวม"), value: total, unit: T("ctn", "ลัง"), foot: total * p.count + " " + T("pcs", "ชิ้น") }),
          React.createElement(KPI, { icon: "warehouse", iconBg: "var(--move-bg)", iconColor: "var(--move)", label: T("In warehouses", "อยู่ในคลัง"), value: perWh.filter((x) => x.qty > 0).length, animate: false, foot: T("of " + perWh.length + " stocked", "จาก " + perWh.length + " คลัง") }),
          React.createElement(KPI, { icon: "tag", iconBg: "oklch(0.95 0.04 155)", iconColor: "var(--accent-ink)", label: T("Stock value", "มูลค่าสต็อก"), value: Math.round(total * p.cost * p.count), animate: true, format: (n) => "฿" + Math.round(n).toLocaleString() })),

        React.createElement("div", { className: "card" },
          React.createElement("div", { className: "card-head" },
            React.createElement("h3", null, T("Stock by Warehouse", "สต็อกตามคลัง")),
            React.createElement("div", { className: "spacer" }),
            React.createElement("div", { style: { display: "flex", gap: 7 } },
              React.createElement("button", { className: "btn sm", onClick: () => onNav("inbound") },
                React.createElement(Icon, { name: "inbound", size: 14, style: { color: "var(--pos)" } }), T("Receive", "รับเข้า")),
              React.createElement("button", { className: "btn sm", onClick: () => onNav("transfer") },
                React.createElement(Icon, { name: "transfer", size: 14, style: { color: "var(--move)" } }), T("Transfer", "โอน")),
              React.createElement("button", { className: "btn sm", onClick: () => onNav("outbound") },
                React.createElement(Icon, { name: "outbound", size: 14, style: { color: "var(--neg)" } }), T("Ship", "จัดส่ง")))),
          React.createElement("div", { className: "card-pad", style: { paddingTop: 6, paddingBottom: 12 } },
            perWh.map(({ w, qty }) =>
              React.createElement(BarRow, { key: w.id, label: w.code, sub: lang === "th" ? w.cityTh : w.city, value: qty, max: maxWh, caption: W.fmt(qty) + " " + T("ctn", "ลัง"), color: qty === 0 ? "var(--neg)" : "var(--accent)" })))),

        React.createElement("div", { className: "card" },
          React.createElement("div", { className: "card-head" },
            React.createElement(Icon, { name: "activity", size: 15, style: { color: "var(--ink-3)" } }),
            React.createElement("h3", null, T("Movement History", "ประวัติการเคลื่อนไหว"))),
          React.createElement(MovementTable, { rows: moves, lang, compact: true, onNav: () => {} }))
      )
    )
  );
}

Object.assign(window, { Products, ProductCard, ProductDetail, ProductFormModal });
