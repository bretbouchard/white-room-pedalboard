import { db } from './frontend/src/server/db'; // Adjust path as needed

const BATCH_SIZE = 100; // Process 100 events at a time

async function processAGUIQueue() {
  console.log('AG-UI Queue Processor: Starting...');
  try {
    const queue = await db.getQueue();
    if (queue.length === 0) {
      console.log('AG-UI Queue Processor: Queue is empty. Exiting.');
      return;
    }

    console.log(`AG-UI Queue Processor: Found ${queue.length} events in queue.`);

    let processedCount = 0;
    for (let i = 0; i < queue.length; i += BATCH_SIZE) {
      const batch = queue.slice(i, i + BATCH_SIZE);
      console.log(`AG-UI Queue Processor: Processing batch ${Math.floor(i / BATCH_SIZE) + 1} with ${batch.length} events.`);

      try {
        // In a real database, you'd use a bulk insert operation here.
        // For our simulated db, we'll iterate and add.
        for (const event of batch) {
          await db.addEvent(event);
          processedCount++;
        }
        console.log(`AG-UI Queue Processor: Successfully processed batch starting with event ${batch[0]?.id}.`);
      } catch (error) {
        console.error(`AG-UI Queue Processor: Failed to process batch starting with event ${batch[0]?.id}:`, error);
        // Depending on error, might re-queue the batch or handle individual failures
        // For now, we'll stop processing the rest of the queue on first batch failure
        break;
      }
    }

    // Only clear the queue if all events were successfully processed
    if (processedCount === queue.length) {
      await db.clearQueue();
      console.log('AG-UI Queue Processor: Finished processing all queued events and cleared queue.');
    } else {
      console.warn(`AG-UI Queue Processor: Only ${processedCount} of ${queue.length} events processed. Remaining events will be retried.`);
    }
  } catch (error) {
    console.error('AG-UI Queue Processor: An error occurred during queue processing:', error);
  }
}

// This script can be run periodically (e.g., via cron job or a dedicated worker process)
// For demonstration, we'll just run it once when executed.
if (require.main === module) {
  processAGUIQueue()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}