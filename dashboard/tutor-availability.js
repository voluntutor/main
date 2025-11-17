// /dashboard/tutor-availability.js

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
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const form = document.getElementById("availabilityForm");
const subjectEl = document.getElementById("availSubject");
const levelEl = document.getElementById("availLevel");
const dateEl = document.getElementById("availDate");
const startEl = document.getElementById("availStart");
const endEl = document.getElementById("availEnd");
const listEl = document.getElementById("availabilityList");

let currentUser = null;

// 1) Make sure tutor is logged in
onAuthStateChanged(auth, (user) => {
  if (!user) {
    // no auth → kick them back to login
    location.href = "https://voluntutor.github.io/main/register/auth.html";
    return;
  }
  currentUser = user;
  startListeningForSlots();
});

// 2) Listen to this tutor's availability in Firestore
function startListeningForSlots() {
  const slotsRef = collection(db, "availability");
  const q = query(slotsRef, where("tutorUid", "==", currentUser.uid));

  onSnapshot(q, (snap) => {
    listEl.innerHTML = "";
    if (snap.empty) {
      listEl.innerHTML = `<div class="muted small">No slots yet.</div>`;
      return;
    }

    snap.forEach((docSnap) => {
      const s = docSnap.data();
      const row = document.createElement("div");
      row.className = "card";

      row.innerHTML = `
        <div>
          <div><strong>${s.subject}${s.level ? " • " + s.level : ""}</strong></div>
          <div class="small muted">
            ${s.date} • ${s.startTime}${s.endTime ? "–" + s.endTime : ""}
          </div>
          <div class="small muted">Status: ${s.status}</div>
        </div>
        ${
          s.status === "open"
            ? '<button class="btn-ghost small">Close</button>'
            : ""
        }
      `;

      if (s.status === "open") {
        row.querySelector("button").addEventListener("click", async () => {
          await updateDoc(doc(db, "availability", docSnap.id), {
            status: "cancelled",
          });
        });
      }

      listEl.appendChild(row);
    });
  });
}

// 3) Handle "Add available slot" submit
form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return;

  const subject = subjectEl.value.trim();
  const level = levelEl.value.trim();
  const date = dateEl.value;
  const startTime = startEl.value;
  const endTime = endEl.value;

  if (!subject || !date || !startTime) {
    alert("Fill subject, date, and start time.");
    return;
  }

  const slotsRef = collection(db, "availability");

  await addDoc(slotsRef, {
    tutorUid: currentUser.uid,
    tutorName: currentUser.displayName || currentUser.email,
    tutorEmail: currentUser.email,

    subject,
    level,
    date,
    startTime,
    endTime: endTime || null,

    status: "open",           // student will later flip this to 'booked'
    createdAt: serverTimestamp(),
  });

  form.reset();
});
