// /dashboard/tutor-bookings.js

import { auth, db } from "../firebase.js";
import {
  collection,
  query,
  where,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const $ = (sel) => document.querySelector(sel);

const toastEl          = $("#toast");
const upcomingContainer = $("#upcomingBookings");
const pastContainer     = $("#pastBookings");
const backToDashboard   = $("#backToDashboard");
const userNameEl        = $("#userName");
const userEmailEl       = $("#userEmail");
const avatarEl          = $("#avatar");
const welcomeNameEl     = $("#welcomeName");

/* ---------- utils ---------- */
function showToast(msg, dur = 2000) {
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

function bookingDateTime(b) {
  // Combine b.date and b.startTime into a real Date object (best-effort)
  if (!b.date) return new Date(0);
  const dateStr = b.date;
  const timeStr = b.startTime || "00:00";
  return new Date(`${dateStr}T${timeStr}:00`);
}

/* ---------- nav ---------- */
backToDashboard?.addEventListener("click", () => {
  // close this tab or go back to tutor dashboard in same tab
  window.location.href = "tutor.html";
});

/* ---------- state ---------- */
let currentUser = null;
let allBookings = [];

/* ---------- render functions ---------- */
function renderBookings() {
  if (!upcomingContainer || !pastContainer) return;

  const todayISO = fmtISO(new Date());

  const upcoming = [];
  const past     = [];

  allBookings.forEach((b) => {
    if (!b.date) {
      past.push(b);
      return;
    }
    if (b.date >= todayISO && b.status !== "cancelled") {
      upcoming.push(b);
    } else {
      past.push(b);
    }
  });

  // sort upcoming soonest first
  upcoming.sort((a, b) =>
    bookingDateTime(a).getTime() - bookingDateTime(b).getTime()
  );
  // sort past newest first
  past.sort((a, b) =>
    bookingDateTime(b).getTime() - bookingDateTime(a).getTime()
  );

  // render upcoming
  upcomingContainer.innerHTML = "";
  if (!upcoming.length) {
    upcomingContainer.innerHTML =
      `<div class="muted small">No upcoming bookings.</div>`;
  } else {
    upcoming.forEach((b) => {
      const row = document.createElement("div");
      row.className = "card";

      const studentName  = escapeHtml(b.studentName || "Student");
      const studentEmail = escapeHtml(b.studentEmail || "");
      const subject      = escapeHtml(b.subject || b.className || "Session");
      const level        = b.level || b.classLevel ? " • " + escapeHtml(b.level || b.classLevel || "") : "";
      const date         = escapeHtml(b.date || "");
      const time         = escapeHtml(b.startTime || "");

      row.innerHTML = `
        <div>
          <div><strong>${subject}${level}</strong></div>
          <div class="small muted">
            ${date}${date && time ? " • " : ""}${time}
          </div>
          <div class="small muted">
            Student: ${studentName}${studentEmail ? " (" + studentEmail + ")" : ""}
          </div>
          ${
            b.notes
              ? `<div class="small muted">Notes: ${escapeHtml(b.notes)}</div>`
              : ""
          }
          <div class="small muted">
            Status: ${escapeHtml(b.status || "pending")}
          </div>
        </div>
      `;
      upcomingContainer.appendChild(row);
    });
  }

  // render past / completed
  pastContainer.innerHTML = "";
  if (!past.length) {
    pastContainer.innerHTML =
      `<div class="muted small">No past bookings yet.</div>`;
  } else {
    past.forEach((b) => {
      const row = document.createElement("div");
      row.className = "card";

      const studentName  = escapeHtml(b.studentName || "Student");
      const studentEmail = escapeHtml(b.studentEmail || "");
      const subject      = escapeHtml(b.subject || b.className || "Session");
      const level        = b.level || b.classLevel ? " • " + escapeHtml(b.level || b.classLevel || "") : "";
      const date         = escapeHtml(b.date || "");
      const time         = escapeHtml(b.startTime || "");
      const statusText   = escapeHtml(b.status || "pending");

      row.innerHTML = `
        <div>
          <div><strong>${subject}${level}</strong></div>
          <div class="small muted">
            ${date}${date && time ? " • " : ""}${time}
          </div>
          <div class="small muted">
            Student: ${studentName}${studentEmail ? " (" + studentEmail + ")" : ""}
          </div>
          ${
            b.notes
              ? `<div class="small muted">Notes: ${escapeHtml(b.notes)}</div>`
              : ""
          }
          <div class="small muted">
            Status: ${statusText}
          </div>
        </div>
      `;
      pastContainer.appendChild(row);
    });
  }
}

/* ---------- Firestore listener ---------- */
function startBookingsListener() {
  if (!currentUser) return;

  const ref = collection(db, "bookings");
  const q   = query(ref, where("tutorUid", "==", currentUser.uid));

  onSnapshot(
    q,
    (snap) => {
      const bookings = [];
      snap.forEach((docSnap) => {
        bookings.push({ id: docSnap.id, ...docSnap.data() });
      });
      allBookings = bookings;
      renderBookings();
    },
    (err) => {
      console.error("bookings onSnapshot error", err);
      showToast("Error loading bookings");
    }
  );
}

/* ---------- auth bootstrap ---------- */
onAuthStateChanged(auth, (user) => {
  if (!user) {
    // not logged in -> send back to auth
    window.location.href = "https://voluntutor.github.io/main/register/auth.html";
    return;
  }
  currentUser = user;

  const displayName = user.displayName || user.email || "Tutor";
  if (userNameEl) userNameEl.textContent = displayName;
  if (welcomeNameEl) welcomeNameEl.textContent = displayName;
  if (userEmailEl) userEmailEl.textContent = user.email || "";
  if (avatarEl) {
    const base = (displayName || "VT").trim();
    avatarEl.textContent = base.slice(0, 2).toUpperCase();
  }

  startBookingsListener();
});
