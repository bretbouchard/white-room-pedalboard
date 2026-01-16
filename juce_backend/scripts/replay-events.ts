import { AGUIEvent } from './frontend/src/agui/agui-bridge';
import { AGUIEventsClient } from './frontend/src/agui/agui-events-client';
import fs from 'fs';

// Initialize AGUIEventsClient (ensure this is correctly configured for your environment)
const aguiEventsClient = new AGUIEventsClient({
  eventsUrl: process.env.NEXT_PUBLIC_AGUI_EVENTS_URL || 'http://localhost:3000/api/agui/events',
});

export async function replayEvents(events: AGUIEvent[]) {
  const results = [];

  for (const event of events) {
    try {
      console.log(`Replaying event: ${event.type} (Run ID: ${event.daid?.runId || 'N/A'})`);
      // Replay event by sending it through the AGUIEventsClient
      const response = await aguiEventsClient.sendAuditEvent(event, event.daid);
      results.push({
        originalEvent: event,
        replayResult: await response.json(), // Assuming the response is JSON
        status: 'success',
      });
    } catch (error: any) {
      console.error(`Failed to replay event ${event.type}:`, error.message);
      results.push({
        originalEvent: event,
        error: error.message,
        status: 'failed',
      });
    }
  }

  return results;
}

// Example usage from command line:
// node -r ts-node/register scripts/replay-events.ts <path_to_events.json>
if (require.main === module) {
  const eventsFilePath = process.argv[2];

  if (!eventsFilePath) {
    console.error('Usage: node -r ts-node/register scripts/replay-events.ts <path_to_events.json>');
    process.exit(1);
  }

  try {
    const eventsData = fs.readFileSync(eventsFilePath, 'utf8');
    const events: AGUIEvent[] = JSON.parse(eventsData);
    
    replayEvents(events)
      .then((results) => {
        console.log('\nReplay Summary:');
        const successful = results.filter(r => r.status === 'success').length;
        const failed = results.filter(r => r.status === 'failed').length;
        console.log(`Successful: ${successful}, Failed: ${failed}`);
        if (failed > 0) {
          console.log('Details of failed events:', results.filter(r => r.status === 'failed'));
          process.exit(1);
        }
        process.exit(0);
      })
      .catch((err) => {
        console.error('Error during event replay process:', err);
        process.exit(1);
      });
  } catch (error: any) {
    console.error('Error reading or parsing events file:', error.message);
    process.exit(1);
  }
}
