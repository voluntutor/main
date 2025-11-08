/*
Responsibilities:
- Initialize Firebase
- Detect if current URL is a valid email link
- Complete sign-in with signInWithEmailLink
- Route teacher vs student based on email domain
*/

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getAuth, isSignInWithEmailLink, signInWithEmailLink } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

/* Same Firebase config as the sender page */
const firebaseConfig = {
  apiKey: "AIzaSyDKACGUOxw-4lfu6so4h7cqN1-U0DeFwW4",
  authDomain: "voluntutorauthentication.firebaseapp.com",
  projectId: "voluntutorauthentication",
  storageBucket: "voluntutorauthentication.firebasestorage.app",
  messagingSenderId: "430455706771",
  appId: "1:430455706771:web:4d251ce7a1ca801771a966",
  measurementId: "G-WFJ3MZEQDL"
};
initializeApp(firebaseConfig);
const auth = getAuth();

/* Where to send users after success */
const TEACHER_DEST = "https://voluntutor.github.io/main/dashboard/teacher.html";  // teachers go here
const STUDENT_DEST = "https://voluntutor.github.io/main/dashboard/tutor.html";    // everyone else goes here

const statusEl = document.getElementById('status');

function niceError(err){
  const c = err?.code || '';
  if (c.includes('invalid-action-code')) return 'This link is invalid or expired. Try sending a new one.';
  return err?.message || 'Sign-in failed.';
}

(async () => {
  const href = location.href;                                   // Full URL with oobCode
  if (!isSignInWithEmailLink(auth, href)) {                     // Is this a valid link for our app?
    statusEl.textContent = 'Invalid or expired link.';          // Not a valid link → show message
    return;
  }
  try {
    // Get the email we saved on the sender page. If missing (e.g., opened on another device), ask.
    let email = localStorage.getItem('emailForSignIn');
    if (!email) {
      email = prompt('Confirm your email to finish sign-in');   // Security: must confirm ownership
      if (!email) throw new Error('Email confirmation required.');
    }
    email = email.trim().toLowerCase();

    // Complete the sign-in with the link the user clicked
    await signInWithEmailLink(auth, email, href);
    localStorage.removeItem('emailForSignIn');

    // Route by email domain
    const isTeacher = email.endsWith('@hse.k12.in.us') || email.endsWith('@gmail.com');
    const dest = isTeacher ? TEACHER_DEST : STUDENT_DEST;

    statusEl.textContent = 'Signed in. Redirecting…';
    location.replace(dest);                                     // Final redirect
  } catch (err) {
    console.error(err);
    statusEl.textContent = niceError(err);                      // Show friendly failure
  }
})();
