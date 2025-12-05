// tutorSignup.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Firebase config
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

const subjectSel = document.getElementById("subject");
const classList  = document.getElementById("classList");
const submitBtn  = document.getElementById("submitApp");

let currentUser = null;

// 1) Ensure signed in and not already a tutor
onAuthStateChanged(auth, async (u) => {
  currentUser = u;
  if (!u) {
    location.href = "https://voluntutor.github.io/main/register/auth.html";
    return;
  }

  // Optional: if user already approved tutor, send them to tutor dashboard instead of re-applying.
  const userRef = doc(db, "users", u.uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists() && userSnap.data().role === "tutor") {
    alert("You are already approved as a tutor.");
    location.href = "../dashboard/tutor.html";
  }
});

// 2) Load classes when subject changes
subjectSel.addEventListener("change", async () => {
  classList.textContent = "Loading classes…";

  const q = query(
    collection(db, "classes"),
    where("subject", "==", subjectSel.value)
  );
  const snap = await getDocs(q);

  classList.innerHTML = "";
  if (snap.empty) {
    classList.textContent = "No classes found.";
    return;
  }

  for (const docSnap of snap.docs) {
    const c = docSnap.data();
    classList.insertAdjacentHTML(
      "beforeend",
      `
      <label class="check">
        <input type="checkbox" value="${c.name}"> ${c.name}
      </label><br>
    `
    );
  }
});

// 3) Submit application
submitBtn.addEventListener("click", async () => {
  if (!currentUser) {
    alert("Sign in first.");
    return;
  }

  const subject = subjectSel.value;
  const chosen = [...classList.querySelectorAll('input[type=checkbox]:checked')]
    .map((i) => i.value);

  if (!subject || chosen.length === 0) {
    alert("Pick a subject and at least one class.");
    return;
  }

  // Optional: prevent duplicate pending application for the same user
  const existingQ = query(
    collection(db, "tutorApplications"),
    where("applicantUid", "==", currentUser.uid),
    where("status", "==", "pending")
  );
  const existingSnap = await getDocs(existingQ);
  if (!existingSnap.empty) {
    alert("You already have a pending tutor application. A teacher will review it.");
    return;
  }

  await addDoc(collection(db, "tutorApplications"), {
    applicantUid: currentUser.uid,
    applicantEmail: currentUser.email,
    subjects: [subject],
    classes: chosen,
    status: "pending",
    createdAt: serverTimestamp()
  });

  alert("Application submitted. A teacher will review it.");

  // Send them back to student dashboard (or wherever you want)
  location.href = "../dashboard/student.html";
});
