import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../src/server/db'; // Adjust path as needed
import { aguiEventsCounter } from '../metrics/route'; // Import the Prometheus counter
import { z } from 'zod';

// Define Zod schema for AGUIEvent
const AGUIEventSchema = z.object({
  id: z.string().optional(), // ID can be generated on server
  timestamp: z.number().optional(), // Timestamp can be generated on server
  daid: z.object({
    runId: z.string().optional(),
    userId: z.string().optional(),
  }).optional(),
  type: z.string().min(1, 'Event type is required'),
  payload: z.record(z.any()).optional(), // Payload can be any object
  metadata: z.record(z.any()).optional(),
});

// Helper to validate incoming event data
function validateEvent(data: any): { success: boolean; error?: string; data?: z.infer<typeof AGUIEventSchema> } {
  const parsed = AGUIEventSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors.map(e => e.message).join(', ') };
  }
  return { success: true, data: parsed.data };
}

function extractDAIDHeaders(req: NextRequest) {
  const runId = req.headers.get('x-daid-run-id') || undefined;
  const userId = req.headers.get('x-daid-user-id') || undefined;
  return { runId, userId };
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const daid = extractDAIDHeaders(req);
    const body = await req.json();

    // Input validation using Zod
    const validationResult = validateEvent(body);
    if (!validationResult.success) {
      console.warn('AG-UI Event Validation Failed:', validationResult.error);
      return NextResponse.json({ success: false, error: 'Invalid event data', details: validationResult.error }, { status: 400 });
    }

    const validatedData = validationResult.data!;

    const newEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
      daid,
      ...validatedData,
    };
    await db.addToQueue(newEvent); // Add to queue instead of directly to DB
    console.log('AG-UI Event Received and Queued:', newEvent.id, newEvent.type);
    aguiEventsCounter.inc({ eventType: newEvent.type }); // Increment Prometheus counter

    const duration = Date.now() - startTime;
    console.log(`API POST /api/agui/events took ${duration}ms`);
    // Immediately return success, event will be processed asynchronously
    return NextResponse.json({ success: true, eventId: newEvent.id, status: 'queued', duration });
  } catch (error: any) {
    console.error('Error processing AG-UI event:', error);
    const duration = Date.now() - startTime;
    console.log(`API POST /api/agui/events failed after ${duration}ms`);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const runId = searchParams.get('runId') || undefined;
  const userId = searchParams.get('userId') || undefined;
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');

  const startDate = startDateParam ? new Date(startDateParam).getTime() : undefined;
  const endDate = endDateParam ? new Date(endDateParam).getTime() : undefined;

  try {
    const events = await db.getEventsFiltered({
      limit,
      runId,
      userId,
      startDate,
      endDate,
    });

    const duration = Date.now() - startTime;
    console.log(`API GET /api/agui/events took ${duration}ms`);
    return NextResponse.json({ success: true, count: events.length, events });
  } catch (error: any) {
    console.error('Error fetching AG-UI events:', error);
    const duration = Date.now() - startTime;
    console.log(`API GET /api/agui/events failed after ${duration}ms`);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}