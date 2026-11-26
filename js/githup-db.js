const DATA_PATH = "data/products.json";
const GH_META_KEY = "portal_gh_meta";

let currentData = { ads: [], products: [] };
let currentFileSha = null;

const adsContainer = document.getElementById("adsContainer");
const productsContainer = document.getElementById("productsContainer");
const adminAdsList = document.getElementById("adminAdsList");
const adminProductsList = document.getElementById("adminProductsList");
const adminStatus = document.getElementById("adminStatus");

const ghOwnerInput = document.getElementById("ghOwner");
const ghRepoInput = document.getElementById("ghRepo");
const ghBranchInput = document.getElementById("ghBranch");
const ghTokenInput = document.getElementById("ghToken");

const loadFromApiBtn = document.getElementById("loadFromApiBtn");
const saveToApiBtn = document.getElementById("saveToApiBtn");
const addAdForm = document.getElementById("addAdForm");
const addProductForm = document.getElementById("addProductForm");

function setStatus(msg, isError = false) {
  adminStatus.textContent = msg;
  adminStatus.style.color = isError ? "#ef4444" : "#f97316";
}

function saveGhMeta() {
  const meta = {
    owner: ghOwnerInput.value.trim(),
    repo: ghRepoInput.value.trim(),
    branch: ghBranchInput.value.trim() || "main"
  };
  sessionStorage.setItem(GH_META_KEY, JSON.stringify(meta));
}

function loadGhMeta() {
  try {
    const raw = sessionStorage.getItem(GH_META_KEY);
    if (!raw) return;
    const meta = JSON.parse(raw);
    if (meta.owner) ghOwnerInput.value = meta.owner;
    if (meta.repo) ghRepoInput.value = meta.repo;
    if (meta.branch) ghBranchInput.value = meta.branch;
  } catch {
    sessionStorage.removeItem(GH_META_KEY);
  }
}

// تحويل نص UTF-8 إلى Base64 بشكل آمن مع الحروف العربية
function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// تحويل Base64 إلى نص UTF-8
function base64ToUtf8(base64) {
  const clean = base64.replace(/\n/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderPublicView() {
  const activeAds = (currentData.ads || []).filter((ad) => ad.active !== false);
  if (activeAds.length === 0) {
    adsContainer.innerHTML = `<p style="color:#9ca3af">لا توجد إعلانات نشطة حالياً.</p>`;
  } else {
    adsContainer.innerHTML = activeAds
      .map(
        (ad) => `
      <article class="ad-card">
        <span class="badge">${escapeHTML(ad.badge || "إعلان")}</span>
        <h3>${escapeHTML(ad.title)}</h3>
        <p style="color:#9ca3af;margin-top:6px;font-size:14px;">${escapeHTML(ad.description)}</p>
      </article>
    `
      )
      .join("");
  }

  const products = currentData.products || [];
  if (products.length === 0) {
    productsContainer.innerHTML = `<p style="color:#9ca3af">لا توجد منتجات مضافة حالياً.</p>`;
  } else {
    productsContainer.innerHTML = products
      .map(
        (prod) => `
      <article class="product-card">
        <div>
          ${prod.image ? `<img src="${escapeHTML(prod.image)}" alt="${escapeHTML(prod.name)}" class="product-img" />` : ""}
          <div class="product-meta" style="margin-top:10px;">
            <span>${escapeHTML(prod.category || "عام")}</span>
            <span class="product-price">${escapeHTML(prod.price)}</span>
          </div>
          <h3 style="margin-top:6px;font-size:17px;">${escapeHTML(prod.name)}</h3>
          <p style="color:#9ca3af;margin-top:6px;font-size:13.5px;">${escapeHTML(prod.description)}</p>
        </div>
      </article>
    `
      )
      .join("");
  }
}

function renderAdminLists() {
  adminAdsList.innerHTML = (currentData.ads || [])
    .map(
      (ad, idx) => `
    <li class="manage-item">
      <span>${escapeHTML(ad.title)}</span>
      <button type="button" class="btn-danger" data-delete-ad="${idx}">حذف</button>
    </li>
  `
    )
    .join("");

  adminProductsList.innerHTML = (currentData.products || [])
    .map(
      (prod, idx) => `
    <li class="manage-item">
      <span>${escapeHTML(prod.name)} — <strong>${escapeHTML(prod.price)}</strong></span>
      <button type="button" class="btn-danger" data-delete-product="${idx}">حذف</button>
    </li>
  `
    )
    .join("");
}

function refreshAll() {
  renderPublicView();
  renderAdminLists();
}

// قراءة أولية من الملف المحلي/المنشور (مع تجاوز الكاش)
async function loadInitialLocalJson() {
  try {
    const res = await fetch(`${DATA_PATH}?t=${Date.now()}`);
    if (!res.ok) throw new Error("تعذر قراءة data/products.json");
    const json = await res.json();
    currentData = {
      ads: Array.isArray(json.ads) ? json.ads : [],
      products: Array.isArray(json.products) ? json.products : []
    };
    refreshAll();
  } catch (err) {
    setStatus(err.message, true);
  }
}

// جلب الملف و sha عبر GitHub Contents API
async function fetchFileFromGitHub() {
  saveGhMeta();
  const owner = ghOwnerInput.value.trim();
  const repo = ghRepoInput.value.trim();
  const branch = ghBranchInput.value.trim() || "main";
  const token = ghTokenInput.value.trim();

  if (!owner || !repo || !token) {
    setStatus("أدخل Owner وRepo وGitHub Token أولاً.", true);
    return;
  }

  setStatus("جاري جلب البيانات من GitHub...");
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${DATA_PATH}?ref=${encodeURIComponent(branch)}`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json"
      }
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || `فشل الجلب (${res.status})`);
    }

    const fileInfo = await res.json();
    currentFileSha = fileInfo.sha;
    const decoded = base64ToUtf8(fileInfo.content);
    const parsed = JSON.parse(decoded);

    currentData = {
      ads: Array.isArray(parsed.ads) ? parsed.ads : [],
      products: Array.isArray(parsed.products) ? parsed.products : []
    };

    refreshAll();
    setStatus("تم جلب أحدث نسخة من GitHub بنجاح.");
  } catch (err) {
    setStatus(`خطأ: ${err.message}`, true);
  }
}

// حفظ التعديلات مباشرة إلى data/products.json في GitHub
async function saveFileToGitHub() {
  saveGhMeta();
  const owner = ghOwnerInput.value.trim();
  const repo = ghRepoInput.value.trim();
  const branch = ghBranchInput.value.trim() || "main";
  const token = ghTokenInput.value.trim();

  if (!owner || !repo || !token) {
    setStatus("أدخل Owner وRepo وGitHub Token أولاً.", true);
    return;
  }

  setStatus("جاري حفظ البيانات إلى GitHub...");
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${DATA_PATH}`;

  try {
    // إذا لم يكن sha محفوظاً بعد، نحاول جلبه أولاً لتجنب تعارض التحديث
    if (!currentFileSha) {
      const checkRes = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json"
        }
      });
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        currentFileSha = checkData.sha;
      }
    }

    const formattedJson = JSON.stringify(currentData, null, 2);
    const body = {
      message: "Update products and ads via portal admin",
      content: utf8ToBase64(formattedJson),
      branch
    };
    if (currentFileSha) {
      body.sha = currentFileSha;
    }

    const putRes = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!putRes.ok) {
      const errBody = await putRes.json().catch(() => ({}));
      throw new Error(errBody.message || `فشل الحفظ (${putRes.status})`);
    }

    const result = await putRes.json();
    currentFileSha = result.content?.sha || currentFileSha;
    refreshAll();
    setStatus("تم تحديث ملف data/products.json في GitHub بنجاح.");
  } catch (err) {
    setStatus(`خطأ أثناء الحفظ: ${err.message}`, true);
  }
}

addAdForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = document.getElementById("adTitle").value.trim();
  const badge = document.getElementById("adBadge").value.trim() || "إعلان";
  const description = document.getElementById("adDesc").value.trim();
  if (!title || !description) return;

  currentData.ads.push({
    id: `ad-${Date.now()}`,
    title,
    badge,
    description,
    active: true
  });

  addAdForm.reset();
  document.getElementById("adBadge").value = "عرض خاص";
  refreshAll();
  setStatus("تمت الإضافة للذاكرة — اضغط (حفظ التعديلات في GitHub) لتثبيتها.");
});

addProductForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("prodName").value.trim();
  const price = Number(document.getElementById("prodPrice").value);
  const category = document.getElementById("prodCategory").value.trim() || "عام";
  const image = document.getElementById("prodImage").value.trim();
  const description = document.getElementById("prodDesc").value.trim();
  if (!name || Number.isNaN(price) || !description) return;

  currentData.products.push({
    id: `prod-${Date.now()}`,
    name,
    price,
    category,
    image,
    description
  });

  addProductForm.reset();
  document.getElementById("prodCategory").value = "عام";
  refreshAll();
  setStatus("تمت إضافة المنتج للذاكرة — اضغط (حفظ التعديلات في GitHub) لتثبيته.");
});

adminAdsList.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-delete-ad]");
  if (!btn) return;
  const index = Number(btn.getAttribute("data-delete-ad"));
  currentData.ads.splice(index, 1);
  refreshAll();
  setStatus("تم حذف الإعلان من الذاكرة — احفظ التغييرات لتطبيقها في GitHub.");
});

adminProductsList.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-delete-product]");
  if (!btn) return;
  const index = Number(btn.getAttribute("data-delete-product"));
  currentData.products.splice(index, 1);
  refreshAll();
  setStatus("تم حذف المنتج من الذاكرة — احفظ التغييرات لتطبيقها في GitHub.");
});

loadFromApiBtn.addEventListener("click", fetchFileFromGitHub);
saveToApiBtn.addEventListener("click", saveFileToGitHub);

loadGhMeta();
loadInitialLocalJson();
