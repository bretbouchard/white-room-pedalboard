#!/usr/bin/env python3
"""
Email PB86 Schematic PDF to bretbouchard@gmail.com

Usage:
    python3 email_schematic.py

Requirements:
    - Gmail account with app password
    - SMTP enabled for Gmail
"""

import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
import os
from datetime import datetime

# Email configuration
SENDER_EMAIL = "your-email@gmail.com"  # UPDATE THIS
SENDER_PASSWORD = "your-app-password"  # UPDATE THIS (use app password, not regular password)
RECIPIENT_EMAIL = "bretbouchard@gmail.com"

# PDF attachment
PDF_FILENAME = "pb86_8button_schematic.pdf"
PDF_PATH = os.path.join(os.path.dirname(__file__), PDF_FILENAME)

def create_email_body():
    """Create the email body text"""
    body = f"""
PB86 8-Button Circuit Schematic
{'=' * 50}

Hi Bret,

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

All KiCad libraries have been downloaded locally, so you have all symbols
and footprints ready for PCB design.

Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

---
Generated with Claude Code via Happy Engineering
White Room Hardware Platform
"""

    return body

def send_email():
    """Send the email with PDF attachment"""
    try:
        # Check if PDF exists
        if not os.path.exists(PDF_PATH):
            print(f"❌ Error: PDF file not found at {PDF_PATH}")
            return False

        # Read PDF file
        with open(PDF_PATH, 'rb') as f:
            pdf_data = f.read()

        # Create email message
        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = RECIPIENT_EMAIL
        msg['Subject'] = f"PB86 8-Button Circuit Schematic - {datetime.now().strftime('%Y-%m-%d')}"

        # Attach email body
        msg.attach(MIMEText(create_email_body(), 'plain'))

        # Attach PDF
        pdf_attachment = MIMEApplication(pdf_data, _subtype='pdf')
        pdf_attachment.add_header('Content-Disposition', 'attachment', filename=PDF_FILENAME)
        msg.attach(pdf_attachment)

        # Create SMTP session
        context = ssl.create_default_context()

        print("📧 Connecting to Gmail SMTP server...")
        with smtplib.SMTP_SSL('smtp.gmail.com', 465, context=context) as server:
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            print("✅ Logged in successfully")
            print(f"📤 Sending email to {RECIPIENT_EMAIL}...")
            server.send_message(msg)
            print("✅ Email sent successfully!")

        return True

    except smtplib.SMTPAuthenticationError:
        print("❌ Authentication Error:")
        print("   Please check your email and app password")
        print("   Note: You need to use an App Password, not your regular password")
        print("   Get one here: https://myaccount.google.com/apppasswords")
        return False

    except Exception as e:
        print(f"❌ Error sending email: {str(e)}")
        return False

def main():
    """Main function"""
    print("=" * 50)
    print("PB86 Schematic Email Sender")
    print("=" * 50)
    print()

    # Check if configuration is set
    if SENDER_EMAIL == "your-email@gmail.com":
        print("❌ Configuration Required:")
        print()
        print("   Please edit this script and set your credentials:")
        print(f"   SENDER_EMAIL = \"your-email@gmail.com\"")
        print(f"   SENDER_PASSWORD = \"your-app-password\"")
        print()
        print("   To get a Gmail App Password:")
        print("   1. Go to: https://myaccount.google.com/apppasswords")
        print("   2. Sign in with your Google account")
        print("   3. Select 'Mail' and your device")
        print("   4. Click 'Generate' and copy the 16-character password")
        print("   5. Use that password in this script (not your regular password)")
        print()
        return

    # Verify PDF exists
    print(f"📄 Checking for PDF: {PDF_PATH}")
    if os.path.exists(PDF_PATH):
        size_kb = os.path.getsize(PDF_PATH) / 1024
        print(f"✅ PDF found ({size_kb:.1f} KB)")
    else:
        print(f"❌ PDF not found at: {PDF_PATH}")
        return

    print()
    print(f"📧 From: {SENDER_EMAIL}")
    print(f"📧 To: {RECIPIENT_EMAIL}")
    print()

    # Send email
    if send_email():
        print()
        print("=" * 50)
        print("✅ SUCCESS: Email sent!")
        print("=" * 50)

if __name__ == "__main__":
    main()
