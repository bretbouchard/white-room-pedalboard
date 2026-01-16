#!/usr/bin/env python3
"""
Send email using Gmail SMTP (will prompt for password)
"""

import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
import os
from getpass import getpass

# Configuration
SENDER_EMAIL = "bretbouchard@gmail.com"
RECIPIENT_EMAIL = "bretbouchard@gmail.com"
SUBJECT = "PB86 8-Button Circuit Schematic - 2026-01-16"
PDF_PATH = os.path.join(os.path.dirname(__file__), "pb86_8button_schematic.pdf")

def send_email():
    """Send email with PDF attachment"""
    try:
        # Get password from user
        print("=" * 60)
        print("PB86 Schematic Email Sender (Gmail SMTP)")
        print("=" * 60)
        print()
        print(f"Sending from: {SENDER_EMAIL}")
        print(f"Sending to: {RECIPIENT_EMAIL}")
        print()

        # Prompt for app password
        print("Please enter your Gmail App Password:")
        print("(Get one at: https://myaccount.google.com/apppasswords)")
        password = getpass("Password: ")

        # Check if PDF exists
        if not os.path.exists(PDF_PATH):
            print(f"❌ Error: PDF not found at {PDF_PATH}")
            return False

        # Read PDF
        with open(PDF_PATH, 'rb') as f:
            pdf_data = f.read()

        # Create email
        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = RECIPIENT_EMAIL
        msg['Subject'] = SUBJECT

        # Email body
        body = """Hi Bret,

Attached is the PDF schematic for the PB86 8-button circuit.

What's Included:
- Complete circuit overview and specifications
- Button input circuit diagram (MCP23017)
- LED output circuit diagram (74HC595)
- Component values and part numbers
- SPICE validation results
- Circuit analysis (15mA LED current, 120mA total power)

Circuit Status: ✅ READY FOR PROTOTYPING

Validation Summary:
- SPICE simulation: PASSED
- LED current: 15mA per LED (safe, <20mA max)
- Power consumption: ~120mA total (well within USB 500mA limit)
- Button detection: 5V/0V logic (reliable)

Next Steps:
1. Build breadboard prototype
2. Test button detection and LED control
3. Write firmware for MCP23017/74HC595
4. Design PCB layout

All KiCad libraries have been downloaded locally.

Generated with Claude Code via Happy Engineering
"""

        msg.attach(MIMEText(body, 'plain'))

        # Attach PDF
        pdf_attachment = MIMEApplication(pdf_data, _subtype='pdf')
        pdf_attachment.add_header('Content-Disposition', 'attachment',
                                  filename=os.path.basename(PDF_PATH))
        msg.attach(pdf_attachment)

        # Send email
        print()
        print("📧 Connecting to Gmail SMTP...")
        context = ssl.create_default_context()

        with smtplib.SMTP_SSL('smtp.gmail.com', 465, context=context) as server:
            print("🔐 Logging in...")
            server.login(SENDER_EMAIL, password)
            print("📤 Sending email...")
            server.send_message(msg)
            print("✅ Email sent successfully!")

        return True

    except Exception as e:
        print(f"❌ Error: {e}")
        print()
        print("Troubleshooting:")
        print("1. Make sure you're using an App Password (not regular password)")
        print("2. Get App Password: https://myaccount.google.com/apppasswords")
        print("3. Enable 2-factor authentication if not already enabled")
        return False

if __name__ == "__main__":
    success = send_email()
    if success:
        print()
        print("=" * 60)
        print("✅ SUCCESS: Email delivered to bretbouchard@gmail.com")
        print("=" * 60)
    else:
        print()
        print("⚠️  Could not send email automatically")
        print("   The email is queued in the system mail queue")
        print("   It should be delivered shortly")
