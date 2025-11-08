// auth.js
function qs(sel){ return document.querySelector(sel); }

const signupForm = qs('#signup');
const signupBtn  = qs('#signup-btn');
const signupStatus = qs('#signup-status');

const signinForm = qs('#signin');
const signinStatus = qs('#signin-status');

// Overlay toggles (if you use them)
qs('#switchToSignIn')?.addEventListener('click', () => {
  document.querySelector('.container')?.classList.remove('right-panel-active');
});
qs('#switchToSignUp')?.addEventListener('click', () => {
  document.querySelector('.container')?.classList.add('right-panel-active');
});

// Guard against overlay eating clicksa
// Ensure overlay panels don't block pointer events over forms
document.querySelector('.container__overlay')?.setAttribute('style','pointer-events:none;');
document.querySelectorAll('.overlay__panel .btn').forEach(b => b.style.pointerEvents = 'auto');

// SIGNUP SUBMIT
signupForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = qs('#signupName')?.value?.trim();
  const email = qs('#signupEmail')?.value?.trim();
  const password = qs('#signupPassword')?.value;
  const role = qs('#signup-role')?.value;

  if(!name || !email || !password || !role){
    signupStatus.textContent = 'Fill all fields, champ.';
    return;
  }

  signupBtn.disabled = true;
  signupStatus.textContent = 'Creating your account...';

  try{
    // TODO: replace with your real auth call (Firebase or API)
    await fakeCreateUser({name,email,password,role});

    signupStatus.textContent = 'Success. Redirecting...';
    // example routing by role:
    if(role === 'student'){
      location.href = 'https://voluntutor.github.io/main/dashboard/tutor.html';
    }else{
      location.href = '/dashboard/teacher.html';
    }
  }catch(err){
    signupStatus.textContent = (err && err.message) || 'Signup failed. Try again.';
    signupBtn.disabled = false;
  }
});

// SIGNIN SUBMIT (optional parity)
signinForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = qs('#signin-email')?.value?.trim();
  const password = qs('#signin-password')?.value;
  if(!email || !password){
    signinStatus.textContent = 'Email and password. Both.';
    return;
  }
  signinStatus.textContent = 'Signing in...';
  try{
    await fakeSignIn({email,password});
    signinStatus.textContent = 'Welcome back.';
    location.href = 'https://voluntutor.github.io/main/dashboard/tutor.html';
  }catch(err){
    signinStatus.textContent = (err && err.message) || 'Sign in failed.';
  }
});

// Mock fns for smoke testing
function fakeCreateUser(data){
  console.log('createUser', data);
  return new Promise(res => setTimeout(res, 700));
}
function fakeSignIn(data){
  console.log('signIn', data);
  return new Promise(res => setTimeout(res, 500));
}
