import os
import sqlite3
import uuid
import smtplib
import csv
import io
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from pathlib import Path

from flask import (
    Flask, render_template, request, redirect,
    url_for, jsonify, Response, send_from_directory
)
import qrcode
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "default-dev-secret-key")

# Directories
BASE_DIR = Path(__file__).resolve().parent
QR_DIR = BASE_DIR / "static" / "qrcodes"
EMAIL_LOG_DIR = BASE_DIR / "sent_emails"
QR_DIR.mkdir(parents=True, exist_ok=True)
EMAIL_LOG_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = BASE_DIR / "event_data.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS attendees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_id TEXT UNIQUE NOT NULL,
            full_name TEXT NOT NULL,
            email TEXT NOT NULL,
            organization TEXT,
            contact_number TEXT,
            qr_filename TEXT NOT NULL,
            checked_in INTEGER DEFAULT 0,
            checked_in_at TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

init_db()

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def generate_qr_code(ticket_id: str) -> str:
    """Generates a QR code image for the ticket and saves to static/qrcodes/"""
    try:
        filename = f"{ticket_id}.png"
        filepath = QR_DIR / filename
        
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=3,
        )
        qr.add_data(ticket_id)
        qr.make(fit=True)
        img = qr.make_image(fill_color="#1E293B", back_color="#FFFFFF")
        img.save(filepath)
        return filename
    except Exception:
        # Fallback to pure-Python SVG (doesn't require Pillow or C libraries)
        import qrcode.image.svg
        filename = f"{ticket_id}.svg"
        filepath = QR_DIR / filename
        factory = qrcode.image.svg.SvgPathImage
        img = qrcode.make(ticket_id, image_factory=factory)
        img.save(filepath)
        return filename

def send_confirmation_email(attendee: dict, qr_filename: str):
    """Sends an automated confirmation email with embedded QR code.
    Falls back to saving an HTML preview in sent_emails/ if SMTP is not configured."""
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASSWORD")
    from_name = os.getenv("EMAIL_FROM_NAME", "Event Operations Team")

    qr_path = QR_DIR / qr_filename

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px; }}
        .card {{ max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); text-align: center; border: 1px solid #e5e7eb; }}
        .header {{ font-size: 24px; font-weight: 700; color: #111827; margin-bottom: 8px; }}
        .subtitle {{ font-size: 14px; color: #6b7280; margin-bottom: 24px; }}
        .ticket-box {{ background: #f9fafb; border: 2px dashed #d1d5db; border-radius: 8px; padding: 20px; margin-bottom: 24px; }}
        .qr-img {{ width: 220px; height: 220px; margin: 0 auto 16px auto; display: block; }}
        .ticket-id {{ font-family: monospace; font-size: 18px; font-weight: 600; color: #2563eb; letter-spacing: 1px; }}
        .detail-row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; text-align: left; }}
        .label {{ color: #6b7280; font-weight: 500; }}
        .value {{ color: #111827; font-weight: 600; }}
        .footer {{ font-size: 12px; color: #9ca3af; margin-top: 24px; line-height: 1.5; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">Registration Confirmed! 🎉</div>
        <div class="subtitle">Please present this QR code at the event check-in desk.</div>
        
        <div class="ticket-box">
          <img class="qr-img" src="cid:qrcode_image" alt="Check-in QR Code" />
          <div class="ticket-id">{attendee['ticket_id']}</div>
        </div>

        <div style="margin-top: 16px;">
          <div class="detail-row"><span class="label">Attendee:</span><span class="value">{attendee['full_name']}</span></div>
          <div class="detail-row"><span class="label">Email:</span><span class="value">{attendee['email']}</span></div>
          <div class="detail-row"><span class="label">Organization:</span><span class="value">{attendee.get('organization') or 'N/A'}</span></div>
          <div class="detail-row"><span class="label">Contact:</span><span class="value">{attendee.get('contact_number') or 'N/A'}</span></div>
        </div>

        <div class="footer">
          Add this email to your favorites or screenshot this ticket for rapid entry.<br>
          We look forward to seeing you at the venue!
        </div>
      </div>
    </body>
    </html>
    """

    # If SMTP is configured, send the real email
    if smtp_user and smtp_pass:
        try:
            msg = MIMEMultipart("related")
            msg["Subject"] = f"Your Event Pass - {attendee['full_name']} [{attendee['ticket_id']}]"
            msg["From"] = f"{from_name} <{smtp_user}>"
            msg["To"] = attendee["email"]

            msg_alt = MIMEMultipart("alternative")
            msg.attach(msg_alt)

            text_part = MIMEText(f"Hello {attendee['full_name']},\n\nYour registration is confirmed. Ticket ID: {attendee['ticket_id']}.\nPlease present your attached QR code at the check-in desk.", "plain")
            html_part = MIMEText(html_content, "html")
            msg_alt.attach(text_part)
            msg_alt.attach(html_part)

            with open(qr_path, "rb") as f:
                img_data = f.read()
                img = MIMEImage(img_data)
                img.add_header("Content-ID", "<qrcode_image>")
                img.add_header("Content-Disposition", "inline", filename=qr_filename)
                msg.attach(img)

            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
            print(f"[SUCCESS] Real email dispatched to {attendee['email']}")
            return True, "Email sent via SMTP."
        except Exception as e:
            print(f"[WARNING] SMTP delivery failed: {e}. Falling back to local preview log.")

    # Fallback / Local Development Mode
    local_preview_file = EMAIL_LOG_DIR / f"{attendee['ticket_id']}.html"
    # Replace CID with relative URL for browser inspection
    browser_html = html_content.replace('src="cid:qrcode_image"', f'src="/static/qrcodes/{qr_filename}"')
    with open(local_preview_file, "w", encoding="utf-8") as f:
        f.write(browser_html)
    
    print(f"[TEST MODE] Email saved locally to: {local_preview_file}")
    return True, f"Saved to local preview: {local_preview_file.name}"


# --- Routes ---

@app.route("/")
def register_page():
    return render_template("register.html")

@app.route("/register", methods=["POST"])
def register():
    full_name = request.form.get("full_name", "").strip()
    email = request.form.get("email", "").strip().lower()
    organization = request.form.get("organization", "").strip()
    contact_number = request.form.get("contact_number", "").strip()

    if not full_name or not email:
        return render_template("register.html", error="Full Name and Email Address are required.")

    # Unique Ticket ID: TKT-XXXXXX
    ticket_id = f"TKT-{uuid.uuid4().hex[:8].upper()}"
    qr_filename = generate_qr_code(ticket_id)

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO attendees (ticket_id, full_name, email, organization, contact_number, qr_filename)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (ticket_id, full_name, email, organization, contact_number, qr_filename))
    conn.commit()
    conn.close()

    attendee = {
        "ticket_id": ticket_id,
        "full_name": full_name,
        "email": email,
        "organization": organization,
        "contact_number": contact_number,
    }
    
    # Automated email trigger
    send_confirmation_email(attendee, qr_filename)

    return redirect(url_for("confirmation", ticket_id=ticket_id))

@app.route("/confirmation/<ticket_id>")
def confirmation(ticket_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM attendees WHERE ticket_id = ?", (ticket_id,))
    attendee = cursor.fetchone()
    conn.close()

    if not attendee:
        return "Ticket not found", 404

    return render_template("confirmation.html", attendee=attendee)

@app.route("/scanner")
def scanner_page():
    return render_template("scanner.html")

@app.route("/api/checkin", methods=["POST"])
def api_checkin():
    data = request.get_json(silent=True) or request.form
    raw_code = data.get("ticket_id", "").strip()

    if not raw_code:
        return jsonify({"status": "error", "message": "No Ticket ID provided"}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM attendees WHERE ticket_id = ?", (raw_code,))
    attendee = cursor.fetchone()

    if not attendee:
        conn.close()
        return jsonify({
            "status": "not_found",
            "message": f"Invalid Ticket: '{raw_code}' was not found in the attendee list."
        }), 404

    if attendee["checked_in"] == 1:
        checked_time = attendee["checked_in_at"]
        conn.close()
        return jsonify({
            "status": "already_checked_in",
            "message": f"ALREADY CHECKED IN: {attendee['full_name']} was already checked in at {checked_time}.",
            "attendee": dict(attendee)
        }), 409

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
        UPDATE attendees
        SET checked_in = 1, checked_in_at = ?
        WHERE ticket_id = ?
    """, (now_str, raw_code))
    conn.commit()

    cursor.execute("SELECT * FROM attendees WHERE ticket_id = ?", (raw_code,))
    updated = cursor.fetchone()
    conn.close()

    return jsonify({
        "status": "success",
        "message": f"Verified! Welcome {updated['full_name']}.",
        "attendee": dict(updated)
    }), 200

@app.route("/dashboard")
def dashboard():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM attendees ORDER BY id DESC")
    attendees = cursor.fetchall()
    
    cursor.execute("SELECT COUNT(*) FROM attendees")
    total = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM attendees WHERE checked_in = 1")
    checked_in_count = cursor.fetchone()[0]
    conn.close()

    return render_template(
        "dashboard.html",
        attendees=attendees,
        total=total,
        checked_in_count=checked_in_count,
        pending_count=total - checked_in_count
    )

@app.route("/export/csv")
def export_csv():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT ticket_id, full_name, email, organization, contact_number, checked_in, checked_in_at, created_at FROM attendees")
    rows = cursor.fetchall()
    conn.close()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Ticket ID", "Full Name", "Email", "Organization", "Contact Number", "Checked In", "Checked In At", "Registration Date"])
    for r in rows:
        writer.writerow([r[0], r[1], r[2], r[3], r[4], "YES" if r[5] == 1 else "NO", r[6] or "", r[7]])

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment;filename=attendees_checkin_report.csv"}
    )

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    print(f"🚀 Server running on http://127.0.0.1:{port}")
    print(f"📱 Check-in Scanner available at http://127.0.0.1:{port}/scanner")
    print(f"📊 Dashboard available at http://127.0.0.1:{port}/dashboard")
    app.run(host="0.0.0.0", port=port, debug=True)

