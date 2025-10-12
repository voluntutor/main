// student.js — polished dashboard client
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  getFirestore, collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

/* -------------------------
   Firebase config (your app)
------------------------- */
const firebaseConfig = {
  apiKey: "AIzaSyCiiAfvZ25ChvpCVCbMj46dsCrZBYMGBpM",
  authDomain: "logintrial001.firebaseapp.com",
  projectId: "logintrial001",
  storageBucket: "logintrial001.appspot.com",
  messagingSenderId: "419688887007",
  appId: "1:419688887007:web:013af1286ba6e7aff42f6a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* -------------------------
   DOM refs (assigned after DOMContentLoaded)
------------------------- */
let logoutBtn, userNameEl, userEmailEl, subjectSelect, teacherSelect;
let reqDate, reqTime, reqDetails, sendRequest, clearForm;
let upcomingList, toastEl, calendarEl, monthLabel, prevMonthBtn, nextMonthBtn, themeToggle, confettiCanvas;

document.addEventListener("DOMContentLoaded", () => {
  // DOM references
  logoutBtn = document.getElementById("logoutBtn");
  userNameEl = document.getElementById("userName");
  userEmailEl = document.getElementById("userEmail");
  subjectSelect = document.getElementById("subjectSelect");
  teacherSelect = document.getElementById("teacherSelect");
  reqDate = document.getElementById("reqDate");
  reqTime = document.getElementById("reqTime");
  reqDetails = document.getElementById("reqDetails");
  sendRequest = document.getElementById("sendRequest");
  clearForm = document.getElementById("clearForm");
  upcomingList = document.getElementById("upcomingList");
  toastEl = document.getElementById("toast");
  calendarEl = document.getElementById("calendar");
  monthLabel = document.getElementById("monthLabel");
  prevMonthBtn = document.getElementById("prevMonth");
  nextMonthBtn = document.getElementById("nextMonth");
  themeToggle = document.getElementById("themeToggle");
  confettiCanvas = document.getElementById("confettiCanvas");

  // add dropdown items and event listeners
  loadDropdowns();
  setupEventListeners();

  // resize confetti canvas
  resizeConfettiCanvas();
  window.addEventListener("resize", resizeConfettiCanvas);
});

/* -------------------------
   small helpers
------------------------- */
function showToast(msg = "", t = 2200) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), t);
}
function clampToLocalISO(d) {
  if (!(d instanceof Date)) d = new Date(d);
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}
function formatDateShort(iso) { return new Date(iso + 'T00:00:00').toLocaleDateString(); }

/* -------------------------
   populate static dropdowns
------------------------- */
function loadDropdowns() {
  if (!subjectSelect || !teacherSelect) return;
  const subjects = ["French", "Spanish", "German", "Math", "Science"];
  const teachers = ["Mr. Hearty", "Mr. French"];

  subjectSelect.innerHTML = "<option value=''>Select Subject</option>";
  subjects.forEach(s => {
    const o = document.createElement("option"); o.value = s; o.textContent = s; subjectSelect.appendChild(o);
  });

  teacherSelect.innerHTML = "<option value=''>Select Teacher</option>";
  teachers.forEach(t => {
    const o = document.createElement("option"); o.value = t; o.textContent = t; teacherSelect.appendChild(o);
  });
}

/* -------------------------
   theme toggle + event wiring
------------------------- */
function setupEventListeners() {
  themeToggle?.addEventListener("click", () => {
    document.documentElement.classList.toggle("light-mode");
    showToast(document.documentElement.classList.contains("light-mode") ? "Light mode activated" : "Dark mode activated");
  });

  logoutBtn?.addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.href = "../index.html";
    } catch (err) {
      console.error("Logout error", err);
      showToast("Logout failed");
    }
  });

  clearForm?.addEventListener("click", () => {
    if (subjectSelect) subjectSelect.value = "";
    if (teacherSelect) teacherSelect.value = "";
    if (reqDate) reqDate.value = "";
    if (reqTime) reqTime.value = "";
    if (reqDetails) reqDetails.value = "";
    showToast("Form cleared");
  });

  sendRequest?.addEventListener("click", scheduleSession);

  // month nav
  prevMonthBtn?.addEventListener("click", () => {
    selectedMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1);
    renderCalendar(selectedMonth);
  });
  nextMonthBtn?.addEventListener("click", () => {
    selectedMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1);
    renderCalendar(selectedMonth);
  });

  // click on refresh
  document.getElementById("refreshBtn")?.addEventListener("click", () => {
    startSessionListener(true);
    showToast("Refreshing sessions");
  });
}

/* -------------------------
   Auth state & realtime listener
------------------------- */
let currentUser = null;
let selectedMonth = new Date();
let unsubscribeSessions = null;

onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "../index.html";
    return;
  }
  currentUser = user;
  userNameEl && (userNameEl.textContent = user.displayName || user.email.split("@")[0]);
  userEmailEl && (userEmailEl.textContent = user.email);

  // init session listener (real-time)
  startSessionListener();
  // initial render (empty until sessions arrive)
  renderCalendar(selectedMonth, []);
});

/* -------------------------
   schedule session (writes `studentUid` to match rules)
------------------------- */
async function scheduleSession() {
  if (!currentUser) { showToast("Sign in required"); return; }
  const subject = subjectSelect?.value;
  const teacher = teacherSelect?.value;
  const date = reqDate?.value;
  const time = reqTime?.value;
  const details = reqDetails?.value?.trim() || "";

  if (!subject || !teacher || !date || !time) { showToast("Please fill all fields"); return; }

  try {
    await addDoc(collection(db, "requests"), {
      studentEmail: currentUser.email,
      studentUid: currentUser.uid,    // matches your Firestore rule
      subject,
      teacher,
      date, // format YYYY-MM-DD
      time, // HH:MM
      details,
      createdAt: serverTimestamp()
    });

    // feedback & confetti
    showToast("Scheduled — saved to Firestore");
    fireConfettiBurst();

    // clear
    subjectSelect.value = "";
    teacherSelect.value = "";
    reqDate.value = "";
    reqTime.value = "";
    reqDetails.value = "";

  } catch (err) {
    console.error("Scheduling error:", err);
    showToast("Error scheduling — check Firestore rules/console");
  }
}

/* -------------------------
   real-time sessions listener
   queries by studentUid and updates calendar & upcoming list
------------------------- */
function startSessionListener(force = false) {
  if (!currentUser) return;
  if (unsubscribeSessions && !force) return; // already listening
  if (typeof unsubscribeSessions === "function") unsubscribeSessions();

  const q = query(collection(db, "requests"), where("studentUid", "==", currentUser.uid), orderBy("createdAt", "desc"));
  unsubscribeSessions = onSnapshot(q, snap => {
    const sessions = [];
    snap.forEach(docSnap => sessions.push({ id: docSnap.id, ...docSnap.data() }));
    // render
    renderUpcoming(sessions);
    renderCalendar(selectedMonth, sessions);
  }, err => {
    console.error("Realtime snapshot error:", err);
    showToast("Realtime error (see console)");
  });
}

/* -------------------------
   render upcoming list
------------------------- */
function renderUpcoming(sessions) {
  if (!upcomingList) return;
  upcomingList.innerHTML = "";
  if (!sessions.length) {
    const empty = document.createElement("div");
    empty.className = "muted small";
    empty.textContent = "No upcoming sessions";
    upcomingList.appendChild(empty);
    return;
  }

  sessions.forEach(s => {
    const item = document.createElement("div"); item.className = "upcoming-item";
    const info = document.createElement("div"); info.className = "info";
    const title = document.createElement("div"); title.innerHTML = `<strong>${escapeHtml(s.subject)}</strong> with ${escapeHtml(s.teacher)}`;
    const meta = document.createElement("div"); meta.className = "meta muted"; meta.textContent = `${formatDateShort(s.date)} • ${s.time}`;
    info.appendChild(title); info.appendChild(meta);

    const actions = document.createElement("div");
    const cancelBtn = document.createElement("button"); cancelBtn.className = "btn-small"; cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", async () => {
      try { await deleteDoc(doc(db, "requests", s.id)); showToast("Cancelled"); }
      catch (err) { console.error("Cancel failed", err); showToast("Cancel failed"); }
    });

    actions.appendChild(cancelBtn);
    item.appendChild(info); item.appendChild(actions);
    upcomingList.appendChild(item);
  });
}

/* -------------------------
   calendar rendering
   shows booked sessions on the correct date (bookedMap)
------------------------- */
function renderCalendar(targetDate, sessions = []) {
  if (!calendarEl) return;
  calendarEl.innerHTML = "";
  const first = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
  const month = targetDate.getMonth(), year = targetDate.getFullYear();
  monthLabel && (monthLabel.textContent = first.toLocaleString(undefined, { month: 'long', year: 'numeric' }));

  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // group sessions by date string (YYYY-MM-DD)
  const bookedMap = {};
  sessions.forEach(s => {
    if (!s.date) return;
    if (!bookedMap[s.date]) bookedMap[s.date] = [];
    bookedMap[s.date].push(s);
  });

  // create blanks for first week
  for (let i = 0; i < startDay; i++) {
    const blank = document.createElement("div"); blank.className = "day"; blank.style.opacity = "0.45"; calendarEl.appendChild(blank);
  }

  const todayISO = clampToLocalISO(new Date());

  // days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    const iso = clampToLocalISO(dateObj);
    const dayEl = document.createElement("div"); dayEl.className = "day";
    if (iso === todayISO) dayEl.classList.add("today");

    const header = document.createElement("div"); header.className = "date";
    const num = document.createElement("div"); num.className = "num"; num.textContent = d;
    const wk = document.createElement("div"); wk.className = "small muted"; wk.textContent = dateObj.toLocaleString(undefined, { weekday: 'short' });
    header.appendChild(num); header.appendChild(wk);
    dayEl.appendChild(header);

    const items = document.createElement("div"); items.className = "items";

    if (bookedMap[iso]) {
      // show up to 3 sessions briefly
      bookedMap[iso].slice(0, 3).forEach(s => {
        const sEl = document.createElement("div"); sEl.className = "session";
        sEl.innerHTML = `<div class="subject">${escapeHtml(s.subject)}</div><div class="meta muted">${escapeHtml(s.time)} • ${escapeHtml(s.teacher)}</div>`;
        items.appendChild(sEl);
      });
      // booked dot
      const dot = document.createElement("span"); dot.className = "dot booked"; header.prepend(dot);
    } else if (iso === todayISO) {
      const dot = document.createElement("span"); dot.className = "dot today"; header.prepend(dot);
    }

    // click to prefill
    dayEl.addEventListener("click", () => {
      reqDate && (reqDate.value = iso);
      dayEl.animate([{ transform: 'scale(1.02)' }, { transform: 'scale(1)' }], { duration: 220, easing: 'cubic-bezier(.2,.9,.2,1)' });
      showToast(`Date chosen: ${iso}`, 1100);
      if (window.innerWidth < 900) document.querySelector('form#requestForm')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    dayEl.appendChild(items);
    calendarEl.appendChild(dayEl);
  }

  // trailing blanks to align grid
  const totalChildren = calendarEl.children.length;
  const remainder = (7 - (totalChildren % 7)) % 7;
  for (let i = 0; i < remainder; i++) { const b = document.createElement("div"); b.className = "day"; b.style.opacity = "0.45"; calendarEl.appendChild(b); }
}

/* -------------------------
   confetti helpers
   uses canvas-confetti library included in HTML
------------------------- */
function resizeConfettiCanvas() {
  // canvas provided for other visuals — canvas-confetti library creates its own canvas internally,
  // but we still size our canvas for consistency if you want custom draws later.
  const c = confettiCanvas;
  if (!c) return;
  c.width = window.innerWidth;
  c.height = window.innerHeight;
}
function fireConfettiBurst() {
  try {
    // a little two-sided burst for feel
    const duration = 1400;
    const end = Date.now() + duration;
    (function frame() {
      confetti({ particleCount: 10, spread: 55, origin: { x: 0.1, y: 0.45 } });
      confetti({ particleCount: 10, spread: 55, origin: { x: 0.9, y: 0.45 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  } catch (err) {
    console.warn("Confetti library unavailable:", err);
  }
}

/* -------------------------
   utilities
------------------------- */
function escapeHtml(str = "") {
  return String(str).replace(/[&<>"'`=\/]/g, s => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;' })[s]);
}
