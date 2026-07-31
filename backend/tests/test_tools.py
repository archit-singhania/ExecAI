import pytest

from app.tools import (
    TOOL_IMPLEMENTATIONS,
    TOOLS_BY_AGENT,
    calculate_deal_economics,
    calculate_runway,
    check_color_contrast,
    compliance_checklist,
    estimate_build_cost,
    estimate_cac_ltv,
    estimate_market_size,
    generate_weekly_schedule,
    prioritize_features,
)


def test_every_registered_tool_is_implemented():
    for agent, tools in TOOLS_BY_AGENT.items():
        for tool in tools:
            name = tool["function"]["name"]
            assert name in TOOL_IMPLEMENTATIONS, f"{agent} declares {name} with no implementation"


def test_every_implementation_is_callable():
    for name, impl in TOOL_IMPLEMENTATIONS.items():
        assert callable(impl), f"{name} is not callable"


# --------------------------------------------------------------------------
# runway
# --------------------------------------------------------------------------

def test_runway_divides_cash_by_net_burn():
    result = calculate_runway(cash_on_hand=60000, monthly_costs=10000)
    assert result["runway_months"] == 6.0
    assert result["net_burn"] == 10000


def test_revenue_reduces_burn():
    result = calculate_runway(cash_on_hand=60000, monthly_costs=10000, monthly_revenue=5000)
    assert result["runway_months"] == 12.0
    assert result["net_burn"] == 5000


def test_profitable_company_has_unlimited_runway():
    """A profitable business must never be reported as running out of cash."""
    result = calculate_runway(cash_on_hand=10000, monthly_costs=5000, monthly_revenue=8000)
    assert result["runway_months"] is None
    assert result["net_burn"] == 0


def test_breaking_even_is_not_a_division_by_zero():
    result = calculate_runway(cash_on_hand=10000, monthly_costs=5000, monthly_revenue=5000)
    assert result["runway_months"] is None


def test_zero_cash_gives_zero_runway():
    result = calculate_runway(cash_on_hand=0, monthly_costs=5000)
    assert result["runway_months"] == 0.0


# --------------------------------------------------------------------------
# market size
# --------------------------------------------------------------------------

def test_market_size_multiplies_users_by_price():
    result = estimate_market_size(total_addressable_users=100000, price_per_user=10)
    assert result["tam"] == 1000000


def test_penetration_is_clamped_to_a_fraction():
    """A penetration rate above 1 would invent revenue that cannot exist."""
    high = estimate_market_size(1000, 10, penetration_rate=5.0)
    low = estimate_market_size(1000, 10, penetration_rate=-2.0)

    assert high["penetration_rate_used"] == 1.0
    assert low["penetration_rate_used"] == 0.0
    assert high["estimated_obtainable_revenue"] <= high["tam"]


def test_obtainable_revenue_never_exceeds_tam():
    for rate in (0.0, 0.01, 0.5, 1.0):
        result = estimate_market_size(50000, 25, penetration_rate=rate)
        assert result["estimated_obtainable_revenue"] <= result["tam"]


# --------------------------------------------------------------------------
# build cost
# --------------------------------------------------------------------------

def test_build_cost_scales_with_features():
    one = estimate_build_cost(feature_count=1)
    five = estimate_build_cost(feature_count=5)
    assert five["estimated_cost"] == one["estimated_cost"] * 5


def test_weeks_assume_a_forty_hour_week():
    result = estimate_build_cost(feature_count=2, avg_hours_per_feature=40)
    assert result["total_hours"] == 80
    assert result["estimated_weeks_one_engineer"] == 2.0


def test_zero_features_costs_nothing():
    result = estimate_build_cost(feature_count=0)
    assert result["estimated_cost"] == 0


# --------------------------------------------------------------------------
# prioritisation
# --------------------------------------------------------------------------

def test_rice_ranks_highest_score_first():
    result = prioritize_features(
        [
            {"name": "Low", "reach": 10, "impact": 1, "confidence": 0.5, "effort": 10},
            {"name": "High", "reach": 100, "impact": 3, "confidence": 0.9, "effort": 2},
        ]
    )
    assert result["ranked_features"][0]["name"] == "High"


def test_zero_effort_does_not_divide_by_zero():
    result = prioritize_features([{"name": "Free lunch", "reach": 10, "impact": 3, "confidence": 1, "effort": 0}])
    assert result["ranked_features"][0]["rice_score"] > 0


def test_missing_fields_default_to_zero():
    result = prioritize_features([{"name": "Sparse"}])
    assert result["ranked_features"][0]["rice_score"] == 0


def test_unnamed_features_still_rank():
    result = prioritize_features([{"reach": 5, "impact": 2, "confidence": 1, "effort": 1}])
    assert result["ranked_features"][0]["name"] == "Unnamed"


# --------------------------------------------------------------------------
# CAC / LTV
# --------------------------------------------------------------------------

def test_cac_is_spend_divided_by_customers():
    result = estimate_cac_ltv(
        monthly_ad_spend=1000,
        new_customers_per_month=20,
        avg_revenue_per_customer=50,
    )
    assert result["cac"] == 50.0


def test_zero_customers_returns_an_error_not_infinity():
    result = estimate_cac_ltv(
        monthly_ad_spend=1000,
        new_customers_per_month=0,
        avg_revenue_per_customer=50,
    )
    assert "error" in result


def test_zero_churn_does_not_divide_by_zero():
    result = estimate_cac_ltv(
        monthly_ad_spend=1000,
        new_customers_per_month=20,
        avg_revenue_per_customer=50,
        monthly_churn_rate=0,
    )
    assert "error" not in result


# --------------------------------------------------------------------------
# deal economics
# --------------------------------------------------------------------------

def test_deals_needed_scales_with_target():
    small = calculate_deal_economics(revenue_target=10000, avg_deal_size=1000)
    large = calculate_deal_economics(revenue_target=100000, avg_deal_size=1000)

    assert small["deals_needed"] == 10.0
    assert large["deals_needed"] == 100.0


def test_leads_account_for_close_rate():
    result = calculate_deal_economics(revenue_target=10000, avg_deal_size=1000, close_rate=0.25)
    assert result["deals_needed"] == 10.0
    assert result["leads_needed"] == 40.0


def test_close_rate_is_clamped():
    """A close rate of zero would demand infinite leads."""
    zero = calculate_deal_economics(revenue_target=10000, avg_deal_size=1000, close_rate=0)
    over = calculate_deal_economics(revenue_target=10000, avg_deal_size=1000, close_rate=5)

    assert zero["leads_needed"] == 1000.0
    assert over["leads_needed"] == over["deals_needed"]


def test_deal_economics_rejects_a_zero_deal_size():
    result = calculate_deal_economics(revenue_target=10000, avg_deal_size=0)
    assert "error" in result


# --------------------------------------------------------------------------
# contrast
# --------------------------------------------------------------------------

def test_black_on_white_is_maximum_contrast():
    result = check_color_contrast("#000000", "#FFFFFF")
    assert round(result["contrast_ratio"]) == 21


def test_identical_colours_have_no_contrast():
    result = check_color_contrast("#777777", "#777777")
    assert round(result["contrast_ratio"], 1) == 1.0


def test_contrast_is_symmetric():
    forward = check_color_contrast("#123456", "#EEEEEE")["contrast_ratio"]
    backward = check_color_contrast("#EEEEEE", "#123456")["contrast_ratio"]
    assert round(forward, 3) == round(backward, 3)


@pytest.mark.parametrize("value", ["000000", "#000", "#000000"])
def test_hex_formats_are_tolerated(value):
    result = check_color_contrast(value, "#FFFFFF")
    assert isinstance(result, dict)


# --------------------------------------------------------------------------
# compliance + schedule
# --------------------------------------------------------------------------

def test_compliance_always_includes_the_basics():
    result = compliance_checklist(business_type="saas")
    assert "Terms of Service" in result["checklist"]
    assert "Privacy Policy" in result["checklist"]


def test_payment_handling_adds_pci_obligations():
    without = compliance_checklist(business_type="saas", handles_payments=False)
    with_payments = compliance_checklist(business_type="saas", handles_payments=True)

    assert "PCI-DSS compliance review" not in without["checklist"]
    assert "PCI-DSS compliance review" in with_payments["checklist"]


def test_personal_data_can_be_opted_out():
    without = compliance_checklist(business_type="saas", collects_personal_data=False)
    assert "Data processing agreement" not in without["checklist"]


@pytest.mark.parametrize(
    "business,expected",
    [
        ("a clinic booking tool", "HIPAA compliance review"),
        ("patient records platform", "HIPAA compliance review"),
        ("a fintech lending app", "Money transmitter / financial license review"),
        ("banking for freelancers", "Money transmitter / financial license review"),
        ("homework help for students", "COPPA compliance review"),
        ("an app for kids", "COPPA compliance review"),
    ],
)
def test_regulated_domains_are_detected(business, expected):
    """These three are the ones that carry real legal weight, so the keyword
    matching for them is worth pinning down."""
    result = compliance_checklist(business_type=business)
    assert expected in result["checklist"]


def test_ordinary_saas_avoids_regulated_flags():
    result = compliance_checklist(business_type="project management for agencies")
    joined = " ".join(result["checklist"])
    assert "HIPAA" not in joined
    assert "COPPA" not in joined


def test_weekly_schedule_accepts_tasks():
    result = generate_weekly_schedule(
        [
            {"title": "Interview customers", "priority": "High"},
            {"title": "Draft landing page", "priority": "Medium"},
        ]
    )
    assert isinstance(result, dict)
    assert result


def test_weekly_schedule_handles_no_tasks():
    result = generate_weekly_schedule([])
    assert isinstance(result, dict)
