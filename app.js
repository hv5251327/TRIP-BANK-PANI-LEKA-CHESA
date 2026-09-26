/**
 * TripSplit - Trip Expense Sharing & Settlement Engine
 * Pure Vanilla JavaScript ES6+ with LocalStorage Persistence
 */

(function () {
  'use strict';

  // ================= STORAGE KEYS & INITIAL STATE =================
  const STORAGE_KEY_PEOPLE = 'tripsplit_people_v1';
  const STORAGE_KEY_EXPENSES = 'tripsplit_expenses_v1';
  const STORAGE_KEY_CUSTOM_AVG = 'tripsplit_custom_avg_v1';

  // Default demo data as per prompt specifications
  const DEFAULT_PEOPLE = ['Rahul', 'Amit', 'Priya', 'Arjun'];
  
  const DEFAULT_EXPENSES = [
    {
      id: 'exp-demo-1',
      spentBy: 'Rahul',
      amount: 1000,
      spentFor: ['Rahul', 'Amit', 'Priya'],
      description: 'Dinner',
      date: new Date().toISOString().split('T')[0],
      createdAt: Date.now() - 3600000
    }
  ];

  // App State
  let people = [];
  let expenses = [];
  let customAverageOverride = null;

  // DOM Elements
  const displayTotalSpending = document.getElementById('displayTotalSpending');
  const displayAveragePerPerson = document.getElementById('displayAveragePerPerson');
  const averageFormulaDetail = document.getElementById('averageFormulaDetail');
  const displayPeopleCount = document.getElementById('displayPeopleCount');
  const displayTotalExpensesCount = document.getElementById('displayTotalExpensesCount');
  const peopleQuickPills = document.getElementById('peopleQuickPills');

  // Custom Average Elements
  const btnToggleCustomAvg = document.getElementById('btnToggleCustomAvg');
  const customAvgRow = document.getElementById('customAvgRow');
  const customAvgInput = document.getElementById('customAvgInput');
  const btnSaveCustomAvg = document.getElementById('btnSaveCustomAvg');
  const btnResetCustomAvg = document.getElementById('btnResetCustomAvg');

  // Borrow Form Elements
  const borrowForm = document.getElementById('borrowForm');
  const spenderSelector = document.getElementById('spenderSelector');
  const expenseAmountInput = document.getElementById('expenseAmount');
  const chkEveryone = document.getElementById('chkEveryone');
  const individualCheckboxes = document.getElementById('individualCheckboxes');
  const selectionCounter = document.getElementById('selectionCounter');
  const expenseDescriptionInput = document.getElementById('expenseDescription');
  const expenseDateInput = document.getElementById('expenseDate');
  const quickTags = document.getElementById('quickTags');
  const spenderError = document.getElementById('spenderError');
  const amountError = document.getElementById('amountError');
  const spentForError = document.getElementById('spentForError');

  // Spend Amount & Settlement Elements
  const personCardsGrid = document.getElementById('personCardsGrid');
  const giveList = document.getElementById('giveList');
  const receiveList = document.getElementById('receiveList');
  const finalSettlementList = document.getElementById('finalSettlementList');
  const expenseHistoryList = document.getElementById('expenseHistoryList');
  const historyCountBadge = document.getElementById('historyCountBadge');

  // Modals & Controls
  const btnOpenAddPerson = document.getElementById('btnOpenAddPerson');
  const modalAddPerson = document.getElementById('modalAddPerson');
  const formAddPerson = document.getElementById('formAddPerson');
  const newPersonNameInput = document.getElementById('newPersonName');
  const personNameError = document.getElementById('personNameError');
  const currentMembersPillList = document.getElementById('currentMembersPillList');

  const modalPersonDetails = document.getElementById('modalPersonDetails');
  const detailPersonAvatar = document.getElementById('detailPersonAvatar');
  const detailPersonName = document.getElementById('detailPersonName');
  const detailTotalPaid = document.getElementById('detailTotalPaid');
  const detailPersonalShare = document.getElementById('detailPersonalShare');
  const detailPaidForOthers = document.getElementById('detailPaidForOthers');
  const detailOthersPaidFor = document.getElementById('detailOthersPaidFor');
  const detailFinalBalance = document.getElementById('detailFinalBalance');
  const detailBalanceBanner = document.getElementById('detailBalanceBanner');
  const detailExpensesTableBody = document.getElementById('detailExpensesTableBody');
  const detailTableTitle = document.getElementById('detailTableTitle');

  const modalEditExpense = document.getElementById('modalEditExpense');
  const formEditExpense = document.getElementById('formEditExpense');
  const editExpenseId = document.getElementById('editExpenseId');
  const editSpenderSelector = document.getElementById('editSpenderSelector');
  const editExpenseAmount = document.getElementById('editExpenseAmount');
  const editChkEveryone = document.getElementById('editChkEveryone');
  const editIndividualCheckboxes = document.getElementById('editIndividualCheckboxes');
  const editSelectionCounter = document.getElementById('editSelectionCounter');
  const editExpenseDescription = document.getElementById('editExpenseDescription');
  const editExpenseDate = document.getElementById('editExpenseDate');

  const btnResetDemo = document.getElementById('btnResetDemo');
  const btnClearAll = document.getElementById('btnClearAll');
  const btnExportData = document.getElementById('btnExportData');

  // ================= UTILITY HELPERS =================
  function formatINR(number) {
    const val = Number(number) || 0;
    // Format to Indian Rupee with standard 2 decimal places when needed
    return '₹' + val.toLocaleString('en-IN', {
      minimumFractionDigits: Number.isInteger(val) ? 0 : 2,
      maximumFractionDigits: 2
    });
  }

  function getInitials(name) {
    if (!name) return '?';
    return name.trim().charAt(0).toUpperCase();
  }

  function generateId() {
    return 'exp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  }

  function formatDateFriendly(dateStr) {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      }
    } catch (e) {
      // fallback
    }
    return dateStr;
  }

  // ================= STORAGE MANAGEMENT =================
  function loadState() {
    try {
      const storedPeople = localStorage.getItem(STORAGE_KEY_PEOPLE);
      const storedExpenses = localStorage.getItem(STORAGE_KEY_EXPENSES);
      const storedCustomAvg = localStorage.getItem(STORAGE_KEY_CUSTOM_AVG);

      people = storedPeople ? JSON.parse(storedPeople) : [...DEFAULT_PEOPLE];
      expenses = storedExpenses ? JSON.parse(storedExpenses) : JSON.parse(JSON.stringify(DEFAULT_EXPENSES));
      customAverageOverride = storedCustomAvg ? parseFloat(storedCustomAvg) : null;
    } catch (err) {
      console.warn('Failed to parse localStorage data, restoring defaults', err);
      people = [...DEFAULT_PEOPLE];
      expenses = JSON.parse(JSON.stringify(DEFAULT_EXPENSES));
      customAverageOverride = null;
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY_PEOPLE, JSON.stringify(people));
    localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(expenses));
    if (customAverageOverride !== null) {
      localStorage.setItem(STORAGE_KEY_CUSTOM_AVG, customAverageOverride.toString());
    } else {
      localStorage.removeItem(STORAGE_KEY_CUSTOM_AVG);
    }
  }

  // ================= CORE EXPENSE & DEBT CALCULATION LOGIC =================
  /**
   * Calculates all metrics per person:
   * 1. Total Paid: sum of all expenses where person was the payer
   * 2. Personal Share: sum of (expense.amount / expense.spentFor.length) for each expense where person was in spentFor
   * 3. Paid For Others: Total Paid - (Share of payer in their own paid expenses)
   * 4. Others Paid For [Person]: Personal Share - (Share paid by themselves)
   * 5. Balance = Total Paid - Personal Share
   *    - Positive: money to receive
   *    - Negative: money to give
   */
  function calculateTripStats() {
    const stats = {};
    const totalSpending = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
    const peopleCount = people.length || 1;
    const autoAverage = totalSpending / peopleCount;

    // Initialize stats map for all people
    people.forEach(p => {
      stats[p] = {
        name: p,
        totalPaid: 0,
        personalShare: 0,
        paidForOthers: 0,
        othersPaidForMe: 0,
        balance: 0,
        expensesPaid: []
      };
    });

    // Pairwise debt matrix: pairwiseDebts[A][B] = amount A owes B directly
    const pairwiseDebts = {};
    people.forEach(p1 => {
      pairwiseDebts[p1] = {};
      people.forEach(p2 => {
        pairwiseDebts[p1][p2] = 0;
      });
    });

    // Accumulate each expense
    expenses.forEach(exp => {
      const payer = exp.spentBy;
      const amount = Number(exp.amount) || 0;
      const beneficiaries = exp.spentFor || [];
      const count = beneficiaries.length;

      if (!stats[payer]) {
        // If payer was deleted from people, ensure key exists
        stats[payer] = {
          name: payer,
          totalPaid: 0,
          personalShare: 0,
          paidForOthers: 0,
          othersPaidForMe: 0,
          balance: 0,
          expensesPaid: []
        };
        pairwiseDebts[payer] = {};
        people.forEach(p => pairwiseDebts[payer][p] = 0);
      }

      stats[payer].totalPaid += amount;
      stats[payer].expensesPaid.push(exp);

      if (count > 0) {
        const individualShare = amount / count;

        beneficiaries.forEach(beneficiary => {
          if (!stats[beneficiary]) return;
          stats[beneficiary].personalShare += individualShare;

          if (beneficiary === payer) {
            // Payer consumed their own money: neither paid for others nor others paid for them
          } else {
            // Beneficiary owes the payer
            stats[payer].paidForOthers += individualShare;
            stats[beneficiary].othersPaidForMe += individualShare;
            if (pairwiseDebts[beneficiary] && pairwiseDebts[beneficiary][payer] !== undefined) {
              pairwiseDebts[beneficiary][payer] += individualShare;
            }
          }
        });
      }
    });

    // Compute net balance per person
    people.forEach(p => {
      const s = stats[p];
      if (s) {
        s.balance = s.totalPaid - s.personalShare;
      }
    });

    // Simplify pairwise net debts: netDebt(A, B) = pairwiseDebts[A][B] - pairwiseDebts[B][A]
    // If netDebt(A, B) > 0, A owes B that amount.
    const directDebts = [];
    const processedPairs = new Set();

    people.forEach(p1 => {
      people.forEach(p2 => {
        if (p1 === p2) return;
        const pairKey = [p1, p2].sort().join(':::');
        if (processedPairs.has(pairKey)) return;
        processedPairs.add(pairKey);

        const p1OwesP2 = (pairwiseDebts[p1] && pairwiseDebts[p1][p2]) || 0;
        const p2OwesP1 = (pairwiseDebts[p2] && pairwiseDebts[p2][p1]) || 0;
        const net = p1OwesP2 - p2OwesP1;

        if (net > 0.009) {
          directDebts.push({ from: p1, to: p2, amount: net });
        } else if (net < -0.009) {
          directDebts.push({ from: p2, to: p1, amount: Math.abs(net) });
        }
      });
    });

    // Compute optimal simplified settlement transactions using greedy balance matching
    const settlementTransactions = computeSimplifiedSettlement(stats);

    return {
      totalSpending,
      peopleCount,
      autoAverage,
      effectiveAverage: customAverageOverride !== null ? customAverageOverride : autoAverage,
      stats,
      directDebts,
      settlementTransactions
    };
  }

  /**
   * Greedy minimum cash flow settlement algorithm.
   * Matches the largest debtor with the largest creditor until all balances are within 1 cent.
   */
  function computeSimplifiedSettlement(stats) {
    const debtors = [];
    const creditors = [];

    people.forEach(p => {
      const net = stats[p] ? stats[p].balance : 0;
      if (net < -0.01) {
        debtors.push({ name: p, amount: -net });
      } else if (net > 0.01) {
        creditors.push({ name: p, amount: net });
      }
    });

    // Sort descending
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const transactions = [];
    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const settleAmount = Math.min(debtor.amount, creditor.amount);

      if (settleAmount > 0.009) {
        transactions.push({
          from: debtor.name,
          to: creditor.name,
          amount: settleAmount
        });
      }

      debtor.amount -= settleAmount;
      creditor.amount -= settleAmount;

      if (debtor.amount <= 0.01) i++;
      if (creditor.amount <= 0.01) j++;
    }

    return transactions;
  }

  // ================= UI RENDERING =================

  function renderAll() {
    const data = calculateTripStats();

    renderTopSection(data);
    renderBorrowSpenderOptions();
    renderBorrowSpentForCheckboxes();
    renderSpendAmountCards(data);
    renderDirections(data);
    renderFinalSettlement(data);
    renderExpenseHistory();
  }

  function renderTopSection(data) {
    displayTotalSpending.textContent = formatINR(data.totalSpending);
    displayTotalExpensesCount.textContent = `${expenses.length} ${expenses.length === 1 ? 'expense' : 'expenses'} recorded`;
    
    displayPeopleCount.textContent = data.peopleCount;

    // Average per person
    displayAveragePerPerson.innerHTML = `${formatINR(data.effectiveAverage)} <span class="unit">/ person</span>`;
    
    if (customAverageOverride !== null) {
      averageFormulaDetail.innerHTML = `<span class="badge-fresh">Custom Target</span> (Actual: ${formatINR(data.autoAverage)})`;
    } else {
      averageFormulaDetail.textContent = 'Total Trip Spending ÷ Number of People';
    }

    // Quick member pills
    peopleQuickPills.innerHTML = people.map(p => `
      <span class="person-pill">${p}</span>
    `).join('');

    // Modal current members hint
    if (currentMembersPillList) {
      currentMembersPillList.innerHTML = people.map(p => `
        <span class="person-pill">${p}</span>
      `).join(' ');
    }
  }

  // Render "Spent By" radio buttons/cards
  function renderBorrowSpenderOptions() {
    const selectedSpender = getSelectedSpender();
    
    if (people.length === 0) {
      spenderSelector.innerHTML = '<div class="empty-state-sm">No members added yet. Click "+ Add Person" above.</div>';
      return;
    }

    spenderSelector.innerHTML = people.map(person => {
      const isSelected = selectedSpender === person;
      return `
        <label class="spender-card ${isSelected ? 'selected' : ''}" data-name="${person}">
          <input type="radio" name="spentByPerson" value="${person}" ${isSelected ? 'checked' : ''} />
          <div class="person-avatar">${getInitials(person)}</div>
          <span class="spender-name">${person}</span>
          <span class="radio-check-circle"></span>
        </label>
      `;
    }).join('');

    // Add click listeners to spender cards
    spenderSelector.querySelectorAll('.spender-card').forEach(card => {
      card.addEventListener('click', () => {
        spenderSelector.querySelectorAll('.spender-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        const radio = card.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
        spenderError.classList.remove('show');
      });
    });
  }

  function getSelectedSpender() {
    const checked = spenderSelector.querySelector('input[name="spentByPerson"]:checked');
    return checked ? checked.value : null;
  }

  // Render "Spent For" checkboxes
  function renderBorrowSpentForCheckboxes() {
    if (people.length === 0) {
      individualCheckboxes.innerHTML = '<div class="empty-state-sm">No members added yet.</div>';
      return;
    }

    // Remember currently checked people if re-rendering
    const currentChecked = Array.from(individualCheckboxes.querySelectorAll('input[type="checkbox"]:checked')).map(c => c.value);

    individualCheckboxes.innerHTML = people.map(person => {
      const isChecked = currentChecked.includes(person);
      return `
        <label class="checkbox-item">
          <input type="checkbox" name="spentForPerson" value="${person}" ${isChecked ? 'checked' : ''} />
          <span class="custom-checkbox"></span>
          <span class="checkbox-text">${person}</span>
        </label>
      `;
    }).join('');

    // Setup event listeners for individual checkboxes
    const checkboxes = individualCheckboxes.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
      cb.addEventListener('change', () => {
        syncEveryoneCheckbox();
        updateSelectionCounter();
        spentForError.classList.remove('show');
      });
    });

    syncEveryoneCheckbox();
    updateSelectionCounter();
  }

  function syncEveryoneCheckbox() {
    const individualCbs = individualCheckboxes.querySelectorAll('input[type="checkbox"]');
    if (individualCbs.length === 0) {
      chkEveryone.checked = false;
      return;
    }
    const allChecked = Array.from(individualCbs).every(cb => cb.checked);
    chkEveryone.checked = allChecked;
  }

  function updateSelectionCounter() {
    const count = individualCheckboxes.querySelectorAll('input[type="checkbox"]:checked').length;
    selectionCounter.textContent = `${count} ${count === 1 ? 'person' : 'people'} selected`;
  }

  // Handle "Everyone" checkbox toggle
  if (chkEveryone) {
    chkEveryone.addEventListener('change', () => {
      const checked = chkEveryone.checked;
      const cbs = individualCheckboxes.querySelectorAll('input[type="checkbox"]');
      cbs.forEach(cb => cb.checked = checked);
      updateSelectionCounter();
      if (checked) spentForError.classList.remove('show');
    });
  }

  // ================= 8 & 19. RESET BORROW FORM COMPLETELY =================
  /**
   * Resets the Borrow Amount form completely.
   * - Deselects the Spent By person
   * - Clears the amount
   * - Unchecks all Spent For checkboxes (including Everyone)
   * - Clears description & tag chips
   * - NO persistent selected spender!
   */
  function resetBorrowForm() {
    borrowForm.reset();
    
    // Deselect all Spent By cards
    spenderSelector.querySelectorAll('.spender-card').forEach(card => {
      card.classList.remove('selected');
      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = false;
    });

    // Uncheck Everyone & all individual checkboxes
    if (chkEveryone) chkEveryone.checked = false;
    individualCheckboxes.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.checked = false;
    });

    // Clear tag chip highlights
    quickTags.querySelectorAll('.tag-chip').forEach(t => t.classList.remove('active'));

    // Clear errors
    spenderError.classList.remove('show');
    amountError.classList.remove('show');
    spentForError.classList.remove('show');

    // Reset date to today
    expenseDateInput.value = new Date().toISOString().split('T')[0];

    updateSelectionCounter();
  }

  // ================= 10. SPEND AMOUNT CARDS =================
  function renderSpendAmountCards(data) {
    if (people.length === 0) {
      personCardsGrid.innerHTML = `
        <div class="empty-state-sm" style="grid-column: 1 / -1; padding: 32px 16px;">
          No trip members yet. Add people to start calculating spending splits.
        </div>`;
      return;
    }

    personCardsGrid.innerHTML = people.map(person => {
      const stat = data.stats[person] || {
        totalPaid: 0,
        personalShare: 0,
        paidForOthers: 0,
        othersPaidForMe: 0,
        balance: 0
      };

      const balance = stat.balance;
      let badgeHtml = '';
      let actionHint = '';

      if (balance > 0.01) {
        badgeHtml = `<span class="balance-badge receive">+${formatINR(balance)} to receive</span>`;
        // Find who owes this person from direct settlement
        const debtorsToThis = data.settlementTransactions.filter(t => t.to === person);
        if (debtorsToThis.length > 0) {
          const names = debtorsToThis.map(d => d.from).join(', ');
          actionHint = `<span class="person-card-action-hint receive-from-hint">Receive from ${names}</span>`;
        }
      } else if (balance < -0.01) {
        badgeHtml = `<span class="balance-badge give">${formatINR(Math.abs(balance))} to give</span>`;
        // Find whom this person owes
        const creditorsForThis = data.settlementTransactions.filter(t => t.from === person);
        if (creditorsForThis.length > 0) {
          const names = creditorsForThis.map(c => c.to).join(', ');
          actionHint = `<span class="person-card-action-hint give-to-hint">Give to ${names}</span>`;
        }
      } else {
        badgeHtml = `<span class="balance-badge settled">Settled (₹0)</span>`;
        actionHint = `<span class="person-card-action-hint">All even ✓</span>`;
      }

      return `
        <div class="person-card" data-person="${person}">
          <div class="person-card-header">
            <div class="person-card-title">
              <div class="person-avatar">${getInitials(person)}</div>
              <span class="person-card-name">${person}</span>
            </div>
            ${badgeHtml}
          </div>

          <table class="person-breakdown-table">
            <tbody>
              <tr>
                <td class="td-label">Total Paid</td>
                <td class="font-blue">${formatINR(stat.totalPaid)}</td>
              </tr>
              <tr>
                <td class="td-label">Personal Share</td>
                <td>${formatINR(stat.personalShare)}</td>
              </tr>
              <tr>
                <td class="td-label">Paid For Others</td>
                <td class="font-emerald">${formatINR(stat.paidForOthers)}</td>
              </tr>
              <tr>
                <td class="td-label">Others Paid For ${person}</td>
                <td class="font-rose">${formatINR(stat.othersPaidForMe)}</td>
              </tr>
            </tbody>
          </table>

          <div class="person-card-balance">
            <div>${actionHint}</div>
            <span class="btn-link" style="font-size: 0.75rem; text-decoration: none;">View Details →</span>
          </div>
        </div>
      `;
    }).join('');

    // Attach click listeners to cards to open Person Details modal
    personCardsGrid.querySelectorAll('.person-card').forEach(card => {
      card.addEventListener('click', () => {
        const personName = card.dataset.person;
        openPersonDetailsModal(personName, data);
      });
    });
  }

  // ================= 11. PERSON DETAILS MODAL =================
  function openPersonDetailsModal(personName, data) {
    const stat = data.stats[personName] || {
      totalPaid: 0,
      personalShare: 0,
      paidForOthers: 0,
      othersPaidForMe: 0,
      balance: 0,
      expensesPaid: []
    };

    detailPersonAvatar.textContent = getInitials(personName);
    detailPersonName.textContent = personName;
    detailTotalPaid.textContent = formatINR(stat.totalPaid);
    detailPersonalShare.textContent = formatINR(stat.personalShare);
    detailPaidForOthers.textContent = formatINR(stat.paidForOthers);
    detailOthersPaidFor.textContent = formatINR(stat.othersPaidForMe);

    // Final balance banner
    const balance = stat.balance;
    detailBalanceBanner.className = 'person-balance-banner';

    if (balance > 0.01) {
      detailBalanceBanner.classList.add('receive');
      detailFinalBalance.textContent = `${formatINR(balance)} to receive`;
      detailPersonStatus.textContent = 'Net Creditor (Owed money)';
    } else if (balance < -0.01) {
      detailBalanceBanner.classList.add('give');
      detailFinalBalance.textContent = `${formatINR(Math.abs(balance))} to give`;
      detailPersonStatus.textContent = 'Net Debtor (Needs to pay)';
    } else {
      detailBalanceBanner.classList.add('settled');
      detailFinalBalance.textContent = '₹0 (Settled)';
      detailPersonStatus.textContent = 'Fully settled up';
    }

    // Populate Table: expenses where person paid
    detailTableTitle.textContent = `${personName}'s Expenses`;
    const paidExpenses = stat.expensesPaid || [];

    if (paidExpenses.length === 0) {
      detailExpensesTableBody.innerHTML = `
        <tr>
          <td colspan="4" class="empty-state-sm">No expenses paid by ${personName} yet.</td>
        </tr>
      `;
    } else {
      detailExpensesTableBody.innerHTML = paidExpenses.map(exp => {
        const forDisplay = (exp.spentFor.length === people.length)
          ? 'Everyone'
          : exp.spentFor.join(', ');

        return `
          <tr>
            <td>${formatDateFriendly(exp.date)}</td>
            <td class="text-right font-mono font-bold">${formatINR(exp.amount)}</td>
            <td>${forDisplay}</td>
            <td>${exp.description || '—'}</td>
          </tr>
        `;
      }).join('');
    }

    openModal(modalPersonDetails);
  }

  // ================= 12 & 13. DIRECT PAYMENT DIRECTIONS =================
  function renderDirections(data) {
    const directDebts = data.directDebts || [];

    // Give List: who needs to give money (A → B)
    if (directDebts.length === 0) {
      giveList.innerHTML = '<div class="empty-state-sm">Nothing to give ✓</div>';
      receiveList.innerHTML = '<div class="empty-state-sm">Nothing to receive ✓</div>';
      return;
    }

    giveList.innerHTML = directDebts.map(debt => `
      <div class="direction-item">
        <div class="direction-transfer">
          <span>${debt.from}</span>
          <span class="direction-arrow">→</span>
          <span>${debt.to}</span>
        </div>
        <span class="direction-amount font-rose">${formatINR(debt.amount)}</span>
      </div>
    `).join('');

    // Receive List: who receives money (B ← A)
    receiveList.innerHTML = directDebts.map(debt => `
      <div class="direction-item">
        <div class="direction-transfer">
          <span>${debt.to}</span>
          <span class="direction-arrow">←</span>
          <span>${debt.from}</span>
        </div>
        <span class="direction-amount font-emerald">${formatINR(debt.amount)}</span>
      </div>
    `).join('');
  }

  // ================= 14. FINAL SETTLEMENT =================
  function renderFinalSettlement(data) {
    const settlements = data.settlementTransactions || [];

    if (settlements.length === 0) {
      finalSettlementList.innerHTML = `
        <div class="settlement-all-even">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 8px; display: block; color: #4ade80;">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <strong>All Settled Up!</strong>
          <p style="margin-top: 4px; font-size: 0.8125rem;">Everyone has paid their exact share. No pending transfers needed.</p>
        </div>
      `;
      return;
    }

    finalSettlementList.innerHTML = settlements.map(item => `
      <div class="settlement-item">
        <div class="settlement-flow">
          <div class="settle-party">
            <div class="person-avatar" style="width: 24px; height: 24px; font-size: 0.6875rem;">${getInitials(item.from)}</div>
            <span>${item.from}</span>
          </div>
          <div class="settle-arrow">
            <span>pays</span>
            <span>→</span>
          </div>
          <div class="settle-party">
            <div class="person-avatar" style="width: 24px; height: 24px; font-size: 0.6875rem; background: #2563eb; color: #fff;">${getInitials(item.to)}</div>
            <span>${item.to}</span>
          </div>
        </div>
        <div class="settlement-amount">${formatINR(item.amount)}</div>
      </div>
    `).join('');
  }

  // ================= 15. EXPENSE HISTORY =================
  function renderExpenseHistory() {
    historyCountBadge.textContent = expenses.length;

    if (expenses.length === 0) {
      expenseHistoryList.innerHTML = `
        <div class="empty-state-sm" style="padding: 24px 8px;">
          No expenses recorded yet. Fill out the Borrow Amount form above to add your first expense.
        </div>
      `;
      return;
    }

    // Sort latest first
    const sorted = [...expenses].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    expenseHistoryList.innerHTML = sorted.map(exp => {
      const isForEveryone = exp.spentFor && exp.spentFor.length === people.length;
      const forText = isForEveryone ? 'Everyone' : (exp.spentFor || []).join(', ');

      return `
        <div class="expense-card" data-id="${exp.id}">
          <div class="expense-card-top">
            <div class="expense-card-payer">
              <div class="person-avatar">${getInitials(exp.spentBy)}</div>
              <div>
                <strong>${exp.spentBy}</strong> paid
              </div>
            </div>
            <div class="expense-card-amount">${formatINR(exp.amount)}</div>
          </div>

          <div class="expense-card-details">
            <div>
              <span class="expense-for-label">For:</span>
              <strong>${forText}</strong>
            </div>
            ${exp.description ? `<span class="expense-desc-badge">${exp.description}</span>` : ''}
            <span class="text-muted" style="font-size: 0.75rem;">${formatDateFriendly(exp.date)}</span>
          </div>

          <div class="expense-card-actions">
            <button type="button" class="btn-action-text btn-action-edit" data-edit-id="${exp.id}">
              Edit
            </button>
            <button type="button" class="btn-action-text btn-action-delete" data-delete-id="${exp.id}">
              Delete
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach Edit and Delete listeners
    expenseHistoryList.querySelectorAll('[data-edit-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditExpenseModal(btn.dataset.editId);
      });
    });

    expenseHistoryList.querySelectorAll('[data-delete-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteExpense(btn.dataset.deleteId);
      });
    });
  }

  // ================= 8 & 9. BORROW AMOUNT FORM SUBMISSION =================
  borrowForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const spentBy = getSelectedSpender();
    const amount = parseFloat(expenseAmountInput.value);
    const checkedForNodes = individualCheckboxes.querySelectorAll('input[type="checkbox"]:checked');
    const spentFor = Array.from(checkedForNodes).map(cb => cb.value);
    const description = expenseDescriptionInput.value.trim();
    const date = expenseDateInput.value || new Date().toISOString().split('T')[0];

    let hasError = false;

    // Validate Spender
    if (!spentBy) {
      spenderError.classList.add('show');
      hasError = true;
    } else {
      spenderError.classList.remove('show');
    }

    // Validate Amount
    if (isNaN(amount) || amount <= 0) {
      amountError.classList.add('show');
      hasError = true;
    } else {
      amountError.classList.remove('show');
    }

    // Validate Spent For
    if (spentFor.length === 0) {
      spentForError.classList.add('show');
      hasError = true;
    } else {
      spentForError.classList.remove('show');
    }

    if (hasError) return;

    // 1. Create and save expense record
    const newExpense = {
      id: generateId(),
      spentBy,
      amount,
      spentFor,
      description,
      date,
      createdAt: Date.now()
    };

    expenses.push(newExpense);
    saveState();

    // 2. Immediately update calculations, Spend Amount, & Expense History
    renderAll();

    // 3. COMPLETELY RESET THE BORROW AMOUNT FORM (No persistent selected spender!)
    resetBorrowForm();
  });

  // Quick Tags Click Handler
  quickTags.addEventListener('click', (e) => {
    const chip = e.target.closest('.tag-chip');
    if (!chip) return;
    const tag = chip.dataset.tag;
    quickTags.querySelectorAll('.tag-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    expenseDescriptionInput.value = tag;
  });

  // ================= 1. ADD PERSON MODAL & LOGIC =================
  btnOpenAddPerson.addEventListener('click', () => {
    newPersonNameInput.value = '';
    personNameError.classList.remove('show');
    openModal(modalAddPerson);
    setTimeout(() => newPersonNameInput.focus(), 100);
  });

  formAddPerson.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = newPersonNameInput.value.trim();

    if (!name) {
      personNameError.textContent = 'Please enter a name.';
      personNameError.classList.add('show');
      return;
    }

    // Check duplicate
    if (people.some(p => p.toLowerCase() === name.toLowerCase())) {
      personNameError.textContent = `"${name}" is already in the trip!`;
      personNameError.classList.add('show');
      return;
    }

    people.push(name);
    saveState();
    closeModal(modalAddPerson);
    renderAll();
  });

  // ================= CUSTOM AVERAGE TARGET OVERRIDE =================
  btnToggleCustomAvg.addEventListener('click', () => {
    if (customAvgRow.style.display === 'none') {
      customAvgRow.style.display = 'flex';
      customAvgInput.value = customAverageOverride !== null ? customAverageOverride : '';
      customAvgInput.focus();
    } else {
      customAvgRow.style.display = 'none';
    }
  });

  btnSaveCustomAvg.addEventListener('click', () => {
    const val = parseFloat(customAvgInput.value);
    if (!isNaN(val) && val >= 0) {
      customAverageOverride = val;
      saveState();
      renderAll();
      customAvgRow.style.display = 'none';
    }
  });

  btnResetCustomAvg.addEventListener('click', () => {
    customAverageOverride = null;
    customAvgInput.value = '';
    saveState();
    renderAll();
    customAvgRow.style.display = 'none';
  });

  // ================= EDIT EXPENSE MODAL & LOGIC =================
  function openEditExpenseModal(id) {
    const exp = expenses.find(e => e.id === id);
    if (!exp) return;

    editExpenseId.value = exp.id;
    editExpenseAmount.value = exp.amount;
    editExpenseDescription.value = exp.description || '';
    editExpenseDate.value = exp.date || new Date().toISOString().split('T')[0];

    // Spender selector in edit modal
    editSpenderSelector.innerHTML = people.map(p => `
      <label class="spender-card ${exp.spentBy === p ? 'selected' : ''}">
        <input type="radio" name="editSpentByPerson" value="${p}" ${exp.spentBy === p ? 'checked' : ''} />
        <div class="person-avatar">${getInitials(p)}</div>
        <span class="spender-name">${p}</span>
        <span class="radio-check-circle"></span>
      </label>
    `).join('');

    editSpenderSelector.querySelectorAll('.spender-card').forEach(card => {
      card.addEventListener('click', () => {
        editSpenderSelector.querySelectorAll('.spender-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        const radio = card.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
      });
    });

    // Checkboxes in edit modal
    const isEveryoneChecked = exp.spentFor && exp.spentFor.length === people.length;
    editChkEveryone.checked = isEveryoneChecked;

    editIndividualCheckboxes.innerHTML = people.map(p => {
      const isChecked = exp.spentFor && exp.spentFor.includes(p);
      return `
        <label class="checkbox-item">
          <input type="checkbox" name="editSpentForPerson" value="${p}" ${isChecked ? 'checked' : ''} />
          <span class="custom-checkbox"></span>
          <span class="checkbox-text">${p}</span>
        </label>
      `;
    }).join('');

    const editCbs = editIndividualCheckboxes.querySelectorAll('input[type="checkbox"]');
    function updateEditCounter() {
      const count = editIndividualCheckboxes.querySelectorAll('input[type="checkbox"]:checked').length;
      editSelectionCounter.textContent = `${count} selected`;
      editChkEveryone.checked = count === people.length && people.length > 0;
    }

    editCbs.forEach(cb => cb.addEventListener('change', updateEditCounter));
    editChkEveryone.onchange = () => {
      editCbs.forEach(cb => cb.checked = editChkEveryone.checked);
      updateEditCounter();
    };

    updateEditCounter();
    openModal(modalEditExpense);
  }

  formEditExpense.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = editExpenseId.value;
    const exp = expenses.find(e => e.id === id);
    if (!exp) return;

    const checkedRadio = editSpenderSelector.querySelector('input[name="editSpentByPerson"]:checked');
    const spentBy = checkedRadio ? checkedRadio.value : exp.spentBy;
    const amount = parseFloat(editExpenseAmount.value);
    const spentFor = Array.from(editIndividualCheckboxes.querySelectorAll('input[name="editSpentForPerson"]:checked')).map(cb => cb.value);

    if (isNaN(amount) || amount <= 0 || spentFor.length === 0) {
      alert('Please enter a valid amount and select at least one person.');
      return;
    }

    exp.spentBy = spentBy;
    exp.amount = amount;
    exp.spentFor = spentFor;
    exp.description = editExpenseDescription.value.trim();
    exp.date = editExpenseDate.value;

    saveState();
    closeModal(modalEditExpense);
    renderAll();
  });

  function deleteExpense(id) {
    const exp = expenses.find(e => e.id === id);
    if (!exp) return;

    if (confirm(`Delete expense "${exp.description || 'Expense'}" of ${formatINR(exp.amount)} paid by ${exp.spentBy}?`)) {
      expenses = expenses.filter(e => e.id !== id);
      saveState();
      renderAll();
    }
  }

  // ================= GENERAL MODAL HELPERS =================
  function openModal(modal) {
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.close;
      closeModal(document.getElementById(modalId));
    });
  });

  // Close when clicking modal backdrop
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        closeModal(backdrop);
      }
    });
  });

  // ESC key closes modals
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop.open').forEach(closeModal);
    }
  });

  // ================= DEMO RESET, CLEAR, & EXPORT =================
  btnResetDemo.addEventListener('click', () => {
    if (confirm('Reset trip data to default demo (Rahul, Amit, Priya, Arjun with initial dinner expense)?')) {
      people = [...DEFAULT_PEOPLE];
      expenses = JSON.parse(JSON.stringify(DEFAULT_EXPENSES));
      customAverageOverride = null;
      saveState();
      renderAll();
      resetBorrowForm();
    }
  });

  btnClearAll.addEventListener('click', () => {
    if (confirm('Clear all trip data? This will reset all members and expenses.')) {
      people = [];
      expenses = [];
      customAverageOverride = null;
      saveState();
      renderAll();
      resetBorrowForm();
    }
  });

  btnExportData.addEventListener('click', () => {
    const exportObj = {
      exportDate: new Date().toISOString(),
      people,
      expenses,
      customAverageOverride
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObj, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `tripsplit-data-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  });

  // ================= INITIALIZATION =================
  function init() {
    loadState();

    // Default date input to today
    if (expenseDateInput) {
      expenseDateInput.value = new Date().toISOString().split('T')[0];
    }

    renderAll();
    resetBorrowForm();
  }

  // Start app on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
