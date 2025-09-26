// Firebase v12 modular CDN imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

// Same config you used for signup
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

// Sign in
document.getElementById("signin").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    alert("Signed in successfully.");
    console.log("User:", cred.user);
    // window.location.href = "/dashboard.html"; // redirect if you have a dashboard
  } catch (err) {
    console.error(err);
    alert(`${err.code}: ${err.message}`);
  }
});

// Password reset
document.getElementById("reset").addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  if (!email) {
    alert("Enter your email first, then click 'Forgot password?'.");
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
