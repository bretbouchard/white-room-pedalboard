# How to Email the PB86 Schematic PDF

## Quick Start

1. **Edit the script** with your Gmail credentials:
   ```bash
   cd hardware/schematics
   nano email_schematic.py
   ```

2. **Update these lines**:
   ```python
   SENDER_EMAIL = "your-email@gmail.com"  # Your Gmail address
   SENDER_PASSWORD = "your-app-password"  # Your Gmail App Password (see below)
   ```

3. **Run the script**:
   ```bash
   python3 email_schematic.py
   ```

## How to Get a Gmail App Password

**Important**: You must use an App Password, not your regular Gmail password.

1. Go to: https://myaccount.google.com/apppasswords
2. Sign in with your Google account
3. If prompted, enter your Google password
4. Under "Select app", choose **Mail**
5. Under "Select device", choose **Other (Custom name)**
6. Enter a name like "Python Email Script"
7. Click **Generate**
8. Copy the 16-character password (displayed as xxxx xxxx xxxx xxxx)
9. Use this password in the script (remove the spaces)

## Why Use an App Password?

- More secure than using your regular password
- Works even if you have 2-factor authentication enabled
- Can be revoked at any time from your Google account settings
- Specific to this script/app

## Troubleshooting

### "Authentication Error"
- Make sure you're using an App Password, not your regular password
- Check that the email address is correct
- Verify the App Password doesn't have extra spaces

### "PDF file not found"
- Make sure you're in the correct directory: `hardware/schematics`
- Verify the PDF exists: `ls pb86_8button_schematic.pdf`

### "Less secure app access"
- If you see this error, you must use an App Password (see above)
- Google no longer supports "Less secure app access"

## Email Content

The email includes:
- ✅ PDF schematic attachment
- ✅ Circuit overview and specifications
- ✅ Validation summary (SPICE results)
- ✅ Next steps for prototyping
- ✅ Component list and values

Recipient: bretbouchard@gmail.com

## Security Notes

- **Never commit this script with your password** to git
- The script is already in `.gitignore`
- Keep your App Password confidential
- You can revoke App Passwords anytime from Google settings

## Alternative: Send Manually

If you prefer not to use the script, you can manually email:
- File: `hardware/schematics/pb86_8button_schematic.pdf`
- To: bretbouchard@gmail.com
- Subject: PB86 8-Button Circuit Schematic

Generated with Claude Code via Happy Engineering
