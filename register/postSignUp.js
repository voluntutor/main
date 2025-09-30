import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getAuth, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

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
const db   = getFirestore(app);

const form = document.getElementById("profile-form");

function goToDashboard(role) {
  if (role === "teacher") window.location.href = "/teacher/dashboard.html";
  else window.location.href = "/student/dashboard.html";
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // not signed in, back to sign-in
    window.location.href = "/signin.html";
    return;
  }

  // If profile already exists with role, skip this page
  const snap = await getDoc(doc(db, "users", user.uid));
  if (snap.exists() && snap.data().role) {
    goToDashboard(snap.data().role);
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const user = auth.currentUser;
  if (!user) return;

  const firstName = document.getElementById("first-name").value.trim();
  const lastName  = document.getElementById("last-name").value.trim();
  const role      = document.getElementById("role").value;

  try {
    // Update Auth profile display name
    await updateProfile(user, { displayName: `${firstName} ${lastName}` });

    // Create/update Firestore profile
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      firstName,
      lastName,
      role,                  // "student" | "teacher"
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    }, { merge: true });

    goToDashboard(role);
  } catch (err) {
    console.error(err);
    alert(`${err.code}: ${err.message}`);
  }
});
