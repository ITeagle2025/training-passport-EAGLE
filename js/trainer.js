/* TrainPass v2.3.1 — trainer.js
   Fixes:
   1. Session detail: time = h:MM AM/PM, shows Max Capacity
   2. After Mark Complete inside attendance → auto-navigate back to Sessions
   3. Create session: duplicate Title blocked
   4. Active Session area = read-only title (no dropdown); set by goToAttendance
   5. Filter Status defaults to "Scheduled"
*/
(function () {
  const user = requireAuth("Trainer");
  if (!user) return;
  setNavUser(user); initTabs(); initLogout();

  let allSessions     = [];
  let allTopics       = [];
  let allLogs         = [];
  let pendingEmp      = null;
  let pendingEmpNo    = null;
  let sessionCheckins = [];
  let activeSessionID = null;
  let activeSessionTitle = null;
  let lastSessionData = null;

  loadSessions();
  loadTopics();
  loadLogs();

  // ════════════════════════════════════════
  // SESSION FILTERS  (default = Scheduled)
  // ════════════════════════════════════════
  document.getElementById("applyFilters").addEventListener("click", loadSessions);
  document.getElementById("filterDateFrom").addEventListener("change", loadSessions);
  document.getElementById("filterDateTo").addEventListener("change", loadSessions);
  document.getElementById("filterStatus").addEventListener("change", loadSessions);

  async function loadSessions() {
    const grid = document.getElementById("sessionsGrid");
    grid.innerHTML = `<div class="skeleton-grid"><div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div></div>`;
    try {
      const res = await API.getSessions({
        sessionType:      document.getElementById("filterType").value,
        location:         document.getElementById("filterLocation").value,
        status:           document.getElementById("filterStatus").value || "Scheduled",
        dateFrom:         document.getElementById("filterDateFrom").value,
        dateTo:           document.getElementById("filterDateTo").value,
        includeCompleted: true
      });
      allSessions = (res.data || []).sort((a,b) => b.ScheduledDate > a.ScheduledDate ? 1 : -1);
      renderSessions(allSessions);
    } catch(e) {
      grid.innerHTML = `<p style="color:var(--danger);padding:16px">${e.message}</p>`;
    }
  }

  // ════════════════════════════════════════
  // RENDER SESSIONS
  // ════════════════════════════════════════
  function renderSessions(sessions) {
    const grid = document.getElementById("sessionsGrid");
    if (!sessions.length) {
      grid.innerHTML = `<div style="grid-column:1/-1;padding:32px;text-align:center;color:var(--text-muted)">No sessions found. Adjust filters or create a new session.</div>`;
      return;
    }

    grid.innerHTML = sessions.map(s => {
      const isCompleted = s.Status === "Completed";
      const isCancelled = s.Status === "Cancelled";

      const actionBtns = isCancelled
        ? `<span style="font-size:12px;color:var(--text-muted)">Cancelled</span>`
        : isCompleted
        ? `<button class="btn btn-ghost btn-sm" onclick="openSessionDetail('${esc(s.SessionID)}')">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:13px;height:13px"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
             View Participants
           </button>`
        : `<button class="btn btn-secondary btn-sm" onclick="goToAttendance('${esc(s.SessionID)}','${esc(s.Title)}')">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:13px;height:13px"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
             Log Attendance
           </button>
           <button class="btn btn-ghost btn-sm" onclick="markComplete('${esc(s.SessionID)}')">Mark Complete</button>`;

      // FIX #1: show time as AM/PM + show MaxCapacity
      const cap = s.MaxCapacity ? `<p class="session-detail">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        Max Capacity: ${esc(String(s.MaxCapacity))}
      </p>` : "";

      return `
        <div class="session-card">
          <div class="session-card-head">
            <span class="session-title">${esc(s.Title)}</span>
            ${statusBadge(s.Status)}
          </div>
          <div class="session-meta">
            ${typeBadge(s.SessionType)}
            ${locationBadge(s.Location)}
          </div>
          <p class="session-detail">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            ${fmtDate(s.ScheduledDate)}
          </p>
          <p class="session-detail">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${fmtTime12(s.ScheduledTime)} · ${s.DurationMinutes||60} mins
          </p>
          <p class="session-detail">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            ${esc(s.TrainerName || user.username)}
          </p>
          ${cap}
          <div class="session-actions">${actionBtns}</div>
        </div>`;
    }).join("");
  }

  // ════════════════════════════════════════
  // GO TO ATTENDANCE  (FIX #4: title only, no dropdown)
  // ════════════════════════════════════════
  window.goToAttendance = function(sessionID, sessionTitle) {
    activeSessionID    = sessionID;
    activeSessionTitle = sessionTitle || sessionID;

    // Switch panel
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    document.getElementById("panel-attendance").classList.add("active");
    document.querySelectorAll(".nav-tab").forEach(t => {
      t.classList.toggle("active", t.dataset.panel === "attendance");
      t.setAttribute("aria-selected", t.dataset.panel === "attendance" ? "true" : "false");
    });

    // FIX #4: show title, set hidden input
    document.getElementById("attendSessionPick").value = sessionID;
    document.getElementById("activeSessionInfo").innerHTML =
      `<span>${esc(activeSessionTitle)}</span>
       <span style="margin-left:10px;font-size:12px;color:var(--text-muted);font-weight:400">${esc(sessionID)}</span>`;

    resetAttendance();
    sessionCheckins = [];
    renderCheckinList();
    window.scrollTo({top:0, behavior:"smooth"});
  };

  // Back to sessions button (FIX #2 helper)
  document.getElementById("backToSessionsBtn").addEventListener("click", () => {
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    document.getElementById("panel-sessions").classList.add("active");
    document.querySelectorAll(".nav-tab").forEach(t => {
      const isSessions = t.dataset.panel === "sessions";
      t.classList.toggle("active", isSessions);
      t.setAttribute("aria-selected", isSessions ? "true" : "false");
    });
  });

  window.markComplete = async function(sessionID) {
    if (!confirm("Mark this session as Completed? You can still view participants after.")) return;
    try {
      const res = await API.updateSession({ SessionID: sessionID, Status: "Completed" });
      if (res.success) { showToast("Session marked as completed.", "success"); loadSessions(); }
      else showToast(res.error || "Update failed.", "error");
    } catch(e) { showToast(e.message, "error"); }
  };

  // ════════════════════════════════════════
  // PARTICIPANTS MODAL  (FIX #1: time format, capacity)
  // ════════════════════════════════════════
  window.openSessionDetail = async function(sessionID) {
    lastSessionData = null;
    document.getElementById("saveReportBtn").style.display = "none";
    document.getElementById("participantsModalBody").innerHTML = `<p style="color:var(--text-muted);padding:24px;text-align:center">Loading…</p>`;
    openModal("participantsModal");
    try {
      const res = await API.getSessionDetail({ sessionID });
      if (!res.success) { document.getElementById("participantsModalBody").innerHTML=`<p style="color:var(--danger);padding:16px">${res.error}</p>`; return; }
      const d = res.data;
      lastSessionData = d;
      document.getElementById("saveReportBtn").style.display = "inline-flex";
      document.getElementById("participantsModalTitle").textContent = d.Title || "Session Participants";

      const participants = (d.Participants||[]).slice().sort((a,b)=>{
        const o={TRUE:0,FALSE:1,Pending:2};
        return (o[a.Passed]??2)-(o[b.Passed]??2);
      });
      const passed  = participants.filter(p=>p.Passed==="TRUE").length;
      const failed  = participants.filter(p=>p.Passed==="FALSE").length;
      const pending = participants.filter(p=>p.Passed==="Pending").length;
      const total   = participants.length;
      const rate    = total>0?Math.round((passed/total)*100):0;

      // FIX #1: fmtTime12 for the time, show MaxCapacity
      const capLine = d.MaxCapacity
        ? `<span><strong>Max Capacity:</strong> ${esc(String(d.MaxCapacity))}</span>` : "";

      document.getElementById("participantsModalBody").innerHTML = `
        <div class="session-detail-header">
          <div class="sdh-row">${typeBadge(d.SessionType)} ${locationBadge(d.Location)} ${statusBadge(d.Status)}</div>
          <div class="sdh-meta">
            <span><strong>Date:</strong> ${fmtDate(d.ScheduledDate)}</span>
            <span><strong>Time:</strong> ${fmtTime12(d.ScheduledTime)}</span>
            <span><strong>Topic:</strong> ${esc(d.TopicTitle||"—")}</span>
            <span><strong>Trainer:</strong> ${esc(d.TrainerName||user.username)}</span>
            <span><strong>Duration:</strong> ${d.DurationMinutes||60} mins</span>
            <span><strong>Location:</strong> ${esc(d.Location||"—")}</span>
            ${capLine}
          </div>
          <div class="sdh-stats">
            <div class="sdh-stat"><span class="sdh-num">${total}</span><span class="sdh-label">Total</span></div>
            <div class="sdh-stat" style="color:var(--success)"><span class="sdh-num">${passed}</span><span class="sdh-label">Passed</span></div>
            <div class="sdh-stat" style="color:var(--danger)"><span class="sdh-num">${failed}</span><span class="sdh-label">Failed</span></div>
            <div class="sdh-stat" style="color:var(--warning)"><span class="sdh-num">${pending}</span><span class="sdh-label">Pending</span></div>
            <div class="sdh-stat" style="color:var(--accent)"><span class="sdh-num">${rate}%</span><span class="sdh-label">Pass Rate</span></div>
          </div>
        </div>
        ${participants.length===0 ? `<p class="empty-hint">No participants recorded for this session.</p>` : `
        <div class="table-wrap mt-3">
          <table class="data-table">
            <thead><tr><th>No.</th><th>Emp No</th><th>Name</th><th>Date</th><th>Score</th><th>Result</th></tr></thead>
            <tbody>
              ${participants.map((p,i)=>`<tr>
                <td style="text-align:center">${i+1}</td>
                <td><code style="font-size:11px">${esc(p.EmployeeNo)}</code></td>
                <td><strong>${esc(p.Name)}</strong></td>
                <td style="white-space:nowrap">${fmtDate(p.Date)}</td>
                <td style="text-align:center">${p.Score!==null&&p.Score!==undefined&&p.Score!==""?`<strong>${esc(String(p.Score))}</strong>/100`:"—"}</td>
                <td>${resultBadge(p.Passed)}</td>
              </tr>`).join("")}
            </tbody>
          </table>
        </div>`}`;
    } catch(e) {
      document.getElementById("participantsModalBody").innerHTML=`<p style="color:var(--danger);padding:16px">${e.message}</p>`;
    }
  };

  document.getElementById("closeParticipantsModal").addEventListener("click", () => {
    closeModal("participantsModal");
    lastSessionData = null;
    document.getElementById("saveReportBtn").style.display = "none";
  });

  document.getElementById("saveReportBtn").addEventListener("click", () => {
    if (!lastSessionData) return;
    closeModal("participantsModal");
    if (typeof PDFReport !== "undefined") PDFReport.openReport(lastSessionData);
    else showToast("PDF module not loaded. Check your files.", "error");
  });

  // ════════════════════════════════════════
  // CREATE SESSION  (FIX #3: duplicate title check)
  // ════════════════════════════════════════
  document.getElementById("openCreateSession").addEventListener("click", () => {
    populateTopicsDropdown();
    openModal("createSessionModal");
  });
  document.getElementById("closeModal").addEventListener("click",  () => closeModal("createSessionModal"));
  document.getElementById("cancelModal").addEventListener("click", () => closeModal("createSessionModal"));

  function populateTopicsDropdown() {
    const sel = document.getElementById("sTopicID");
    sel.innerHTML = `<option value="">— no topic —</option>` +
      allTopics.map(t=>`<option value="${esc(t.TopicID)}">${esc(t.Title)} (${esc(t.Category)})</option>`).join("");
  }

  document.getElementById("createSessionForm").addEventListener("submit", async e => {
    e.preventDefault();
    const alertEl = document.getElementById("sessionFormAlert"); hideAlert(alertEl);
    const topicID  = document.getElementById("sTopicID").value;
    const topicObj = allTopics.find(t=>t.TopicID===topicID);
    const title    = document.getElementById("sTitle").value.trim()||(topicObj?topicObj.Title:"");
    if (!title) { showAlert(alertEl,"Session title is required."); return; }

    // FIX #3: duplicate title check (client-side fast check)
    const dup = allSessions.find(s => s.Title.trim().toLowerCase() === title.toLowerCase());
    if (dup) {
      showAlert(alertEl, `A session titled "${esc(title)}" already exists (${esc(dup.Status)}). Please use a unique title.`);
      return;
    }

    const payload = {
      Title: title, TopicID: topicID,
      SessionType:     document.getElementById("sType").value,
      Location:        document.getElementById("sLocation").value,
      ScheduledDate:   document.getElementById("sDate").value,
      ScheduledTime:   document.getElementById("sTime").value,
      DurationMinutes: document.getElementById("sDuration").value,
      MaxCapacity:     document.getElementById("sCapacity").value,
      Description:     document.getElementById("sDesc").value.trim()
    };
    if (!payload.ScheduledDate||!payload.ScheduledTime) { showAlert(alertEl,"Date and time are required."); return; }
    try {
      const res = await API.createSession(payload);
      if (res.success) {
        showToast("Session created.", "success");
        closeModal("createSessionModal");
        document.getElementById("createSessionForm").reset();
        await loadSessions();
      } else showAlert(alertEl, res.error||"Failed. The title may already exist on the server.");
    } catch(e) { showAlert(alertEl, e.message); }
  });

  // ════════════════════════════════════════
  // ATTENDANCE
  // ════════════════════════════════════════
  const scanZone  = document.getElementById("scanZone");
  const barcodeIn = document.getElementById("barcodeInput");
  let scanBuf="", scanTimer=null;

  scanZone.addEventListener("click",()=>{barcodeIn.focus();scanZone.classList.add("scanning");});
  scanZone.addEventListener("blur",()=>scanZone.classList.remove("scanning"),true);

  barcodeIn.addEventListener("keydown",async e=>{
    if(e.key==="Enter"){
      e.preventDefault();
      const code=scanBuf.trim();scanBuf="";clearTimeout(scanTimer);
      if(code) await resolveEmployee(code,"Scanner");
    } else {
      scanBuf+=(e.key.length===1)?e.key:"";
      clearTimeout(scanTimer);
      scanTimer=setTimeout(()=>{scanBuf="";},300);
    }
  });

  document.getElementById("manualLookupBtn").addEventListener("click",async()=>{
    const empNo=document.getElementById("manualEmpNo").value.trim();
    if(!empNo){showToast("Enter an employee number first.","info");return;}
    await resolveEmployee(empNo,"Manual");
  });
  document.getElementById("manualEmpNo").addEventListener("keydown",async e=>{
    if(e.key==="Enter"){const v=e.target.value.trim();if(v) await resolveEmployee(v,"Manual");}
  });

  const camBtn = document.getElementById("openCameraBtn");
  if (camBtn) {
    camBtn.addEventListener("click",()=>{
      if(typeof CameraScanner==="undefined"){showToast("Camera scanner not loaded.","error");return;}
      CameraScanner.open(async(code)=>{
        CameraScanner.close();
        await resolveEmployee(code,"Scanner");
      });
    });
  }

  // FIX #2: Mark Complete inside attendance → go back to Sessions
  document.getElementById("attendMarkCompleteBtn").addEventListener("click",async()=>{
    const sessionID = document.getElementById("attendSessionPick").value;
    if(!sessionID){showToast("No active session selected.","info");return;}
    if(!confirm("Mark this session as Completed?")) return;
    try{
      const res=await API.updateSession({SessionID:sessionID,Status:"Completed"});
      if(res.success){
        showToast("Session marked as completed.","success");
        activeSessionID=null; activeSessionTitle=null;
        document.getElementById("attendSessionPick").value="";
        document.getElementById("activeSessionInfo").innerHTML=`<span style="color:var(--text-muted)">No session selected</span>`;
        resetAttendance(); sessionCheckins=[]; renderCheckinList();
        await loadSessions();
        // FIX #2: auto-navigate back to Sessions
        document.querySelectorAll(".panel").forEach(p=>p.classList.remove("active"));
        document.getElementById("panel-sessions").classList.add("active");
        document.querySelectorAll(".nav-tab").forEach(t=>{
          const isSessions=t.dataset.panel==="sessions";
          t.classList.toggle("active",isSessions);
          t.setAttribute("aria-selected",isSessions?"true":"false");
        });
      } else showToast(res.error||"Failed.","error");
    }catch(e){showToast(e.message,"error");}
  });

  async function resolveEmployee(empNo,method) {
    const statusEl=document.getElementById("scannerStatus");
    statusEl.textContent="Looking up…";
    hideAllAttendancePanels();
    try {
      const res=await API.lookupEmployee({employeeNo:empNo});
      if(res.success){statusEl.textContent="Found ✓";await proceedToCheckin(res.data,method);}
      else{statusEl.textContent="Not found";showNotFoundPanel(empNo,method);}
    }catch(e){showToast(e.message,"error");statusEl.textContent="Error";}
    setTimeout(()=>{statusEl.textContent="Ready";},2500);
  }

  function showNotFoundPanel(empNo,method) {
    pendingEmpNo={empNo,method};
    document.getElementById("notFoundEmpNo").textContent=empNo;
    ["qaFirstName","qaLastName","qaDept","qaJobTitle"].forEach(id=>document.getElementById(id).value="");
    hideAlert(document.getElementById("quickAddAlert"));
    document.getElementById("notFoundCard").classList.remove("hidden");
    document.getElementById("notFoundCard").scrollIntoView({behavior:"smooth",block:"nearest"});
  }

  document.getElementById("quickAddBtn").addEventListener("click",async()=>{
    const alertEl=document.getElementById("quickAddAlert");hideAlert(alertEl);
    const firstName=document.getElementById("qaFirstName").value.trim();
    const lastName =document.getElementById("qaLastName").value.trim();
    if(!firstName||!lastName){showAlert(alertEl,"First name and last name are required.");return;}
    const btn=document.getElementById("quickAddBtn");
    btn.disabled=true;btn.textContent="Adding…";
    try{
      const res=await API.quickAddEmployee({EmployeeNo:pendingEmpNo.empNo,FirstName:firstName,LastName:lastName,Department:document.getElementById("qaDept").value.trim(),JobTitle:document.getElementById("qaJobTitle").value.trim()});
      if(res.success){
        const method=pendingEmpNo.method;
        document.getElementById("notFoundCard").classList.add("hidden");
        if(res.isNew) showToast(`${firstName} ${lastName} added to employee list.`,"success");
        await proceedToCheckin(res.data,method,res.isNew);
      } else showAlert(alertEl,res.error||"Failed.");
    }catch(e){showAlert(alertEl,e.message);}
    finally{btn.disabled=false;btn.innerHTML="Add &amp; Continue to Check-In";}
  });

  document.getElementById("cancelNotFound").addEventListener("click",()=>{
    document.getElementById("notFoundCard").classList.add("hidden");
    pendingEmpNo=null;document.getElementById("manualEmpNo").value="";
  });

  async function proceedToCheckin(empData,method,isNew=false) {
    const sessionID=document.getElementById("attendSessionPick").value;
    let isDuplicate=false,dupDetail="";
    if(sessionID){
      try{
        const dupRes=await API.checkDuplicate({employeeNo:String(empData.EmployeeNo),sessionID});
        if(dupRes.success&&dupRes.isDuplicate){
          isDuplicate=true;
          const r=dupRes.existingLog.Passed==="TRUE"?"Passed":dupRes.existingLog.Passed==="FALSE"?"Failed":"Pending";
          dupDetail=` — previously logged on ${fmtDate(dupRes.existingLog.AttendanceDate)}, result: ${r}`;
        }
      }catch(e){}
    }
    pendingEmp={...empData,method,isNew};
    const name=((empData.FirstName||"")+" "+(empData.LastName||"")).trim()||empData.EmployeeNo;
    document.getElementById("empFoundRow").innerHTML=`
      <div class="emp-avatar">${initials(name)}</div>
      <div>
        <div class="emp-found-name">${esc(name)}</div>
        <div class="emp-found-id">${esc(empData.EmployeeNo)}${empData.Department?" · "+esc(empData.Department):""}</div>
      </div>`;
    const newBadge=document.getElementById("checkinNewBadge");
    isNew?newBadge.classList.remove("hidden"):newBadge.classList.add("hidden");
    const dupWarn=document.getElementById("duplicateWarning");
    const dupDet =document.getElementById("duplicateDetail");
    if(isDuplicate){
      dupDet.textContent=dupDetail;dupWarn.classList.remove("hidden");
      document.getElementById("confirmCheckinBtn").textContent="Check In Anyway";
      document.getElementById("confirmCheckinBtn").className="btn btn-danger";
    } else {
      dupWarn.classList.add("hidden");
      document.getElementById("confirmCheckinBtn").textContent="Confirm Check-In";
      document.getElementById("confirmCheckinBtn").className="btn btn-primary";
    }
    document.getElementById("checkinPassed").value="Passed";
    document.getElementById("checkinScore").value="";
    hideAlert(document.getElementById("checkinAlert"));
    document.getElementById("checkinConfirmCard").classList.remove("hidden");
    document.getElementById("checkinConfirmCard").scrollIntoView({behavior:"smooth",block:"nearest"});
  }

  document.getElementById("confirmCheckinBtn").addEventListener("click",async()=>{
    const alertEl=document.getElementById("checkinAlert");hideAlert(alertEl);
    const sessionID=document.getElementById("attendSessionPick").value;
    if(!sessionID){showAlert(alertEl,"No active session. Go back and click Log Attendance on a session card.","warn");return;}
    if(!pendingEmp){showAlert(alertEl,"No employee selected.","warn");return;}
    try{
      const res=await API.logAttendance({
        SessionID:sessionID,EmployeeNo:pendingEmp.EmployeeNo,
        CheckInMethod:pendingEmp.method||"Manual",
        Score:document.getElementById("checkinScore").value||"",
        Passed:document.getElementById("checkinPassed").value
      });
      if(res.success){
        const name=res.EmployeeName||pendingEmp.EmployeeNo;
        showToast(`${name} checked in ✓`,"success");
        sessionCheckins.unshift({name,empNo:pendingEmp.EmployeeNo,method:pendingEmp.method,isNew:pendingEmp.isNew,passed:document.getElementById("checkinPassed").value,time:new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})});
        renderCheckinList();resetAttendance();await loadLogs();
      } else showAlert(alertEl,res.error||"Check-in failed.");
    }catch(e){showAlert(alertEl,e.message);}
  });

  document.getElementById("cancelCheckinBtn").addEventListener("click",resetAttendance);

  function hideAllAttendancePanels(){
    document.getElementById("notFoundCard").classList.add("hidden");
    document.getElementById("checkinConfirmCard").classList.add("hidden");
  }
  function resetAttendance(){
    pendingEmp=null;pendingEmpNo=null;
    hideAllAttendancePanels();
    document.getElementById("manualEmpNo").value="";
    document.getElementById("checkinScore").value="";
    document.getElementById("checkinPassed").value="Passed";
    ["qaFirstName","qaLastName","qaDept","qaJobTitle"].forEach(id=>document.getElementById(id).value="");
    hideAlert(document.getElementById("checkinAlert"));
    hideAlert(document.getElementById("quickAddAlert"));
  }

  function renderCheckinList(){
    const list=document.getElementById("checkinList");
    document.getElementById("checkinCount").textContent=sessionCheckins.length;
    if(!sessionCheckins.length){list.innerHTML=`<p class="empty-hint">No check-ins yet for this session.</p>`;return;}
    const order={Passed:0,Failed:1,Pending:2};
    const sorted=[...sessionCheckins].sort((a,b)=>(order[a.passed]??2)-(order[b.passed]??2));
    list.innerHTML=sorted.map(c=>`
      <div class="checkin-item">
        <div class="emp-avatar" style="width:32px;height:32px;font-size:12px;background:${c.isNew?"var(--warning)":"var(--accent)"}">${initials(c.name)}</div>
        <div>
          <div style="font-weight:600;font-size:13.5px">${esc(c.name)}</div>
          <div style="font-size:11.5px;color:var(--text-muted)">${esc(c.empNo)} · ${esc(c.method)}${c.isNew?` <span class="badge badge-warning" style="font-size:10px">New</span>`:""}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px">
          ${resultBadge(c.passed)}
          <span class="checkin-time">${c.time}</span>
        </div>
      </div>`).join("");
  }

  // ════════════════════════════════════════
  // TOPICS
  // ════════════════════════════════════════
  async function loadTopics(){
    try{const res=await API.getTopics({});allTopics=res.data||[];renderTopics(allTopics);}
    catch(e){document.getElementById("topicsBody").innerHTML=`<tr><td colspan="4" class="table-empty" style="color:var(--danger)">${e.message}</td></tr>`;}
  }
  function renderTopics(topics){
    const tbody=document.getElementById("topicsBody");
    if(!topics.length){tbody.innerHTML=`<tr><td colspan="4" class="table-empty">No topics yet.</td></tr>`;return;}
    tbody.innerHTML=topics.map(t=>`<tr>
      <td><code style="font-size:11px">${esc(t.TopicID)}</code></td>
      <td><strong>${esc(t.Title)}</strong></td>
      <td>${typeBadge(t.Category)}</td>
      <td style="font-size:13px;color:var(--text-muted)">${esc(t.Description||"—")}</td>
    </tr>`).join("");
  }
  document.getElementById("openAddTopic").addEventListener("click",()=>openModal("addTopicModal"));
  document.getElementById("closeAddTopic").addEventListener("click",()=>closeModal("addTopicModal"));
  document.getElementById("cancelAddTopic").addEventListener("click",()=>closeModal("addTopicModal"));
  document.getElementById("addTopicForm").addEventListener("submit",async e=>{
    e.preventDefault();
    const alertEl=document.getElementById("topicFormAlert");hideAlert(alertEl);
    const payload={Title:document.getElementById("topicTitle").value.trim(),Category:document.getElementById("topicCategory").value,Description:document.getElementById("topicDesc").value.trim()};
    if(!payload.Title){showAlert(alertEl,"Title is required.");return;}
    try{
      const res=await API.addTopic(payload);
      if(res.success){showToast("Topic added.","success");closeModal("addTopicModal");document.getElementById("addTopicForm").reset();loadTopics();}
      else showAlert(alertEl,res.error||"Failed — topic may already exist.");
    }catch(e){showAlert(alertEl,e.message);}
  });

  // ════════════════════════════════════════
  // LOGS
  // ════════════════════════════════════════
  async function loadLogs(){
    try{const res=await API.getAllLogs({});allLogs=res.data||[];renderLogs(allLogs);}
    catch(e){document.getElementById("logsBody").innerHTML=`<tr><td colspan="7" class="table-empty" style="color:var(--danger)">${e.message}</td></tr>`;}
  }
  function renderLogs(logs){
    const tbody=document.getElementById("logsBody");
    if(!logs.length){tbody.innerHTML=`<tr><td colspan="7" class="table-empty">No logs yet.</td></tr>`;return;}
    const order={Passed:0,Failed:1,Pending:2};
    const sorted=[...logs].sort((a,b)=>{const diff=(order[a.Passed]??2)-(order[b.Passed]??2);return diff!==0?diff:(b.AttendanceDate||"")>(a.AttendanceDate||"")?1:-1;});
    tbody.innerHTML=sorted.slice(0,CONFIG.PAGE_SIZE).map(l=>`<tr>
      <td><code style="font-size:11px">${esc(l.LogID)}</code></td>
      <td><strong>${esc(l.EmployeeNo)}</strong></td>
      <td>${esc(l.EmployeeName||"")}</td>
      <td style="font-size:12px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600">${esc(l.SessionTitle||l.SessionID||"—")}</td>
      <td>${fmtDate(l.AttendanceDate)}</td>
      <td><span class="badge badge-room" style="font-size:11px">${esc(l.CheckInMethod)}</span></td>
      <td>${resultBadge(l.Passed)}</td>
    </tr>`).join("");
  }
  document.getElementById("applyLogFilters").addEventListener("click",()=>{
    const q=document.getElementById("logSearch").value.toLowerCase();
    const f=document.getElementById("logDateFrom").value;
    const t=document.getElementById("logDateTo").value;
    renderLogs(allLogs.filter(l=>{
      const txt=(l.EmployeeName+l.EmployeeNo+(l.SessionTitle||"")).toLowerCase();
      const d=l.AttendanceDate||"";
      return(!q||txt.includes(q))&&(!f||d>=f)&&(!t||d<=t);
    }));
  });

})();
