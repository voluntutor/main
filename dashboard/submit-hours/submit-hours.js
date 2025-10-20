document.getElementById('studentTutorForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent form submission
  
    const studentName = document.getElementById('studentName').value.trim();
    const tutorName = document.getElementById('tutorName').value.trim();
    const tutorEmail = document.getElementById('tutorEmail').value.trim();
    const subject = document.getElementById('subject').value.trim();
    const teacherName = document.getElementById('teacherName').value.trim();
    const teacherEmail = document.getElementById('teacherEmail').value.trim();
    const hours = document.getElementById('hours').value.trim();
  
    if (!studentName || !tutorName || !tutorEmail || !subject || !teacherName || !teacherEmail || !hours) {
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