// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCiiAfvZ25ChvpCVCbMj46dsCrZBYMGBpM",
  authDomain: "logintrial001.firebaseapp.com",
  projectId: "logintrial001",
  storageBucket: "logintrial001.appspot.com",
  messagingSenderId: "419688887007",
  appId: "1:419688887007:web:013af1286ba6e7aff42f6a"
};

// Initialize
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM elements
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
    const userType = document.getElementById("signup-role").value; // new dropdown

    if (password !== confirm) {
      alert("Passwords do not match.");
      return;
    }
    if (!userType) {
      alert("Please select Student or Teacher.");
      return;
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;

      // store user data in Firestore
      await setDoc(doc(db, "users", uid), {
        uid,
        email,
        userType,
        createdAt: new Date().toISOString()
      });

      alert("Signup successful!");

      // redirect based on user type
      if (userType === "teacher") {
        window.location.href = "/dashboard/teacher.html";
      } else {
        window.location.href = "/dashboard/student.html";
      }

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
      window.location.href = "route.html";
      const uid = cred.user.uid;

      // read Firestore user document to get userType
      const snap = await getDoc(doc(db, "users", uid));
      const data = snap.data();

      if (!data || !data.userType) {
        alert("User type missing. Please contact admin.");
        return;
      }

      // route based on userType
      if (data.userType === "teacher") {
        window.location.href = "/dashboard/teacher.html";
      } else {
        window.location.href = "/dashboard/student.html";
      }

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
