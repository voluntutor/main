// /dashboard/student.js

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const toastEl = $("#toast");

function showToast(msg, dur = 2000) {
  if (!toastEl) {
    console.log("[toast]", msg);
    return;
  }
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => toastEl.classList.remove("show"), dur);
}

/* ========== THEME & NAV ========== */
const themeToggle   = $("#themeToggle");
const homeLink      = $("#homeLink");
const applyTutorBtn = $("#applyTutorBtn");
const logoutBtn     = $("#logoutBtn");
const logoImg       = $("#logoImg");
const userNameEl    = $("#userName");
const userEmailEl   = $("#userEmail");
const avatarEl      = $("#avatar");

function applyTheme() {
  const saved = localStorage.getItem("vt-theme");
  const isDark = saved === "dark";
  document.body.classList.toggle("dark", isDark);
  document.documentElement.classList.toggle("dark", isDark);
}
applyTheme();

themeToggle?.addEventListener("click", () => {
  const dark = !document.body.classList.contains("dark");
  document.body.classList.toggle("dark", dark);
  document.documentElement.classList.toggle("dark", dark);
  localStorage.setItem("vt-theme", dark ? "dark" : "light");
});

//link removed because they might accidentally click it and leave the dashboard - shouldn't be needed to go back to main site
/*homeLink?.addEventListener("click", () => {
  location.href = "https://voluntutor.github.io/main/";
});*/

applyTutorBtn?.addEventListener("click", () => {
  location.href = "https://voluntutor.github.io/main/dashboard/tutor-info/tutorSignup2.html";
});

logoutBtn?.addEventListener("click", () => {
  showToast("Returning...");
  setTimeout(() => {
    location.href = "https://voluntutor.github.io/main/register/auth.html";
  }, 600);
});

// mock user info (no login for students)
if (userNameEl) userNameEl.textContent = "Student";
if (userEmailEl) userEmailEl.textContent = "";
if (avatarEl) avatarEl.textContent = "ST";

/* ========== REQUEST FORM (LOCAL ONLY) ========== */

const requestForm = $("#requestForm");
const subjectSelect = $("#subjectSelect");
const levelSelect   = $("#levelSelect");
const reqDate       = $("#reqDate");
const reqTime       = $("#reqTime");
const reqDetails    = $("#reqDetails");
const sendRequest   = $("#sendRequest");
const clearFormBtn  = $("#clearForm");
const upcomingList  = $("#upcomingList");

clearFormBtn?.addEventListener("click", () => {
  requestForm?.reset();
  showToast("Form cleared");
});

sendRequest?.addEventListener("click", () => {
  const subj = subjectSelect?.value.trim();
  const lvl  = levelSelect?.value.trim();
  const date = reqDate?.value;
  const time = reqTime?.value;

  if (!subj || !lvl || !date || !time) {
    showToast("Fill subject, level, date and time");
    return;
  }

  // For now, just add to local list
  const when = new Date(`${date}T${time}`);
  const item = document.createElement("div");
  item.className = "card";
  item.innerHTML = `
    <div>
      <div><strong>${subj} • ${lvl}</strong></div>
      <div class="small muted">
        ${when.toLocaleString([], { dateStyle:'medium', timeStyle:'short' })}
      </div>
      <div class="small muted">${reqDetails?.value?.trim() || ""}</div>
    </div>
    <button class="btn-ghost small">Remove</button>
  `;

  item.querySelector("button")?.addEventListener("click", () => {
    item.remove();
    if (!upcomingList.children.length) {
      upcomingList.innerHTML = `<div class="muted small">No sessions yet.</div>`;
    }
  });

  // wipe "no sessions" placeholder
  if (upcomingList.children.length === 1 &&
      upcomingList.firstElementChild?.classList.contains("muted")) {
    upcomingList.innerHTML = "";
  }

  upcomingList.prepend(item);

  // confetti for brain dopamine
  try {
    if (typeof confetti === "function") {
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.8 } });
    }
  } catch {}

  showToast("Session requested (locally)");
  requestForm.reset();
});

/* ========== REVIEWS & HELP ========== */

const reviewText = $("#reviewText");
$("#submitReview")?.addEventListener("click", () => {
  const txt = reviewText?.value.trim();
  if (!txt) return showToast("Write something first");
  reviewText.value = "";
  showToast("Thanks for the feedback!");
});
$("#viewReviews")?.addEventListener("click", () => {
  showToast("Reviews feature coming soon");
});

const helpText = $("#helpText");
$("#sendHelp")?.addEventListener("click", () => {
  const txt = helpText?.value.trim();
  if (!txt) return showToast("Describe the issue");
  helpText.value = "";
  showToast("Thanks, we'll take a look");
});
$("#openFAQ")?.addEventListener("click", () => {
  showToast("FAQ coming soon");
});
