import { NextRequest, NextResponse } from 'next/server';
import client from 'prom-client';

// Create a Registry to register the metrics
const register = new client.Registry();

// Register a default metrics collection
client.collectDefaultMetrics({ register });

// Example custom metric: a counter for AG-UI events received
const aguiEventsCounter = new client.Counter({
  name: 'agui_events_total',
  help: 'Total number of AG-UI events received',
  labelNames: ['eventType'],
});
register.registerMetric(aguiEventsCounter);

// You can also register other custom metrics here, e.g., gauges, histograms
// const aguiEventProcessingTime = new client.Histogram({
//   name: 'agui_event_processing_duration_seconds',
//   help: 'Duration of AG-UI event processing in seconds',
//   buckets: client.Histogram.defaultBuckets,
// });
// register.registerMetric(aguiEventProcessingTime);

export async function GET(req: NextRequest) {
  try {
    const metrics = await register.metrics();
    return new NextResponse(metrics, {
      status: 200,
      headers: {
        'Content-Type': register.contentType,
      },
    });
  } catch (error) {
    console.error('Error generating metrics:', error);
    return NextResponse.json({ error: 'Unable to generate metrics' }, { status: 500 });
  }
}

// Export the counter so it can be incremented elsewhere
export { aguiEventsCounter };