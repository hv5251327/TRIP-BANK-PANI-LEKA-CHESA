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
  const SK_PEOPLE   = 'ts_people_v2';
  const SK_EXPENSES = 'ts_expenses_v2';
  const SK_AVGOVER  = 'ts_avgover_v2';

  // ─── STATE ───────────────────────────────────────────────────────────────────
  let people   = [];
  let expenses = [];
  let customAvg = null;  // null = auto-calculated

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
  const chkEveryone       = $('chkEveryone');
  const individualChks    = $('individualChks');
  const spentForCounter   = $('spentForCounter');
  const inpDesc           = $('inpDesc');
  const inpDate           = $('inpDate');
  const quickChips        = $('quickChips');
  const spenderErr        = $('spenderErr');
  const amountErr         = $('amountErr');
  const spentForErr       = $('spentForErr');

  // Spend Amount
  const personCards       = $('personCards');

  // Final Settlement
  const settlementList    = $('settlementList');

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

  // ─── UTILS ───────────────────────────────────────────────────────────────────
  const fmtINR = v => {
    const n = Number(v) || 0;
    return '₹' + n.toLocaleString('en-IN', {
      minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
      maximumFractionDigits: 2
    });
  };

  const initials = name => (name || '?').trim()[0].toUpperCase();
  const genId    = () => 'exp_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
  const today    = () => new Date().toISOString().split('T')[0];
  const fmtDate  = s => {
    if (!s) return '';
    const [y,m,d] = s.split('-');
    return new Date(y, m-1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  // ─── PERSISTENCE ─────────────────────────────────────────────────────────────
  function load() {
    try {
      people   = JSON.parse(localStorage.getItem(SK_PEOPLE))   || [];
      expenses = JSON.parse(localStorage.getItem(SK_EXPENSES)) || [];
      const ca = localStorage.getItem(SK_AVGOVER);
      customAvg = ca !== null ? parseFloat(ca) : null;
    } catch {
      people = []; expenses = []; customAvg = null;
    }
  }

  function save() {
    localStorage.setItem(SK_PEOPLE,   JSON.stringify(people));
    localStorage.setItem(SK_EXPENSES, JSON.stringify(expenses));
    if (customAvg !== null) localStorage.setItem(SK_AVGOVER, customAvg);
    else localStorage.removeItem(SK_AVGOVER);
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
    const totalSpend = expenses.reduce((s, e) => s + (Number(e.amount)||0), 0);
    const n = people.length || 1;
    const autoAvg = totalSpend / n;

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

      const perHead = amount / cnt;

      // Credit payer
      if (stats[payer]) stats[payer].totalPaid += amount;

      // Debit each beneficiary
      bens.forEach(b => {
        if (!stats[b]) return;
        stats[b].share += perHead;
        forPerson[b].push({
          id:      exp.id,
          desc:    exp.description || 'Expense',
          date:    exp.date,
          share:   perHead,
          paidBy:  payer,
          amount:  amount,
          spentFor: exp.spentFor
        });
      });
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

    return { totalSpend, autoAvg, stats, forPerson, transactions };
  }

  // ─── RENDER ALL ──────────────────────────────────────────────────────────────
  function renderAll() {
    const data = calculate();
    renderTopMetrics(data);
    renderSpenderOptions(spenderGrid, getSelectedSpender(spenderGrid), people);
    renderIndividualCheckboxes();
    renderPersonCards(data);
    renderSettlement(data);
  }

  // ─── TOP METRICS ─────────────────────────────────────────────────────────────
  function renderTopMetrics({ totalSpend, autoAvg }) {
    elTotalSpending.textContent = fmtINR(totalSpend);
    elExpCount.textContent = `${expenses.length} ${expenses.length === 1 ? 'expense' : 'expenses'}`;
    elPeopleCount.textContent  = people.length;

    const effectiveAvg = customAvg !== null ? customAvg : autoAvg;
    elAvgPerPerson.innerHTML = `${fmtINR(effectiveAvg)} <span class="per-person">/ person</span>`;

    if (customAvg !== null) {
      elAvgFormula.innerHTML = `<span style="color:#92400e;font-weight:600">Custom target</span> (Auto: ${fmtINR(autoAvg)})`;
    } else {
      elAvgFormula.textContent = 'Total ÷ People';
    }

    // Member pills
    elMemberPills.innerHTML = people.map(p => `<span class="pill">${p}</span>`).join('');

    // Existing members hint in modal
    if (existingMembers) {
      existingMembers.innerHTML = people.length
        ? 'Current members: ' + people.map(p => `<span class="pill">${p}</span>`).join('')
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
            <div class="pcard-header-right">
              <form class="quick-spend" data-person="${person}">
                <div class="qs-wrap">
                  <span class="qs-sym">₹</span>
                  <input
                    type="number"
                    class="qs-input"
                    placeholder="Self spend…"
                    min="1"
                    step="any"
                    title="Quick: add a personal expense for ${person}"
                  />
                </div>
                <button type="submit" class="qs-btn" title="Add">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><polyline points="20 6 9 17 4 12"/></svg>
                </button>
              </form>
              <button type="button" class="btn-undo-person" data-person="${person}" title="Undo previous spending for ${person}">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
                Undo
              </button>
              <span class="pcard-balance-chip ${chipClass}">${chipText}</span>
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
    personCards.querySelectorAll('.quick-spend').forEach(form => {
      const person = form.dataset.person;
      const inp    = form.querySelector('.qs-input');
      const btn    = form.querySelector('.qs-btn');

      form.addEventListener('submit', e => {
        e.preventDefault();
        e.stopPropagation();
        const amount = parseFloat(inp.value);
        if (!amount || amount <= 0) {
          inp.classList.add('qs-error');
          inp.focus();
          setTimeout(() => inp.classList.remove('qs-error'), 900);
          return;
        }
        // Save: spentBy = person, spentFor = [person] (personal expense)
        expenses.push({
          id: genId(),
          spentBy: person,
          amount,
          spentFor: [person],
          description: 'Personal',
          date: today(),
          createdAt: Date.now()
        });
        save();
        inp.value = '';
        btn.classList.add('qs-ok');
        setTimeout(() => btn.classList.remove('qs-ok'), 800);
        renderAll();
      });

      // Prevent card click bubbling when clicking inside quick-spend form
      form.addEventListener('click', e => e.stopPropagation());
    });

    // ── Undo previous spending for this person
    personCards.querySelectorAll('.btn-undo-person').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const person = btn.dataset.person;
        // Find latest expense involving this person (paid by them or spent for them)
        let targetIdx = -1;
        for (let i = expenses.length - 1; i >= 0; i--) {
          const exp = expenses[i];
          if (exp.spentBy === person || (exp.spentFor && exp.spentFor.includes(person))) {
            targetIdx = i;
            break;
          }
        }

        if (targetIdx === -1) {
          alert(`No previous spendings found to undo for ${person}.`);
          return;
        }

        expenses.splice(targetIdx, 1);
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
  function renderSettlement({ transactions }) {
    if (!transactions.length) {
      settlementList.innerHTML = '<div class="settle-empty">All settled up once you add expenses.</div>';
      return;
    }
    settlementList.innerHTML = transactions.map(t => `
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
      const rows = exps.map(e => `
        <div class="bkrow">
          <div class="bkrow-left">
            <span class="bkrow-desc">${e.desc}</span>
            <span class="bkrow-meta">
              Paid by <strong>${e.paidBy}</strong> • 
              ${e.spentFor && e.spentFor.length > 1 ? `Split ${e.spentFor.length} ways (₹${(e.amount/e.spentFor.length).toFixed(2)} each)` : 'Full amount'} •
              ${fmtDate(e.date)}
            </span>
          </div>
          <div class="bkrow-right">
            <span class="bkrow-amt">${fmtINR(e.share)}</span>
            <button type="button" class="btn-decrease-amt" data-exp-id="${e.id}" data-person="${person}" title="Decrease this expenditure">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Decrease
            </button>
          </div>
        </div>
      `).join('');

      const totalRow = `
        <div class="bkrow bkrow-total">
          <div class="bkrow-left">
            <span class="bkrow-desc">Total Share for ${person}</span>
          </div>
          <span class="bkrow-amt">${fmtINR(stat.share)}</span>
        </div>
      `;

      dBreakdownList.innerHTML = rows + totalRow;

      // Event listener for decreasing expenditure amount
      dBreakdownList.querySelectorAll('.btn-decrease-amt').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const expId = btn.dataset.expId;
          const forPersonName = btn.dataset.person;
          const exp = expenses.find(x => x.id === expId);
          if (!exp) return;

          const currentAmt = exp.amount;
          const isSplit = exp.spentFor && exp.spentFor.length > 1;
          const shareText = isSplit ? ` (share: ₹${(exp.amount / exp.spentFor.length).toFixed(2)})` : '';
          const inputVal = prompt(`Decrease amount for "${exp.description || 'Expense'}" (Current total: ₹${currentAmt}${shareText}):\nEnter amount to reduce by (₹):`);
          if (inputVal === null) return;

          const reduceBy = parseFloat(inputVal);
          if (isNaN(reduceBy) || reduceBy <= 0) {
            alert('Please enter a valid amount greater than 0.');
            return;
          }

          if (reduceBy >= currentAmt) {
            if (confirm(`Reducing by ₹${reduceBy} will remove this expense completely (Current: ₹${currentAmt}). Proceed?`)) {
              expenses = expenses.filter(x => x.id !== expId);
            } else {
              return;
            }
          } else {
            exp.amount = Math.round((currentAmt - reduceBy) * 100) / 100;
          }

          save();
          renderAll();
          openDetailModal(forPersonName, calculate());
        });
      });
    }

    openModal(modalPersonDetail);
  }

  // ─── BORROW FORM SUBMIT ───────────────────────────────────────────────────────
  borrowForm.addEventListener('submit', e => {
    e.preventDefault();

    const spentBy    = getSelectedSpender(spenderGrid);
    const amount     = parseFloat(inpAmount.value);
    const spentFor   = Array.from(individualChks.querySelectorAll('input:checked')).map(c => c.value);
    const description = inpDesc.value.trim();
    const date       = inpDate.value || today();

    let err = false;

    if (!spentBy)               { spenderErr.classList.add('show');  err = true; }
    else                         { spenderErr.classList.remove('show'); }

    if (!amount || amount <= 0) { amountErr.classList.add('show');   err = true; }
    else                         { amountErr.classList.remove('show'); }

    // Ensure payer cannot pay or borrow for themselves in Borrow Amount
    const filteredSpentFor = spentFor.filter(p => p !== spentBy);
    if (!filteredSpentFor.length) { spentForErr.classList.add('show'); err = true; }
    else                         { spentForErr.classList.remove('show'); }

    if (err) return;

    expenses.push({ id: genId(), spentBy, amount, spentFor: filteredSpentFor, description, date, createdAt: Date.now() });
    save();
    renderAll();
    resetForm();
  });

  // ─── RESET FORM (COMPLETE – no persistent spender) ───────────────────────────
  function resetForm() {
    borrowForm.reset();

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

  formAddPerson.addEventListener('submit', e => {
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
    people.push(name);
    save();
    closeModal(modalAddPerson);
    renderAll();
  });

  // ─── CUSTOM AVERAGE ───────────────────────────────────────────────────────────
  btnToggleAvg.addEventListener('click', () => {
    const visible = customAvgRow.style.display === 'flex';
    customAvgRow.style.display = visible ? 'none' : 'flex';
    if (!visible) {
      customAvgInp.value = customAvg !== null ? customAvg : '';
      customAvgInp.focus();
    }
  });

  btnSaveAvg.addEventListener('click', () => {
    const v = parseFloat(customAvgInp.value);
    if (!isNaN(v) && v >= 0) {
      customAvg = v;
      save();
      renderAll();
      customAvgRow.style.display = 'none';
    }
  });

  btnResetAvg.addEventListener('click', () => {
    customAvg = null;
    customAvgInp.value = '';
    save();
    renderAll();
    customAvgRow.style.display = 'none';
  });

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

  formEdit.addEventListener('submit', e => {
    e.preventDefault();
    const exp = expenses.find(e => e.id === editId.value);
    if (!exp) return;

    const checkedSpender = editSpenderGrid.querySelector('input[type="radio"]:checked');
    const spentFor = Array.from(editIndChks.querySelectorAll('input:checked')).map(c => c.value);
    const amount = parseFloat(editAmt.value);

    if (!amount || amount <= 0 || !spentFor.length) {
      alert('Please enter a valid amount and select at least one person.');
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
    const data = { exportDate: new Date().toISOString(), people, expenses };
    const url  = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `tripsplit-${today()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  btnClearAll.addEventListener('click', () => {
    const pwd = prompt('Enter password to clear and reset all data in site:');
    if (pwd === null) return; // User pressed Cancel
    if (pwd === 'mingutha') {
      people = [];
      expenses = [];
      customAvg = null;
      localStorage.clear();
      save();
      renderAll();
      resetForm();
      alert('All site data has been reset and cleared successfully!');
    } else {
      alert('Incorrect password! Data was not cleared.');
    }
  });

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
  function init() {
    load();
    inpDate.value = today();
    renderAll();
    // Don't reset form on init - just ensure it's in clean state
    renderIndividualCheckboxes();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
