import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../src/server/db';
import { z } from 'zod';

// Define schema for user feedback
const UserFeedbackSchema = z.object({
  suggestionId: z.string(),
  action: z.enum(['accept', 'reject', 'modify']),
  feedback: z.string().optional(),
  timestamp: z.number(),
  context: z.object({
    flowView: z.enum(['daw', 'theory']),
    nodeId: z.string().optional(),
    edgeId: z.string().optional(),
    flowState: z.record(z.any()).optional(),
  }).optional(),
});

// Schema for suggestion requests
const SuggestionRequestSchema = z.object({
  context: z.object({
    activeView: z.enum(['daw', 'theory']),
    nodes: z.array(z.any()),
    edges: z.array(z.any()),
    selectedNodeId: z.string().optional(),
    hierarchy: z.array(z.any()),
  }),
  type: z.enum(['node-suggestion', 'connection-recommendation', 'flow-optimization', 'parameter-suggestion', 'workflow-improvement']).optional(),
});

// Store user feedback for AI learning
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const validatedData = UserFeedbackSchema.safeParse(body);

    if (!validatedData.success) {
      console.warn('AGUI Feedback Validation Failed:', validatedData.error);
      return NextResponse.json({
        success: false,
        error: 'Invalid feedback data',
        details: validatedData.error.errors.map(e => e.message).join(', ')
      }, { status: 400 });
    }

    const feedback = validatedData.data;

    // Store feedback for learning analytics
    await db.storeUserFeedback({
      id: `feedback-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date(feedback.timestamp).toISOString(),
      suggestionId: feedback.suggestionId,
      action: feedback.action,
      feedback: feedback.feedback,
      context: feedback.context || {},
      userAgent: req.headers.get('user-agent'),
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
    });

    console.log('AGUI Feedback Received:', {
      suggestionId: feedback.suggestionId,
      action: feedback.action,
      timestamp: feedback.timestamp,
    });

    const duration = Date.now() - startTime;
    console.log(`API POST /api/agui/feedback took ${duration}ms`);

    return NextResponse.json({
      success: true,
      feedbackId: feedback.suggestionId,
      processed: true,
      duration
    });

  } catch (error: any) {
    console.error('Error processing AGUI feedback:', error);
    const duration = Date.now() - startTime;
    console.log(`API POST /api/agui/feedback failed after ${duration}ms`);

    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// Get feedback analytics and learning metrics
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(req.url);

  try {
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const suggestionId = searchParams.get('suggestionId');
    const action = searchParams.get('action');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const analytics = await db.getFeedbackAnalytics({
      limit,
      suggestionId,
      action,
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
    });

    const duration = Date.now() - startTime;
    console.log(`API GET /api/agui/feedback took ${duration}ms`);

    return NextResponse.json({
      success: true,
      analytics,
      count: analytics.length,
      duration
    });

  } catch (error: any) {
    console.error('Error fetching AGUI feedback analytics:', error);
    const duration = Date.now() - startTime;
    console.log(`API GET /api/agui/feedback failed after ${duration}ms`);

    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}