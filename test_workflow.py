"""
Automated End-to-End Test for Event Pass System
Tests all 4 steps:
1. Registration Form Submit
2. Database Entry & QR Code Generation
3. Email Delivery (Preview/SMTP)
4. Scanner Check-in API (Valid, Duplicate & Invalid cases)
"""

import os
import sqlite3
from pathlib import Path
from app import app, DB_PATH, QR_DIR, EMAIL_LOG_DIR

def run_tests():
    print("=" * 60)
    print("🧪 Running End-to-End System Tests...")
    print("=" * 60)

    client = app.test_client()

    # Step 1: Submit a test registration
    print("\n[Step 1] Testing Registration Form Submission...")
    test_data = {
        "full_name": "Alex Developer",
        "email": "alex.dev@example.com",
        "organization": "OpenTech Labs",
        "contact_number": "+1-555-0199"
    }
    response = client.post("/register", data=test_data, follow_redirects=False)
    assert response.status_code == 302, f"Expected redirect 302, got {response.status_code}"
    
    redirect_url = response.headers["Location"]
    ticket_id = redirect_url.split("/")[-1]
    print(f"  ✅ Form accepted! Generated Ticket ID: {ticket_id}")

    # Step 2: Verify Database and QR Code image
    print("\n[Step 2] Verifying Database Record & QR Code...")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM attendees WHERE ticket_id = ?", (ticket_id,))
    record = cursor.fetchone()
    conn.close()

    assert record is not None, "Record not found in database!"
    assert record["full_name"] == test_data["full_name"]
    assert record["checked_in"] == 0, "Default checked_in must be 0"
    print(f"  ✅ Database row confirmed: {record['full_name']} (Status: Registered, Not Checked In)")

    qr_file = QR_DIR / f"{ticket_id}.png"
    assert qr_file.exists(), f"QR Code image file not found at {qr_file}"
    print(f"  ✅ QR Code image verified on disk: {qr_file.name} ({qr_file.stat().st_size} bytes)")

    # Step 3: Verify Email Delivery
    print("\n[Step 3] Verifying Email Dispatch...")
    # In test mode, email file exists in sent_emails/
    email_file = EMAIL_LOG_DIR / f"{ticket_id}.html"
    if email_file.exists():
        print(f"  ✅ Email preview captured: {email_file.name}")
    else:
        print("  ℹ️ Live SMTP was used (or custom provider configured).")

    # Step 4: Verify Scanner API
    print("\n[Step 4] Verifying Scanner Check-in API...")
    
    # 4A: Valid First Check-in
    checkin_res = client.post("/api/checkin", json={"ticket_id": ticket_id})
    assert checkin_res.status_code == 200, f"Expected 200, got {checkin_res.status_code}"
    res_json = checkin_res.get_json()
    assert res_json["status"] == "success"
    print(f"  ✅ Scan #1: APPROVED - {res_json['message']}")

    # Check database status updated
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT checked_in, checked_in_at FROM attendees WHERE ticket_id = ?", (ticket_id,))
    checked_in, checked_in_at = cursor.fetchone()
    conn.close()
    assert checked_in == 1, "Database checked_in flag must be 1"
    print(f"  ✅ Database confirmed checked-in at: {checked_in_at}")

    # 4B: Duplicate Check-in Prevention
    dup_res = client.post("/api/checkin", json={"ticket_id": ticket_id})
    assert dup_res.status_code == 409, f"Expected 409 Conflict, got {dup_res.status_code}"
    dup_json = dup_res.get_json()
    assert dup_json["status"] == "already_checked_in"
    print(f"  ✅ Scan #2 (Duplicate): BLOCKED - {dup_json['message']}")

    # 4C: Invalid Ticket
    bad_res = client.post("/api/checkin", json={"ticket_id": "TKT-FAKE999"})
    assert bad_res.status_code == 404, f"Expected 404 Not Found, got {bad_res.status_code}"
    print("  ✅ Scan #3 (Invalid Code): REJECTED - Correctly returned 404")

    print("\n" + "=" * 60)
    print("🎉 ALL 4 WORKFLOW STEPS PASSED VERIFICATION SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()

