// teacherApplications.js

// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Firebase config (same as rest of app)
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

const appList = document.getElementById("appList");

// Cache of latest applications so click handler can find data
let cachedApps = [];

// Render all pending applications
function renderApplications(apps) {
  cachedApps = apps;

  if (!apps.length) {
    appList.innerHTML = "<p>No pending applications.</p>";
    return;
  }

  appList.innerHTML = "";
  apps.forEach((appData) => {
    const div = document.createElement("div");
    div.className = "card"; // style this in your CSS

    const {
      id,
      applicantEmail,
      subjects = [],
      classes = [],
      createdAt
    } = appData;

    div.innerHTML = `
      <p><strong>Email:</strong> ${applicantEmail || "—"}</p>
      <p><strong>Subject(s):</strong> ${subjects.join(", ") || "—"}</p>
      <p><strong>Classes:</strong> ${classes.join(", ") || "—"}</p>
      <p><strong>Submitted:</strong> ${
        createdAt?.toDate ? createdAt.toDate().toLocaleString() : "—"
      }</p>
      <button class="btn-approve" data-action="approve" data-id="${id}">Approve</button>
      <button class="btn-reject" data-action="reject" data-id="${id}">Reject</button>
    `;

    appList.appendChild(div);
  });
}

// Approve an application: mark approved + set user role to tutor
async function handleApprove(appData) {
  const { id, applicantUid, applicantEmail, subjects = [], classes = [] } = appData;

  if (!applicantUid) {
    alert("Missing applicant UID; cannot approve.");
    return;
  }

  // 1) Mark application as approved
  await updateDoc(doc(db, "tutorApplications", id), {
    status: "approved",
    reviewedAt: serverTimestamp()
  });

  // 2) Update/create user doc with tutor role and allowed subjects/classes
  const userRef = doc(db, "users", applicantUid);
  await setDoc(
    userRef,
    {
      role: "tutor",
      tutorSubjects: subjects,
      tutorClasses: classes,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  alert(`Approved tutor application for ${applicantEmail || "this user"}.`);
}

// Reject an application: mark rejected
async function handleReject(appData) {
  const { id, applicantEmail } = appData;

  await updateDoc(doc(db, "tutorApplications", id), {
    status: "rejected",
    reviewedAt: serverTimestamp()
  });

  alert(`Rejected tutor application for ${applicantEmail || "this user"}.`);
}

// Handle clicks on Approve / Reject buttons (event delegation)
appList.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const action = btn.dataset.action;
  const id = btn.dataset.id;
  const appData = cachedApps.find((a) => a.id === id);
  if (!appData) return;

  try {
    if (action === "approve") {
      await handleApprove(appData);
    } else if (action === "reject") {
      await handleReject(appData);
    }
  } catch (err) {
    console.error(err);
    alert("There was an error processing this application. Check the console for details.");
  }
});

// On auth state change: make sure teacher is logged in, then listen for pending applications
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // Not signed in → send to auth
    location.href = "https://voluntutor.github.io/main/register/auth.html";
    return;
  }

  // Optional: enforce teacher-only access using users collection
  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      if (data.role && data.role !== "teacher") {
        // Non-teacher trying to access this page
        alert("You do not have permission to view tutor applications.");
        location.href = "../dashboard/student.html";
        return;
      }
    }
  } catch (err) {
    console.warn("Could not verify user role:", err);
  }

  // Real-time listener for pending tutor applications
  const q = query(
    collection(db, "tutorApplications"),
    where("status", "==", "pending")
  );

  onSnapshot(q, (snap) => {
    const apps = snap.docs.map((d) => ({
      id: d.id,
      ...d.data()
    }));
    renderApplications(apps);
  });
});
