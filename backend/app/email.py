"""Transactional email.

Uses the Resend HTTP API directly over urllib rather than pulling in an SDK —
one dependency fewer, and the API is three fields.

When RESEND_API_KEY is unset, every send is logged to stdout instead. That's
the intended development mode: password reset flows are testable end to end
without an account or a verified domain, because the link is printed in the
terminal. Nothing silently fails.
"""

import json
import urllib.error
import urllib.request

from app.config import get_settings

RESEND_URL = "https://api.resend.com/emails"
TIMEOUT_SECONDS = 10.0


def _shell(title: str, body_html: str, cta_label: str | None = None, cta_url: str | None = None) -> str:
    """One template for everything.

    Inline styles only — Gmail strips <style> blocks, and a table layout is
    still the only thing Outlook renders predictably.
    """
    cta = ""
    if cta_label and cta_url:
        cta = f"""
        <tr><td style="padding:28px 0 8px;">
          <a href="{cta_url}"
             style="display:inline-block;background:#101317;color:#f4f6f8;
                    text-decoration:none;padding:13px 26px;border-radius:8px;
                    font-size:14px;font-weight:700;">{cta_label}</a>
        </td></tr>
        <tr><td style="padding:14px 0 0;font-size:12px;line-height:20px;color:#7c8794;">
          If the button doesn't work, paste this into your browser:<br>
          <span style="color:#5b7ad6;word-break:break-all;">{cta_url}</span>
        </td></tr>"""

    return f"""<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f6f8;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 16px;">
<tr><td align="center">
  <table width="100%" cellpadding="0" cellspacing="0"
         style="max-width:520px;background:#ffffff;border-radius:14px;
                padding:36px 32px;font-family:Arial,Helvetica,sans-serif;">
    <tr><td style="font-size:11px;font-weight:700;letter-spacing:2px;
                   text-transform:uppercase;color:#7c8794;">CEO.ai</td></tr>
    <tr><td style="padding:14px 0 0;font-size:21px;font-weight:700;
                   color:#101317;line-height:1.3;">{title}</td></tr>
    <tr><td style="padding:16px 0 0;font-size:14px;line-height:26px;color:#48525e;">
      {body_html}
    </td></tr>
    {cta}
    <tr><td style="padding:30px 0 0;border-top:1px solid #e6e9ed;margin-top:20px;"></td></tr>
    <tr><td style="padding:16px 0 0;font-size:11px;line-height:19px;color:#9aa3ad;">
      You're receiving this because you have a CEO.ai account.
    </td></tr>
  </table>
</td></tr></table>
</body></html>"""


def send(to: str, subject: str, html: str) -> bool:
    """Returns True if handed off successfully. Never raises.

    Email must never be able to break the request that triggered it — a
    failed welcome email should not fail a signup.
    """
    settings = get_settings()

    if not settings.resend_api_key:
        print(f"\n{'=' * 62}\n[email] No RESEND_API_KEY set — not sending.")
        print(f"[email] To:      {to}")
        print(f"[email] Subject: {subject}")

        for chunk in html.split('href="')[1:]:
            link = chunk.split('"')[0]
            if "http" in link:
                print(f"[email] Link:    {link}")
                break
        print(f"{'=' * 62}\n")
        return True

    body = json.dumps({
        "from": settings.email_from,
        "to": [to],
        "subject": subject,
        "html": html,
    }).encode("utf-8")

    request = urllib.request.Request(
        RESEND_URL,
        data=body,
        headers={
            "Authorization": f"Bearer {settings.resend_api_key}",
            "Content-Type": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            return 200 <= response.status < 300
    except urllib.error.HTTPError as exc:
        print(f"[email] Resend rejected the send ({exc.code}): {exc.read()[:400]}")
        return False
    except Exception as exc:
        print(f"[email] Send failed: {exc}")
        return False

def send_password_reset(to: str, name: str, reset_url: str, minutes_valid: int) -> bool:
    html = _shell(
        title="Reset your password",
        body_html=(
            f"Hi {name or 'there'},<br><br>"
            f"Someone asked to reset the password for this account. "
            f"The link below works once and expires in {minutes_valid} minutes."
            f"<br><br>If it wasn't you, ignore this email — your password stays as it is."
        ),
        cta_label="Choose a new password",
        cta_url=reset_url,
    )
    return send(to, "Reset your CEO.ai password", html)


def send_password_changed(to: str, name: str) -> bool:
    html = _shell(
        title="Your password was changed",
        body_html=(
            f"Hi {name or 'there'},<br><br>"
            "The password on your CEO.ai account was just changed, and every existing "
            "reset link has been invalidated."
            "<br><br><strong>If this wasn't you, reset your password immediately.</strong>"
        ),
    )
    return send(to, "Your CEO.ai password was changed", html)


def send_welcome(to: str, name: str, app_url: str) -> bool:
    html = _shell(
        title="Your board is ready",
        body_html=(
            f"Hi {name or 'there'},<br><br>"
            "Nine specialists are waiting: a CFO, a CTO, a CMO and six more. "
            "Give them a goal and they'll each file a report — and they won't all agree, "
            "which is the point."
            "<br><br>Turn on weekly reviews and the board will score your progress whether "
            "you open the app or not."
        ),
        cta_label="Open the boardroom",
        cta_url=f"{app_url}/dashboard",
    )
    return send(to, "Your CEO.ai board is ready", html)


def send_board_review(to: str, name: str, title: str, score: int, bullets: list[str], app_url: str) -> bool:
    items = "".join(
        f'<li style="margin:0 0 9px;">{bullet}</li>' for bullet in bullets[:6]
    )
    verdict = "on track" if score >= 70 else "under review"

    html = _shell(
        title=title,
        body_html=(
            f"Hi {name or 'there'},<br><br>"
            f"Your board met without you and scored the business "
            f"<strong>{score}/100</strong> — {verdict}."
            f'<br><br><ul style="padding-left:18px;margin:14px 0 0;">{items}</ul>'
        ),
        cta_label="Read the full review",
        cta_url=f"{app_url}/dashboard",
    )
    return send(to, f"Board review: {score}/100", html)


def send_weekly_digest(
    to: str,
    name: str,
    health: int,
    done: int,
    open_tasks: int,
    high_priority: list[str],
    app_url: str,
) -> bool:
    if high_priority:
        items = "".join(f'<li style="margin:0 0 9px;">{task}</li>' for task in high_priority[:5])
        focus = f'<ul style="padding-left:18px;margin:14px 0 0;">{items}</ul>'
    else:
        focus = "<br>Nothing is marked high priority right now."

    if done and not open_tasks:
        lead = f"You closed everything on the board this week. {done} done, nothing left open."
    elif done:
        lead = f"You closed {done} task{'' if done == 1 else 's'} this week, with {open_tasks} still open."
    elif open_tasks:
        lead = f"Nothing closed this week. {open_tasks} task{'' if open_tasks == 1 else 's'} still open."
    else:
        lead = "The board is idle. Start a session and it will give you something to work on."

    html = _shell(
        title="Your week, from the board",
        body_html=(
            f"Hi {name or 'there'},<br><br>"
            f"{lead}<br><br>"
            f"Business health sits at <strong>{health}/100</strong>."
            f"{focus}"
        ),
        cta_label="Open the boardroom",
        cta_url=f"{app_url}/dashboard",
    )
    return send(to, f"Your week: {done} closed, {open_tasks} open", html)
