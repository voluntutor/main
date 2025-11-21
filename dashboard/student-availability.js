// /dashboard/student-availability.js
// Student view of tutor availability + booking form

import { db } from "../firebase.js";
import {
  collection,
  onSnapshot,
  query,
  where,
  addDoc,
  serverTimestamp,
  updateDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const $ = (sel) => document.querySelector(sel);

// ---------- DOM refs ----------
const subjectSelect = $("#subjectSelect");
const levelSelect   = $("#levelSelect");

const calHead    = $("#calHead");
const calEl      = $("#calendar");
const monthLabel = $("#monthLabel");
const prevMonth  = $("#prevMonth");
const nextMonth  = $("#nextMonth");

const dayOverlay      = $("#dayOverlay");
const overlayBody     = $("#overlayBody");
const overlayTitle    = $("#overlayTitle");
const overlayClose    = $("#overlayClose");
const overlayBackdrop = $("#overlayBackdrop");
const overlayQuickAdd = $("#overlayQuickAdd");

const reqDate  = $("#reqDate");
const toastEl  = $("#toast");

// ---------- utils ----------
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

function fmtISO(d) {
  if (!(d instanceof Date)) d = new Date(d);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d - off).toISOString().slice(0, 10);
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

// ---------- state ----------
let allSlots       = [];   // all open availability from all tutors
let filteredSlots  = [];   // subject+level filtered
let currentMonth   = new Date();
currentMonth.setDate(1);

let overlayDateISO = null;
let bookingSlot    = null; // slot currently being booked

// ---------- calendar header ----------
const weekdayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
if (calHead) {
  calHead.innerHTML = weekdayNames
    .map(d => `<div class="small" style="text-align:center">${d}</div>`)
    .join("");
}

// ---------- filtering ----------
function filterSlots() {
  const subj = subjectSelect?.value || "";
  const lvl  = levelSelect?.value || "";

  return allSlots.filter((s) => {
    if (s.status && s.status !== "open") return false;
    if (subj && s.subject !== subj) return false;
    if (lvl  && s.level   !== lvl)  return false;
    return true;
  });
}

// ---------- render calendar ----------
function renderCalendar() {
  if (!calEl) return;

  const year  = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const first = new Date(year, month, 1);
  const startDay    = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  if (monthLabel) {
    monthLabel.textContent = first.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
  }

  calEl.innerHTML = "";

  // group filteredSlots by date
  const slotsByDate = {};
  filteredSlots.forEach((s) => {
    if (!s.date) return;
    if (!slotsByDate[s.date]) slotsByDate[s.date] = [];
    slotsByDate[s.date].push(s);
  });

  // leading blanks
  for (let i = 0; i < startDay; i++) {
    const blank = document.createElement("div");
    blank.className = "cal-cell blank";
    calEl.appendChild(blank);
  }

  const todayISO = fmtISO(new Date());

  for (let d = 1; d <= daysInMonth; d++) {
    const dt  = new Date(year, month, d);
    const iso = fmtISO(dt);

    const cell = document.createElement("div");
    cell.className = "cal-cell";
    if (iso === todayISO) cell.classList.add("today");

    const header = document.createElement("div");
    header.className = "cal-date";
    header.textContent = d;

    const body = document.createElement("div");
    body.className = "small muted";

    const slots = slotsByDate[iso] || [];
    if (slots.length) {
      const dot = document.createElement("span");
      dot.className = "dot booked";
      header.prepend(dot);
      body.textContent = `${slots.length} slot(s)`;
    } else {
      body.textContent = "";
    }

    cell.appendChild(header);
    cell.appendChild(body);

    cell.addEventListener("click", () => openDayOverlay(iso, slots));
    calEl.appendChild(cell);
  }
}

// ---------- overlay (list of slots) ----------
function openDayOverlay(dateISO, slotsForDay) {
  if (!dayOverlay) return;
  dayOverlay.classList.remove("hidden");
  overlayDateISO = dateISO;

  overlayTitle.textContent = new Date(dateISO + "T00:00:00").toDateString();
  overlayBody.innerHTML = "";

  if (!slotsForDay || !slotsForDay.length) {
    overlayBody.innerHTML =
      `<div class="muted small">No matching availability on this day.</div>`;
    return;
  }

  slotsForDay
    .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""))
    .forEach((s) => {
      const row = document.createElement("div");
      row.className = "card";
      row.innerHTML = `
        <div>
          <div><strong>${escapeHtml(s.subject)}${
        s.level ? " • " + escapeHtml(s.level) : ""
      }</strong></div>
          <div class="small muted">
            ${escapeHtml(s.date)} • ${escapeHtml(s.startTime)}${
        s.endTime ? "–" + escapeHtml(s.endTime) : ""
      }
          </div>
          <div class="small muted">
            Tutor: ${escapeHtml(s.tutorName || s.tutorEmail || "Unknown")}
          </div>
        </div>
        <button class="btn-primary small book-btn">Book</button>
      `;

      const btn = row.querySelector(".book-btn");
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        openBookingForm(s);
      });

      overlayBody.appendChild(row);
    });
}

function closeDayOverlay() {
  if (!dayOverlay) return;
  dayOverlay.classList.add("hidden");
  overlayDateISO = null;
  bookingSlot = null;
  overlayBody.innerHTML = "";
}

overlayClose?.addEventListener("click", closeDayOverlay);
overlayBackdrop?.addEventListener("click", closeDayOverlay);

overlayQuickAdd?.addEventListener("click", () => {
  if (!overlayDateISO || !reqDate) return;
  const today = new Date();
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const [Y, M, D] = overlayDateISO.split("-");
  const dMid = new Date(+Y, M - 1, +D); // local midnight, no timezone shift
  if (dMid < todayMid ){
      showToast("Cannot add availability to past dates");
      closeDayOverlay();
      return;
  }
  reqDate.value = overlayDateISO;
  closeDayOverlay();
  showToast("Date copied to request form");
});

// ---------- booking form in overlay ----------
function openBookingForm(slot) {
  bookingSlot = slot;

  overlayTitle.textContent = `Book ${slot.subject}${
    slot.level ? " • " + slot.level : ""
  }`;

  overlayBody.innerHTML = `
    <div class="card">
      <div>
        <div><strong>${escapeHtml(slot.subject)}${
    slot.level ? " • " + escapeHtml(slot.level) : ""
  }</strong></div>
        <div class="small muted">
          ${escapeHtml(slot.date)} • ${escapeHtml(slot.startTime)}${
    slot.endTime ? "–" + escapeHtml(slot.endTime) : ""
  }
        </div>
        <div class="small muted">
          Tutor: ${escapeHtml(slot.tutorName || slot.tutorEmail || "Unknown")}
        </div>
      </div>
    </div>

    <form id="bookingForm" class="form">
      <label for="bkName">Your Name</label>
      <input id="bkName" type="text" required>

      <label for="bkEmail">Your Email</label>
      <input id="bkEmail" type="email" required>

      <label for="bkClass">Class</label>
      <input id="bkClass" type="text" placeholder="e.g. Algebra 2, AP Bio" value="${escapeHtml(
        slot.subject || ""
      )}">

      <label for="bkClassLevel">Class Level</label>
      <input id="bkClassLevel" type="text" placeholder="Honors, AP, etc" value="${escapeHtml(
        slot.level || ""
      )}">

      <label for="bkTeacher">Teacher</label>
      <input id="bkTeacher" type="text" placeholder="Your school teacher's name">

      <label for="bkNotes">Other Notes</label>
      <textarea id="bkNotes" rows="3" placeholder="Anything the tutor should know..."></textarea>

      <div class="form-actions">
        <button type="submit" class="btn-primary">Confirm Booking</button>
        <button type="button" id="bkCancel" class="btn-ghost">Back</button>
      </div>
    </form>
  `;

  const bookingForm = $("#bookingForm");
  const cancelBtn   = $("#bkCancel");

  bookingForm?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    await submitBooking();
  });

  cancelBtn?.addEventListener("click", () => {
    // go back to list view for that date
    openDayOverlay(slot.date, filteredSlots.filter((s) => s.date === slot.date));
  });
}

async function submitBooking() {
  if (!bookingSlot) {
    showToast("No slot selected");
    return;
  }

  const name   = $("#bkName")?.value.trim();
  const email  = $("#bkEmail")?.value.trim();
  const cls    = $("#bkClass")?.value.trim();
  const lvl    = $("#bkClassLevel")?.value.trim();
  const teach  = $("#bkTeacher")?.value.trim();
  const notes  = $("#bkNotes")?.value.trim();

  if (!name || !email) {
    showToast("Name and email are required");
    return;
  }

  try {
    // 1) create booking doc
    const bookingRef = await addDoc(collection(db, "bookings"), {
      availabilityId: bookingSlot.id,
      tutorUid:       bookingSlot.tutorUid || null,
      tutorName:      bookingSlot.tutorName || null,
      tutorEmail:     bookingSlot.tutorEmail || null,

      studentName:    name,
      studentEmail:   email,
      className:      cls || bookingSlot.subject || null,
      classLevel:     lvl || bookingSlot.level || null,
      schoolTeacher:  teach || null,
      notes:          notes || null,

      subject:        bookingSlot.subject || null,
      level:          bookingSlot.level || null,
      date:           bookingSlot.date || null,
      startTime:      bookingSlot.startTime || null,
      endTime:        bookingSlot.endTime || null,

      status:         "pending",
      createdAt:      serverTimestamp(),
    });

    // 2) mark the availability slot as booked (so it stops showing as open)
    try {
      if (bookingSlot.id) {
        await updateDoc(doc(db, "availability", bookingSlot.id), {
          status: "booked",
        });
      }
    } catch (err) {
      console.warn("Failed to mark availability as booked", err);
    }

    // 3) create notification for the tutor so the bell lights up
    try {
      if (bookingSlot.tutorUid) {
        await addDoc(collection(db, "notifications"), {
          userUid: bookingSlot.tutorUid, // tutor's UID
          title: "New booking request",
          message: `New booking from ${name} for ${bookingSlot.subject || "a session"}.`,
          subject: bookingSlot.subject || null,
          level: bookingSlot.level || null,
          date: bookingSlot.date || null,
          startTime: bookingSlot.startTime || null,
          endTime: bookingSlot.endTime || null,
          studentName: name,
          studentEmail: email,
          notes: notes || null,
          bookingId: bookingRef.id,
          createdAt: serverTimestamp(),
          read: false,
        });
      }
    } catch (err) {
      console.warn("Failed to create tutor notification", err);
    }

    // optional confetti
    try {
      if (typeof confetti === "function") {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.8 } });
      }
    } catch {}

    overlayBody.innerHTML = `
      <div class="card">
        <div>
          <div><strong>Booking received!</strong></div>
          <div class="small muted">
            The tutor will see this booking on their dashboard.
          </div>
        </div>
      </div>
    `;
    bookingSlot = null;
    showToast("Booking submitted");
  } catch (err) {
    console.error("Error creating booking", err);
    showToast("Error sending booking (check console)");
  }
}

// ---------- month nav ----------
prevMonth?.addEventListener("click", () => {
  currentMonth.setMonth(currentMonth.getMonth() - 1);
  filteredSlots = filterSlots();
  renderCalendar();
});
nextMonth?.addEventListener("click", () => {
  currentMonth.setMonth(currentMonth.getMonth() + 1);
  filteredSlots = filterSlots();
  renderCalendar();
});

// ---------- filter events ----------
subjectSelect?.addEventListener("change", () => {
  filteredSlots = filterSlots();
  renderCalendar();
});
levelSelect?.addEventListener("change", () => {
  filteredSlots = filterSlots();
  renderCalendar();
});

// ---------- Firestore listener ----------
(function startAvailabilityListener() {
  const ref = collection(db, "availability");
  const q   = query(ref, where("status", "==", "open"));

  onSnapshot(
    q,
    (snap) => {
      const slots = [];
      snap.forEach((d) => slots.push({ id: d.id, ...d.data() }));
      allSlots = slots;
      filteredSlots = filterSlots();
      renderCalendar();
    },
    (err) => {
      console.error("availability onSnapshot error", err);
      showToast("Error loading availability");
    }
  );
})();

// initial blank render
renderCalendar();


/* ---------- auto-resize textareas ---------- */
document.querySelectorAll('textarea').forEach(textarea => {
  textarea.addEventListener('input', () => {
    textarea.style.height = 'auto'; // Reset height
    textarea.style.height = textarea.scrollHeight + 'px'; // Set to full height
  });
});