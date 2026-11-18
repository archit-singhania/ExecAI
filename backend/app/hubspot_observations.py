"""Translate read-only deal snapshots into the existing KPI staging contract."""

import csv
import io
from datetime import datetime, timezone

import httpx

from app.csv_imports import Columns, CsvInput


DEALS_SEARCH = "https://api.hubapi.com/crm/v3/objects/deals/search"


def fetch_deal_page(client, access_token, *, since_ms, until_ms, after=None):
    """Read one page from a fixed, half-open modification window."""
    if since_ms < 0 or until_ms <= since_ms:
        raise ValueError("Expected a valid HubSpot synchronization window")
    query = {
        "filterGroups": [{"filters": [
            {"propertyName": "hs_lastmodifieddate", "operator": "GTE", "value": str(since_ms)},
            {"propertyName": "hs_lastmodifieddate", "operator": "LT", "value": str(until_ms)},
        ]}],
        "properties": ["amount", "deal_currency_code"],
        "sorts": ["hs_lastmodifieddate"],
        "limit": 200,
    }
    if after is not None:
        query["after"] = str(after)
    try:
        response = client.post(
            DEALS_SEARCH, json=query, headers={"Authorization": f"Bearer {access_token}"},
            timeout=15, follow_redirects=False,
        )
        response.raise_for_status()
        page = response.json()
    except (httpx.HTTPError, ValueError):
        raise RuntimeError("HubSpot could not return this synchronization page") from None
    if not isinstance(page, dict) or not isinstance(page.get("results"), list):
        raise RuntimeError("HubSpot returned an invalid deal page")
    if isinstance(page.get("total"), int) and page["total"] > 10_000:
        raise RuntimeError("Split the HubSpot synchronization window before continuing")
    paging = page.get("paging", {}).get("next", {})
    cursor = paging.get("after")
    if cursor is not None and str(cursor) == str(after):
        raise RuntimeError("HubSpot returned a repeated page cursor")
    return page["results"], cursor


def stageable_deals(portal_id, deals):
    """Return a staging payload and a count of deals missing financial data."""
    if not isinstance(portal_id, str) or not portal_id.isascii() or not portal_id.isdecimal() or len(portal_id) > 30:
        raise ValueError("Expected a numeric HubSpot portal ID")
    output = io.StringIO(newline="")
    columns = Columns(source_id="source_id", metric="metric", value="value", unit="unit", observed_on="observed_on")
    writer = csv.DictWriter(output, fieldnames=list(columns.model_dump().values()))
    writer.writeheader()
    skipped = 0
    count = 0
    for deal in deals:
        properties = deal.get("properties") or {}
        amount = properties.get("amount")
        currency = properties.get("deal_currency_code")
        if deal.get("archived") or amount in (None, "") or not currency:
            skipped += 1
            continue
        modified = datetime.fromisoformat(deal["updatedAt"].replace("Z", "+00:00"))
        if modified.tzinfo is None:
            raise ValueError("HubSpot update timestamps must include a timezone")
        modified = modified.astimezone(timezone.utc)
        deal_id = str(deal["id"])
        if not deal_id.isascii() or not deal_id.isdecimal() or len(deal_id) > 30:
            raise ValueError("Expected a numeric HubSpot deal ID")
        count += 1
        if count > 500:
            raise ValueError("Stage no more than 500 observations per batch")
        writer.writerow({
            "source_id": f"{deal_id}:{modified.isoformat()}",
            "metric": "HubSpot deal amount snapshot",
            "value": amount,
            "unit": currency,
            "observed_on": modified.date().isoformat(),
        })
    if not count:
        return None, skipped
    return CsvInput(source=f"HubSpot portal {portal_id}", csv_text=output.getvalue(), columns=columns), skipped
