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
  $('#applyTutorBtn')?.addEventListener('click', () => location.href = 'student.html');
  $('#logoutBtn')?.addEventListener('click', () => {
    toast('Logged out'); setTimeout(()=> location.href = 'https://voluntutor.github.io/main/register/auth.html', 600);
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