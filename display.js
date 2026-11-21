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
  return /nunt|miri|mireas|mirilor|miresei|mirelui|ninuta|ninuța|nunuța/i.test((text || "") + " " + (name || ""));
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

// NOTE: remainder of file continues in second push if truncated - full file from local
console.error("INCOMPLETE_DISPLAY_JS");
