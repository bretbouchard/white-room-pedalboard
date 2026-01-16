# Schillinger SDK Monitoring and Analytics

This document describes the monitoring and analytics infrastructure for the Schillinger SDK.

## Overview

The SDK includes comprehensive monitoring and analytics capabilities to track:

- Usage analytics and adoption metrics
- Error reporting and crash analytics
- Performance monitoring and API response times
- Developer feedback and feature requests

## Components

### 1. Usage Analytics

**Location**: `analytics/`

The analytics system tracks SDK usage patterns, feature adoption, and user behavior while respecting privacy.

**Features**:

- Event tracking (SDK initialization, method calls, errors)
- Sampling to reduce overhead
- Privacy-first approach with data anonymization
- Support for multiple analytics providers

**Configuration**: `analytics/config.json`

### 2. Error Reporting

**Location**: `monitoring/errors/`

Automated error reporting and crash analytics help identify and fix issues quickly.

**Features**:

- Automatic error capture and reporting
- Stack trace sanitization
- Error categorization and filtering
- Integration with error tracking services

### 3. Performance Monitoring

**Location**: `monitoring/performance/`

Tracks API performance, response times, and system health.

**Features**:

- API response time monitoring
- Success rate tracking
- Health check endpoints
- Performance alerting

### 4. Developer Feedback

**Location**: `scripts/feedback-collector.sh`

Collects feedback and feature requests from developers using the SDK.

**Features**:

- Structured feedback collection
- Bug report templates
- Feature request tracking
- Integration with issue tracking systems

## Usage

### Health Checks

Run health checks to verify SDK services are operational:

```bash
./scripts/monitoring/health-check.sh
```

### Analytics Setup

Set up analytics and monitoring infrastructure:

```bash
./scripts/analytics-setup.sh
```

### Dashboard

View monitoring dashboards:

```bash
# Start HTML dashboard
cd dashboards/custom && node server.js
# Open http://localhost:3001

# Or open static HTML dashboard
open dashboards/html/index.html
```

### Feedback Collection

Collect developer feedback:

```bash
./scripts/feedback-collector.sh
```

## Configuration

### Environment Variables

Set these environment variables to configure monitoring:

```bash
# Analytics
export ANALYTICS_ENDPOINT="https://analytics.schillinger.ai/events"
export ANALYTICS_API_KEY="your-analytics-api-key"

# Error Reporting
export ERROR_REPORTING_ENDPOINT="https://errors.schillinger.ai/reports"
export ERROR_REPORTING_API_KEY="your-error-reporting-api-key"

# Performance Monitoring
export MONITORING_ENDPOINT="https://api.schillinger.ai/health"
export METRICS_ENDPOINT="https://metrics.schillinger.ai/data"
export METRICS_API_KEY="your-metrics-api-key"

# Feedback
export FEEDBACK_ENDPOINT="https://feedback.schillinger.ai/submit"
export FEEDBACK_API_KEY="your-feedback-api-key"
```

### Analytics Configuration

Edit `analytics/config.json` to customize analytics behavior:

```json
{
  "analytics": {
    "enabled": true,
    "sampling_rate": 0.1,
    "max_events_per_session": 100,
    "events": {
      "sdk_initialized": true,
      "method_called": true,
      "error_occurred": true,
      "performance_metric": true
    }
  }
}
```

## Metrics

### Key Performance Indicators (KPIs)

1. **API Response Time**: Average response time for SDK API calls
2. **Success Rate**: Percentage of successful API requests
3. **Error Rate**: Number of errors per time period
4. **Active Users**: Number of unique users in a time period
5. **Feature Adoption**: Usage statistics for different SDK features

### Analytics Events

The SDK tracks these events:

- `sdk_initialized`: When the SDK is initialized
- `method_called`: When SDK methods are called
- `error_occurred`: When errors happen
- `performance_metric`: Performance measurements

### Error Categories

Errors are categorized as:

- **Network Errors**: Connection and timeout issues
- **Authentication Errors**: API key and permission issues
- **Validation Errors**: Invalid input parameters
- **Runtime Errors**: Unexpected runtime exceptions

## Dashboards

### HTML Dashboard

A self-contained HTML dashboard with real-time metrics:

- API response times
- Success rates
- Language usage distribution
- Service health status

**Location**: `dashboards/html/index.html`

### Grafana Dashboard

Professional monitoring dashboard for Grafana:

- Time-series charts
- Alerting rules
- Custom queries

**Location**: `dashboards/grafana/schillinger-sdk-dashboard.json`

## Alerting

### Alert Conditions

Alerts are triggered when:

- API response time > 5 seconds
- Success rate < 95%
- Error rate > 1 error/second
- Service health checks fail

### Notification Channels

Alerts can be sent via:

- Email
- Slack
- PagerDuty
- Webhooks

## Privacy and Compliance

### Data Collection

The SDK follows privacy-first principles:

- No personally identifiable information (PII) is collected
- IP addresses are anonymized
- Respects Do Not Track headers
- Configurable data retention periods

### GDPR Compliance

- Data minimization: Only necessary data is collected
- Purpose limitation: Data is used only for monitoring and improvement
- Transparency: Clear documentation of what data is collected
- User control: Analytics can be disabled

## Troubleshooting

### Common Issues

1. **Analytics not working**
   - Check environment variables
   - Verify network connectivity
   - Check sampling rate settings

2. **Dashboard not loading**
   - Ensure Node.js is installed
   - Check port availability
   - Verify dashboard files exist

3. **Health checks failing**
   - Verify API endpoints are accessible
   - Check authentication credentials
   - Review network configuration

### Debug Mode

Enable debug logging:

```bash
export SDK_DEBUG=true
export SDK_LOG_LEVEL=debug
```

## Support

For monitoring and analytics support:

- 📖 [Documentation](https://docs.schillinger.ai/monitoring)
- 🐛 [Issue Tracker](https://github.com/schillinger-system/sdk/issues)
- 💬 [Discord Community](https://discord.gg/schillinger)
- 📧 [Support Email](mailto:support@schillinger.ai)
