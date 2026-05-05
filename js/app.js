// ── Init from config ──────────────────────────────────────────────
const ADMIN_EMAIL = SITE_CONFIG.adminEmail;
const DB_NAME     = SITE_CONFIG.firestoreDb;

firebase.initializeApp(SITE_CONFIG.firebase);
const auth    = firebase.auth();
const db      = firebase.firestore(firebase.app(), DB_NAME);
const storage = firebase.storage();

document.title = SITE_CONFIG.siteName + " — تحف رقمية";
document.querySelectorAll(".logo").forEach(el => el.textContent = SITE_CONFIG.siteName);

// ── State ─────────────────────────────────────────────────────────
let currentUser  = null;
let products     = [];
let searchTerm   = "";
let selectedFile = null;
let editingId    = null;
let authMode     = "login"; // "login" | "signup"

// ── DOM refs ──────────────────────────────────────────────────────
const appEl         = document.getElementById("app");
const searchInput   = document.getElementById("search-input");
const adminControls = document.getElementById("admin-controls");
const authBtn       = document.getElementById("auth-btn");
const authLabel     = document.getElementById("auth-label");
const authIconIn    = document.getElementById("auth-icon-login");
const authIconOut   = document.getElementById("auth-icon-logout");
const adminLink     = document.getElementById("admin-link");
const addBtn        = document.getElementById("add-product-btn");

// Product modal
const modalOverlay = document.getElementById("modal-overlay");
const modalClose   = document.getElementById("modal-close");
const modalTitle   = document.getElementById("modal-title");
const productForm  = document.getElementById("product-form");
const submitBtn    = document.getElementById("form-submit-btn");
const fTitle       = document.getElementById("f-title");
const fPrice       = document.getElementById("f-price");
const fFileinfo    = document.getElementById("f-fileinfo");
const fImage       = document.getElementById("f-image");
const fGumroad     = document.getElementById("f-gumroad");
const fAuthor      = document.getElementById("f-author");
const fDesc        = document.getElementById("f-desc");
const dropPlaceholder  = document.getElementById("drop-placeholder");
const dropPreview      = document.getElementById("drop-preview");
const previewImg       = document.getElementById("preview-img");
const previewLabel     = document.getElementById("preview-label");
const uploadWrap       = document.getElementById("upload-progress-wrap");
const progressBar      = document.getElementById("progress-bar");
const progressPct      = document.getElementById("progress-pct");

// Auth modal
const authOverlay    = document.getElementById("auth-overlay");
const authModalClose = document.getElementById("auth-modal-close");
const authModalTitle = document.getElementById("auth-modal-title");
const authTabs       = document.querySelectorAll(".auth-tab");
const authForm       = document.getElementById("auth-form");
const authError      = document.getElementById("auth-error");
const authEmail      = document.getElementById("auth-email");
const authPassword   = document.getElementById("auth-password");
const authName       = document.getElementById("auth-name");
const signupNameWrap = document.getElementById("signup-name-wrap");
const authSubmitBtn  = document.getElementById("auth-submit-btn");
const forgotWrap     = document.getElementById("forgot-wrap");
const forgotBtn      = document.getElementById("forgot-btn");
const togglePass     = document.getElementById("toggle-pass");
const eyeShow        = document.getElementById("eye-show");
const eyeHide        = document.getElementById("eye-hide");

document.getElementById("footer-year").textContent = new Date().getFullYear();

// ── URL helpers ───────────────────────────────────────────────────
function productShareUrl(id) {
  const base = location.href.split("#")[0].replace(/index\.html$/, "");
  return base + "#/product/" + id;
}

function gumroadUrl(rawUrl) {
  if (!SITE_CONFIG.gumroadCustomDomain || !rawUrl) return rawUrl;
  try {
    const u = new URL(rawUrl);
    if (u.hostname.endsWith("gumroad.com")) {
      u.hostname = SITE_CONFIG.gumroadCustomDomain;
      return u.toString();
    }
  } catch (_) {}
  return rawUrl;
}

// ── Auth state ────────────────────────────────────────────────────
auth.onAuthStateChanged(user => {
  currentUser = user;
  const isAdmin = user && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  if (user) {
    const name = user.displayName || user.email.split("@")[0];
    authLabel.textContent = name;
    authIconIn.classList.add("hidden");
    authIconOut.classList.remove("hidden");
  } else {
    authLabel.textContent = "تسجيل دخول";
    authIconIn.classList.remove("hidden");
    authIconOut.classList.add("hidden");
  }

  adminControls.classList.toggle("hidden", !isAdmin);
  render();
});

// ── Auth button ───────────────────────────────────────────────────
authBtn.addEventListener("click", () => {
  if (currentUser) {
    auth.signOut();
  } else {
    openAuthModal("login");
  }
});

// ── Auth modal logic ──────────────────────────────────────────────
function openAuthModal(mode = "login") {
  authMode = mode;
  authError.classList.add("hidden");
  authForm.reset();
  applyAuthMode();
  authOverlay.classList.remove("hidden");
  setTimeout(() => authEmail.focus(), 300);
}

function closeAuthModal() {
  authOverlay.classList.add("hidden");
  authForm.reset();
  authError.classList.add("hidden");
}

function applyAuthMode() {
  const isLogin = authMode === "login";
  authModalTitle.textContent  = isLogin ? "تسجيل الدخول" : "إنشاء حساب جديد";
  authSubmitBtn.textContent   = isLogin ? "تسجيل الدخول" : "إنشاء الحساب";
  signupNameWrap.classList.toggle("hidden", isLogin);
  forgotWrap.classList.toggle("hidden", !isLogin);
  authTabs.forEach(t => t.classList.toggle("active", t.dataset.tab === authMode));
}

authModalClose.addEventListener("click", closeAuthModal);
authOverlay.addEventListener("click", e => { if (e.target === authOverlay) closeAuthModal(); });

authTabs.forEach(tab => {
  tab.addEventListener("click", () => {
    authMode = tab.dataset.tab;
    authError.classList.add("hidden");
    applyAuthMode();
  });
});

// Show / hide password
togglePass.addEventListener("click", () => {
  const isPass = authPassword.type === "password";
  authPassword.type = isPass ? "text" : "password";
  eyeShow.classList.toggle("hidden", isPass);
  eyeHide.classList.toggle("hidden", !isPass);
});

// Forgot password
forgotBtn.addEventListener("click", async () => {
  const email = authEmail.value.trim();
  if (!email) { showAuthError("أدخل إيميلك أولاً لإعادة تعيين كلمة المرور"); return; }
  try {
    await auth.sendPasswordResetEmail(email);
    showAuthError("✅ تم إرسال رابط إعادة التعيين على إيميلك", true);
  } catch (err) {
    showAuthError(firebaseAuthError(err.code));
  }
});

// Auth form submit
authForm.addEventListener("submit", async e => {
  e.preventDefault();
  authError.classList.add("hidden");
  authSubmitBtn.disabled = true;
  authSubmitBtn.textContent = "جاري المعالجة...";

  const email    = authEmail.value.trim();
  const password = authPassword.value;
  const name     = authName.value.trim();

  try {
    if (authMode === "login") {
      await auth.signInWithEmailAndPassword(email, password);
    } else {
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      if (name) await cred.user.updateProfile({ displayName: name });
    }
    closeAuthModal();
  } catch (err) {
    showAuthError(firebaseAuthError(err.code));
  } finally {
    authSubmitBtn.disabled = false;
    applyAuthMode();
  }
});

function showAuthError(msg, success = false) {
  authError.textContent = msg;
  authError.className   = success ? "auth-success" : "auth-error";
}

function firebaseAuthError(code) {
  const map = {
    "auth/invalid-email":            "الإيميل غير صالح",
    "auth/user-not-found":           "لا يوجد حساب بهذا الإيميل",
    "auth/wrong-password":           "كلمة المرور غير صحيحة",
    "auth/invalid-credential":       "الإيميل أو كلمة المرور غير صحيحة",
    "auth/email-already-in-use":     "هذا الإيميل مستخدم مسبقاً",
    "auth/weak-password":            "كلمة المرور ضعيفة — استخدم 6 أحرف على الأقل",
    "auth/too-many-requests":        "محاولات كثيرة، حاول لاحقاً",
    "auth/network-request-failed":   "خطأ في الاتصال بالإنترنت",
    "auth/user-disabled":            "هذا الحساب موقوف",
  };
  return map[code] || "حدث خطأ، حاول مجدداً";
}

// ── Firestore ─────────────────────────────────────────────────────
db.collection("products").orderBy("createdAt", "desc").onSnapshot(snapshot => {
  products = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  render();
});

// ── Router ────────────────────────────────────────────────────────
window.addEventListener("hashchange", render);

function getRoute() {
  const hash = window.location.hash || "#/";
  if (hash.startsWith("#/product/")) return { name: "product", id: hash.slice(10) };
  if (hash === "#/admin")            return { name: "admin" };
  return { name: "home" };
}

function render() {
  const route   = getRoute();
  const isAdmin = currentUser && currentUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  adminLink.classList.toggle("active", route.name === "admin");

  if (route.name === "product")              renderDetail(route.id, isAdmin);
  else if (route.name === "admin" && isAdmin) renderAdmin(isAdmin);
  else                                        renderHome(isAdmin);
}

// ── Search ────────────────────────────────────────────────────────
searchInput.addEventListener("input", e => {
  searchTerm = e.target.value.trim();
  render();
});

// ── Home ──────────────────────────────────────────────────────────
function renderHome(isAdmin) {
  const filtered = products.filter(p =>
    p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  let html = "";
  if (!searchTerm) {
    html += `
      <section class="hero">
        <h1>تحف رقمية <br/>مختارة بعناية.</h1>
        <p>اكتشف أحدث إصدارات أحمد الإبداعية.</p>
      </section>`;
  }

  html += `<div class="feed">`;
  if (filtered.length === 0) {
    html += `<div class="${products.length === 0 ? "loading-msg" : "empty-msg"}">${products.length === 0 ? "جاري التجهيز..." : "لا توجد نتائج."}</div>`;
  } else {
    filtered.forEach(p => { html += productCardHTML(p, isAdmin); });
  }
  html += `</div>`;

  appEl.innerHTML = html;
  bindCardEvents(isAdmin);
}

function productCardHTML(p, isAdmin) {
  const adminBtns = isAdmin ? `
    <div class="card-admin-actions">
      <button class="btn-icon edit" data-edit="${p.id}" title="تعديل">${iconEdit(16)}</button>
      <button class="btn-icon del"  data-del="${p.id}"  title="حذف">${iconTrash(16)}</button>
    </div>` : "";

  return `
    <div class="product-card" id="card-${p.id}">
      ${adminBtns}
      <div class="card-image">
        <a href="#/product/${p.id}">
          <img src="${esc(p.imageUrl)}" alt="${esc(p.title)}" loading="lazy" />
        </a>
      </div>
      <div class="card-body">
        <a href="#/product/${p.id}"><h2>${esc(p.title)}</h2></a>
        <div class="card-price"><span class="currency">US$</span>${p.price?.toFixed(2)}</div>
        <a href="${esc(gumroadUrl(p.gumroadUrl))}" target="_blank" rel="noopener" class="btn-buy">Buy Now</a>
        <p class="card-desc">${esc(p.description)}</p>
        <div class="card-footer">
          <div class="card-author">${p.author ? esc(p.author) + " : رسم وكتابة" : ""}</div>
          <div class="card-actions">
            <a href="#/product/${p.id}" class="card-detail-link">عرض التفاصيل</a>
            <button class="btn-share" data-share="${p.id}" title="نسخ الرابط">${iconShare(16)}</button>
          </div>
        </div>
      </div>
    </div>`;
}

function bindCardEvents(isAdmin) {
  if (isAdmin) {
    document.querySelectorAll("[data-edit]").forEach(btn =>
      btn.addEventListener("click", e => { e.preventDefault(); openEdit(btn.dataset.edit); })
    );
    document.querySelectorAll("[data-del]").forEach(btn =>
      btn.addEventListener("click", e => { e.preventDefault(); deleteProduct(btn.dataset.del); })
    );
  }
  document.querySelectorAll("[data-share]").forEach(btn =>
    btn.addEventListener("click", () => {
      navigator.clipboard.writeText(productShareUrl(btn.dataset.share))
        .then(() => alert("تم نسخ رابط المنتج!"));
    })
  );
}

// ── Product Detail ────────────────────────────────────────────────
function renderDetail(id, isAdmin) {
  const p = products.find(x => x.id === id);
  if (!p) { appEl.innerHTML = `<div class="loading-msg">جاري التحميل...</div>`; return; }

  const adminBtns = isAdmin ? `
    <div class="detail-admin-actions">
      <button class="btn-edit-detail" id="detail-edit">${iconEdit(16)} تعديل</button>
      <button class="btn-del-detail"  id="detail-del">${iconTrash(16)} حذف</button>
    </div>` : "";

  appEl.innerHTML = `
    <div class="detail-wrap">
      <div class="detail-nav">
        <button class="btn-back" onclick="history.back()">${iconArrow(18)} <span>العودة</span></button>
        ${adminBtns}
      </div>
      <div class="detail-card">
        <div class="detail-image"><img src="${esc(p.imageUrl)}" alt="${esc(p.title)}" /></div>
        <div class="detail-body">
          <h1>${esc(p.title)}</h1>
          <div class="detail-price"><span class="currency">US$</span>${p.price?.toFixed(2)}</div>
          <a href="${esc(gumroadUrl(p.gumroadUrl))}" target="_blank" rel="noopener" class="btn-buy-detail">Buy Now</a>
          <p class="detail-desc">${esc(p.description)}</p>
          <div class="detail-meta">
            ${p.author   ? `<p class="detail-author">${esc(p.author)} : رسم وكتابة</p>` : ""}
            ${p.fileInfo ? `<p class="detail-fileinfo">File: ${esc(p.fileInfo)}</p>` : ""}
          </div>
          <div class="detail-share">
            <button id="detail-share">${iconShare(18)} نسخ الرابط</button>
          </div>
        </div>
      </div>
    </div>`;

  document.getElementById("detail-share")?.addEventListener("click", () => {
    navigator.clipboard.writeText(productShareUrl(id)).then(() => alert("تم نسخ رابط الصفحة!"));
  });
  if (isAdmin) {
    document.getElementById("detail-edit")?.addEventListener("click", () => openEdit(id));
    document.getElementById("detail-del")?.addEventListener("click", () => {
      deleteProduct(id).then(() => { window.location.hash = "#/"; });
    });
  }
}

// ── Admin Dashboard ───────────────────────────────────────────────
function renderAdmin(isAdmin) {
  const rows = products.map(p => `
    <tr>
      <td>
        <div class="td-product">
          <img src="${esc(p.imageUrl)}" class="td-thumb" alt="${esc(p.title)}" />
          <div><div class="td-title">${esc(p.title)}</div><div class="td-author">${esc(p.author || "")}</div></div>
        </div>
      </td>
      <td class="td-price">$${p.price?.toFixed(2)}</td>
      <td>
        <div class="td-actions">
          <button class="btn-tbl edit" data-edit="${p.id}" title="تعديل">${iconEdit(16)}</button>
          <button class="btn-tbl del"  data-del="${p.id}"  title="حذف">${iconTrash(16)}</button>
          <a href="#/product/${p.id}"  class="btn-tbl view" title="عرض">${iconExternal(16)}</a>
        </div>
      </td>
    </tr>`).join("");

  appEl.innerHTML = `
    <div class="admin-wrap">
      <div class="admin-header">
        <h1>إدارة المنتجات</h1>
        <span class="admin-count">إجمالي المنتجات: ${products.length}</span>
      </div>
      <div class="admin-table-wrap">
        <table>
          <thead><tr><th>المنتج</th><th>السعر</th><th style="text-align:center">العمليات</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
  bindCardEvents(isAdmin);
}

// ── CRUD ──────────────────────────────────────────────────────────
async function deleteProduct(id) {
  if (!confirm("هل أنت متأكد من حذف هذا المنتج؟")) return;
  await db.collection("products").doc(id).delete();
}

// ── Product Modal ─────────────────────────────────────────────────
addBtn.addEventListener("click", () => openAdd());
modalClose.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", e => { if (e.target === modalOverlay) closeModal(); });

function openAdd() {
  editingId = null; selectedFile = null;
  productForm.reset(); fAuthor.value = "أحمد";
  resetImageUI();
  modalTitle.textContent = "إضافة منتج جديد";
  submitBtn.innerHTML = `${iconUpload(18)} إضافة المنتج`;
  modalOverlay.classList.remove("hidden");
}

function openEdit(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  editingId = id; selectedFile = null;
  fTitle.value    = p.title       || "";
  fPrice.value    = p.price       || "";
  fFileinfo.value = p.fileInfo    || "";
  fGumroad.value  = p.gumroadUrl  || "";
  fAuthor.value   = p.author      || "أحمد";
  fDesc.value     = p.description || "";
  if (p.imageUrl) showImagePreview(p.imageUrl, "الصورة الحالية — اضغط للتغيير");
  else resetImageUI();
  modalTitle.textContent = "تعديل المنتج";
  submitBtn.innerHTML = `${iconUpload(18)} تحديث المنتج`;
  modalOverlay.classList.remove("hidden");
}

function closeModal() {
  modalOverlay.classList.add("hidden");
  editingId = null; selectedFile = null;
  productForm.reset(); resetImageUI();
  uploadWrap.classList.add("hidden");
}

fImage.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  if (!["image/jpeg","image/png","image/webp","image/gif"].includes(file.type)) {
    alert("نوع الصورة غير مدعوم"); return;
  }
  if (file.size > 10 * 1024 * 1024) { alert("الحد الأقصى 10 ميجابايت"); return; }
  selectedFile = file;
  showImagePreview(URL.createObjectURL(file), file.name + " — اضغط للتغيير");
});

function showImagePreview(url, label) {
  previewImg.src = url; previewLabel.textContent = label;
  dropPlaceholder.classList.add("hidden"); dropPreview.classList.remove("hidden");
}
function resetImageUI() {
  previewImg.src = "";
  dropPlaceholder.classList.remove("hidden"); dropPreview.classList.add("hidden");
  uploadWrap.classList.add("hidden");
  progressBar.style.width = "0%"; progressPct.textContent = "0%";
}

productForm.addEventListener("submit", async e => {
  e.preventDefault();
  const existingImageUrl = editingId ? (products.find(p => p.id === editingId)?.imageUrl || "") : "";
  if (!selectedFile && !existingImageUrl) { alert("يرجى اختيار صورة للمنتج"); return; }

  submitBtn.disabled = true; submitBtn.innerHTML = "جاري المعالجة...";
  try {
    let imageUrl = existingImageUrl;
    if (selectedFile) imageUrl = await uploadImage(selectedFile);

    const data = {
      title: fTitle.value.trim(), price: parseFloat(fPrice.value),
      description: fDesc.value.trim(), imageUrl,
      gumroadUrl: fGumroad.value.trim(), fileInfo: fFileinfo.value.trim(),
      author: fAuthor.value.trim(),
    };
    if (editingId) await db.collection("products").doc(editingId).update(data);
    else await db.collection("products").add({ ...data, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    closeModal();
  } catch (err) {
    console.error(err); alert("خطأ: " + err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `${iconUpload(18)} ${editingId ? "تحديث المنتج" : "إضافة المنتج"}`;
  }
});

function uploadImage(file) {
  return new Promise((resolve, reject) => {
    const task = storage.ref(`products/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`).put(file);
    uploadWrap.classList.remove("hidden");
    task.on("state_changed",
      snap => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        progressBar.style.width = pct + "%"; progressPct.textContent = pct + "%";
        submitBtn.innerHTML = `جاري الرفع ${pct}%...`;
      },
      reject,
      async () => { resolve(await task.snapshot.ref.getDownloadURL()); uploadWrap.classList.add("hidden"); }
    );
  });
}

// ── SVG icons ─────────────────────────────────────────────────────
const iconEdit     = s => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>`;
const iconTrash    = s => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>`;
const iconShare    = s => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`;
const iconArrow    = s => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`;
const iconUpload   = s => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>`;
const iconExternal = s => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>`;

// ── XSS escape ────────────────────────────────────────────────────
function esc(str) {
  return String(str ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
