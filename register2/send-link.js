import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getAuth, sendSignInLinkToEmail } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

// Your Firebase config (from your message)
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

// IMPORTANT: if your site is a project page, keep /main/
const actionCodeSettings = {
  url: "https://voluntutor.github.io/main/auth/finish.html",
  handleCodeInApp: true
};

const form = document.getElementById("emailForm");
const emailInput = document.getElementById("email");
const msg = document.getElementById("msg");

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = emailInput.value.trim().toLowerCase();

  if (!email) return;
  msg.textContent = "Sending link…";
  form.querySelector('button[type="submit"]').disabled = true;

  try {
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    localStorage.setItem("emailForSignIn", email);
    msg.textContent = "Link sent. Check your inbox.";
  } catch (err) {
    console.error(err);
    msg.textContent = err?.message || "Could not send link.";
    msg.classList.add("error");
    form.querySelector('button[type="submit"]').disabled = false;
  }
});
