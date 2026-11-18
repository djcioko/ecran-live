const ch = new BroadcastChannel("tuuti-revelion-2027");
const SETTINGS_KEY = "event-board-settings-v1";
const baseEV = window.EVENT || {};
let EV = Object.assign({}, baseEV);
try {
  const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
  if (saved && typeof saved === "object") Object.assign(EV, saved);
} catch (e) {}
let urari = Array.isArray(EV.wishes) && EV.wishes.length ? EV.wishes.slice() : [
  "La mulți ani! Să fiți fericiți și sănătoși!",
  "Să curgă șampania și voie bună!",
  "Un pahar sus pentru voi!",
  "Să fie o seară de neuitat!"
];

function applyEventConfig() {
  const brand = (EV.brand || "").trim();
  const title = (EV.title || "EVENIMENT").trim();
  const sub = (EV.subtitle || "").trim();
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val == null ? "" : val;
  };
  set("evBrand", brand || " ");
  set("evTitle", title);
  set("clock", sub);
  set("msgWho", (EV.msgWho || "MESAJ").trim() || "MESAJ");
  set("guestTag", (EV.guestTag || "URARE INVITAT").trim());
  set("guestWho", (EV.guestWho || "așteptăm").trim());
  set("guestText", (EV.guestText || "Mesajul rămâne până la următorul invitat.").trim());
  set("voiceBrand", brand || title || "Event Board");
  const qr = document.getElementById("qrLines");
  if (qr) qr.innerHTML = ((EV.qrLine1 || "SCANEAZĂ").trim()) + "<br>" + ((EV.qrLine2 || "URARE").trim());
  document.title = (brand ? brand + " — " : "") + title;
  const first = urari[0];
  if (first) {
    const t = document.getElementById("text");
    if (t) t.textContent = first;
  }
}

function toDatetimeLocalValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
}

function openSettings() {
  document.getElementById("setBrand").value = EV.brand || "";
  document.getElementById("setTitle").value = EV.title || "";
  document.getElementById("setSub").value = EV.subtitle || "";
  document.getElementById("setTarget").value = toDatetimeLocalValue(EV.target);
  document.getElementById("setZero").value = EV.zeroText || "";
  document.getElementById("setMsgWho").value = EV.msgWho || "MESAJ";
  document.getElementById("setGuestTag").value = EV.guestTag || "URARE INVITAT";
  document.getElementById("setQr1").value = EV.qrLine1 || "SCANEAZĂ";
  document.getElementById("setQr2").value = EV.qrLine2 || "URARE + TOMBOLĂ";
  document.getElementById("settingsPanel").hidden = false;
}

function saveSettings() {
  const localVal = document.getElementById("setTarget").value;
  let target = "";
  if (localVal) {
    const d = new Date(localVal);
    if (!isNaN(d.getTime())) target = d.toISOString();
  }
  EV.brand = document.getElementById("setBrand").value.trim();
  EV.title = document.getElementById("setTitle").value.trim() || "EVENIMENT";
  EV.subtitle = document.getElementById("setSub").value.trim();
  EV.target = target;
  EV.zeroText = document.getElementById("setZero").value.trim() || "Să înceapă petrecerea!";
  EV.msgWho = document.getElementById("setMsgWho").value.trim() || "MESAJ";
  EV.guestTag = document.getElementById("setGuestTag").value.trim() || "URARE INVITAT";
  EV.qrLine1 = document.getElementById("setQr1").value.trim() || "SCANEAZĂ";
  EV.qrLine2 = document.getElementById("setQr2").value.trim() || "URARE";
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      brand: EV.brand,
      title: EV.title,
      subtitle: EV.subtitle,
      target: EV.target,
      zeroText: EV.zeroText,
      msgWho: EV.msgWho,
      guestTag: EV.guestTag,
      qrLine1: EV.qrLine1,
      qrLine2: EV.qrLine2
    }));
  } catch (e) {}
  applyEventConfig();
  document.getElementById("settingsPanel").hidden = true;
}

const state = {
  messages: true,
  names: false,
  tombola: false,
  slides: false,
  qr: true,
  voice: false,
  hold: 30000
};
let queue = [];
let showing = false;
let slideUrls = [];
let slideIdx = 0;
let db = null;
const wheelNames = [];
const WHEEL_MAX = 10;
const seenMsg = new Set();
const layoutKey = "tutti-layout-2027-size";

function isWedding(text, name) {
  return /nunt|miri|mireas|mirilor|miresei|mirelui/i.test((text || "") + " " + (name || ""));
}

function bootFirebase() {
  if (!window.TUUTI_FIREBASE || !window.firebase) return;
  if (!firebase.apps.length) firebase.initializeApp(window.TUUTI_FIREBASE);
  db = firebase.database();
  ["messages", "test_dj", "tuuti2027/messages"].forEach((path) => listenPath(path));
  db.ref("tuuti2027/settings").on("value", (snap) => {
    const v = snap.val();
    if (!v) return;
    Object.assign(state, v);
    applyState();
  });
}

function listenPath(path) {
  const ref = db.ref(path);
  ref.limitToLast(30).once("value", (snap) => {
    const old = new Set();
    snap.forEach((c) => old.add(c.key));
    ref.on("child_added", (c) => {
      if (old.has(c.key) || seenMsg.has(path + c.key)) return;
      seenMsg.add(path + c.key);
      takeFresh(c);
    });
  });
}

function rememberName(v) {
  if (!v || typeof v !== "object") return;
  const text = String(v.text || v.mesaj || "").trim();
  const name = String(v.name || v.author || "").trim();
  if (!name || name.length > 32) return;
  if (isWedding(text, name)) return;
  if (wheelNames.includes(name)) return;
  if (wheelNames.length >= WHEEL_MAX) return;
  wheelNames.push(name);
  const badge = document.getElementById("wheelCount");
  if (badge) badge.textContent = wheelNames.length + "/" + WHEEL_MAX;
}

function resetWheel() {
  wheelNames.length = 0;
  const badge = document.getElementById("wheelCount");
  if (badge) badge.textContent = "0/" + WHEEL_MAX;
  redrawWheels(0);
  const box = document.getElementById("tombola");
  if (box) box.classList.remove("on");
  spinning = false;
}

function takeFresh(snap) {
  const v = snap.val();
  if (!v || typeof v !== "object") return;
  const text = String(v.text || v.mesaj || "").trim();
  const name = String(v.name || v.author || "").trim();
  if (!text || text.length > 180) return;
  if (isWedding(text, name)) return;
  if (name) rememberName(v);
  redrawWheels(0);
  enqueue({ name, text, at: snap.key, live: true });
}

function enqueue(item) {
  if (item.live) {
    queue = queue.filter((m) => m.live);
    queue.unshift(item);
    showing = false;
    pump();
    return;
  }
  if (queue.some((m) => m.text === item.text)) return;
  queue.push(item);
  pump();
}

let voiceReady = false;
let roVoice = null;

function pickVoice() {
  const list = window.speechSynthesis ? speechSynthesis.getVoices() : [];
  roVoice = list.find((v) => /ro(-|_)?RO/i.test(v.lang))
    || list.find((v) => /romanian|romana/i.test(v.name))
    || list.find((v) => /^ro/i.test(v.lang))
    || null;
}

function unlockVoice() {
  const box = document.getElementById("voice-unlock");
  if (box) box.style.display = "none";
  voiceReady = true;
  if (!window.speechSynthesis) return;
  pickVoice();
  const label = (EV.brand || EV.title || "Voce").trim();
  const warm = new SpeechSynthesisUtterance(label + ".");
  warm.lang = "ro-RO";
  if (roVoice) warm.voice = roVoice;
  speechSynthesis.cancel();
  speechSynthesis.speak(warm);
}

function speak(text) {
  if (!state.voice || !voiceReady || !window.speechSynthesis || !text) return;
  pickVoice();
  if (!roVoice) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ro-RO";
  u.rate = 0.92;
  u.voice = roVoice;
  speechSynthesis.cancel();
  setTimeout(() => speechSynthesis.speak(u), 80);
}

document.getElementById("speakerBtn").onclick = () => {
  state.voice = !state.voice;
  const btn = document.getElementById("speakerBtn");
  btn.textContent = state.voice ? "🔊" : "🔇";
  btn.classList.toggle("off", !state.voice);
  if (!state.voice && window.speechSynthesis) speechSynthesis.cancel();
  if (state.voice) {
    voiceReady = true;
    const box = document.getElementById("voice-unlock");
    if (box) box.style.display = "none";
    const label = (EV.brand || EV.title || "").trim();
    speak(label ? ("Voce pornită. " + label + ".") : "Voce pornită.");
  }
};

document.getElementById("voice-unlock").addEventListener("click", unlockVoice);
if (window.speechSynthesis) {
  speechSynthesis.onvoiceschanged = pickVoice;
  pickVoice();
}

function showMessage(item) {
  if (item.live && item.name) {
    document.getElementById("guestWho").textContent = item.name;
    document.getElementById("guestText").textContent = item.text;
    speak(item.name + ". " + item.text);
    return;
  }
  document.getElementById("text").textContent = item.text;
  speak(item.text);
  burst();
}

async function pump() {
  if (showing) return;
  showing = true;
  while (queue.length && state.messages) {
    showMessage(queue.shift());
    await wait(state.hold);
  }
  if (!state.messages) queue = [];
  showing = false;
}

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

function applyState() {
  document.getElementById("qrBox").hidden = !state.qr;
  document.getElementById("slideWin").classList.toggle("on", state.slides && slideUrls.length > 0);
}

ch.onmessage = (ev) => {
  const m = ev.data || {};
  if (m.type === "settings") {
    Object.assign(state, m.settings);
    applyState();
  }
  if (m.type === "message") enqueue(m.item);
  if (m.type === "slides") {
    slideUrls = m.urls || [];
    slideIdx = 0;
    paintSlide();
    applyState();
  }
  if (m.type === "layout" && m.layout) applyLayout(m.layout);
};

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

function tick() {
  const clock = document.getElementById("clock");
  const count = document.getElementById("count");
  if (clock) clock.textContent = EV.subtitle || "";
  if (!EV.target) {
    count.textContent = "--:--:--";
    return;
  }
  const target = new Date(EV.target).getTime();
  if (isNaN(target)) {
    count.textContent = "--:--:--";
    return;
  }
  const diff = target - Date.now();
  if (diff <= 0) {
    count.textContent = EV.zeroText || "START";
    return;
  }
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const pad = (n) => String(n).padStart(2, "0");
  const d = Math.floor(h / 24);
  const hh = h % 24;
  count.textContent = d > 0 ? d + "z " + pad(hh) + ":" + pad(m) + ":" + pad(s) : pad(h) + ":" + pad(m) + ":" + pad(s);
}
setInterval(tick, 250);
tick();

let autoIdx = 0;
let autoTimer = null;
function startAuto() {
  clearInterval(autoTimer);
  const every = Number(document.getElementById("autoEvery").value || 30000);
  autoTimer = setInterval(() => {
    if (showing || queue.length || !state.messages) return;
    const text = urari[autoIdx % urari.length];
    autoIdx++;
    enqueue({ name: "", text, at: Date.now() });
  }, every);
}
document.getElementById("autoEvery").addEventListener("change", startAuto);
startAuto();

const prizes = [
  "Un toast din partea casei",
  "Dedicație: următoarea piesă e a lui",
  "Vine la pupitru și dă play",
  "Alege următorul stil, 2 minute"
];
const sliceColors = ["#e74c3c", "#f4f7fb", "#7eb6e8", "#f5b942"];
const sliceInk = ["#fff", "#e74c3c", "#16324f", "#16324f"];

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
  c.beginPath();
  c.roundRect(cx - r * 0.62, cy + r + 30, r * 1.24, 16, 8);
  c.fill();

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
  if (document.getElementById("tombola").classList.contains("on")) drawWheel(big, wheelNames, angle || 0);
}
redrawWheels(0);

let spinning = false;
document.getElementById("wheelBtn").onclick = () => {
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
document.getElementById("closeWheel").onclick = () => {
  document.getElementById("tombola").classList.remove("on");
  spinning = false;
};
document.getElementById("resetWheel").onclick = (ev) => {
  ev.stopPropagation();
  resetWheel();
};
const resetWheelDock = document.getElementById("resetWheelDock");
if (resetWheelDock) resetWheelDock.onclick = resetWheel;

const canvas = document.getElementById("fw");
const ctx = canvas.getContext("2d");
function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
resize();
addEventListener("resize", resize);
let parts = [];
function burst() {
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
frame();

const guestLink = window.TUUTI_GUEST_URL || new URL("guest.html", location.href).href;
document.getElementById("qrBox").hidden = false;
new QRCode(document.getElementById("qr"), { text: guestLink, width: 128, height: 128 });
bootFirebase();
applyState();

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
    fitText(el);
  });
}
applyLayout(JSON.parse(localStorage.getItem(layoutKey) || "{}"));

function fitText(el) {
  const h = el.getBoundingClientRect().height || 120;
  const w = el.getBoundingClientRect().width || 200;
  el.querySelectorAll(".brand, .show-title, .sub, .countdown, .who, .text, .tag, p").forEach((node) => {
    if (node.classList.contains("countdown")) node.style.fontSize = Math.max(28, h * 0.62) + "px";
    else if (node.classList.contains("show-title")) node.style.fontSize = Math.max(18, h * 0.34) + "px";
    else if (node.classList.contains("text")) node.style.fontSize = Math.max(16, Math.min(h * 0.28, w * 0.07)) + "px";
    else if (node.classList.contains("who")) node.style.fontSize = Math.max(16, h * 0.28) + "px";
    else if (node.classList.contains("brand")) node.style.fontSize = Math.max(12, h * 0.16) + "px";
    else node.style.fontSize = Math.max(11, h * 0.1) + "px";
  });
}

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
document.getElementById("editBtn").onclick = () => {
  editing = !editing;
  document.body.classList.toggle("editing", editing);
  document.getElementById("editBtn").textContent = editing ? "Gata" : "Editează";
};

document.querySelectorAll(".free").forEach((el) => {
  el.addEventListener("pointerdown", (ev) => {
    if (!editing) return;
    if (ev.target.closest && ev.target.closest("button") && el.id !== "wheelBtn" && !ev.target.classList.contains("handle") && !ev.target.classList.contains("handle-e") && !ev.target.classList.contains("handle-s")) return;
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
        fitText(el);
      }
    }
    function up() {
      fitText(el);
      saveLayout();
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", up);
    }
    addEventListener("pointermove", move);
    addEventListener("pointerup", up);
  });
});

document.getElementById("resetLayout").onclick = () => {
  localStorage.removeItem(layoutKey);
  document.querySelectorAll(".free").forEach((el) => {
    el.style.left = "";
    el.style.top = "";
    el.style.width = "";
    el.style.height = "";
    el.style.right = "";
    el.style.bottom = "";
    el.style.transform = "none";
    el.querySelectorAll(".brand, .show-title, .sub, .countdown, .who, .text, .tag, p").forEach((node) => {
      node.style.fontSize = "";
    });
  });
  ch.postMessage({ type: "layout", layout: {} });
};

const night = document.getElementById("night");
const bgPhoto = document.getElementById("bgPhoto");
const bgVideo = document.getElementById("bgVideo");
function setTheme(name) {
  night.className = "night " + (name || "auriu");
}
function clearCustomBg() {
  document.body.classList.remove("has-custom-bg");
  bgPhoto.classList.remove("on");
  bgPhoto.removeAttribute("src");
  bgVideo.classList.remove("on");
  bgVideo.pause();
  bgVideo.removeAttribute("src");
  try { bgVideo.load(); } catch (e) {}
}
document.getElementById("bgSelect").addEventListener("change", (ev) => {
  clearCustomBg();
  setTheme(ev.target.value);
});
document.getElementById("bgFile").addEventListener("change", (ev) => {
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
    bgVideo.playsInline = true;
    bgVideo.play().catch(() => {});
  } else {
    bgPhoto.src = url;
    bgPhoto.classList.add("on");
  }
});
document.getElementById("bgClear").onclick = () => {
  clearCustomBg();
  setTheme(document.getElementById("bgSelect").value || "auriu");
};
setTheme("auriu");

document.getElementById("settingsBtn").onclick = openSettings;
document.getElementById("setSave").onclick = saveSettings;
document.getElementById("setClose").onclick = () => {
  document.getElementById("settingsPanel").hidden = true;
};

document.getElementById("folderTv").addEventListener("change", async (ev) => {
  const files = [...ev.target.files].filter((f) => f.type.startsWith("image/")).slice(0, 40);
  slideUrls = await Promise.all(files.map((f) => new Promise((res) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.readAsDataURL(f);
  })));
  slideIdx = 0;
  state.slides = true;
  document.getElementById("folderInfo").textContent = slideUrls.length + " poze";
  document.getElementById("slideBtn").textContent = "Poze ON";
  paintSlide();
});

document.getElementById("slideBtn").onclick = () => {
  if (!slideUrls.length) {
    alert("Încarcă folderul de poze, apoi apasă Poze ON.");
    return;
  }
  state.slides = !state.slides;
  document.getElementById("slideBtn").textContent = state.slides ? "Poze ON" : "Poze OFF";
  document.getElementById("slideWin").classList.toggle("on", state.slides);
  if (state.slides) paintSlide();
};

document.getElementById("hideBtn").onclick = () => {
  document.getElementById("dock").classList.add("off");
  document.getElementById("showBtn").hidden = false;
};
document.getElementById("showBtn").onclick = () => {
  document.getElementById("dock").classList.remove("off");
  document.getElementById("showBtn").hidden = true;
};

async function goFullscreen() {
  if (!document.fullscreenElement) {
    try { await document.documentElement.requestFullscreen(); } catch (e) {}
  } else {
    try { await document.exitFullscreen(); } catch (e) {}
  }
}
document.getElementById("fsBtn").onclick = goFullscreen;

document.getElementById("previewBtn").onclick = async () => {
  saveLayout();
  let features = "popup=yes,width=1280,height=720";
  try {
    if (window.getScreenDetails) {
      const details = await window.getScreenDetails();
      const other = details.screens.find((s) => !s.isPrimary) || details.screens[0];
      if (other) {
        features = "popup=yes,left=" + other.availLeft + ",top=" + other.availTop
          + ",width=" + other.availWidth + ",height=" + other.availHeight;
      }
    }
  } catch (e) {}
  const w = window.open(location.pathname + location.search + "#tv", "tutti-tv", features);
  if (!w) alert("Browserul a blocat fereastra. Permite popup, apoi apasă iar Al doilea ecran.");
};
if (location.hash === "#tv") {
  document.getElementById("dock").classList.add("off");
  document.getElementById("showBtn").hidden = false;
  setTimeout(goFullscreen, 400);
}

document.getElementById("voiceTest").onclick = () => {
  voiceReady = true;
  const box = document.getElementById("voice-unlock");
  if (box) box.style.display = "none";
  state.voice = true;
  document.getElementById("speakerBtn").textContent = "🔊";
  document.getElementById("speakerBtn").classList.remove("off");
  speak(document.getElementById("text").textContent || ((EV.brand || "") + " " + (EV.title || "")).trim() || "La mulți ani!");
};

applyEventConfig();

