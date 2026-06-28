/* TrainPass v2.3 — scanner.js */
const CameraScanner = (() => {
  let html5QrCode=null, overlayEl=null, isScanning=false, onResultCb=null, cameras=[], cameraIndex=0;
  let lastScanned="", lastScannedAt=0;

  const FORMATS = () => [
    Html5QrcodeSupportedFormats.QR_CODE,
    Html5QrcodeSupportedFormats.CODE_128,
    Html5QrcodeSupportedFormats.CODE_39,
    Html5QrcodeSupportedFormats.EAN_13,
    Html5QrcodeSupportedFormats.EAN_8,
    Html5QrcodeSupportedFormats.PDF_417,
    Html5QrcodeSupportedFormats.DATA_MATRIX,
  ];

  function injectStyle(){
    if(document.getElementById("camStyle")) return;
    const s=document.createElement("style"); s.id="camStyle";
    s.textContent=`
#camOverlay{position:fixed;inset:0;z-index:9500;display:flex;align-items:center;justify-content:center;}
.cam-bg{position:absolute;inset:0;background:rgba(15,23,42,.75);backdrop-filter:blur(3px);}
.cam-box{position:relative;z-index:1;background:#fff;border-radius:16px;width:min(460px,94vw);max-height:90vh;overflow:hidden;display:flex;flex-direction:column;animation:camIn .2s ease;}
@keyframes camIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
.cam-head{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #e2e8f0;}
.cam-head-title{display:flex;align-items:center;gap:8px;font-weight:700;font-size:.95rem;}
.cam-head-title svg{width:18px;height:18px;color:#2563eb;}
.cam-close-btn{display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:6px;border:none;background:none;cursor:pointer;color:#64748b;}
.cam-close-btn:hover{background:#f1f5f9;}
.cam-body{padding:16px 18px;}
#camReader{border-radius:10px;overflow:hidden;background:#000;min-height:220px;}
#camReader video{width:100%!important;border-radius:10px;}
#camReader img{display:none;}
.cam-hint{display:flex;align-items:center;gap:7px;margin-top:10px;padding:9px 12px;background:#eff6ff;border-radius:6px;font-size:12.5px;color:#1e40af;}
.cam-hint svg{width:15px;height:15px;flex-shrink:0;}
.cam-status{text-align:center;font-size:13px;font-weight:500;color:#475569;margin-top:8px;min-height:18px;}
.cam-error{margin-top:8px;padding:9px 12px;background:#fef2f2;color:#dc2626;border-radius:6px;font-size:12.5px;border-left:3px solid #dc2626;}
.cam-foot{display:flex;align-items:center;justify-content:space-between;padding:10px 18px;border-top:1px solid #e2e8f0;background:#f8fafc;}
.cam-switch-btn{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:6px;font-size:13px;font-weight:500;border:1.5px solid #e2e8f0;background:#fff;cursor:pointer;color:#475569;transition:background .15s;}
.cam-switch-btn:hover{background:#f1f5f9;}
.cam-switch-btn svg{width:13px;height:13px;}
.cam-formats{font-size:11px;color:#94a3b8;}
.cam-flash{animation:camFlash .4s ease;}
@keyframes camFlash{0%{background:#000}50%{background:#22c55e}100%{background:#000}}
    `;
    document.head.appendChild(s);
  }

  function buildOverlay(){
    if(document.getElementById("camOverlay")) return;
    const o=document.createElement("div"); o.id="camOverlay";
    o.innerHTML=`
      <div class="cam-bg"></div>
      <div class="cam-box">
        <div class="cam-head">
          <span class="cam-head-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            Scan Employee Card
          </span>
          <button class="cam-close-btn" id="camCloseBtn" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="cam-body">
          <div id="camReader"></div>
          <div class="cam-hint">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            Point camera at the <strong>QR code</strong> or <strong>barcode</strong> on the employee card.
          </div>
          <div class="cam-status" id="camStatus">Starting camera…</div>
          <div class="cam-error hidden" id="camError"></div>
        </div>
        <div class="cam-foot">
          <button class="cam-switch-btn" id="camSwitchBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 4v6h6"/><path d="M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
            Switch Camera
          </button>
          <span class="cam-formats">QR · Code128 · EAN · PDF417</span>
        </div>
      </div>`;
    document.body.appendChild(o);
    overlayEl=o;
    document.getElementById("camCloseBtn").addEventListener("click", close);
    o.querySelector(".cam-bg").addEventListener("click", close);
    document.getElementById("camSwitchBtn").addEventListener("click", switchCamera);
  }

  async function open(onResult) {
    onResultCb=onResult;
    injectStyle();
    buildOverlay();
    setStatus("Starting camera…"); clearErr();
    try {
      cameras = await Html5Qrcode.getCameras();
      if(!cameras||cameras.length===0){ showErr("No camera found. Use USB scanner or type the employee number."); return; }
      cameraIndex = cameras.length>1?1:0;
      await startCamera();
    } catch(err) {
      showErr("Camera access denied. Please allow camera permission in your browser and try again.<br><small>"+err+"</small>");
    }
  }

  async function startCamera(){
    if(html5QrCode){ try{await html5QrCode.stop();}catch(e){} html5QrCode=null; }
    isScanning=false;
    const el=document.getElementById("camReader"); if(!el) return;
    el.innerHTML="";
    html5QrCode=new Html5Qrcode("camReader",{formatsToSupport:FORMATS(),verbose:false});
    const cam=cameras[cameraIndex]||cameras[0];
    try{
      await html5QrCode.start({deviceId:{exact:cam.id}},{fps:12,qrbox:{width:250,height:190},aspectRatio:1.4},onScan,()=>{});
      isScanning=true; setStatus("Point at employee card…");
    }catch(err){ showErr("Could not start camera: "+(err.message||err)); }
  }

  async function switchCamera(){
    if(cameras.length<=1){setStatus("Only one camera available.");return;}
    cameraIndex=(cameraIndex+1)%cameras.length;
    setStatus("Switching…"); await startCamera();
  }

  function onScan(text){
    const now=Date.now();
    if(text===lastScanned&&now-lastScannedAt<3000) return;
    lastScanned=text; lastScannedAt=now;
    const el=document.getElementById("camReader");
    if(el){el.classList.add("cam-flash");setTimeout(()=>el.classList.remove("cam-flash"),400);}
    setStatus("✓ Scanned: "+text);
    if(onResultCb) onResultCb(text);
  }

  async function close(){
    if(html5QrCode&&isScanning){ try{await html5QrCode.stop();}catch(e){} isScanning=false; }
    html5QrCode=null;
    if(overlayEl){overlayEl.remove();overlayEl=null;}
  }

  function setStatus(m){const e=document.getElementById("camStatus");if(e)e.textContent=m;}
  function showErr(m){const e=document.getElementById("camError");if(e){e.innerHTML=m;e.classList.remove("hidden");}}
  function clearErr(){const e=document.getElementById("camError");if(e){e.textContent="";e.classList.add("hidden");}}

  return{open,close};
})();
