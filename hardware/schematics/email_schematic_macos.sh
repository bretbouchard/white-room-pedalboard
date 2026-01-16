#!/bin/bash
#
# Email PB86 Schematic PDF using macOS Mail
#
# This script uses macOS's built-in mail command to send the PDF
#

# Configuration
RECIPIENT="bretbouchard@gmail.com"
SUBJECT="PB86 8-Button Circuit Schematic - $(date +%Y-%m-%d)"
PDF_PATH="$(dirname "$0")/pb86_8button_schematic.pdf"

# Check if PDF exists
if [ ! -f "$PDF_PATH" ]; then
    echo "❌ Error: PDF not found at $PDF_PATH"
    exit 1
fi

# Create email body
BODY="Hi Bret,

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

Generated: $(date)

---
Generated with Claude Code via Happy Engineering
White Room Hardware Platform
"

# Send email using macOS mail command
echo "📧 Sending email to $RECIPIENT..."
echo "$BODY" | mail -s "$SUBJECT" "$RECIPIENT" < "$PDF_PATH"

if [ $? -eq 0 ]; then
    echo "✅ Email sent successfully!"
else
    echo "❌ Error sending email"
    echo "Note: Make sure macOS Mail is configured"
    exit 1
fi
