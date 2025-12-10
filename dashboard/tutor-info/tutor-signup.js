// ==================== Subject -> Levels ====================
const levelsBySubject = {
    'French': ['French 1', 'French 2', 'French 3', 'Honors French', 'AP French'],
    'German': ['German 1', 'German 2', 'German 3', 'Honors German', 'AP German'],
    'Spanish': ['Spanish 1', 'Spanish 2', 'Spanish 3', 'Honors Spanish', 'AP Spanish'],
    'Physics': ['Conceptual Physics', 'Physics Honors', 'AP Physics 1', 'AP Physics 2', 'AP Physics C'],
    'Math': ['Algebra I', 'Geometry', 'Algebra II', 'Precalculus', 'Honors', 'AP Calculus', 'AP Statistics']
};

const subjectSelect = document.getElementById('subjectSelect');
const levelSelect = document.getElementById('levelSelect');

subjectSelect.addEventListener('change', () => {
    const subject = subjectSelect.value;
    levelSelect.innerHTML = '<option value="">Select Level</option>';
    if (subject && levelsBySubject[subject]) {
        levelsBySubject[subject].forEach(level => {
            const opt = document.createElement('option');
            opt.value = level;
            opt.textContent = level;
            levelSelect.appendChild(opt);
        });
    }
});

// ==================== Form Submit ====================
const tutorForm = document.getElementById('tutorForm');

document.getElementById('submitForm').addEventListener('click', () => {
    const data = {
        tutorName: document.getElementById('tutorName').value.trim(),
        tutorEmail: document.getElementById('tutorEmail').value.trim(),
        tutorClass: document.getElementById('tutorClass').value.trim(),
        teacherName: document.getElementById('teacherName').value.trim(),
        teacherEmail: document.getElementById('teacherEmail').value.trim(),
        subject: subjectSelect.value,
        level: levelSelect.value,
        bio: document.getElementById('bio').value.trim()
    };

    if (Object.values(data).some(v => !v)) {
        alert("Please fill all required fields.");
        return;
    }

    console.log("Form Submitted:", data);
    alert("Tutor profile submitted successfully!");
    tutorForm.reset();
    levelSelect.innerHTML = '<option value="">Select Level</option>';
});

document.getElementById('clearForm').addEventListener('click', () => {
    tutorForm.reset();
    levelSelect.innerHTML = '<option value="">Select Level</option>';
});

// ==================== Theme Toggle ====================
const themeToggle = document.getElementById('themeToggle');

themeToggle.addEventListener('click', () => {
    const isDark = !document.body.classList.contains('dark');
    document.body.classList.toggle('dark', isDark);
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('tutor-theme', isDark ? 'dark' : 'light');
});

if (localStorage.getItem('tutor-theme') === 'dark') {
    document.body.classList.add('dark');
    document.documentElement.classList.add('dark');
}
