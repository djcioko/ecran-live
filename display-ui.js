/* UI: ruleta, slideshow, layout, fundal — se încarcă după display.js */
const prizes = [
  "Un toast din partea casei",
  "Dedicație: următoarea piesă e a lui",
  "Vine la pupitru și dă play",
  "Alege următorul stil, 2 minute"
];
const sliceColors = ["#e74c3c", "#f4f7fb", "#7eb6e8", "#f5b942"];
const sliceInk = ["#fff", "#e74c3c", "#16324f", "#16324f"];

const FREE_BASE = {
  brand: { w: 640, h: 150 },
  count: { w: 560, h: 150 },
  msg: { w: 760, h: 180 },
  guest: { w: 640, h: 200 },
  qr: { w: 168, h: 210 },
  wheel: { w: 200, h: 240 },
  slides: { w: 420, h: 280 }
};

function scaleFreeText(el) {
  if (!el || !el.dataset) return;
  const key = el.dataset.key;
  const base = FREE_BASE[key];
  if (!base) return;
  const w = el.offsetWidth || parseFloat(el.style.width) || base.w;
  const h = el.offsetHeight || parseFloat(el.style.height) || base.h;
  const s = Math.max(0.35, Math.min(3.2, Math.min(w / base.w, h / base.h)));
  const setFs = (node, px) => { if (node) node.style.fontSize = (px * s) + "px"; };
  if (key === "brand") {
    setFs(el.querySelector(".brand"), 18);
    setFs(el.querySelector(".show-title"), 48);
    setFs(el.querySelector(".sub"), 14);
  } else if (key === "count") {
    setFs(el.querySelector(".countdown"), 96);
  } else if (key === "msg") {
    setFs(el.querySelector(".who"), 14);
    setFs(el.querySelector(".text"), 42);
  } else if (key === "guest") {
    setFs(el.querySelector(".tag"), 14);
    setFs(el.querySelector(".who"), 42);
    setFs(el.querySelector(".text"), 26);
  } else if (key === "qr") {
    setFs(el.querySelector("p"), 12);
  }
}

function scaleAllFree() {
  document.querySelectorAll(".free").forEach(scaleFreeText);
}

function drawStar(c, cx, cy, r) {
  c.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + i * (Math.PI * 2 / 5);
    const b = a + Math.PI / 5;
    c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    c.lineTo(cx + Math.cos(b) * r * 0.42, cy + Math.sin(b) * r * 0.42);
  }
  c.closePath();
  c.fillStyle = "#fff";
  c.fill();
}

function drawWheel(canvas, names, angle) {
  if (!canvas) return;
  const c = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2 + 8;
  const r = Math.min(w, h) / 2 - 28;
  c.clearRect(0, 0, w, h);
  c.fillStyle = "#2f6fed";
  c.beginPath();
  c.moveTo(cx - r * 0.28, cy + r + 8);
  c.lineTo(cx + r * 0.28, cy + r + 8);
  c.lineTo(cx + r * 0.55, cy + r + 34);
  c.lineTo(cx - r * 0.55, cy + r + 34);
  c.closePath();
  c.fill();
  if (c.roundRect) {
    c.beginPath();
    c.roundRect(cx - r * 0.62, cy + r + 30, r * 1.24, 16, 8);
    c.fill();
  }
  c.beginPath();
  c.arc(cx, cy, r + 16, 0, Math.PI * 2);
  c.fillStyle = "#2f6fed";
  c.fill();
  c.beginPath();
  c.arc(cx, cy, r + 8, 0, Math.PI * 2);
  c.fillStyle = "#1d4ed8";
  c.fill();
  const dots = 16;
  for (let i = 0; i < dots; i++) {
    const a = (Math.PI * 2 * i) / dots - Math.PI / 2;
    c.beginPath();
    c.arc(cx + Math.cos(a) * (r + 12), cy + Math.sin(a) * (r + 12), 4.5, 0, Math.PI * 2);
    c.fillStyle = ["#e74c3c", "#f5b942", "#7eb6e8", "#fff"][i % 4];
    c.fill();
  }
  const list = [];
  for (let i = 0; i < WHEEL_MAX; i++) list.push(names[i] || "liber");
  const slice = (Math.PI * 2) / list.length;
  list.forEach((name, i) => {
    c.beginPath();
    c.moveTo(cx, cy);
    c.arc(cx, cy, r - 2, angle + i * slice, angle + (i + 1) * slice);
    c.closePath();
    c.fillStyle = sliceColors[i % sliceColors.length];
    c.fill();
    c.strokeStyle = "#fff";
    c.lineWidth = 3;
    c.stroke();
    c.save();
    c.translate(cx, cy);
    c.rotate(angle + i * slice + slice / 2);
    c.fillStyle = names[i] ? sliceInk[i % sliceInk.length] : "rgba(22,50,79,.35)";
    const font = Math.max(14, Math.min(26, r / 8));
    c.font = "800 " + font + "px Segoe UI";
    c.textAlign = "right";
    c.fillText(String(name).slice(0, 12), r - 34, font * 0.32);
    c.restore();
  });
  c.beginPath();
  c.arc(cx, cy, r * 0.2, 0, Math.PI * 2);
  c.fillStyle = "#2f6fed";
  c.fill();
  c.beginPath();
  c.arc(cx, cy, r * 0.16, 0, Math.PI * 2);
  c.strokeStyle = "#fff";
  c.lineWidth = 4;
  c.stroke();
  drawStar(c, cx, cy, r * 0.1);
  c.beginPath();
  c.arc(cx, cy - r - 22, 8, 0, Math.PI * 2);
  c.fillStyle = "#e74c3c";
  c.fill();
  c.beginPath();
  c.moveTo(cx, cy - r + 8);
  c.lineTo(cx - 12, cy - r - 16);
  c.lineTo(cx + 12, cy - r - 16);
  c.closePath();
  c.fill();
}

function redrawWheels(angle) {
  drawWheel(document.getElementById("wheelCanvas"), wheelNames, angle || 0);
  const big = document.getElementById("wheelBig");
  if (document.getElementById("tombola") && document.getElementById("tombola").classList.contains("on"))
    drawWheel(big, wheelNames, angle || 0);
}
if (typeof redrawWheels === "function") redrawWheels(0);

let spinning = false;
const wheelBtn = document.getElementById("wheelBtn");
if (wheelBtn) wheelBtn.onclick = () => {
  if (document.body.classList.contains("editing")) return;
  if (!wheelNames.length) {
    alert("Încă nu e nimeni în ruletă. Numele intră singur când vine un mesaj.");
    return;
  }
  if (spinning) return;
  spinning = true;
  const box = document.getElementById("tombola");
  const winner = document.getElementById("winner");
  const big = document.getElementById("wheelBig");
  box.classList.add("on");
  winner.textContent = "...";
  document.getElementById("spinName").textContent = "se învârte";
  const idx = Math.floor(Math.random() * wheelNames.length);
  const slice = (Math.PI * 2) / WHEEL_MAX;
  const stop = -idx * slice - slice / 2 - Math.PI / 2;
  const start = performance.now();
  const extra = Math.PI * 8;
  function step(now) {
    const t = Math.min(1, (now - start) / 4200);
    const ease = 1 - Math.pow(1 - t, 3);
    const angle = stop + extra * (1 - ease);
    drawWheel(big, wheelNames, angle);
    drawWheel(document.getElementById("wheelCanvas"), wheelNames, angle);
    if (t < 1) requestAnimationFrame(step);
    else {
      spinning = false;
      const name = wheelNames[idx];
      winner.textContent = name;
      document.getElementById("spinName").textContent = "";
      document.getElementById("prize").textContent = prizes[Math.floor(Math.random() * prizes.length)];
      speak("Câștigătorul ruletei este " + name);
    }
  }
  requestAnimationFrame(step);
};
const closeWheel = document.getElementById("closeWheel");
if (closeWheel) closeWheel.onclick = () => {
  document.getElementById("tombola").classList.remove("on");
  spinning = false;
};
const resetWheelBtn = document.getElementById("resetWheel");
if (resetWheelBtn) resetWheelBtn.onclick = (ev) => { ev.stopPropagation(); resetWheel(); };
const resetWheelDock = document.getElementById("resetWheelDock");
if (resetWheelDock) resetWheelDock.onclick = resetWheel;

const canvas = document.getElementById("fw");
const ctx = canvas ? canvas.getContext("2d") : null;
function resize() { if (canvas) { canvas.width = innerWidth; canvas.height = innerHeight; } }
if (canvas) { resize(); addEventListener("resize", resize); }
let parts = [];
function burst() {
  if (!canvas) return;
  for (let i = 0; i < 2; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height * 0.45;
    const color = "hsl(" + (40 + Math.random() * 20) + ", 90%, 60%)";
    for (let j = 0; j < 26; j++) {
      parts.push({ x, y, vx: (Math.random() - 0.5) * 7, vy: (Math.random() - 0.5) * 7, life: 1, color });
    }
  }
}
function frame() {
  if (!ctx || !canvas) return;
  ctx.fillStyle = document.body.classList.contains("has-custom-bg")
    ? "rgba(10,8,20,0.06)"
    : "rgba(20,12,36,0.14)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  parts = parts.filter((p) => p.life > 0);
  parts.forEach((p) => {
    p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.life -= 0.018;
    ctx.globalAlpha = Math.max(p.life, 0);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  requestAnimationFrame(frame);
}
if (ctx) frame();

const guestLink = window.TUUTI_GUEST_URL || new URL("guest.html", location.href).href;
if (document.getElementById("qr") && window.QRCode) {
  document.getElementById("qrBox").hidden = false;
  document.getElementById("qr").innerHTML = "";
  new QRCode(document.getElementById("qr"), { text: guestLink, width: 128, height: 128 });
}

function paintSlide() {
  const img = document.getElementById("slideImg");
  const win = document.getElementById("slideWin");
  if (!img || !slideUrls.length || !state.slides) {
    if (win) win.classList.remove("on");
    return;
  }
  img.src = slideUrls[slideIdx % slideUrls.length];
  win.classList.add("on");
  slideIdx++;
}
setInterval(paintSlide, 8000);

function applyLayout(saved) {
  document.querySelectorAll(".free").forEach((el) => {
    const s = saved[el.dataset.key];
    if (!s) return;
    el.style.transform = "none";
    if (s.left) el.style.left = s.left;
    if (s.top) el.style.top = s.top;
    el.style.right = "auto";
    el.style.bottom = "auto";
    if (s.width) el.style.width = s.width;
    if (s.height) el.style.height = s.height;
    scaleFreeText(el);
  });
  scaleAllFree();
}
try {
  applyLayout(JSON.parse(localStorage.getItem(layoutKey) || "{}"));
} catch (e) {}
scaleAllFree();

function saveLayout() {
  const data = {};
  document.querySelectorAll(".free").forEach((el) => {
    const rect = el.getBoundingClientRect();
    data[el.dataset.key] = {
      left: el.style.left || rect.left + "px",
      top: el.style.top || rect.top + "px",
      width: el.style.width || rect.width + "px",
      height: el.style.height || rect.height + "px"
    };
  });
  localStorage.setItem(layoutKey, JSON.stringify(data));
  ch.postMessage({ type: "layout", layout: data });
}

let editing = false;
const editBtn = document.getElementById("editBtn");
if (editBtn) editBtn.onclick = () => {
  editing = !editing;
  document.body.classList.toggle("editing", editing);
  editBtn.textContent = editing ? "Gata" : "Editează layout";
  if (!editing) {
    scaleAllFree();
    saveLayout();
  }
};

document.querySelectorAll(".free").forEach((el) => {
  el.addEventListener("pointerdown", (ev) => {
    if (!editing) return;
    ev.preventDefault();
    const mode = ev.target.classList.contains("handle") ? "both"
      : ev.target.classList.contains("handle-e") ? "w"
      : ev.target.classList.contains("handle-s") ? "h"
      : "move";
    const rect = el.getBoundingClientRect();
    el.style.transform = "none";
    el.style.left = rect.left + "px";
    el.style.top = rect.top + "px";
    el.style.right = "auto";
    el.style.bottom = "auto";
    el.style.width = rect.width + "px";
    el.style.height = rect.height + "px";
    const startX = ev.clientX;
    const startY = ev.clientY;
    const startLeft = rect.left;
    const startTop = rect.top;
    const startW = rect.width;
    const startH = rect.height;
    function move(e) {
      if (mode === "move") {
        el.style.left = (startLeft + e.clientX - startX) + "px";
        el.style.top = (startTop + e.clientY - startY) + "px";
      } else {
        if (mode === "both" || mode === "w") el.style.width = Math.max(70, startW + e.clientX - startX) + "px";
        if (mode === "both" || mode === "h") el.style.height = Math.max(46, startH + e.clientY - startY) + "px";
        scaleFreeText(el);
      }
    }
    function up() {
      scaleFreeText(el);
      saveLayout();
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", up);
    }
    addEventListener("pointermove", move);
    addEventListener("pointerup", up);
  });
});

const night = document.getElementById("night");
const bgPhoto = document.getElementById("bgPhoto");
const bgVideo = document.getElementById("bgVideo");
function setTheme(name) {
  if (night) night.className = "night " + (name || "auriu");
}
function clearCustomBg() {
  document.body.classList.remove("has-custom-bg");
  if (bgPhoto) { bgPhoto.classList.remove("on"); bgPhoto.removeAttribute("src"); }
  if (bgVideo) {
    bgVideo.classList.remove("on");
    bgVideo.pause();
    bgVideo.removeAttribute("src");
    try { bgVideo.load(); } catch (e) {}
  }
}
const bgSelect = document.getElementById("bgSelect");
if (bgSelect) bgSelect.addEventListener("change", (ev) => {
  clearCustomBg();
  setTheme(ev.target.value);
});
const bgFile = document.getElementById("bgFile");
if (bgFile) bgFile.addEventListener("change", (ev) => {
  const file = ev.target.files && ev.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  clearCustomBg();
  document.body.classList.add("has-custom-bg");
  if (file.type.startsWith("video/")) {
    bgVideo.src = url;
    bgVideo.classList.add("on");
    bgVideo.muted = true;
    bgVideo.loop = true;
    bgVideo.play().catch(() => {});
  } else {
    bgPhoto.src = url;
    bgPhoto.classList.add("on");
  }
});
const bgClear = document.getElementById("bgClear");
if (bgClear) bgClear.onclick = () => {
  clearCustomBg();
  setTheme((bgSelect && bgSelect.value) || "auriu");
};
setTheme("auriu");

const settingsBtn = document.getElementById("settingsBtn");
if (settingsBtn) settingsBtn.onclick = openSettings;
const setSave = document.getElementById("setSave");
if (setSave) setSave.onclick = saveSettings;
const setClose = document.getElementById("setClose");
if (setClose) setClose.onclick = () => { document.getElementById("settingsPanel").hidden = true; };

const folderTv = document.getElementById("folderTv");
if (folderTv) folderTv.addEventListener("change", async (ev) => {
  const files = [...ev.target.files].filter((f) => f.type.startsWith("image/")).slice(0, 40);
  slideUrls = await Promise.all(files.map((f) => new Promise((res) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.readAsDataURL(f);
  })));
  slideIdx = 0;
  state.slides = true;
  const fi = document.getElementById("folderInfo");
  if (fi) fi.textContent = slideUrls.length + " poze";
  const sb = document.getElementById("slideBtn");
  if (sb) sb.textContent = "Poze ON";
  paintSlide();
});
const slideBtn = document.getElementById("slideBtn");
if (slideBtn) slideBtn.onclick = () => {
  if (!slideUrls.length) { alert("Încarcă folderul de poze, apoi apasă Poze ON."); return; }
  state.slides = !state.slides;
  slideBtn.textContent = state.slides ? "Poze ON" : "Poze OFF";
  document.getElementById("slideWin").classList.toggle("on", state.slides);
  if (state.slides) paintSlide();
};
const hideBtn = document.getElementById("hideBtn");
if (hideBtn) hideBtn.onclick = () => {
  document.getElementById("dock").classList.add("off");
  document.getElementById("showBtn").hidden = false;
};
const showBtn = document.getElementById("showBtn");
if (showBtn) showBtn.onclick = () => {
  document.getElementById("dock").classList.remove("off");
  showBtn.hidden = true;
};
async function goFullscreen() {
  if (!document.fullscreenElement) {
    try { await document.documentElement.requestFullscreen(); } catch (e) {}
  } else {
    try { await document.exitFullscreen(); } catch (e) {}
  }
}
const fsBtn = document.getElementById("fsBtn");
if (fsBtn) fsBtn.onclick = goFullscreen;
const previewBtn = document.getElementById("previewBtn");
if (previewBtn) previewBtn.onclick = async () => {
  saveLayout();
  let features = "popup=yes,width=1280,height=720";
  try {
    if (window.getScreenDetails) {
      const details = await window.getScreenDetails();
      const other = details.screens.find((s) => !s.isPrimary) || details.screens[0];
      if (other) features = "popup=yes,left=" + other.availLeft + ",top=" + other.availTop + ",width=" + other.availWidth + ",height=" + other.availHeight;
    }
  } catch (e) {}
  const w = window.open(location.pathname + location.search + "#tv", "tutti-tv", features);
  if (!w) alert("Browserul a blocat fereastra. Permite popup.");
};
if (location.hash === "#tv") {
  document.getElementById("dock").classList.add("off");
  document.getElementById("showBtn").hidden = false;
  setTimeout(goFullscreen, 400);
}
const voiceTest = document.getElementById("voiceTest");
if (voiceTest) voiceTest.onclick = () => {
  voiceReady = true;
  const box = document.getElementById("voice-unlock");
  if (box) box.style.display = "none";
  state.voice = true;
  document.getElementById("speakerBtn").textContent = "🔊";
  document.getElementById("speakerBtn").classList.remove("off");
  speak(document.getElementById("text").textContent || ((EV.brand || "") + " " + (EV.title || "")).trim() || "La mulți ani!");
};
const resetLayoutBtn = document.getElementById("resetLayout");
if (resetLayoutBtn) resetLayoutBtn.onclick = () => {
  localStorage.removeItem(layoutKey);
  location.reload();
};
redrawWheels(0);
scaleAllFree();
