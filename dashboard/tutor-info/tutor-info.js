document.getElementById('tutorInfoForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent form submission
  
    const tutorName = document.getElementById('tutorName').value.trim();
    const gradeLevel = document.getElementById('gradeLevel').value.trim();
    const tutorEmail = document.getElementById('tutorEmail').value.trim();
  
    if (!studentName || !tutorName || !tutorEmail || !subject || !teacherName || !(teacherEmail || teacherPhoneNumber) || !hours) {
      document.getElementById('formMessage').textContent = 'Please fill out all fields.';
      return;
    }
  
    // Clear error message
    document.getElementById('formMessage').textContent = '';
  
    // Example: Log form data to the console
    console.log({
      tutorName,
      gradeLevel,
      tutorEmail,
    });
  
    alert('Form submitted successfully!');
    //this.reset(); // Reset the form
  });

  const $ = s => document.querySelector(s);
  const toast = (msg) => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1800); };


  // Apply the saved theme on page load
const applyTheme = () => {
  const savedTheme = localStorage.getItem('vt-theme');
  const isDark = savedTheme === 'dark';
  document.body.classList.toggle('dark', isDark);
  document.documentElement.classList.toggle('dark', isDark);
};
applyTheme();

// Add event listener to the theme toggle button
document.getElementById('themeToggle')?.addEventListener('click', () => {
  const isDark = !document.body.classList.contains('dark');
  document.body.classList.toggle('dark', isDark);
  document.documentElement.classList.toggle('dark', isDark);
  localStorage.setItem('vt-theme', isDark ? 'dark' : 'light');
});

  /* ===== Simple routing buttons ===== */
  $('#homeLink')?.addEventListener('click', () => location.href = 'https://voluntutor.github.io/main/');//return to main site
  $('#volunteer-hours')?.addEventListener('click', () => location.href = 'https://voluntutor.github.io/main/dashboard/submit-hours/submit-hours.html');
  $('#logoutBtn')?.addEventListener('click', () => {
    toast('Logged out'); setTimeout(()=> location.href = 'https://voluntutor.github.io/main/dashboard/tutor.html', 600);
  });

    /* ===== Mock user ===== */
    const mockUser = { displayName: 'Tutor', email: 'tutor@example.com' };
    $('#userName').textContent = mockUser.displayName || 'Tutor';
    $('#userEmail').textContent = mockUser.email || '';
    $('#avatar').textContent = (mockUser.displayName || 'VT').slice(0,2).toUpperCase();


    // Set the default value of the date input to today's date
document.addEventListener('DOMContentLoaded', () => {
  const dateInput = document.getElementById('date');
  console.log('Date input found:', dateInput); // Debuggings
  if (dateInput) {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    console.log('Formatted date:', formattedDate); // Debugging
    dateInput.value = formattedDate;
  }
});


  /* ---------- subjects & levels from subjects.json ---------- */
let levelsBySubject = {};

async function loadSubjects() {
  try {
    const res = await fetch(
      "https://voluntutor.github.io/main/dashboard/subjects.json"
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    levelsBySubject = await res.json();
    populateSubjects();
  } catch (err) {
    console.error("Failed to load subjects.json", err);
    showToast("Failed to load subjects list.");
  }
}

function populateSubjects() {
  const container = document.getElementById("subjects"); // parent element
  const subjectBoxesContainer = document.getElementById("subjectBoxes");

  if (!container) return;
  container.innerHTML = ""; // clear existing content

  Object.keys(levelsBySubject).forEach((subject) => {
    // --- Create subject checkbox UI ---
    const label = document.createElement("label");
    label.className = "subject-checkbox-label";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "subjects";
    checkbox.value = subject;

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(" " + subject));
    container.appendChild(label);

    // --- Add interaction logic ---
    checkbox.addEventListener("change", () => {
      //clear select a subject error message
      const formMessage = document.getElementById('formMessage');
      formMessage.textContent = '';

      if (checkbox.checked) {
        // Create a subject box
        const box = document.createElement("div");
        box.className = "subject-box";
        box.id = `box-${subject}`;

        const title = document.createElement("h3");
        title.textContent = subject;
        box.appendChild(title);

        // Create class list from levelsBySubject[subject]
        const classList = document.createElement("div");
        classList.className = "class-list";

        (levelsBySubject[subject] || []).forEach((className) => {
          const classLabel = document.createElement("label");
          const classInput = document.createElement("input");
          classInput.type = "checkbox";
          classInput.value = className;

          classLabel.appendChild(classInput);
          classLabel.appendChild(document.createTextNode(className));
          classList.appendChild(classLabel);
        });

        box.appendChild(classList);
        subjectBoxesContainer.appendChild(box);
      } else {
        // Remove box when unchecked
        const box = document.getElementById(`box-${subject}`);
        if (box) box.remove();
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", loadSubjects);

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('tutorInfoForm');
  form.addEventListener('submit', (event) => {
    event.preventDefault(); // Prevent form submission
    const checkboxes = document.querySelectorAll('input[name="subjects"]');
    const formMessage = document.getElementById('formMessage');

    // Collect selected subjects
    const selectedSubjects = Array.from(checkboxes)
      .filter((checkbox) => checkbox.checked)
      .map((checkbox) => checkbox.value);

    if (selectedSubjects.length === 0) {
      formMessage.textContent = 'Please select at least one subject.';
      return;
    }

    formMessage.textContent = ''; // Clear any previous error message

    // Example: Log selected subjects to the console
    console.log('Selected Subjects:', selectedSubjects);

    alert('Profile updated successfully!');
  });
});
