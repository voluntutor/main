/* ================== MINI UTIL ================== */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const toast = (msg) => {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  setTimeout(()=> t.classList.remove('show'), 1800);
};

/* ================== THEME TOGGLE ================== */
const themeToggle = $('#themeToggle');
const applyTheme = () => {
  const saved = localStorage.getItem('vt-theme');
  if (saved === 'dark') document.body.classList.add('dark');
  if (saved === 'light') document.body.classList.remove('dark');
};
applyTheme();
themeToggle?.addEventListener('click', () => {
  const dark = document.body.classList.toggle('dark');
  localStorage.setItem('vt-theme', dark ? 'dark' : 'light');
});

/* ================== NAV / ROUTING BUTTONS ================== */
$('#homeLink')?.addEventListener('click', () => location.href = 'student.html');
$('#applyTutorBtn')?.addEventListener('click', () => location.href = 'https://voluntutor.github.io/main/dashboard/tutor-info/tutorSignup2.html');
$('#logoutBtn')?.addEventListener('click', () => {
  // If you wire Firebase, call signOut here. For now, just fake it:
  toast('Logged out'); setTimeout(()=> location.href = 'https://voluntutor.github.io/main/register/auth.html', 600);
});

/* ================== CALENDAR ================== */
const calHead = $('#calHead');
const cal = $('#calendar');
const monthLabel = $('#monthLabel');

const weekdayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const monthNames = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

// header once
calHead.innerHTML = weekdayNames.map(d=>`<div class="small" style="text-align:center">${d}</div>`).join('');

let current = new Date(); current.setDate(1);

const STORAGE_KEY = 'vt-tutor-events-v1';
let events = loadEvents();
function loadEvents(){ try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }catch{ return []; } }
function saveEvents(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(events)); }

function renderCalendar() {
  
  cal.innerHTML = '';
  const year = current.getFullYear();
  const month = current.getMonth();
  monthLabel.textContent = `${monthNames[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date(); today.setHours(0,0,0,0);

  // blanks
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
}
function startOfDay(dt){ const d = new Date(dt); d.setHours(0,0,0,0); return d; }
function sameDay(a,b){ return startOfDay(a).getTime() === startOfDay(b).getTime(); }
function eventsForDate(date){ return events.filter(e => sameDay(new Date(e.when), date)); }


$('#prevMonth')?.addEventListener('click', ()=>{ current.setMonth(current.getMonth()-1); renderCalendar(); });
$('#nextMonth')?.addEventListener('click', ()=>{ current.setMonth(current.getMonth()+1); renderCalendar(); });

/* ================== OVERLAY ================== */
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

renderCalendar();
/* ================== REQUEST FORM ================== */
$('#clearForm')?.addEventListener('click', () => {
  $('#requestForm').reset(); toast('Form cleared');
});

$('#sendRequest')?.addEventListener('click', () => {
  const subj = $('#subjectSelect').value.trim();
  const teach = $('#teacherSelect').value.trim();
  const date = $('#reqDate').value;
  const time = $('#reqTime').value;
  if (!subj || !teach || !date || !time) return toast('Fill subject, teacher, date, time');

  // Pretend to save it; append to list
  const when = new Date(`${date}T${time}`);
  const item = document.createElement('div');
  item.className = 'card';
  item.innerHTML = `
    <div class="info">
      <h4>${subj} with ${teach}</h4>
      <p class="small muted">${when.toLocaleString([], { dateStyle:'medium', timeStyle: 'short' })}</p>
    </div>
    <button class="btn-ghost small">Details</button>
  `;
  $('#upcomingList').prepend(item);

  renderCalendar();

  // confetti, because dopamine
  try {
    confetti?.({ particleCount: 70, spread: 70, origin: { y: .7 } });
  }catch{}
  toast('Session requested!');
  $('#requestForm').reset();
});

/* ================== REVIEWS / HELP ================== */
$('#submitReview')?.addEventListener('click', () => {
  const txt = $('#reviewText').value.trim();
  if (!txt) return toast('Write something first');
  $('#reviewText').value=''; toast('Thanks for the feedback!');
});
$('#viewReviews')?.addEventListener('click', () => toast('Reviews feature coming soon'));
$('#sendHelp')?.addEventListener('click', () => {
  const t = $('#helpText').value.trim();
  if (!t) return toast('Describe the issue');
  $('#helpText').value=''; toast('We’ll look into it');
});
$('#openFAQ')?.addEventListener('click', () => toast('FAQ opens here'));

/* ================== USER BADGE MOCK ================== */
// If you wire Firebase later, replace this block with real data.
const mockUser = { displayName: 'Student', email: 'student@example.com' };
$('#userName').textContent = mockUser.displayName || 'Student';
$('#userEmail').textContent = mockUser.email || '';
$('#avatar').textContent = (mockUser.displayName || 'VT').slice(0,2).toUpperCase();

//resize textbox automatically based on input
document.querySelectorAll('textarea').forEach(textarea => {
  textarea.addEventListener('input', () => {
    textarea.style.height = 'auto'; // Reset height
    textarea.style.height = textarea.scrollHeight + 'px'; // Set to full height
  });
});