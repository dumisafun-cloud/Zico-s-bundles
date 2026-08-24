const ORDER_EMAIL = "matibackubu@gmail.com";

// ---------- Validation helpers (shared style with vip.js) ----------
function normalizePhone(raw) {
  return raw.replace(/\D/g, "");
}
function isValidSAPhone(raw) {
  return /^0\d{9}$/.test(normalizePhone(raw));
}
function normalizeVoucherPin(raw) {
  return raw.replace(/[\s-]/g, "");
}
function isValidVoucherPin(raw) {
  const v = normalizeVoucherPin(raw);
  return /^\d{12,20}$/.test(v);
}
function setFieldState(input, errorEl, valid, message) {
  if (valid) {
    input.classList.remove("invalid");
    if (errorEl) { errorEl.textContent = ""; errorEl.classList.remove("show"); }
  } else {
    input.classList.add("invalid");
    if (errorEl) { errorEl.textContent = message; errorEl.classList.add("show"); }
  }
}

const tabs = document.querySelectorAll('.net-tab');
const netLabels = document.querySelectorAll('[id^="net-label-"]');
const networkSelect = document.getElementById('network');
const bundleSelect = document.getElementById('bundle');

function setNetwork(tab){
  tabs.forEach(t => t.classList.remove('active'));
  tab.classList.add('active');

  const accent = tab.getAttribute('data-accent');
  const text = tab.getAttribute('data-text');
  const name = tab.querySelector('.name').textContent;

  document.documentElement.style.setProperty('--accent', accent);
  document.documentElement.style.setProperty('--accent-text', text);
  document.documentElement.style.setProperty('--accent-soft', accent + '1a');

  netLabels.forEach(l => l.textContent = name);
  if (networkSelect) networkSelect.value = name;
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => setNetwork(tab));
});

document.querySelectorAll('.buy').forEach(btn => {
  btn.addEventListener('click', () => {
    const bundle = btn.getAttribute('data-bundle');
    const match = [...bundleSelect.options].find(o => o.value.startsWith(bundle));
    if (match) bundleSelect.value = match.value;
    document.getElementById('order').scrollIntoView({behavior:'smooth'});
  });
});

if (networkSelect) {
  networkSelect.addEventListener('change', () => {
    const name = networkSelect.value;
    const tab = [...tabs].find(t => t.querySelector('.name').textContent === name);
    if (tab) setNetwork(tab);
  });
}

// Sync the accent color with whichever tab is marked active on load.
const initialTab = document.querySelector('.net-tab.active');
if (initialTab) setNetwork(initialTab);

// ---------- Order form ----------
const orderForm = document.getElementById('orderForm');
const cellInput = document.getElementById('cell');
const cellError = document.getElementById('cellError');
const pinInput = document.getElementById('voucherpin');
const pinError = document.getElementById('voucherpinError');
const orderStatus = document.getElementById('orderStatus');

if (cellInput) {
  cellInput.addEventListener('input', () => {
    const digits = normalizePhone(cellInput.value).slice(0, 10);
    cellInput.value = digits;
    if (digits.length > 0) {
      setFieldState(cellInput, cellError, isValidSAPhone(digits), 'Enter exactly 10 digits, starting with 0.');
    } else {
      setFieldState(cellInput, cellError, true, '');
    }
  });
  cellInput.addEventListener('blur', () => {
    setFieldState(cellInput, cellError, cellInput.value.trim() === '' || isValidSAPhone(cellInput.value), 'Enter exactly 10 digits, starting with 0, e.g. 0821234567.');
  });
}
if (pinInput) {
  pinInput.addEventListener('input', () => {
    const digits = normalizeVoucherPin(pinInput.value).slice(0, 20);
    pinInput.value = digits;
    if (digits.length > 0) {
      setFieldState(pinInput, pinError, isValidVoucherPin(digits), 'Enter 12 to 20 OTT voucher digits.');
    } else {
      setFieldState(pinInput, pinError, true, '');
    }
  });
  pinInput.addEventListener('blur', () => {
    setFieldState(pinInput, pinError, pinInput.value.trim() === '' || isValidVoucherPin(pinInput.value), 'Enter 12 to 20 OTT voucher digits.');
  });
}

orderForm.addEventListener('submit', function(e){
  e.preventDefault();

  const fullname = document.getElementById('fullname').value.trim();
  const cell = document.getElementById('cell').value.trim();
  const network = document.getElementById('network').value;
  const bundle = document.getElementById('bundle').value;
  const voucherpin = document.getElementById('voucherpin').value.trim();
  const notes = document.getElementById('notes').value.trim();

  const cellOk = isValidSAPhone(cell);
  const pinOk = isValidVoucherPin(voucherpin);
  setFieldState(cellInput, cellError, cellOk, 'Enter exactly 10 digits, starting with 0, e.g. 0821234567.');
  setFieldState(pinInput, pinError, pinOk, 'Enter 12 to 20 OTT voucher digits.');

  if (!cellOk || !pinOk) {
    if (orderStatus) {
      orderStatus.textContent = 'Please fix the highlighted fields before sending your order.';
      orderStatus.classList.add('show', 'err');
      orderStatus.classList.remove('ok');
    }
    return;
  }

  if (orderStatus) {
    orderStatus.textContent = '';
    orderStatus.classList.remove('show', 'err', 'ok');
  }

  const subject = `ZICO Data Order — ${network} | ${bundle}`;

  const body =
`Dear ZICO Team,

I would like to place a data order. Please find the details below:

────────────────────────────────
ORDER SUMMARY
────────────────────────────────
Customer name:     ${fullname}
Cell number:       ${cell}
Network:           ${network}
Bundle:            ${bundle}
OTT voucher PIN:   ${voucherpin}
Notes:             ${notes || 'None'}
────────────────────────────────

Kindly process this order and load the data onto the number provided once the voucher has been confirmed.

Thank you.
${fullname}`;

  const mailto = `mailto:${ORDER_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailto;
});
