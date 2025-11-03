// auth.js
// Firebase (match config used in dashboard/tutor.html)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, updateProfile, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

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

function qs(sel){ return document.querySelector(sel); }

const signupForm = qs('#signup');
const signupBtn  = qs('#signup-btn');
const signupStatus = qs('#signup-status');

const signinForm = qs('#signin');
const signinStatus = qs('#signin-status');

// Overlay toggles (if you use them)
qs('#switchToSignIn')?.addEventListener('click', () => {
  document.querySelector('.container')?.classList.remove('right-panel-active');
});
qs('#switchToSignUp')?.addEventListener('click', () => {
  document.querySelector('.container')?.classList.add('right-panel-active');
});

// Guard against overlay eating clicks
// Ensure overlay panels don't block pointer events over forms
document.querySelector('.container__overlay')?.setAttribute('style','pointer-events:none;');
document.querySelectorAll('.overlay__panel .btn').forEach(b => b.style.pointerEvents = 'auto');

// SIGNUP SUBMIT
signupForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = qs('#signupName')?.value?.trim();
  const email = qs('#signupEmail')?.value?.trim();
  const password = qs('#signupPassword')?.value;
  const role = qs('#signup-role')?.value;

  if(!name || !email || !password || !role){
    signupStatus.textContent = 'Fill all fields, champ.';
    return;
  }

  signupBtn.disabled = true;
  signupStatus.textContent = 'Creating your account...';

  try{
    if(!auth) throw new Error('Auth not initialized');
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    try { await updateProfile(cred.user, { displayName: name }); } catch {}
    try {
      await setDoc(doc(db, 'users', cred.user.uid), {
        displayName: name,
        email,
        role,
        createdAt: Date.now()
      });
    } catch {}

    signupStatus.textContent = 'Success. Redirecting...';
    // After sign up, go to Tutor Signup page to collect details
    location.href = 'https://voluntutor.github.io/main/dashboard/tutorSignup.html';
  }catch(err){
    signupStatus.textContent = (err && err.message) || 'Signup failed. Try again.';
    signupBtn.disabled = false;
  }
});

// SIGNIN SUBMIT (optional parity)
signinForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = qs('#signin-email')?.value?.trim();
  const password = qs('#signin-password')?.value;
  if(!email || !password){
    signinStatus.textContent = 'Email and password. Both.';
    return;
  }
  signinStatus.textContent = 'Signing in...';
  try{
    if(!auth) throw new Error('Auth not initialized');
    await signInWithEmailAndPassword(auth, email, password);
    signinStatus.textContent = 'Welcome back.';
    // After sign in, you can decide where to land; keeping Tutor Dashboard for now
    location.href = 'https://voluntutor.github.io/main/dashboard/tutor.html';
  }catch(err){
    signinStatus.textContent = (err && err.message) || 'Sign in failed.';
  }
});
