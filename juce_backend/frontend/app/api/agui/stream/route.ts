import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // static by default, unless using searchParams

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(req.url);
  const simulateEvent = searchParams.get('simulate');
  const isBrowser = req.headers.get('accept')?.includes('text/html');

  // If accessed directly in a browser without a simulate param, provide a basic UI
  if (isBrowser && !simulateEvent) {
    const duration = Date.now() - startTime;
    console.log(`API GET /api/agui/stream (HTML UI) took ${duration}ms`);
    return new NextResponse(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>AG-UI Stream Simulator</title>
        <style>
          body { font-family: sans-serif; margin: 20px; }
          button { padding: 10px 15px; margin: 5px; cursor: pointer; }
          #events { border: 1px solid #ccc; padding: 10px; height: 300px; overflow-y: scroll; background: #f0f0f0; }
        </style>
      </head>
      <body>
        <h1>AG-UI Stream Simulator</h1>
        <p>Open your browser's console to see events. Or use the buttons below to simulate events.</p>
        <div>
          <button onclick="sendSimulatedEvent('ready')">Simulate Ready</button>
          <button onclick="sendSimulatedEvent('message')">Simulate Message</button>
          <button onclick="sendSimulatedEvent('tool_call')">Simulate Tool Call</button>
          <button onclick="sendSimulatedEvent('state_patch')">Simulate State Patch</button>
        </div>
        <h2>Received Events:</h2>
        <div id="events"></div>

        <script>
          const eventSource = new EventSource(window.location.href);
          const eventsDiv = document.getElementById('events');

          eventSource.onmessage = function(event) {
            const p = document.createElement('p');
            p.textContent = `[message] ${event.data}`;
            eventsDiv.appendChild(p);
            eventsDiv.scrollTop = eventsDiv.scrollHeight;
          };
          eventSource.addEventListener('ready', function(event) {
            const p = document.createElement('p');
            p.textContent = `[ready] ${event.data}`;
            eventsDiv.appendChild(p);
            eventsDiv.scrollTop = eventsDiv.scrollHeight;
          });
          eventSource.addEventListener('tool_call', function(event) {
            const p = document.createElement('p');
            p.textContent = `[tool_call] ${event.data}`;
            eventsDiv.appendChild(p);
            eventsDiv.scrollTop = eventsDiv.scrollHeight;
          });
          eventSource.addEventListener('state_patch', function(event) {
            const p = document.createElement('p');
            p.textContent = `[state_patch] ${event.data}`;
            eventsDiv.appendChild(p);
            eventsDiv.scrollTop = eventsDiv.scrollHeight;
          });
          eventSource.onerror = function(err) {
            console.error('EventSource failed:', err);
            const p = document.createElement('p');
            p.style.color = 'red';
            p.textContent = `[ERROR] ${err.message || 'Connection error'}`;
            eventsDiv.appendChild(p);
            eventsDiv.scrollTop = eventsDiv.scrollHeight;
          };

          function sendSimulatedEvent(eventType) {
            window.open(window.location.origin + window.location.pathname + `?simulate=${eventType}`, '_blank');
          }
        </script>
      </body>
      </html>
    `,
      {
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }

  const encoder = new TextEncoder();
  const readableStream = new ReadableStream({
    async start(controller) {
      const writeEvent = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Send initial ready event
      writeEvent('ready', { ok: true });

      // Handle simulated events
      if (simulateEvent) {
        switch (simulateEvent) {
          case 'message':
            writeEvent('message', { id: 'sim-msg-1', content: 'This is a simulated message.' });
            break;
          case 'tool_call':
            writeEvent('tool_call', { id: 'sim-tool-1', name: 'createTrack', parameters: { trackType: 'midi', trackName: 'Simulated MIDI Track' } });
            break;
          case 'state_patch':
            writeEvent('state_patch', { description: 'Simulated DAW State', value: { tempo: 125, isPlaying: true } });
            break;
          // Add more simulated events as needed
          default:
            writeEvent('message', { id: 'sim-unknown', content: `Unknown simulated event: ${simulateEvent}` });
        }
        controller.close(); // Close stream after sending simulated event
        const duration = Date.now() - startTime;
        console.log(`API GET /api/agui/stream (Simulated Event) took ${duration}ms`);
        return;
      }

      // Heartbeat every 15 seconds for continuous stream
      const heartbeatInterval = setInterval(() => {
        controller.enqueue(encoder.encode(': heartbeat\n'));
      }, 15000);

      // Clean up on close
      req.signal.onabort = () => {
        clearInterval(heartbeatInterval);
        controller.close();
        const duration = Date.now() - startTime;
        console.log(`API GET /api/agui/stream (Continuous Stream) connection closed after ${duration}ms`);
      };
    },
  });

  return new NextResponse(readableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}