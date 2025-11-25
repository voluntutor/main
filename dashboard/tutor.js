// /dashboard/tutor.js

import { auth, db } from "../firebase.js";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

/* ---------- mini utils ---------- */
const $ = (sel) => document.querySelector(sel);
const toastEl = $("#toast");

function showToast(msg, dur = 2200) {
  if (!toastEl) {
    console.log("[toast]", msg);
    return;
  }
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => toastEl.classList.remove("show"), dur);
}

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function fmtISO(d) {
  if (!(d instanceof Date)) d = new Date(d);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d - off).toISOString().slice(0, 10);
}

/* ---------- state ---------- */
let currentUser = null;
let allSlots = [];            // every availability doc for this tutor
let currentMonth = new Date();
currentMonth.setDate(1);
let overlayDateISO = null;
let cachedNotifs = [];

/* ---------- DOM refs ---------- */
const availForm     = $("#availabilityForm");
const availSubject  = $("#availSubject");
const availLevel    = $("#availLevel");
const availDate     = $("#availDate");
const availStart    = $("#availStart");
const availEnd      = $("#availEnd");
const clearAvailBtn = $("#clearAvail");
const studentViewBtn = $("#studentView");

const availabilityList = $("#availabilityList");
const upcomingList     = $("#upcomingList");
const pastList         = $("#pastList");

const calHead      = $("#calHead");
const calEl        = $("#calendar");
const monthLabel   = $("#monthLabel");
const prevMonthBtn = $("#prevMonth");
const nextMonthBtn = $("#nextMonth");

const dayOverlay      = $("#dayOverlay");
const overlayBody     = $("#overlayBody");
const overlayTitle    = $("#overlayTitle");
const overlayClose    = $("#overlayClose");
const overlayBackdrop = $("#overlayBackdrop");
const overlayQuickAdd = $("#overlayQuickAdd");

const logoutBtn         = $("#logoutBtn");
const themeToggle       = $("#themeToggle");
const homeLink          = $("#homeLink");
const volunteerHoursBtn = $("#volunteer-hours");
const accountBtn        = $("#account");
const userNameEl        = $("#userName");
const userEmailEl       = $("#userEmail");
const avatarEl          = $("#avatar");

// Notifications
const notifBtn = document.querySelector("#notifBtn");
notifBtn?.addEventListener("click", () => {
  window.open("tutor-bookings.html", "_blank");
});

const notifDot   = $("#notifDot");
const notifPanel = $("#notifPanel");
const notifList  = $("#notifList");
const notifClose = $("#notifClose");

/* ---------- header / nav / theme ---------- */
function applyTheme() {
  const saved = localStorage.getItem("vt-theme");
  if (saved === "dark") document.body.classList.add("dark");
  if (saved === "light") document.body.classList.remove("dark");
}
applyTheme();

themeToggle?.addEventListener("click", () => {
  const dark = document.body.classList.toggle("dark");
  localStorage.setItem("vt-theme", dark ? "dark" : "light");
});

homeLink?.addEventListener("click", () => {
  location.href = "tutor.html";
});
volunteerHoursBtn?.addEventListener("click", () => {
  location.href = "submit-hours/submit-hours.html";
});
accountBtn?.addEventListener("click", () => {
  location.href = "tutor-info/index.html";
});
logoutBtn?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    showToast("Logged out");
    setTimeout(() => {
      location.href = "https://voluntutor.github.io/main/register/auth.html";
    }, 600);
  } catch (e) {
    console.error(e);
    showToast("Logout failed");
  }
});

/* ---------- help actions ---------- */
$("#sendHelp")?.addEventListener("click", () => {
  const txt = $("#helpText")?.value.trim();
  if (!txt) return showToast("Describe the issue");
  $("#helpText").value = "";
  showToast("Thanks, we'll take a look.");
});
$("#openFAQ")?.addEventListener("click", () => {
  showToast("FAQ coming soon.");
});
studentViewBtn?.addEventListener("click", () => {
  location.href = "student.html";
});

/* ---------- calendar header ---------- */
const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
if (calHead) {
  calHead.innerHTML = weekdayNames
    .map((d) => `<div class="small" style="text-align:center">${d}</div>`)
    .join("");
}

prevMonthBtn?.addEventListener("click", () => {
  currentMonth.setMonth(currentMonth.getMonth() - 1);
  renderCalendar();
});
nextMonthBtn?.addEventListener("click", () => {
  currentMonth.setMonth(currentMonth.getMonth() + 1);
  renderCalendar();
});

/* ---------- overlay ---------- */
function openDayOverlay(dateISO, slotsForDay) {
  overlayDateISO = dateISO;
  dayOverlay?.classList.remove("hidden");
  overlayTitle.textContent = new Date(dateISO + "T00:00:00").toDateString();

  overlayBody.innerHTML = "";
  if (!slotsForDay || slotsForDay.length === 0) {
    overlayBody.innerHTML =
      '<div class="muted small">No availability yet for this day.</div>';
  } else {
    slotsForDay.forEach((s) => {
      const row = document.createElement("div");
      row.className = "card";
      row.innerHTML = `
        <div>
          <div><strong>${escapeHtml(s.subject)} ${
        s.level ? "• " + escapeHtml(s.level) : ""
      }</strong></div>
          <div class="small muted">${s.date} • ${s.startTime}${
        s.endTime ? "–" + s.endTime : ""
      }</div>
          <div class="small muted">Status: ${s.status}</div>
        </div>
        <div>
          ${
            s.status === "open"
              ? '<button class="btn-ghost small" data-action="cancel">Cancel</button>'
              : ""
          }
        </div>
      `;
      const cancelBtn = row.querySelector("[data-action='cancel']");
      if (cancelBtn) {
        cancelBtn.addEventListener("click", async () => {
          try {
            await updateDoc(doc(db, "availability", s.id), {
              status: "cancelled",
            });
            showToast("Slot cancelled");
          } catch (err) {
            console.error(err);
            showToast("Failed to cancel slot");
          }
        });
      }
      overlayBody.appendChild(row);
    });
  }
}

function closeDayOverlay() {
  dayOverlay?.classList.add("hidden");
  overlayDateISO = null;
}
overlayClose?.addEventListener("click", closeDayOverlay);
overlayBackdrop?.addEventListener("click", closeDayOverlay);

overlayQuickAdd?.addEventListener("click", () => {
    if (!overlayDateISO || !availDate) return;
    const today = new Date();
    const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const [Y, M, D] = overlayDateISO.split("-");
    const dMid = new Date(+Y, M - 1, +D); // local midnight, no timezone shift
    if (dMid < todayMid ){
        showToast("Cannot add availability to past dates");
        closeDayOverlay();
        return;
    }
    availDate.value = overlayDateISO;
    closeDayOverlay();
    showToast("Date copied to availability form");
});

/* ---------- availability form ---------- */
clearAvailBtn?.addEventListener("click", () => {
  availForm?.reset();
  showToast("Form cleared");
});

availForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) {
    showToast("You must be logged in.");
    return;
  }

  const subject = (availSubject?.value || "").trim();
  const level   = (availLevel?.value || "").trim();
  const date    = availDate?.value;
  const startTime = availStart?.value;
  const endTime   = availEnd?.value;

  if (!subject || !level || !date || !startTime) {
    showToast("Fill subject, level, date, and time.");
    return;
  }

  try {
    const ref = collection(db, "availability");
    await addDoc(ref, {
      tutorUid:   currentUser.uid,
      tutorName:  currentUser.displayName || currentUser.email,
      tutorEmail: currentUser.email,
      subject,
      level,
      date,
      startTime,
      endTime: endTime || null,
      status: "open",
      createdAt: serverTimestamp(),
    });
    showToast("Slot added");
    availForm.reset();
  } catch (err) {
    console.error("addDoc error", err);
    showToast("Error saving slot (check Firestore rules)");
  }
});

/* ---------- Firestore listener: availability ---------- */
function startAvailabilityListener() {
  const ref = collection(db, "availability");
  const q = query(ref, where("tutorUid", "==", currentUser.uid));

  onSnapshot(
    q,
    (snap) => {
      const slots = [];
      snap.forEach((d) => slots.push({ id: d.id, ...d.data() }));
      allSlots = slots;
      renderAvailabilityLists();
      renderCalendar();
    },
    (err) => {
      console.error("onSnapshot error", err);
      showToast("Realtime sync error");
    }
  );
}

/* ---------- render availability lists ---------- */
function renderAvailabilityLists() {
  const todayISO = fmtISO(new Date());

  const upcoming = [];
  const past = [];

  for (const s of allSlots) {
    if (s.status === "open" && s.date >= todayISO) {
      upcoming.push(s);
    } else {
      past.push(s);
    }
  }

  // upcoming
  if (upcomingList) {
    upcomingList.innerHTML = "";
    if (!upcoming.length) {
      upcomingList.innerHTML = '<div class="muted small">No upcoming slots.</div>';
    } else {
      upcoming
        .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
        .forEach((s) => {
          const row = document.createElement("div");
          row.className = "card";
          row.innerHTML = `
            <div>
              <div><strong>${escapeHtml(s.subject)} ${
            s.level ? "• " + escapeHtml(s.level) : ""
          }</strong></div>
              <div class="small muted">${s.date} • ${s.startTime}${
            s.endTime ? "–" + s.endTime : ""
          }</div>
            </div>
            <button class="btn-ghost small">Cancel</button>
          `;
          row.querySelector("button").addEventListener("click", async () => {
            try {
              await updateDoc(doc(db, "availability", s.id), {
                status: "cancelled",
              });
              showToast("Slot cancelled");
            } catch (err) {
              console.error(err);
              showToast("Failed to cancel slot");
            }
          });
          upcomingList.appendChild(row);
        });
    }
  }

  // past
  if (pastList) {
    pastList.innerHTML = "";
    if (!past.length) {
      pastList.innerHTML =
        '<div class="muted small">Nothing here yet.</div>';
    } else {
      past
        .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime))
        .forEach((s) => {
          const row = document.createElement("div");
          row.className = "card";
          row.innerHTML = `
            <div>
              <div><strong>${escapeHtml(s.subject)} ${
            s.level ? "• " + escapeHtml(s.level) : ""
          }</strong></div>
              <div class="small muted">${s.date} • ${s.startTime}${
            s.endTime ? "–" + s.endTime : ""
          }</div>
              <div class="small muted">Status: ${s.status}</div>
            </div>
          `;
          pastList.appendChild(row);
        });
    }
  }

  // left column "Your availability"
  if (availabilityList) {
    availabilityList.innerHTML = "";
    if (!allSlots.length) {
      availabilityList.innerHTML =
        '<div class="muted small">No slots yet.</div>';
    } else {
      allSlots
        .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
        .forEach((s) => {
          const row = document.createElement("div");
          row.className = "card";
          row.innerHTML = `
            <div>
              <div><strong>${escapeHtml(s.subject)} ${
            s.level ? "• " + escapeHtml(s.level) : ""
          }</strong></div>
              <div class="small muted">${s.date} • ${s.startTime}${
            s.endTime ? "–" + s.endTime : ""
          }</div>
              <div class="small muted">Status: ${s.status}</div>
            </div>
          `;
          availabilityList.appendChild(row);
        });
    }
  }
}

/* ---------- render calendar ---------- */
function renderCalendar() {
  if (!calEl) return;

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  monthLabel.textContent = first.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  calEl.innerHTML = "";

  const slotsByDate = {};
  allSlots.forEach((s) => {
    if (!slotsByDate[s.date]) slotsByDate[s.date] = [];
    slotsByDate[s.date].push(s);
  });

  for (let i = 0; i < startDay; i++) {
    const blank = document.createElement("div");
    blank.className = "cal-cell blank";
    calEl.appendChild(blank);
  }

  const todayISO = fmtISO(new Date());

  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month, d);
    const iso = fmtISO(dt);
    const cell = document.createElement("div");
    cell.className = "cal-cell";
    if (iso === todayISO) cell.classList.add("today");

    const header = document.createElement("div");
    header.className = "cal-date";
    header.textContent = d;

    const inner = document.createElement("div");
    inner.className = "small";

    const slots = slotsByDate[iso] || [];
    if (slots.length) {
      const openCount = slots.filter((s) => s.status === "open").length;
      const cancelledCount = slots.filter((s) => s.status === "cancelled").length;

      if (openCount) {
        const dot = document.createElement("span");
        dot.className = "dot booked";
        header.prepend(dot);
        inner.textContent = `${openCount} open`;
      }
      if (cancelledCount && !openCount) {
        const dot = document.createElement("span");
        dot.className = "dot cancel";
        header.prepend(dot);
        inner.textContent = `${cancelledCount} cancelled`;
      }
    }

    cell.appendChild(header);
    cell.appendChild(inner);
    cell.addEventListener("click", () =>
      openDayOverlay(iso, slotsByDate[iso] || [])
    );
    calEl.appendChild(cell);
  }
}

/* ---------- notifications (bookings) ---------- */

function startNotificationsListener() {
  if (!currentUser || !notifList) return;
  const ref = collection(db, "notifications");
  const q = query(ref, where("userUid", "==", currentUser.uid));

  onSnapshot(
    q,
    (snap) => {
      const notifs = [];
      snap.forEach((d) => notifs.push({ id: d.id, ...d.data() }));
      cachedNotifs = notifs;
      renderNotifications(notifs);
    },
    (err) => {
      console.error("notifications onSnapshot error", err);
    }
  );
}

function renderNotifications(notifs) {
  if (!notifList) return;

  notifList.innerHTML = "";

  if (!notifs.length) {
    notifList.innerHTML = `<div class="muted small">No notifications yet.</div>`;
    if (notifDot) notifDot.style.display = "none";
    return;
  }

  let unread = 0;

  notifs
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
    .forEach((n) => {
      if (!n.read) unread++;

      const card = document.createElement("div");
      card.className = "card";
      const subj = escapeHtml(n.subject || "");
      const level = n.level ? " • " + escapeHtml(n.level) : "";
      const date = escapeHtml(n.date || "");
      const time = escapeHtml(n.time || n.startTime || "");
      const studentName  = escapeHtml(n.studentName || "");
      const studentEmail = n.studentEmail ? ` (${escapeHtml(n.studentEmail)})` : "";
      const notes = n.notes ? escapeHtml(n.notes) : "";

      card.innerHTML = `
        <div>
          <div><strong>${escapeHtml(n.title || "New booking")}</strong></div>
          ${
            subj
              ? `<div class="small muted">${subj}${level}</div>`
              : ""
          }
          ${
            date || time
              ? `<div class="small muted">${date}${date && time ? " • " : ""}${time}</div>`
              : ""
          }
          ${
            studentName || studentEmail
              ? `<div class="small muted">Student: ${studentName}${studentEmail}</div>`
              : ""
          }
          ${
            notes
              ? `<div class="small muted">Notes: ${notes}</div>`
              : ""
          }
          ${
            n.message
              ? `<div class="small muted">${escapeHtml(n.message)}</div>`
              : ""
          }
        </div>
      `;
      notifList.appendChild(card);
    });

  if (notifDot) notifDot.style.display = unread > 0 ? "inline-block" : "none";
}

async function markNotificationsRead() {
  if (!currentUser || !cachedNotifs.length) return;
  const toUpdate = cachedNotifs.filter((n) => !n.read);
  for (const n of toUpdate) {
    try {
      await updateDoc(doc(db, "notifications", n.id), { read: true });
    } catch (err) {
      console.error("markNotificationsRead error", err);
    }
  }
}

notifBtn?.addEventListener("click", async () => {
  if (!notifPanel) return;
  const visible = notifPanel.style.display !== "none";
  notifPanel.style.display = visible ? "none" : "block";

  if (!visible) {
    await markNotificationsRead();
  }
});

notifClose?.addEventListener("click", () => {
  if (!notifPanel) return;
  notifPanel.style.display = "none";
});

/* ---------- auth bootstrap ---------- */
onAuthStateChanged(auth, (user) => {
  if (!user) {
    // location.href = "https://voluntutor.github.io/main/register/auth.html";
    return;
  }
  currentUser = user;

  if (userNameEl) userNameEl.textContent = user.displayName || user.email;
  if (userEmailEl) userEmailEl.textContent = user.email || "";
  if (avatarEl) {
    const base = (user.displayName || user.email || "VT").trim();
    avatarEl.textContent = base.slice(0, 2).toUpperCase();
  }

  startAvailabilityListener();
  startNotificationsListener();
  renderCalendar(); // initial empty calendar while snapshot loads
});

/* ---------- auto-resize textareas ---------- */
document.querySelectorAll("textarea").forEach((textarea) => {
  textarea.addEventListener("input", () => {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  });
});

/* ---------- subjects & levels from subjects.json ---------- */
let levelsBySubject = {};

async function loadSubjects() {
  try {
    const res = await fetch(
      "https://voluntutor.github.io/main/dashboard/subjects.json"
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    levelsBySubject = await res.json();
    populateSubjects();
  } catch (err) {
    console.error("Failed to load subjects.json", err);
    showToast("Failed to load subjects list.");
  }
}

function populateSubjects() {
  if (!availSubject) return;
  availSubject.innerHTML = '<option value="">Select Subject</option>';
  Object.keys(levelsBySubject).forEach((subject) => {
    const opt = document.createElement("option");
    opt.value = subject;
    opt.textContent = subject;
    availSubject.appendChild(opt);
  });
}

function populateLevels() {
  if (!availSubject || !availLevel) return;
  const subj = availSubject.value;
  if (subj === "") {
    availLevel.innerHTML = '<option value="">Select Subject First</option>';
    return;
  }
  availLevel.innerHTML = '<option value="">Select Level</option>';
  (levelsBySubject[subj] || []).forEach((level) => {
    const opt = document.createElement("option");
    opt.value = level;
    opt.textContent = level;
    availLevel.appendChild(opt);
  });
}

if (availSubject) {
  availSubject.addEventListener("change", populateLevels);
}

loadSubjects();
