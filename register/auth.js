// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

// Firebase config (same as before)
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

// Grab DOM elements
const container = document.querySelector(".container");
const switchToSignIn = document.getElementById("switchToSignIn");
const switchToSignUp = document.getElementById("switchToSignUp");

// === Overlay toggle logic ===
if (switchToSignIn) {
  switchToSignIn.addEventListener("click", () => {
    container.classList.remove("right-panel-active");
  });
}
if (switchToSignUp) {
  switchToSignUp.addEventListener("click", () => {
    container.classList.add("right-panel-active");
  });
}

// === Signup form ===
const signupForm = document.getElementById("signup");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;
    const confirm = document.getElementById("signup-confirm").value;

    if (password !== confirm) {
      alert("Passwords do not match.");
      return;
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      alert("Signup successful.");
      console.log("Signed up user:", cred.user);
      // redirect if needed
    } catch (err) {
      console.error(err);
      alert(`${err.code}: ${err.message}`);
    }
  });
}

// === Signin form ===
const signinForm = document.getElementById("signin");
if (signinForm) {
  signinForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("signin-email").value.trim();
    const password = document.getElementById("signin-password").value;

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      alert("Signed in successfully.");
      console.log("Signed in user:", cred.user);
      // redirect if needed
    } catch (err) {
      console.error(err);
      alert(`${err.code}: ${err.message}`);
    }
  });
}

// === Reset password link ===
const resetLink = document.getElementById("reset-link");
if (resetLink) {
  resetLink.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = document.getElementById("signin-email").value.trim();
    if (!email) {
      alert("Enter your email first, then click reset.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent.");
    } catch (err) {
      console.error(err);
      alert(`${err.code}: ${err.message}`);
    }
  });
}
