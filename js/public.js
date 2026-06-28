/* TrainPass v2.3.1 — public.js
   Fixes:
   1. Merged Search + Scan into single card (no tabs)
   2. Show "Searching…" progress label during lookup
   3. Camera scan fail → popup alert (not inline)
   4. After search: hide search area, show refresh button
   5. Header: ADPHC logo + EAGLE-ADPHC Training Passport
   6. Hint label: "Enter your Employee Number / ID"
*/
(function () {

  const token = sessionStorage.getItem(CONFIG.TOKEN_KEY);
  const saved  = JSON.parse(sessionStorage.getItem(CONFIG.USER_KEY)||"null");
  if (token && saved && CONFIG.ROLE_PAGES[saved.role]) {
    window.location.href = CONFIG.ROLE_PAGES[saved.role]; return;
  }

  let allRecords  = [];
  let currentEmp  = null;

  /* ── USB scanner zone ─────────────────── */
  const scanZone   = document.getElementById("publicScanZone");
  const barcodeIn  = document.getElementById("publicBarcodeInput");
  const scanStatus = document.getElementById("scanStatus");
  let   scanBuffer = "", scanTimer = null;

  if (scanZone && barcodeIn) {
    scanZone.addEventListener("click",()=>{barcodeIn.focus();scanZone.classList.add("scanning");});
    scanZone.addEventListener("blur",()=>scanZone.classList.remove("scanning"),true);
    barcodeIn.addEventListener("keydown",async e=>{
      if(e.key==="Enter"){
        e.preventDefault();
        const code=scanBuffer.trim();scanBuffer="";clearTimeout(scanTimer);
        if(!code) return;
        if(scanStatus) scanStatus.textContent="Looking up…";
        await doSearch(code, true /* fromScan */);
        if(scanStatus) scanStatus.textContent=currentEmp?"Found ✓ — scan another":"Not found";
        setTimeout(()=>{if(scanStatus) scanStatus.textContent="Click here, then scan";},3000);
      } else {
        scanBuffer+=(e.key.length===1)?e.key:"";
        clearTimeout(scanTimer);
        scanTimer=setTimeout(()=>{scanBuffer="";},300);
      }
    });
  }

  /* ── Camera button ─────────────────────── */
  const camBtn = document.getElementById("openPublicCameraBtn");
  if (camBtn) {
    camBtn.addEventListener("click",()=>{
      if(typeof Html5Qrcode==="undefined"){
        showPublicAlert("Camera scanner could not load. Please use the manual search or a USB scanner."); return;
      }
      if(typeof CameraScanner==="undefined"){
        showPublicAlert("Camera module not loaded. Refresh the page and try again."); return;
      }
      CameraScanner.open(async(code)=>{
        CameraScanner.close();
        await doSearch(code.trim(), true /* fromScan */);
      });
    });
  }

  /* ── Manual search ─────────────────────── */
  const empInput  = document.getElementById("empNoInput");
  const searchBtn = document.getElementById("searchBtn");
  const alertEl   = document.getElementById("publicAlert");
  const progress  = document.getElementById("searchProgress");

  searchBtn.addEventListener("click",()=>doSearch(empInput.value.trim(), false));
  empInput.addEventListener("keydown",e=>{ if(e.key==="Enter") doSearch(empInput.value.trim(), false); });

  /* ── Refresh button ─────────────────────── */
  document.getElementById("refreshBtn").addEventListener("click", resetSearch);

  function resetSearch() {
    // Show search area, hide refresh row and results
    document.getElementById("searchArea").classList.remove("hidden");
    document.getElementById("refreshRow").classList.add("hidden");
    document.getElementById("resultsSection").classList.add("hidden");
    if(empInput) empInput.value="";
    hidePublicAlert();
    hideProgress();
    currentEmp=null; allRecords=[];
    document.getElementById("filterType").value="";
    document.getElementById("filterResult").value="";
  }

  /* ── Core search ────────────────────────── */
  async function doSearch(query, fromScan) {
    hidePublicAlert();
    if (!query) { showPublicAlert("Please enter your employee number."); return; }

    // Show progress
    showProgress();
    searchBtn.disabled=true;
    searchBtn.innerHTML=`<span>Searching…</span>`;

    try {
      const empRes = await API.publicSearch(query);
      if (!empRes.success) {
        hideProgress();
        if (fromScan) {
          // Popup alert for scan failures
          showScanFailedPopup(empRes.error || "No record found for scanned ID. Please check your employee number.");
        } else {
          showPublicAlert(empRes.error || "Employee not found. Please check your employee number.");
        }
        return;
      }
      currentEmp = empRes.data;

      const logRes = await API.publicGetTrainings(currentEmp.EmployeeNo);
      allRecords   = logRes.data || [];

      hideProgress();
      renderBanner(currentEmp);
      renderStats(allRecords);
      renderRecords();

      // Hide search area, show refresh row
      document.getElementById("searchArea").classList.add("hidden");
      document.getElementById("refreshRow").classList.remove("hidden");
      document.getElementById("currentEmpLabel").textContent = currentEmp.Name || query;

      document.getElementById("resultsSection").classList.remove("hidden");
      document.getElementById("filterType").value="";
      document.getElementById("filterResult").value="";
      document.getElementById("resultsSection").scrollIntoView({behavior:"smooth",block:"start"});

    } catch(e) {
      hideProgress();
      if (fromScan) {
        showScanFailedPopup("Connection error: " + e.message + ". Please try again.");
      } else {
        showPublicAlert("Connection error: "+e.message+". Please check your internet and try again.");
      }
    } finally {
      searchBtn.disabled=false;
      searchBtn.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="width:15px;height:15px"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Search`;
    }
  }

  function showProgress() {
    if (progress) progress.classList.remove("hidden");
  }
  function hideProgress() {
    if (progress) progress.classList.add("hidden");
  }

  function showPublicAlert(msg) {
    alertEl.textContent=msg;
    alertEl.classList.remove("hidden");
  }
  function hidePublicAlert() {
    alertEl.classList.add("hidden");
    alertEl.textContent="";
  }

  /* ── Scan failed popup ─────────────────── */
  function showScanFailedPopup(msg) {
    const overlay = document.getElementById("scanFailedOverlay");
    const msgEl   = document.getElementById("scanFailedMsg");
    if (!overlay) { showPublicAlert(msg); return; }
    if (msgEl) msgEl.textContent = msg;
    overlay.classList.remove("hidden");
  }
  function hideScanFailedPopup() {
    const overlay = document.getElementById("scanFailedOverlay");
    if (overlay) overlay.classList.add("hidden");
  }

  const scanFailedClose = document.getElementById("scanFailedClose");
  const scanFailedBg    = document.getElementById("scanFailedBg");
  if (scanFailedClose) scanFailedClose.addEventListener("click", hideScanFailedPopup);
  if (scanFailedBg)    scanFailedBg.addEventListener("click",    hideScanFailedPopup);

  /* ── Employee banner ───────────────────── */
  function renderBanner(emp) {
    document.getElementById("empBanner").innerHTML=`
      <div class="emp-banner-avatar">${initials(emp.Name)}</div>
      <div>
        <div class="emp-banner-name">${esc(emp.Name)}</div>
        <div class="emp-banner-meta">${[emp.JobTitle,emp.Department].filter(Boolean).map(esc).join(" · ")}</div>
        <div class="emp-banner-no">Employee No: ${esc(emp.EmployeeNo)}</div>
      </div>`;
    document.getElementById("recordsTitle").textContent=`Training Records — ${emp.Name}`;
  }

  /* ── Stats ─────────────────────────────── */
  function renderStats(records) {
    const now=new Date(), past30=new Date(now);
    past30.setDate(now.getDate()-30);

    const passed  = records.filter(r=>String(r.Passed)==="TRUE"||String(r.Passed)==="Passed").length;
    const failed  = records.filter(r=>String(r.Passed)==="FALSE"||String(r.Passed)==="Failed").length;
    const pending = records.filter(r=>String(r.Passed)==="Pending").length;
    const recent  = records.filter(r=>{
      if(!r.AttendanceDate) return false;
      const d=new Date(String(r.AttendanceDate).includes("T")?r.AttendanceDate:r.AttendanceDate+"T00:00:00");
      return !isNaN(d)&&d>=past30;
    }).length;

    document.getElementById("publicStats").innerHTML=`
      <div class="pub-stat"><div class="pub-stat-num">${records.length}</div><div class="pub-stat-label">Total Trainings</div></div>
      <div class="pub-stat"><div class="pub-stat-num" style="color:var(--success)">${passed}</div><div class="pub-stat-label">Passed</div></div>
      <div class="pub-stat"><div class="pub-stat-num" style="color:var(--danger)">${failed}</div><div class="pub-stat-label">Failed</div></div>
      <div class="pub-stat"><div class="pub-stat-num" style="color:var(--warning)">${pending}</div><div class="pub-stat-label">Pending</div></div>
      <div class="pub-stat"><div class="pub-stat-num">${recent}</div><div class="pub-stat-label">Last 30 Days</div></div>`;
    document.getElementById("publicStats").className = "public-stats";
  }

  /* ── Records ───────────────────────────── */
  function renderRecords() {
    const typeF   = document.getElementById("filterType").value;
    const resultF = document.getElementById("filterResult").value;

    const filtered = allRecords.filter(r=>{
      const matchType = !typeF||r.SessionType===typeF;
      let matchResult = true;
      if (resultF) {
        const p=String(r.Passed);
        if(resultF==="Passed")  matchResult=p==="TRUE"||p==="Passed";
        else if(resultF==="Failed") matchResult=p==="FALSE"||p==="Failed";
        else matchResult=p===resultF;
      }
      return matchType&&matchResult;
    });

    const list  = document.getElementById("trainingList");
    const noRec = document.getElementById("noRecords");

    if (!filtered.length) { list.innerHTML=""; noRec.classList.remove("hidden"); return; }
    noRec.classList.add("hidden");

    list.innerHTML=filtered.map(r=>{
      const hasScore = r.Score!==null&&r.Score!==undefined&&r.Score!=="";
      const hasCert  = r.CertificateNo&&String(r.CertificateNo).trim()!=="";
      const trainerLine = r.TrainerName
        ? `<span style="display:flex;align-items:center;gap:3px">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:13px;height:13px"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
             ${esc(r.TrainerName)}${r.TrainerDept?" · "+esc(r.TrainerDept):""}
           </span>` : "";
      return `
        <div class="training-card">
          <div>
            <div class="training-title">${esc(r.Title)}</div>
            <div class="training-meta">
              <span style="display:flex;align-items:center;gap:3px">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:13px;height:13px"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                ${fmtDate(r.AttendanceDate)}
              </span>
              ${r.SessionType?typeBadge(r.SessionType):""}
              ${r.Location?locationBadge(r.Location):""}
              ${trainerLine}
            </div>
          </div>
          <div class="training-right">
            ${resultBadge(r.Passed)}
            ${hasScore?`<span class="training-score">Score: <strong>${esc(String(r.Score))}/100</strong></span>`:""}
            ${hasCert?`<span class="training-cert">🏅 ${esc(String(r.CertificateNo))}</span>`:""}
          </div>
        </div>`;
    }).join("");
  }

  document.getElementById("filterType").addEventListener("change",renderRecords);
  document.getElementById("filterResult").addEventListener("change",renderRecords);

  /* ── Admin login modal ─────────────────── */
  document.getElementById("adminAccessBtn").addEventListener("click",()=>openModal("loginModal"));
  document.getElementById("closeLoginModal").addEventListener("click",()=>closeModal("loginModal"));

  const eyeToggle=document.getElementById("eyeToggle");
  const pwInput  =document.getElementById("password");
  eyeToggle.addEventListener("click",()=>{ pwInput.type=pwInput.type==="text"?"password":"text"; });

  document.getElementById("loginForm").addEventListener("submit",async e=>{
    e.preventDefault();
    const la=document.getElementById("loginAlert");hideAlert(la);
    const username=document.getElementById("username").value.trim();
    const password=pwInput.value;
    if(!username||!password){showAlert(la,"Enter username and password.");return;}
    const btn=document.getElementById("loginBtn");
    const btnText=btn.querySelector(".btn-text");
    const spinner=btn.querySelector(".btn-spinner");
    btnText.classList.add("hidden");spinner.classList.remove("hidden");btn.disabled=true;
    try{
      const res=await API.login(username,password);
      if(res.success){
        sessionStorage.setItem(CONFIG.TOKEN_KEY,res.token);
        sessionStorage.setItem(CONFIG.USER_KEY,JSON.stringify(res.user));
        const dest=CONFIG.ROLE_PAGES[res.user.role];
        if(dest) window.location.href=dest;
        else showAlert(la,"Role not recognised: "+res.user.role);
      } else showAlert(la,res.error||"Incorrect username or password.");
    }catch(e){showAlert(la,"Connection error: "+e.message);}
    finally{btnText.classList.remove("hidden");spinner.classList.add("hidden");btn.disabled=false;}
  });

})();
