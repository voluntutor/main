// auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCiiAfvZ25ChvpCVCbMj46dsCrZBYMGBpM",
  authDomain: "logintrial001.firebaseapp.com",
  projectId: "logintrial001",
  storageBucket: "logintrial001.appspot.com",
  messagingSenderId: "419688887007",
  appId: "1:419688887007:web:013af1286ba6e7aff42f6a"
};

let app, auth, db;

// DO NOT swallow init errors
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  console.log("[INIT] Firebase initialized.");
} catch (err) {
  console.error("[INIT ERROR]", err);
}

// Shortcuts
const qs = s => document.querySelector(s);

// Forms
const signupForm   = qs('#signup');
const signupBtn    = qs('#signup-btn');
const signupStatus = qs('#signup-status');

const signinForm   = qs('#signin');
const signinStatus = qs('#signin-status');

// Panel switching
qs('#switchToSignIn')?.addEventListener('click', () => {
  qs('.container')?.classList.remove('right-panel-active');
});
qs('#switchToSignUp')?.addEventListener('click', () => {
  qs('.container')?.classList.add('right-panel-active');
});

// Prevent overlay from blocking clicks
qs('.container__overlay')?.setAttribute('style', 'pointer-events:none;');
document.querySelectorAll('.overlay__panel .btn')
  .forEach(b => b.style.pointerEvents = 'auto');

// --------------------------------------------------
// DEBUG HELPER
// --------------------------------------------------
function logCurrentUser(label = "[CURRENT USER]") {
  if (!auth) {
    console.warn(label, "auth is undefined");
    return;
  }
  const u = auth.currentUser;
  if (!u) {
    console.log(label, "no user is currently signed in");
  } else {
    console.log(label, { uid: u.uid, email: u.email, displayName: u.displayName });
  }
}

// Optional: see what Firebase restores on page load
if (auth) {
  onAuthStateChanged(auth, (user) => {
    console.log("[AUTH STATE CHANGED]", user ? { uid: user.uid, email: user.email } : "no user");
    // IMPORTANT: if you auto-redirect here, it can feel like “random login”
    // Make sure you are not also calling redirectBasedOnRole() here in another file
  });
}

// --------------------------------------------------
// ROLE-BASED REDIRECT
// --------------------------------------------------
async function redirectBasedOnRole(user) {
  if (!user || !db) return;

  console.log("[REDIRECT] Using user", { uid: user.uid, email: user.email });

  try {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    const data = snap.exists() ? snap.data() : {};
    const role = data.role || "tutor";

    console.log("[REDIRECT] Firestore role =", role, "doc data =", data);

    if (role === "teacher") {
      location.href = "https://voluntutor.github.io/main/dashboard/teacher.html";
    } else if (role === "tutor") {
      location.href = "https://voluntutor.github.io/main/dashboard/tutor.html";
    } else {
      // Student → Student dashboard (currently same as tutor)
      location.href = "https://voluntutor.github.io/main/dashboard/tutor.html";
    }
  } catch (err) {
    console.error("[REDIRECT ERROR]", err);
    location.href = "https://voluntutor.github.io/main/dashboard/tutor.html";
  }
}

// --------------------------------------------------
// SIGN UP
// --------------------------------------------------
signupForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name     = qs('#signupName')?.value?.trim();
  const email    = qs('#signupEmail')?.value?.trim();
  const password = qs('#signupPassword')?.value;
  const role     = qs('#signup-role')?.value;

  console.log("[SIGNUP] Form values", { name, email, role });

  if (!name || !email || !password || !role) {
    signupStatus.textContent = "Fill all fields.";
    return;
  }

  if (!auth || !db) {
    signupStatus.textContent = "Auth not initialized.";
    console.error("[SIGNUP] auth or db undefined");
    return;
  }

  signupBtn.disabled = true;
  signupStatus.textContent = "Creating account...";

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    console.log("[SIGNUP] Created user", { uid: cred.user.uid, email: cred.user.email });

    await updateProfile(cred.user, { displayName: name });

    await setDoc(doc(db, "users", cred.user.uid), {
      displayName: name,
      email,
      role,
      createdAt: Date.now()
    });

    signupStatus.textContent = "Success. Redirecting...";
    await redirectBasedOnRole(cred.user);

  } catch (err) {
    console.error("[SIGNUP ERROR]", err);
    signupStatus.textContent = err.message || "Signup failed.";
    signupBtn.disabled = false;
  }
});

// --------------------------------------------------
// SIGN IN
// --------------------------------------------------
signinForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email    = qs('#signin-email')?.value?.trim();
  const password = qs('#signin-password')?.value;

  console.log("[SIGNIN] Form values", { email });

  if (!email || !password) {
    signinStatus.textContent = "Email and password required.";
    return;
  }

  if (!auth) {
    signinStatus.textContent = "Auth not initialized.";
    console.error("[SIGNIN] auth undefined");
    return;
  }

  signinStatus.textContent = "Signing in...";

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    console.log("[SIGNIN] Signed in as", {
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: cred.user.displayName
    });

    signinStatus.textContent = "Welcome back.";
    await redirectBasedOnRole(cred.user);

  } catch (err) {
    console.error("[SIGNIN ERROR]", err);
    signinStatus.textContent = err.message || "Sign in failed.";
  }
});

// --------------------------------------------------
// SIMPLE SIGN OUT BUTTON (optional for debugging)
// --------------------------------------------------
const signoutBtn = qs('#signout-btn');
signoutBtn?.addEventListener('click', async () => {
  if (!auth) return;
  try {
    await signOut(auth);
    console.log("[SIGNOUT] Signed out.");
    logCurrentUser("[AFTER SIGNOUT]");
  } catch (err) {
    console.error("[SIGNOUT ERROR]", err);
  }
});
