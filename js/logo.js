/* TrainPass — logo.js
   Loads ADPHC_NEW_LOGO.png from the repo root and makes it available
   to pdf-report.js as window.ADPHC_LOGO_LOADED (base64 data URL).
   Place ADPHC_NEW_LOGO.png in the ROOT of your GitHub repo (same level as index.html).
*/
(function(){
  window.ADPHC_LOGO_LOADED = null;
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = function(){
    try {
      const c = document.createElement("canvas");
      c.width  = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext("2d").drawImage(img,0,0);
      window.ADPHC_LOGO_LOADED = c.toDataURL("image/png");
    } catch(e) { window.ADPHC_LOGO_LOADED = null; }
  };
  img.onerror = function(){ window.ADPHC_LOGO_LOADED = null; };
  const isPages = window.location.pathname.includes("/pages/");
  img.src = (isPages ? "../" : "") + "ADPHC_NEW_LOGO.png?v=" + Date.now();
})();
