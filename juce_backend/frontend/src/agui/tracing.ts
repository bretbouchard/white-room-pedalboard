import { context, trace, Span, SpanStatusCode, Context, AttributeValue } from '@opentelemetry/api';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const exporter = new OTLPTraceExporter({
  url: (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT) || 'http://localhost:4318/v1/traces',
});

// Configure the Tracer Provider
// In @opentelemetry/sdk-trace-* v2 the provider does not expose addSpanProcessor;
// span processors should be passed via the constructor config. Calling
// `addSpanProcessor` will fail with "provider.addSpanProcessor is not a function".
const provider = new WebTracerProvider({
  spanProcessors: [new BatchSpanProcessor(exporter)],
});
provider.register();

const tracer = trace.getTracer('agui-frontend-tracer');

interface SpanContext {
  traceId?: string;
  spanId?: string;
  parentId?: string;
}

/**
 * Starts a new OpenTelemetry span.
 * @param name The name of the span.
 * @param parentSpanId Optional ID of the parent span.
 * @param attributes Optional attributes for the span.
 * @returns The created span.
 */
export function startSpan(name: string, parentSpanId?: string, attributes?: Record<string, AttributeValue>): Span {
  let parentContext: Context | undefined;
  if (parentSpanId) {
    // Attempt to retrieve context from active spans or create a new one
    const activeSpan = trace.getSpan(context.active());
    if (activeSpan && activeSpan.spanContext().spanId === parentSpanId) {
      parentContext = context.active();
    } else {
      // If parentSpanId is provided but not the active span, create a new context
      // This might be simplified depending on how parentSpanId is used.
      // For now, we'll just create a new root span if parentSpanId doesn't match active.
      // A more robust solution would involve propagating the full SpanContext.
    }
  }

  const spanOptions = attributes ? { attributes: attributes as Record<string, AttributeValue> } : undefined;
  const span = tracer.startSpan(name, spanOptions, parentContext);
  return span;
}

/**
 * Ends an OpenTelemetry span.
 * @param span The span to end.
 * @param status Optional status for the span (e.g., 'ok', 'error').
 * @param errorMessage Optional error message if status is 'error'.
 */
export function endSpan(span: Span, status?: { status: 'ok' | 'error'; errorMessage?: string; httpStatus?: number }) {
  if (status) {
    if (status.status === 'error') {
      span.setStatus({ code: SpanStatusCode.ERROR, message: status.errorMessage });
    } else if (status.status === 'ok') {
      span.setStatus({ code: SpanStatusCode.OK });
    }
    if (status.httpStatus) {
      span.setAttribute('http.status_code', status.httpStatus);
    }
  }
  span.end();
}

/**
 * Gets the active span context.
 * @returns The active span context or undefined if no active span.
 */
export function getActiveSpanContext(): SpanContext | undefined {
  const activeSpan = trace.getSpan(context.active());
  if (activeSpan) {
    const spanContext = activeSpan.spanContext();
    return {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
      // parentId is not directly available from SpanContext, it's part of the parent Span
    };
  }
  return undefined;
}