#!/bin/bash
#
# Start a simple HTTP server to share files
# Can be accessed from your phone browser
#

PORT=${1:-8000}
DIRECTORY="$(dirname "$0")"

echo "======================================"
echo "  File Sharing Server"
echo "======================================"
echo ""
echo "Starting server on port $PORT..."
echo ""
echo "📱 Access from your phone:"
echo "   http://$(hostname -f):$PORT"
echo ""
echo "📁 Or use your local IP:"
echo "   http://$(ipconfig getifaddr en0):$PORT"
echo ""
echo "Files available:"
ls -1 "$DIRECTORY"/*.pdf 2>/dev/null | sed 's/^/   - /'
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Start HTTP server
cd "$DIRECTORY"
python3 -m http.server $PORT
