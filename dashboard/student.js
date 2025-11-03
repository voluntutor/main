// student.js — VolunTutor Dashboard (complete, merged, and extended)
// Put at /dashboard/student.js and load as <script type="module" src="student.js"></script>
//
// This file preserves your original features and adds:
//  - Subject -> Level dynamic dropdown (populateLevels())
//  - Optional fields: studentEmail, gradeLevel, preferredTutor (wired to UI & payload)
//  - Confetti burst on successful scheduling (prefers canvas-confetti library, fallback particle system)
//  - Keeps Firebase modular imports, auth, Firestore realtime listeners, calendar, overlay, theme, toasts
//
// IMPORTANT: Ensure your HTML includes matching IDs used below (levelSelect, studentEmail, gradeLevel, preferredTutor, etc.)

// -------------------------------
// Firebase imports (modular v10+)
// -------------------------------
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
  orderBy,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  doc,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

// -------------------------------
// Firebase config (your project)
// -------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyCiiAfvZ25ChvpCVCbMj46dsCrZBYMGBpM",
  authDomain: "logintrial001.firebaseapp.com",
  projectId: "logintrial001",
  storageBucket: "logintrial001.appspot.com",
  messagingSenderId: "419688887007",
  appId: "1:419688887007:web:013af1286ba6e7aff42f6a"
};

// initialize firebase app
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// -------------------------------
// Globals & state
// -------------------------------
let currentUser = null;
let allSessions = []; // array of sessions fetched from Firestore for current user
let unsubscribeSessions = null; // snapshot unsubscribe function

let selectedMonth = new Date(); // the Date object for the visible month on the calendar

// DOM refs (populated on DOMContentLoaded)
let logoutBtn = null;
let userNameEl = null;
let userEmailEl = null;
let logoImg = null;
let subjectSelect = null;
let levelSelect = null;
let teacherSelect = null;
let reqDate = null;
let reqTime = null;
let reqDetails = null;
let sendRequest = null;
let clearForm = null;
let upcomingList = null;
let toastEl = null;
let calendarEl = null;
let monthLabel = null;
let prevMonthBtn = null;
let nextMonthBtn = null;
let themeToggle = null;
let requestForm = null;
let studentEmailInput = null;
let gradeLevelInput = null;
let preferredTutorInput = null;

// confetti canvas & state
let confettiCanvas = null;
let confettiCtx = null;
let confettiParticles = [];
let confettiRAF = null;

// day overlay
let dayOverlay = null;

// -------------------------------
// Feature detection
// -------------------------------
const supportsNotification = ("Notification" in window);
const supportsLocalStorage = ("localStorage" in window);

// -------------------------------
// Subject -> Level mapping (added)
// -------------------------------
const levelsBySubject = {
  'French': ['French 1','French 2','French 3','Honors French','AP French'],
  'German': ['German 1','German 2','German 3','Honors German','AP German'],
  'Spanish': ['Spanish 1','Spanish 2','Spanish 3','Honors Spanish','AP Spanish'],
  'Physics': ['Conceptual Physics','Physics Honors','AP Physics 1','AP Physics 2','AP Physics C'],
  'Math': ['Algebra I','Geometry','Algebra II','Precalculus','Honors','AP Calculus','AP Statistics']
};

// -------------------------------
// Utility helpers
// -------------------------------

/**
 * showToast
 * Lightweight toast message. Adds CSS class "show" to #toast for duration ms.
 */
function showToast(message = "", duration = 2800) {
  if (!toastEl) {
    console.log("toast:", message);
    return;
  }
  toastEl.textContent = message;
  toastEl.classList.add("show");
  // subtle pulse for noticed feedback
  toastEl.classList.add("pulse");
  if (toastEl._hideTimer) clearTimeout(toastEl._hideTimer);
  toastEl._hideTimer = setTimeout(() => {
    toastEl.classList.remove("show");
    toastEl.classList.remove("pulse");
  }, duration);
}

/**
 * formatISO(date)
 * Accepts a Date or string; returns 'YYYY-MM-DD' local iso (adjusts for timezone)
 */
function formatISO(date) {
  if (!(date instanceof Date)) date = new Date(date);
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date - tzOffset).toISOString().slice(0, 10);
}

/**
 * niceDate(iso)
 * Accepts 'YYYY-MM-DD' and returns a short readable string
 */
function niceDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

/**
 * niceTime(hhmm)
 * Accepts 'HH:MM' and returns a localized time string
 */
function niceTime(hhmm) {
  if (!hhmm) return "";
  const [hh, mm] = hhmm.split(":").map(x => parseInt(x, 10));
  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/**
 * escapeHtml - small escape to guard risk when injecting text
 */
function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * sleep(ms) - utility returning a Promise that resolves after ms
 */
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

// -------------------------------
// DOM init
// -------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  // Acquire DOM refs (if some are missing code will still try to proceed)
  logoutBtn = document.getElementById("logoutBtn");
  userNameEl = document.getElementById("userName");
  userEmailEl = document.getElementById("userEmail");
  logoImg = document.getElementById("logoImg") || document.querySelector("#logo img") || null;
  subjectSelect = document.getElementById("subjectSelect");
  levelSelect = document.getElementById("levelSelect");
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
  requestForm = document.getElementById("requestForm");
  studentEmailInput = document.getElementById("studentEmail");
  gradeLevelInput = document.getElementById("gradeLevel");
  preferredTutorInput = document.getElementById("preferredTutor");

  // Make sure calendar is visible as square (CSS should handle aspect-ratio but this ensures fallback)
  if (calendarEl) {
    calendarEl.style.display = "grid";
    calendarEl.style.gridTemplateColumns = "repeat(7, 1fr)";
    calendarEl.style.gap = "10px";
  }

  // Initialize confetti canvas (creates if missing)
  initConfettiCanvas();

  // Load dropdowns (attempt Firestore classes collection, otherwise static)
  await populateDropdowns();

  // Wire UI interactions (buttons, theme)
  wireUI();

  // Wire subject->level dynamic population (added)
  if (subjectSelect && levelSelect) {
    subjectSelect.addEventListener('change', populateLevels);
    // If subject already has value (e.g., from Firestore), populate on load
    if (subjectSelect.value) populateLevels();
  }

  // Render initial placeholder calendar while Firestore loads
  renderCalendar(selectedMonth, []);

  // Auth listener will start the realtime session listener and update UI
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      // Not signed in -> redirect to main login page
      try { window.location.href = "../index.html"; } catch (e) { console.warn("Redirect failed", e); }
      return;
    }
    currentUser = user;
    if (userNameEl) userNameEl.textContent = user.displayName || user.email.split("@")[0];
    if (userEmailEl) userEmailEl.textContent = user.email;

    // apply theme from localStorage (if any)
    applySavedTheme();

    // start real-time listener for user's sessions
    startRealtimeListener();
  });
});

// -------------------------------
// Dropdown population (keeps your Firestore attempt, falls back to static)
// -------------------------------
async function populateDropdowns() {
  // Try to load from Firestore collection `classes` with fields { subject, teacher }
  let loadedFromFirestore = false;
  try {
    const colRef = collection(db, "classes");
    const docs = await getDocs(colRef);
    if (!docs.empty) {
      // collect unique subjects and teachers
      const subjects = new Set();
      const teachers = new Set();
      docs.forEach(d => {
        const data = d.data();
        if (data.subject) subjects.add(data.subject);
        if (data.teacher) teachers.add(data.teacher);
      });
      if (subjectSelect) {
        subjectSelect.innerHTML = "<option value=''>Select Subject</option>";
        for (const s of Array.from(subjects)) {
          const opt = document.createElement("option");
          opt.value = s; opt.textContent = s;
          subjectSelect.appendChild(opt);
        }
      }
      if (teacherSelect) {
        teacherSelect.innerHTML = "<option value=''>Select Teacher</option>";
        for (const t of Array.from(teachers)) {
          const opt = document.createElement("option");
          opt.value = t; opt.textContent = t;
          teacherSelect.appendChild(opt);
        }
      }
      loadedFromFirestore = true;
    }
  } catch (err) {
    console.warn("populateDropdowns: Firestore read failed, falling back to static lists", err);
  }

  // fallback static options (if Firestore didn't populate anything)
  if (!loadedFromFirestore) {
    const staticSubjects = ["French", "Spanish", "German", "Math", "Science"];
    const staticTeachers = ["Mr. Hearty", "Ms. Smith"];
    if (subjectSelect) {
      // preserve existing options if any, otherwise replace
      subjectSelect.innerHTML = "<option value=''>Select Subject</option>";
      for (const s of staticSubjects) {
        const opt = document.createElement("option"); opt.value = s; opt.textContent = s;
        subjectSelect.appendChild(opt);
      }
    }
    if (teacherSelect) {
      teacherSelect.innerHTML = "<option value=''>Select Teacher</option>";
      for (const t of staticTeachers) {
        const opt = document.createElement("option"); opt.value = t; opt.textContent = t;
        teacherSelect.appendChild(opt);
      }
    }
  }
}

// -------------------------------
// Populate Levels based on subject selection (added)
function populateLevels() {
  if (!subjectSelect || !levelSelect) return;
  const subj = subjectSelect.value;
  levelSelect.innerHTML = '<option value="">Select Level</option>';
  (levelsBySubject[subj] || []).forEach(l=>{
    const opt = document.createElement('option');
    opt.value = l;
    opt.textContent = l;
    levelSelect.appendChild(opt);
  });
}
// -------------------------------

// -------------------------------
// UI wiring & event listeners
// -------------------------------
function wireUI() {
  // Theme toggle
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      toggleTheme();
    });
  }
  // Keyboard 't' also toggles theme (optional)
  document.addEventListener("keydown", (ev) => {
    if (ev.key.toLowerCase() === "t") {
      // avoid toggling when typing in inputs
      if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA" || document.activeElement.isContentEditable)) return;
      toggleTheme();
    }
  });

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await signOut(auth);
        showToast("Signed out");
        window.location.href = "../index.html";
      } catch (err) {
        console.error("Sign out failed", err);
        showToast("Sign out failed");
      }
    });
  }

  // Send request (schedule)
  if (sendRequest) {
    sendRequest.addEventListener("click", async (e) => {
      e.preventDefault();
      await scheduleRequest();
    });
  }

  // Clear form
  if (clearForm) {
    clearForm.addEventListener("click", (e) => {
      e.preventDefault();
      clearRequestForm();
      showToast("Form cleared");
    });
  }

  // Month nav
  if (prevMonthBtn) prevMonthBtn.addEventListener("click", () => {
    selectedMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1);
    renderCalendar(selectedMonth, allSessions);
  });
  if (nextMonthBtn) nextMonthBtn.addEventListener("click", () => {
    selectedMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1);
    renderCalendar(selectedMonth, allSessions);
  });

  // Click outside day overlay closes it:
  document.addEventListener("click", (ev) => {
    if (!dayOverlay) return;
    if (dayOverlay.classList.contains("visible")) {
      const panel = dayOverlay.querySelector(".overlay-panel");
      if (panel && !panel.contains(ev.target)) closeDayOverlay();
    }
  });

  // Form enter-submit convenience: if pressing Enter inside time input, schedule
  if (reqTime) {
    reqTime.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        sendRequest?.click();
      }
    });
  }
}

// small helper to clear the form (resets optional fields too)
function clearRequestForm() {
  if (subjectSelect) subjectSelect.value = "";
  if (levelSelect) levelSelect.innerHTML = '<option value="">Select Level</option>';
  if (teacherSelect) teacherSelect.value = "";
  if (reqDate) reqDate.value = "";
  if (reqTime) reqTime.value = "";
  if (reqDetails) reqDetails.value = "";
  if (studentEmailInput) studentEmailInput.value = "";
  if (gradeLevelInput) gradeLevelInput.value = "";
  if (preferredTutorInput) preferredTutorInput.value = "";
}

// -------------------------------
// Firestore: real-time listener for `requests` where studentUid == currentUser.uid
// -------------------------------
function startRealtimeListener() {
  if (!currentUser) return;
  // cleanup old
  if (typeof unsubscribeSessions === "function") {
    try { unsubscribeSessions(); } catch (e) { /* ignore */ }
    unsubscribeSessions = null;
  }

  try {
    const q = query(
      collection(db, "requests"),
      where("studentUid", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );
    unsubscribeSessions = onSnapshot(q, (snap) => {
      const sessions = [];
      snap.forEach(docSnap => {
        sessions.push({ id: docSnap.id, ...docSnap.data() });
      });
      allSessions = sessions;
      renderUpcoming(sessions);
      renderCalendar(selectedMonth, sessions);
    }, (err) => {
      console.error("startRealtimeListener onSnapshot error", err);
      showToast("Realtime sync error (check console)");
    });
  } catch (err) {
    console.error("startRealtimeListener error", err);
    showToast("Could not start realtime listener");
  }
}

// -------------------------------
// scheduleRequest() - validate form and write to Firestore
// Must include field `studentUid` to match your Firestore rules.
// -------------------------------
async function scheduleRequest() {
  if (!currentUser) {
    showToast("You must be logged in to schedule");
    return;
  }
  if (!subjectSelect || !teacherSelect || !reqDate || !reqTime) {
    showToast("Form is incomplete");
    return;
  }

  const subject = subjectSelect.value?.trim();
  const level = levelSelect ? levelSelect.value?.trim() : "";
  const teacher = teacherSelect.value?.trim();
  const date = reqDate.value;   // expected 'YYYY-MM-DD'
  const time = reqTime.value;   // expected 'HH:MM'
  const details = reqDetails?.value?.trim() || "";

  // optional fields
  const studentEmailVal = studentEmailInput?.value?.trim() || currentUser.email || "";
  const gradeLevelVal = gradeLevelInput?.value?.trim() || "";
  const preferredTutorVal = preferredTutorInput?.value?.trim() || "";

  if (!subject || !teacher || !date || !time) {
    showToast("Please fill all required fields (subject, teacher, date, time)");
    return;
  }

  // Basic format validation (not exhaustive)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    showToast("Invalid date format (use YYYY-MM-DD)");
    return;
  }
  if (!/^\d{2}:\d{2}$/.test(time)) {
    showToast("Invalid time format (use HH:MM)");
    return;
  }

  // Construct payload matching your Firestore rules
  const payload = {
    studentUid: currentUser.uid,        // required by rules
    studentEmail: studentEmailVal,
    subject,
    level,
    teacher,
    date,                               // YYYY-MM-DD
    time,                               // HH:MM
    details,
    preferredTutor: preferredTutorVal || null,
    gradeLevel: gradeLevelVal || null,
    createdAt: serverTimestamp()
  };

  try {
    // write
    await addDoc(collection(db, "requests"), payload);

    // success UX
    showToast("Session scheduled!");
    // attempt confetti
    try { startConfetti(); } catch (e) { /* ignore */ }

    // clear form
    clearRequestForm();

    // note: the real-time listener will pick up the new document and update UI
  } catch (err) {
    console.error("scheduleRequest: Firestore write failed", err);
    // If write failed, surface detailed reason if possible
    if (err?.code) {
      showToast(`Error scheduling (${err.code}) — check Firestore rules`);
    } else {
      showToast("Error scheduling — check Firestore rules (console)");
    }
  }
}

// -------------------------------
// Render upcoming sessions list
// -------------------------------
function renderUpcoming(sessions) {
  if (!upcomingList) return;
  upcomingList.innerHTML = "";

  if (!sessions || sessions.length === 0) {
    const empty = document.createElement("div");
    empty.className = "muted small empty";
    empty.textContent = "No upcoming sessions";
    upcomingList.appendChild(empty);
    return;
  }

  // Render a compact card for each session
  for (const s of sessions) {
    const card = document.createElement("div");
    card.className = "upcoming-card glass-panel card";
    // left content
    const left = document.createElement("div");
    left.className = "up-left";
    left.innerHTML = `<div class="subj">${escapeHtml(s.subject)} ${s.level ? `• ${escapeHtml(s.level)}` : ""}</div><div class="meta muted">${escapeHtml(s.teacher)}</div>`;

    // right content
    const right = document.createElement("div");
    right.className = "up-right";
    right.innerHTML = `<div class="time">${escapeHtml(s.date)} • ${escapeHtml(s.time)}</div>`;

    // actions
    const actions = document.createElement("div"); actions.className = "up-actions row";
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "btn-ghost small";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", async () => {
      try {
        await deleteDoc(doc(db, "requests", s.id));
        showToast("Cancelled");
      } catch (err) {
        console.error("Cancel error", err);
        showToast("Cancel failed");
      }
    });
    const remindBtn = document.createElement("button");
    remindBtn.className = "btn-ghost small";
    remindBtn.textContent = "Remind 30m";
    remindBtn.addEventListener("click", () => setReminder30min(s.date, s.time));

    actions.appendChild(remindBtn);
    actions.appendChild(cancelBtn);

    // optional meta display: studentEmail, gradeLevel
    const metaExtras = document.createElement("div");
    metaExtras.className = "meta-extras small muted";
    metaExtras.style.marginTop = "6px";
    const extras = [];
    if (s.studentEmail) extras.push(escapeHtml(s.studentEmail));
    if (s.gradeLevel) extras.push(escapeHtml(s.gradeLevel));
    if (extras.length) metaExtras.textContent = extras.join(" • ");

    // assemble card
    const leftWrap = document.createElement("div"); leftWrap.style.flex = "1";
    leftWrap.appendChild(left);
    leftWrap.appendChild(metaExtras);

    const rightWrap = document.createElement("div");
    rightWrap.style.display = "flex";
    rightWrap.style.flexDirection = "column";
    rightWrap.style.alignItems = "flex-end";
    rightWrap.appendChild(right);
    rightWrap.appendChild(actions);

    card.appendChild(leftWrap);
    card.appendChild(rightWrap);

    upcomingList.appendChild(card);
  }
}

// -------------------------------
// Render calendar (month view) — squares assumed in CSS
// - sessions: array of session objects
// -------------------------------
function renderCalendar(monthDate, sessions = []) {
  if (!calendarEl) return;

  // make sure sessions is an array
  sessions = sessions || [];

  // clear
  calendarEl.innerHTML = "";

  // compute year/month, first day offset, number of days
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const startDay = first.getDay(); // 0..6 (Sunday start)
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // update month label (friendly)
  if (monthLabel) monthLabel.textContent = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  // map sessions by date
  const map = {};
  for (const s of sessions) {
    if (!s.date) continue;
    if (!map[s.date]) map[s.date] = [];
    map[s.date].push(s);
  }

  // blank cells before first
  for (let i = 0; i < startDay; i++) {
    const blank = document.createElement("div");
    blank.className = "cal-cell blank";
    blank.innerHTML = `<div class="cal-date muted"> </div>`; // blank number
    calendarEl.appendChild(blank);
  }

  const todayISO = formatISO(new Date());

  // day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month, d);
    const iso = formatISO(dt);
    const cell = document.createElement('div');
    cell.className = 'cal-cell';
    cell.setAttribute('data-date', iso);
    if (iso === todayISO) cell.classList.add('today');

    const header = document.createElement('div');
    header.className = 'cal-date';
    header.innerHTML = `<div class="cal-date-num">${d}</div>`;

    const items = document.createElement('div');
    items.className = 'items';

    // if there are sessions that day, render up to 3 mini items
    const daySessions = map[iso] || [];
    if (daySessions.length > 0) {
      // add a booked indicator (dot)
      const dot = document.createElement("span");
      dot.className = "dot booked";
      header.prepend(dot);

      for (let i = 0; i < Math.min(3, daySessions.length); i++) {
        const s = daySessions[i];
        const mini = document.createElement("div");
        mini.className = "session mini";
        mini.innerHTML = `<div class="msub">${escapeHtml(s.subject)}${s.level ? ` • ${escapeHtml(s.level)}` : ""}</div><div class="mtime muted">${escapeHtml(s.time)}</div>`;
        items.appendChild(mini);
      }

      // if more items, add a "+N" hint
      if (daySessions.length > 3) {
        const more = document.createElement("div");
        more.className = "more muted";
        more.textContent = `+${daySessions.length - 3} more`;
        items.appendChild(more);
      }
    } else {
      // empty placeholder for spacing and subtle animation hint
      const placeholder = document.createElement("div");
      placeholder.className = "empty-slot muted";
      placeholder.textContent = "";
      items.appendChild(placeholder);
    }

    // click opens day overlay with full details
    cell.addEventListener("click", (ev) => {
      ev.stopPropagation();
      openDayOverlay(iso, map[iso] || []);
    });

    cell.appendChild(header);
    cell.appendChild(items);
    calendarEl.appendChild(cell);
  }

  // trailing blanks to fill grid (so layout stays even)
  const totalChildren = calendarEl.children.length;
  const remainder = (7 - (totalChildren % 7)) % 7;
  for (let i = 0; i < remainder; i++) {
    const b = document.createElement("div");
    b.className = 'cal-cell blank';
    b.innerHTML = `<div class="cal-date muted"> </div>`;
    calendarEl.appendChild(b);
  }
}

// -------------------------------
// Day overlay: full-screen animated expansion showing sessions for a date
// - creates overlay if not present
// - provides reminder and cancel actions
// -------------------------------
function createDayOverlayIfNeeded() {
  if (dayOverlay) return dayOverlay;

  dayOverlay = document.createElement("div");
  dayOverlay.className = "day-overlay hidden"; // CSS should animate .visible
  dayOverlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass-panel">
      <div class="overlay-header">
        <div class="overlay-title" id="overlayTitle">Day</div>
        <div class="overlay-controls">
          <button id="overlayClose" class="btn-ghost">Close</button>
        </div>
      </div>
      <div id="overlayContent" class="overlay-content"></div>
      <div class="overlay-footer">
        <button id="overlayQuickAdd" class="btn-primary small">Quick Add</button>
      </div>
    </div>
  `;
  document.body.appendChild(dayOverlay);

  // wire close
  const closeBtn = dayOverlay.querySelector("#overlayClose");
  if (closeBtn) closeBtn.addEventListener("click", closeDayOverlay);
  const backdrop = dayOverlay.querySelector(".overlay-backdrop");
  if (backdrop) backdrop.addEventListener("click", closeDayOverlay);

  // quick add copies date to form
  const quickAdd = dayOverlay.querySelector("#overlayQuickAdd");
  if (quickAdd) quickAdd.addEventListener("click", () => {
    const panel = dayOverlay.querySelector(".overlay-panel");
    const date = panel?.getAttribute("data-date");
    if (date && reqDate) {
      reqDate.value = date;
      // scroll to the form if present
      requestForm?.scrollIntoView({ behavior: "smooth", block: "center" });
      showToast("Date copied to request form");
    }
  });

  return dayOverlay;
}

function openDayOverlay(dateIso, sessionsForDay) {
  const overlay = createDayOverlayIfNeeded();
  const panel = overlay.querySelector(".overlay-panel");
  if (!panel) return;

  panel.setAttribute("data-date", dateIso);
  const title = overlay.querySelector("#overlayTitle");
  title.textContent = new Date(dateIso + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  const content = overlay.querySelector("#overlayContent");
  content.innerHTML = ""; // clear

  if (!sessionsForDay || sessionsForDay.length === 0) {
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "No sessions on this day. Use the form to add one.";
    content.appendChild(empty);
  } else {
    // create a list of session cards
    for (const s of sessionsForDay) {
      const card = document.createElement("div");
      card.className = "session-card glass-panel card";

      card.innerHTML = `
        <div class="session-top">
          <div class="session-subj">${escapeHtml(s.subject)}${s.level ? ` • ${escapeHtml(s.level)}` : ""}</div>
          <div class="session-meta muted">${escapeHtml(s.teacher)} • ${escapeHtml(s.time)}</div>
        </div>
        <div class="session-body">${escapeHtml(s.details || "No extra details")}</div>
        <div class="session-actions row">
          <button class="btn-ghost btn-remind" data-id="${s.id}" data-date="${s.date}" data-time="${s.time}">🔔 Remind 30m</button>
          <button class="btn-ghost btn-cancel" data-id="${s.id}">Cancel</button>
        </div>
      `;

      // wire reminder
      const remindBtn = card.querySelector(".btn-remind");
      if (remindBtn) {
        remindBtn.addEventListener("click", (ev) => {
          const di = ev.currentTarget.dataset.date;
          const ti = ev.currentTarget.dataset.time;
          setReminder30min(di, ti);
        });
      }

      // wire cancel
      const cancelBtn = card.querySelector(".btn-cancel");
      if (cancelBtn) {
        cancelBtn.addEventListener("click", async (ev) => {
          const id = ev.currentTarget.dataset.id;
          if (!id) return;
          try {
            await deleteDoc(doc(db, "requests", id));
            showToast("Cancelled");
          } catch (err) {
            console.error("Overlay cancel error", err);
            showToast("Cancel failed");
          }
        });
      }

      content.appendChild(card);
    }
  }

  // show overlay with animation (CSS should animate .visible)
  overlay.classList.remove("hidden");
  // small timeout to allow CSS transition
  requestAnimationFrame(() => overlay.classList.add("visible"));
}

function closeDayOverlay() {
  if (!dayOverlay) return;
  dayOverlay.classList.remove("visible");
  setTimeout(() => {
    dayOverlay.classList.add("hidden");
  }, 300);
}

// -------------------------------
// Reminder helper: schedule 30-minute reminder for a given date & time
// The reminder is client-side (Notification API) or stored in localStorage as fallback
// -------------------------------
function setReminder30min(dateIso, timeStr) {
  if (!dateIso || !timeStr) {
    showToast("Invalid date/time for reminder");
    return;
  }
  // compute session Date object (local)
  const [hh, mm] = timeStr.split(":").map(x => parseInt(x, 10));
  const sessionDate = new Date(dateIso + "T00:00:00");
  sessionDate.setHours(hh, mm, 0, 0);
  const reminderDate = new Date(sessionDate.getTime() - 30 * 60 * 1000);
  const msUntil = reminderDate.getTime() - Date.now();

  if (msUntil <= 0) {
    showToast("Too late to set a 30-minute reminder for this session");
    return;
  }

  if (supportsNotification && Notification.permission === "granted") {
    scheduleNotification(msUntil, dateIso, timeStr);
    showToast("Reminder scheduled (you will receive a browser notification)");
    return;
  }

  // ask permission
  if (supportsNotification && Notification.permission !== "denied") {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        scheduleNotification(msUntil, dateIso, timeStr);
        showToast("Reminder scheduled (you will receive a browser notification)");
      } else {
        // fallback store
        storeLocalReminder(dateIso, timeStr);
        showToast("Notifications blocked; reminder saved locally");
      }
    });
    return;
  }

  // no Notification support or denied -> fallback
  storeLocalReminder(dateIso, timeStr);
  showToast("Reminder saved locally");
}

/**
 * scheduleNotification
 * Schedules a setTimeout that will show a Notification after delayMs.
 * Note: this works while the page is open. For background push you'd need server logic.
 */
function scheduleNotification(delayMs, dateIso, timeStr) {
  setTimeout(() => {
    try {
      new Notification("VolunTutor — Reminder", {
        body: `Your ${timeStr} session on ${niceDate(dateIso)} starts in 30 minutes.`,
        icon: "/media/favcon2.png"
      });
    } catch (err) {
      console.warn("Notification display failed", err);
    }
  }, delayMs);
}

/**
 * storeLocalReminder
 * Saves a small reminder record in localStorage. A background sweep could display them.
 */
function storeLocalReminder(dateIso, timeStr) {
  if (!supportsLocalStorage) return;
  const key = "voluntutor_local_reminders_v1";
  const existing = JSON.parse(localStorage.getItem(key) || "[]");
  existing.push({ id: `${dateIso}_${timeStr}`, date: dateIso, time: timeStr, ts: Date.now() });
  localStorage.setItem(key, JSON.stringify(existing));
}

// -------------------------------
// Confetti system (internal canvas particle system)
// - If the canvas-confetti library is loaded (global confetti function), we prefer it.
// - Otherwise, we use our internal particle system.
// -------------------------------
function initConfettiCanvas() {
  confettiCanvas = document.getElementById("confettiCanvas");
  if (!confettiCanvas) {
    confettiCanvas = document.createElement("canvas");
    confettiCanvas.id = "confettiCanvas";
    confettiCanvas.style.position = "fixed";
    confettiCanvas.style.left = "0";
    confettiCanvas.style.top = "0";
    confettiCanvas.style.pointerEvents = "none";
    confettiCanvas.style.zIndex = "999999";
    document.body.appendChild(confettiCanvas);
  }
  confettiCtx = confettiCanvas.getContext ? confettiCanvas.getContext("2d") : null;
  resizeConfettiCanvas();
  window.addEventListener("resize", resizeConfettiCanvas);
  if (!confettiRAF) {
    confettiRAF = requestAnimationFrame(confettiFrame);
  }
}

function resizeConfettiCanvas() {
  if (!confettiCanvas) return;
  const dpr = window.devicePixelRatio || 1;
  confettiCanvas.width = Math.floor(window.innerWidth * dpr);
  confettiCanvas.height = Math.floor(window.innerHeight * dpr);
  confettiCanvas.style.width = `${window.innerWidth}px`;
  confettiCanvas.style.height = `${window.innerHeight}px`;
  if (confettiCtx) confettiCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/**
 * confettiFrame - animates internal confettiParticles array
 */
function confettiFrame() {
  if (!confettiCtx) {
    // if canvas is unsupported, try to use library if present
    if (typeof confetti === "function") {
      // do nothing; library will handle bursts
    }
    confettiRAF = requestAnimationFrame(confettiFrame);
    return;
  }
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  // update particles
  for (let i = confettiParticles.length - 1; i >= 0; i--) {
    const p = confettiParticles[i];
    p.vy += 0.25; // gravity
    p.vx *= 0.998; // slight drag
    p.x += p.vx;
    p.y += p.vy;
    p.rotation += p.vr;
    p.life++;
    // draw rect as rotated
    confettiCtx.save();
    confettiCtx.translate(p.x, p.y);
    confettiCtx.rotate(p.rotation);
    confettiCtx.fillStyle = p.color;
    confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.6);
    confettiCtx.restore();
    if (p.y > window.innerHeight + 50 || p.life > p.ttl) {
      confettiParticles.splice(i, 1);
    }
  }
  confettiRAF = requestAnimationFrame(confettiFrame);
}

/**
 * startConfetti
 * - Prefer global confetti (canvas-confetti) if available
 * - Otherwise generate internal particle waves
 */
function startConfetti() {
  try {
    if (typeof confetti === "function") {
      // use library for nice look (three bursts)
      const duration = 1600;
      const end = Date.now() + duration;
      (function frame() {
        confetti({
          particleCount: 6,
          startVelocity: 30,
          spread: 360,
          ticks: 60,
          origin: { x: Math.random(), y: Math.random() - 0.2 }
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();
      return;
    }
  } catch (e) {
    console.warn("canvas-confetti library failed; falling back", e);
  }

  // fallback internal particle wave
  generateConfettiWave();
  setTimeout(generateConfettiWave, 180);
  setTimeout(generateConfettiWave, 360);
}

/**
 * generateConfettiWave - push handful of internal particle objects
 */
function generateConfettiWave() {
  const cx = window.innerWidth * 0.5;
  const cy = window.innerHeight * 0.2;
  const count = 120;
  for (let i = 0; i < count; i++) {
    confettiParticles.push({
      x: cx + (Math.random() - 0.5) * 200,
      y: cy + (Math.random() - 0.5) * 80,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 1.7) * 10,
      size: 4 + Math.random() * 6,
      rotation: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.2,
      color: `hsl(${Math.floor(Math.random() * 360)}, 90%, ${50 + Math.random() * 10}%)`,
      life: 0,
      ttl: 220 + Math.floor(Math.random() * 80)
    });
  }
}

// -------------------------------
// Theme handling (dark/light) with persistent storage & logo swap
// -------------------------------
function applySavedTheme() {
  const stored = localStorage.getItem("vt_theme");
  if (stored) {
    document.documentElement.setAttribute("data-theme", stored);
    // update logo if present
    if (logoImg) {
      if (stored === "light") {
        logoImg.src = "/media/favcon2.png";
      } else {
        // you can provide a dark logo variant if you want
        logoImg.src = "/media/favcon2.png";
      }
    }
  } else {
    // default to dark theme (glass look)
    document.documentElement.setAttribute("data-theme", "dark");
  }
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute("data-theme") || "dark";
  const next = cur === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("vt_theme", next);
  // update logo
  if (logoImg) {
    if (next === "light") {
      logoImg.src = "/media/favcon2.png";
    } else {
      logoImg.src = "/media/favcon2.png";
    }
  }
  showToast(next === "light" ? "Light mode" : "Dark mode");
}

// -------------------------------
// Debug helpers exposed on window for console access
// -------------------------------
window.VT = {
  startConfetti,
  generateConfettiWave,
  renderCalendar,
  renderUpcoming,
  setReminder30min,
  allSessions: () => allSessions,
  reloadDropdowns: populateDropdowns
};

// -------------------------------
// Expose small initialization function in case other scripts want to call
// -------------------------------
export function vtInit() {
  // If DOM already loaded, try to wire UI quickly
  if (document.readyState === "complete" || document.readyState === "interactive") {
    // already initialized via DOMContentLoaded; nothing to do
    return;
  }
  // otherwise rely on DOMContentLoaded listener above
}

// End of student.js
// -------------------------------
// Notes:
// - This file keeps your Firestore write that requires studentUid when creating requests.
// - Optional fields (studentEmail, gradeLevel, preferredTutor) are stored in the payload (nullable if empty).
// - Confetti will use the canvas-confetti library if loaded; otherwise internal particle system is used.
// - If you want me to also produce a matching tutor.js or teacher.js derived from this, I can.
// - If you want the code wrapped (non-module), tell me and I will output a UMD/plain script variant.
