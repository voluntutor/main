/*
Responsibilities:
- Initialize Firebase client SDK
- Handle the form submit to send an email sign-in link
- Provide friendly error messages and small UI niceties
- Only loaded on index.html
*/

/* Visual stars + card tilt + ripple: tiny UX details */
const stars = document.querySelector('.stars');
for (let i = 0; i < 80; i++) {
  const s = document.createElement('i');
  s.style.left = Math.random() * 100 + '%';
  s.style.top = Math.random() * 100 + '%';
  s.style.animationDelay = (Math.random() * 4).toFixed(2) + 's';
  stars.appendChild(s);
}
const card = document.getElementById('card');
card?.addEventListener('pointermove', e => {
  const b = card.getBoundingClientRect();
  const x = (e.clientX - b.left) / b.width - 0.5;
  const y = (e.clientY - b.top) / b.height - 0.5;
  card.style.transform = `rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg)`;
});
card?.addEventListener('pointerleave', () => card.style.transform = 'rotateX(0) rotateY(0)');
const btn = document.getElementById('submitBtn');
btn?.addEventListener('click', e => {
  const r = document.createElement('span');
  r.className = 'ripple';
  const rect = e.currentTarget.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  r.style.width = r.style.height = size + 'px';
  r.style.left = (e.clientX - rect.left - size / 2) + 'px';
  r.style.top = (e.clientY - rect.top - size / 2) + 'px';
  e.currentTarget.appendChild(r);
  setTimeout(() => r.remove(), 650);
});

/* Firebase imports (v12 modular SDK) */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getAuth, sendSignInLinkToEmail } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

/* Your Firebase project config */
const firebaseConfig = {
  apiKey: "AIzaSyDKACGUOxw-4lfu6so4h7cqN1-U0DeFwW4",
  authDomain: "voluntutorauthentication.firebaseapp.com",
  projectId: "voluntutorauthentication",
  storageBucket: "voluntutorauthentication.firebasestorage.app",
  messagingSenderId: "430455706771",
  appId: "1:430455706771:web:4d251ce7a1ca801771a966",
  measurementId: "G-WFJ3MZEQDL"
};
initializeApp(firebaseConfig);                // Boot the web SDK
const auth = getAuth();                       // Grab the Auth instance

/* IMPORTANT: This must match the deployed finish.html URL exactly. */
const FINISH_URL = "https://voluntutor.github.io/main/auth/finish.html";

const actionCodeSettings = {
  url: FINISH_URL,       // Where the magic link will send the user
  handleCodeInApp: true  // Required for passwordless sign-in
};

/* DOM elements */
const form = document.getElementById('signinForm');
const emailEl = document.getElementById('email');
const alertEl = document.getElementById('alert');
const resend = document.getElementById('resendLink');

function niceError(err){
  const c = err?.code || '';
  if (c.includes('unauthorized-continue-uri')) {
    return 'Firebase: Domain not allowlisted. Add your site host in Auth → Settings → Authorized domains, and set finish.html as the default redirect URL.';
  }
  if (c.includes('network-request-failed')) return 'Network error. Try again.';
  return err?.message || 'Something went wrong.';
}

async function sendLink(e){
  e?.preventDefault?.();
  if (!emailEl.checkValidity()) {
    emailEl.focus();
    emailEl.reportValidity?.();
    return;
  }
  const email = emailEl.value.trim().toLowerCase();
  try{
    btn.disabled = true; btn.textContent = 'Sending…';
    await sendSignInLinkToEmail(auth, email, actionCodeSettings); // ← main API call
    localStorage.setItem('emailForSignIn', email);                // Save email for finish step
    try { confetti({spread:70,startVelocity:35,ticks:150,gravity:.7,scalar:.9}); } catch {}
    btn.textContent = 'Check your inbox';
    resend.style.display = 'inline';
  }catch(err){
    console.error(err);
    alertEl.textContent = niceError(err);
    btn.disabled = false; btn.textContent = 'Send magic link';
  }
}

form?.addEventListener('submit', sendLink);
resend?.addEventListener('click', (e) => { e.preventDefault(); sendLink(); });

document.getElementById('swapToSignup')?.addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('title').textContent = 'Create your account';
  document.getElementById('subtitle').textContent = 'We will send a verify link to finish setup.';
  btn.textContent = 'Send verify link';
});
