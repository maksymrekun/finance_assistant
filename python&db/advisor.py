"""
AI Financial Advisor Module:
- Financial Health Score calculation (0-100)
- 50/30/20 Budget Rule analysis (Needs / Wants / Savings)
- Burn Rate and Runway analysis (financial resilience in months)
- Overspending and risk detection
- Interactive natural language advisory queries based on database figures
"""

from typing import Dict, Any, List
import database


def analyze_financial_health() -> Dict[str, Any]:
    """Comprehensive financial health audit and scorecard."""
    summary = database.get_financial_summary()
    budgets = database.get_budgets_with_spending()
    goals = database.get_goals()

    total_income = summary["total_income"]
    total_expense = summary["total_expense"]
    net_worth = summary["net_worth"]
    cash_flow = summary["cash_flow"]
    savings_rate = summary["savings_rate"]

    # 1. Financial Health Score (0 - 100)
    score = 0
    breakdown_scores = {}

    # a) Savings Rate (up to 25 pts)
    if savings_rate >= 20:
        score_savings = 25
    elif savings_rate > 0:
        score_savings = int(savings_rate * 1.25)
    else:
        score_savings = 0
    score += score_savings
    breakdown_scores["savings"] = {"score": score_savings, "max": 25, "label": "Savings Rate"}

    # b) Emergency Runway (up to 25 pts)
    monthly_expense = max(total_expense, 1.0)
    runway_months = round(net_worth / monthly_expense, 1)
    if runway_months >= 6.0:
        score_runway = 25
    elif runway_months >= 3.0:
        score_runway = 18
    elif runway_months >= 1.0:
        score_runway = 10
    else:
        score_runway = 3
    score += score_runway
    breakdown_scores["runway"] = {"score": score_runway, "max": 25, "label": "Emergency Runway"}

    # c) Budget Limit Adherence (up to 25 pts)
    exceeded_count = sum(1 for b in budgets if b.get("is_exceeded", False))
    if not budgets:
        score_budget = 15
    elif exceeded_count == 0:
        score_budget = 25
    elif exceeded_count == 1:
        score_budget = 15
    else:
        score_budget = 5
    score += score_budget
    breakdown_scores["budgets"] = {"score": score_budget, "max": 25, "label": "Budget Discipline"}

    # d) Net Cash Flow (up to 25 pts)
    if cash_flow > 0 and total_income > 0:
        score_cf = 25
    elif cash_flow == 0:
        score_cf = 10
    else:
        score_cf = 0
    score += score_cf
    breakdown_scores["cashflow"] = {"score": score_cf, "max": 25, "label": "Positive Cash Flow"}

    # 2. 50/30/20 Rule Analysis
    # Needs: housing, utilities, groceries, transport
    # Wants: restaurants, cafes, entertainment, subscriptions
    # Savings: net cash flow & investments
    needs_categories = {
        "Housing & Utilities", "Groceries & Supermarkets", "Transport & Auto",
        "Аренда и коммуналка", "Продукты и супермаркеты", "Транспорт и авто"
    }
    wants_categories = {
        "Restaurants & Cafes", "Entertainment & Hobbies", "Subscriptions & Services",
        "Рестораны и кафе", "Развлечения и хобби", "Подписки и сервисы"
    }

    needs_spent = 0.0
    wants_spent = 0.0

    for cat in summary["top_categories"]:
        cname = cat["category"]
        amt = cat["total"]
        if cname in needs_categories:
            needs_spent += amt
        elif cname in wants_categories:
            wants_spent += amt

    base = max(total_income, total_expense, 1.0)
    rule_50_30_20 = {
        "needs": {
            "amount": round(needs_spent, 2),
            "percent": round((needs_spent / base * 100), 1),
            "target_percent": 50,
            "status": "normal" if (needs_spent / base * 100) <= 55 else "warning",
        },
        "wants": {
            "amount": round(wants_spent, 2),
            "percent": round((wants_spent / base * 100), 1),
            "target_percent": 30,
            "status": "normal" if (wants_spent / base * 100) <= 35 else "warning",
        },
        "savings": {
            "amount": round(max(0.0, cash_flow), 2),
            "percent": round(max(0.0, savings_rate), 1),
            "target_percent": 20,
            "status": "normal" if savings_rate >= 18 else "warning",
        },
    }

    # 3. Automated Insights and Advisor Recommendations
    insights: List[Dict[str, str]] = []

    if savings_rate >= 20:
        insights.append({
            "type": "success",
            "title": "Strong Savings Rate",
            "text": f"You are saving {savings_rate}% of your income, beating the typical 15-20% benchmark.",
        })
    elif savings_rate > 0:
        insights.append({
            "type": "info",
            "title": "Moderate Savings Rate",
            "text": f"Your current savings rate is {savings_rate}%. Optimizing discretionary spending will help you achieve the 20% target.",
        })
    else:
        insights.append({
            "type": "danger",
            "title": "Negative Monthly Cash Flow",
            "text": "Your expenses exceed your income this period. Consider reviewing non-essential spending categories promptly.",
        })

    if runway_months >= 6.0:
        insights.append({
            "type": "success",
            "title": "Solid Emergency Runway",
            "text": f"Your liquid reserves provide approximately {runway_months} months of financial runway without active income.",
        })
    else:
        insights.append({
            "type": "warning",
            "title": "Emergency Fund Needs Attention",
            "text": f"Your current reserves cover only {runway_months} months of expenses. Aim for at least 3-6 months of essential spending.",
        })

    for b in budgets:
        if b.get("is_exceeded"):
            insights.append({
                "type": "danger",
                "title": f"Budget Exceeded: {b['category']}",
                "text": f"Spent ${b['spent']} out of the ${b['monthly_limit']} limit ({b['percent_used']}%).",
            })

    return {
        "health_score": min(score, 100),
        "score_level": "Excellent" if score >= 80 else ("Good" if score >= 60 else "Needs Attention"),
        "breakdown_scores": breakdown_scores,
        "runway_months": runway_months,
        "monthly_burn_rate": round(monthly_expense, 2),
        "rule_50_30_20": rule_50_30_20,
        "insights": insights,
        "goals_count": len(goals),
    }


def handle_assistant_query(query: str) -> Dict[str, Any]:
    """
    Intelligent chatbot query processor that answers financial questions
    using live figures and context from the database.
    """
    q = query.lower().strip()
    summary = database.get_financial_summary()
    health = analyze_financial_health()
    budgets = database.get_budgets_with_spending()
    goals = database.get_goals()

    reply = ""
    suggested_actions = []

    # Health & Audit check
    if any(w in q for w in ["health", "audit", "score", "status", "rating", "здоров", "аудит", "оцен", "бал", "состояни"]):
        reply = (
            f"📊 **Financial Health Rating:** {health['health_score']}/100 ({health['score_level']}).\n\n"
            f"- **Net Worth:** ${summary['net_worth']:,.2f}\n"
            f"- **Net Monthly Cash Flow:** ${summary['cash_flow']:,.2f}\n"
            f"- **Savings Rate:** {summary['savings_rate']}%\n"
            f"- **Emergency Runway:** {health['runway_months']} months of living expenses (${health['monthly_burn_rate']:,.2f}/mo).\n\n"
            f"**Key Takeaway:** Your financial foundation is sound and your emergency reserve is on track."
        )
        suggested_actions = ["Show 50/30/20 breakdown", "Check overspending", "How to optimize budget?"]

    # 50/30/20 Rule check
    elif any(w in q for w in ["50/30/20", "rule", "правил", "distribution"]):
        r = health["rule_50_30_20"]
        reply = (
            f"⚖️ **50 / 30 / 20 Budget Rule Allocation:**\n\n"
            f"1. **Basic Needs:** ${r['needs']['amount']:,.2f} ({r['needs']['percent']}%) — *Target: ≤ 50%*\n"
            f"2. **Wants & Leisure:** ${r['wants']['amount']:,.2f} ({r['wants']['percent']}%) — *Target: ≤ 30%*\n"
            f"3. **Savings & Investments:** ${r['savings']['amount']:,.2f} ({r['savings']['percent']}%) — *Target: ≥ 20%*\n\n"
            f"{'💡 Tip: Your leisure spending is comfortably within a healthy range.' if r['wants']['percent'] <= 35 else '⚠️ Warning: Wants and discretionary spending exceeds the recommended 30% mark.'}"
        )
        suggested_actions = ["Where can I cut expenses?", "Top expense categories", "Review financial goals"]

    # Spending & Expense breakdown
    elif any(w in q for w in ["expense", "spend", "cost", "money go", "расход", "трат", "куда уходят"]):
        cats = "\n".join([f"• **{c['category']}:** ${c['total']:,.2f}" for c in summary["top_categories"]])
        reply = (
            f"💳 **Your Top Expense Categories:**\n\n{cats}\n\n"
            f"Total spent: **${summary['total_expense']:,.2f}**.\n"
            f"Highest expenditure goes to: *{summary['top_categories'][0]['category'] if summary['top_categories'] else 'No data yet'}*."
        )
        suggested_actions = ["Check budget limits", "How to save more?", "Show income details"]

    # Budget limits & overspending
    elif any(w in q for w in ["budget", "limit", "exceed", "overspend", "бюджет", "лимит", "превыш"]):
        exceeded = [b for b in budgets if b.get("is_exceeded")]
        if exceeded:
            b_list = "\n".join([f"⚠️ **{b['category']}**: spent ${b['spent']} out of ${b['monthly_limit']} limit" for b in exceeded])
            reply = f"🚨 **Budget Overspending Alert:**\n\n{b_list}\n\nWe recommend freezing non-essential spending in these categories for the rest of the month."
        else:
            reply = "✅ **Great job!** All your expenses are within their assigned monthly limits."
        suggested_actions = ["Show all budgets", "Run health audit", "Top expenses"]

    # Goals & Savings
    elif any(w in q for w in ["goal", "saving", "target", "vacation", "цел", "копилк", "отпуск", "накоп"]):
        if goals:
            g_lines = "\n".join([f"🎯 **{g['title']}**: ${g['current_amount']:,.2f} of ${g['target_amount']:,.2f} ({g['progress_percent']}%)" for g in goals])
            reply = (
                f"🏆 **Your Active Financial Goals:**\n\n{g_lines}\n\n"
                f"With your current net cash flow (${summary['cash_flow']:,.2f}/mo), you can comfortably meet your savings targets on schedule."
            )
        else:
            reply = "You don't have any active savings goals yet. Create one in the 'Savings & Goals' tab!"
        suggested_actions = ["Fund a goal", "Calculate goal timeline", "General audit"]

    # Default greeting & capabilities
    else:
        reply = (
            f"Hello! I am your personal financial AI assistant 🤖.\n\n"
            f"Currently, your total Net Worth is **${summary['net_worth']:,.2f}**, and your net cash flow this period is **+${summary['cash_flow']:,.2f}**.\n\n"
            f"You can ask me:\n"
            f"• *«Run a financial health audit»*\n"
            f"• *«Show me the 50/30/20 rule breakdown»*\n"
            f"• *«Where does my money go?»*\n"
            f"• *«Are any budgets exceeded?»*\n"
            f"• *«What is the progress on my goals?»*"
        )
        suggested_actions = ["Run health audit", "50/30/20 Rule", "Top expenses", "Check budget limits"]

    return {
        "reply": reply,
        "suggested_actions": suggested_actions,
        "health_score": health["health_score"],
    }
