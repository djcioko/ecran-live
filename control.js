const ch = new BroadcastChannel("tuuti-revelion-2027");
const settings = {
  messages: true,
  names: false,
  tombola: false,
  slides: false,
  qr: true,
  voice: true,
  hold: 30000
};
let db = null;
let pool = [];

function bootFirebase() {
  if (!window.TUUTI_FIREBASE || !window.firebase) {
    document.getElementById("status").textContent = "Fără Firebase: testul merge pe același laptop. Pentru telefoane, lipește config-ul în config.js.";
    return;
  }
  if (!firebase.apps.length) firebase.initializeApp(window.TUUTI_FIREBASE);
  db = firebase.database();
  document.getElementById("status").textContent = "Firebase legat. Telefoanele scriu direct pe TV.";
  db.ref("tuuti2027/guests").on("value", (snap) => {
    pool = [];
    snap.forEach((c) => {
      const v = c.val();
      if (v && v.tombola && v.name) pool.push(v.name);
    });
    document.getElementById("pool").textContent = pool.length + " înscriși la tombolă";
    ch.postMessage({ type: "names", list: uniqueNames(snap) });
  });
}

function uniqueNames(snap) {
  const set = [];
  snap.forEach((c) => {
    const n = (c.val() || {}).name;
    if (n && !set.includes(n)) set.push(n);
  });
  return set;
}

function pushSettings() {
  settings.messages = document.getElementById("tMsg").checked;
  settings.names = document.getElementById("tNames").checked;
  settings.tombola = document.getElementById("tTomb").checked;
  settings.slides = document.getElementById("tSlide").checked;
  settings.qr = document.getElementById("tQr").checked;
  settings.voice = document.getElementById("tVoice").checked;
  settings.hold = Number(document.getElementById("hold").value);
  ch.postMessage({ type: "settings", settings });
  if (db) db.ref("tuuti2027/settings").set(settings);
}

["tMsg", "tNames", "tTomb", "tSlide", "tQr", "tVoice", "hold"].forEach((id) => {
  document.getElementById(id).addEventListener("change", pushSettings);
});

document.getElementById("openTv").onclick = () => {
  const w = window.open("index.html", "tuuti-tv", "noopener,width=1280,height=720");
  if (!w) alert("Browserul a blocat fereastra. Permite popup pentru pagina asta.");
  setTimeout(pushSettings, 600);
};

function renderQr() {
  const box = document.getElementById("qr");
  box.innerHTML = "";
  const custom = document.getElementById("publicUrl").value.trim();
  const link = custom || new URL("guest.html", location.href).href;
  new QRCode(box, { text: link, width: 180, height: 180 });
}
document.getElementById("saveUrl").onclick = renderQr;
renderQr();

document.getElementById("folder").addEventListener("change", async (ev) => {
  const files = [...ev.target.files].filter((f) => f.type.startsWith("image/")).slice(0, 40);
  const urls = [];
  for (const f of files) urls.push(await fileToData(f));
  document.getElementById("folderInfo").textContent = urls.length + " poze încărcate. Bifează slideshow.";
  ch.postMessage({ type: "slides", urls });
});

function fileToData(file) {
  return new Promise((res) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.readAsDataURL(file);
  });
}

document.getElementById("draw").onclick = () => {
  if (!settings.tombola) {
    alert("Pornește tombola (ON) înainte să extragi.");
    return;
  }
  if (!pool.length) {
    alert("Nimeni nu s-a înscris încă. QR-ul e pe TV, bifa e pe telefon.");
    return;
  }
  const name = pool[Math.floor(Math.random() * pool.length)];
  ch.postMessage({ type: "draw", name });
  if (db) db.ref("tuuti2027/draw").set({ name, at: Date.now() });
};

document.getElementById("hideDraw").onclick = () => {
  ch.postMessage({ type: "draw", name: "" });
  if (db) db.ref("tuuti2027/draw").remove();
};

document.getElementById("sendTest").onclick = () => {
  const item = {
    name: document.getElementById("tn").value.trim(),
    text: document.getElementById("tm").value.trim(),
    at: Date.now()
  };
  if (!item.text) return;
  ch.postMessage({ type: "message", item });
  if (db) db.ref("tuuti2027/messages").push(item);
};

bootFirebase();
pushSettings();
