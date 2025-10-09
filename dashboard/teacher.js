// firebase-config.js (include this in all dashboards)
const firebaseConfig = {
  apiKey: "AIzaSyCiiAfvZ25ChvpCVCbMj46dsCrZBYMGBpM",
  authDomain: "logintrial001.firebaseapp.com",
  projectId: "logintrial001",
  storageBucket: "logintrial001.appspot.com",
  messagingSenderId: "419688887007",
  appId: "1:419688887007:web:013af1286ba6e7aff42f6a"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
  auth.signOut().then(() => window.location.href = "index.html");
});

// Load all student requests
function loadRequests() {
  const grid = document.getElementById('teacher-requests-grid');
  grid.innerHTML = '';
  db.collection('requests').orderBy('date', 'desc')
    .onSnapshot(snapshot => {
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const card = document.createElement('div');
        card.className = 'request-card';
        card.innerHTML = `
          <h3>${data.subject}</h3>
          <p>${data.date} ${data.time}</p>
          <p>Student: ${data.studentName}</p>
          <p>Status: ${data.status}</p>
          <button class="assign-btn">Assign Tutor</button>
          <button class="cancel-btn">Cancel</button>
        `;
        grid.appendChild(card);

        card.querySelector('.assign-btn').addEventListener('click', () => assignTutor(doc.id, data));
        card.querySelector('.cancel-btn').addEventListener('click', () => cancelRequest(doc.id));
      });
    });
}

// Assign tutor
function assignTutor(requestId, requestData) {
  const tutorEmail = prompt("Enter tutor's email to assign:");
  db.collection('requests').doc(requestId).update({
    tutorEmail: tutorEmail,
    status: 'Assigned'
  });

  // Email notifications
  fetch('https://YOUR_CLOUD_FUNCTION_URL/assignmentEmail', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({...requestData, tutorEmail})
  });
}

// Cancel request
function cancelRequest(requestId) {
  if(confirm("Cancel this request?")){
    db.collection('requests').doc(requestId).update({status:'Cancelled'});
  }
}

// Load volunteer hours for approval
function loadHours() {
  const grid = document.getElementById('hours-grid');
  grid.innerHTML = '';
  db.collection('volunteerHours').orderBy('submittedAt','desc')
    .onSnapshot(snapshot => {
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const card = document.createElement('div');
        card.className = 'hour-card';
        card.innerHTML = `
          <p>Tutor: ${data.tutorName}</p>
          <p>Hours: ${data.hours}</p>
          <button class="approve-btn">Approve</button>
        `;
        grid.appendChild(card);

        card.querySelector('.approve-btn').addEventListener('click', () => {
          db.collection('volunteerHours').doc(doc.id).update({status:'Approved'});
          fetch('https://YOUR_CLOUD_FUNCTION_URL/hoursApprovedEmail',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify(data)
          });
        });
      });
    });
}

// CSV export
document.getElementById('export-csv').addEventListener('click', async () => {
  const snapshot = await db.collection('volunteerHours').get();
  let csv = 'Tutor Name,Hours,Status\n';
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    csv += `${data.tutorName},${data.hours},${data.status}\n`;
  });
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'volunteer_hours.csv';
  a.click();
});

// Load all data
auth.onAuthStateChanged(user => {
  if(user){
    loadRequests();
    loadHours();
  } else window.location.href='index.html';
});
