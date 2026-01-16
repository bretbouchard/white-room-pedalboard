# WebSocket Security Hardening Guide

This document outlines the comprehensive security measures implemented for the WebSocket system and provides guidance for further hardening.

## Security Features Implemented

### 1. Connection Security
- **Rate Limiting**: Maximum 10 connections per IP address per minute
- **IP Blocking**: Automatic IP blocking for suspicious activity (5 minutes default)
- **Connection Limits**: Maximum 1000 total concurrent connections
- **Authentication Required**: JWT token validation via Clerk (configurable bypass for development)

### 2. Message Security
- **Message Validation**: All messages validated for size, format, and content
- **Rate Limiting**: Maximum 100 messages per second per connection
- **Content Filtering**: Only authorized message types allowed
- **Size Limits**: Maximum 1MB per message
- **Timestamp Validation**: Messages with old or future timestamps are rejected

### 3. DDoS Protection
- **Failed Auth Tracking**: IP blocking after 5 failed authentication attempts
- **Suspicious Activity Detection**: Automatic blocking for anomalous behavior
- **Connection Throttling**: Progressive delays for repeated connection attempts
- **Resource Limits**: Queue size limits to prevent memory exhaustion

### 4. Authentication & Authorization
- **JWT Token Validation**: Secure token verification with Clerk
- **Token Caching**: 5-minute cache for validated tokens to reduce load
- **Session Management**: Per-user and per-session connection tracking
- **Development Bypass**: Configurable bypass for local development

## Configuration

### Environment Variables

```bash
# Rate Limiting
WS_MAX_CONNECTIONS_PER_IP=10
WS_MAX_MESSAGES_PER_SECOND=100
WS_MAX_MESSAGE_SIZE=1048576

# Authentication
WS_REQUIRE_AUTH=true
WS_AUTH_TIMEOUT=30
WS_TOKEN_CACHE_TTL=300

# Connection Management
WS_MAX_CONNECTIONS_TOTAL=1000
WS_CONNECTION_TIMEOUT=3600
WS_HEARTBEAT_INTERVAL=30
WS_HEARTBEAT_TIMEOUT=90

# DDoS Protection
WS_BLOCK_DURATION=300
WS_MAX_FAILED_AUTH=5
WS_SUSPICIOUS_THRESHOLD=50

# Message Validation
WS_MAX_QUEUE_SIZE=1000
WS_ALLOWED_MESSAGE_TYPES=heartbeat,ack,error,transport,plugin,track,project,collaboration,ai_suggestion,parameter_batch,dj_control,automation,file_operation,daid_request
```

### Development Mode

For local development, you can enable bypasses:

```bash
# Disable authentication requirement
WS_AUTH_BYPASS=true
DEV_WS_AUTH_BYPASS=true

# Set development user ID
DEV_WS_USER_ID=local-dev
```

## Security Monitoring

### Security Statistics Endpoint

Access security statistics via the admin endpoint:

```
GET /admin/websocket-security
```

Returns:
- Connection statistics
- Blocked IPs count
- Failed authentication attempts
- Message processing metrics
- Suspicious activity reports

### Logs

The system logs security events:
- Connection rejections
- Authentication failures
- Message validation failures
- IP blocks and unblocks
- Suspicious activity detection

## Recommended Hardening Measures

### 1. Production Configuration

```bash
# Strict authentication
WS_REQUIRE_AUTH=true
WS_AUTH_BYPASS=false
DEV_WS_AUTH_BYPASS=false

# Conservative rate limits
WS_MAX_CONNECTIONS_PER_IP=5
WS_MAX_MESSAGES_PER_SECOND=50

# Strong DDoS protection
WS_MAX_FAILED_AUTH=3
WS_BLOCK_DURATION=900
WS_SUSPICIOUS_THRESHOLD=20
```

### 2. Network Security

- **Reverse Proxy**: Use nginx or similar with WebSocket support
- **SSL/TLS**: Always use WSS (WebSocket Secure) in production
- **Firewall**: Configure firewall rules to restrict access
- **CDN**: Consider CDN with DDoS protection for WebSocket endpoints

### 3. Monitoring & Alerting

- **Metrics Collection**: Monitor connection counts, error rates, and block events
- **Alerting**: Set up alerts for unusual patterns
- **Log Analysis**: Regular security log review
- **Health Checks**: Monitor WebSocket endpoint health

### 4. Additional Security Layers

- **CORS**: Configure appropriate CORS headers
- **CSP**: Implement Content Security Policy
- **Rate Limiting Headers**: Include rate limit information in responses
- **Connection Timeouts**: Aggressive timeout configuration

## WebSocket Security Best Practices

### 1. Message Validation
```python
# Always validate incoming messages
def validate_message(message):
    # Check message structure
    required_fields = ['id', 'type', 'timestamp']
    for field in required_fields:
        if field not in message:
            raise ValueError(f"Missing required field: {field}")

    # Validate message type
    if message['type'] not in ALLOWED_TYPES:
        raise ValueError(f"Unauthorized message type: {message['type']}")

    # Check timestamp (prevent replay attacks)
    message_time = float(message['timestamp'])
    if abs(time.time() - message_time) > 300:  # 5 minutes
        raise ValueError("Message timestamp too old or too far in future")
```

### 2. Connection Management
```python
# Implement connection lifecycle management
async def handle_websocket(websocket):
    connection_id = generate_connection_id()

    try:
        # Validate connection
        await validate_connection(websocket)

        # Register connection
        await connection_manager.connect(connection_id, websocket)

        # Handle messages with security validation
        async for message in websocket:
            await secure_message_handler(connection_id, message)

    finally:
        # Cleanup
        await connection_manager.disconnect(connection_id)
```

### 3. Error Handling
```python
# Secure error handling
async def handle_websocket_error(websocket, error):
    # Log security-relevant errors
    if is_security_error(error):
        logger.warning(f"Security violation: {error}")
        await security_middleware.record_violation(websocket, error)

    # Send generic error messages to clients
    await websocket.send_json({
        "type": "error",
        "message": "An error occurred"
    })
```

## Troubleshooting

### Common Issues

1. **WebSocket Connection Fails**
   - Check authentication token
   - Verify CORS configuration
   - Review security logs

2. **Messages Rejected**
   - Check message format and size
   - Verify message type is allowed
   - Review rate limiting configuration

3. **IP Blocked**
   - Check security statistics endpoint
   - Review failed authentication attempts
   - Wait for block to expire or manually clear

### Debug Commands

```bash
# Check WebSocket security stats
curl -H "Authorization: Bearer <token>" \
     http://localhost:8350/admin/websocket-security

# Test WebSocket connection
wscat -c "ws://localhost:8350/ws?token=<token>"

# Monitor logs
docker logs audio_agent-backend-1 | grep -i "security\|websocket\|blocked"
```

## Future Enhancements

1. **Advanced Rate Limiting**: Token bucket algorithm with burst capacity
2. **Geographic Blocking**: Country-based access restrictions
3. **Machine Learning**: Anomaly detection for WebSocket traffic patterns
4. **Message Encryption**: End-to-end encryption for sensitive messages
5. **Session Persistence**: Cross-server session synchronization
6. **Audit Logging**: Comprehensive audit trail for compliance

## Security Checklist

- [ ] Authentication enabled and properly configured
- [ ] Rate limiting configured appropriately
- [ ] Message validation implemented
- [ ] Error handling doesn't leak sensitive information
- [ ] Logging configured for security events
- [ ] Monitoring and alerting in place
- [ ] SSL/TLS certificates valid
- [ ] CORS policies properly configured
- [ ] Firewall rules configured
- [ ] Regular security reviews scheduled