# 🎟️ EventPass QR — Automated Event Registration & On-Site Check-In System

[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0.3-000000?style=flat&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![Render](https://img.shields.io/badge/Render-Deployed%20Live-46E3B7?style=flat&logo=render&logoColor=white)](https://eventpass-qr.onrender.com/)
[![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-Cloud-4285F4?style=flat&logo=google&logoColor=white)](https://developers.google.com/apps-script)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An end-to-end event ticketing, automated QR generation, email delivery, and on-site check-in verification system.

---

## 🌐 Live Cloud Demo (Render)

Experience the live deployed application 24/7 without running any local servers:

| Service | Live Link | Description |
|---|---|---|
| **Attendee Registration** | [https://eventpass-qr.onrender.com/](https://eventpass-qr.onrender.com/) | Public form to sign up & generate admission ticket pass |
| **Check-in Scanner** | [https://eventpass-qr.onrender.com/scanner](https://eventpass-qr.onrender.com/scanner) | On-site camera scanner with audio chimes & duplicate check |
| **Attendance Dashboard** | [https://eventpass-qr.onrender.com/dashboard](https://eventpass-qr.onrender.com/dashboard) | Real-time organizer dashboard with live check-in stats & CSV export |

---

## ⚡ The 4-Stage Operational Workflow

```
┌─────────────────────┐      ┌─────────────────────────┐      ┌─────────────────────────┐      ┌──────────────────────────┐
│  1. Registration    │ ───> │  2. Token & QR Script   │ ───> │   3. Email Delivery     │ ───> │  4. On-Site Check-In     │
│  Attendee details   │      │  Unique UUID ticket ID  │      │  HTML confirmation pass │      │  Webcam/camera scanner   │
│  captured via form  │      │  & QR code generated    │      │  with inline QR ticket  │      │  with duplicate warning  │
└─────────────────────┘      └─────────────────────────┘      └─────────────────────────┘      └──────────────────────────┘
```

---

## ✨ Key Features

- **Unique Ticket Generation:** Automatically hashes attendee data into cryptographically unique tickets (`TKT-XXXXXXXX`).
- **Dynamic QR Code Rendering:** Generates scannable, high-contrast QR code images dynamically upon registration.
- **Automated Email Dispatch:** Sends responsive HTML admission passes directly to participants with embedded QR codes.
- **On-Site Camera Scanner:** Live in-browser QR scanning utilizing device webcams or smartphone cameras with zero app installs required.
- **Duplicate Entry Prevention:** Detects if a ticket has already been used and displays a timestamped warning to prevent badge sharing.
- **Audio Feedback:** Synthesizes pleasant approval chimes, warning tones, and error buzzers via the Web Audio API.
- **Live Attendance Dashboard:** Real-time metrics tracking total registrations, checked-in guests, pending arrivals, and CSV reporting.

---

## 📂 Repository Structure

```
├── app.py                           # Flask backend server, SQLite ORM & Check-in API
├── google_apps_script.js            # Google Apps Script for Google Forms + Sheets automation
├── scanner_for_google_sheets.html   # Standalone camera check-in kiosk for Google Sheets
├── test_workflow.py                 # Automated end-to-end test suite
├── requirements.txt                 # Python dependencies
├── Procfile                         # Cloud production server deployment configuration (Gunicorn)
├── .env.example                     # Environment template for SMTP configuration
├── start.bat                        # One-click Windows launcher
├── templates/                       # Responsive Jinja2 templates (Tailwind CSS)
│   ├── base.html                    # Base layout with navigation
│   ├── register.html                # Attendee registration form
│   ├── confirmation.html            # Digital admission pass & QR download
│   ├── scanner.html                 # Mobile & webcam QR scanner interface
│   └── dashboard.html               # Real-time attendance dashboard & CSV export
└── static/
    └── qrcodes/                     # Generated QR code storage directory
```

---

## 🚀 Two Production-Ready Implementations

### Implementation 1: Full-Stack Python Web App (Render / Self-Hosted)

#### Live Endpoints
- **Public Registration:** `https://eventpass-qr.onrender.com/`
- **On-Site Scanner:** `https://eventpass-qr.onrender.com/scanner`
- **Live Organizer Dashboard:** `https://eventpass-qr.onrender.com/dashboard`
- **Check-In API:** `POST https://eventpass-qr.onrender.com/api/checkin`

#### Local Development Setup
```bash
# Clone the repository
git clone https://github.com/francisconguis/eventpass-qr.git
cd eventpass-qr

# Install dependencies
pip install -r requirements.txt

# Start the local server
python app.py
```
Local URLs:
- Registration: [http://127.0.0.1:5000/](http://127.0.0.1:5000/)
- Scanner: [http://127.0.0.1:5000/scanner](http://127.0.0.1:5000/scanner)
- Dashboard: [http://127.0.0.1:5000/dashboard](http://127.0.0.1:5000/dashboard)

---

### Implementation 2: Google Workspace (Cloud Low-Code)

Ideal for events that require zero server hosting.

1. **Google Form:** Create a form with: *Full Name*, *Email Address*, *Organization*, *Contact Number*.
2. **Google Sheet:** In the Form's **Responses** tab, link to a new Google Sheet.
3. **Apps Script:** In the Google Sheet, go to **Extensions** → **Apps Script**, replace the code with [`google_apps_script.js`](./google_apps_script.js), and run `setupTriggers()`.
4. **Deploy Web App:** Click **Deploy** → **New deployment** → **Web app** (Access: *Anyone*).
5. **Kiosk Scanner:** Open [`scanner_for_google_sheets.html`](./scanner_for_google_sheets.html) on any laptop at your check-in desk.

---

## 🧪 Testing & Verification

Run the automated test suite to verify all four stages:
```bash
python test_workflow.py
```

**Verification Output:**
```text
🧪 Running End-to-End System Tests...
[Step 1] Testing Registration Form Submission...
  ✅ Form accepted! Generated Ticket ID: TKT-B18A42F0
[Step 2] Verifying Database Record & QR Code...
  ✅ Database row confirmed: Alex Developer (Status: Registered)
  ✅ QR Code image verified on disk
[Step 3] Verifying Email Dispatch...
  ✅ Email preview captured
[Step 4] Verifying Scanner Check-in API...
  ✅ Scan #1: APPROVED - Welcome, Alex Developer!
  ✅ Scan #2 (Duplicate): BLOCKED - Already checked in
  ✅ Scan #3 (Invalid Code): REJECTED - Correctly returned 404
🎉 ALL 4 WORKFLOW STEPS PASSED VERIFICATION SUCCESSFULLY!
```

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
