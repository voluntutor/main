// auth.js
// Firebase (match config used in dashboard/tutor.html)
import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithEmailAndPassword,
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
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch {}

function qs(sel) { return document.querySelector(sel); }

const signupForm   = qs('#signup');
const signupBtn    = qs('#signup-btn');
const signupStatus = qs('#signup-status');

const signinForm   = qs('#signin');
const signinStatus = qs('#signin-status');

// Overlay toggles (if you use them)
qs('#switchToSignIn')?.addEventListener('click', () => {
  document.querySelector('.container')?.classList.remove('right-panel-active');
});
qs('#switchToSignUp')?.addEventListener('click', () => {
  document.querySelector('.container')?.classList.add('right-panel-active');
});

// Guard against overlay eating clicks
document.querySelector('.container__overlay')?.setAttribute('style','pointer-events:none;');
document.querySelectorAll('.overlay__panel .btn').forEach(b => b.style.pointerEvents = 'auto');

// SIGNUP SUBMIT
signupForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name     = qs('#signupName')?.value?.trim();
  const email    = qs('#signupEmail')?.value?.trim();
  const password = qs('#signupPassword')?.value;
  const role     = qs('#signup-role')?.value;  // "student" or "teacher" (or whatever you defined)

  if (!name || !email || !password || !role) {
    if (signupStatus) signupStatus.textContent = 'Fill all fields, champ.';
    return;
  }

  signupBtn.disabled = true;
  if (signupStatus) signupStatus.textContent = 'Creating your account...';

  try {
    if (!auth) throw new Error('Auth not initialized');

    const cred = await createUserWithEmailAndPassword(auth, email, password);

    try {
      await updateProfile(cred.user, { displayName: name });
    } catch {}

    try {
      await setDoc(doc(db, 'users', cred.user.uid), {
        displayName: name,
        email,
        role,          // store selected role
        createdAt: Date.now()
      });
    } catch {}

    if (signupStatus) signupStatus.textContent = 'Success. Redirecting...';
    // Do NOT redirect here; onAuthStateChanged below will handle redirect based on role.
  } catch (err) {
    if (signupStatus) {
      signupStatus.textContent = (err && err.message) || 'Signup failed. Try again.';
    }
    signupBtn.disabled = false;
  }
});

// SIGNIN SUBMIT
signinForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email    = qs('#signin-email')?.value?.trim();
  const password = qs('#signin-password')?.value;

  if (!email || !password) {
    if (signinStatus) signinStatus.textContent = 'Email and password. Both.';
    return;
  }

  if (signinStatus) signinStatus.textContent = 'Signing in...';

  try {
    if (!auth) throw new Error('Auth not initialized');

    await signInWithEmailAndPassword(auth, email, password);

    if (signinStatus) signinStatus.textContent = 'Welcome back.';
    // Redirect is handled globally by onAuthStateChanged below.
  } catch (err) {
    if (signinStatus) {
      signinStatus.textContent = (err && err.message) || 'Sign in failed.';
    }
  }
});

// GLOBAL ROLE-BASED REDIRECT AFTER LOGIN / SIGNUP
onAuthStateChanged(auth, async (user) => {
  if (!user || !db) return;

  try {
    const userRef = doc(db, 'users', user.uid);
    const snap    = await getDoc(userRef);
    const data    = snap.exists() ? snap.data() : {};
    const role    = data.role || 'student';

    // Choose where each role lands:
    if (role === 'teacher') {
      // Teacher dashboard
      location.href = 'https://voluntutor.github.io/main/dashboard/teacher.html';
    } else if (role === 'tutor') {
      // Approved tutor (role set by teacher from tutorApplications.js)
      location.href = 'https://voluntutor.github.io/main/dashboard/tutor.html';
    } else {
      // Default = student. For now send to tutor application page as you wanted.
      location.href = 'https://voluntutor.github.io/main/dashboard/tutorSignup.html';
      // If later you want a student dashboard instead, change to:
      // location.href = 'https://voluntutor.github.io/main/dashboard/student.html';
    }
  } catch (err) {
    console.error('Role-based redirect failed:', err);
    // Fallback: send to student-ish page
    location.href = 'https://voluntutor.github.io/main/dashboard/tutorSignup.html';
  }
});
