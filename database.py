import sqlite3
import os
from datetime import datetime, date
from typing import List, Dict, Any, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "finance.db")


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db() -> None:
    """Initialize database tables and seed demo data if empty."""
    with get_connection() as conn:
        cursor = conn.cursor()

        # Accounts / Wallets table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                type TEXT NOT NULL, -- 'bank', 'cash', 'savings', 'crypto'
                currency TEXT DEFAULT 'USD',
                balance REAL DEFAULT 0.0,
                color TEXT DEFAULT '#6366f1',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        # Transactions table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id INTEGER NOT NULL,
                type TEXT NOT NULL, -- 'income', 'expense', 'transfer'
                amount REAL NOT NULL,
                category TEXT NOT NULL,
                subcategory TEXT DEFAULT '',
                date TEXT NOT NULL,
                description TEXT DEFAULT '',
                tags TEXT DEFAULT '',
                is_recurring INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE
            )
            """
        )

        # Category budgets table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS budgets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT NOT NULL UNIQUE,
                monthly_limit REAL NOT NULL,
                color TEXT DEFAULT '#f59e0b'
            )
            """
        )

        # Financial goals / Savings table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS goals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                target_amount REAL NOT NULL,
                current_amount REAL DEFAULT 0.0,
                target_date TEXT,
                category TEXT DEFAULT 'General',
                color TEXT DEFAULT '#10b981',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        # Check and seed realistic initial demo data if empty
        cursor.execute("SELECT COUNT(*) FROM accounts")
        if cursor.fetchone()[0] == 0:
            _seed_demo_data(cursor)

        conn.commit()


def _seed_demo_data(cursor: sqlite3.Cursor):
    """Seed realistic initial demo data with accounts, budgets, goals, and transactions."""
    # 1. Accounts
    accounts_data = [
        ("Primary Card (Visa)", "bank", "USD", 4850.00, "#6366f1"),
        ("High-Yield Savings (4.5%)", "savings", "USD", 12500.00, "#10b981"),
        ("Cash Wallet", "cash", "USD", 420.00, "#f59e0b"),
        ("Investment Portfolio", "crypto", "USD", 6200.00, "#8b5cf6"),
    ]
    cursor.executemany(
        "INSERT INTO accounts (name, type, currency, balance, color) VALUES (?, ?, ?, ?, ?)",
        accounts_data,
    )

    # 2. Monthly Category Budgets
    budgets_data = [
        ("Groceries & Supermarkets", 600.0, "#38bdf8"),
        ("Restaurants & Cafes", 300.0, "#f43f5e"),
        ("Housing & Utilities", 1200.0, "#6366f1"),
        ("Transport & Auto", 250.0, "#f59e0b"),
        ("Entertainment & Hobbies", 200.0, "#a855f7"),
        ("Subscriptions & Services", 80.0, "#ec4899"),
    ]
    cursor.executemany(
        "INSERT INTO budgets (category, monthly_limit, color) VALUES (?, ?, ?)",
        budgets_data,
    )

    # 3. Financial Goals
    goals_data = [
        ("Emergency Fund (6 months)", 15000.0, 12500.0, "2026-12-31", "Safety", "#10b981"),
        ("New Workstation Laptop", 2500.0, 1850.0, "2026-10-15", "Electronics", "#6366f1"),
        ("Mountain Vacation Trip", 3000.0, 950.0, "2026-11-20", "Travel", "#f59e0b"),
    ]
    cursor.executemany(
        "INSERT INTO goals (title, target_amount, current_amount, target_date, category, color) VALUES (?, ?, ?, ?, ?, ?)",
        goals_data,
    )

    # 4. Recent Transactions
    today_str = date.today().isoformat()
    transactions_data = [
        (1, "income", 3800.00, "Salary", "Primary Employer", today_str, "Monthly salary deposit", "work,salary", 1),
        (1, "income", 650.00, "Freelance", "Web Development", today_str, "Landing page development client payment", "freelance,client", 0),
        (1, "expense", 1200.00, "Housing & Utilities", "Apartment", today_str, "Monthly apartment rent payment", "housing", 1),
        (1, "expense", 145.50, "Groceries & Supermarkets", "Supermarket", today_str, "Weekly grocery shopping", "groceries,food", 0),
        (1, "expense", 72.00, "Restaurants & Cafes", "Lunch", today_str, "Lunch with team colleagues", "cafe", 0),
        (1, "expense", 45.00, "Transport & Auto", "Gas Station", today_str, "Fuel refill", "fuel", 0),
        (1, "expense", 24.99, "Subscriptions & Services", "Software", today_str, "GitHub Copilot + Cloud subscription", "software", 1),
        (1, "expense", 320.00, "Groceries & Supermarkets", "Supermarket", today_str, "Household essentials and gourmet supplies", "groceries", 0),
        (3, "expense", 35.00, "Restaurants & Cafes", "Coffee Shop", today_str, "Coffee and pastry", "coffee", 0),
        (1, "expense", 110.00, "Entertainment & Hobbies", "Concerts & Books", today_str, "Concert tickets and books", "leisure", 0),
        (4, "income", 210.00, "Investments", "Dividends", today_str, "Quarterly stock dividend payouts", "stocks", 0),
    ]
    cursor.executemany(
        """
        INSERT INTO transactions (account_id, type, amount, category, subcategory, date, description, tags, is_recurring)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        transactions_data,
    )


# --- CRUD: Accounts ---

def get_accounts() -> List[Dict[str, Any]]:
    """Retrieve all accounts ordered by ID."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM accounts ORDER BY id ASC")
        return [dict(r) for r in cursor.fetchall()]


def create_account(name: str, acc_type: str, currency: str, balance: float, color: str) -> Dict[str, Any]:
    """Create a new account/wallet and return the created record."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO accounts (name, type, currency, balance, color) VALUES (?, ?, ?, ?, ?)",
            (name, acc_type, currency, balance, color),
        )
        acc_id = cursor.lastrowid
        conn.commit()
        cursor.execute("SELECT * FROM accounts WHERE id = ?", (acc_id,))
        return dict(cursor.fetchone())


def update_account(acc_id: int, **fields) -> Optional[Dict[str, Any]]:
    """Update fields for a specific account."""
    if not fields:
        return None
    set_clause = ", ".join([f"{k} = ?" for k in fields.keys()])
    values = list(fields.values()) + [acc_id]
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(f"UPDATE accounts SET {set_clause} WHERE id = ?", values)
        conn.commit()
        cursor.execute("SELECT * FROM accounts WHERE id = ?", (acc_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def delete_account(acc_id: int) -> bool:
    """Delete an account and its cascade transactions."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM accounts WHERE id = ?", (acc_id,))
        conn.commit()
        return cursor.rowcount > 0


# --- CRUD: Transactions ---

def get_transactions(
    account_id: Optional[int] = None,
    trans_type: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
) -> List[Dict[str, Any]]:
    """Fetch transactions with optional filtering and joined account metadata."""
    with get_connection() as conn:
        cursor = conn.cursor()
        query = """
            SELECT t.*, a.name as account_name, a.currency as account_currency, a.color as account_color
            FROM transactions t
            JOIN accounts a ON t.account_id = a.id
            WHERE 1=1
        """
        params: List[Any] = []

        if account_id:
            query += " AND t.account_id = ?"
            params.append(account_id)
        if trans_type and trans_type != "all":
            query += " AND t.type = ?"
            params.append(trans_type)
        if category and category != "all":
            query += " AND t.category = ?"
            params.append(category)
        if search:
            query += " AND (t.description LIKE ? OR t.category LIKE ? OR t.tags LIKE ?)"
            params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])

        query += " ORDER BY t.date DESC, t.id DESC LIMIT ?"
        params.append(limit)

        cursor.execute(query, params)
        return [dict(r) for r in cursor.fetchall()]


def create_transaction(
    account_id: int,
    trans_type: str,
    amount: float,
    category: str,
    subcategory: str,
    date_str: str,
    description: str,
    tags: str,
    is_recurring: int = 0,
) -> Dict[str, Any]:
    """Record a transaction and automatically adjust account balance."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO transactions (account_id, type, amount, category, subcategory, date, description, tags, is_recurring)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (account_id, trans_type, amount, category, subcategory, date_str, description, tags, is_recurring),
        )
        trans_id = cursor.lastrowid

        # Update account balance automatically
        balance_change = amount if trans_type == "income" else -amount
        cursor.execute(
            "UPDATE accounts SET balance = balance + ? WHERE id = ?",
            (balance_change, account_id),
        )
        conn.commit()

        cursor.execute(
            """
            SELECT t.*, a.name as account_name, a.currency as account_currency
            FROM transactions t JOIN accounts a ON t.account_id = a.id
            WHERE t.id = ?
            """,
            (trans_id,),
        )
        return dict(cursor.fetchone())


def delete_transaction(trans_id: int) -> bool:
    """Delete a transaction and revert the balance change on the account."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT account_id, type, amount FROM transactions WHERE id = ?", (trans_id,))
        row = cursor.fetchone()
        if not row:
            return False

        # Revert account balance
        rev_change = -row["amount"] if row["type"] == "income" else row["amount"]
        cursor.execute("UPDATE accounts SET balance = balance + ? WHERE id = ?", (rev_change, row["account_id"]))
        cursor.execute("DELETE FROM transactions WHERE id = ?", (trans_id,))
        conn.commit()
        return True


# --- CRUD: Budgets ---

def get_budgets_with_spending() -> List[Dict[str, Any]]:
    """Return category budgets with calculated actual spending."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM budgets ORDER BY monthly_limit DESC")
        budgets = [dict(b) for b in cursor.fetchall()]

        # Calculate spending per category
        for b in budgets:
            cursor.execute(
                """
                SELECT COALESCE(SUM(amount), 0.0) as spent
                FROM transactions
                WHERE type = 'expense' AND category = ?
                """,
                (b["category"],),
            )
            spent = cursor.fetchone()["spent"]
            limit = b["monthly_limit"]
            b["spent"] = round(spent, 2)
            b["remaining"] = round(max(0.0, limit - spent), 2)
            b["percent_used"] = round((spent / limit * 100), 1) if limit > 0 else 0.0
            b["is_exceeded"] = spent > limit

        return budgets


def create_or_update_budget(category: str, monthly_limit: float, color: str = "#6366f1") -> Dict[str, Any]:
    """Create or update a monthly limit for a category."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO budgets (category, monthly_limit, color)
            VALUES (?, ?, ?)
            ON CONFLICT(category) DO UPDATE SET monthly_limit=excluded.monthly_limit, color=excluded.color
            """,
            (category, monthly_limit, color),
        )
        conn.commit()
        cursor.execute("SELECT * FROM budgets WHERE category = ?", (category,))
        return dict(cursor.fetchone())


def delete_budget(budget_id: int) -> bool:
    """Delete a budget limit by ID."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM budgets WHERE id = ?", (budget_id,))
        conn.commit()
        return cursor.rowcount > 0


# --- CRUD: Goals ---

def get_goals() -> List[Dict[str, Any]]:
    """Return all financial goals with calculated progress percentages."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM goals ORDER BY id ASC")
        goals = [dict(g) for g in cursor.fetchall()]
        for g in goals:
            target = g["target_amount"]
            curr = g["current_amount"]
            g["progress_percent"] = round((curr / target * 100), 1) if target > 0 else 0.0
            g["remaining"] = round(max(0.0, target - curr), 2)
        return goals


def create_goal(title: str, target_amount: float, current_amount: float, target_date: str, category: str, color: str) -> Dict[str, Any]:
    """Create a new financial goal."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO goals (title, target_amount, current_amount, target_date, category, color)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (title, target_amount, current_amount, target_date, category, color),
        )
        goal_id = cursor.lastrowid
        conn.commit()
        cursor.execute("SELECT * FROM goals WHERE id = ?", (goal_id,))
        return dict(cursor.fetchone())


def deposit_to_goal(goal_id: int, amount: float, account_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
    """Deposit funds to a goal with optional deduction from a designated account."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE goals SET current_amount = current_amount + ? WHERE id = ?", (amount, goal_id))
        if account_id:
            cursor.execute("UPDATE accounts SET balance = balance - ? WHERE id = ?", (amount, account_id))
        conn.commit()
        cursor.execute("SELECT * FROM goals WHERE id = ?", (goal_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def delete_goal(goal_id: int) -> bool:
    """Delete a financial goal by ID."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM goals WHERE id = ?", (goal_id,))
        conn.commit()
        return cursor.rowcount > 0


# --- Overview & Financial Analytics ---

def get_financial_summary() -> Dict[str, Any]:
    """Calculate aggregate financial metrics across accounts and transactions."""
    with get_connection() as conn:
        cursor = conn.cursor()

        # Net worth (sum of all account balances)
        cursor.execute("SELECT COALESCE(SUM(balance), 0.0) as net_worth FROM accounts")
        net_worth = cursor.fetchone()["net_worth"]

        # Total income
        cursor.execute("SELECT COALESCE(SUM(amount), 0.0) as income FROM transactions WHERE type = 'income'")
        total_income = cursor.fetchone()["income"]

        # Total expenses
        cursor.execute("SELECT COALESCE(SUM(amount), 0.0) as expense FROM transactions WHERE type = 'expense'")
        total_expense = cursor.fetchone()["expense"]

        # Net Cash Flow and savings rate
        cash_flow = total_income - total_expense
        savings_rate = round((cash_flow / total_income * 100), 1) if total_income > 0 else 0.0

        # Top expense categories
        cursor.execute(
            """
            SELECT category, SUM(amount) as total
            FROM transactions
            WHERE type = 'expense'
            GROUP BY category
            ORDER BY total DESC
            LIMIT 5
            """
        )
        top_categories = [dict(r) for r in cursor.fetchall()]

        # Account breakdown
        cursor.execute("SELECT id, name, type, balance, color FROM accounts ORDER BY balance DESC")
        accounts_breakdown = [dict(r) for r in cursor.fetchall()]

        return {
            "net_worth": round(net_worth, 2),
            "total_income": round(total_income, 2),
            "total_expense": round(total_expense, 2),
            "cash_flow": round(cash_flow, 2),
            "savings_rate": savings_rate,
            "top_categories": top_categories,
            "accounts_breakdown": accounts_breakdown,
        }
