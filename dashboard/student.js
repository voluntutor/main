// ===== Import Firebase Modules =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

// ===== Firebase Config =====
const firebaseConfig = {
  apiKey: "AIzaSyCiiAfvZ25ChvpCVCbMj46dsCrZBYMGBpM",
  authDomain: "logintrial001.firebaseapp.com",
  projectId: "logintrial001",
  storageBucket: "logintrial001.firebasestorage.app",
  messagingSenderId: "419688887007",
  appId: "1:419688887007:web:013af1286ba6e7aff42f6a"
};

// ===== Initialize Firebase =====
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ===== DOM Elements =====
const userNameEl = document.getElementById("userName");
const userEmailEl = document.getElementById("userEmail");
const logoutBtn = document.getElementById("logoutBtn");
const fab = document.getElementById("fab");
const modal = document.getElementById("modalBackdrop");
const closeModal = document.getElementById("closeModal");
const sendRequest = document.getElementById("sendRequest");
const subjectSelect = document.getElementById("subjectSelect");
const teacherSelect = document.getElementById("teacherSelect");
const reqDate = document.getElementById("reqDate");
const reqTime = document.getElementById("reqTime");
const reqDetails = document.getElementById("reqDetails");
const toastEl = document.getElementById("toast");
const calendarGrid = document.getElementById("calendarGrid");
const weekLabel = document.getElementById("weekLabel");
const prevWeekBtn = document.getElementById("prevWeek");
const nextWeekBtn = document.getElementById("nextWeek");
const upcomingList = document.getElementById("upcomingList");

let currentUser;
let startOfWeekDate = getMonday(new Date());

// ===== Helper Functions =====
function getMonday(d) {
  d = new Date(d);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}
function addDays(d, n) {
  let x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function formatISO(d) {
  return d.toISOString().slice(0, 10);
}
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 3000);
}

// ===== Auth =====
onAuthStateChanged(auth, (user) => {
  if (!user) return (window.location.href = "../index.html");
  currentUser = user;
  userNameEl.textContent = user.displayName || user.email.split("@")[0];
  userEmailEl.textContent = user.email;
  loadDropdowns();
  renderWeek();
  loadSessions();
});

logoutBtn.onclick = () => {
  signOut(auth).then(() => (window.location.href = "../index.html"));
};

// ===== Populate Dropdowns =====
function loadDropdowns() {
  const subjects = ["French", "Spanish", "German", "Math", "Science"];
  const teachers = ["Mr. Hearty", "Mr. French"];

  // Subjects
  subjectSelect.innerHTML = "<option value=''>Select Subject</option>";
  subjects.forEach((subj) => {
    const opt = document.createElement("option");
    opt.value = subj;
    opt.textContent = subj;
    subjectSelect.appendChild(opt);
  });

  // Teachers
  teacherSelect.innerHTML = "<option value=''>Select Teacher</option>";
  teachers.forEach((teach) => {
    const opt = document.createElement("option");
    opt.value = teach;
    opt.textContent = teach;
    teacherSelect.appendChild(opt);
  });
}

// ===== Calendar =====
function renderWeek() {
  calendarGrid.innerHTML = "";
  const start = startOfWeekDate;
  const end = addDays(start, 6);
  weekLabel.textContent = `${start.toDateString().slice(4, 10)} — ${end
    .toDateString()
    .slice(4, 10)}`;
  for (let i = 0; i < 7; i++) {
    const day = addDays(start, i);
    const div = document.createElement("div");
    div.className = "day-col glass";
    div.innerHTML = `<div class='day-header'>${day.toLocaleDateString(undefined, {
      weekday: "short"
    })}<br>${day.getDate()}</div>
    <div class='day-slot' data-date='${formatISO(day)}'></div>`;
    calendarGrid.appendChild(div);
  }
}
prevWeekBtn.onclick = () => {
  startOfWeekDate = addDays(startOfWeekDate, -7);
  renderWeek();
  loadSessions();
};
nextWeekBtn.onclick = () => {
  startOfWeekDate = addDays(startOfWeekDate, 7);
  renderWeek();
  loadSessions();
};

// ===== Load & Render Sessions =====
async function loadSessions() {
  if (!currentUser) return;
  const q = query(collection(db, "requests"), where("studentEmail", "==", currentUser.email));
  onSnapshot(q, (snap) => {
    document.querySelectorAll(".day-slot").forEach((el) => (el.innerHTML = ""));
    upcomingList.innerHTML = "";
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      const card = document.createElement("div");
      card.className = "session-card";
      card.innerHTML = `
        <strong>${d.subject}</strong><br>
        ${d.teacher}<br>
        ${d.date} ${d.time}<br>
        <button class='btn-ghost' data-id='${docSnap.id}'>Cancel</button>
      `;
      const slot = document.querySelector(`.day-slot[data-date='${d.date}']`);
      if (slot) slot.appendChild(card);
      upcomingList.appendChild(card.cloneNode(true));
    });
    document.querySelectorAll(".btn-ghost").forEach((btn) => {
      btn.onclick = async () => {
        await deleteDoc(doc(db, "requests", btn.dataset.id));
        toast("Session cancelled");
      };
    });
  });
}

// ===== Modal =====
fab.onclick = () => modal.classList.remove("hidden");
closeModal.onclick = () => modal.classList.add("hidden");

// ===== Schedule Button =====
sendRequest.onclick = async () => {
  const subj = subjectSelect.value.trim();
  const teacher = teacherSelect.value.trim();
  const date = reqDate.value;
  const time = reqTime.value;
  const details = reqDetails.value.trim();

  if (!subj || !teacher || !date || !time) {
    return toast("Please fill in all required fields");
  }

  try {
    await addDoc(collection(db, "requests"), {
      studentEmail: currentUser.email,
      subject: subj,
      teacher: teacher,
      date,
      time,
      details,
      createdAt: new Date()
    });

    // Reset form
    subjectSelect.value = "";
    teacherSelect.value = "";
    reqDate.value = "";
    reqTime.value = "";
    reqDetails.value = "";

    modal.classList.add("hidden");
    toast("Session scheduled!");
    startConfetti();
  } catch (err) {
    console.error(err);
    toast("Error scheduling session");
  }
};

// ===== Confetti Animation =====
function startConfetti() {
  const canvas = document.getElementById("confettiCanvas");
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const pieces = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    r: 5 + Math.random() * 5,
    c: `hsl(${Math.random() * 360}, 100%, 60%)`,
    s: Math.random() * 3 + 2
  }));

  let frames = 0;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.c;
      ctx.fill();
    });
  }

  function update() {
    pieces.forEach((p) => {
      p.y += p.s;
      if (p.y > canvas.height) p.y = -10;
      p.x += Math.sin(frames / 10);
    });
    frames++;
  }

  function loop() {
    draw();
    update();
    if (frames < 200) requestAnimationFrame(loop);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  loop();
}
