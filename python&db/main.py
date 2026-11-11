import os
import json
import urllib.request
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
import uvicorn

import database
import advisor

# Initialize database schema and initial demo seed data if needed
database.init_db()

app = FastAPI(
    title="SmartFinance Pro & AI Advisor",
    description="Advanced personal finance assistant with budgeting, goal tracking, and AI-powered health auditing.",
    version="2.0.0",
)


# --- Pydantic Schemas ---

class AccountCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    type: str = Field("bank", description="bank, cash, savings, crypto")
    currency: str = Field("USD", max_length=10)
    balance: float = Field(0.0)
    color: str = Field("#6366f1")


class TransactionCreate(BaseModel):
    account_id: int
    type: str = Field(..., description="income or expense")
    amount: float = Field(..., gt=0)
    category: str
    subcategory: Optional[str] = ""
    date: str
    description: Optional[str] = ""
    tags: Optional[str] = ""
    is_recurring: Optional[int] = 0


class BudgetCreate(BaseModel):
    category: str
    monthly_limit: float = Field(..., gt=0)
    color: Optional[str] = "#f59e0b"


class GoalCreate(BaseModel):
    title: str
    target_amount: float = Field(..., gt=0)
    current_amount: Optional[float] = 0.0
    target_date: Optional[str] = None
    category: Optional[str] = "General"
    color: Optional[str] = "#10b981"


class GoalDeposit(BaseModel):
    amount: float = Field(..., gt=0)
    account_id: Optional[int] = None


class ChatMessage(BaseModel):
    message: str


# --- Endpoints: Accounts ---

@app.get("/api/accounts")
def list_accounts():
    """Retrieve all accounts."""
    return database.get_accounts()


@app.post("/api/accounts", status_code=201)
def add_account(payload: AccountCreate):
    """Create a new account or wallet."""
    return database.create_account(
        name=payload.name,
        acc_type=payload.type,
        currency=payload.currency,
        balance=payload.balance,
        color=payload.color,
    )


@app.delete("/api/accounts/{account_id}")
def remove_account(account_id: int):
    """Delete an account by ID."""
    success = database.delete_account(account_id)
    if not success:
        raise HTTPException(status_code=404, detail="Account not found")
    return {"status": "success", "message": f"Account #{account_id} deleted"}


# --- Endpoints: Transactions ---

@app.get("/api/transactions")
def list_transactions(
    account_id: Optional[int] = Query(None),
    type: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
):
    """List transactions with optional search and filters."""
    return database.get_transactions(
        account_id=account_id,
        trans_type=type,
        category=category,
        search=search,
        limit=limit,
    )


@app.post("/api/transactions", status_code=201)
def add_transaction(payload: TransactionCreate):
    """Create a new transaction and update the account balance."""
    return database.create_transaction(
        account_id=payload.account_id,
        trans_type=payload.type,
        amount=payload.amount,
        category=payload.category,
        subcategory=payload.subcategory or "",
        date_str=payload.date,
        description=payload.description or "",
        tags=payload.tags or "",
        is_recurring=payload.is_recurring or 0,
    )


@app.delete("/api/transactions/{transaction_id}")
def remove_transaction(transaction_id: int):
    """Delete a transaction and restore the account balance."""
    success = database.delete_transaction(transaction_id)
    if not success:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"status": "success", "message": f"Transaction #{transaction_id} deleted"}


# --- Endpoints: Budgets ---

@app.get("/api/budgets")
def list_budgets():
    """Retrieve all category budgets along with current spending."""
    return database.get_budgets_with_spending()


@app.post("/api/budgets")
def set_budget(payload: BudgetCreate):
    """Create or update a monthly category budget limit."""
    return database.create_or_update_budget(
        category=payload.category,
        monthly_limit=payload.monthly_limit,
        color=payload.color or "#6366f1",
    )


@app.delete("/api/budgets/{budget_id}")
def remove_budget(budget_id: int):
    """Delete a budget limit by ID."""
    success = database.delete_budget(budget_id)
    if not success:
        raise HTTPException(status_code=404, detail="Budget not found")
    return {"status": "success"}


# --- Endpoints: Financial Goals ---

@app.get("/api/goals")
def list_goals():
    """Retrieve all savings goals."""
    return database.get_goals()


@app.post("/api/goals", status_code=201)
def add_goal(payload: GoalCreate):
    """Create a new financial goal."""
    return database.create_goal(
        title=payload.title,
        target_amount=payload.target_amount,
        current_amount=payload.current_amount or 0.0,
        target_date=payload.target_date or "",
        category=payload.category or "General",
        color=payload.color or "#10b981",
    )


@app.post("/api/goals/{goal_id}/deposit")
def top_up_goal(goal_id: int, payload: GoalDeposit):
    """Deposit funds into a financial goal with optional account deduction."""
    updated = database.deposit_to_goal(
        goal_id=goal_id,
        amount=payload.amount,
        account_id=payload.account_id,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Goal not found")
    return updated


@app.delete("/api/goals/{goal_id}")
def remove_goal(goal_id: int):
    """Delete a goal by ID."""
    success = database.delete_goal(goal_id)
    if not success:
        raise HTTPException(status_code=404, detail="Goal not found")
    return {"status": "success"}


# --- Endpoints: Summary, Analytics and AI Advisor ---

@app.get("/api/summary")
def get_summary():
    """Get high-level financial summary and KPI metrics."""
    return database.get_financial_summary()


@app.get("/api/advisor/health")
def get_advisor_health():
    """Run financial health score calculations and rule breakdown."""
    return advisor.analyze_financial_health()


@app.post("/api/advisor/chat")
def chat_with_advisor(payload: ChatMessage):
    """Process natural language questions with the AI financial advisor."""
    return advisor.handle_assistant_query(payload.message)


@app.get("/api/nbp-rates")
def get_nbp_exchange_rates():
    """Fetch live currency exchange rates via NBP API with offline fallback."""
    try:
        url = "https://api.nbp.pl/api/exchangerates/tables/A/?format=json"
        req = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": "FinanceAssistant/2.0"})
        with urllib.request.urlopen(req, timeout=4) as resp:
            data = json.loads(resp.read().decode())
            rates = {r["code"]: r["mid"] for r in data[0]["rates"] if r["code"] in ["USD", "EUR", "GBP", "CHF"]}
            rates["PLN"] = 1.0
            return {"date": data[0]["effectiveDate"], "rates": rates, "source": "NBP (Narodowy Bank Polski)"}
    except Exception:
        # Fallback rates in case network access is restricted
        return {
            "date": "live (offline fallback)",
            "rates": {"USD": 4.02, "EUR": 4.35, "GBP": 5.08, "CHF": 4.56, "PLN": 1.0},
            "source": "Offline Fallback",
        }


# Mount static assets for frontend single page application
static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")


if __name__ == "__main__":
    port = 8001
    print(f"💰 SmartFinance Assistant running on http://127.0.0.1:{port}")
    print(f"📚 Swagger API Docs: http://127.0.0.1:{port}/docs")
    uvicorn.run("main:app", host="127.0.0.1", port=port, reload=True)
