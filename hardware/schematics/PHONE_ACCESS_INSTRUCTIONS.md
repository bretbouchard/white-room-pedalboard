# View Files from Your Phone

## 📱 Quick Start

The HTTP server is now running! Open your phone browser and go to:

```
http://192.168.1.186:8000
```

## 📄 What You Can View

### Main Files:
- **pb86_8button_schematic.pdf** - The complete circuit schematic (3.7KB)
- **pb86_schematic_diagram.txt** - ASCII diagram version
- **index.html** - Nice webpage with all files listed

## 🌐 How to Access

### From Your Phone (Same WiFi):
1. Open Safari or Chrome
2. Go to: **http://192.168.1.186:8000**
3. Tap on the PDF to view it
4. Pinch to zoom, scroll to read

### From Your Computer:
1. Open browser
2. Go to: **http://localhost:8000**
3. Or: **http://192.168.1.186:8000**

## 🔄 Server Status

**Server is RUNNING** (started at 5:57 PM)
- Port: 8000
- Process ID: 22337
- Directory: hardware/schematics/

## ⚠️ Important Notes

- **Same WiFi Only**: Your phone must be on the same WiFi network as your Mac
- **Server Running**: The server will keep running until you stop it
- **Battery**: Leaving the server running uses minimal battery

## 🛑 Stop the Server

When you're done, stop the server:

```bash
kill 22337
```

Or run:
```bash
./stop_file_server.sh
```

## 🔧 Troubleshooting

### Can't Access from Phone:
1. Check you're on the same WiFi network
2. Verify server is running: `ps aux | grep http.server`
3. Try the IP address: `http://192.168.1.186:8000`

### Server Not Working:
1. Restart the server:
   ```bash
   cd hardware/schematics
   ./start_file_server.sh
   ```

2. Check port 8000 isn't in use:
   ```bash
   lsof -i :8000
   ```

## 📱 How to Save PDF to Phone

1. View the PDF in browser
2. Tap the Share button (square with arrow)
3. Select "Save to Files"
4. Choose location (iCloud Drive, On My iPhone, etc.)
5. Tap Save

## 🎯 Future Use

Anytime you generate files you want to view from your phone:
1. Put them in: `hardware/schematics/`
2. Add them to `index.html` if you want them in the nice list
3. Access from phone at: `http://192.168.1.186:8000`

Generated: January 16, 2026
Server will keep running until stopped
