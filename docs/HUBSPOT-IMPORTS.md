# HubSpot deal and company imports

Register the exact callback URL for your HubSpot OAuth app. The callback path is /api/studio/hubspot/oauth/callback. Enable the crm.objects.deals.read scope and set EXECAI_HUBSPOT_CLIENT_ID, EXECAI_HUBSPOT_CLIENT_SECRET, EXECAI_HUBSPOT_REDIRECT_URI, and EXECAI_HUBSPOT_CREDENTIAL_KEY in the backend environment. The credential key is a persistent Fernet key. Keep it outside the database backup and source control.

Open Execution → Import KPI observations. Choose Connect HubSpot, follow Continue to HubSpot, complete consent, and refresh the connection. Check for updates to stage a page, inspect its contents, and approve eligible observations. A failed fetch leaves the checkpoint in place. The first sync starts 24 hours back, searches up to one day per window, and leaves five minutes for provider indexing. Each click checks one page. If HubSpot reports an oversized window, ExecAI saves a smaller window and asks you to check again. The cursor restarts at the same lower bound so no interval is skipped. If one millisecond still exceeds the limit, sync stops at that checkpoint for operator review.

Disconnect clears local OAuth credentials and pending authorization state. Previously staged observations stay available for review. Remove the app grant in HubSpot when provider-side revocation is required.

To import company headcount, enable the optional `crm.objects.companies.read` scope on the OAuth app and reconnect if it was not previously granted. Select **Company headcount** before checking for updates. ExecAI stages reported employee counts and skips missing values. A reported zero is preserved. Company and deal checkpoints are independent for each portal, and approving a company batch uses the same explicit review as a deal batch.

Live account acceptance requires a registered HubSpot OAuth app and an authorized test portal.

## Browser acceptance

On November 26, 2026, the full Playwright suite passed all 14 tests in Edge using an isolated SQLite database and simulated HubSpot responses. The connector journey exercised consent callback, paginated deal staging, separate company headcount staging, explicit approval and disconnect. Hosted PostgreSQL/pgvector and a live HubSpot portal require separate acceptance.
