# Moti PM Tracking

ATM preventive maintenance scheduling and branch verification portal.

## Run with Docker Compose

Make sure Docker Desktop is running, then open PowerShell in this project directory and run:

```powershell
docker compose up --build
```

Open the portal at <http://localhost:8080>. The API health endpoint is <http://localhost:5000/health>, and PostgreSQL is published on port `5433` for local database tools. A new database starts with the schema and demo user accounts only; it does not prepopulate branch names, terminals, or schedules. Admins register each real branch together with its terminal ID before it becomes available for user assignment or scheduling.

On startup, the backend also ensures the login-account table and seeded demo accounts exist in an older database. This migration keeps existing branches, terminals, visits, and user accounts; it does not reset the database.

Sign in with one of the seeded demo accounts:

| Role | Username | Password |
|---|---|---|
| IT Operations Admin | `admin` | `admin123` |
| Moti Technician | `moti_tech` | `moti123` |
| Branch Officer | `branch_main` | `branch123` |

The account determines the user's workspace and permissions. Branch accounts are assigned a branch ID and specific terminal IDs, and can view or confirm visits only for those exact terminals. In **User Accounts**, admins can choose a branch ID and then select terminals registered to that branch; the branch list is fetched from registered branches with active terminals. The user table also shows the assigned branch ID. The server checks that the selected terminal IDs belong to that branch.

Admins can create, edit, reassign terminals, reset passwords for, and delete accounts from **User Accounts**. Branch choices are loaded from branches with active terminals registered by an admin; a branch user’s selected terminal IDs must match the selected branch ID. New and reset passwords must contain at least 8 characters. Admins cannot delete their own account or remove the last administrator. Seeded passwords are stored as hashes, and existing demo passwords are upgraded to hashes the first time they sign in.

The portal header stays visible while scrolling. Admins use the left sidebar to switch between Schedules, Daily Issue Tracking, Branch & Terminal Registration, User Accounts, and Registered Terminals; the selected section is shown in the main content area. The **Import Excel Schedule** action is at the top right. ATM registration requires its model and manufacturer serial number; to update an existing ATM, register it again using the same branch and terminal ID with the corrected details. Admins can edit or delete visits in the `SCHEDULED`, `BRANCH_CONFIRMED`, or `BRANCH_DISPUTED` state; the terminal cannot be changed after a branch decision, and deleting a reviewed visit removes its maintenance and branch-decision history. Other completed visits remain locked. Admins can open completed schedule details to review the engineer's maintenance checklist, visit date, work times, ATM model and serial number, vendor notes, branch decisions, and rejection reasons or remarks. The dashboard shows total disputed visits. For branch-confirmed visits, admins can download a branded PDF confirmation report with the visit summary and full checklist; disputed visits do not have a report. Duplicate terminal/date schedules are rejected.

In **Daily Issue Tracking**, admins assign each ATM to Zone 1 or Zone 2, configure response and resolution targets in hours for each zone and severity, and register issues using the existing terminal inventory. Fractional hours are supported to the nearest minute. Zone 1 targets must be shorter than Zone 2 targets, and Critical targets must be shorter than Major, then Minor. SLA clocks use configurable business days/hours in Addis Ababa time (default Monday–Friday, 08:00–17:00); deadlines are computed and snapshotted in business hours when an issue is created or its terminal, severity, or report time is edited. Admins can update issue details and response/resolution timestamps or delete incorrect/duplicate records. Response SLA breaches remain visible for follow-up, but monthly performance and penalties depend only on resolution: for each terminal, monthly fee × 3% × the share of its issues that miss their resolution deadline, capped at 3% of that terminal's fee. Open issues count as a resolution breach once their deadline passes. Set a monthly fee and currency once per active terminal; that recurring rate is applied to every reporting month. When upgrading an existing database, the latest saved per-month fee for each terminal is carried forward as its recurring fee. Public holidays are not excluded from the business-hour calendar.

When completing PM, Moti technicians must record the actual visit date, select work start and finish times using 12-hour controls (hour, minute, and AM/PM), check every cleaning task, select **Good** or **Bad** for Media Quality, and select the ATM/site conditions. Camera and EJ status each require an explicit **Good** or **Not good** selection. The visit date and times are included in branch review and the PDF report. ATM model and serial number are not required to submit PM. The branch can review the completed inspection before confirming or disputing the work.

The notification bell shows role-specific in-app reminders and refreshes schedule status every minute while a user is signed in: Moti technicians see scheduled work and overdue incomplete work; branch users see maintenance awaiting confirmation and overdue confirmations; admins see overdue vendor work and overdue branch confirmations. Users can mark notifications read, and read state is saved in that browser for that account. Notifications are generated from current schedule records; they are not email/SMS or push notifications and do not run while the portal is closed.

## Import PM schedules

At the top of the admin workspace, use **Upload PM Schedule from Excel** to choose an `.xlsx` workbook, or download the **Excel Template** and fill one row per terminal schedule. The first worksheet must have these exact headers:

| Branch Name (optional) | Terminal ID | Date From |
|---|---|---|
| Addis Ababa Main Branch | ET00101 | 2026-10-26 |

Terminal ID and Date From are required; Branch Name is optional and ignored during import. The schedule is assigned to the branch registered to that terminal ID, so the name in the workbook may be blank or different. Date To is optional and defaults to Date From. Use an Excel date cell or an ISO `YYYY-MM-DD` date. Imports are limited to 500 rows and 2 MB per `.xlsx` workbook. A schedule can only be imported if its terminal ID is registered and active. Unknown or inactive terminal IDs reject the whole workbook without saving any schedules. Existing overlapping terminal/date schedules are skipped, so re-importing a workbook does not create duplicates.

Before loading the schedule, have an admin register the 25 terminal IDs and map each to its correct branch. Then assign each branch account only the terminal IDs that account is allowed to confirm.

For stable sessions across backend restarts, set a private `JWT_SECRET` in a root `.env` file before starting Compose. If it is omitted, the backend generates a temporary secret at startup and users must sign in again after a restart. Do not use demo accounts or expose this demo application directly to the public internet.

## Email notifications

The root `email-service` module sends SMTP email for newly created or edited PM schedules to branch users assigned to that specific terminal, maintenance completed by a vendor to those branch users, and branch confirmations or disputes to admins and vendor users. Excel-imported schedules also trigger schedule-created notices to the branch users assigned to each imported terminal. the database enforces `users.email` as `NOT NULL`.

Set `SMTP_FROM` to a sender address accepted by your SMTP provider. For port 465, set `SMTP_SECURE=true`; for typical port 587 STARTTLS servers, use `false`. `SMTP_USER` and `SMTP_PASS` may both be left empty only if your SMTP relay does not require authentication. Keep the `.env` file private and never commit provider credentials. Rebuild the backend after configuring or changing SMTP settings with `docker compose up --build -d`. If an email cannot be sent, the saved schedule/status remains intact and the API response reports a warning; the backend logs the delivery error.

If the SMTP server uses a private or self-signed certificate authority, set `SMTP_TLS_CA` to that CA's PEM certificate in the root `.env` file. Keep TLS certificate verification enabled; do not disable it to work around certificate errors. For example, a quoted PEM value can be written across multiple lines:

```dotenv
SMTP_TLS_CA='-----BEGIN CERTIFICATE-----
...certificate contents...
-----END CERTIFICATE-----'
```

The configured CA is used only for the SMTP connection. If the certificate is expired, has the wrong hostname, or the server is missing an intermediate certificate, fix the server certificate chain instead.

If an API action reports `502 Bad Gateway`, check that the backend started and the database became healthy:

```powershell
docker compose ps
docker compose logs backend db
```

After code changes, rebuild and start the services with `docker compose up --build`. To stop them, run `docker compose down`. To also erase the database and its saved records, run `docker compose down -v`.

## Run locally without Docker

The backend requires Node.js 20 or newer.

Set a private `JWT_SECRET` in the backend `.env` file to keep login sessions valid across backend restarts; without it, a temporary secret is generated each time.

Start PostgreSQL and create a database named `pm_db`, then apply `backend/database/init.sql`. In `backend`, create a `.env` file with `DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/pm_db` and `PORT=5000`. Run `npm run dev`.

In another terminal, run `npm run dev` from `frontend` and open <http://localhost:3000>. Vite forwards `/api` and `/health` requests to the backend on port `5000`.

## Portal workflows

- **Branch users:** review work for their assigned branch, confirm completed maintenance, or reject it as unresolved. Rejection asks for confirmation before recording a dispute.
- **Moti technicians:** record technician details and maintenance notes for scheduled work.
- **IT  admins:** create accounts, register branches and terminals, schedule maintenance, and remove terminals.
