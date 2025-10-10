import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import {
  getFirestore, collection, query, where, getDocs, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const app = initializeApp({ /* your Firebase config */ });
const auth = getAuth(app);
const db = getFirestore(app);

const subjectSel = document.getElementById('subject');
const classList  = document.getElementById('classList');
const submitBtn  = document.getElementById('submitApp');

let currentUser = null;
onAuthStateChanged(auth, (u) => {
  currentUser = u;
  if (!u) location.href = "./auth.html";
});

subjectSel.addEventListener('change', async () => {
  classList.textContent = "Loading classes…";
  const q = query(collection(db, 'classes'), where('subject','==', subjectSel.value));
  const snap = await getDocs(q);
  classList.innerHTML = "";
  if (snap.empty) { classList.textContent = "No classes found."; return; }
  for (const docSnap of snap.docs) {
    const c = docSnap.data();
    const id = `cls_${docSnap.id}`;
    classList.insertAdjacentHTML('beforeend', `
      <label class="check">
        <input type="checkbox" value="${c.name}"> ${c.name}
      </label><br>
    `);
  }
});

submitBtn.addEventListener('click', async () => {
  if (!currentUser) { alert("Sign in first."); return; }
  const subject = subjectSel.value;
  const chosen = [...classList.querySelectorAll('input[type=checkbox]:checked')].map(i => i.value);
  if (!subject || chosen.length === 0) { alert("Pick a subject and at least one class."); return; }

  await addDoc(collection(db, 'tutorApplications'), {
    applicantUid: currentUser.uid,
    applicantEmail: currentUser.email,
    subjects: [subject],
    classes: chosen,
    status: 'pending',
    createdAt: serverTimestamp()
  });

  alert("Application submitted. A teacher will review it.");
  location.href = "../dashboard/student.html";
});
