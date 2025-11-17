/* ================= Firebase (ESM via CDN) ================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
    getFirestore, doc, setDoc, getDoc, serverTimestamp, Timestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Your real config (from your last message)
const firebaseConfig = {
    apiKey: "AIzaSyCiiAfvZ25ChvpCVCbMj46dsCrZBYMGBpM",
    authDomain: "logintrial001.firebaseapp.com",
    projectId: "logintrial001",
    storageBucket: "logintrial001.appspot.com",
    messagingSenderId: "419688887007",
    appId: "1:419688887007:web:013af1286ba6e7aff42f6a"
};

let app, auth, db, firebaseReady = false;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    firebaseReady = true;
} catch (e) {
    console.warn("Firebase init failed; running in local-only mode.", e);
    firebaseReady = false;
}

/* ================= Utilities ================= */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const toast = (msg) => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1800); };
const uid = () => Math.random().toString(36).slice(2,9);
const safeUUID = () => (crypto?.randomUUID?.() ?? `slot_${uid()}`);

/* ===== Timezone helpers (EST) ===== */
const TIME_ZONE = 'America/New_York';
function tzOffsetMsAt(utcDate, timeZone = TIME_ZONE){
    const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12:false, year:'numeric', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit', second:'2-digit'
    });
    const parts = Object.fromEntries(fmt.formatToParts(utcDate).map(p=>[p.type, p.value]));
    const tzAsUTC = Date.UTC(
    Number(parts.year), Number(parts.month)-1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second)
    );
    return tzAsUTC - utcDate.getTime();
}
function dateInTZ(dateStr, timeStr, timeZone = TIME_ZONE){
    const [y, m, d] = dateStr.split('-').map(Number);
    const [hh, mm]  = timeStr.split(':').map(Number);
    const utcGuess = new Date(Date.UTC(y, (m-1), d, hh, mm, 0));
    const offsetMs = tzOffsetMsAt(utcGuess, timeZone);
    return new Date(utcGuess.getTime() - offsetMs);
}
function fmtEST(dt){
    return new Date(dt).toLocaleString([], { dateStyle:'medium', timeStyle:'short', timeZone: TIME_ZONE });
}

/* ================= Theme ================= */
const applyTheme = () => {
    const saved = localStorage.getItem('vt-theme');
    if (saved === 'dark') document.body.classList.add('dark');
    if (saved === 'light') document.body.classList.remove('dark');
};
applyTheme();
$('#themeToggle')?.addEventListener('click', () => {
    const dark = document.body.classList.toggle('dark');
    localStorage.setItem('vt-theme', dark ? 'dark' : 'light');
});

/* ===== Simple routing buttons ===== */
$('#homeLink')?.addEventListener('click', () => location.href = 'https://voluntutor.github.io/main/dashboard/tutor.html');
$('#applyTutorBtn')?.addEventListener('click', () => location.href = 'student.html');
$('#logoutBtn')?.addEventListener('click', async () => {
    try { if (auth) await signOut(auth); } catch {}
    toast('Logged out'); setTimeout(()=> location.href = 'https://voluntutor.github.io/main/register/auth.html', 600);
});

/* ================= Subject -> Level ================= */
let levelsBySubject = {};

async function loadSubjects() {
  try {
    //const res = await fetch('https://voluntutor.github.io/main/dashboard/subjects.json');
    const res = await fetch('subjects.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    levelsBySubject = await res.json();

    // Populate subject dropdown
    populateSubjects();
  } catch (err) {
    console.error('Failed to load subjects.json', err);
    toast('Failed to load subjects list.');
  }
}

function populateSubjects() {
  const subjectSelect = $('#subjectSelect');
  subjectSelect.innerHTML = '<option value="">Select Subject</option>';
  Object.keys(levelsBySubject).forEach(subject => {
    const opt = document.createElement('option');
    opt.value = subject;
    opt.textContent = subject;
    subjectSelect.appendChild(opt);
  });
}

function populateLevels() {
  const subj = $('#subjectSelect').value;
  const levelSelect = $('#levelSelect');
  levelSelect.innerHTML = '<option value="">Select Level</option>';
  (levelsBySubject[subj] || []).forEach(level => {
    const opt = document.createElement('option');
    opt.value = level;
    opt.textContent = level;
    levelSelect.appendChild(opt);
  });
}

$('#subjectSelect').addEventListener('change', populateLevels);

// Load at startup
loadSubjects();

/*const subjectSelect = $('#subjectSelect');
const levelSelect = $('#levelSelect');
function populateLevels(){
    const subj = subjectSelect.value;
    levelSelect.innerHTML = '<option value="">Select Level</option>';
    (levelsBySubject[subj] || []).forEach(l=>{
    const opt = document.createElement('option'); opt.value = l; opt.textContent = l; levelSelect.appendChild(opt);
    });
}
subjectSelect.addEventListener('change', populateLevels);*/

/* ================= Calendar (local render, instant) ================= */
const calHead = $('#calHead');
const cal = $('#calendar');
const monthLabel = $('#monthLabel');
const weekdayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
calHead.innerHTML = weekdayNames.map(d=>`<div class="small" style="text-align:center">${d}</div>`).join('');
let current = new Date(); current.setDate(1);

const STORAGE_KEY = 'vt-tutor-events-v1';
let events = loadEvents();
function loadEvents(){ try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }catch{ return []; } }
function saveEvents(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(events)); }

function renderCalendar(){
    try {
    cal.innerHTML = '';
    const year = current.getFullYear();
    const month = current.getMonth();
    monthLabel.textContent = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date(); today.setHours(0,0,0,0);

    for (let i=0; i<firstDay; i++) cal.appendChild(document.createElement('div'));

    for (let d=1; d<=daysInMonth; d++){
        const cell = document.createElement('div');
        cell.className = 'cal-cell';
        const date = new Date(year, month, d);
        if (+date === +today) cell.classList.add('today');
        cell.innerHTML = `<div class="cal-date">${d}</div>`;

        const dayEvents = eventsForDate(date);
        if (dayEvents.length){
        const canceled = dayEvents.every(e=>e.canceled);
        const badge = document.createElement('div');
        badge.className = 'badge';
        badge.textContent = canceled ? 'Canceled' : `${dayEvents.length} appt`;
        cell.appendChild(badge);
        }

        cell.addEventListener('click', () => openDayOverlay(date));
        cal.appendChild(cell);
    }
    } catch (e) {
    console.error("renderCalendar failed:", e);
    monthLabel.textContent = "Calendar error";
    toast("Calendar failed to render");
    }
}

function startOfDay(dt){ const d = new Date(dt); d.setHours(0,0,0,0); return d; }
function sameDay(a,b){ return startOfDay(a).getTime() === startOfDay(b).getTime(); }
function eventsForDate(date){ return events.filter(e => sameDay(new Date(e.when), date)); }

/* ================= Lists ================= */
function renderLists(){
    try {
    const now = new Date();
    const upcoming = events
        .filter(e => !e.canceled && new Date(e.when) >= now)
        .sort((a,b)=> new Date(a.when)-new Date(b.when));

    const past = events
        .filter(e => new Date(e.when) < now)
        .sort((a,b)=> new Date(b.when)-new Date(a.when));

    const up = $('#upcomingList');
    up.innerHTML = upcoming.length ? '' : '<div class="muted small">No upcoming appointments.</div>';
    upcoming.forEach(e => up.appendChild(appointmentRow(e, true)));

    const pa = $('#pastList');
    pa.innerHTML = past.length ? '' : '<div class="muted small">No past appointments.</div>';
    past.forEach(e => pa.appendChild(appointmentRow(e, false)));
    } catch (e) {
    console.error("renderLists failed:", e);
    }
}

function appointmentRow(e, canCancel){
    const row = document.createElement('div');
    row.className = 'card';
    const when = new Date(e.when);
    row.innerHTML = `
    <div class="info">
        <div class="row">
        <strong>${e.subject}</strong>
        <span class="pill">${e.level}</span>
        ${e.canceled ? '<span class="pill cancel">Canceled</span>' : ''}
        </div>
        <div class="small muted">${fmtEST(when)}</div>
        ${e.notes ? `<div class="small muted">Notes: ${escapeHtml(e.notes)}</div>` : ''}
    </div>
    `;
    const actions = document.createElement('div');
    actions.className = 'row';
    if (canCancel && !e.canceled){
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-ghost small';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', ()=>{
        e.canceled = true; saveEvents(); renderCalendar(); renderLists(); toast('Appointment canceled');
    });
    actions.appendChild(cancelBtn);
    }
    row.appendChild(actions);
    return row;
}

function escapeHtml(s){ return s?.replace?.(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])) ?? s; }

/* ================= Overlay ================= */
const dayOverlay = $('#dayOverlay');
function openDayOverlay(date){
    dayOverlay.dataset.theDate = date;
    $('#overlayTitle').textContent = date.toDateString();
    const list = eventsForDate(date).sort((a,b)=> new Date(a.when)-new Date(b.when));
    $('#overlayBody').innerHTML = list.length
    ? list.map(e => {
        const dt = new Date(e.when);
        return `
            <div class="card">
            <div>
                <div class="row"><strong>${e.subject}</strong><span class="pill">${e.level}</span>${e.canceled?'<span class="pill cancel">Canceled</span>':''}</div>
                <div class="small muted">${fmtEST(dt)}</div>
            </div>
            </div>`;
        }).join('')
    : `<div class="muted small">No appointments for this date.</div>`;
    dayOverlay.classList.remove('hidden');
}
$('#overlayClose')?.addEventListener('click', ()=> dayOverlay.classList.add('hidden'));
$('#overlayBackdrop')?.addEventListener('click', ()=> dayOverlay.classList.add('hidden'));
$('#overlayQuickAdd')?.addEventListener('click', () => {
    dayOverlay.classList.add('hidden');
    const d = new Date(dayOverlay.dataset.theDate);
    const today = new Date();

    if (d.setHours(0,0,0,0) < today.setHours(0,0,0,0)) {
        toast('Cannot prefill past date');
    } else {
        $('#reqDate').value = d.toISOString().slice(0, 10);
        toast('Prefilled ' + String(d.toDateString()));
    }
});

/* ================= Auth: robust name/email ================= */
let authedTutor = null;
if (auth) {
    onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    const email = user.email || '';
    let name = (user.displayName && user.displayName.trim())
        ? user.displayName.trim()
        : (email ? email.split('@')[0] : 'Tutor');

    // Try Firestore profile if displayName is empty
    try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        const prof = snap.exists() ? snap.data() : null;
        if ((!user.displayName || !user.displayName.trim()) && prof?.displayName) {
        name = prof.displayName.trim();
        try { await updateProfile(user, { displayName: name }); } catch {}
        }
    } catch {}

    authedTutor = { uid: user.uid, displayName: name, email };

    $('#userName').textContent = name;
    $('#userEmail').textContent = email;
    $('#avatar').textContent = name.slice(0,2).toUpperCase();
    const wn = $('#welcomeName'); if (wn) wn.textContent = name;
    });
}

/* ================= Create Appointment (EST-aware) ================= */
$('#clearForm')?.addEventListener('click', () => { $('#requestForm').reset(); populateLevels(); toast('Form cleared'); });

$('#sendRequest')?.addEventListener('click', async () => {
    const subject = $('#subjectSelect').value.trim();
    const level = $('#levelSelect').value.trim();
    const date = $('#reqDate').value;
    const time = $('#reqTime').value;
    const notes = $('#reqDetails').value.trim();

    if (!subject || !level || !date || !time) return toast('Fill subject, level, date, time');

    // Interpret as EST regardless of the user’s computer timezone
    const when = dateInTZ(date, time, TIME_ZONE);
    if (Number.isNaN(+when)) return toast('Invalid date/time');

    // Local instant update
    const ev = { id: uid(), subject, level, when: when.toISOString(), notes, canceled:false };
    events.push(ev); saveEvents();
    renderCalendar(); renderLists();

    // Firestore write
    if (!firebaseReady || !auth || !db) {
    toast('Saved locally. Firebase not ready.');
    try { confetti?.({ particleCount: 60, spread: 70, origin: { y: .7 } }); } catch {}
    $('#requestForm').reset(); populateLevels();
    return;
    }

    try{
    const id = safeUUID();
    await setDoc(doc(db, 'slots', id), {
        tutorId: authedTutor?.uid || 'anon',
        tutorName: authedTutor?.displayName || 'Tutor',
        subject,
        level,
        when: Timestamp.fromDate(when), // server interprets UTC; we encoded EST wall time correctly
        status: 'open',
        notes: notes || '',
        createdAt: serverTimestamp()
    });
    try{ confetti?.({ particleCount: 80, spread: 70, origin: { y: .7 } }); }catch{}
    toast('Availability saved to Firestore');
    $('#requestForm').reset(); populateLevels();
    }catch(err){
    console.error(err);
    toast('Database write failed. Kept locally.');
    }
});

/* ================= Help/FAQ ================= */
$('#sendHelp')?.addEventListener('click', () => {
    const t = $('#helpText').value.trim();
    if (!t) return toast('Describe the issue');
    $('#helpText').value=''; toast('We’ll look into it');
});
$('#openFAQ')?.addEventListener('click', () => toast('FAQ opens here'));


/* ================= Navbar links ================= */
$('#account')?.addEventListener('click', () => location.href = 'https://voluntutor.github.io/main/dashboard/tutor-info/tutor-info.html');
$('#volunteer-hours')?.addEventListener('click', () => location.href = 'https://voluntutor.github.io/main/dashboard/submit-hours/submit-hours.html');

/* ================= Init ================= */
// Fallback chip if not signed in yet
if (!$('#userName').textContent) {
    $('#userName').textContent = 'Tutor';
    $('#userEmail').textContent = '';
    $('#avatar').textContent = 'VT';
    const wn = $('#welcomeName'); if (wn) wn.textContent = 'Tutor';
}

renderCalendar(); renderLists();

$('#prevMonth')?.addEventListener('click', ()=>{ current.setMonth(current.getMonth()-1); renderCalendar(); });
$('#nextMonth')?.addEventListener('click', ()=>{ current.setMonth(current.getMonth()+1); renderCalendar(); });

//resize textbox automatically based on input
document.querySelectorAll('textarea').forEach(textarea => {
    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto'; // Reset height
      textarea.style.height = textarea.scrollHeight + 'px'; // Set to full height
    });
  });