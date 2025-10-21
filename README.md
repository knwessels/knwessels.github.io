BrightBash - Local dev server (bookings)

This workspace contains a simple static site and a tiny Node.js server to persist bookings.

Run the server:
npm install && npm start
The server will run on http://localhost:4000 by default and expose endpoints:

Admin & Email
---------------
To protect admin endpoints, set environment variables before starting the server:
	ADMIN_PROTECT=1
	ADMIN_PASS=some-secret-token
Then send requests with header: Authorization: Bearer some-secret-token

To enable email notifications (uses nodemailer): set SMTP_HOST, and optionally SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE (1 for TLS).
Also set EMAIL_TO and EMAIL_FROM to control recipients.

Example (PowerShell):

$env:ADMIN_PROTECT='1'; $env:ADMIN_PASS='hunter2'; $env:SMTP_HOST='smtp.example.com'; $env:SMTP_USER='user'; $env:SMTP_PASS='pass'; npm start


1. Open PowerShell in the project folder:

```powershell
cd 'C:\Users\local PC\Desktop\PartyPlanning'
```

2. Install dependencies:

```powershell
npm install
```

# BrightBash - Local dev server (bookings)

This workspace contains a simple static site and a tiny Node.js server to persist bookings.

Run the server

1. Open PowerShell in the project folder:

```powershell
cd 'C:\Users\local PC\Desktop\PartyPlanning'
```

2. Install dependencies:

```powershell
npm install
```

3. Start the server:

```powershell
npm start
```

The server will run on `http://localhost:4000` by default and expose endpoints:

- `GET /bookings` -> returns all bookings
- `GET /bookings/:date` -> returns bookings for a specific date (yyyy-mm-dd)
- `POST /bookings` -> accepts {date, organizer, contact, kids, package, timeslot:{from,to}}

Admin & Email

To protect admin endpoints, set environment variables before starting the server:

```
ADMIN_PROTECT=1
ADMIN_PASS=some-secret-token
```

Then send requests with header: `Authorization: Bearer some-secret-token`

To enable email notifications (uses nodemailer): set `SMTP_HOST`, and optionally `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE` (set to `1` for TLS).
Also set `EMAIL_TO` and `EMAIL_FROM` to control recipients.

Example (PowerShell):

```powershell
$env:ADMIN_PROTECT='1'; $env:ADMIN_PASS='hunter2'; $env:SMTP_HOST='smtp.example.com'; $env:SMTP_USER='user'; $env:SMTP_PASS='pass'; npm start
```

Client configuration:

- The front-end will automatically attempt to probe `http://localhost:4000`. To point it at a different API set `window.BOOKINGS_API` before loading `script.js`.

Notes:

- The server writes to `bookings.json` in the project folder.
- This is a demo server; do not expose it publicly without adding proper auth and validation.
