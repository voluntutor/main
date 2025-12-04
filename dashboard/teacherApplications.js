// tutorSignup.js

// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Firebase config (same as other files)
const firebaseConfig = {
  apiKey: "AIzaSyCiiAfvZ25ChvpCVCbMj46dsCrZBYMGBpM",
  authDomain: "logintrial001.firebaseapp.com",
  projectId: "logintrial001",
  storageBucket: "logintrial001.appspot.com",
  messagingSenderId: "419688887007",
  appId: "1:419688887007:web:013af1286ba6e7aff42f6a"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// DOM refs
const subjectSel = document.getElementById("subject");
const classList  = document.getElementById("classList");
const submitBtn  = document.getElementById("submitApp");

let currentUser = null;

/**
 * Hard-coded classes per subject
 * Edit these to match what you actually want to offer.
 */
const SUBJECT_CLASSES = {
  French: [
    "French 1",
    "French 2",
    "Honors French",
    "AP French"
  ],
  Spanish: [
    "Spanish 1",
    "Spanish 2",
    "Honors Spanish",
    "AP Spanish"
  ],
  German: [
    "German 1",
    "German 2",
    "Honors German",
    "AP German"
  ],
  Physics: [
    "Intro Physics",
    "Honors Physics",
    "AP Physics 1",
    "AP Physics C"
  ],
  Chemistry: [
    "Intro Chemistry",
    "Honors Chemistry",
    "AP Chemistry"
  ],
  Biology: [
    "Intro Biology",
    "Honors Biology",
    "AP Biology"
  ],
  Math: [
    "Pre-Algebra",
    "Algebra 1",
    "Geometry",
    "Algebra 2",
    "Precalculus",
    "AP Calculus AB",
    "AP Calculus BC",
    "AP Statistics"
  ]
};

// Ensure user is logged in
onAuthStateChanged(auth, (u) => {
  currentUser = u;
  if (!u) {
    // Not signed in → send to auth
    location.href = "https://voluntutor.github.io/main/register/auth.html";
  }
});

/**
 * Render the list of classes as checkboxes for a given subject
 */
function renderClassList(subject) {
  classList.innerHTML = "";

  const classes = SUBJECT_CLASSES[subject] || [];

  if (!classes.length) {
    classList.textContent = "No classes configured for this subject yet.";
    return;
  }

  classes.forEach((clsName) => {
    const id = `cls_${subject}_${clsName.replace(/\s+/g, "_")}`;

    const label = document.createElement("label");
    label.className = "check";
    label.setAttribute("for", id);
    label.style.display = "block";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = id;
    checkbox.value = clsName;

    label.appendChild(checkbox);
    label.append(` ${clsName}`);

    classList.appendChild(label);
  });
}

/**
 * When subject changes, show classes for that subject
 */
subjectSel.addEventListener("change", () => {
  const subject = subjectSel.value;
  if (!subject) {
    classList.innerHTML = "";
    return;
  }

  renderClassList(subject);
});

/**
 * Submit tutor application
 */
submitBtn.addEventListener("click", async () => {
  if (!currentUser) {
    alert("Please sign in first.");
    return;
  }

  const subject = subjectSel.value;
  if (!subject) {
    alert("Select a subject.");
    return;
  }

  const chosen = [
    ...classList.querySelectorAll('input[type="checkbox"]:checked')
  ].map((i) => i.value);

  if (!chosen.length) {
    alert("Pick at least one class you can tutor.");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting…";

  try {
    await addDoc(collection(db, "tutorApplications"), {
      applicantUid: currentUser.uid,
      applicantEmail: currentUser.email,
      subjects: [subject],
      classes: chosen,
      status: "pending",
      createdAt: serverTimestamp()
    });

    alert("Application submitted. A teacher will review it.");
    // After submitting, send back to student dashboard (or wherever)
    location.href = "../dashboard/student.html";
  } catch (err) {
    console.error(err);
    alert("There was an error submitting your application. Try again.");
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Application";
  }
});
