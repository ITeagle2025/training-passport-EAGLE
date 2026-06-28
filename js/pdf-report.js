/* TrainPass v2.3 — pdf-report.js
   ADPHC branding, 2 signature lines, time format fix,
   "Eagle Environmental Services" footer
*/

const PDFReport = (() => {

  let uploadedPhoto = null;

  function openReport(data) {
    injectStyles();
    buildModal(data);
  }

  function buildModal(data) {
    document.getElementById("pdfReportOverlay")?.remove();
    uploadedPhoto = null;

    const participants = (data.Participants||[]).slice().sort((a,b)=>{
      const o={TRUE:0,Passed:0,FALSE:1,Failed:1,Pending:2};
      return (o[a.Passed]??2)-(o[b.Passed]??2);
    });
    const passed  = participants.filter(p=>p.Passed==="TRUE"||p.Passed==="Passed").length;
    const failed  = participants.filter(p=>p.Passed==="FALSE"||p.Passed==="Failed").length;
    const pending = participants.filter(p=>p.Passed==="Pending").length;
    const total   = participants.length;
    const rate    = total>0?Math.round((passed/total)*100):0;

    // Logo — try window.ADPHC_LOGO_LOADED (set by logo.js dynamic loader)
    const logoSrc = window.ADPHC_LOGO_LOADED || null;
    const logoHTML = logoSrc
      ? `<img src="${logoSrc}" alt="ADPHC Logo" class="rpt-logo-img"/>`
      : `<div class="rpt-logo-text"><div class="rpt-org-name">ADPHC</div><div class="rpt-org-sub">Abu Dhabi Public Health Centre</div></div>`;

    const overlay = document.createElement("div");
    overlay.id    = "pdfReportOverlay";
    overlay.innerHTML = `
      <div class="rpt-backdrop"></div>
      <div class="rpt-shell">
        <!-- TOOLBAR -->
        <div class="rpt-toolbar">
          <div class="rpt-toolbar-left">
            <button class="rpt-btn rpt-btn-ghost" id="rptClose">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="width:14px;height:14px"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              Close
            </button>
            <span class="rpt-toolbar-title">Training Completion Report — Preview</span>
          </div>
          <div class="rpt-toolbar-right">
            <label class="rpt-btn rpt-btn-ghost" for="rptPhotoInput" title="Upload photo evidence">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:14px;height:14px"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              Add Photo
            </label>
            <input type="file" id="rptPhotoInput" accept="image/*" style="display:none"/>
            <span class="rpt-photo-note hidden" id="rptPhotoNote">
              ⚠️ Photo is temporary — removed after saving PDF
            </span>
            <button class="rpt-btn rpt-btn-primary" id="rptSaveBtn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:14px;height:14px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Save as PDF
            </button>
          </div>
        </div>

        <!-- PAGE PREVIEW -->
        <div class="rpt-preview-wrap">
          <div class="rpt-page" id="rptPage">

            <!-- PAGE HEADER with ADPHC logo -->
            <div class="rpt-page-header">
              <div class="rpt-logo-block">
                ${logoHTML}
              </div>
              <div class="rpt-header-center">
                <div class="rpt-doc-type">TRAINING COMPLETION REPORT</div>
                <div class="rpt-doc-org">Eagle Environmental Services</div>
              </div>
              <div class="rpt-doc-meta">
                <div class="rpt-meta-row"><span>Report Date:</span><strong>${fmtDateLong(new Date().toISOString())}</strong></div>
                <div class="rpt-meta-row"><span>Document No:</span><strong>RPT-${(data.SessionID||"").replace("SES-","")}</strong></div>
                <div class="rpt-meta-row"><span>Status:</span><strong class="rpt-status-badge ${data.Status==="Completed"?"rpt-status-done":"rpt-status-sched"}">${data.Status||"Scheduled"}</strong></div>
              </div>
            </div>

            <div class="rpt-divider"></div>

            <!-- SESSION DETAILS -->
            <div class="rpt-section-title">SESSION DETAILS</div>
            <div class="rpt-detail-grid">
              <div class="rpt-detail-card rpt-detail-wide">
                <div class="rpt-detail-label">Training Title</div>
                <div class="rpt-detail-value rpt-title-large">${esc(data.Title||"—")}</div>
              </div>
              <div class="rpt-detail-card">
                <div class="rpt-detail-label">Topic / Category</div>
                <div class="rpt-detail-value">${esc(data.TopicTitle||data.SessionType||"—")}${data.TopicCategory?`<span class="rpt-chip">${esc(data.TopicCategory)}</span>`:""}</div>
              </div>
              <div class="rpt-detail-card">
                <div class="rpt-detail-label">Session Type</div>
                <div class="rpt-detail-value">${esc(data.SessionType||"—")}</div>
              </div>
              <div class="rpt-detail-card">
                <div class="rpt-detail-label">Date Conducted</div>
                <div class="rpt-detail-value">${fmtDateLong(data.ScheduledDate)}</div>
              </div>
              <div class="rpt-detail-card">
                <div class="rpt-detail-label">Time</div>
                <div class="rpt-detail-value">${fmtTime12(data.ScheduledTime)}</div>
              </div>
              <div class="rpt-detail-card">
                <div class="rpt-detail-label">Duration</div>
                <div class="rpt-detail-value">${data.DurationMinutes||60} minutes</div>
              </div>
              <div class="rpt-detail-card">
                <div class="rpt-detail-label">Location / Mode</div>
                <div class="rpt-detail-value">${esc(data.Location||"—")}</div>
              </div>
              <div class="rpt-detail-card">
                <div class="rpt-detail-label">Trainer / Facilitator</div>
                <div class="rpt-detail-value rpt-trainer-name">${esc(data.TrainerName||"—")}</div>
              </div>
            </div>

            ${data.Description?`
            <div class="rpt-description-box">
              <div class="rpt-detail-label">Description / Objectives</div>
              <p class="rpt-description-text">${esc(data.Description)}</p>
            </div>`:""}

            <!-- ATTENDANCE SUMMARY -->
            <div class="rpt-section-title" style="margin-top:22px">ATTENDANCE SUMMARY</div>
            <div class="rpt-stats-row">
              <div class="rpt-stat-box"><div class="rpt-stat-num">${total}</div><div class="rpt-stat-label">Total Attendees</div></div>
              <div class="rpt-stat-box rpt-stat-pass"><div class="rpt-stat-num">${passed}</div><div class="rpt-stat-label">Passed</div></div>
              <div class="rpt-stat-box rpt-stat-fail"><div class="rpt-stat-num">${failed}</div><div class="rpt-stat-label">Failed</div></div>
              <div class="rpt-stat-box rpt-stat-pend"><div class="rpt-stat-num">${pending}</div><div class="rpt-stat-label">Pending</div></div>
              <div class="rpt-stat-box rpt-stat-rate"><div class="rpt-stat-num">${rate}%</div><div class="rpt-stat-label">Pass Rate</div></div>
            </div>

            <!-- PHOTO EVIDENCE -->
            <div id="rptPhotoSection" style="display:none;margin-top:20px">
              <div class="rpt-section-title">PHOTO EVIDENCE</div>
              <div class="rpt-photo-wrap">
                <img id="rptPhotoImg" src="" alt="Training photo evidence" class="rpt-photo-img"/>
                <p class="rpt-photo-caption">Photo documentation of the training session.</p>
              </div>
            </div>

            <!-- PARTICIPANTS TABLE -->
            <div class="rpt-section-title" style="margin-top:22px">LIST OF PARTICIPANTS</div>
            <table class="rpt-table">
              <thead>
                <tr>
                  <th class="rpt-th-no">No.</th>
                  <th class="rpt-th-emp">Emp No.</th>
                  <th class="rpt-th-name">Full Name</th>
                  <th class="rpt-th-date">Date</th>
                  <th class="rpt-th-score">Score</th>
                  <th class="rpt-th-result">Result</th>
                  <th class="rpt-th-sig">Signature</th>
                </tr>
              </thead>
              <tbody>
                ${participants.length===0
                  ? `<tr><td colspan="7" style="text-align:center;padding:20px;color:#94a3b8">No participants recorded.</td></tr>`
                  : participants.map((p,i)=>`
                    <tr class="${p.Passed==="TRUE"||p.Passed==="Passed"?"rpt-tr-pass":p.Passed==="FALSE"||p.Passed==="Failed"?"rpt-tr-fail":""}">
                      <td class="rpt-td-center">${i+1}</td>
                      <td class="rpt-td-emp">${esc(p.EmployeeNo||"—")}</td>
                      <td class="rpt-td-name">${esc(p.Name||"—")}</td>
                      <td class="rpt-td-center">${fmtDateLong(p.Date)}</td>
                      <td class="rpt-td-center">${p.Score!==null&&p.Score!==undefined&&p.Score!==""?`<strong>${esc(String(p.Score))}</strong>/100`:"—"}</td>
                      <td class="rpt-td-center">
                        <span class="rpt-result-badge rpt-result-${p.Passed==="TRUE"||p.Passed==="Passed"?"pass":p.Passed==="FALSE"||p.Passed==="Failed"?"fail":"pend"}">
                          ${p.Passed==="TRUE"||p.Passed==="Passed"?"PASSED":p.Passed==="FALSE"||p.Passed==="Failed"?"FAILED":"PENDING"}
                        </span>
                      </td>
                      <td class="rpt-td-sig"></td>
                    </tr>`).join("")}
              </tbody>
            </table>

            <!-- SIGNATURES — 2 lines only (no HR line) -->
            <div class="rpt-sig-section">
              <div class="rpt-sig-box">
                <div class="rpt-sig-line"></div>
                <div class="rpt-sig-name">${esc(data.TrainerName||"Trainer")}</div>
                <div class="rpt-sig-role">Trainer / Facilitator</div>
              </div>
              <div class="rpt-sig-box">
                <div class="rpt-sig-line"></div>
                <div class="rpt-sig-name">&nbsp;</div>
                <div class="rpt-sig-role">Department Head / Supervisor</div>
              </div>
            </div>

            <!-- PAGE FOOTER -->
            <div class="rpt-page-footer">
              <span>Generated by TrainPass Training Management System</span>
              <span>This Document is Under Eagle Environmental Services</span>
              <span>${new Date().toLocaleString("en-GB",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}</span>
            </div>

          </div><!-- end rpt-page -->
        </div><!-- end preview wrap -->
      </div><!-- end shell -->
    `;

    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";

    document.getElementById("rptClose").addEventListener("click", close);
    overlay.querySelector(".rpt-backdrop").addEventListener("click", close);

    document.getElementById("rptPhotoInput").addEventListener("change", e=>{
      const file=e.target.files[0]; if(!file) return;
      const reader=new FileReader();
      reader.onload=ev=>{
        uploadedPhoto=ev.target.result;
        document.getElementById("rptPhotoImg").src=uploadedPhoto;
        document.getElementById("rptPhotoSection").style.display="block";
        document.getElementById("rptPhotoNote").classList.remove("hidden");
      };
      reader.readAsDataURL(file);
    });

    document.getElementById("rptSaveBtn").addEventListener("click",()=>savePDF(data));
  }

  function close() {
    document.getElementById("pdfReportOverlay")?.remove();
    document.body.style.overflow="";
    uploadedPhoto=null;
  }

  async function savePDF(data) {
    const btn=document.getElementById("rptSaveBtn");
    btn.disabled=true; btn.innerHTML="<span>Generating…</span>";
    try {
      const page=document.getElementById("rptPage");
      const canvas=await html2canvas(page,{scale:2,useCORS:true,backgroundColor:"#ffffff",logging:false});
      const{jsPDF}=window.jspdf;
      const pdf=new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
      const imgData=canvas.toDataURL("image/jpeg",0.92);
      const pdfW=pdf.internal.pageSize.getWidth();
      const pdfH=pdf.internal.pageSize.getHeight();
      const imgH=pdfW*(canvas.height/canvas.width);
      let yPos=0;
      while(yPos<imgH){
        if(yPos>0) pdf.addPage();
        pdf.addImage(imgData,"JPEG",0,-yPos,pdfW,imgH,"","FAST");
        yPos+=pdfH;
      }
      const fname=`TrainingReport_${(data.Title||"Session").replace(/\s+/g,"_")}_${data.ScheduledDate||"nodate"}.pdf`;
      pdf.save(fname);
      if(uploadedPhoto){
        document.getElementById("rptPhotoSection").style.display="none";
        document.getElementById("rptPhotoImg").src="";
        document.getElementById("rptPhotoNote").classList.add("hidden");
        uploadedPhoto=null;
        toast("✅ PDF saved. Photo evidence removed from preview.");
      } else toast("✅ PDF saved successfully.");
    }catch(err){
      console.error(err);
      toast("❌ PDF failed: "+err.message, true);
    }finally{
      btn.disabled=false;
      btn.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:14px;height:14px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Save as PDF`;
    }
  }

  /* helpers */
  function fmtDateLong(d){
    if(!d) return "—";
    const dt=new Date(String(d).includes("T")?d:d+"T00:00:00");
    if(isNaN(dt)) return String(d);
    return dt.toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"});
  }
  function fmtTime12(t){
    if(!t) return "—";
    const str=String(t).trim().slice(0,5);
    if(!str.includes(":")) return str;
    const[hStr,mStr]=str.split(":");
    let h=parseInt(hStr,10); const m=mStr||"00";
    if(isNaN(h)) return str;
    const ampm=h>=12?"PM":"AM"; h=h%12||12;
    return `${h}:${m} ${ampm}`;
  }
  function esc(s){if(!s&&s!==0)return"";return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
  function toast(msg,isErr=false){
    const t=document.createElement("div");
    t.style.cssText=`position:fixed;bottom:24px;right:24px;z-index:99999;background:${isErr?"#dc2626":"#15803d"};color:#fff;padding:12px 18px;border-radius:8px;font-size:13.5px;font-weight:500;box-shadow:0 8px 24px rgba(0,0,0,.2);max-width:360px`;
    t.textContent=msg;document.body.appendChild(t);
    setTimeout(()=>t.remove(),4000);
  }

  function injectStyles(){
    if(document.getElementById("pdfReportStyle")) return;
    const s=document.createElement("style");
    s.id="pdfReportStyle";
    s.textContent=`
#pdfReportOverlay{position:fixed;inset:0;z-index:8000;display:flex;flex-direction:column;}
.rpt-backdrop{position:absolute;inset:0;background:rgba(15,23,42,.65);backdrop-filter:blur(3px);}
.rpt-shell{position:relative;z-index:1;display:flex;flex-direction:column;height:100vh;max-width:920px;margin:0 auto;width:100%;}
.rpt-toolbar{display:flex;align-items:center;justify-content:space-between;padding:10px 20px;background:#1e293b;color:#fff;gap:12px;flex-shrink:0;}
.rpt-toolbar-left{display:flex;align-items:center;gap:12px;}
.rpt-toolbar-right{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.rpt-toolbar-title{font-weight:600;font-size:14px;color:#e2e8f0;}
.rpt-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:6px;font-size:13px;font-weight:500;border:none;cursor:pointer;transition:background .15s;white-space:nowrap;}
.rpt-btn-ghost{background:rgba(255,255,255,.1);color:#e2e8f0;} .rpt-btn-ghost:hover{background:rgba(255,255,255,.18);}
.rpt-btn-primary{background:#2563eb;color:#fff;} .rpt-btn-primary:hover{background:#1d4ed8;} .rpt-btn-primary:disabled{opacity:.6;cursor:not-allowed;}
.rpt-photo-note{display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#fbbf24;}
.rpt-preview-wrap{flex:1;overflow-y:auto;padding:24px 16px;background:#475569;}
.rpt-page{background:#fff;width:794px;max-width:100%;margin:0 auto;padding:40px 44px 36px;box-shadow:0 8px 40px rgba(0,0,0,.3);border-radius:4px;font-family:'Inter',sans-serif;font-size:13px;color:#0f172a;line-height:1.5;}
/* Header */
.rpt-page-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:18px;gap:12px;}
.rpt-logo-block{flex-shrink:0;}
.rpt-logo-img{height:64px;width:auto;object-fit:contain;}
.rpt-logo-text{display:flex;flex-direction:column;gap:2px;}
.rpt-org-name{font-family:'Space Grotesk',sans-serif;font-size:1.4rem;font-weight:700;color:#1e3a5f;}
.rpt-org-sub{font-size:11px;color:#64748b;font-weight:500;}
.rpt-header-center{flex:1;text-align:center;padding:0 12px;}
.rpt-doc-type{font-size:11px;font-weight:800;letter-spacing:.12em;color:#1e40af;text-transform:uppercase;}
.rpt-doc-org{font-size:14px;font-weight:700;color:#0f172a;margin-top:4px;}
.rpt-doc-meta{text-align:right;flex-shrink:0;}
.rpt-meta-row{display:flex;justify-content:flex-end;gap:10px;font-size:11.5px;margin-bottom:3px;color:#475569;}
.rpt-meta-row strong{color:#0f172a;min-width:120px;text-align:right;}
.rpt-status-badge{font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;text-transform:uppercase;}
.rpt-status-done{background:#dcfce7;color:#15803d;} .rpt-status-sched{background:#fef9c3;color:#a16207;}
.rpt-divider{border:none;border-top:2.5px solid #1e40af;margin:0 0 18px;}
.rpt-section-title{font-size:10px;font-weight:700;letter-spacing:.1em;color:#1e40af;text-transform:uppercase;margin-bottom:10px;padding-bottom:4px;border-bottom:1px solid #e2e8f0;}
/* Detail grid */
.rpt-detail-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px;}
.rpt-detail-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:9px 11px;}
.rpt-detail-wide{grid-column:1/-1;}
.rpt-detail-label{font-size:9.5px;font-weight:700;letter-spacing:.05em;color:#64748b;text-transform:uppercase;margin-bottom:3px;}
.rpt-detail-value{font-size:13px;font-weight:500;color:#0f172a;}
.rpt-title-large{font-size:15px;font-weight:700;color:#1e293b;}
.rpt-trainer-name{font-weight:700;color:#1e40af;}
.rpt-chip{display:inline-block;font-size:10px;padding:1px 7px;background:#ede9fe;color:#5b21b6;border-radius:99px;margin-left:6px;font-weight:600;}
.rpt-description-box{background:#f8fafc;border-left:3px solid #1e40af;padding:9px 13px;border-radius:0 6px 6px 0;margin-top:8px;}
.rpt-description-text{font-size:12px;color:#475569;margin:3px 0 0;}
/* Stats */
.rpt-stats-row{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:8px;}
.rpt-stat-box{text-align:center;padding:12px 6px;border-radius:8px;border:1px solid #e2e8f0;background:#f8fafc;}
.rpt-stat-num{font-family:'Space Grotesk',sans-serif;font-size:1.7rem;font-weight:700;line-height:1;}
.rpt-stat-label{font-size:10px;color:#64748b;font-weight:500;margin-top:3px;}
.rpt-stat-pass{border-color:#bbf7d0;background:#f0fdf4;} .rpt-stat-pass .rpt-stat-num{color:#15803d;}
.rpt-stat-fail{border-color:#fecaca;background:#fef2f2;} .rpt-stat-fail .rpt-stat-num{color:#dc2626;}
.rpt-stat-pend{border-color:#fde68a;background:#fffbeb;} .rpt-stat-pend .rpt-stat-num{color:#d97706;}
.rpt-stat-rate{border-color:#bfdbfe;background:#eff6ff;} .rpt-stat-rate .rpt-stat-num{color:#1e40af;}
/* Photo */
.rpt-photo-wrap{border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;}
.rpt-photo-img{width:100%;max-height:300px;object-fit:cover;display:block;}
.rpt-photo-caption{font-size:11px;color:#94a3b8;padding:6px 12px;background:#f8fafc;text-align:center;}
/* Table */
.rpt-table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:22px;}
.rpt-table thead tr{background:#1e3a8a;color:#fff;}
.rpt-table th{padding:9px 10px;text-align:left;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;}
.rpt-th-no{width:34px;text-align:center;}.rpt-th-emp{width:88px;}.rpt-th-date{width:88px;text-align:center;}.rpt-th-score{width:68px;text-align:center;}.rpt-th-result{width:74px;text-align:center;}.rpt-th-sig{width:96px;}
.rpt-table td{padding:8px 10px;border-bottom:1px solid #f1f5f9;vertical-align:middle;}
.rpt-td-center{text-align:center;}.rpt-td-emp{font-family:monospace;font-size:11px;color:#475569;}.rpt-td-name{font-weight:600;color:#0f172a;}.rpt-td-sig{border-bottom:1px dashed #cbd5e1;}
.rpt-table tr:nth-child(even){background:#f8fafc;}
.rpt-tr-pass{background:#f0fdf4!important;} .rpt-tr-fail{background:#fef2f2!important;}
.rpt-result-badge{display:inline-block;padding:2px 7px;border-radius:99px;font-size:9.5px;font-weight:700;letter-spacing:.04em;}
.rpt-result-pass{background:#dcfce7;color:#15803d;}.rpt-result-fail{background:#fecaca;color:#dc2626;}.rpt-result-pend{background:#fef9c3;color:#a16207;}
/* Signatures — 2 only */
.rpt-sig-section{display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-top:28px;padding-top:14px;border-top:1px solid #e2e8f0;}
.rpt-sig-box{display:flex;flex-direction:column;align-items:center;gap:5px;}
.rpt-sig-line{width:100%;border-bottom:1.5px solid #0f172a;height:38px;}
.rpt-sig-name{font-size:12px;font-weight:700;color:#0f172a;text-align:center;}
.rpt-sig-role{font-size:10px;color:#64748b;text-align:center;}
/* Footer */
.rpt-page-footer{display:flex;justify-content:space-between;margin-top:18px;padding-top:8px;border-top:1px solid #e2e8f0;font-size:9.5px;color:#94a3b8;}
    `;
    document.head.appendChild(s);
  }

  return { openReport };
})();
