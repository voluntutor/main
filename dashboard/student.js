// Week Navigation Example
const prevWeekBtn = document.getElementById("prev-week");
const nextWeekBtn = document.getElementById("next-week");
const weekLabel = document.getElementById("week-label");

let currentWeek = 0; // 0 = current week

function updateWeekLabel() {
  const now = new Date();
  now.setDate(now.getDate() + currentWeek * 7);
  const options = { month: "long", day: "numeric" };
  weekLabel.textContent = `Week of ${now.toLocaleDateString(undefined, options)}`;
}

prevWeekBtn.addEventListener("click", () => {
  currentWeek--;
  updateWeekLabel();
});

nextWeekBtn.addEventListener("click", () => {
  currentWeek++;
  updateWeekLabel();
});

updateWeekLabel();

// Form submission example
const requestForm = document.getElementById("request-form");
requestForm.addEventListener("submit", (e) => {
  e.preventDefault();
  alert("Request submitted!");
  requestForm.reset();
});
