import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getAuth, isSignInWithEmailLink, signInWithEmailLink } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

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
const $status = document.getElementById("status");

// destinations
const teacherDest = "https://voluntutor.github.io/main/dashboard/teacher.html";
const studentDest = "https://voluntutor.github.io/main/dashboard/tutor.html"; // your existing student/tutor page

(async () => {
  try {
    const href = window.location.href;

    if (!isSignInWithEmailLink(auth, href)) {
      $status.textContent = "Invalid or expired link.";
      return;
    }

    let email = localStorage.getItem("emailForSignIn");
    if (!email) {
      email = prompt("Confirm your email to finish sign-in");
      if (!email) throw new Error("Email confirmation required.");
    }

    await signInWithEmailLink(auth, email, href);
    localStorage.removeItem("emailForSignIn");

    // Routing by email domain
    const lower = email.toLowerCase();
    const isTeacher = lower.endsWith("@hse.k12.in.us") || lower.endsWith("@gmail.com");
    const dest = isTeacher ? teacherDest : studentDest;

    $status.textContent = "Signed in. Redirecting…";
    window.location.replace(dest);
  } catch (err) {
    console.error(err);
    $status.textContent = err?.message || "Sign-in failed.";
  }
})();
