const err = document.getElementById("err");
let db = null;

if (!window.TUUTI_FIREBASE || !window.firebase) {
  err.textContent = "Pagina nu are încă Firebase.";
} else {
  if (!firebase.apps.length) firebase.initializeApp(window.TUUTI_FIREBASE);
  db = firebase.database();
}

document.getElementById("f").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const name = document.getElementById("name").value.trim().slice(0, 32);
  const text = document.getElementById("msg").value.trim().slice(0, 140);
  const tombola = document.getElementById("tomb").checked;
  if (!db) return;
  const at = Date.now();
  await db.ref("messages").push({ author: name, text, timestamp: new Date().toLocaleString("ro-RO") });
  await db.ref("tuuti2027/messages").push({ name, text, at });
  await db.ref("tuuti2027/guests").push({ name, text, tombola, at });
  document.getElementById("f").hidden = true;
  document.getElementById("ok").hidden = false;
});
