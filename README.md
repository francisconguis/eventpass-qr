# 🎟️ Complete Event Registration & QR Check-in System

A complete solution for your event registration, automated QR code ticketing, email delivery, and on-site scanner verification.

---

## 📁 Project Architecture & Components

```
project3/
├── app.py                      # Flask backend handling registration, QR, email & check-in API
├── requirements.txt            # Python dependencies (Flask, qrcode, pillow, python-dotenv)
├── .env.example                # Configuration & SMTP email environment variables
├── google_apps_script.js       # Alternative: Zero-code Google Sheets / Google Forms automation script
├── templates/
│   ├── base.html               # Base layout with Tailwind CSS & navigation
│   ├── register.html           # Step 1: Attendee registration form
│   ├── confirmation.html       # Step 2: Instant ticket preview & QR download
│   ├── scanner.html            # Step 4: Live mobile camera QR scanner with audio cues
│   └── dashboard.html          # Real-time attendance dashboard & CSV export
├── static/
│   └── qrcodes/                # Generated QR code image files (.png)
└── sent_emails/                # Local test previews for sent emails
```

---

## 🚀 Method 1: Custom Web App (Python + Flask)

### Step 1: Setup & Dependencies
Open PowerShell or your terminal in this directory:
```bash
pip install -r requirements.txt
```

### Step 2: Configure Environment (Optional)
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
> **Note:** If you do not configure an SMTP password, the system automatically runs in **Offline Test Mode**. It generates the QR codes and writes the full email HTML files to the `sent_emails/` folder so you can verify email output without configuring an email server!

### Step 3: Run the Server
```bash
python app.py
```
Visit:
- **Registration Form:** [http://127.0.0.1:5000/](http://127.0.0.1:5000/)
- **Camera Check-in Scanner:** [http://127.0.0.1:5000/scanner](http://127.0.0.1:5000/scanner)
- **Live Attendance Dashboard:** [http://127.0.0.1:5000/dashboard](http://127.0.0.1:5000/dashboard)

---

## 📋 The 4-Step Implementation & Verification Walkthrough

### 1. Registration Form (Frontend)
- **File:** `templates/register.html`
- **Fields:** Full Name, Email Address, Organization, Contact Number.
- **Verification:** Submit the form at `http://127.0.0.1:5000/`. The form validates required inputs and immediately inserts a new record into `event_data.db`.

### 2. Database & QR Code Script (Backend / Automation)
- **File:** `app.py` (`generate_qr_code()`)
- **Process:**
  1. Generates a unique Ticket ID (e.g. `TKT-7F2A8E19`).
  2. Creates a clean, high-contrast QR code image saved to `static/qrcodes/<ticket_id>.png`.
  3. Records the attendee as `checked_in = 0`.
- **Verification:** After submission, check `static/qrcodes/` to see the generated `.png` image or view it directly on the confirmation screen.

### 3. Automated Email Delivery (Messaging)
- **File:** `app.py` (`send_confirmation_email()`)
- **Process:**
  - **Live Mode:** Connects to your SMTP provider (Gmail, SendGrid, Amazon SES) and delivers an HTML ticket with the inline QR code (`cid:qrcode_image`).
  - **Test Mode:** If SMTP is unconfigured, it saves the rendered HTML message into `sent_emails/<ticket_id>.html`.
- **Verification:** Open `sent_emails/<ticket_id>.html` in your browser or check your email inbox to confirm delivery and layout.

### 4. On-Site Check-in Scanner (Event Day)
- **File:** `templates/scanner.html` & `POST /api/checkin`
- **Features:**
  - Works directly on smartphones, tablets, or laptops using the camera (`html5-qrcode`).
  - Works with hardware USB barcode scanners or keyboard inputs.
  - **Duplicate Prevention:** Detects if an attendee was already checked in and displays a warning with their previous check-in time.
  - **Audio feedback:** Chimes for approval, double-chime for duplicate, buzz for invalid.
- **Verification:** Open `/scanner` on your phone or laptop webcam, scan the test QR code on your screen or printed page, and verify the green **"CHECK-IN APPROVED"** response and live counter update.

---

## ☁️ Method 2: Google Forms + Google Sheets + Apps Script (100% Free / Cloud Hosted)

If you prefer using Google Workspace without hosting a server:

1. **Create Form:** Go to [Google Forms](https://forms.google.com) and add the fields: *Full Name*, *Email Address*, *Organization*, *Contact Number*.
2. **Link Sheet:** Click **Responses** -> **Link to Sheets**.
3. **Add Script:** In your Google Sheet, click **Extensions** -> **Apps Script**.
4. **Paste Code:** Replace all content with `google_apps_script.js` from this folder.
5. **Authorize:** Select the `setupTriggers` function in the dropdown and click **Run**. Grant permissions when prompted.
6. **Verify:** Submit a test entry through Google Forms. Check your inbox for the automated QR ticket email and verify that the Sheet auto-populates the *Ticket ID* and *Check-in Status*.
