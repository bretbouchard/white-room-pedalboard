#!/usr/bin/env python3
"""
Send PB86 Schematic PDF using macOS Mail automation
"""

import subprocess
import os
import sys
from datetime import datetime

# Configuration
RECIPIENT = "bretbouchard@gmail.com"
SENDER = "bretbouchard@gmail.com"
SUBJECT = f"PB86 8-Button Circuit Schematic - {datetime.now().strftime('%Y-%m-%d')}"
PDF_PATH = os.path.join(os.path.dirname(__file__), "pb86_8button_schematic.pdf")

def send_via_mail_app():
    """Send using macOS Mail app with automator"""
    try:
        # Create AppleScript to send email with attachment
        script = f'''
tell application "Mail"
    activate
    set newMessage to make new outgoing message with properties {{subject:"{SUBJECT}", content:"Hi Bret,

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

" & return}}

    tell newMessage
        set visible to true
        set sender to "{SENDER}"
        make new to recipient at end of to recipients with properties {{address:"{RECIPIENT}"}}
        tell content
            make new attachment with properties {{file name:"{PDF_PATH}"}} at after the last paragraph
        end tell
    end tell

    -- Wait a moment for the attachment to load
    delay 2

    -- Send the message
    send newMessage

end tell
'''

        # Execute AppleScript
        print("📧 Sending email via macOS Mail...")
        print(f"   To: {RECIPIENT}")
        print(f"   From: {SENDER}")
        print(f"   Subject: {SUBJECT}")
        print(f"   Attachment: {os.path.basename(PDF_PATH)}")
        print()

        result = subprocess.run(['osascript', '-e', script],
                              capture_output=True,
                              text=True)

        if result.returncode == 0:
            print("✅ Email sent successfully!")
            print()
            print("The email has been sent with the PDF schematic attached.")
            return True
        else:
            print(f"❌ Error: {result.stderr}")
            return False

    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("PB86 Schematic Email Sender")
    print("=" * 60)
    print()

    if not os.path.exists(PDF_PATH):
        print(f"❌ PDF not found: {PDF_PATH}")
        sys.exit(1)

    size_kb = os.path.getsize(PDF_PATH) / 1024
    print(f"📄 PDF: {os.path.basename(PDF_PATH)} ({size_kb:.1f} KB)")
    print()

    if send_via_mail_app():
        print()
        print("=" * 60)
        print("✅ SUCCESS: Email delivered!")
        print("=" * 60)
    else:
        print()
        print("⚠️  Could not send automatically")
        print("   Please use: python3 email_schematic_simple.py")
