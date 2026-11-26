const ADMIN_CREDENTIALS = {
  username: "m37",
  password: "123",
  role: "admin"
};

const SESSION_KEY = "portal_admin_session";

const loginForm = document.getElementById("loginForm");
const loginCard = document.getElementById("loginCard");
const adminPanel = document.getElementById("adminPanel");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const errorMessage = document.getElementById("errorMessage");
const openAuthBtn = document.getElementById("openAuthBtn");
const logoutBtn = document.getElementById("logoutBtn");
const sessionBadge = document.getElementById("sessionBadge");

function isAdminLoggedIn() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed && parsed.username === ADMIN_CREDENTIALS.username && parsed.role === "admin";
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return false;
  }
}

function syncAuthUI() {
  const loggedIn = isAdminLoggedIn();
  sessionBadge.classList.toggle("hidden", !loggedIn);
  logoutBtn.classList.toggle("hidden", !loggedIn);
  openAuthBtn.classList.toggle("hidden", loggedIn);
  adminPanel.classList.toggle("hidden", !loggedIn);

  if (loggedIn) {
    loginCard.classList.add("hidden");
  }
}

openAuthBtn.addEventListener("click", () => {
  loginCard.classList.toggle("hidden");
  usernameInput.focus();
});

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  errorMessage.textContent = "";

  const user = usernameInput.value.trim();
  const pass = passwordInput.value;

  if (user === ADMIN_CREDENTIALS.username && pass === ADMIN_CREDENTIALS.password) {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ username: ADMIN_CREDENTIALS.username, role: ADMIN_CREDENTIALS.role })
    );
    loginForm.reset();
    syncAuthUI();
  } else {
    errorMessage.textContent = "بيانات الدخول غير صحيحة.";
  }
});

logoutBtn.addEventListener("click", () => {
  sessionStorage.removeItem(SESSION_KEY);
  errorMessage.textContent = "";
  syncAuthUI();
});

syncAuthUI();
