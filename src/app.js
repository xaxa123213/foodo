// Foodo — recipes, folders, ingredients, shopping list. Local storage, no backend.

const STORE = "foodo.recipes.v1";
const SHOP_KEY = "foodo.shop.v1";
const THEME_KEY = "foodo.theme.v2";

let recipes = load();
let shoppingSet = loadShop();
let editingId = null;
let currentTab = "recipes";
let returnTab = "home";
let activeFolder = "__all__";
let query = "";
const GOT_KEY = "foodo.got.v1";
const gotItems = loadGot(); // ticked-off shopping items

function load() {
  try { return JSON.parse(localStorage.getItem(STORE)) || []; } catch { return []; }
}
function save() { localStorage.setItem(STORE, JSON.stringify(recipes)); }
function loadGot() { try { return new Set(JSON.parse(localStorage.getItem(GOT_KEY)) || []); } catch { return new Set(); } }
function saveGot() { localStorage.setItem(GOT_KEY, JSON.stringify([...gotItems])); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

const NATIVE = !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform());

const $ = (id) => document.getElementById(id);
const lines = (s) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const folders = () => [...new Set(recipes.map((r) => r.folder).filter(Boolean))].sort();
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

// ---- Icons ----
const svg = (d, w = 1.8) =>
  `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

const ICON = {
  plus: svg('<path d="M12 5v14M5 12h14"/>', 2.2),
  back: svg('<path d="m15 18-6-6 6-6"/>', 2.2),
  chevron: svg('<path d="m9 18 6-6-6-6"/>', 2),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  cart: svg('<circle cx="9" cy="20" r="1.3"/><circle cx="18" cy="20" r="1.3"/><path d="M2.5 3h2.6l2.4 12.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.5L21.5 8H6.2"/>'),
  edit: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  trash: svg('<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="m19 6-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>'),
  leaf: svg('<path d="M11 20A7 7 0 0 1 4 13c0-5 4-9 16-9 0 12-4 16-9 16z"/><path d="M4 20c4-4 7-6 10-7"/>'),
  steps: svg('<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>', 2.2),
  folder: svg('<path d="M4 6a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>'),
  check: svg('<path d="M20 6 9 17l-5-5"/>', 3),
  compass: svg('<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>'),
  book: svg('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>'),
  download: svg('<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>', 2),
  upload: svg('<path d="M12 21V9"/><path d="m7 14 5-5 5 5"/><path d="M5 3h14"/>', 2),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>', 2),
  palette: svg('<path d="M12 22a10 10 0 1 1 10-10c0 2.8-2.2 4-4 4h-2a2 2 0 0 0-1.5 3.3A1.6 1.6 0 0 1 12 22z"/><circle cx="7.5" cy="11.5" r="1"/><circle cx="10.5" cy="7.5" r="1"/><circle cx="15.5" cy="7.5" r="1"/>', 2),
  image: svg('<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m3 16 5-5 5 5"/><path d="m13 14 2-2 6 6"/>', 2),
  moon: svg('<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>', 2),
  x: svg('<path d="M18 6 6 18M6 6l12 12"/>', 2.4),
  camera: svg('<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3.5"/>'),
  keyboard: svg('<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M18 13h.01M9 13h6"/>', 2),
  sparkle: svg('<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>'),
  heart: svg('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>'),
  fridge: svg('<rect x="5" y="2" width="14" height="20" rx="2.5"/><path d="M5 10h14M9 5.5v2M9 13v3"/>'),
};

// ---- Recipe artwork ----
const COVERS = [
  ["#ff9466", "#e8492f"], // tomato
  ["#f9c46b", "#e5891a"], // saffron
  ["#8cc68b", "#3f8a4e"], // basil
  ["#c39be3", "#7b4fb3"], // plum
  ["#7dbde3", "#3b7fb0"], // ocean
  ["#eba98e", "#b55f43"], // terracotta
];
function coverStyle(name) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.codePointAt(0)) >>> 0;
  const [a, b] = COVERS[h % COVERS.length];
  return `background:linear-gradient(140deg,${a},${b})`;
}
const initial = (name) => esc(([...name.trim()][0] || "?").toUpperCase());

// ---- Shared pieces ----
const pageHead = (title, sub = "") =>
  `<header class="page-head"><h1 class="page-title">${title}</h1>${sub ? `<p class="page-sub">${sub}</p>` : ""}</header>`;

const emptyState = (icon, title, text, extra = "") =>
  `<div class="empty"><div class="empty-ico">${icon}</div><h3>${title}</h3><p>${text}</p>${extra}</div>`;

function recipeRow(r) {
  return `
    <button class="recipe" data-id="${r.id}">
      <span class="art thumb" style="${coverStyle(r.name)}">${initial(r.name)}</span>
      <span class="recipe-body">
        <span class="recipe-name">${esc(r.name)}</span>
        <span class="recipe-meta">
          ${r.folder ? `<span class="tag">${esc(r.folder)}</span>` : ""}
          <span class="count-ico" title="${plural(r.ingredients.length, "ingredient")}">${ICON.leaf}${r.ingredients.length}</span>
          <span class="count-ico" title="${plural(r.steps.length, "step")}">${ICON.steps}${r.steps.length}</span>
        </span>
      </span>
      <span class="chev">${ICON.chevron}</span>
    </button>`;
}

function recipeTile(r) {
  return `
    <button class="tile" data-id="${r.id}">
      <span class="art tile-cover" style="${coverStyle(r.name)}">${initial(r.name)}</span>
      <span class="tile-name">${esc(r.name)}</span>
      <span class="tile-meta">${plural(r.ingredients.length, "ingredient")}</span>
    </button>`;
}

const bindOpen = (root) =>
  root.querySelectorAll("[data-id]").forEach((el) =>
    el.addEventListener("click", () => openDetail(el.dataset.id)));

function animateView() {
  const v = $("view");
  v.classList.remove("enter");
  void v.offsetWidth;
  v.classList.add("enter");
  window.scrollTo(0, 0);
}

function goShopping() {
  returnTab = currentTab;
  currentTab = "shop";
  syncTabs(); renderShopping(); animateView();
}

// ---- Views ----
function render() {
  stopCamera();
  if (currentTab === "recipes") renderRecipes();
  else if (currentTab === "scan") renderScan();
  else if (currentTab === "home") renderHome();
  else if (currentTab === "shop") renderShopping();
  else if (currentTab === "discover") renderDiscover();
  else if (currentTab === "settings") renderSettings();
}

function greeting() {
  const h = new Date().getHours();
  return h >= 5 && h < 12 ? "Good morning" : h >= 12 && h < 18 ? "Good afternoon" : "Good evening";
}

function renderHome() {
  const v = $("view");
  const recent = recipes.slice(0, 6);
  const onList = recipes.filter((r) => shoppingSet.has(r.id)).length;
  v.innerHTML = `
    <section class="hero">
      <p class="eyebrow">${greeting()}</p>
      <h1 class="hero-title">What are we<br />cooking today?</h1>
      <div class="stats">
        <div class="stat"><b>${recipes.length}</b><span>Recipes</span></div>
        <div class="stat"><b>${folders().length}</b><span>Folders</span></div>
        <div class="stat"><b>${onList}</b><span>On list</span></div>
      </div>
    </section>
    <div class="quick">
      <button class="quick-btn" id="h-post">
        <span class="quick-ico">${ICON.camera}</span>
        <span><b>Share a meal</b><small>Post what you ate</small></span>
      </button>
      <button class="quick-btn" id="h-shop">
        <span class="quick-ico">${ICON.cart}</span>
        <span><b>Shopping list</b><small>Plan your shop</small></span>
      </button>
    </div>
    ${recent.length ? `
      <div class="section-head">
        <h2>Recently added</h2>
        <button class="link" id="h-all">See all</button>
      </div>
      <div class="rail">${recent.map(recipeTile).join("")}</div>` : ""}
    <div class="section-head">
      <h2>Food feed</h2>
      <div class="seg" role="tablist">
        <button role="tab" data-feed="all" class="${feedFilter === "all" ? "on" : ""}">Everyone</button>
        <button role="tab" data-feed="mine" class="${feedFilter === "mine" ? "on" : ""}">Mine</button>
      </div>
    </div>
    <div id="feed"></div>
  `;
  $("h-post").addEventListener("click", openComposer);
  $("h-shop").addEventListener("click", goShopping);
  const all = $("h-all");
  if (all) all.addEventListener("click", () => { currentTab = "recipes"; syncTabs(); render(); animateView(); });
  v.querySelectorAll("[data-feed]").forEach((b) => b.addEventListener("click", () => {
    feedFilter = b.dataset.feed;
    v.querySelectorAll("[data-feed]").forEach((x) => x.classList.toggle("on", x === b));
    renderFeed();
  }));
  bindOpen(v);
  renderFeed();
}

// ---- Food feed ----
let posts = [];
let feedFilter = "all";
let draftPhoto = null;

const postsDb = (() => {
  let conn = null;
  const open = () => conn || (conn = new Promise((res, rej) => {
    const req = indexedDB.open("foodo", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("posts", { keyPath: "id" });
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  }));
  const run = async (mode, fn) => {
    const db = await open();
    return new Promise((res, rej) => {
      const tx = db.transaction("posts", mode);
      const req = fn(tx.objectStore("posts"));
      tx.oncomplete = () => res(req.result);
      tx.onerror = tx.onabort = () => rej(tx.error);
    });
  };
  return {
    all: () => run("readonly", (s) => s.getAll()),
    put: (p) => run("readwrite", (s) => s.put(p)),
    del: (id) => run("readwrite", (s) => s.delete(id)),
  };
})();

function timeAgo(t) {
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 172800) return "Yesterday";
  return new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function postCard(p) {
  const r = p.recipeId && recipes.find((x) => x.id === p.recipeId);
  return `
    <article class="post">
      <header class="post-head">
        <span class="avatar">Y</span>
        <span class="post-who"><b>You</b><span>${timeAgo(p.created)}</span></span>
        <button class="icon-btn" data-del="${p.id}" aria-label="Delete post">${ICON.trash}</button>
      </header>
      <img class="post-photo" src="${p.photo}" alt="${esc(p.caption || "Meal photo")}" loading="lazy" />
      <div class="post-actions">
        <button class="like ${p.liked ? "on" : ""}" data-like="${p.id}" aria-label="Like">${ICON.heart}</button>
      </div>
      ${p.caption ? `<p class="post-caption"><b>You</b> ${esc(p.caption)}</p>` : ""}
      ${r ? `<button class="post-recipe" data-id="${r.id}"><span class="art thumb xs" style="${coverStyle(r.name)}">${initial(r.name)}</span><span>${esc(r.name)}</span>${ICON.chevron}</button>` : ""}
    </article>`;
}

function renderFeed() {
  const el = $("feed");
  if (!el) return;
  const list = [...posts].sort((a, b) => b.created - a.created);
  const community = feedFilter === "all"
    ? `<div class="community-card"><span class="notice-ico">${ICON.compass}</span><p><b>Posts from other cooks are coming.</b> Once the community launches you'll see what everyone's eating here.</p></div>`
    : "";
  el.innerHTML = list.length
    ? `<div class="feed">${list.map(postCard).join("")}</div>${community}`
    : emptyState(ICON.camera, "Share your first meal", "Snap what you're eating and it'll show up in your feed.",
        `<button class="btn primary" id="f-post">${ICON.camera}Share a meal</button>`) + community;

  const fp = $("f-post");
  if (fp) fp.addEventListener("click", openComposer);
  bindOpen(el);
  el.querySelectorAll("[data-like]").forEach((b) => b.addEventListener("click", () => {
    const p = posts.find((x) => x.id === b.dataset.like);
    if (!p) return;
    p.liked = !p.liked;
    b.classList.toggle("on", p.liked);
    postsDb.put(p).catch(() => {});
  }));
  el.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => {
    if (!confirm("Delete this post?")) return;
    const id = b.dataset.del;
    postsDb.del(id).then(() => { posts = posts.filter((x) => x.id !== id); renderFeed(); })
      .catch(() => alert("Couldn't delete the post."));
  }));
}

function openComposer() {
  draftPhoto = null;
  $("post-body").innerHTML = `
    <button class="photo-pick" id="post-photo-btn">
      <span class="photo-empty">${ICON.camera}<b>Add a photo</b><small>Take one or choose from your library</small></span>
    </button>
    <input type="file" id="post-file" accept="image/*" class="hidden" />
    <div class="field">
      <label class="field-label" for="post-caption">Caption</label>
      <textarea id="post-caption" class="input" rows="3" placeholder="What did you eat? How was it?"></textarea>
    </div>
    <div class="field">
      <label class="field-label" for="post-recipe">Recipe <span class="hint">Optional</span></label>
      <div class="select-wrap">
        <select id="post-recipe" class="input">
          <option value="">No recipe</option>
          ${recipes.map((r) => `<option value="${r.id}">${esc(r.name)}</option>`).join("")}
        </select>
        ${svg('<path d="m6 9 6 6 6-6"/>', 2)}
      </div>
    </div>`;
  const pick = $("post-photo-btn");
  pick.addEventListener("click", () => $("post-file").click());
  $("post-file").addEventListener("change", (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const img = new Image();
    img.onload = () => {
      draftPhoto = frameToDataUrl(img, img.naturalWidth, img.naturalHeight, 1080);
      URL.revokeObjectURL(img.src);
      pick.classList.add("has-photo");
      pick.innerHTML = `<img src="${draftPhoto}" alt="Your meal" /><span class="photo-change">Change photo</span>`;
    };
    img.src = URL.createObjectURL(f);
  });
  $("post-save").disabled = false;
  $("post-sheet").classList.remove("hidden");
}

function closeComposer() { $("post-sheet").classList.add("hidden"); draftPhoto = null; }

async function savePost() {
  if (!draftPhoto) { alert("Add a photo of your meal first."); return; }
  const p = {
    id: uid(),
    created: Date.now(),
    photo: draftPhoto,
    caption: $("post-caption").value.trim(),
    recipeId: $("post-recipe").value || null,
    liked: false,
  };
  const btn = $("post-save");
  btn.disabled = true;
  try { await postsDb.put(p); }
  catch { btn.disabled = false; alert("Couldn't save the post — your phone may be low on storage."); return; }
  posts.unshift(p);
  closeComposer();
  currentTab = "home"; syncTabs(); render(); animateView();
}

postsDb.all().then((p) => { posts = p || []; if (currentTab === "home") renderFeed(); }).catch(() => {});

function renderRecipes() {
  const v = $("view");
  const all = folders();
  const chips = activeFolder !== "__all__" && !all.includes(activeFolder) ? [...all, activeFolder] : all;
  const count = (f) => recipes.filter((r) => r.folder === f).length;
  const chip = (key, label, n) =>
    `<button class="folder-chip ${activeFolder === key ? "active" : ""}" data-folder="${esc(key)}">${esc(label)}<span class="count">${n}</span></button>`;

  v.innerHTML = `
    ${pageHead("Cookbook", recipes.length ? `${plural(recipes.length, "recipe")} · ${plural(all.length, "folder")}` : "")}
    ${recipes.length ? `
      <label class="search">
        ${ICON.search}
        <input id="q" type="search" placeholder="Search recipes & ingredients" value="${esc(query)}" autocomplete="off" />
      </label>
      <div class="folder-bar">
        ${chip("__all__", "All", recipes.length)}
        ${chips.map((f) => chip(f, f, count(f))).join("")}
        <button class="folder-chip new" id="new-folder">${ICON.plus}Folder</button>
      </div>` : ""}
    <div id="recipe-list"></div>`;

  v.querySelectorAll(".folder-chip[data-folder]").forEach((c) =>
    c.addEventListener("click", () => { activeFolder = c.dataset.folder; renderRecipes(); }));
  const nf = $("new-folder");
  if (nf) nf.addEventListener("click", () => {
    const name = prompt("Folder name");
    if (name && name.trim()) { activeFolder = name.trim(); renderRecipes(); }
  });
  const q = $("q");
  if (q) q.addEventListener("input", () => { query = q.value; renderRecipeList(); });
  renderRecipeList();
}

function renderRecipeList() {
  const list = $("recipe-list");
  const q = query.trim().toLowerCase();
  const shown = recipes.filter((r) =>
    (activeFolder === "__all__" || r.folder === activeFolder) &&
    (!q || r.name.toLowerCase().includes(q) || r.ingredients.some((i) => i.toLowerCase().includes(q))));

  if (shown.length) {
    list.innerHTML = `<div class="list">${shown.map(recipeRow).join("")}</div>`;
    bindOpen(list);
  } else if (!recipes.length) {
    list.innerHTML = emptyState(ICON.book, "Your cookbook is empty",
      "Add your first recipe and it'll live here — offline and private.",
      `<button class="btn primary" id="e-add">${ICON.plus}Add a recipe</button>`);
    $("e-add").addEventListener("click", () => openEditor(null));
  } else {
    list.innerHTML = q
      ? emptyState(ICON.search, "No matches", `Nothing found for “${esc(query.trim())}”.`)
      : emptyState(ICON.folder, "This folder is empty", "Recipes you file here will appear in this folder.");
  }
}

function renderDiscover() {
  $("view").innerHTML = `
    ${pageHead("Discover", "Recipes from the Foodo community")}
    ${emptyState(ICON.compass, "Coming soon",
      "Browse, save and share recipes with other home cooks. We're putting the finishing touches on it.",
      `<span class="badge">In development</span>`)}`;
}

function renderSettings() {
  const v = $("view");
  const count = recipes.length;
  const nf = folders().length;
  v.innerHTML = `
    ${pageHead("Settings")}
    <h2 class="section-label">Appearance</h2>
    <div class="group pad"><div id="theme-swatches"></div></div>
    <div class="group">
      <label class="row">
        <span class="row-ico" style="--c:var(--primary)">${ICON.palette}</span>
        <span class="row-label">Accent colour</span>
        <input type="color" id="theme-accent" />
      </label>
      <label class="row">
        <span class="row-ico" style="--c:#8e8e93">${ICON.image}</span>
        <span class="row-label">Background</span>
        <input type="color" id="theme-bg" />
      </label>
      <label class="row">
        <span class="row-ico" style="--c:#5e5ce6">${ICON.moon}</span>
        <span class="row-label">Dark mode</span>
        <input type="checkbox" class="switch" id="theme-dark" />
      </label>
    </div>

    <h2 class="section-label">Your data</h2>
    <div class="group">
      <div class="row">
        <span class="row-ico" style="--c:#ff9f0a">${ICON.book}</span>
        <span class="row-label">Cookbook</span>
        <span class="row-value">${plural(count, "recipe")} · ${plural(nf, "folder")}</span>
      </div>
      <button class="row" id="set-export">
        <span class="row-ico" style="--c:#30b158">${ICON.download}</span>
        <span class="row-label">Export backup</span>
        <span class="chev">${ICON.chevron}</span>
      </button>
      <button class="row" id="set-import">
        <span class="row-ico" style="--c:#0a84ff">${ICON.upload}</span>
        <span class="row-label">Import backup</span>
        <span class="chev">${ICON.chevron}</span>
      </button>
    </div>
    <input type="file" id="set-file" accept="application/json" class="hidden" />

    <h2 class="section-label">About</h2>
    <div class="group">
      <div class="row">
        <span class="row-ico" style="--c:#8e8e93">${ICON.info}</span>
        <span class="row-label">Foodo</span>
        <span class="row-value">Offline &amp; private</span>
      </div>
    </div>
    <p class="footnote">Your recipes are stored on this device only.</p>`;

  renderThemeControls();

  $("set-export").addEventListener("click", exportBackup);
  $("set-import").addEventListener("click", () => $("set-file").click());
  $("set-file").addEventListener("change", (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (Array.isArray(data)) {
          const ids = new Set(recipes.map((r) => r.id));
          for (const r of data) if (r && r.name && !ids.has(r.id)) recipes.push(r);
          save(); alert("Imported."); render();
        }
      } catch { alert("Invalid file."); }
    };
    reader.readAsText(f);
  });
}

async function exportBackup() {
  const json = JSON.stringify(recipes, null, 2);
  const name = "foodo-recipes.json";
  if (NATIVE) {
    // Android WebView can't download blobs, so hand the file to the system share sheet.
    try {
      const { Filesystem, Share } = Capacitor.Plugins;
      const { uri } = await Filesystem.writeFile({ path: name, data: json, directory: "CACHE", encoding: "utf8" });
      await Share.share({ title: "Foodo backup", files: [uri], dialogTitle: "Save your Foodo backup" });
    } catch (err) {
      if (!/cancel/i.test(String(err && err.message))) alert("Couldn't export: " + (err && err.message || err));
    }
    return;
  }
  const file = new File([json], name, { type: "application/json" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: "Foodo backup" }); return; }
    catch (err) { if (err && err.name === "AbortError") return; }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(file);
  a.download = name;
  a.click();
}

const TAB_NAMES = { recipes: "Cookbook", home: "Home", scan: "Scan", discover: "Discover", settings: "Settings", shop: "Shopping" };

function openDetail(id) {
  const r = recipes.find((x) => x.id === id);
  if (!r) return;
  stopCamera();
  const onList = shoppingSet.has(r.id);
  const v = $("view");
  v.innerHTML = `
    <button class="back" id="d-back">${ICON.back}<span>${TAB_NAMES[currentTab] || "Back"}</span></button>
    <div class="art cover" style="${coverStyle(r.name)}">
      ${initial(r.name)}
      ${r.folder ? `<span class="cover-tag">${ICON.folder}${esc(r.folder)}</span>` : ""}
    </div>
    <h1 class="detail-title">${esc(r.name)}</h1>
    ${r.notes ? `<p class="detail-notes">${esc(r.notes)}</p>` : ""}
    <div class="facts">
      <div class="fact">${ICON.leaf}<div><b>${r.ingredients.length}</b><span>Ingredients</span></div></div>
      <div class="fact">${ICON.steps}<div><b>${r.steps.length}</b><span>Steps</span></div></div>
    </div>
    <div class="detail-actions">
      <button class="btn primary grow ${onList ? "added" : ""}" id="d-shop">${onList ? ICON.check : ICON.cart}${onList ? "On your list" : "Add to list"}</button>
      <button class="btn icon" id="d-edit" aria-label="Edit">${ICON.edit}</button>
      <button class="btn icon danger" id="d-del" aria-label="Delete">${ICON.trash}</button>
    </div>

    <h2 class="section-label">Ingredients</h2>
    <ul class="group checklist">
      ${r.ingredients.map((i) => `<li><button class="check-row"><span class="check">${ICON.check}</span><span class="check-text">${esc(i)}</span></button></li>`).join("")
        || `<li class="muted-row">No ingredients added yet.</li>`}
    </ul>

    <h2 class="section-label">Method</h2>
    ${r.steps.length
      ? `<ol class="steps">${r.steps.map((s, n) => `<li><span class="step-num">${n + 1}</span><p>${esc(s)}</p></li>`).join("")}</ol>`
      : `<div class="group"><p class="muted-row">No steps added yet.</p></div>`}
  `;
  animateView();

  $("d-back").addEventListener("click", () => { render(); animateView(); });
  $("d-edit").addEventListener("click", () => openEditor(r));
  $("d-del").addEventListener("click", () => {
    if (confirm(`Delete "${r.name}"?`)) {
      recipes = recipes.filter((x) => x.id !== r.id);
      save(); render(); animateView();
    }
  });
  $("d-shop").addEventListener("click", () => { shoppingSet.add(r.id); saveShop(); goShopping(); });
  v.querySelectorAll(".check-row").forEach((row) =>
    row.addEventListener("click", () => row.classList.toggle("done")));
}

// ---- Editor ----
function openEditor(recipe = null) {
  editingId = recipe ? recipe.id : null;
  $("sheet-title").textContent = recipe ? "Edit recipe" : "New recipe";
  $("r-name").value = recipe ? recipe.name : "";
  $("r-ingredients").value = recipe ? recipe.ingredients.join("\n") : "";
  $("r-steps").value = recipe ? recipe.steps.join("\n") : "";
  $("r-notes").value = recipe ? (recipe.notes || "") : "";

  const sel = $("r-folder");
  const list = folders();
  sel.innerHTML = `<option value="">No folder</option>` +
    list.map((f) => `<option value="${esc(f)}">${esc(f)}</option>`).join("") +
    `<option value="__new__">+ New folder…</option>`;
  sel.value = recipe ? (recipe.folder || "") : "";

  $("sheet").classList.remove("hidden");
  setTimeout(() => $("r-name").focus(), 100);
}

function closeEditor() { $("sheet").classList.add("hidden"); }

function saveEditor() {
  const name = $("r-name").value.trim();
  if (!name) { alert("Give the recipe a name."); return; }
  let folder = $("r-folder").value;
  if (folder === "__new__") {
    folder = (prompt("Folder name") || "").trim();
  }
  const data = {
    id: editingId || uid(),
    name,
    folder,
    ingredients: lines($("r-ingredients").value),
    steps: lines($("r-steps").value),
    notes: $("r-notes").value.trim(),
  };
  if (editingId) {
    const i = recipes.findIndex((x) => x.id === editingId);
    recipes[i] = data;
  } else {
    recipes.unshift(data);
  }
  save(); closeEditor();
  if (editingId) openDetail(data.id); else render();
}

// ---- Scan: fridge → ingredients → recipe matches ----
const FRIDGE_KEY = "foodo.fridge.v1";
let fridge = loadFridge();
let scanStep = "camera"; // camera | items | results
let scanPhoto = null;
let camStream = null;

function loadFridge() { try { return JSON.parse(localStorage.getItem(FRIDGE_KEY)) || []; } catch { return []; } }
function saveFridge() { localStorage.setItem(FRIDGE_KEY, JSON.stringify(fridge)); }

const FILLER = new Set(("g kg mg ml l cl dl oz lb lbs tbsp tbs tsp cup cups clove cloves pinch handful bunch " +
  "can cans tin tins pack packet slice slices piece pieces x of a an the and or to for large small medium big " +
  "ripe fresh frozen chopped sliced diced grated finely roughly optional some few").split(" "));
const STAPLES = new Set(["salt", "pepper", "water", "oil", "olive", "black", "ice"]);

const coreWords = (s) => String(s).toLowerCase()
  .replace(/\(.*?\)/g, " ")
  .replace(/[^a-z\u00c0-\u024f\s]/g, " ")
  .split(/\s+/)
  .filter((w) => w.length > 1 && !FILLER.has(w));
const stem = (w) =>
  w.endsWith("oes") ? w.slice(0, -2) :
  w.endsWith("ies") ? w.slice(0, -3) + "y" :
  w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w;
const stems = (s) => coreWords(s).map(stem);
const isStaple = (st) => st.every((w) => STAPLES.has(w));
const covers = (item, line) => item.length > 0 && item.every((w) => line.includes(w));

function matchRecipes() {
  const have = fridge.map(stems).filter((a) => a.length);
  return recipes.map((r) => {
    const needed = r.ingredients
      .map((text) => ({ text, st: stems(text) }))
      .filter((l) => l.st.length && !isStaple(l.st));
    const missing = needed.filter((l) => !have.some((h) => covers(h, l.st))).map((l) => l.text);
    return { r, missing, total: needed.length };
  }).filter((m) => m.total > 0);
}

function fridgeSuggestions() {
  const have = fridge.map(stems).filter((a) => a.length);
  const counts = new Map();
  for (const r of recipes) for (const ing of r.ingredients) {
    const words = coreWords(ing);
    const st = words.map(stem);
    if (!words.length || isStaple(st) || have.some((h) => covers(h, st))) continue;
    const name = words.join(" ");
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([n]) => n);
}

function addFridgeItem(name) {
  const v = name.trim();
  if (!v || fridge.some((f) => f.toLowerCase() === v.toLowerCase())) return;
  fridge.push(v); saveFridge();
}

function stopCamera() {
  if (camStream) { camStream.getTracks().forEach((t) => t.stop()); camStream = null; }
}

function frameToDataUrl(src, w, h, max = 1024) {
  const s = Math.min(1, max / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.round(w * s); c.height = Math.round(h * s);
  c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.8);
}

function goScanStep(step) { scanStep = step; stopCamera(); renderScan(); animateView(); }

function renderScan() {
  if (scanStep === "items") return renderScanItems();
  if (scanStep === "results") return renderScanResults();
  renderScanCamera();
}

function renderScanCamera() {
  const v = $("view");
  v.innerHTML = `
    ${pageHead("Scan your fridge", "Snap a photo, then confirm what's inside.")}
    <div class="viewfinder" id="vf">
      <video id="sc-video" autoplay playsinline muted></video>
      <div class="vf-frame"></div>
      <div class="vf-msg" id="vf-msg">${ICON.camera}<span>Starting camera…</span></div>
      <div class="vf-hint">Fit the shelves in the frame</div>
    </div>
    <div class="scan-controls">
      <button class="side-btn" id="sc-upload"><span class="side-ico">${ICON.image}</span>Photo</button>
      <button class="shutter" id="sc-shoot" aria-label="Take photo"></button>
      <button class="side-btn" id="sc-skip"><span class="side-ico">${ICON.keyboard}</span>Type it</button>
    </div>
    <input type="file" id="sc-file" accept="image/*" class="hidden" />`;

  const video = $("sc-video");
  const showMsg = (text) => {
    $("vf").classList.remove("live");
    $("vf-msg").innerHTML = `${ICON.camera}<span>${text}</span>`;
  };

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showMsg("Camera isn't available here. Upload a photo or type your ingredients.");
  } else {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      .then((stream) => {
        if (!video.isConnected) { stream.getTracks().forEach((t) => t.stop()); return; }
        stopCamera();
        camStream = stream;
        video.srcObject = stream;
        $("vf").classList.add("live");
      })
      .catch(() => showMsg("No camera access. Allow the camera in your settings, or upload a photo instead."));
  }

  $("sc-shoot").addEventListener("click", () => {
    if (!camStream || !video.videoWidth) { $("sc-file").click(); return; }
    scanPhoto = frameToDataUrl(video, video.videoWidth, video.videoHeight);
    goScanStep("items");
  });
  $("sc-upload").addEventListener("click", () => $("sc-file").click());
  $("sc-skip").addEventListener("click", () => { scanPhoto = null; goScanStep("items"); });
  $("sc-file").addEventListener("change", (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const img = new Image();
    img.onload = () => { scanPhoto = frameToDataUrl(img, img.naturalWidth, img.naturalHeight); URL.revokeObjectURL(img.src); goScanStep("items"); };
    img.src = URL.createObjectURL(f);
  });
}

function renderScanItems() {
  const v = $("view");
  const sugg = fridgeSuggestions();
  v.innerHTML = `
    <button class="back" id="sc-back">${ICON.back}<span>Retake</span></button>
    ${pageHead("What's in your fridge?", fridge.length ? plural(fridge.length, "ingredient") : "Add what you can see.")}
    <div class="notice">
      ${scanPhoto ? `<img class="notice-photo" src="${scanPhoto}" alt="Your fridge photo" />` : `<span class="notice-ico">${ICON.sparkle}</span>`}
      <p><b>Automatic detection is coming soon.</b> For now, add what you see${scanPhoto ? " in your photo" : ""}. Your list is saved for next time.</p>
    </div>
    <form class="add-row" id="fr-form">
      <input class="input" id="fr-input" type="text" placeholder="Add an ingredient…" autocomplete="off" enterkeyhint="done" />
      <button class="btn primary icon" type="submit" aria-label="Add">${ICON.plus}</button>
    </form>
    ${fridge.length
      ? `<div class="chips">${fridge.map((f, i) => `<span class="ing-chip">${esc(f)}<button class="chip-x" data-rm="${i}" aria-label="Remove ${esc(f)}">${ICON.x}</button></span>`).join("")}</div>
         <button class="link small-link" id="fr-clear">Clear fridge</button>`
      : `<div class="group"><p class="muted-row">Nothing added yet.</p></div>`}
    ${sugg.length ? `
      <h2 class="section-label">From your recipes</h2>
      <div class="chips">${sugg.map((s) => `<button class="sugg-chip" data-add="${esc(s)}">${ICON.plus}${esc(s)}</button>`).join("")}</div>` : ""}
    <div class="sticky-cta">
      <button class="btn primary block" id="fr-done" ${fridge.length ? "" : "disabled"}>${ICON.sparkle}Done — find recipes</button>
    </div>`;

  $("sc-back").addEventListener("click", () => goScanStep("camera"));
  $("fr-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("fr-input");
    input.value.split(",").forEach(addFridgeItem);
    renderScanItems();
    $("fr-input").focus();
  });
  v.querySelectorAll("[data-rm]").forEach((b) => b.addEventListener("click", () => {
    fridge.splice(Number(b.dataset.rm), 1); saveFridge(); renderScanItems();
  }));
  v.querySelectorAll("[data-add]").forEach((b) => b.addEventListener("click", () => {
    addFridgeItem(b.dataset.add); renderScanItems();
  }));
  const clear = $("fr-clear");
  if (clear) clear.addEventListener("click", () => {
    if (confirm("Remove everything from your fridge list?")) { fridge = []; saveFridge(); renderScanItems(); }
  });
  $("fr-done").addEventListener("click", () => goScanStep("results"));
}

function matchRow({ r, missing }) {
  const status = missing.length
    ? `<span class="missing">Missing: ${missing.map(esc).join(", ")}</span>`
    : `<span class="tag ok">${ICON.check}You have everything</span>`;
  return `
    <button class="recipe" data-id="${r.id}">
      <span class="art thumb" style="${coverStyle(r.name)}">${initial(r.name)}</span>
      <span class="recipe-body">
        <span class="recipe-name">${esc(r.name)}</span>
        <span class="recipe-meta">${status}</span>
      </span>
      <span class="chev">${ICON.chevron}</span>
    </button>`;
}

function renderScanResults() {
  const v = $("view");
  const matches = matchRecipes();
  const ready = matches.filter((m) => !m.missing.length);
  const close = matches.filter((m) => m.missing.length > 0 && m.missing.length <= 2)
    .sort((a, b) => a.missing.length - b.missing.length);

  let body;
  if (!recipes.length) {
    body = emptyState(ICON.book, "No recipes yet", "Add some recipes to your cookbook and Foodo will match them to your fridge.");
  } else if (!ready.length && !close.length) {
    body = emptyState(ICON.fridge, "Nothing quite fits yet",
      "None of your recipes are within two ingredients. Try adding more of what's in your fridge.");
  } else {
    body = `
      ${ready.length ? `<h2 class="section-label">Ready to cook · ${ready.length}</h2><div class="list">${ready.map(matchRow).join("")}</div>` : ""}
      ${close.length ? `<h2 class="section-label">Almost there · ${close.length}</h2><div class="list">${close.map(matchRow).join("")}</div>` : ""}`;
  }

  v.innerHTML = `
    <button class="back" id="sc-back">${ICON.back}<span>Edit ingredients</span></button>
    ${pageHead("You could cook", `Based on ${plural(fridge.length, "ingredient")} in your fridge`)}
    ${body}
    <p class="footnote">Salt, pepper, oil and water are assumed. Community recipes will appear here once Discover launches.</p>`;

  $("sc-back").addEventListener("click", () => goScanStep("items"));
  bindOpen(v);
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden && camStream) stopCamera();
  else if (!document.hidden && currentTab === "scan" && scanStep === "camera" && $("sc-video")) renderScanCamera();
});

// ---- Shopping list ----
function loadShop() { try { return new Set(JSON.parse(localStorage.getItem(SHOP_KEY)) || []); } catch { return new Set(); } }
function saveShop() { localStorage.setItem(SHOP_KEY, JSON.stringify([...shoppingSet])); }

function renderShopping() {
  const v = $("view");
  const back = `<button class="back" id="s-back">${ICON.back}<span>${TAB_NAMES[returnTab] || "Back"}</span></button>`;
  if (!recipes.length) {
    v.innerHTML = back + pageHead("Shopping list") +
      emptyState(ICON.cart, "Nothing to shop for yet", "Add a few recipes first, then combine their ingredients here.");
  } else {
    const items = combined();
    const picked = recipes.filter((r) => shoppingSet.has(r.id)).length;
    v.innerHTML = `
      ${back}
      ${pageHead("Shopping list", items.length
        ? `${plural(items.length, "item")} from ${plural(picked, "recipe")}`
        : "Pick recipes to combine their ingredients.")}
      <h2 class="section-label">Recipes</h2>
      <div class="pick-grid">
        ${recipes.map((r) => `
          <button class="pick ${shoppingSet.has(r.id) ? "on" : ""}" data-pick="${r.id}">
            <span class="art thumb sm" style="${coverStyle(r.name)}">${initial(r.name)}</span>
            <span class="pick-name">${esc(r.name)}</span>
            <span class="check">${ICON.check}</span>
          </button>`).join("")}
      </div>
      <div class="section-head small">
        <h2>Ingredients</h2>
        ${items.length ? `<button class="link" id="s-clear">Clear all</button>` : ""}
      </div>
      ${items.length
        ? `<ul class="group checklist">${items.map((i) => {
            const key = i.toLowerCase();
            return `<li><button class="check-row ${gotItems.has(key) ? "done" : ""}" data-item="${esc(key)}"><span class="check">${ICON.check}</span><span class="check-text">${esc(i)}</span></button></li>`;
          }).join("")}</ul>`
        : `<div class="group"><p class="muted-row">Select recipes above to build your list.</p></div>`}
    `;
    v.querySelectorAll("[data-pick]").forEach((b) =>
      b.addEventListener("click", () => {
        const id = b.dataset.pick;
        shoppingSet.has(id) ? shoppingSet.delete(id) : shoppingSet.add(id);
        saveShop(); renderShopping();
      }));
    v.querySelectorAll("[data-item]").forEach((b) =>
      b.addEventListener("click", () => {
        const key = b.dataset.item;
        gotItems.has(key) ? gotItems.delete(key) : gotItems.add(key);
        saveGot();
        b.classList.toggle("done");
      }));
    const clear = $("s-clear");
    if (clear) clear.addEventListener("click", () => {
      shoppingSet.clear(); gotItems.clear(); saveShop(); saveGot(); renderShopping();
    });
  }
  $("s-back").addEventListener("click", () => { currentTab = returnTab; syncTabs(); render(); animateView(); });
}

function combined() {
  const seen = new Map();
  for (const id of shoppingSet) {
    const r = recipes.find((x) => x.id === id);
    if (!r) continue;
    for (const ing of r.ingredients) {
      const key = ing.toLowerCase();
      if (!seen.has(key)) seen.set(key, ing);
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

// ---- Theme engine ----
// Three full "styles", each with a default palette you can still customize.
const STYLES = {
  ios:   { name: "Clean",  accent: "#ff6b35", bg: "#f6f4f1", dark: false },
  bold:  { name: "Bold",   accent: "#ff2d78", bg: "#fff4ec", dark: false },
  sleek: { name: "Dark",   accent: "#ff8a5b", bg: "#0e0e12", dark: true  },
};

function loadTheme() {
  try { return JSON.parse(localStorage.getItem(THEME_KEY)) || { style: "ios", ...STYLES.ios }; }
  catch { return { style: "ios", ...STYLES.ios }; }
}
let theme = loadTheme();

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
}

function applyTheme() {
  const root = document.documentElement;
  const r = root.style;
  root.dataset.theme = theme.style || "ios";
  if (theme.dark) root.dataset.dark = ""; else delete root.dataset.dark;
  r.setProperty("--primary", theme.accent);
  r.setProperty("--primary-dark", mix(theme.accent, "#000000", 0.18));
  r.setProperty("--bg", theme.bg);

  if (theme.dark) {
    r.setProperty("--card", mix(theme.bg, "#ffffff", 0.06));
    r.setProperty("--text", "#f4f2f0");
    r.setProperty("--muted", "#9a96a0");
    r.setProperty("--border", mix(theme.bg, "#ffffff", 0.11));
  } else {
    r.setProperty("--card", "#ffffff");
    r.setProperty("--text", "#1c1714");
    r.setProperty("--muted", "#857a73");
    r.setProperty("--border", mix(theme.bg, "#000000", 0.07));
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = theme.bg;
  if (NATIVE && Capacitor.Plugins.SystemBars) {
    const lightIcons = theme.dark || theme.style === "bold";
    Capacitor.Plugins.SystemBars.setStyle({ style: lightIcons ? "DARK" : "LIGHT" }).catch(() => {});
  }
  localStorage.setItem(THEME_KEY, JSON.stringify(theme));
}

function setStyle(key) {
  const s = STYLES[key];
  theme = { style: key, accent: s.accent, bg: s.bg, dark: s.dark };
  applyTheme();
  renderThemeControls();
}

function renderThemeControls() {
  const wrap = document.getElementById("theme-swatches");
  if (!wrap) return;
  wrap.innerHTML = Object.entries(STYLES).map(([key, s]) => {
    const on = theme.style === key ? "active" : "";
    return '<button class="style-card ' + on + '" data-style="' + key + '">' +
      '<span class="style-prev style-' + key + '"></span>' +
      '<span class="style-name">' + s.name + '</span></button>';
  }).join("");

  wrap.querySelectorAll(".style-card").forEach((b) =>
    b.addEventListener("click", () => setStyle(b.dataset.style)));

  const acc = document.getElementById("theme-accent");
  const bg = document.getElementById("theme-bg");
  const dk = document.getElementById("theme-dark");
  if (!acc) return;
  acc.value = theme.accent; bg.value = theme.bg; dk.checked = theme.dark;
  acc.oninput = () => { theme.accent = acc.value; applyTheme(); };
  bg.oninput = () => { theme.bg = bg.value; applyTheme(); };
  dk.onchange = () => { theme.dark = dk.checked; applyTheme(); };
}

// ---- Tabs / misc ----
function syncTabs() {
  document.querySelectorAll(".tab").forEach((t) =>
    t.classList.toggle("active", t.dataset.tab === currentTab));
}
document.querySelectorAll(".tab").forEach((t) =>
  t.addEventListener("click", () => {
    if (t.dataset.tab === "scan" && currentTab !== "scan") scanStep = "camera";
    currentTab = t.dataset.tab; syncTabs(); render(); animateView();
  }));

$("add-btn").addEventListener("click", () => openEditor(null));
$("cancel-btn").addEventListener("click", closeEditor);
$("save-btn").addEventListener("click", saveEditor);
$("sheet").addEventListener("click", (e) => { if (e.target.id === "sheet") closeEditor(); });
$("post-cancel").addEventListener("click", closeComposer);
$("post-save").addEventListener("click", savePost);
$("post-sheet").addEventListener("click", (e) => { if (e.target.id === "post-sheet") closeComposer(); });

const header = $("app-header");
window.addEventListener("scroll", () => header.classList.toggle("scrolled", window.scrollY > 4), { passive: true });

applyTheme();
syncTabs();
render();

// Service workers need https; skipping on http keeps local dev free of stale caches.
// The native app already ships its files, so a cache there would only serve stale versions after updates.
if (!NATIVE && "serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js");
}
// Ask the browser not to evict saved recipes under storage pressure.
if (!NATIVE && navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

// Android hardware/gesture back: close the sheet, then step back through screens, then exit.
if (NATIVE && Capacitor.Plugins.App) {
  Capacitor.Plugins.App.addListener("backButton", () => {
    const back = $("d-back") || $("s-back") || $("sc-back");
    if (!$("post-sheet").classList.contains("hidden")) closeComposer();
    else if (!$("sheet").classList.contains("hidden")) closeEditor();
    else if (back) back.click();
    else if (currentTab !== "recipes") { currentTab = "recipes"; syncTabs(); render(); animateView(); }
    else Capacitor.Plugins.App.exitApp();
  });
}
