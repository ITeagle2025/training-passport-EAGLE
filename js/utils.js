/* TrainPass v2.3 — utils.js */

function requireAuth(expectedRole) {
  const token = sessionStorage.getItem(CONFIG.TOKEN_KEY);
  const user  = JSON.parse(sessionStorage.getItem(CONFIG.USER_KEY) || "null");
  if (!token || !user) { window.location.href = "../index.html"; return null; }
  if (expectedRole && user.role !== expectedRole) {
    const dest = CONFIG.ROLE_PAGES[user.role];
    if (dest) window.location.href = "../" + dest;
    else window.location.href = "../index.html";
    return null;
  }
  return user;
}

function showToast(msg, type="info") {
  const c = document.getElementById("toastContainer");
  if (!c) return;
  const icons = {
    success:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    info:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
  };
  const t = document.createElement("div");
  t.className = `toast toast-${type}`;
  t.innerHTML = `${icons[type]||icons.info}<span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(()=>{ t.style.animation="fadeOut .25s ease forwards"; setTimeout(()=>t.remove(),280); },3500);
}

function showAlert(el, msg, type="error") {
  if (!el) return;
  el.className = `alert alert-${type}`;
  el.textContent = msg;
  el.classList.remove("hidden");
}
function hideAlert(el) { if (el) { el.classList.add("hidden"); el.textContent=""; } }

/* Result / type / location / status badges */
function resultBadge(v) {
  const m = { Passed:["Passed","badge-passed"], Failed:["Failed","badge-failed"], Pending:["Pending","badge-pending"],
               TRUE:["Passed","badge-passed"], FALSE:["Failed","badge-failed"] };
  const [l,c] = m[v] || ["—","badge-pending"];
  return `<span class="badge ${c}">${l}</span>`;
}
function typeBadge(v) {
  const m = { Training:"badge-training", Seminar:"badge-seminar", Webinar:"badge-webinar",
               Theoretical:"badge-theory", Practical:"badge-practical" };
  return `<span class="badge ${m[v]||"badge-training"}">${v||"—"}</span>`;
}
function locationBadge(v) {
  const m = { Field:"badge-field","Training Room":"badge-room", Online:"badge-online" };
  return `<span class="badge ${m[v]||"badge-pending"}">${v||"—"}</span>`;
}
function statusBadge(v) {
  const m = { Scheduled:"badge-pending", Completed:"badge-passed", Cancelled:"badge-failed" };
  return `<span class="badge ${m[v]||"badge-pending"}">${v||"—"}</span>`;
}

/* Date formatting */
function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(String(d).includes("T") ? d : d + "T00:00:00");
  if (isNaN(dt)) return String(d);
  return dt.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});
}

/* ✅ FIX: 24-hr HH:MM → 12-hr h:MM AM/PM */
function fmtTime12(t) {
  if (!t) return "—";
  const str = String(t).trim().slice(0,5); // "HH:MM"
  if (!str.includes(":")) return str;
  const [hStr, mStr] = str.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr || "00";
  if (isNaN(h)) return str;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

/* Legacy alias */
function fmtTime(t) { return fmtTime12(t); }

function initials(name) {
  if (!name) return "?";
  const p = String(name).trim().split(" ");
  return ((p[0]?.[0]||"")+(p[1]?.[0]||"")).toUpperCase();
}

function esc(s) {
  if (!s && s !== 0) return "";
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function initTabs() {
  const tabs = document.querySelectorAll(".nav-tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t=>{ t.classList.remove("active"); t.setAttribute("aria-selected","false"); });
      tab.classList.add("active"); tab.setAttribute("aria-selected","true");
      document.querySelectorAll(".panel").forEach(p=>p.classList.remove("active"));
      const panel = document.getElementById("panel-"+tab.dataset.panel);
      if (panel) panel.classList.add("active");
    });
  });
}

function initLogout() {
  const btn = document.getElementById("logoutBtn");
  if (btn) btn.addEventListener("click", ()=>API.logout());
}

function setNavUser(user) {
  const el = document.getElementById("navUsername");
  if (el && user) el.textContent = user.username;
}

function openModal(id)  { const m=document.getElementById(id); if(m){m.classList.remove("hidden");document.body.style.overflow="hidden";} }
function closeModal(id) { const m=document.getElementById(id); if(m){m.classList.add("hidden");document.body.style.overflow="";} }

document.addEventListener("click", e=>{
  if (e.target.classList.contains("modal-overlay")) {
    e.target.classList.add("hidden"); document.body.style.overflow="";
  }
});

function paginate(arr, page, size=CONFIG.PAGE_SIZE) { return arr.slice((page-1)*size, page*size); }

function renderPagination(containerId, total, current, size, onPage) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const pages = Math.ceil(total/size);
  if (pages<=1) { el.innerHTML=""; return; }
  let html="";
  for (let i=1;i<=pages;i++)
    html+=`<button class="page-btn${i===current?" active":""}" data-page="${i}">${i}</button>`;
  el.innerHTML=html;
  el.querySelectorAll(".page-btn").forEach(b=>b.addEventListener("click",()=>onPage(+b.dataset.page)));
}
