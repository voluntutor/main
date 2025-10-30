// teacher.js - Teacher Dashboard behavior
// Uses FullCalendar (global FullCalendar variable loaded from CDN)
// LocalStorage keys:
const EVENTS_KEY = 'vt-teacher-events-v2';
const TUTORS_KEY = 'vt-my-tutors-v1';
const LOCS_KEY = 'vt-my-locations-v1';
const FEED_KEY = 'vt-feedback-v1';
const TIME_ZONE = 'America/New_York';

function $(s){ return document.querySelector(s); }
function $all(s){ return Array.from(document.querySelectorAll(s)); }
function toast(msg){
  // lightweight toast
  const t = document.createElement('div');
  t.textContent = msg;
  t.style = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#111;color:#fff;padding:10px 14px;border-radius:10px;z-index:9999';
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),1800);
}

/* ---------- storage helpers ---------- */
function loadJSON(k, fallback){ try{ return JSON.parse(localStorage.getItem(k)) || fallback; }catch{ return fallback; } }
function saveJSON(k,v){ localStorage.setItem(k, JSON.stringify(v)); }

let events = loadJSON(EVENTS_KEY, []);
let tutors = loadJSON(TUTORS_KEY, [
  { id: 't1', name: 'Mr. Adams', students: ['Emily','Ben'] },
  { id: 't2', name: 'Ms. Lee', students: ['Jake','Sophie'] }
]);
let locations = loadJSON(LOCS_KEY, [
  { id:'l1', name:'Library Room A', requiresApproval: true },
  { id:'l2', name:'Room 204', requiresApproval: false },
  { id:'l3', name:'Café Study Spot', requiresApproval: false }
]);
let feedback = loadJSON(FEED_KEY, [
  { id:'f1', student:'Emily', tutor:'Mr. Adams', rating:5, comment:'Great session!' },
  { id:'f2', student:'Sophie', tutor:'Mr. Patel', rating:4, comment:'Very helpful.' }
]);

/* ---------- timezone helpers (encode wall time in EST) ---------- */
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
  const [y,m,d] = dateStr.split('-').map(Number);
  const [hh,mm] = (timeStr || '00:00').split(':').map(Number);
  const utcGuess = new Date(Date.UTC(y, m-1, d, hh, mm, 0));
  const offsetMs = tzOffsetMsAt(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offsetMs);
}

/* ---------- UI population ---------- */
function populateTutorSelects(){
  const sel = $('#tutorSelect'); sel.innerHTML = '';
  const apptTutor = $('#apptTutor'); apptTutor.innerHTML = '';
  tutors.forEach(t=>{
    const o = document.createElement('option'); o.value = t.id; o.textContent = t.name; sel.appendChild(o);
    const o2 = o.cloneNode(true); apptTutor.appendChild(o2);
  });
}

function populateLocationSelects(){
  const sel = $('#locationSelect'); sel.innerHTML = '';
  const apptLoc = $('#apptLocation'); apptLoc.innerHTML = '';
  locations.forEach(l=>{
    const o = document.createElement('option'); o.value = l.id; o.textContent = l.name + (l.requiresApproval ? ' (needs approval)' : '');
    sel.appendChild(o);
    const o2 = o.cloneNode(true); apptLoc.appendChild(o2);
  });
}

/* ---------- Levels by subject ---------- */
const levelsBySubject = {
  'French':['French 1','French 2','French 3','Honors French','AP French'],
  'German':['German 1','German 2','German 3','Honors German','AP German'],
  'Spanish':['Spanish 1','Spanish 2','Spanish 3','Honors Spanish','AP Spanish'],
  'Physics':['Conceptual Physics','Physics Honors','AP Physics 1','AP Physics 2','AP Physics C'],
  'Math':['Algebra I','Geometry','Algebra II','Precalculus','Honors','AP Calculus','AP Statistics']
};

$('#subject')?.addEventListener?.('change', (e)=>{
  const level = $('#level'); level.innerHTML = '<option value="">Select Level</option>';
  (levelsBySubject[e.target.value]||[]).forEach(l=>{
    const opt=document.createElement('option'); opt.value=l; opt.textContent=l; level.appendChild(opt);
  });
});

/* ---------- Calendar (FullCalendar) ---------- */
let calendar;
function initCalendar(){
  const calendarEl = document.getElementById('calendar');
  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    height: 480,
    headerToolbar: false,
    events: events.map(evToCalEvent),
    eventDisplay: 'block',
    eventClassNames: function(arg){
      return arg.event.extendedProps.approved ? ['evt-approved'] : ['evt-pending'];
    },
    dateClick: function(info){
      // prefill date
      $('#date').value = info.dateStr;
      toast('Selected ' + info.dateStr);
    },
    eventClick: function(info){
      const ev = info.event.extendedProps.__raw;
      // simple detail modal (confirm cancel / approve)
      const title = `${ev.subject} — ${ev.level}\n${new Date(ev.when).toLocaleString('en-US',{timeZone:TIME_ZONE,timeStyle:'short',dateStyle:'medium'})}\n${ev.locationName || ''}`;
      if (confirm(title + '\n\nCancel this appointment?')) {
        // mark canceled
        ev.canceled = true;
        saveEventsAndRefresh();
      }
    }
  });
  calendar.render();
  updateMonthLabel();
}

function updateCalendarEvents(){
  calendar.removeAllEvents();
  events.forEach(ev => calendar.addEvent(evToCalEvent(ev)));
  updateMonthLabel();
}

function updateMonthLabel(){
  const view = calendar.view;
  $('#monthLabel').textContent = `${view.title}`;
}

/* map event object to FullCalendar event */
function evToCalEvent(ev){
  return {
    id: ev.id,
    title: `${ev.subject} — ${ev.level}`,
    start: new Date(ev.when),
    allDay: false,
    extendedProps: { approved: !!ev.approved, pending: !ev.approved && !!ev.requiresApproval, __raw: ev }
  };
}

/* ---------- events load/save ---------- */
function saveEventsAndRefresh(){
  saveJSON(EVENTS_KEY, events);
  updateCalendarEvents();
  renderAppointmentsList();
}

/* ---------- Appointment list rendering ---------- */
function renderAppointmentsList(){
  const container = document.getElementById('apptList');
  if (!container) return;
  const now = new Date();
  const upcoming = events.filter(e=>!e.canceled && new Date(e.when) >= now).sort((a,b)=>new Date(a.when)-new Date(b.when));
  container.innerHTML = upcoming.length ? '' : '<div class="muted small">No upcoming appointments.</div>';
  upcoming.forEach(e=>{
    const el = document.createElement('div'); el.className = 'feedback-card';
    const tutorName = tutors.find(t=>t.id===e.tutorId)?.name || e.tutorName || 'Tutor';
    el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center">
      <div>
        <strong>${escapeHtml(e.studentName || 'Student')}</strong> with <em>${escapeHtml(tutorName)}</em>
        <div class="muted small">${new Date(e.when).toLocaleString('en-US',{timeZone:TIME_ZONE,dateStyle:'medium',timeStyle:'short'})} — ${escapeHtml(e.locationName||'')}</div>
        ${e.notes ? `<div class="small muted">Notes: ${escapeHtml(e.notes)}</div>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">
        ${e.approved ? '<span class="pill">Approved</span>' : (e.requiresApproval ? '<span class="pill pending">Pending</span>' : '<span class="pill">Open</span>')}
        ${!e.canceled ? `<button class="btn-ghost small" data-id="${e.id}" data-action="cancel">Cancel</button>` : '<span class="muted small">Canceled</span>'}
      </div>
    </div>`;
    container.appendChild(el);
  });
}

/* ---------- Feedback list ---------- */
function renderFeedback(){
  const list = $('#feedbackList');
  list.innerHTML = '';
  if (!feedback.length) list.innerHTML = '<div class="muted small">No student feedback yet.</div>';
  feedback.forEach(f=>{
    const card = document.createElement('div'); card.className = 'feedback-card';
    card.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center">
      <div>
        <strong>${escapeHtml(f.student)}</strong> → ${escapeHtml(f.tutor)}<br>
        <div class="muted small">Rating: ${'★'.repeat(Math.max(1,f.rating))}</div>
        <div style="margin-top:6px">${escapeHtml(f.comment)}</div>
      </div>
      <div>
        <button class="btn-ghost small" data-id="${f.id}" data-action="view">View</button>
      </div>
    </div>`;
    list.appendChild(card);
  });
}

/* ---------- helpers ---------- */
function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

/* ---------- manage tutors & locations (simple prompt-based manager) ---------- */
function manageTutors(){
  const action = prompt('Manage Tutors: type "list", "add", or "addstudent".\n- list: show tutors\n- add: add a tutor name\n- addstudent: add student (format: tutorId|StudentName)');
  if (!action) return;
  if (action === 'list'){ alert(tutors.map(t=>`${t.id}: ${t.name} — students: ${t.students.join(', ')}`).join('\n')); return; }
  if (action === 'add'){
    const name = prompt('Tutor name:'); if (!name) return;
    const id = 't'+Date.now().toString(36).slice(3);
    tutors.push({id,name,students:[]});
    saveJSON(TUTORS_KEY,tutors); populateTutorSelects(); toast('Tutor added');
    return;
  }
  if (action === 'addstudent'){
    const data = prompt('Enter tutorId|StudentName (e.g. t1|Alex)'); if (!data) return;
    const [tid, sname] = data.split('|').map(x=>x && x.trim());
    const tt = tutors.find(t=>t.id===tid); if (!tt) return alert('Tutor not found');
    tt.students.push(sname); saveJSON(TUTORS_KEY,tutors); toast('Student added');
    return;
  }
  alert('Unknown command');
}

function manageLocations(){
  const action = prompt('Manage Locations: type "list", "add", "toggle".\n- list: show locations\n- add: add location name\n- toggle: toggle requiresApproval (format: locationId)');
  if (!action) return;
  if (action === 'list'){ alert(locations.map(l=>`${l.id}: ${l.name} — needs approval: ${l.requiresApproval}`).join('\n')); return; }
  if (action === 'add'){ const name = prompt('Location name:'); if (!name) return; const id='loc'+Date.now().toString(36).slice(3); locations.push({id,name,requiresApproval:false}); saveJSON(LOCS_KEY,locations); populateLocationSelects(); toast('Location added'); return; }
  if (action === 'toggle'){ const id = prompt('Location id to toggle:'); const ll = locations.find(x=>x.id===id); if (!ll) return alert('Not found'); ll.requiresApproval = !ll.requiresApproval; saveJSON(LOCS_KEY,locations); populateLocationSelects(); toast('Toggled'); return; }
  alert('Unknown command');
}

/* ---------- schedule flow ---------- */
function scheduleFromForm(){
  const subject = $('#subject').value;
  const level = $('#level').value;
  const date = $('#date').value;
  const time = $('#time').value;
  const tutorId = $('#apptTutor').value;
  const locId = $('#apptLocation').value;
  const notes = $('#notes').value.trim();
  if (!subject || !level || !date || !time || !tutorId || !locId) return toast('Fill subject, level, date, time, tutor and location');

  const when = dateInTZ(date, time);
  if (isNaN(+when)) return toast('Invalid date/time');

  const tutorObj = tutors.find(t=>t.id===tutorId);
  const locObj = locations.find(l=>l.id===locId);

  const ev = {
    id: 'ev' + Date.now().toString(36).slice(3),
    subject, level,
    when: when.toISOString(),
    notes,
    tutorId,
    tutorName: tutorObj?.name || '',
    locationId: locId,
    locationName: locObj?.name || '',
    requiresApproval: !!locObj?.requiresApproval,
    approved: locObj?.requiresApproval ? false : true,
    canceled: false,
    createdAt: new Date().toISOString()
  };

  events.push(ev); saveEventsAndRefresh();
  // confetti + toast
  try { confetti?.({ particleCount: 60, spread: 70, origin: { y: .6 } }); } catch {}
  toast('Scheduled' + (ev.approved ? '' : ' (pending approval)'));
  $('#createForm').reset();
  $('#level').innerHTML = '<option value="">Select Level</option>';
}

/* ---------- wire UI ---------- */
document.addEventListener('DOMContentLoaded', () => {
  populateTutorSelects(); populateLocationSelects();
  renderFeedback();

  // init calendar AFTER DOM
  initCalendar();

  // navigation controls
  $('#prev').addEventListener('click', ()=>{ calendar.prev(); updateMonthLabel(); });
  $('#next').addEventListener('click', ()=>{ calendar.next(); updateMonthLabel(); });

  // manage buttons
  $('#manageTutors').addEventListener('click', manageTutors);
  $('#manageLocations').addEventListener('click', manageLocations);

  // approvals button
  $('#approvalsBtn').addEventListener('click', ()=> window.location.href = 'approvals.html');

  // schedule
  $('#scheduleBtn').addEventListener('click', scheduleFromForm);
  $('#clearBtn').addEventListener('click', ()=>{ $('#createForm').reset(); $('#level').innerHTML = '<option value="">Select Level</option>'; toast('Form cleared'); });

  // Student view
  $('#studentViewBtn').addEventListener('click', ()=> window.location.href = 'student.html');

  // mock appointment list panel (right side)
  const apptPanel = document.createElement('div'); apptPanel.id = 'apptList'; apptPanel.style.marginTop = '12px';
  document.querySelector('#rightPanel').appendChild(apptPanel);
  renderAppointmentsList();

  // cancel buttons handler (delegation)
  document.body.addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.getAttribute('data-id'); const action = btn.getAttribute('data-action');
    if (action === 'cancel'){
      const ev = events.find(x=>x.id===id); if (!ev) return;
      if (!confirm('Cancel appointment?')) return;
      ev.canceled = true; saveEventsAndRefresh(); toast('Canceled');
    }
  });

  // help & support send
  $('#sendHelp')?.addEventListener('click', ()=>{
    const t = $('#helpText').value.trim(); if (!t) return toast('Describe the issue');
    $('#helpText').value=''; toast('Support request sent — we will review it');
  });

  // logout
  $('#logoutBtn').addEventListener('click', ()=> { toast('Logged out'); setTimeout(()=> window.location.href='auth.html', 600); });
});

/* ---------- small utilities ---------- */
function addMockEventForDemo(){
  if (!events.length){
    const now = new Date();
    const later = new Date(now.getTime() + 2*24*3600*1000);
    events.push({
      id: 'evdemo1', subject:'German', level:'German 1',
      when: later.toISOString(),
      notes:'Demo appointment', tutorId:tutors[1].id, tutorName:tutors[1].name,
      locationId: locations[0].id, locationName: locations[0].name,
      requiresApproval: locations[0].requiresApproval, approved: !locations[0].requiresApproval,
      canceled:false, createdAt:new Date().toISOString()
    });
    saveJSON(EVENTS_KEY, events);
  }
}
addMockEventForDemo();
