// ===== Subject -> Levels mapping =====
const levelsBySubject = {
    'French': ['French 1','French 2','French 3','Honors French','AP French'],
    'German': ['German 1','German 2','German 3','Honors German','AP German'],
    'Spanish': ['Spanish 1','Spanish 2','Spanish 3','Honors Spanish','AP Spanish'],
    'Physics': ['Conceptual Physics','Physics Honors','AP Physics 1','AP Physics 2','AP Physics C'],
    'Math': ['Algebra I','Geometry','Algebra II','Precalculus','Honors','AP Calculus','AP Statistics']
};

// Populate level dropdown based on subject
const subjectSelect = document.getElementById('subjectSelect');
const levelSelect = document.getElementById('levelSelect');

subjectSelect.addEventListener('change', () => {
    const subject = subjectSelect.value;
    levelSelect.innerHTML = '<option value="">Select Level</option>';

    if(subject && levelsBySubject[subject]) {
        levelsBySubject[subject].forEach(level => {
            const opt = document.createElement('option');
            opt.value = level;
            opt.textContent = level;
            levelSelect.appendChild(opt);
        });
    }
});

// Form Submission
const tutorForm = document.getElementById('tutorForm');
document.getElementById('submitForm').addEventListener('click', () => {
    const tutorName = document.getElementById('tutorName').value.trim();
    const tutorEmail = document.getElementById('tutorEmail').value.trim();
    const tutorClass = document.getElementById('tutorClass').value.trim();
    const teacherName = document.getElementById('teacherName').value.trim();
    const teacherEmail = document.getElementById('teacherEmail').value.trim();
    const subject = subjectSelect.value;
    const level = levelSelect.value;
    const bio = document.getElementById('bio').value.trim();

    if(!tutorName || !tutorEmail || !tutorClass || !teacherName || !teacherEmail || !subject || !level) {
        alert("Please fill out all required fields.");
        return;
    }

    const formData = { tutorName, tutorEmail, tutorClass, teacherName, teacherEmail, subject, level, bio };
    console.log("Form Submitted:", formData);
    alert("Tutor profile submitted successfully!");

    tutorForm.reset();
    levelSelect.innerHTML = '<option value="">Select Level</option>';
});

// Clear Form
document.getElementById('clearForm').addEventListener('click', () => {
    tutorForm.reset();
    levelSelect.innerHTML = '<option value="">Select Level</option>';
});

// Theme Toggle
const themeToggle = document.getElementById('themeToggle');
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const theme = document.body.classList.contains('dark') ? 'dark' : 'light';
    localStorage.setItem('tutor-theme', theme);
});

// Load saved theme
if(localStorage.getItem('tutor-theme') === 'dark') {
    document.body.classList.add('dark');
}
