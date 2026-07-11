"""Real callable tools the agents can invoke via LLM function-calling.

Every tool is a plain, deterministic Python function — no external APIs,
so they're free and instant. Each LLM-backed agent (everything except the
CEO synthesis node, which doesn't call an LLM) gets exactly one tool suited
to its role.
"""

RUNWAY_TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "calculate_runway",
        "description": (
            "Calculate startup runway in months and net burn from cash on hand, "
            "monthly revenue, and monthly costs. Use whenever cash, budget, "
            "revenue, or cost figures are mentioned so numbers are exact."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "cash_on_hand": {"type": "number", "description": "Total cash available, in dollars."},
                "monthly_revenue": {"type": "number", "description": "Monthly revenue, in dollars. 0 if pre-revenue."},
                "monthly_costs": {"type": "number", "description": "Total monthly costs/burn, in dollars."},
            },
            "required": ["cash_on_hand", "monthly_costs"],
        },
    },
}

MARKET_SIZE_TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "estimate_market_size",
        "description": (
            "Estimate TAM (total addressable market) and realistic obtainable revenue "
            "from an audience size, price point, and expected penetration rate. Use "
            "whenever the founder gives a market size, user count, or pricing figure."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "total_addressable_users": {"type": "number", "description": "Total people/businesses who could plausibly buy."},
                "price_per_user": {"type": "number", "description": "Price per user, in dollars (per month or per year, be consistent)."},
                "penetration_rate": {
                    "type": "number",
                    "description": "Realistic fraction (0-1) of the TAM this business could capture. Default 0.01 (1%) if unsure.",
                },
            },
            "required": ["total_addressable_users", "price_per_user"],
        },
    },
}

BUILD_COST_TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "estimate_build_cost",
        "description": (
            "Estimate engineering hours, cost, and calendar time for an MVP from a "
            "rough feature count. Use whenever scoping technical effort."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "feature_count": {"type": "integer", "description": "Number of distinct core features/screens in the MVP."},
                "avg_hours_per_feature": {"type": "number", "description": "Average engineering hours per feature. Default 40."},
                "hourly_rate": {"type": "number", "description": "Blended engineering hourly rate in dollars. Default 75."},
            },
            "required": ["feature_count"],
        },
    },
}

RICE_TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "prioritize_features",
        "description": (
            "Score and rank a list of candidate features using the RICE framework "
            "(Reach x Impact x Confidence / Effort). Use whenever comparing multiple "
            "possible features or MVP scope options."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "features": {
                    "type": "array",
                    "description": "Candidate features to score.",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "reach": {"type": "number", "description": "Users affected per month, e.g. 500."},
                            "impact": {"type": "number", "description": "Impact per user: 0.25 low, 0.5 medium, 1 high, 2 massive."},
                            "confidence": {"type": "number", "description": "Confidence 0-1, e.g. 0.8."},
                            "effort": {"type": "number", "description": "Person-weeks of effort, e.g. 2."},
                        },
                        "required": ["name", "reach", "impact", "confidence", "effort"],
                    },
                }
            },
            "required": ["features"],
        },
    },
}

CAC_LTV_TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "estimate_cac_ltv",
        "description": (
            "Calculate CAC, LTV, and LTV:CAC ratio from ad spend, new customer count, "
            "revenue per customer, margin, and churn. Use whenever acquisition spend, "
            "conversion, price, or churn/retention figures are mentioned."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "monthly_ad_spend": {"type": "number", "description": "Total monthly acquisition spend, in dollars."},
                "new_customers_per_month": {"type": "number", "description": "New paying customers gained per month."},
                "avg_revenue_per_customer": {"type": "number", "description": "Average monthly revenue per customer, in dollars."},
                "gross_margin": {"type": "number", "description": "Gross margin as a fraction 0-1. Default 0.7."},
                "monthly_churn_rate": {"type": "number", "description": "Monthly churn as a fraction 0-1. Default 0.05."},
            },
            "required": ["monthly_ad_spend", "new_customers_per_month", "avg_revenue_per_customer"],
        },
    },
}

COMPLIANCE_TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "compliance_checklist",
        "description": (
            "Return the legal/compliance documents and reviews a business needs based "
            "on its type and data/payment handling. Use whenever assessing legal risk."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "business_type": {"type": "string", "description": "Short description, e.g. 'B2B SaaS', 'healthcare app', 'fintech'."},
                "handles_payments": {"type": "boolean", "description": "Whether the product directly processes payments."},
                "collects_personal_data": {"type": "boolean", "description": "Whether the product collects personal user data."},
            },
            "required": ["business_type"],
        },
    },
}

DEAL_ECONOMICS_TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "calculate_deal_economics",
        "description": (
            "Calculate how many deals and leads are needed to hit a revenue target "
            "given average deal size and close rate. Use whenever sales targets, deal "
            "size, or pipeline figures are mentioned."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "revenue_target": {"type": "number", "description": "Revenue goal in dollars."},
                "avg_deal_size": {"type": "number", "description": "Average deal size in dollars."},
                "close_rate": {"type": "number", "description": "Fraction of qualified leads that close, 0-1. Default 0.2."},
            },
            "required": ["revenue_target", "avg_deal_size"],
        },
    },
}

CONTRAST_TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "check_color_contrast",
        "description": (
            "Calculate the WCAG contrast ratio between two hex colors and whether it "
            "passes AA/AAA accessibility thresholds. Use whenever specific colors or "
            "a visual palette are proposed."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "foreground_hex": {"type": "string", "description": "Text/foreground color, e.g. '#111111'."},
                "background_hex": {"type": "string", "description": "Background color, e.g. '#FFFFFF'."},
            },
            "required": ["foreground_hex", "background_hex"],
        },
    },
}

SCHEDULE_TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "generate_weekly_schedule",
        "description": (
            "Distribute a list of tasks (with priority and estimated hours) across a "
            "Monday-Friday work week, capped at 6 focused hours/day, highest priority "
            "first. Use whenever turning a task list into an operating rhythm."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "tasks": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "title": {"type": "string"},
                            "priority": {"type": "string", "description": "High, Medium, or Low."},
                            "estimated_hours": {"type": "number"},
                        },
                        "required": ["title", "estimated_hours"],
                    },
                }
            },
            "required": ["tasks"],
        },
    },
}


TOOLS_BY_AGENT = {
    "market": [MARKET_SIZE_TOOL_SCHEMA],
    "cfo": [RUNWAY_TOOL_SCHEMA],
    "cto": [BUILD_COST_TOOL_SCHEMA],
    "product": [RICE_TOOL_SCHEMA],
    "marketing": [CAC_LTV_TOOL_SCHEMA],
    "legal": [COMPLIANCE_TOOL_SCHEMA],
    "sales": [DEAL_ECONOMICS_TOOL_SCHEMA],
    "designer": [CONTRAST_TOOL_SCHEMA],
    "assistant": [SCHEDULE_TOOL_SCHEMA],
}

def calculate_runway(cash_on_hand: float, monthly_costs: float, monthly_revenue: float = 0.0) -> dict:
    net_burn = max(monthly_costs - monthly_revenue, 0.0)
    if net_burn <= 0:
        return {
            "runway_months": None,
            "net_burn": 0,
            "note": "Revenue covers or exceeds costs; runway is effectively unlimited at current burn.",
        }
    runway_months = round(cash_on_hand / net_burn, 1)
    return {
        "runway_months": runway_months,
        "net_burn": round(net_burn, 2),
        "note": f"At a net burn of ${net_burn:,.0f}/month, cash lasts about {runway_months} months.",
    }


def estimate_market_size(
    total_addressable_users: float, price_per_user: float, penetration_rate: float = 0.01
) -> dict:
    penetration_rate = max(0.0, min(penetration_rate, 1.0))
    tam = total_addressable_users * price_per_user
    obtainable_revenue = tam * penetration_rate
    return {
        "tam": round(tam, 2),
        "penetration_rate_used": penetration_rate,
        "estimated_obtainable_revenue": round(obtainable_revenue, 2),
        "note": f"At {penetration_rate:.1%} penetration, obtainable revenue is about ${obtainable_revenue:,.0f}.",
    }


def estimate_build_cost(feature_count: int, avg_hours_per_feature: float = 40, hourly_rate: float = 75) -> dict:
    total_hours = feature_count * avg_hours_per_feature
    total_cost = total_hours * hourly_rate
    weeks_one_engineer = round(total_hours / 40, 1)
    return {
        "total_hours": round(total_hours, 1),
        "estimated_cost": round(total_cost, 2),
        "estimated_weeks_one_engineer": weeks_one_engineer,
        "note": f"~{total_hours:.0f} hours (~{weeks_one_engineer} weeks for one engineer), ~${total_cost:,.0f}.",
    }


def prioritize_features(features: list[dict]) -> dict:
    scored = []
    for feature in features:
        reach = float(feature.get("reach", 0))
        impact = float(feature.get("impact", 0))
        confidence = float(feature.get("confidence", 0))
        effort = float(feature.get("effort", 0)) or 1.0
        score = round((reach * impact * confidence) / effort, 2)
        scored.append({"name": feature.get("name", "Unnamed"), "rice_score": score})
    scored.sort(key=lambda f: f["rice_score"], reverse=True)
    return {"ranked_features": scored}


def estimate_cac_ltv(
    monthly_ad_spend: float,
    new_customers_per_month: float,
    avg_revenue_per_customer: float,
    gross_margin: float = 0.7,
    monthly_churn_rate: float = 0.05,
) -> dict:
    if new_customers_per_month <= 0:
        return {"error": "new_customers_per_month must be greater than 0"}
    cac = round(monthly_ad_spend / new_customers_per_month, 2)
    if monthly_churn_rate <= 0:
        avg_lifetime_months = None
        ltv = None
    else:
        avg_lifetime_months = round(1 / monthly_churn_rate, 1)
        ltv = round(avg_revenue_per_customer * gross_margin * avg_lifetime_months, 2)
    ratio = round(ltv / cac, 2) if ltv and cac else None
    verdict = "healthy (3:1 or better)" if ratio and ratio >= 3 else "needs improvement" if ratio else "insufficient data"
    return {
        "cac": cac,
        "ltv": ltv,
        "ltv_to_cac_ratio": ratio,
        "avg_customer_lifetime_months": avg_lifetime_months,
        "verdict": verdict,
    }


def compliance_checklist(
    business_type: str, handles_payments: bool = False, collects_personal_data: bool = True
) -> dict:
    checklist = ["Terms of Service", "Privacy Policy"]
    if collects_personal_data:
        checklist += ["Data processing agreement", "Cookie/consent banner"]
    if handles_payments:
        checklist += ["PCI-DSS compliance review", "Refund and cancellation policy"]
    lowered = business_type.lower()
    if any(word in lowered for word in ["health", "medical", "clinic", "patient"]):
        checklist.append("HIPAA compliance review")
    if any(word in lowered for word in ["fintech", "bank", "lending", "payments", "financial"]):
        checklist.append("Money transmitter / financial license review")
    if any(word in lowered for word in ["kids", "children", "teen", "student"]):
        checklist.append("COPPA compliance review")
    return {"checklist": checklist}


def calculate_deal_economics(revenue_target: float, avg_deal_size: float, close_rate: float = 0.2) -> dict:
    if avg_deal_size <= 0:
        return {"error": "avg_deal_size must be greater than 0"}
    deals_needed = round(revenue_target / avg_deal_size, 1)
    close_rate = max(0.01, min(close_rate, 1.0))
    leads_needed = round(deals_needed / close_rate, 1)
    return {
        "deals_needed": deals_needed,
        "leads_needed": leads_needed,
        "note": f"Need ~{deals_needed} closed deals from ~{leads_needed} qualified leads at a {close_rate:.0%} close rate.",
    }


def _srgb_to_linear(channel: float) -> float:
    channel /= 255
    return channel / 12.92 if channel <= 0.04045 else ((channel + 0.055) / 1.055) ** 2.4


def _relative_luminance(hex_color: str) -> float:
    hex_color = hex_color.lstrip("#")
    if len(hex_color) == 3:
        hex_color = "".join(c * 2 for c in hex_color)
    r, g, b = (int(hex_color[i : i + 2], 16) for i in (0, 2, 4))
    r, g, b = _srgb_to_linear(r), _srgb_to_linear(g), _srgb_to_linear(b)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def check_color_contrast(foreground_hex: str, background_hex: str) -> dict:
    try:
        l1 = _relative_luminance(foreground_hex)
        l2 = _relative_luminance(background_hex)
    except ValueError:
        return {"error": "Colors must be valid hex codes, e.g. #111111"}
    lighter, darker = max(l1, l2), min(l1, l2)
    ratio = round((lighter + 0.05) / (darker + 0.05), 2)
    return {
        "contrast_ratio": ratio,
        "passes_aa_normal_text": ratio >= 4.5,
        "passes_aa_large_text": ratio >= 3,
        "passes_aaa_normal_text": ratio >= 7,
    }


def generate_weekly_schedule(tasks: list[dict]) -> dict:
    priority_order = {"high": 0, "medium": 1, "low": 2}
    ordered = sorted(tasks, key=lambda t: priority_order.get(str(t.get("priority", "medium")).lower(), 1))
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    schedule = {day: [] for day in days}
    hours_used = {day: 0.0 for day in days}
    for task in ordered:
        hours = float(task.get("estimated_hours", 1))
        placed = False
        for day in days:
            if hours_used[day] + hours <= 6:
                schedule[day].append(task.get("title", "Untitled task"))
                hours_used[day] += hours
                placed = True
                break
        if not placed:
            lightest_day = min(hours_used, key=hours_used.get)
            schedule[lightest_day].append(f"{task.get('title', 'Untitled task')} (overflow)")
            hours_used[lightest_day] += hours
    return {"schedule": schedule}


TOOL_IMPLEMENTATIONS = {
    "calculate_runway": calculate_runway,
    "estimate_market_size": estimate_market_size,
    "estimate_build_cost": estimate_build_cost,
    "prioritize_features": prioritize_features,
    "estimate_cac_ltv": estimate_cac_ltv,
    "compliance_checklist": compliance_checklist,
    "calculate_deal_economics": calculate_deal_economics,
    "check_color_contrast": check_color_contrast,
    "generate_weekly_schedule": generate_weekly_schedule,
}
