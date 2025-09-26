// Correct CDN paths (note the "firebasejs" and not "firebase/")
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

// Your Firebase config (storageBucket is usually *.appspot.com)
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

// Handle the form submit instead of button click
document.getElementById("signup").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirm = document.getElementById("signup-confirm").value;

  if (password !== confirm) {
    alert("Passwords do not match.");
    return;
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    // Yes, this alert will actually show now.
    alert("You are signed up");
    console.log("User:", cred.user);
  } catch (err) {
    console.error(err);
    // Show the actual error so you’re not debugging a useless “error”
    alert(`${err.code}: ${err.message}`);
  }
});


