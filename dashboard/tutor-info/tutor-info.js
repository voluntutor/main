document.getElementById('studentTutorForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent form submission
  
    const studentName = document.getElementById('studentName').value.trim();
    const tutorName = document.getElementById('tutorName').value.trim();
    const tutorEmail = document.getElementById('tutorEmail').value.trim();
    const subject = document.getElementById('subject').value.trim();
    const teacherName = document.getElementById('teacherName').value.trim();
    const teacherEmail = document.getElementById('teacherEmail').value.trim();
    const teacherPhoneNumber = document.getElementById('teacherPhoneNumber').value.trim();
    const hours = document.getElementById('hours').value.trim();
  
    if (!studentName || !tutorName || !tutorEmail || !subject || !teacherName || !(teacherEmail || teacherPhoneNumber) || !hours) {
      document.getElementById('formMessage').textContent = 'Please fill out all fields.';
      return;
    }
  
    // Clear error message
    document.getElementById('formMessage').textContent = '';
  
    // Example: Log form data to the console
    console.log({
      studentName,
      tutorName,
      tutorEmail,
      subject,
      teacherName,
      teacherEmail,
      hours
    });
  
    alert('Form submitted successfully!');
    this.reset(); // Reset the form
  });

  const $ = s => document.querySelector(s);
  const toast = (msg) => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1800); };


  // Apply the saved theme on page load
const applyTheme = () => {
  const savedTheme = localStorage.getItem('vt-theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark');
  } else {
    document.body.classList.remove('dark');
  }
};
applyTheme();

// Add event listener to the theme toggle button
document.getElementById('themeToggle')?.addEventListener('click', () => {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('vt-theme', isDark ? 'dark' : 'light');
});

  /* ===== Simple routing buttons ===== */
  $('#homeLink')?.addEventListener('click', () => location.href = 'https://voluntutor.github.io/main');
  $('#logoutBtn')?.addEventListener('click', () => {
    toast('Logged out'); setTimeout(()=> location.href = 'https://voluntutor.github.io/main/register/auth.html', 600);
  });

    /* ===== Mock user ===== */
    const mockUser = { displayName: 'Tutor', email: 'tutor@example.com' };
    $('#userName').textContent = mockUser.displayName || 'Tutor';
    $('#userEmail').textContent = mockUser.email || '';
    $('#avatar').textContent = (mockUser.displayName || 'VT').slice(0,2).toUpperCase();


    // Set the default value of the date input to today's date - MIGHT BE SETTING DATE TO WRONG TIME ZONE
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

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('studentTutorForm');
    const checkboxes = document.querySelectorAll('input[name="subjects"]');
    const formMessage = document.getElementById('formMessage');
  
    form.addEventListener('submit', (event) => {
      event.preventDefault(); // Prevent form submission
  
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

  document.addEventListener('DOMContentLoaded', () => {
    const subjects = {
      Math: ['Algebra I', 'Geometry', 'Algebra II', 'Precalculus', 'Calculus'],
      Science: ['Biology', 'Chemistry', 'Physics', 'Earth Science', 'Environmental Science'],
      German: ['German 1', 'German 2', 'German 3', 'Honors German', 'AP German'],
      French: ['French 1', 'French 2', 'French 3', 'Honors French', 'AP French'],
      Spanish: ['Spanish 1', 'Spanish 2', 'Spanish 3', 'Honors Spanish', 'AP Spanish']
    };
  
    const checkboxes = document.querySelectorAll('input[name="subjects"]');
    const subjectBoxesContainer = document.getElementById('subjectBoxes');
  
    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        const subject = checkbox.value;
  
        if (checkbox.checked) {
          // Create a new subject box
          const box = document.createElement('div');
          box.className = 'subject-box';
          box.id = `box-${subject}`;
  
          // Add the subject title
          const title = document.createElement('h3');
          title.textContent = subject;
          box.appendChild(title);
  
          // Add the checklist of classes
          const classList = document.createElement('div');
          classList.className = 'class-list';
  
          subjects[subject].forEach((className) => {
            const label = document.createElement('label');
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.value = className;
            label.appendChild(input);
            label.appendChild(document.createTextNode(className));
            classList.appendChild(label);
          });
  
          box.appendChild(classList);
          subjectBoxesContainer.appendChild(box);
        } else {
          // Remove the subject box if unchecked
          const box = document.getElementById(`box-${subject}`);
          if (box) {
            subjectBoxesContainer.removeChild(box);
          }
        }
      });
    });
  });