/**
 * TripSplit – Vanilla JS Engine (Clean, Optimized)
 * - No default data (starts empty)
 * - No Recent Expenses section
 * - No pairwise Give/Receive section
 * - Spend Amount = shows what was spent FOR each person with who paid below each entry
 * - Form fully resets after every submission (no persistent spender)
 */
(function () {
  'use strict';

  // ─── STORAGE KEYS ────────────────────────────────────────────────────────────
  const SK_PEOPLE          = 'ts_people_v2';
  const SK_EXPENSES        = 'ts_expenses_v2';
  const SK_AVGOVER         = 'ts_avgover_v2';
  const SK_REDO            = 'ts_redo_v2';
  const SK_AUTO_ALL_SPENDS = 'ts_auto_all_spends_v2';

  // ─── STATE ───────────────────────────────────────────────────────────────────
  let people           = [];
  let expenses         = [];
  let customAvg        = null;  // null = auto-calculated
  let defaultAllSpends = [];

  // ─── DOM REFS ────────────────────────────────────────────────────────────────
  const $ = id => document.getElementById(id);

  // Top metrics
  const elTotalSpending   = $('displayTotalSpending');
  const elExpCount        = $('displayExpensesCount');
  const elAvgPerPerson    = $('displayAvgPerPerson');
  const elAvgFormula      = $('avgFormula');
  const elPeopleCount     = $('displayPeopleCount');
  const elMemberPills     = $('memberPills');

  // Custom avg controls
  const btnToggleAvg  = $('btnToggleCustomAvg');
  const customAvgRow  = $('customAvgRow');
  const customAvgInp  = $('customAvgInput');
  const btnSaveAvg    = $('btnSaveAvg');
  const btnResetAvg   = $('btnResetAvg');

  // Borrow form
  const borrowForm        = $('borrowForm');
  const spenderGrid       = $('spenderGrid');
  const inpAmount         = $('inpAmount');
  const amountCalcHint    = $('amountCalcHint');
  const chkEveryone       = $('chkEveryone');
  const individualChks    = $('individualChks');
  const spentForCounter   = $('spentForCounter');
  const inpDesc           = $('inpDesc');
  const inpDate           = $('inpDate');
  const quickChips        = $('quickChips');
  const spenderErr        = $('spenderErr');
  const amountErr         = $('amountErr');
  const spentForErr       = $('spentForErr');
  const borrowSecretKey   = $('borrowSecretKey');
  const secretKeyErr      = $('secretKeyErr');

  // Spend Amount
  const personCards       = $('personCards');

  // Borrow Records Block
  const borrowRecordsList = $('borrowRecordsList');
  const borrowCountBadge  = $('borrowCountBadge');

  // Settlement
  const settlementList          = $('settlementList');
  const oneToOneSettlementList  = $('oneToOneSettlementList');
  const tabOneToOne             = $('tabOneToOne');
  const tabNetSettle            = $('tabNetSettle');
  const viewOneToOne            = $('viewOneToOne');
  const viewNetSettle           = $('viewNetSettle');

  // Add Person modal
  const btnOpenAddPerson  = $('btnOpenAddPerson');
  const modalAddPerson    = $('modalAddPerson');
  const formAddPerson     = $('formAddPerson');
  const inpPersonName     = $('inpPersonName');
  const personNameErr     = $('personNameErr');
  const existingMembers   = $('existingMembers');

  // Person Detail modal
  const modalPersonDetail = $('modalPersonDetail');
  const detailAvatar      = $('detailAvatar');
  const detailName        = $('detailName');
  const detailStatus      = $('detailStatus');
  const dTotalPaid        = $('dTotalPaid');
  const dTotalShare       = $('dTotalShare');
  const dBalance          = $('dBalance');
  const dBalanceBanner    = $('dBalanceBanner');
  const dBalanceLabel     = $('dBalanceLabel');
  const dBalanceAmt       = $('dBalanceAmt');
  const dExpTitle         = $('dExpTitle');
  const dBreakdownList    = $('dBreakdownList');

  // Decrease Self Spend modal
  const modalDecreaseExpense = $('modalDecreaseExpense');
  const formDecreaseExpense  = $('formDecreaseExpense');
  const decExpId             = $('decExpId');
  const decPersonName        = $('decPersonName');
  const decDesc              = $('decDesc');
  const decCurrentAmt        = $('decCurrentAmt');
  const decAmountInp         = $('decAmountInp');
  const decRemainingAmt      = $('decRemainingAmt');
  const decQuickChips        = $('decQuickChips');

  // Decrease Borrow modal (with Secret Key)
  const modalDecreaseBorrow     = $('modalDecreaseBorrow');
  const formDecreaseBorrow      = $('formDecreaseBorrow');
  const decBorrowExpId          = $('decBorrowExpId');
  const decBorrowDesc           = $('decBorrowDesc');
  const decBorrowPayer          = $('decBorrowPayer');
  const decBorrowCurrentAmt     = $('decBorrowCurrentAmt');
  const decBorrowKeyInp         = $('decBorrowKeyInp');
  const decBorrowKeyErr         = $('decBorrowKeyErr');
  const decBorrowAmtInp         = $('decBorrowAmtInp');
  const decBorrowPreview        = $('decBorrowPreview');
  const decBorrowRemainingAmt   = $('decBorrowRemainingAmt');
  const decBorrowPersonRow      = $('decBorrowPersonRow');
  const decBorrowPayerSel       = $('decBorrowPayerSel');
  const decBorrowPerHeadHint    = $('decBorrowPerHeadHint');

  // Edit modal
  const modalEdit         = $('modalEdit');
  const formEdit          = $('formEdit');
  const editId            = $('editId');
  const editSpenderGrid   = $('editSpenderGrid');
  const editAmt           = $('editAmt');
  const editChkAll        = $('editChkAll');
  const editIndChks       = $('editIndChks');
  const editCounter       = $('editCounter');
  const editDesc          = $('editDesc');
  const editDate          = $('editDate');

  // Footer
  const btnExport         = $('btnExport');
  const btnClearAll       = $('btnClearAll');
  const btnClearTop       = $('btnClearTop');

  // Custom popup modal (replaces native alert/confirm/prompt)
  const modalPopup        = $('modalPopup');
  const popupIcon         = $('popupIcon');
  const popupTitle        = $('popupTitle');
  const popupMsg          = $('popupMsg');
  const popupInputWrap    = $('popupInputWrap');
  const popupInput        = $('popupInput');
  const popupBtnOk        = $('popupBtnOk');
  const popupBtnCancel    = $('popupBtnCancel');
  const popupBtnConfirm   = $('popupBtnConfirm');

  // Bulk personal spend modal
  const btnBulkSpend        = $('btnBulkSpend');
  const modalBulkSpend      = $('modalBulkSpend');
  const formBulkSpend       = $('formBulkSpend');
  const bulkAmount          = $('bulkAmount');
  const bulkCalcHint        = $('bulkCalcHint');
  const bulkDesc            = $('bulkDesc');
  const bulkSpendDate       = $('bulkSpendDate');
  const bulkMemberTags      = $('bulkMemberTags');
  const scopeCardExisting   = $('scopeCardExisting');
  const scopeCardAllNew     = $('scopeCardAllNew');

  // Admin password used to protect Add Person / Delete Person / Clear All
  const ADMIN_PASSWORD = 'mingutha';

  // Per-person redo stack for undo/redo (persisted to localStorage)
  let redoStacks = {};

  // ─── UTILS ───────────────────────────────────────────────────────────────────
  const fmtINR = v => {
    const n = Number(v) || 0;
    return '₹' + n.toLocaleString('en-IN', {
      minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
      maximumFractionDigits: 2
    });
  };

  /**
   * Safely evaluates numbers and math expressions with division (/ or ÷) and multiplication (* or × or x)
   * e.g. "16000/8" -> 2000, "16000÷8" -> 2000, "2000*8" -> 16000, "2000x8" -> 16000
   */
  const evalAmount = val => {
    if (val === null || val === undefined) return NaN;
    let s = String(val).trim();
    if (!s) return NaN;
    // Replace unicode division and multiplication
    s = s.replace(/÷/g, '/').replace(/×/g, '*');
    // Replace 'x' or 'X' between digits or after spaces as multiplication
    s = s.replace(/(\d)\s*[xX]\s*(\d)/g, '$1*$2');
    if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
    if (/^[0-9+\-*/. ()]+$/.test(s)) {
      try {
        const res = Function(`'use strict'; return (${s})`)();
        if (typeof res === 'number' && !isNaN(res) && isFinite(res) && res > 0) {
          return Math.round(res * 100) / 100;
        }
      } catch {}
    }
    return NaN;
  };

  const initials = name => (name || '?').trim()[0].toUpperCase();
  const genId    = () => 'exp_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
  const today    = () => new Date().toISOString().split('T')[0];
  const fmtDate  = s => {
    if (!s) return '';
    const [y,m,d] = s.split('-');
    return new Date(y, m-1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  // ─── SERVER SYNC ─────────────────────────────────────────────────────────────
  let _lastServerSnapshot = '';   // JSON string of last data from server
  let _syncing = false;

  /** Push current state to the server (fire-and-forget) */
  function syncToServer() {
    if (_syncing) return;
    const payload = JSON.stringify({
      people, expenses, customAvg, defaultAllSpends
    });
    _lastServerSnapshot = payload;
    fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload
    }).catch(() => {});   // ignore failures (offline etc.)
  }

  /** Pull latest state from server; merge only if server is newer */
  async function loadFromServer(silent) {
    try {
      const res = await fetch('/api/data');
      if (!res.ok) return false;
      const data = await res.json();

      // Check if server has initialized trip data (has .people array)
      const serverHasData = data && Array.isArray(data.people);

      if (!serverHasData) {
        // Server is uninitialized: if this client has local data, push it up to server so others see it!
        if (people.length > 0 || expenses.length > 0) {
          syncToServer();
        }
        return false;
      }

      const snap = JSON.stringify(data);
      if (snap === _lastServerSnapshot) return false;   // no change
      _lastServerSnapshot = snap;

      // Apply server data to state
      people           = Array.isArray(data.people)           ? data.people           : people;
      expenses         = Array.isArray(data.expenses)         ? data.expenses         : expenses;
      customAvg        = (data.customAvg !== undefined)        ? data.customAvg        : customAvg;
      defaultAllSpends = Array.isArray(data.defaultAllSpends) ? data.defaultAllSpends : defaultAllSpends;

      // Keep localStorage in sync too
      localStorage.setItem(SK_PEOPLE,          JSON.stringify(people));
      localStorage.setItem(SK_EXPENSES,        JSON.stringify(expenses));
      localStorage.setItem(SK_REDO,            JSON.stringify(redoStacks));
      localStorage.setItem(SK_AUTO_ALL_SPENDS, JSON.stringify(defaultAllSpends));
      if (customAvg !== null && !isNaN(customAvg) && customAvg > 0)
        localStorage.setItem(SK_AVGOVER, customAvg);
      else localStorage.removeItem(SK_AVGOVER);

      if (!silent) renderAll();
      return true;
    } catch {
      return false;
    }
  }

  // ─── PERSISTENCE ─────────────────────────────────────────────────────────────
  function load() {
    try {
      people           = JSON.parse(localStorage.getItem(SK_PEOPLE))   || [];
      expenses         = JSON.parse(localStorage.getItem(SK_EXPENSES)) || [];
      const ca         = localStorage.getItem(SK_AVGOVER);
      if (ca !== null && ca !== '' && ca !== 'null' && ca !== 'undefined') {
        const parsed = parseFloat(ca);
        customAvg = (!isNaN(parsed) && parsed > 0) ? parsed : null;
      } else {
        customAvg = null;
      }
      redoStacks       = JSON.parse(localStorage.getItem(SK_REDO)) || {};
      defaultAllSpends = JSON.parse(localStorage.getItem(SK_AUTO_ALL_SPENDS)) || [];
    } catch {
      people = []; expenses = []; customAvg = null; redoStacks = {}; defaultAllSpends = [];
    }
  }

  function save() {
    localStorage.setItem(SK_PEOPLE,          JSON.stringify(people));
    localStorage.setItem(SK_EXPENSES,        JSON.stringify(expenses));
    localStorage.setItem(SK_REDO,            JSON.stringify(redoStacks));
    localStorage.setItem(SK_AUTO_ALL_SPENDS, JSON.stringify(defaultAllSpends));
    if (customAvg !== null && !isNaN(customAvg) && customAvg > 0) localStorage.setItem(SK_AVGOVER, customAvg);
    else localStorage.removeItem(SK_AVGOVER);
    syncToServer();   // ← push to server so all devices see the update
  }

  // ─── CUSTOM POPUP HELPERS (replace native alert/confirm/prompt) ──────────────
  let _popupResolve = null;
  let _popupIsPrompt = false;

  function _showPopup({ icon, title, msg, type }) {
    popupIcon.textContent = icon || 'ℹ️';
    // Icon background colour by type
    popupIcon.style.background = type === 'danger' ? 'var(--red-s)' :
                                 type === 'success' ? 'var(--green-s)' : 'var(--subtle)';
    popupIcon.style.borderColor = type === 'danger' ? 'var(--red-b)' :
                                  type === 'success' ? 'var(--green-b)' : 'var(--border)';
    popupTitle.textContent = title || '';
    popupMsg.textContent   = msg   || '';
    modalPopup.classList.add('open');
    modalPopup.setAttribute('aria-hidden', 'false');
  }

  function uiAlert(title, msg, opts = {}) {
    return new Promise(resolve => {
      _popupResolve  = resolve;
      _popupIsPrompt = false;
      _showPopup({ icon: opts.icon || 'ℹ️', title, msg, type: opts.type });
      popupInputWrap.style.display  = 'none';
      popupBtnOk.style.display      = '';
      popupBtnCancel.style.display  = 'none';
      popupBtnConfirm.style.display = 'none';
      popupBtnOk.textContent        = opts.okLabel || 'OK';
      setTimeout(() => popupBtnOk.focus(), 60);
    });
  }

  function uiConfirm(title, msg, opts = {}) {
    return new Promise(resolve => {
      _popupResolve  = resolve;
      _popupIsPrompt = false;
      _showPopup({ icon: opts.icon || '⚠️', title, msg, type: opts.type || 'danger' });
      popupInputWrap.style.display  = 'none';
      popupBtnOk.style.display      = 'none';
      popupBtnCancel.style.display  = '';
      popupBtnConfirm.style.display = '';
      popupBtnCancel.textContent    = opts.cancelLabel  || 'Cancel';
      popupBtnConfirm.textContent   = opts.confirmLabel || 'Confirm';
      popupBtnConfirm.className     = 'btn ' + (opts.type === 'danger' ? 'btn-decrease-confirm' : 'btn-primary');
      setTimeout(() => popupBtnCancel.focus(), 60);
    });
  }

  function uiPrompt(title, msg, opts = {}) {
    return new Promise(resolve => {
      _popupResolve  = resolve;
      _popupIsPrompt = true;
      _showPopup({ icon: opts.icon || '🔑', title, msg, type: opts.type });
      popupInput.type        = opts.inputType    || 'text';
      popupInput.placeholder = opts.placeholder  || '';
      popupInput.value       = '';
      popupInputWrap.style.display  = 'block';
      popupBtnOk.style.display      = 'none';
      popupBtnCancel.style.display  = '';
      popupBtnConfirm.style.display = '';
      popupBtnCancel.textContent    = 'Cancel';
      popupBtnConfirm.textContent   = opts.submitLabel || 'Submit';
      popupBtnConfirm.className     = 'btn btn-primary';
      setTimeout(() => popupInput.focus(), 60);
    });
  }

  function _closePopup(result) {
    modalPopup.classList.remove('open');
    modalPopup.setAttribute('aria-hidden', 'true');
    if (_popupResolve) { _popupResolve(result); _popupResolve = null; }
  }

  popupBtnOk.addEventListener('click',      () => _closePopup(undefined));
  popupBtnCancel.addEventListener('click',  () => _closePopup(_popupIsPrompt ? null : false));
  popupBtnConfirm.addEventListener('click', () => _closePopup(_popupIsPrompt ? popupInput.value : true));
  popupInput.addEventListener('keydown', e => { if (e.key === 'Enter') _closePopup(popupInput.value); });
  modalPopup.addEventListener('click', e => { if (e.target === modalPopup) _closePopup(_popupIsPrompt ? null : false); });

  /**
   * Prompts for the admin password and resolves true only if it matches.
   * Shows a "wrong password" alert on mismatch. Resolves false if cancelled or wrong.
   */
  async function verifyAdminPassword(title, msg) {
    const pwd = await uiPrompt(title, msg, { icon: '🔒', inputType: 'password', placeholder: 'Password…', submitLabel: 'Confirm' });
    if (pwd === null) return false; // cancelled
    if (pwd === ADMIN_PASSWORD) return true;
    await uiAlert('Wrong Password', 'Incorrect password! Action was not performed.', { icon: '🔒', type: 'danger' });
    return false;
  }

  // ─── CALCULATIONS ────────────────────────────────────────────────────────────
  /**
   * Returns per-person stats and optimal settlement transactions.
   *
   * For each person we track:
   *   totalPaid  - amount paid out by this person (spentBy)
   *   share      - sum of (exp.amount / exp.spentFor.length) for each expense they're listed in
   *   balance    = totalPaid - share  (positive = owed money, negative = owes money)
   *
   * Also builds a list of expenses-per-beneficiary:
   *   expensesForPerson[person] = [ { desc, date, share, paidBy }, ... ]
   */
  function calculate() {
    // totalSpend: for borrows, payer paid full amount FOR EACH beneficiary, plus themselves (cnt + 1)
    const totalSpend = expenses.reduce((s, e) => {
      const amount = Number(e.amount) || 0;
      const cnt = Array.isArray(e.spentFor) ? e.spentFor.length : 1;
      return s + (e.isBorrow ? amount * (cnt + 1) : amount);
    }, 0);
    const n = people.length;
    const autoAvg = n > 1 ? (totalSpend / (n - 1)) : 0;

    // Init per-person buckets
    const stats = {};
    const forPerson = {};          // expenses FOR each person
    people.forEach(p => {
      stats[p]     = { totalPaid: 0, share: 0 };
      forPerson[p] = [];
    });

    expenses.forEach(exp => {
      const payer  = exp.spentBy;
      const amount = Number(exp.amount) || 0;
      const bens   = Array.isArray(exp.spentFor) ? exp.spentFor : [];
      const cnt    = bens.length;
      if (!cnt) return;

      if (exp.isBorrow) {
        // ── BORROW: the entered amount is what EACH beneficiary owes to the payer.
        //    Payer gets credit for amount × number of borrowers.
        if (stats[payer]) stats[payer].totalPaid += amount * cnt;

        bens.forEach(b => {
          if (!stats[b]) return;
          stats[b].share += amount;          // each person owes the FULL amount
          forPerson[b].push({
            id:       exp.id,
            desc:     exp.description || 'Borrow',
            date:     exp.date,
            share:    amount,                // full amount per person
            paidBy:   payer,
            amount:   amount,
            spentFor: exp.spentFor
          });
        });
      } else {
        // ── REGULAR / SELF-SPEND: split evenly among beneficiaries
        const perHead = Math.round(amount / cnt * 100) / 100;

        if (stats[payer]) stats[payer].totalPaid += amount;

        bens.forEach(b => {
          if (!stats[b]) return;
          stats[b].share += perHead;
          forPerson[b].push({
            id:       exp.id,
            desc:     exp.description || 'Expense',
            date:     exp.date,
            share:    perHead,
            paidBy:   payer,
            amount:   amount,
            spentFor: exp.spentFor
          });
        });
      }
    });

    // Compute balances
    people.forEach(p => {
      if (stats[p]) stats[p].balance = stats[p].totalPaid - stats[p].share;
    });

    // Optimal settlement (greedy min-cash-flow)
    const debtors   = [];
    const creditors = [];
    people.forEach(p => {
      const b = stats[p] ? stats[p].balance : 0;
      if (b < -0.01) debtors.push({ name: p, amount: -b });
      else if (b > 0.01) creditors.push({ name: p, amount: b });
    });
    debtors.sort((a,b) => b.amount - a.amount);
    creditors.sort((a,b) => b.amount - a.amount);

    const transactions = [];
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const settle = Math.min(debtors[i].amount, creditors[j].amount);
      if (settle > 0.009) {
        transactions.push({ from: debtors[i].name, to: creditors[j].name, amount: settle });
      }
      debtors[i].amount   -= settle;
      creditors[j].amount -= settle;
      if (debtors[i].amount   <= 0.01) i++;
      if (creditors[j].amount <= 0.01) j++;
    }

    // ── One-to-One (Pairwise) Settlement: compute direct debts between each pair
    const directDebts = {};
    people.forEach(p1 => {
      directDebts[p1] = {};
      people.forEach(p2 => { directDebts[p1][p2] = 0; });
    });

    expenses.forEach(exp => {
      const payer  = exp.spentBy;
      const amount = Number(exp.amount) || 0;
      const bens   = Array.isArray(exp.spentFor) ? exp.spentFor : [];
      const cnt    = bens.length;
      if (!cnt) return;

      if (exp.isBorrow) {
        bens.forEach(b => {
          if (b !== payer && directDebts[b] && directDebts[b][payer] !== undefined) {
            directDebts[b][payer] += amount;
          }
        });
      } else {
        const perHead = Math.round(amount / cnt * 100) / 100;
        bens.forEach(b => {
          if (b !== payer && directDebts[b] && directDebts[b][payer] !== undefined) {
            directDebts[b][payer] += perHead;
          }
        });
      }
    });

    const pairwiseTransactions = [];
    for (let pi = 0; pi < people.length; pi++) {
      for (let pj = pi + 1; pj < people.length; pj++) {
        const p1 = people[pi];
        const p2 = people[pj];
        const p1OwesP2 = (directDebts[p1] && directDebts[p1][p2]) || 0;
        const p2OwesP1 = (directDebts[p2] && directDebts[p2][p1]) || 0;
        const net = Math.round((p1OwesP2 - p2OwesP1) * 100) / 100;

        if (net > 0.009) {
          pairwiseTransactions.push({ from: p1, to: p2, amount: net });
        } else if (net < -0.009) {
          pairwiseTransactions.push({ from: p2, to: p1, amount: Math.abs(net) });
        }
      }
    }
    pairwiseTransactions.sort((a, b) => b.amount - a.amount);

    return { totalSpend, autoAvg, stats, forPerson, transactions, pairwiseTransactions };
  }

  // ─── RENDER ALL ──────────────────────────────────────────────────────────────
  function renderAll() {
    const data = calculate();
    renderTopMetrics(data);
    renderSpenderOptions(spenderGrid, getSelectedSpender(spenderGrid), people);
    renderIndividualCheckboxes();
    renderPersonCards(data);
    renderBorrowRecords(data);
    renderSettlement(data);
  }

  // ─── TOP METRICS ─────────────────────────────────────────────────────────────
  function renderTopMetrics({ totalSpend, autoAvg }) {
    elTotalSpending.textContent = fmtINR(totalSpend);
    elExpCount.textContent = `${expenses.length} ${expenses.length === 1 ? 'expense' : 'expenses'}`;
    elPeopleCount.textContent  = people.length;

    elAvgPerPerson.innerHTML = `${fmtINR(autoAvg)} <span class="per-person">/ person</span>`;
    elAvgFormula.textContent = 'Total ÷ (People − 1)';

    // Member pills
    elMemberPills.innerHTML = people.map(p => `<span class="pill">${p}</span>`).join('');

    // Existing members hint in modal (with delete button per person)
    if (existingMembers) {
      existingMembers.innerHTML = people.length
        ? 'Current members: ' + people.map(p => `<span class="pill">${p} <button type="button" class="pill-del" data-name="${p}" title="Remove ${p}">×</button></span>`).join('')
        : '<span style="color:var(--light)">No members yet</span>';
    }
  }

  // ─── SPENDER OPTIONS ─────────────────────────────────────────────────────────
  function renderSpenderOptions(container, currentSelected, list) {
    if (!list.length) {
      container.innerHTML = '<div class="empty-hint">Add people first.</div>';
      return;
    }
    container.innerHTML = list.map(p => `
      <label class="spender-card ${currentSelected === p ? 'selected' : ''}">
        <input type="radio" name="spentBy_${container.id}" value="${p}" ${currentSelected === p ? 'checked' : ''} />
        <div class="avatar">${initials(p)}</div>
        <span class="spender-name">${p}</span>
        <span class="radio-dot"></span>
      </label>
    `).join('');

    container.querySelectorAll('.spender-card').forEach(card => {
      card.addEventListener('click', () => {
        container.querySelectorAll('.spender-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        card.querySelector('input').checked = true;
        spenderErr.classList.remove('show');
        // In borrow amount, selecting a payer immediately excludes them from Spent For
        if (container === spenderGrid) {
          renderIndividualCheckboxes();
        }
      });
    });
  }

  function getSelectedSpender(container) {
    const el = container.querySelector('input[type="radio"]:checked');
    return el ? el.value : null;
  }

  // ─── INDIVIDUAL CHECKBOXES ───────────────────────────────────────────────────
  function renderIndividualCheckboxes() {
    const payer = getSelectedSpender(spenderGrid);
    // Exclude payer from Borrow Amount: no option to pay or borrow for themselves!
    const eligiblePeople = payer ? people.filter(p => p !== payer) : people;

    if (!people.length) {
      individualChks.innerHTML = '<div class="empty-hint">Add people to see them here.</div>';
      updateCounter();
      return;
    }

    if (!eligiblePeople.length) {
      individualChks.innerHTML = '<div class="empty-hint">Add other trip members to borrow for.</div>';
      updateCounter();
      return;
    }

    // Keep previously selected eligible people
    const previouslyChecked = Array.from(individualChks.querySelectorAll('input[type="checkbox"]:checked'))
      .map(c => c.value)
      .filter(name => name !== payer);

    individualChks.innerHTML = eligiblePeople.map(p => `
      <label class="chk-item">
        <input type="checkbox" name="spentFor" value="${p}" ${previouslyChecked.includes(p) ? 'checked' : ''} />
        <span class="chk-box"></span>
        <span class="chk-label">${p}</span>
      </label>
    `).join('');

    individualChks.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => {
        syncEveryone();
        updateCounter();
        spentForErr.classList.remove('show');
      });
    });
    syncEveryone();
    updateCounter();
  }

  function syncEveryone() {
    const cbs = individualChks.querySelectorAll('input[type="checkbox"]');
    if (!cbs.length) { chkEveryone.checked = false; return; }
    chkEveryone.checked = Array.from(cbs).every(c => c.checked);
  }

  function updateCounter() {
    const n = individualChks.querySelectorAll('input[type="checkbox"]:checked').length;
    spentForCounter.textContent = `${n} ${n === 1 ? 'person' : 'people'} selected`;
  }

  chkEveryone.addEventListener('change', () => {
    individualChks.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = chkEveryone.checked);
    updateCounter();
    if (chkEveryone.checked) spentForErr.classList.remove('show');
  });

  // ─── SPEND AMOUNT CARDS ──────────────────────────────────────────────────────
  /**
   * Each person's card shows:
   *  - Name + inline quick-spend input + Balance chip at top
   *  - List of expenses paid FOR them (description, who paid below each entry)
   *  - Total share at bottom
   *  - "View full breakdown →" link
   */
  function renderPersonCards({ stats, forPerson }) {
    if (!people.length) {
      personCards.innerHTML = `
        <div class="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:#94a3b8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <p>Add people and record expenses to see the split here.</p>
        </div>`;
      return;
    }

    personCards.innerHTML = people.map(person => {
      const stat    = stats[person] || { totalPaid: 0, share: 0, balance: 0 };
      const exps    = forPerson[person] || [];
      const balance = stat.balance;

      let chipClass = 'chip--grey', chipText = 'Settled';
      if (balance >  0.01) { chipClass = 'chip--green'; chipText = `+${fmtINR(balance)} to receive`; }
      if (balance < -0.01) { chipClass = 'chip--red';   chipText = `${fmtINR(Math.abs(balance))} to pay`; }

      const expRows = exps.length
        ? `<div class="pcard-expenses">${exps.map(e => `
            <div class="pexp-row">
              <div class="pexp-left">
                <span class="pexp-desc">${e.desc}</span>
                <span class="pexp-paidby">
                  <span class="avatar-sm">${initials(e.paidBy)}</span>
                  Paid by ${e.paidBy} • ${fmtDate(e.date)}
                </span>
              </div>
              <span class="pexp-amount">${fmtINR(e.share)}</span>
            </div>`).join('')}</div>`
        : `<div class="pcard-no-expenses">No expenses recorded for ${person} yet.</div>`;

      return `
        <div class="pcard">
          <div class="pcard-header">
            <div class="pcard-person">
              <div class="avatar">${initials(person)}</div>
              <span class="pcard-name">${person}</span>
            </div>
            <span class="pcard-balance-chip ${chipClass}">${chipText}</span>
          </div>

          <!-- Self spend row below name in a row -->
          <div class="pcard-self-spend-row">
            <form class="quick-spend-form" data-person="${person}">
              <div class="qs-amt-wrap">
                <span class="qs-sym">₹</span>
                <input
                  type="number"
                  class="qs-amt-input"
                  placeholder="Amount"
                  min="1"
                  step="any"
                  required
                  title="Amount spent by ${person} on themselves"
                />
              </div>
              <input
                type="text"
                class="qs-desc-input"
                placeholder="Why? (e.g. Snacks, Tea)"
                maxlength="40"
                title="Description / why"
              />
              <button type="submit" class="qs-btn" title="Add self spend">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                Add
              </button>
            </form>
            <div class="pcard-undo-redo">
              <button type="button" class="btn-undo-person" data-person="${person}" title="Undo previous self-spending for ${person}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
                Undo
              </button>
              <button type="button" class="btn-redo-person" data-person="${person}" title="Redo previous undone spending for ${person}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/></svg>
                Redo
              </button>
            </div>
          </div>

          ${expRows}

          <div class="pcard-total">
            <span class="pcard-total-label">Total Share for ${person}</span>
            <span class="pcard-total-amt">${fmtINR(stat.share)}</span>
          </div>

          <button class="view-details" data-person="${person}">View full breakdown →</button>
        </div>`;
    }).join('');

    // ── Quick Spend: submit via Enter or button click
    personCards.querySelectorAll('.quick-spend-form').forEach(form => {
      const person = form.dataset.person;
      const amtInp = form.querySelector('.qs-amt-input');
      const descInp = form.querySelector('.qs-desc-input');
      const btn = form.querySelector('.qs-btn');

      form.addEventListener('submit', e => {
        e.preventDefault();
        e.stopPropagation();
        const amount = parseFloat(amtInp.value);
        if (!amount || amount <= 0) {
          amtInp.classList.add('qs-error');
          amtInp.focus();
          setTimeout(() => amtInp.classList.remove('qs-error'), 900);
          return;
        }

        const description = (descInp.value || '').trim() || 'Self Spend';

        // Save: spentBy = person, spentFor = [person] (personal self expense)
        expenses.push({
          id: genId(),
          spentBy: person,
          amount,
          spentFor: [person],
          description,
          date: today(),
          isSelfSpend: true,
          createdAt: Date.now()
        });
        save();
        amtInp.value = '';
        descInp.value = '';
        btn.classList.add('qs-ok');
        setTimeout(() => btn.classList.remove('qs-ok'), 800);
        renderAll();
      });

      // Prevent card click bubbling when clicking inside quick-spend form
      form.addEventListener('click', e => e.stopPropagation());
    });

    // ── Undo previous self-spending for this person (cannot remove spending by others)
    personCards.querySelectorAll('.btn-undo-person').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const person = btn.dataset.person;
        let targetIdx = -1;
        for (let i = expenses.length - 1; i >= 0; i--) {
          const exp = expenses[i];
          // ONLY undo self-spending made by this person, NOT spending by others!
          if (exp.spentBy === person && Array.isArray(exp.spentFor) && exp.spentFor.length === 1 && exp.spentFor[0] === person) {
            targetIdx = i;
            break;
          }
        }

        if (targetIdx === -1) {
          await uiAlert('Nothing to Undo', `No personal self-spendings found to undo for ${person}.\n\nNote: Undo cannot remove expenses paid by others.`, { icon: 'ℹ️' });
          return;
        }

        const removedExp = expenses.splice(targetIdx, 1)[0];
        if (!redoStacks[person]) redoStacks[person] = [];
        redoStacks[person].push(removedExp);

        save();
        renderAll();
      });
    });

    // ── Redo previous undone spending for this person
    personCards.querySelectorAll('.btn-redo-person').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const person = btn.dataset.person;
        if (!redoStacks[person] || redoStacks[person].length === 0) {
          await uiAlert('Nothing to Redo', `No undone spendings to restore for ${person}.`, { icon: 'ℹ️' });
          return;
        }

        const restoredExp = redoStacks[person].pop();
        expenses.push(restoredExp);
        save();
        renderAll();
      });
    });

    // ── Detail modal: ONLY opens when explicitly clicking "View full breakdown →"
    personCards.querySelectorAll('.view-details').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        openDetailModal(btn.dataset.person, calculate());
      });
    });
  }

  // ─── SETTLEMENT ──────────────────────────────────────────────────────────────
  function renderSettlement({ transactions, pairwiseTransactions }) {
    const buildListHtml = (items, emptyMsg) => {
      if (!items || !items.length) {
        return `<div class="settle-empty">${emptyMsg}</div>`;
      }
      return items.map(t => `
        <div class="settle-item">
          <div class="settle-flow">
            <div class="settle-party">
              <div class="avatar" style="width:24px;height:24px;font-size:.6rem">${initials(t.from)}</div>
              ${t.from}
            </div>
            <div class="settle-arrow">
              <span>pays</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </div>
            <div class="settle-party">
              <div class="avatar" style="width:24px;height:24px;font-size:.6rem;background:var(--blue);color:#fff">${initials(t.to)}</div>
              ${t.to}
            </div>
          </div>
          <span class="settle-amount">${fmtINR(t.amount)}</span>
        </div>
      `).join('');
    };

    if (oneToOneSettlementList) {
      oneToOneSettlementList.innerHTML = buildListHtml(pairwiseTransactions, 'No 1-to-1 payments needed – all even!');
    }
    if (settlementList) {
      settlementList.innerHTML = buildListHtml(transactions, 'All settled up once you add expenses.');
    }
  }

  // Settlement Mode Tabs (1-to-1 Direct vs Simplified Total)
  if (tabOneToOne && tabNetSettle) {
    tabOneToOne.addEventListener('click', () => {
      tabOneToOne.classList.add('active');
      tabNetSettle.classList.remove('active');
      if (viewOneToOne) viewOneToOne.style.display = 'block';
      if (viewNetSettle) viewNetSettle.style.display = 'none';
    });
    tabNetSettle.addEventListener('click', () => {
      tabNetSettle.classList.add('active');
      tabOneToOne.classList.remove('active');
      if (viewOneToOne) viewOneToOne.style.display = 'none';
      if (viewNetSettle) viewNetSettle.style.display = 'block';
    });
  }

  // ─── PERSON DETAIL MODAL ─────────────────────────────────────────────────────
  function openDetailModal(person, { stats, forPerson }) {
    const stat = stats[person] || { totalPaid: 0, share: 0, balance: 0 };
    const exps = forPerson[person] || [];
    const balance = stat.balance;

    detailAvatar.textContent  = initials(person);
    detailName.textContent    = person;
    dTotalPaid.textContent    = fmtINR(stat.totalPaid);
    dTotalShare.textContent   = fmtINR(stat.share);
    dBalance.textContent      = fmtINR(Math.abs(balance));

    // Balance banner
    dBalanceBanner.className = 'balance-banner';
    if (balance > 0.01) {
      dBalanceBanner.classList.add('receive');
      dBalanceLabel.textContent = `${person} should receive:`;
      dBalanceAmt.textContent   = fmtINR(balance);
      detailStatus.textContent  = 'Net Creditor – owed money';
    } else if (balance < -0.01) {
      dBalanceBanner.classList.add('give');
      dBalanceLabel.textContent = `${person} needs to pay:`;
      dBalanceAmt.textContent   = fmtINR(Math.abs(balance));
      detailStatus.textContent  = 'Net Debtor – needs to pay';
    } else {
      dBalanceBanner.classList.add('settled');
      dBalanceLabel.textContent = `${person} is fully settled.`;
      dBalanceAmt.textContent   = '₹0';
      detailStatus.textContent  = 'All even ✓';
    }

    // Expense breakdown list
    dExpTitle.textContent = `What was spent for ${person}`;

    if (!exps.length) {
      dBreakdownList.innerHTML = `<div class="bkrow"><span class="bkrow-left"><span class="bkrow-desc" style="color:var(--light)">No expenses recorded for ${person} yet.</span></span></div>`;
    } else {
      const rows = exps.map(e => {
        // ONLY self-spend can be decreased! (Cannot decrease spending by others)
        const isSelfSpend = (e.paidBy === person && Array.isArray(e.spentFor) && e.spentFor.length === 1 && e.spentFor[0] === person);
        const decreaseBtnHtml = isSelfSpend ? `
          <button type="button" class="btn-decrease-amt" data-exp-id="${e.id}" data-person="${person}" title="Decrease this self spend">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Decrease
          </button>
        ` : '';

        return `
          <div class="bkrow">
            <div class="bkrow-left">
              <span class="bkrow-desc">${e.desc}</span>
              <span class="bkrow-meta">
                Paid by <strong>${e.paidBy}</strong> • 
                ${e.isBorrow ? `Borrow (${fmtINR(e.share)})` : (e.spentFor && e.spentFor.length > 1 ? `Split ${e.spentFor.length} ways (${fmtINR(e.share)} each)` : 'Self spend')} •
                ${fmtDate(e.date)}
              </span>
            </div>
            <div class="bkrow-right">
              <span class="bkrow-amt">${fmtINR(e.share)}</span>
              ${decreaseBtnHtml}
            </div>
          </div>
        `;
      }).join('');

      const totalRow = `
        <div class="bkrow bkrow-total">
          <div class="bkrow-left">
            <span class="bkrow-desc">Total Share for ${person}</span>
          </div>
          <span class="bkrow-amt">${fmtINR(stat.share)}</span>
        </div>
      `;

      dBreakdownList.innerHTML = rows + totalRow;

      // Event listener for decreasing self-spend expenditure amount
      dBreakdownList.querySelectorAll('.btn-decrease-amt').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          const expId = btn.dataset.expId;
          const forPersonName = btn.dataset.person;
          openDecreaseModal(expId, forPersonName);
        });
      });
    }

    openModal(modalPersonDetail);
  }

  // ─── INTERACTIVE DECREASE SELF-SPEND MODAL ────────────────────────────────────
  function openDecreaseModal(expId, personName) {
    const exp = expenses.find(x => x.id === expId);
    if (!exp) return;

    decExpId.value = exp.id;
    decPersonName.value = personName;
    decDesc.textContent = exp.description || 'Self Spend';
    decCurrentAmt.textContent = fmtINR(exp.amount);
    decAmountInp.value = '';
    decAmountInp.max = exp.amount;
    decRemainingAmt.textContent = fmtINR(exp.amount);

    if (decQuickChips) {
      decQuickChips.querySelectorAll('.dec-chip').forEach(c => c.classList.remove('active'));
    }

    openModal(modalDecreaseExpense);
    setTimeout(() => decAmountInp.focus(), 80);
  }

  if (decAmountInp) {
    decAmountInp.addEventListener('input', () => {
      const exp = expenses.find(x => x.id === decExpId.value);
      if (!exp) return;
      const reduceVal = parseFloat(decAmountInp.value) || 0;
      const remaining = Math.max(0, exp.amount - reduceVal);
      decRemainingAmt.textContent = fmtINR(remaining);
    });
  }

  if (decQuickChips) {
    decQuickChips.addEventListener('click', e => {
      const chip = e.target.closest('.dec-chip');
      if (!chip) return;
      const exp = expenses.find(x => x.id === decExpId.value);
      if (!exp) return;

      const reduceType = chip.dataset.reduce;
      let reduceVal = 0;
      if (reduceType === 'all') {
        reduceVal = exp.amount;
      } else {
        reduceVal = Math.min(exp.amount, parseFloat(reduceType) || 0);
      }
      decAmountInp.value = reduceVal;
      decRemainingAmt.textContent = fmtINR(Math.max(0, exp.amount - reduceVal));
      decQuickChips.querySelectorAll('.dec-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
    });
  }

  if (formDecreaseExpense) {
    formDecreaseExpense.addEventListener('submit', async e => {
      e.preventDefault();
      const expId = decExpId.value;
      const personName = decPersonName.value;
      const exp = expenses.find(x => x.id === expId);
      if (!exp) return;

      const reduceBy = parseFloat(decAmountInp.value);
      if (isNaN(reduceBy) || reduceBy <= 0) {
        await uiAlert('Invalid Amount', 'Please enter a valid amount greater than 0.', { icon: '⚠️', type: 'danger' });
        return;
      }

      if (reduceBy >= exp.amount) {
        expenses = expenses.filter(x => x.id !== expId);
      } else {
        exp.amount = Math.round((exp.amount - reduceBy) * 100) / 100;
      }

      save();
      closeModal(modalDecreaseExpense);
      renderAll();
      openDetailModal(personName, calculate());
    });
  }

  // ─── PREVIOUS BORROW RECORDS BLOCK ───────────────────────────────────────────
  function renderBorrowRecords(data) {
    if (!borrowRecordsList) return;
    const transactions = (data && data.transactions) ? data.transactions : [];
    const borrowExps = expenses.filter(e => e.isBorrow || (Array.isArray(e.spentFor) && e.spentFor.some(p => p !== e.spentBy)));

    if (borrowCountBadge) {
      borrowCountBadge.textContent = `${borrowExps.length} ${borrowExps.length === 1 ? 'record' : 'records'}`;
    }

    if (!borrowExps.length) {
      borrowRecordsList.innerHTML = '<div class="empty-hint" style="text-align:center; padding:16px;">No borrow records yet. Submit a borrow amount above.</div>';
      return;
    }

    const sorted = [...borrowExps].sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));

    borrowRecordsList.innerHTML = sorted.map(e => {
      // Bug 4: Check if this borrow is settled in net settlement.
      // A borrow is settled if no beneficiary still needs to pay this payer in settlement transactions.
      const isSettled = (e.spentFor || []).every(person =>
        !transactions.some(t => t.from === person && t.to === e.spentBy)
      );

      const totalBorrowAmt = e.isBorrow ? (e.amount * (e.spentFor && e.spentFor.length ? e.spentFor.length : 1)) : e.amount;
      const isMulti = e.spentFor && e.spentFor.length > 1;

      return `
      <div class="borrow-card ${isSettled ? 'borrow-card--settled' : ''}">
        <div class="borrow-card-top">
          <div class="borrow-card-payer">
            <div class="avatar" style="width:24px;height:24px;font-size:.65rem">${initials(e.spentBy)}</div>
            <span><strong>${e.spentBy}</strong> paid</span>
          </div>
          <span class="borrow-card-amt">${fmtINR(totalBorrowAmt)}</span>
        </div>
        <div class="borrow-card-mid">
          <div>For: <strong>${(e.spentFor || []).join(', ')}</strong>${isMulti && e.isBorrow ? ` (${fmtINR(e.amount)} each)` : ''}</div>
          <span class="borrow-desc-tag">${e.description || 'Borrow'}</span>
          <span>${fmtDate(e.date)}</span>
        </div>
        <div class="borrow-card-actions">
          ${isSettled
            ? '<span class="borrow-settled-badge">✅ Settled in Net Settlement</span>'
            : `<span class="key-protected-badge">🔒 Secret Key Protected</span>
               <button type="button" class="btn-decrease-borrow" data-exp-id="${e.id}">
                 <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                 Decrease Borrow
               </button>`
          }
        </div>
      </div>`;
    }).join('');

    borrowRecordsList.querySelectorAll('.btn-decrease-borrow').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        openDecreaseBorrowModal(btn.dataset.expId);
      });
    });
  }

  // ─── DECREASE BORROW MODAL (WITH SECRET KEY) ─────────────────────────────────
  function openDecreaseBorrowModal(expId) {
    const exp = expenses.find(x => x.id === expId);
    if (!exp) return;

    const beneficiaries = exp.spentFor || [];
    const isMulti = beneficiaries.length > 1;
    const totalBorrowAmt = exp.isBorrow ? (exp.amount * beneficiaries.length) : exp.amount;

    decBorrowExpId.value = exp.id;
    decBorrowDesc.textContent = exp.description || 'Borrow';
    decBorrowPayer.textContent = `Paid by ${exp.spentBy} for ${beneficiaries.join(', ')}`;
    decBorrowCurrentAmt.textContent = fmtINR(totalBorrowAmt);
    decBorrowKeyInp.value = '';
    decBorrowAmtInp.value = '';
    decBorrowAmtInp.max = exp.amount;
    decBorrowRemainingAmt.textContent = fmtINR(totalBorrowAmt);
    decBorrowKeyErr.classList.remove('show');

    // Show person selector for multi-beneficiary borrows
    if (decBorrowPersonRow) {
      decBorrowPersonRow.style.display = isMulti ? 'block' : 'none';
    }
    if (decBorrowPayerSel && isMulti) {
      const perHead = exp.amount; // each person owes exp.amount
      decBorrowPayerSel.innerHTML = '<option value="">-- Select person --</option>' +
        beneficiaries.map(p => `<option value="${p}">${p} (owes ${fmtINR(perHead)})</option>`).join('');
      decBorrowPayerSel.value = '';
      // Pre-fill amount with per-head share when person is selected
      decBorrowPayerSel.onchange = () => {
        if (decBorrowPayerSel.value) {
          decBorrowAmtInp.value = perHead;
          decBorrowRemainingAmt.textContent = fmtINR(Math.max(0, totalBorrowAmt - perHead));
          if (decBorrowPerHeadHint) decBorrowPerHeadHint.textContent = `Amount owed: ${fmtINR(perHead)}`;
        }
      };
      if (decBorrowPerHeadHint) decBorrowPerHeadHint.textContent = '';
    }

    openModal(modalDecreaseBorrow);
    setTimeout(() => decBorrowKeyInp.focus(), 80);
  }

  if (decBorrowAmtInp) {
    decBorrowAmtInp.addEventListener('input', () => {
      const exp = expenses.find(x => x.id === decBorrowExpId.value);
      if (!exp) return;
      const reduceVal = parseFloat(decBorrowAmtInp.value) || 0;
      const totalBorrowAmt = exp.isBorrow ? (exp.amount * (exp.spentFor ? exp.spentFor.length : 1)) : exp.amount;
      const remaining = Math.max(0, totalBorrowAmt - reduceVal);
      decBorrowRemainingAmt.textContent = fmtINR(remaining);
    });
  }

  if (formDecreaseBorrow) {
    formDecreaseBorrow.addEventListener('submit', async e => {
      e.preventDefault();
      const expId = decBorrowExpId.value;
      const exp = expenses.find(x => x.id === expId);
      if (!exp) return;

      const typedKey = decBorrowKeyInp.value.trim();
      if (!exp.secretKey || typedKey !== exp.secretKey) {
        decBorrowKeyErr.classList.add('show');
        decBorrowKeyInp.focus();
        return;
      }
      decBorrowKeyErr.classList.remove('show');

      const reduceBy = parseFloat(decBorrowAmtInp.value);
      if (isNaN(reduceBy) || reduceBy <= 0) {
        await uiAlert('Invalid Amount', 'Please enter a valid amount greater than 0.', { icon: '⚠️', type: 'danger' });
        return;
      }

      const beneficiaries = exp.spentFor || [];
      const isMulti = beneficiaries.length > 1;
      const selectedPerson = isMulti && decBorrowPayerSel ? decBorrowPayerSel.value : null;

      if (isMulti && !selectedPerson) {
        await uiAlert('Select Person', 'Please select who is paying back their share.', { icon: '⚠️' });
        if (decBorrowPayerSel) decBorrowPayerSel.focus();
        return;
      }

      if (isMulti && selectedPerson) {
        const newSpentFor = exp.spentFor.filter(p => p !== selectedPerson);
        if (newSpentFor.length === 0) {
          expenses = expenses.filter(x => x.id !== expId);
        } else {
          exp.spentFor = newSpentFor;
        }
      } else {
        if (reduceBy >= exp.amount) {
          const ok = await uiConfirm('Remove Borrow?', `Reducing by ₹${reduceBy} will remove this borrow completely.\n\nCurrent amount: ₹${exp.amount}\n\nProceed?`, { icon: '🗑️', confirmLabel: 'Yes, Remove' });
          if (!ok) return;
          expenses = expenses.filter(x => x.id !== expId);
        } else {
          exp.amount = Math.round((exp.amount - reduceBy) * 100) / 100;
        }
      }

      save();
      closeModal(modalDecreaseBorrow);
      renderAll();
    });
  }

  // ─── BORROW FORM SUBMIT ───────────────────────────────────────────────────────
  borrowForm.addEventListener('submit', e => {
    e.preventDefault();

    const spentBy     = getSelectedSpender(spenderGrid);
    const calc        = evalAmount(inpAmount.value);
    if (!isNaN(calc) && calc > 0) {
      inpAmount.value = calc;
    }
    const amount      = calc;
    const spentFor    = Array.from(individualChks.querySelectorAll('input:checked')).map(c => c.value);
    const description = inpDesc.value.trim();
    const date        = inpDate.value || today();
    const secretKey   = borrowSecretKey ? borrowSecretKey.value.trim() : '';

    let err = false;

    if (!spentBy)               { spenderErr.classList.add('show');  err = true; }
    else                         { spenderErr.classList.remove('show'); }

    if (!amount || amount <= 0) { amountErr.classList.add('show');   err = true; }
    else                         { amountErr.classList.remove('show'); }

    // Ensure payer cannot pay or borrow for themselves in Borrow Amount
    const filteredSpentFor = spentFor.filter(p => p !== spentBy);
    if (!filteredSpentFor.length) { spentForErr.classList.add('show'); err = true; }
    else                         { spentForErr.classList.remove('show'); }

    // Secret key is required to protect this borrow
    if (!secretKey) {
      if (secretKeyErr) secretKeyErr.classList.add('show');
      err = true;
    } else {
      if (secretKeyErr) secretKeyErr.classList.remove('show');
    }

    if (err) return;

    expenses.push({
      id: genId(),
      spentBy,
      amount,
      spentFor: filteredSpentFor,
      description: description || 'Borrow',
      date,
      secretKey,
      isBorrow: true,
      createdAt: Date.now()
    });
    save();
    renderAll();
    resetForm();
  });

  // Live division/math hint for borrow amount (e.g. 16000/8 -> = ₹2,000)
  inpAmount.addEventListener('input', () => {
    const val = inpAmount.value.trim();
    if (val.includes('/') || val.includes('*') || val.includes('÷') || val.includes('×') || /[xX]/.test(val) || val.includes('+') || (val.includes('-') && !val.startsWith('-'))) {
      const calc = evalAmount(val);
      if (!isNaN(calc) && calc > 0) {
        if (amountCalcHint) {
          amountCalcHint.textContent = `Calculated: ₹${calc.toLocaleString('en-IN')}`;
          amountCalcHint.style.display = 'block';
        }
      } else if (amountCalcHint) {
        amountCalcHint.style.display = 'none';
      }
    } else if (amountCalcHint) {
      amountCalcHint.style.display = 'none';
    }
  });

  // Auto-replace expression with calculated number when user leaves the field
  inpAmount.addEventListener('blur', () => {
    const val = inpAmount.value.trim();
    if (val.includes('/') || val.includes('*') || val.includes('÷') || val.includes('×') || /[xX]/.test(val) || val.includes('+')) {
      const calc = evalAmount(val);
      if (!isNaN(calc) && calc > 0) {
        inpAmount.value = calc;
        if (amountCalcHint) amountCalcHint.style.display = 'none';
      }
    }
  });

  // ─── RESET FORM (COMPLETE – no persistent spender) ───────────────────────────
  function resetForm() {
    borrowForm.reset();

    // Clear calculation preview
    if (amountCalcHint) {
      amountCalcHint.textContent = '';
      amountCalcHint.style.display = 'none';
    }

    // Deselect all spender cards
    spenderGrid.querySelectorAll('.spender-card').forEach(c => {
      c.classList.remove('selected');
      const r = c.querySelector('input');
      if (r) r.checked = false;
    });

    // Re-render checkboxes with all people eligible again
    renderIndividualCheckboxes();

    // Uncheck Everyone + individual checkboxes
    chkEveryone.checked = false;
    individualChks.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false);

    // Clear secret key
    if (borrowSecretKey) borrowSecretKey.value = '';
    if (secretKeyErr) secretKeyErr.classList.remove('show');
    chkEveryone.checked = false;
    individualChks.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false);

    // Clear chips
    quickChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));

    // Clear errors
    spenderErr.classList.remove('show');
    amountErr.classList.remove('show');
    spentForErr.classList.remove('show');

    // Reset date
    inpDate.value = today();
    updateCounter();
  }

  // ─── QUICK CHIPS ─────────────────────────────────────────────────────────────
  quickChips.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    quickChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    inpDesc.value = chip.dataset.tag;
  });

  // ─── ADD PERSON ───────────────────────────────────────────────────────────────
  btnOpenAddPerson.addEventListener('click', () => {
    inpPersonName.value = '';
    personNameErr.classList.remove('show');
    openModal(modalAddPerson);
    setTimeout(() => inpPersonName.focus(), 80);
  });

  formAddPerson.addEventListener('submit', async e => {
    e.preventDefault();
    const name = inpPersonName.value.trim();
    if (!name) {
      personNameErr.textContent = 'Please enter a name.';
      personNameErr.classList.add('show');
      return;
    }
    if (people.some(p => p.toLowerCase() === name.toLowerCase())) {
      personNameErr.textContent = `"${name}" is already in the trip.`;
      personNameErr.classList.add('show');
      return;
    }

    // Require admin password before adding a new person
    const authorized = await verifyAdminPassword('Add Person', `Enter the admin password to add "${name}" to the trip.`);
    if (!authorized) return;

    people.push(name);

    // If any spendings were marked for "All (including new registers)", auto-add them for this new person
    if (defaultAllSpends && defaultAllSpends.length) {
      defaultAllSpends.forEach(rule => {
        expenses.push({
          id: genId(),
          spentBy: name,
          amount: rule.amount,
          spentFor: [name],
          description: rule.description,
          date: rule.date || today(),
          isSelfSpend: true,
          createdAt: Date.now()
        });
      });
    }

    save();
    closeModal(modalAddPerson);
    renderAll();
  });

  // ─── DELETE PERSON (via × button in existingMembers list) ────────────────────
  existingMembers.addEventListener('click', async e => {
    const btn = e.target.closest('.pill-del');
    if (!btn) return;
    const name = btn.dataset.name;

    // Require admin password before removing a person
    const authorized = await verifyAdminPassword('Remove Person', `Enter the admin password to remove "${name}" from the trip.`);
    if (!authorized) return;

    const ok = await uiConfirm(
      `Remove "${name}"?`,
      `All expenses involving ${name} will also be permanently deleted.\n\nThis action cannot be undone.`,
      { icon: '🗑️', confirmLabel: 'Yes, Remove', type: 'danger' }
    );
    if (!ok) return;
    people = people.filter(p => p !== name);
    expenses = expenses.filter(ex =>
      ex.spentBy !== name &&
      !(Array.isArray(ex.spentFor) && ex.spentFor.includes(name))
    );
    delete redoStacks[name];
    save();
    renderAll();
  });

  // ─── CUSTOM AVERAGE (if elements exist) ───────────────────────────────────────
  if (btnToggleAvg && customAvgRow) {
    btnToggleAvg.addEventListener('click', () => {
      const visible = customAvgRow.style.display === 'flex';
      customAvgRow.style.display = visible ? 'none' : 'flex';
      if (!visible && customAvgInp) {
        customAvgInp.value = customAvg !== null ? customAvg : '';
        customAvgInp.focus();
      }
    });
  }

  if (btnSaveAvg) {
    btnSaveAvg.addEventListener('click', () => {
      const v = parseFloat(customAvgInp.value);
      if (!isNaN(v) && v >= 0) {
        customAvg = v;
        save();
        renderAll();
        if (customAvgRow) customAvgRow.style.display = 'none';
      }
    });
  }

  if (btnResetAvg) {
    btnResetAvg.addEventListener('click', () => {
      customAvg = null;
      if (customAvgInp) customAvgInp.value = '';
      save();
      renderAll();
      if (customAvgRow) customAvgRow.style.display = 'none';
    });
  }

  // ─── EDIT EXPENSE ─────────────────────────────────────────────────────────────
  // Edit is triggered from the Person Detail modal's breakdown entries (via dedicated edit buttons if needed)
  // For now, we keep edit accessible from the breakdown modal (future enhancement: add edit buttons in breakdown rows)
  // For the current design, edit can be called programmatically:
  window.openEditExpense = function(expId) {
    const exp = expenses.find(e => e.id === expId);
    if (!exp) return;

    editId.value  = exp.id;
    editAmt.value = exp.amount;
    editDesc.value = exp.description || '';
    editDate.value = exp.date || today();

    renderSpenderOptions(editSpenderGrid, exp.spentBy, people);

    const isAll = exp.spentFor && exp.spentFor.length === people.length;
    editChkAll.checked = isAll;

    editIndChks.innerHTML = people.map(p => `
      <label class="chk-item">
        <input type="checkbox" name="editSpentFor" value="${p}" ${exp.spentFor && exp.spentFor.includes(p) ? 'checked' : ''} />
        <span class="chk-box"></span>
        <span class="chk-label">${p}</span>
      </label>
    `).join('');

    const updateEditCounter = () => {
      const n = editIndChks.querySelectorAll('input:checked').length;
      editCounter.textContent = `${n} selected`;
      editChkAll.checked = n === people.length && people.length > 0;
    };

    editIndChks.querySelectorAll('input').forEach(c => c.addEventListener('change', updateEditCounter));
    editChkAll.onchange = () => {
      editIndChks.querySelectorAll('input').forEach(c => c.checked = editChkAll.checked);
      updateEditCounter();
    };

    updateEditCounter();
    openModal(modalEdit);
  };

  formEdit.addEventListener('submit', async e => {
    e.preventDefault();
    const exp = expenses.find(e => e.id === editId.value);
    if (!exp) return;

    const checkedSpender = editSpenderGrid.querySelector('input[type="radio"]:checked');
    const spentFor = Array.from(editIndChks.querySelectorAll('input:checked')).map(c => c.value);
    const amount = parseFloat(editAmt.value);

    if (!amount || amount <= 0 || !spentFor.length) {
      await uiAlert('Invalid Input', 'Please enter a valid amount and select at least one person.', { icon: '⚠️', type: 'danger' });
      return;
    }

    exp.spentBy      = checkedSpender ? checkedSpender.value : exp.spentBy;
    exp.amount       = amount;
    exp.spentFor     = spentFor;
    exp.description  = editDesc.value.trim();
    exp.date         = editDate.value;

    save();
    closeModal(modalEdit);
    renderAll();
  });

  // ─── FOOTER ───────────────────────────────────────────────────────────────────
  btnExport.addEventListener('click', () => {
    // Bug 6 fix: strip secretKey from each expense before exporting
    const safeExpenses = expenses.map(({ secretKey: _sk, ...rest }) => rest);
    const data = { exportDate: new Date().toISOString(), people, expenses: safeExpenses };
    const url  = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `tripsplit-${today()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  async function _doClearAll() {
    const pwd = await uiPrompt(
      'Clear All Data',
      'Enter the admin password to permanently delete all trip data.',
      { icon: '🗑️', inputType: 'password', placeholder: 'Password…', submitLabel: 'Clear Data' }
    );
    if (pwd === null) return; // cancelled
    if (pwd === ADMIN_PASSWORD) {
      people = []; expenses = []; customAvg = null; redoStacks = {}; defaultAllSpends = [];
      localStorage.clear();
      save();
      renderAll();
      resetForm();
      await uiAlert('Data Cleared', 'All site data has been reset and cleared successfully!', { icon: '✅', type: 'success' });
    } else {
      await uiAlert('Wrong Password', 'Incorrect password! Data was not cleared.', { icon: '🔒', type: 'danger' });
    }
  }

  btnClearAll.addEventListener('click', () => _doClearAll());
  btnClearTop.addEventListener('click', () => _doClearAll());

  // ─── BULK PERSONAL SPEND (⚡ Add for All) ────────────────────────────────────
  function updateScopeCards(selectedVal) {
    if (scopeCardExisting) {
      const isSel = selectedVal === 'existing';
      scopeCardExisting.style.borderColor = isSel ? 'var(--blue)' : 'var(--border)';
      scopeCardExisting.style.background  = isSel ? 'var(--blue-s)' : '#fff';
      const r = scopeCardExisting.querySelector('input');
      if (r) r.checked = isSel;
    }
    if (scopeCardAllNew) {
      const isSel = selectedVal === 'all_and_new';
      scopeCardAllNew.style.borderColor = isSel ? 'var(--blue)' : 'var(--border)';
      scopeCardAllNew.style.background  = isSel ? 'var(--blue-s)' : '#fff';
      const r = scopeCardAllNew.querySelector('input');
      if (r) r.checked = isSel;
    }
  }

  if (scopeCardExisting) {
    scopeCardExisting.addEventListener('click', e => {
      updateScopeCards('existing');
    });
  }
  if (scopeCardAllNew) {
    scopeCardAllNew.addEventListener('click', e => {
      updateScopeCards('all_and_new');
    });
  }

  if (btnBulkSpend) {
    btnBulkSpend.addEventListener('click', () => {
      if (bulkMemberTags) {
        bulkMemberTags.innerHTML = people.length
          ? people.map(p => `<span class="pill">${p}</span>`).join('')
          : '<span style="color:var(--light)">No members yet. Will apply to new registers.</span>';
      }
      if (bulkAmount) bulkAmount.value = '';
      if (bulkDesc)   bulkDesc.value = '';
      if (bulkSpendDate) bulkSpendDate.value = today();
      if (bulkCalcHint) {
        bulkCalcHint.textContent = '';
        bulkCalcHint.style.display = 'none';
      }
      updateScopeCards(people.length === 0 ? 'all_and_new' : 'existing');
      openModal(modalBulkSpend);
      if (bulkAmount) setTimeout(() => bulkAmount.focus(), 80);
    });
  }

  // Live division/math hint for bulk spend amount
  if (bulkAmount) {
    bulkAmount.addEventListener('input', () => {
      const val = bulkAmount.value.trim();
      if (val.includes('/') || val.includes('*') || val.includes('÷') || val.includes('×') || /[xX]/.test(val) || val.includes('+') || (val.includes('-') && !val.startsWith('-'))) {
        const calc = evalAmount(val);
        if (!isNaN(calc) && calc > 0) {
          if (bulkCalcHint) {
            bulkCalcHint.textContent = `Calculated: ₹${calc.toLocaleString('en-IN')}`;
            bulkCalcHint.style.display = 'block';
          }
        } else if (bulkCalcHint) {
          bulkCalcHint.style.display = 'none';
        }
      } else if (bulkCalcHint) {
        bulkCalcHint.style.display = 'none';
      }
    });

    bulkAmount.addEventListener('blur', () => {
      const val = bulkAmount.value.trim();
      if (val.includes('/') || val.includes('*') || val.includes('÷') || val.includes('×') || /[xX]/.test(val) || val.includes('+')) {
        const calc = evalAmount(val);
        if (!isNaN(calc) && calc > 0) {
          bulkAmount.value = calc;
          if (bulkCalcHint) bulkCalcHint.style.display = 'none';
        }
      }
    });
  }

  if (formBulkSpend) {
    formBulkSpend.addEventListener('submit', async e => {
      e.preventDefault();
      const amount = evalAmount(bulkAmount.value);
      const desc   = bulkDesc.value.trim();
      const date   = bulkSpendDate.value || today();
      const scopeRadio = formBulkSpend.querySelector('input[name="bulkTargetScope"]:checked');
      const applyToFuture = scopeRadio ? scopeRadio.value === 'all_and_new' : false;

      if (!amount || amount <= 0) {
        await uiAlert('Invalid Amount', 'Please enter a valid amount greater than 0 (e.g. 16000/8 or 500).', { icon: '⚠️', type: 'danger' });
        bulkAmount.focus();
        return;
      }

      if (!desc) {
        await uiAlert('Missing Reason', 'Please enter a reason or description for this spending.', { icon: '⚠️' });
        bulkDesc.focus();
        return;
      }

      // Add personal spend for each existing trip member
      people.forEach(p => {
        expenses.push({
          id: genId(),
          spentBy: p,
          amount,
          spentFor: [p],
          description: desc,
          date,
          isSelfSpend: true,
          createdAt: Date.now()
        });
      });

      // If user selected "All members (existing + auto-add to new registers)", save rule for future registers
      if (applyToFuture) {
        defaultAllSpends.push({
          amount,
          description: desc,
          date
        });
      }

      save();
      closeModal(modalBulkSpend);
      renderAll();
    });
  }

  // ─── MODAL HELPERS ────────────────────────────────────────────────────────────
  function openModal(modal)  { if (modal) { modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); } }
  function closeModal(modal) { if (modal) { modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); } }

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(document.getElementById(btn.dataset.close)));
  });

  document.querySelectorAll('.modal-bg').forEach(bg => {
    bg.addEventListener('click', e => { if (e.target === bg) closeModal(bg); });
  });

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.querySelectorAll('.modal-bg.open').forEach(closeModal);
  });

  // ─── INIT ─────────────────────────────────────────────────────────────────────
  async function init() {
    // 1) Load from localStorage first (instant, works offline)
    load();
    inpDate.value = today();
    renderAll();
    renderIndividualCheckboxes();

    // 2) Try to load from server — server always wins (shared source of truth)
    await loadFromServer(false);

    // 3) Poll every 8 seconds to catch updates from other devices
    setInterval(() => loadFromServer(false), 8000);

    // 4) Register Service Worker for offline capability
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
