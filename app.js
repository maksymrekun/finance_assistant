// ========= SmartFinance Pro — app.js v2.2 =========
// Application State
let accountsList = [];
let transactionsList = [];
let budgetsList = [];
let goalsList = [];

// Chart instances
let donutChart = null;
let barChart = null;

// DOM Elements
const tabBtns = document.querySelectorAll(".nav-btn");
const tabPanes = document.querySelectorAll(".tab-pane");
const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");
const toastContainer = document.getElementById("toastContainer");

// --- Tab Navigation ---

const tabMeta = {
  "tab-overview": {
    title: "Overview & Finances",
    subtitle: "Current financial status, balances, and net cash flows",
  },
  "tab-transactions": {
    title: "Transaction History",
    subtitle: "All income and expenses with search, filters, dates, and CSV export",
  },
  "tab-budgets": {
    title: "Budgets & Limits",
    subtitle: "Monthly spending control by category with real-time alerts",
  },
  "tab-goals": {
    title: "Savings & Goals",
    subtitle: "Manage target savings milestones and financial reserves",
  },
  "tab-advisor": {
    title: "AI Financial Advisor",
    subtitle: "Health score audit (0-100), 50/30/20 rule, and conversational analytics",
  },
};

window.switchTab = function (tabId) {
  tabBtns.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });
  tabPanes.forEach((pane) => {
    pane.classList.toggle("active", pane.id === tabId);
  });

  if (tabMeta[tabId]) {
    pageTitle.textContent = tabMeta[tabId].title;
    pageSubtitle.textContent = tabMeta[tabId].subtitle;
  }

  if (tabId === "tab-overview") loadOverview();
  if (tabId === "tab-transactions") loadTransactions();
  if (tabId === "tab-budgets") loadBudgets();
  if (tabId === "tab-goals") loadGoals();
  if (tabId === "tab-advisor") loadAdvisorHealth();
};

tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    switchTab(btn.dataset.tab);
    closeMobileSidebar();
  });
});

// --- Mobile Sidebar Navigation ---
const sidebarToggleBtn = document.getElementById("sidebarToggle");
const sidebar = document.querySelector(".sidebar");

function openMobileSidebar() {
  sidebar.classList.add("mobile-open");
  let overlay = document.querySelector(".sidebar-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "sidebar-overlay active";
    overlay.addEventListener("click", closeMobileSidebar);
    document.body.appendChild(overlay);
  } else {
    overlay.classList.add("active");
  }
}

function closeMobileSidebar() {
  sidebar.classList.remove("mobile-open");
  const overlay = document.querySelector(".sidebar-overlay");
  if (overlay) overlay.classList.remove("active");
}

if (sidebarToggleBtn) {
  sidebarToggleBtn.addEventListener("click", openMobileSidebar);
}

// --- Toast Notifications ---
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === "success" ? "✓" : "⚠️"}</span> ${message}`;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toast.style.transition = "all 0.3s";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// --- Formatting Helpers ---
function formatCurrency(num, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
  }).format(num || 0);
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return isNaN(d.getTime())
    ? dateStr
    : d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

// --- 1. OVERVIEW (Dashboard) ---
async function loadOverview() {
  try {
    const [summaryRes, healthRes] = await Promise.all([
      fetch("/api/summary"),
      fetch("/api/advisor/health"),
    ]);
    const summary = await summaryRes.json();
    const health = await healthRes.json();

    // Key Performance Indicators (KPIs)
    document.getElementById("kpiNetWorth").textContent = formatCurrency(summary.net_worth);
    document.getElementById("kpiIncome").textContent = "+" + formatCurrency(summary.total_income);
    document.getElementById("kpiExpense").textContent = "-" + formatCurrency(summary.total_expense);

    const cf = summary.cash_flow;
    const cfElem = document.getElementById("kpiCashFlow");
    cfElem.textContent = (cf >= 0 ? "+" : "") + formatCurrency(cf);
    cfElem.className = `kpi-value ${cf >= 0 ? "text-emerald" : "text-rose"}`;
    document.getElementById("kpiSavingsRate").textContent = `${summary.savings_rate}% savings`;

    // 50/30/20 Rule
    const r = health.rule_50_30_20;
    document.getElementById("ruleNeedsVal").textContent = `${formatCurrency(r.needs.amount)} (${r.needs.percent}%)`;
    document.getElementById("ruleNeedsBar").style.width = `${Math.min(r.needs.percent, 100)}%`;
    document.getElementById("ruleWantsVal").textContent = `${formatCurrency(r.wants.amount)} (${r.wants.percent}%)`;
    document.getElementById("ruleWantsBar").style.width = `${Math.min(r.wants.percent, 100)}%`;
    document.getElementById("ruleSavingsVal").textContent = `${formatCurrency(r.savings.amount)} (${r.savings.percent}%)`;
    document.getElementById("ruleSavingsBar").style.width = `${Math.min(r.savings.percent, 100)}%`;

    // Accounts widget
    renderAccountsWidget(summary.accounts_breakdown);

    // Top Categories
    renderTopCategories(summary.top_categories, summary.total_expense);

    // Recent Transactions
    loadRecentTransactions();

    // Render Charts
    if (typeof Chart !== "undefined") {
      renderDonutChart(summary.top_categories);
      renderCashflowChart(summary.total_income, summary.total_expense, cf);
    }
  } catch (err) {
    console.error("Error loading overview:", err);
  }
}

function renderAccountsWidget(accounts) {
  const container = document.getElementById("accountsListWidget");
  if (!container) return;
  container.innerHTML = "";
  if (!accounts || accounts.length === 0) {
    container.innerHTML = "<p style='color: var(--text-dim);'>No accounts created yet.</p>";
    return;
  }
  const typeIcons = { bank: "💳", savings: "🏦", cash: "💵", crypto: "📈" };
  accounts.forEach((acc) => {
    const item = document.createElement("div");
    item.className = "acc-item";
    item.innerHTML = `
      <div class="acc-info">
        <span class="acc-dot" style="background: ${acc.color};"></span>
        <div>
          <div class="acc-name">${typeIcons[acc.type] || "💰"} ${acc.name}</div>
          <div class="acc-type">${acc.type.toUpperCase()} • ${acc.currency || "USD"}</div>
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:10px;">
        <div class="acc-balance">${formatCurrency(acc.balance)}</div>
        <button class="acc-del-btn" onclick="deleteAccount(${acc.id})" title="Delete account">✕</button>
      </div>
    `;
    container.appendChild(item);
  });
}

function renderTopCategories(categories, totalExpense) {
  const container = document.getElementById("topCategoriesWidget");
  if (!container) return;
  container.innerHTML = "";
  if (!categories || categories.length === 0) {
    container.innerHTML = "<p style='color: var(--text-dim);'>No expense data available.</p>";
    return;
  }
  categories.forEach((cat) => {
    const pct = totalExpense > 0 ? Math.round((cat.total / totalExpense) * 100) : 0;
    const item = document.createElement("div");
    item.className = "cat-item";
    item.innerHTML = `
      <span style="font-weight: 600; min-width: 170px; font-size: 13px;">${cat.category}</span>
      <div class="cat-bar-wrap">
        <div class="cat-bar" style="width: ${pct}%;"></div>
      </div>
      <span style="font-weight: 700; min-width: 110px; text-align: right; font-size: 13px;">${formatCurrency(cat.total)} (${pct}%)</span>
    `;
    container.appendChild(item);
  });
}

async function loadRecentTransactions() {
  try {
    const res = await fetch("/api/transactions?limit=5");
    const data = await res.json();
    const container = document.getElementById("recentTransactionsWidget");
    if (!container) return;
    container.innerHTML = "";

    if (!data || data.length === 0) {
      container.innerHTML = "<p style='color: var(--text-dim);'>No recent transactions.</p>";
      return;
    }

    data.forEach((tx) => {
      const isInc = tx.type === "income";
      const div = document.createElement("div");
      div.className = "tx-mini-item";
      div.innerHTML = `
        <div class="tx-mini-left">
          <span class="tx-mini-title">${tx.description || tx.category}</span>
          <span class="tx-mini-meta">${tx.account_name} • ${formatDate(tx.date)}</span>
        </div>
        <span class="tx-mini-amount ${isInc ? "text-emerald" : "text-rose"}">
          ${isInc ? "+" : "-"}${formatCurrency(tx.amount)}
        </span>
      `;
      container.appendChild(div);
    });
  } catch (err) {
    console.error("Error loading recent transactions:", err);
  }
}

// --- Charts ---
function renderDonutChart(categories) {
  const canvas = document.getElementById("expenseDonutChart");
  if (!canvas || !categories || categories.length === 0) return;

  if (donutChart) { donutChart.destroy(); donutChart = null; }

  const palette = ["#6366f1", "#10b981", "#f59e0b", "#f43f5e", "#38bdf8", "#a855f7", "#ec4899"];
  donutChart = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: categories.map((c) => c.category),
      datasets: [{
        data: categories.map((c) => c.total),
        backgroundColor: palette.slice(0, categories.length),
        borderColor: "#141e33",
        borderWidth: 3,
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: "65%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#94a3b8",
            font: { size: 11, weight: "600", family: "'Plus Jakarta Sans', sans-serif" },
            padding: 12,
            usePointStyle: true,
            pointStyleWidth: 10,
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.label}: $${ctx.parsed.toFixed(2)}`,
          },
        },
      },
    },
  });
}

function renderCashflowChart(income, expense, cashFlow) {
  const canvas = document.getElementById("cashflowBarChart");
  if (!canvas) return;

  if (barChart) { barChart.destroy(); barChart = null; }

  barChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: ["Income", "Expenses", "Cash Flow"],
      datasets: [{
        label: "Amount ($)",
        data: [income, expense, Math.abs(cashFlow)],
        backgroundColor: [
          "rgba(16,185,129,0.75)",
          "rgba(244,63,94,0.75)",
          cashFlow >= 0 ? "rgba(99,102,241,0.75)" : "rgba(245,158,11,0.75)",
        ],
        borderColor: [
          "#10b981",
          "#f43f5e",
          cashFlow >= 0 ? "#6366f1" : "#f59e0b",
        ],
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` $${ctx.parsed.y.toFixed(2)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#94a3b8", font: { size: 12, weight: "600" } },
          border: { display: false },
        },
        y: {
          grid: { color: "rgba(255,255,255,0.05)" },
          ticks: {
            color: "#64748b",
            font: { size: 11 },
            callback: (v) => "$" + v.toLocaleString(),
          },
          border: { display: false },
        },
      },
    },
  });
}

// --- 2. TRANSACTIONS ---
async function loadTransactions() {
  try {
    const search = document.getElementById("txSearchInput").value;
    const type = document.getElementById("txTypeFilter").value;
    const accId = document.getElementById("txAccountFilter").value;
    const dateFrom = document.getElementById("txDateFrom")?.value || "";
    const dateTo = document.getElementById("txDateTo")?.value || "";

    const params = new URLSearchParams();
    if (search.trim()) params.append("search", search.trim());
    if (type !== "all") params.append("type", type);
    if (accId) params.append("account_id", accId);
    params.append("limit", "200");

    const res = await fetch(`/api/transactions?${params.toString()}`);
    let data = await res.json();

    // Client-side date filter
    if (dateFrom) data = data.filter((tx) => tx.date >= dateFrom);
    if (dateTo) data = data.filter((tx) => tx.date <= dateTo);

    transactionsList = data;

    // Update Transaction Summary Stats
    updateTxStats(data);

    const tbody = document.getElementById("transactionsTableBody");
    tbody.innerHTML = "";

    if (transactionsList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 40px; color: var(--text-dim);">🔍 No transactions found matching current filters</td></tr>`;
      return;
    }

    transactionsList.forEach((tx) => {
      const isInc = tx.type === "income";
      const tr = document.createElement("tr");
      const recurringBadge = tx.is_recurring ? `<span style="font-size:10px; background:rgba(99,102,241,0.15); color:var(--indigo); padding:2px 5px; border-radius:4px; margin-left:4px;" title="Recurring monthly transaction">🔄</span>` : "";
      tr.innerHTML = `
        <td style="color: var(--text-muted); font-size: 13px;">${formatDate(tx.date)}</td>
        <td><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${tx.account_color || "#6366f1"}; margin-right:6px;"></span>${tx.account_name}</td>
        <td>
          <div style="font-weight: 600;">${tx.category}${recurringBadge}</div>
          <div style="font-size: 12px; color: var(--text-dim);">${tx.description || ""} ${tx.subcategory ? `(${tx.subcategory})` : ""}</div>
        </td>
        <td>${tx.tags ? `<span class="badge-tag">${tx.tags}</span>` : "—"}</td>
        <td><span class="kpi-badge ${isInc ? "bg-emerald" : "bg-rose"}">${isInc ? "Income" : "Expense"}</span></td>
        <td style="text-align: right; font-weight: 700;" class="${isInc ? "text-emerald" : "text-rose"}">
          ${isInc ? "+" : "-"}${formatCurrency(tx.amount)}
        </td>
        <td style="text-align: center;">
          <button class="btn-link" style="color: var(--rose);" onclick="deleteTransaction(${tx.id})" title="Delete">✕</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error loading transactions:", err);
  }
}

function updateTxStats(data) {
  const countEl = document.getElementById("txStatCount");
  const incEl = document.getElementById("txStatIncome");
  const expEl = document.getElementById("txStatExpense");
  const balEl = document.getElementById("txStatBalance");
  if (!countEl) return;

  const totalInc = data.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExp = data.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = totalInc - totalExp;

  countEl.textContent = data.length;
  incEl.textContent = "+" + formatCurrency(totalInc);
  expEl.textContent = "-" + formatCurrency(totalExp);
  balEl.textContent = (balance >= 0 ? "+" : "") + formatCurrency(balance);
  if (balEl) balEl.className = `tx-stat-val ${balance >= 0 ? "text-emerald" : "text-rose"}`;
}

window.deleteTransaction = async function (id) {
  if (!confirm("Delete transaction? The account balance will be restored.")) return;
  try {
    const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Transaction deleted");
      loadTransactions();
      loadOverview();
      fetchAccountsForSelects();
    }
  } catch (err) {
    showToast("Error deleting transaction", "error");
  }
};

// --- CSV Export ---
window.exportTransactionsCSV = function () {
  if (!transactionsList || transactionsList.length === 0) {
    showToast("No transactions available to export", "error");
    return;
  }

  const headers = ["Date", "Account", "Type", "Category", "Subcategory", "Description", "Tags", "Amount"];
  const rows = transactionsList.map((tx) => [
    tx.date,
    tx.account_name,
    tx.type === "income" ? "Income" : "Expense",
    tx.category,
    tx.subcategory || "",
    tx.description || "",
    tx.tags || "",
    tx.type === "income" ? tx.amount : -tx.amount,
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const BOM = "\uFEFF"; // UTF-8 BOM for Excel compatibility
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `smartfinance_export_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("CSV file exported successfully!");
};

// --- 3. BUDGETS ---
async function loadBudgets() {
  try {
    const res = await fetch("/api/budgets");
    budgetsList = await res.json();

    const grid = document.getElementById("budgetsGrid");
    grid.innerHTML = "";

    if (budgetsList.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
          <div style="font-size: 48px; margin-bottom: 16px;">🎯</div>
          <h3 style="margin-bottom: 8px; color: var(--text-muted);">No active budgets</h3>
          <p style="color: var(--text-dim); margin-bottom: 24px;">Set category limits to track and control your monthly expenses</p>
          <button class="btn btn-primary" onclick="openBudgetModal()">+ Set First Budget Limit</button>
        </div>`;
      return;
    }

    budgetsList.forEach((b) => {
      const card = document.createElement("div");
      card.className = `budget-card ${b.is_exceeded ? "exceeded" : ""}`;

      let statusColor = "bg-emerald";
      let statusText = "On Track";
      if (b.is_exceeded) {
        statusColor = "bg-rose";
        statusText = "Overspent!";
      } else if (b.percent_used > 75) {
        statusColor = "bg-amber";
        statusText = `Warning (${b.percent_used}%)`;
      }

      card.innerHTML = `
        <div>
          <div class="budget-header">
            <span class="budget-category">${b.category}</span>
            <span class="budget-status-tag ${statusColor}">${statusText}</span>
          </div>
          <div class="budget-amounts">
            <div>
              <div class="budget-spent ${b.is_exceeded ? "text-rose" : ""}">${formatCurrency(b.spent)}</div>
              <div class="budget-limit">of ${formatCurrency(b.monthly_limit)} limit</div>
            </div>
            <div style="font-weight: 800; font-size: 22px; color: ${b.is_exceeded ? "var(--rose)" : (b.percent_used > 75 ? "var(--amber)" : "var(--emerald)") };">${b.percent_used}%</div>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill ${b.is_exceeded ? "bg-rose" : (b.percent_used > 75 ? "bg-amber" : "bg-emerald")}" style="width: ${Math.min(b.percent_used, 100)}%;"></div>
          </div>
        </div>
        <div class="budget-footer">
          <span>Remaining: <strong>${formatCurrency(b.remaining)}</strong></span>
          <button class="btn-link" style="color: var(--rose);" onclick="deleteBudget(${b.id})">Delete</button>
        </div>
      `;
      grid.appendChild(card);
    });
  } catch (err) {
    console.error("Error loading budgets:", err);
  }
}

window.deleteBudget = async function (id) {
  if (!confirm("Delete budget limit?")) return;
  await fetch(`/api/budgets/${id}`, { method: "DELETE" });
  showToast("Budget limit deleted");
  loadBudgets();
};

// --- 4. GOALS & RESERVES ---
async function loadGoals() {
  try {
    const res = await fetch("/api/goals");
    goalsList = await res.json();

    const grid = document.getElementById("goalsGrid");
    grid.innerHTML = "";

    if (goalsList.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
          <div style="font-size: 48px; margin-bottom: 16px;">🏆</div>
          <h3 style="margin-bottom: 8px; color: var(--text-muted);">No active goals</h3>
          <p style="color: var(--text-dim); margin-bottom: 24px;">Set a savings goal and track your progress</p>
          <button class="btn btn-primary" onclick="openGoalModal()">+ Create First Goal</button>
        </div>`;
      return;
    }

    goalsList.forEach((g) => {
      const card = document.createElement("div");
      card.className = "goal-card";
      const daysLeft = g.target_date ? getDaysLeft(g.target_date) : null;
      const deadlineHtml = daysLeft !== null
        ? `<div style="font-size:12px; color:${daysLeft < 30 ? "var(--rose)" : "var(--text-dim)"}; margin-top:8px;">📅 ${daysLeft > 0 ? `${daysLeft} days remaining` : "Deadline passed"} · ${formatDate(g.target_date)}</div>`
        : "";

      card.innerHTML = `
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="badge-tag">${g.category || "Goal"}</span>
            <button class="btn-link" style="color: var(--rose);" onclick="deleteGoal(${g.id})">✕</button>
          </div>
          <h3 class="goal-title" style="margin-top: 10px;">${g.title}</h3>
          <div class="goal-numbers">
            <div>
              <div class="goal-current">${formatCurrency(g.current_amount)}</div>
              <div class="goal-target">of target ${formatCurrency(g.target_amount)}</div>
            </div>
            <div style="font-size: 20px; font-weight: 800; color: ${g.progress_percent >= 100 ? "var(--emerald)" : "var(--text-muted)"};">${g.progress_percent}%</div>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill ${g.progress_percent >= 100 ? "bg-emerald" : "bg-indigo"}" style="width: ${Math.min(g.progress_percent, 100)}%;"></div>
          </div>
          ${deadlineHtml}
          <div style="font-size:12px; color: var(--text-dim); margin-top: 6px;">Remaining to save: <strong>${formatCurrency(g.remaining)}</strong></div>
        </div>
        <div class="goal-actions">
          <button class="btn btn-primary" style="flex: 1;" onclick="openDepositModal(${g.id}, '${g.title.replace(/'/g, "\\'")}')">
            💰 Fund Goal
          </button>
          ${g.progress_percent >= 100 ? `<span style="font-size:22px;" title="Goal achieved!">🎉</span>` : ""}
        </div>
      `;
      grid.appendChild(card);
    });
  } catch (err) {
    console.error("Error loading goals:", err);
  }
}

function getDaysLeft(dateStr) {
  const target = new Date(dateStr);
  const now = new Date();
  const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  return diff;
}

window.deleteGoal = async function (id) {
  if (!confirm("Delete financial goal?")) return;
  await fetch(`/api/goals/${id}`, { method: "DELETE" });
  showToast("Goal deleted");
  loadGoals();
};

// --- 5. AI ADVISOR ---
async function loadAdvisorHealth() {
  try {
    const res = await fetch("/api/advisor/health");
    const data = await res.json();

    document.getElementById("healthScoreNum").textContent = data.health_score;
    document.getElementById("healthScoreStatus").textContent = `Rating: ${data.score_level}`;

    const circle = document.getElementById("gaugeCircle");
    if (data.health_score >= 80) {
      circle.style.borderColor = "var(--emerald)";
      circle.style.boxShadow = "0 0 30px rgba(16,185,129,0.3)";
    } else if (data.health_score >= 60) {
      circle.style.borderColor = "var(--amber)";
      circle.style.boxShadow = "0 0 30px rgba(245,158,11,0.3)";
    } else {
      circle.style.borderColor = "var(--rose)";
      circle.style.boxShadow = "0 0 30px rgba(244,63,94,0.3)";
    }

    const breakdown = document.getElementById("healthBreakdown");
    breakdown.innerHTML = "";
    Object.values(data.breakdown_scores).forEach((item) => {
      const pct = Math.round((item.score / item.max) * 100);
      const box = document.createElement("div");
      box.className = "score-box";
      box.innerHTML = `
        <div class="score-box-title">${item.label}</div>
        <div class="score-box-val ${item.score >= item.max * 0.8 ? "text-emerald" : (item.score >= item.max * 0.5 ? "text-blue" : "text-rose")}">${item.score} / ${item.max} pts</div>
        <div class="progress-bar-bg" style="margin-top:8px; height:6px;">
          <div class="progress-bar-fill ${item.score >= item.max * 0.8 ? "bg-emerald" : (item.score >= item.max * 0.5 ? "bg-indigo" : "bg-rose")}" style="width:${pct}%;"></div>
        </div>
      `;
      breakdown.appendChild(box);
    });

    const insightsContainer = document.getElementById("advisorInsights");
    insightsContainer.innerHTML = "";
    if (!data.insights || data.insights.length === 0) {
      insightsContainer.innerHTML = `<div class="insight-card info"><div>ℹ️</div><div class="insight-text"><h4>No insights available</h4><p>Add accounts, transactions, and budgets to generate AI insights.</p></div></div>`;
      return;
    }
    data.insights.forEach((ins) => {
      const card = document.createElement("div");
      card.className = `insight-card ${ins.type}`;
      const icon = { success: "💡", danger: "🚨", warning: "⚠️", info: "ℹ️" }[ins.type] || "ℹ️";
      card.innerHTML = `
        <div style="font-size: 22px;">${icon}</div>
        <div class="insight-text">
          <h4>${ins.title}</h4>
          <p>${ins.text}</p>
        </div>
      `;
      insightsContainer.appendChild(card);
    });
  } catch (err) {
    console.error("Error loading advisor health:", err);
  }
}

// Chatbot interactions
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = chatInput.value.trim();
  if (!q) return;

  appendChatMessage("user", q);
  chatInput.value = "";

  // Show loading spinner
  const loadingId = "loading-" + Date.now();
  const loadingDiv = document.createElement("div");
  loadingDiv.className = "chat-msg bot";
  loadingDiv.id = loadingId;
  loadingDiv.innerHTML = `<div class="msg-bubble"><span class="spinner"></span> Analyzing data...</div>`;
  chatMessages.appendChild(loadingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  try {
    const res = await fetch("/api/advisor/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: q }),
    });
    const data = await res.json();
    document.getElementById(loadingId)?.remove();
    appendChatMessage("bot", data.reply);

    if (data.suggested_actions && data.suggested_actions.length > 0) {
      const suggestDiv = document.createElement("div");
      suggestDiv.className = "quick-questions";
      suggestDiv.style.marginLeft = "0";
      suggestDiv.style.marginBottom = "8px";
      data.suggested_actions.slice(0, 3).forEach((action) => {
        const btn = document.createElement("button");
        btn.className = "quick-btn";
        btn.textContent = action;
        btn.onclick = () => sendQuickQuestion(action);
        suggestDiv.appendChild(btn);
      });
      chatMessages.appendChild(suggestDiv);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  } catch (err) {
    document.getElementById(loadingId)?.remove();
    appendChatMessage("bot", "⚠️ Sorry, could not retrieve a response from the analytics service.");
  }
});

window.sendQuickQuestion = function (text) {
  chatInput.value = text;
  chatForm.dispatchEvent(new Event("submit"));
};

function appendChatMessage(sender, text) {
  const msg = document.createElement("div");
  msg.className = `chat-msg ${sender}`;
  const formatted = text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
  msg.innerHTML = `<div class="msg-bubble">${formatted}</div>`;
  chatMessages.appendChild(msg);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// --- 6. ACCOUNTS ---
async function fetchAccountsForSelects() {
  try {
    const res = await fetch("/api/accounts");
    accountsList = await res.json();

    const txSel = document.getElementById("txAccountSelect");
    const filterSel = document.getElementById("txAccountFilter");
    const depositSel = document.getElementById("depositAccountSelect");

    txSel.innerHTML = "";
    filterSel.innerHTML = "<option value=''>All Accounts</option>";
    depositSel.innerHTML = "<option value=''>Do not deduct from account</option>";

    accountsList.forEach((acc) => {
      txSel.innerHTML += `<option value="${acc.id}">${acc.name} (${formatCurrency(acc.balance)})</option>`;
      filterSel.innerHTML += `<option value="${acc.id}">${acc.name}</option>`;
      depositSel.innerHTML += `<option value="${acc.id}">Deduct from: ${acc.name} (${formatCurrency(acc.balance)})</option>`;
    });
  } catch (err) {
    console.error("Error fetching accounts:", err);
  }
}

window.deleteAccount = async function (id) {
  if (!confirm("Delete account? All associated transactions will also be permanently deleted.")) return;
  try {
    const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Account deleted");
      fetchAccountsForSelects();
      loadOverview();
    } else {
      showToast("Failed to delete account", "error");
    }
  } catch (err) {
    showToast("Error deleting account", "error");
  }
};

// --- 7. NBP CURRENCY EXCHANGE RATES ---
async function fetchNbpRates() {
  try {
    const res = await fetch("/api/nbp-rates");
    const data = await res.json();
    const r = data.rates;
    const ticker = document.getElementById("nbpRatesTicker");
    if (ticker) {
      ticker.innerHTML = `
        <div>$ 1 USD = <strong>${r.USD}</strong> zł</div>
        <div>€ 1 EUR = <strong>${r.EUR}</strong> zł</div>
        <div>£ 1 GBP = <strong>${r.GBP}</strong> zł</div>
        <div style="font-size:10px; color: var(--text-dim); margin-top:4px;">Source: ${data.source}</div>
      `;
    }
  } catch (err) {
    const ticker = document.getElementById("nbpRatesTicker");
    if (ticker) ticker.textContent = "Rates unavailable";
  }
}

// --- 8. MODAL WINDOWS ---
window.openModal = function (modalId) {
  document.getElementById(modalId).style.display = "flex";
  document.body.style.overflow = "hidden";
};
window.closeModal = function (modalId) {
  document.getElementById(modalId).style.display = "none";
  document.body.style.overflow = "";
};

// Backdrop click close
document.querySelectorAll(".modal-backdrop").forEach((modal) => {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal(modal.id);
  });
});
// Escape key close
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.querySelectorAll(".modal-backdrop").forEach((m) => {
      if (m.style.display !== "none") closeModal(m.id);
    });
  }
});

window.openTransactionModal = function () {
  document.getElementById("txDateInput").value = new Date().toISOString().split("T")[0];
  openModal("txModal");
};
window.openAccountModal = function () { openModal("accountModal"); };
window.openBudgetModal = function () { openModal("budgetModal"); };
window.openGoalModal = function () { openModal("goalModal"); };

window.openDepositModal = function (goalId, title) {
  document.getElementById("depositGoalId").value = goalId;
  document.getElementById("depositGoalTitle").textContent = `Funding goal: "${title}"`;
  openModal("depositModal");
};

document.getElementById("openTransactionModalBtn").onclick = openTransactionModal;
document.getElementById("openAccountModalBtn").onclick = openAccountModal;

// Save Transaction
document.getElementById("txForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('[type="submit"]');
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Saving...`;

  const payload = {
    account_id: parseInt(document.getElementById("txAccountSelect").value),
    type: document.getElementById("txTypeSelect").value,
    amount: parseFloat(document.getElementById("txAmountInput").value),
    date: document.getElementById("txDateInput").value,
    category: document.getElementById("txCategorySelect").value,
    subcategory: document.getElementById("txSubcategoryInput").value.trim(),
    description: document.getElementById("txDescriptionInput").value.trim(),
    tags: document.getElementById("txTagsInput").value.trim(),
    is_recurring: document.getElementById("txRecurringInput").checked ? 1 : 0,
  };

  try {
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to record transaction");
    showToast("Transaction saved successfully!");
    closeModal("txModal");
    document.getElementById("txForm").reset();
    fetchAccountsForSelects();
    loadOverview();
    loadTransactions();
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = "Save Transaction";
  }
});

// Create Account
document.getElementById("accountForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const colors = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#38bdf8", "#8b5cf6"];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  const payload = {
    name: document.getElementById("accNameInput").value.trim(),
    type: document.getElementById("accTypeSelect").value,
    currency: "USD",
    balance: parseFloat(document.getElementById("accBalanceInput").value) || 0.0,
    color: randomColor,
  };
  try {
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to create account");
    showToast("Account created successfully!");
    closeModal("accountModal");
    document.getElementById("accountForm").reset();
    fetchAccountsForSelects();
    loadOverview();
  } catch (err) {
    showToast(err.message, "error");
  }
});

// Save Budget Limit
document.getElementById("budgetForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    category: document.getElementById("budgetCategorySelect").value,
    monthly_limit: parseFloat(document.getElementById("budgetLimitInput").value),
    color: "#6366f1",
  };
  try {
    const res = await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to save budget limit");
    showToast("Budget limit saved!");
    closeModal("budgetModal");
    document.getElementById("budgetForm").reset();
    loadBudgets();
    loadOverview();
  } catch (err) {
    showToast(err.message, "error");
  }
});

// Create Goal
document.getElementById("goalForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    title: document.getElementById("goalTitleInput").value.trim(),
    target_amount: parseFloat(document.getElementById("goalTargetInput").value),
    current_amount: parseFloat(document.getElementById("goalCurrentInput").value) || 0,
    target_date: document.getElementById("goalDateInput").value,
  };
  try {
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to create goal");
    showToast("Goal created successfully!");
    closeModal("goalModal");
    document.getElementById("goalForm").reset();
    loadGoals();
  } catch (err) {
    showToast(err.message, "error");
  }
});

// Fund Goal Deposit
document.getElementById("depositForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const goalId = document.getElementById("depositGoalId").value;
  const accVal = document.getElementById("depositAccountSelect").value;
  const payload = {
    amount: parseFloat(document.getElementById("depositAmountInput").value),
    account_id: accVal ? parseInt(accVal) : null,
  };
  try {
    const res = await fetch(`/api/goals/${goalId}/deposit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to fund goal");
    showToast("Goal funded successfully! 💰");
    closeModal("depositModal");
    document.getElementById("depositForm").reset();
    loadGoals();
    loadOverview();
    fetchAccountsForSelects();
  } catch (err) {
    showToast(err.message, "error");
  }
});

// Transaction Filter Listeners
document.getElementById("txSearchInput").addEventListener("input", () => loadTransactions());
document.getElementById("txTypeFilter").addEventListener("change", () => loadTransactions());
document.getElementById("txAccountFilter").addEventListener("change", () => loadTransactions());
document.getElementById("txDateFrom")?.addEventListener("change", () => loadTransactions());
document.getElementById("txDateTo")?.addEventListener("change", () => loadTransactions());

// --- Application Bootstrap ---
document.addEventListener("DOMContentLoaded", () => {
  fetchAccountsForSelects();
  loadOverview();
  fetchNbpRates();
  // Refresh exchange rates every 5 minutes
  setInterval(fetchNbpRates, 5 * 60 * 1000);
});
