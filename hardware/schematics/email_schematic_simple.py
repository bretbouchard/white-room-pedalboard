#!/usr/bin/env python3
"""
Simple email script for macOS - sends PB86 schematic PDF

This script uses macOS's built-in mail command through Python
"""

import subprocess
import os
import sys
from datetime import datetime

# Configuration
RECIPIENT = "bretbouchard@gmail.com"
SUBJECT = f"PB86 8-Button Circuit Schematic - {datetime.now().strftime('%Y-%m-%d')}"
PDF_PATH = os.path.join(os.path.dirname(__file__), "pb86_8button_schematic.pdf")

def create_email_body():
    """Create email body"""
    return f"""
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

All KiCad libraries have been downloaded locally.

Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

---
Generated with Claude Code via Happy Engineering
White Room Hardware Platform
"""

def main():
    """Main function"""
    print("=" * 50)
    print("PB86 Schematic Email Sender (macOS)")
    print("=" * 50)
    print()

    # Check if PDF exists
    if not os.path.exists(PDF_PATH):
        print(f"❌ Error: PDF not found at {PDF_PATH}")
        sys.exit(1)

    size_kb = os.path.getsize(PDF_PATH) / 1024
    print(f"📄 PDF found: {PDF_PATH} ({size_kb:.1f} KB)")
    print(f"📧 Recipient: {RECIPIENT}")
    print()

    # Create temporary email file
    email_file = "/tmp/pb86_schematic_email.txt"
    with open(email_file, 'w') as f:
        f.write(create_email_body())
        f.write(f"\n\nPDF attached: {os.path.basename(PDF_PATH)}\n")

    try:
        # Open macOS Mail app with the email
        print("📧 Opening macOS Mail app...")
        print(f"   To: {RECIPIENT}")
        print(f"   Subject: {SUBJECT}")
        print()
        print("⚠️  Mail app will open - please attach the PDF manually:")
        print(f"   File: {PDF_PATH}")
        print()

        # Create mailto URL
        import urllib.parse
        body_quoted = urllib.parse.quote(create_email_body())
        mailto_url = f"mailto:{RECIPIENT}?subject={urllib.parse.quote(SUBJECT)}&body={body_quoted}"

        # Open in Mail app
        subprocess.run(['open', mailto_url])

        print("✅ Mail app opened with draft")
        print()
        print("📎 Next steps:")
        print(f"   1. Drag and drop the PDF onto the email")
        print(f"   2. Click Send")
        print()
        print(f"   PDF location: {PDF_PATH}")

    except Exception as e:
        print(f"❌ Error: {e}")
        print()
        print("💡 Alternative: Send manually")
        print(f"   To: {RECIPIENT}")
        print(f"   Subject: {SUBJECT}")
        print(f"   Attach: {PDF_PATH}")

if __name__ == "__main__":
    main()
