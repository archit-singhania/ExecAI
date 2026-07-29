import json
import urllib.error
import urllib.parse
import urllib.request

from app.config import get_settings

STRIPE_API = "https://api.stripe.com/v1"


def _request(path: str, data: dict | None = None, method: str = "POST") -> dict:
    settings = get_settings()
    if not settings.stripe_secret_key:
        raise RuntimeError("STRIPE_SECRET_KEY is not configured.")

    url = f"{STRIPE_API}{path}"
    body = None

    if data is not None:
        flat: list[tuple[str, str]] = []
        for key, value in data.items():
            if isinstance(value, dict):
                for inner_key, inner_value in value.items():
                    flat.append((f"{key}[{inner_key}]", str(inner_value)))
            elif isinstance(value, list):
                for index, item in enumerate(value):
                    if isinstance(item, dict):
                        for inner_key, inner_value in item.items():
                            flat.append((f"{key}[{index}][{inner_key}]", str(inner_value)))
                    else:
                        flat.append((f"{key}[{index}]", str(item)))
            elif value is not None:
                flat.append((key, str(value)))
        body = urllib.parse.urlencode(flat).encode()

    request = urllib.request.Request(
        url,
        data=body,
        method=method,
        headers={
            "Authorization": f"Bearer {settings.stripe_secret_key}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode()[:500]
        raise RuntimeError(f"Stripe error {exc.code}: {detail}") from exc


def create_checkout_session(price_id: str, customer_email: str, user_id: str, success_url: str, cancel_url: str) -> dict:
    return _request(
        "/checkout/sessions",
        {
            "mode": "subscription",
            "customer_email": customer_email,
            "client_reference_id": user_id,
            "success_url": success_url,
            "cancel_url": cancel_url,
            "line_items": [{"price": price_id, "quantity": 1}],
            "allow_promotion_codes": "true",
            "subscription_data": {"metadata": {"user_id": user_id}},
            "metadata": {"user_id": user_id},
        },
    )


def create_portal_session(customer_id: str, return_url: str) -> dict:
    return _request(
        "/billing_portal/sessions",
        {"customer": customer_id, "return_url": return_url},
    )


def verify_webhook(payload: bytes, signature_header: str | None) -> dict:
    import hashlib
    import hmac
    import time

    settings = get_settings()
    secret = settings.stripe_webhook_secret

    if not secret:
        raise RuntimeError("STRIPE_WEBHOOK_SECRET is not configured.")
    if not signature_header:
        raise ValueError("Missing Stripe signature header.")

    parts = dict(
        piece.split("=", 1) for piece in signature_header.split(",") if "=" in piece
    )
    timestamp = parts.get("t")
    provided = parts.get("v1")

    if not timestamp or not provided:
        raise ValueError("Malformed Stripe signature header.")

    if abs(time.time() - int(timestamp)) > 300:
        raise ValueError("Stripe signature timestamp is outside the tolerance window.")

    expected = hmac.new(
        secret.encode(),
        f"{timestamp}.".encode() + payload,
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, provided):
        raise ValueError("Stripe signature verification failed.")

    return json.loads(payload.decode())
