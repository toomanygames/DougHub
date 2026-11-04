/* DougHub clicker games: stop pinch-zoom and double-tap zoom on phones and tablets,
   so fast tapping never zooms the page. Scrolling still works everywhere.
   Load it in <head> with: <script src="no-zoom.js"></script> */
(() => {
  "use strict";
  // 1. Viewport: no zoom for browsers that respect it (Android Chrome, most others).
  let meta = document.querySelector('meta[name="viewport"]');
  if (!meta) { meta = document.createElement("meta"); meta.name = "viewport"; document.head.appendChild(meta); }
  const parts = (meta.content || "width=device-width, initial-scale=1").split(",").map(s => s.trim()).filter(s => s && !/^(maximum-scale|minimum-scale|user-scalable)=/i.test(s));
  meta.content = parts.concat("maximum-scale=1", "minimum-scale=1", "user-scalable=no").join(", ");

  // 2. CSS: allow panning (scrolling) but not pinch-zoom; this also turns off double-tap zoom.
  const style = document.createElement("style");
  style.textContent = "html,body{touch-action:pan-x pan-y;-ms-touch-action:pan-x pan-y;-webkit-text-size-adjust:100%;text-size-adjust:100%}";
  document.head.appendChild(style);

  // 3. iPhone/iPad Safari ignores user-scalable=no, so block its zoom gestures directly.
  const stop = e => { if (e.cancelable) e.preventDefault(); };
  ["gesturestart", "gesturechange", "gestureend"].forEach(type => document.addEventListener(type, stop, { passive: false }));
  document.addEventListener("touchmove", e => { if (e.touches.length > 1 || (e.scale && e.scale !== 1)) stop(e); }, { passive: false });
  // (Double-tap zoom is already off thanks to the touch-action rule above, so fast taps are never swallowed.)
  // Ctrl/Cmd + mouse-wheel or trackpad pinch on laptops with touchscreens.
  document.addEventListener("wheel", e => { if (e.ctrlKey) stop(e); }, { passive: false });
})();
