# 💎 SmartFinance Pro — Personal Financial Assistant & AI Health Auditor

[![Python](https://img.shields.io/badge/Python-3.8%2B-blue.svg?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![SQLite](https://img.shields.io/badge/Database-SQLite3-003B57.svg?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Chart.js](https://img.shields.io/badge/Visuals-Chart.js_4-FF6384.svg?logo=chartdotjs&logoColor=white)](https://www.chartjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**SmartFinance Pro** is a modern, privacy-focused FinTech web application for tracking personal income and expenses, budgeting by category, planning savings goals, and performing deep AI-driven financial health audits.

Built with a fast **Python / FastAPI** backend and a responsive **Vanilla JavaScript / Modern Fintech UI** frontend without bulky frameworks.

---

## 🌟 Key Features

### 1. 📊 Executive Dashboard & KPI Metrics
- **Net Worth Tracking:** Real-time aggregate balance across all bank accounts, cash wallets, savings funds, and investment portfolios.
- **Cash Flow & Savings Rate:** Monthly calculation of net surplus/deficit along with savings rate percentage.
- **50 / 30 / 20 Budget Rule Engine:** Automatic spending allocation benchmark:
  - 🏠 **Basic Needs (50% target):** Rent, utilities, groceries, transport.
  - 🎉 **Wants & Leisure (30% target):** Dining out, entertainment, subscriptions.
  - 📈 **Savings & Investments (20% target):** Net positive cash flow and asset accumulation.
- **Interactive Visualizations:** Powered by Chart.js (expense distribution donut charts and monthly cash flow bar charts).
- **Central Bank Currency Ticker:** Live exchange rates (USD, EUR, GBP to PLN) fetched from the National Bank of Poland (NBP API) with graceful offline fallback.

### 2. 💳 Intelligent Transaction Management
- Multi-account support with automatic balance synchronization and atomic rollbacks upon deletion.
- Category & subcategory tagging, notes, and recurring subscription flags.
- Real-time instant search (description, category, memo, tags) and multi-criteria filters (account, transaction type, date range).
- **Instant CSV Export:** Full transaction dataset download with UTF-8 BOM encoding for seamless Excel compatibility.

### 3. 🎯 Category Budgets & Limit Enforcement
- Set flexible monthly spending caps per expense category.
- Dynamic color-coded alerts:
  - 🟢 **On Track** (`< 75%` utilized)
  - 🟡 **Warning** (`75% - 99%` utilized)
  - 🔴 **Overspent!** (`≥ 100%` budget exceeded)
- Real-time remaining balance calculations for proactive spending discipline.

### 4. 🏆 Savings Goals & Emergency Reserves
- Create milestone goals with deadlines, target amounts, and visual progress bars.
- Calculate runway days and days remaining until target completion.
- One-click goal funding with optional automatic deduction from any linked account.

### 5. 🤖 AI Financial Advisor & Health Scorecard
- **Financial Health Score (0 - 100):** Comprehensive health score evaluating:
  - **Savings Rate** (up to 25 pts)
  - **Emergency Runway** in months of autonomous living without income (up to 25 pts)
  - **Budget Limit Discipline** (up to 25 pts)
  - **Positive Net Cash Flow** (up to 25 pts)
- **Natural Language Assistant Chatbot:** Ask questions in plain English (*"Run a financial health audit"*, *"Where does my money go?"*, *"Show 50/30/20 breakdown"*, *"Are any budgets exceeded?"*) and receive contextual answers based on live database statistics.

---

## 🛠 Tech Stack

- **Backend:** Python 3.8+, FastAPI, Pydantic, Uvicorn
- **Database:** SQLite3 with relational foreign keys and cascade actions
- **External Integrations:** Narodowy Bank Polski (NBP) Table A Rates REST API
- **Frontend:** HTML5, CSS3 (Modern Glassmorphism & Plus Jakarta Sans typography), Vanilla ES6+ JavaScript, Chart.js 4.4
- **API Documentation:** OpenAPI / Swagger UI & ReDoc

---

## 📁 Project Structure

```text
finance_assistant/
├── main.py              # FastAPI application endpoints, routing, and server startup
├── database.py          # SQLite schema initialization, CRUD operations, and queries
├── advisor.py           # Financial health scoring, 50/30/20 rule, and AI chatbot logic
├── finance.db           # SQLite database file (auto-created on startup)
├── README.md            # Project documentation
└── static/
    ├── index.html       # Single Page Application layout and modal dialogues
    ├── app.js           # Client-side state, API communication, and Chart.js rendering
    └── style.css        # Fintech design system, responsive grid, and dark theme
```

