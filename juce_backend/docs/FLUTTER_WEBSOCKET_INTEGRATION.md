# Flutter WebSocket Integration Guide for JUCE Backend v1.2.0

## Overview

Complete integration guide for connecting Flutter applications to the JUCE backend WebSocket API system. This guide provides everything the Flutter team needs to implement real-time audio control, parameter updates, and audio streaming with <1ms latency support.

**Target Version**: JUCE Backend v1.2.0
**WebSocket Endpoints**: `ws://localhost:8080/api/audio/control`, `ws://localhost:8080/api/audio/stream`
**Authentication**: API key-based WebSocket handshake

---

## 🚀 Quick Start - Flutter Integration

### 1. Add Dependencies

```yaml
# pubspec.yaml
dependencies:
  flutter:
    sdk: flutter
  web_socket_channel: ^2.4.0
  http: ^1.1.0
  json_annotation: ^4.8.1
  dio: ^5.3.2  # For REST API fallback
  dart:convert: ^2.0.0
```

### 2. Core WebSocket Service

```dart
// lib/services/juce_websocket_service.dart
import 'dart:convert';
import 'dart:async';
import 'dart:typed_data';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:http/http.dart' as http;

class JuceWebSocketService {
  static const String _baseUrl = 'ws://localhost:8080';
  static const String _controlEndpoint = '$_baseUrl/api/audio/control';
  static const String _streamEndpoint = '$_baseUrl/api/audio/stream';
  static const Duration _reconnectDelay = Duration(seconds: 2);
  static const Duration _heartbeatInterval = Duration(seconds: 30);

  late WebSocketChannel _controlChannel;
  late WebSocketChannel _streamChannel;
  String? _apiKey;

  // State management
  final StreamController<bool> _connectionStateController =
      StreamController<bool>.broadcast();
  final StreamController<Map<String, dynamic>> _parameterUpdateController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Float32List> _audioStreamController =
      StreamController<Float32List>.broadcast();

  Timer? _heartbeatTimer;
  bool _isConnected = false;

  // Public streams
  Stream<bool> get connectionState => _connectionStateController.stream;
  Stream<Map<String, dynamic>> get parameterUpdates => _parameterUpdateController.stream;
  Stream<Float32List> get audioStream => _audioStreamController.stream;
  bool get isConnected => _isConnected;

  /// Initialize WebSocket connection with API key
  Future<void> initialize(String apiKey) async {
    _apiKey = apiKey;
    await _connectControlWebSocket();
    await _connectAudioStreamWebSocket();
  }

  /// Connect to control WebSocket endpoint
  Future<void> _connectControlWebSocket() async {
    try {
      _controlChannel = WebSocketChannel.connect(
        Uri.parse('$_controlEndpoint?api_key=$_apiKey')
      );

      // Listen for messages
      _controlChannel.stream.listen(
        _handleControlMessage,
        onError: _handleControlError,
        onDone: _handleControlDisconnection,
      );

      // Send initial authentication
      _sendAuthMessage();
      _startHeartbeat();

    } catch (e) {
      print('Control WebSocket connection error: $e');
      _connectionStateController.add(false);
      _scheduleReconnect();
    }
  }

  /// Connect to audio stream WebSocket endpoint
  Future<void> _connectAudioStreamWebSocket() async {
    try {
      _streamChannel = WebSocketChannel.connect(
        Uri.parse('$_streamEndpoint?api_key=$_apiKey')
      );

      _streamChannel.stream.listen(
        _handleAudioStreamMessage,
        onError: _handleStreamError,
        onDone: _handleStreamDisconnection,
      );

    } catch (e) {
      print('Audio stream WebSocket connection error: $e');
    }
  }

  /// Handle control WebSocket messages
  void _handleControlMessage(dynamic message) {
    try {
      final data = jsonDecode(message as String) as Map<String, dynamic>;

      switch (data['type']) {
        case 'auth_response':
          _isConnected = data['success'] == true;
          _connectionStateController.add(_isConnected);
          print('WebSocket authentication: ${_isConnected ? "SUCCESS" : "FAILED"}');
          break;

        case 'parameter_update':
          _parameterUpdateController.add(data);
          break;

        case 'notification':
          _handleNotification(data);
          break;

        case 'pong':
          // Heartbeat response received
          break;

        default:
          print('Unknown message type: ${data['type']}');
      }
    } catch (e) {
      print('Error parsing control message: $e');
    }
  }

  /// Handle binary audio stream messages
  void _handleAudioStreamMessage(dynamic message) {
    try {
      if (message is List<int>) {
        // Convert List<int> to binary data
        final bytes = Uint8List.fromList(message);
        final floatData = Float32List.view(bytes.buffer);
        _audioStreamController.add(floatData);
      } else if (message is ByteBuffer) {
        // Direct binary data
        final floatData = Float32List.view(message.buffer);
        _audioStreamController.add(floatData);
      }
    } catch (e) {
      print('Error processing audio stream message: $e');
    }
  }

  /// Send parameter update to JUCE backend
  Future<bool> updateParameter(int pluginId, String parameter, double value, {int? timestamp}) async {
    if (!_isConnected) return false;

    try {
      final message = {
        'type': 'parameter_update',
        'pluginId': pluginId,
        'parameter': parameter,
        'value': value,
        'timestamp': timestamp ?? DateTime.now().millisecondsSinceEpoch,
      };

      _controlChannel.sink.add(jsonEncode(message));
      return true;
    } catch (e) {
      print('Error sending parameter update: $e');
      return false;
    }
  }

  /// Send batch parameter updates for efficiency
  Future<bool> batchUpdateParameters(List<ParameterUpdate> updates) async {
    if (!_isConnected) return false;

    try {
      final messages = updates.map((update) => {
        'type': 'parameter_update',
        'pluginId': update.pluginId,
        'parameter': update.parameter,
        'value': update.value,
        'timestamp': update.timestamp ?? DateTime.now().millisecondsSinceEpoch,
      }).toList();

      // Send as array or individual messages based on backend support
      _controlChannel.sink.add(jsonEncode({
        'type': 'batch_parameter_update',
        'updates': messages,
      }));

      return true;
    } catch (e) {
      print('Error sending batch parameter updates: $e');
      return false;
    }
  }

  /// Load plugin via WebSocket
  Future<bool> loadPlugin(String pluginPath, String name) async {
    if (!_isConnected) return false;

    try {
      final message = {
        'type': 'plugin_load',
        'path': pluginPath,
        'name': name,
      };

      _controlChannel.sink.add(jsonEncode(message));
      return true;
    } catch (e) {
      print('Error loading plugin: $e');
      return false;
    }
  }

  /// Send authentication message
  void _sendAuthMessage() {
    final authMessage = {
      'type': 'auth',
      'apiKey': _apiKey,
    };
    _controlChannel.sink.add(jsonEncode(authMessage));
  }

  /// Start heartbeat for connection monitoring
  void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(_heartbeatInterval, (_) {
      if (_isConnected) {
        _controlChannel.sink.add(jsonEncode({'type': 'ping'}));
      }
    });
  }

  /// Handle WebSocket errors
  void _handleControlError(dynamic error) {
    print('Control WebSocket error: $error');
    _isConnected = false;
    _connectionStateController.add(false);
    _scheduleReconnect();
  }

  /// Handle WebSocket disconnection
  void _handleControlDisconnection() {
    print('Control WebSocket disconnected');
    _isConnected = false;
    _connectionStateController.add(false);
    _scheduleReconnect();
  }

  /// Handle audio stream errors
  void _handleStreamError(dynamic error) {
    print('Audio stream WebSocket error: $error');
  }

  /// Handle audio stream disconnection
  void _handleStreamDisconnection() {
    print('Audio stream WebSocket disconnected');
    _scheduleAudioStreamReconnect();
  }

  /// Schedule reconnection attempts
  void _scheduleReconnect() {
    Timer(_reconnectDelay, () {
      print('Attempting to reconnect control WebSocket...');
      _connectControlWebSocket();
    });
  }

  void _scheduleAudioStreamReconnect() {
    Timer(_reconnectDelay, () {
      print('Attempting to reconnect audio stream WebSocket...');
      _connectAudioStreamWebSocket();
    });
  }

  /// Handle notifications from backend
  void _handleNotification(Map<String, dynamic> notification) {
    print('Received notification: ${notification['message']}');
    // Can emit additional streams for specific notifications
  }

  /// Disconnect all WebSocket connections
  void dispose() {
    _heartbeatTimer?.cancel();
    _controlChannel.sink.close();
    _streamChannel.sink.close();
    _connectionStateController.close();
    _parameterUpdateController.close();
    _audioStreamController.close();
    _isConnected = false;
  }
}

/// Parameter update data class
class ParameterUpdate {
  final int pluginId;
  final String parameter;
  final double value;
  final int? timestamp;

  ParameterUpdate({
    required this.pluginId,
    required this.parameter,
    required this.value,
    this.timestamp,
  });
}
```

### 3. Flutter UI Widget Example

```dart
// lib/widgets/audio_control_widget.dart
import 'package:flutter/material.dart';
import '../services/juce_websocket_service.dart';

class AudioControlWidget extends StatefulWidget {
  const AudioControlWidget({Key? key}) : super(key: key);

  @override
  _AudioControlWidgetState createState() => _AudioControlWidgetState();
}

class _AudioControlWidgetState extends State<AudioControlWidget> {
  final JuceWebSocketService _webSocketService = JuceWebSocketService();

  bool _isConnected = false;
  double _frequency = 440.0;
  double _gain = 0.5;
  double _reverbMix = 0.3;
  int _currentPluginId = 0;

  @override
  void initState() {
    super.initState();
    _initializeWebSocket();
  }

  Future<void> _initializeWebSocket() async {
    // Initialize with your API key
    await _webSocketService.initialize('your-api-key-here');

    // Listen to connection state
    _webSocketService.connectionState.listen((connected) {
      setState(() {
        _isConnected = connected;
      });
    });

    // Listen to parameter updates from backend
    _webSocketService.parameterUpdates.listen((update) {
      setState(() {
        // Update UI based on backend parameter changes
        switch (update['parameter']) {
          case 'frequency':
            _frequency = update['value']?.toDouble() ?? _frequency;
            break;
          case 'gain':
            _gain = update['value']?.toDouble() ?? _gain;
            break;
          case 'reverbMix':
            _reverbMix = update['value']?.toDouble() ?? _reverbMix;
            break;
        }
      });
    });
  }

  Future<void> _updateParameter(String parameter, double value) async {
    final success = await _webSocketService.updateParameter(
      _currentPluginId,
      parameter,
      value
    );

    if (!success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to update $parameter'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('JUCE Audio Control'),
        backgroundColor: _isConnected ? Colors.green : Colors.red,
        actions: [
          Icon(_isConnected ? Icons.wifi : Icons.wifi_off),
          const SizedBox(width: 16),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Connection Status
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: _isConnected ? Colors.green.shade100 : Colors.red.shade100,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(
                    _isConnected ? Icons.check_circle : Icons.error,
                    color: _isConnected ? Colors.green : Colors.red,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    _isConnected ? 'Connected to JUCE Backend' : 'Disconnected',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: _isConnected ? Colors.green.shade800 : Colors.red.shade800,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Parameter Controls
            Text(
              'Audio Parameters',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 16),

            // Frequency Control
            _buildParameterSlider(
              'Frequency (Hz)',
              _frequency,
              20.0,
              20000.0,
              (value) => _updateParameter('frequency', value),
              logarithmic: true,
            ),
            const SizedBox(height: 16),

            // Gain Control
            _buildParameterSlider(
              'Gain',
              _gain,
              0.0,
              1.0,
              (value) => _updateParameter('gain', value),
            ),
            const SizedBox(height: 16),

            // Reverb Mix Control
            _buildParameterSlider(
              'Reverb Mix',
              _reverbMix,
              0.0,
              1.0,
              (value) => _updateParameter('reverbMix', value),
            ),
            const SizedBox(height: 24),

            // Action Buttons
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: _isConnected ? _loadTestPlugin : null,
                    child: const Text('Load Test Plugin'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _isConnected ? _testBatchUpdate : null,
                    child: const Text('Batch Update'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildParameterSlider(
    String label,
    double value,
    double min,
    double max,
    ValueChanged<double> onChanged, {
    bool logarithmic = false,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '$label: ${value.toStringAsFixed(2)}',
          style: const TextStyle(fontWeight: FontWeight.w500),
        ),
        const SizedBox(height: 8),
        Slider(
          value: value,
          min: min,
          max: max,
          divisions: logarithmic ? 100 : null,
          onChanged: onChanged,
        ),
      ],
    );
  }

  Future<void> _loadTestPlugin() async {
    final success = await _webSocketService.loadPlugin(
      '/path/to/test/plugin.vst3',
      'Test Plugin',
    );

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(success ? 'Plugin loaded successfully' : 'Failed to load plugin'),
        backgroundColor: success ? Colors.green : Colors.red,
      ),
    );
  }

  Future<void> _testBatchUpdate() async {
    final updates = [
      ParameterUpdate(pluginId: _currentPluginId, parameter: 'frequency', value: 880.0),
      ParameterUpdate(pluginId: _currentPluginId, parameter: 'gain', value: 0.7),
      ParameterUpdate(pluginId: _currentPluginId, parameter: 'reverbMix', value: 0.5),
    ];

    final success = await _webSocketService.batchUpdateParameters(updates);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(success ? 'Batch update successful' : 'Batch update failed'),
        backgroundColor: success ? Colors.green : Colors.red,
      ),
    );
  }

  @override
  void dispose() {
    _webSocketService.dispose();
    super.dispose();
  }
}
```

---

## 🔧 Advanced Integration Patterns

### 1. High-Performance Parameter Updates

```dart
// lib/services/high_performance_updates.dart
class HighPerformanceParameterUpdater {
  final JuceWebSocketService _webSocketService;
  final Map<String, double> _parameterCache = {};
  final Map<String, Timer> _updateTimers = {};

  static const Duration _debounceDelay = Duration(milliseconds: 16); // ~60fps

  HighPerformanceParameterUpdater(this._webSocketService);

  /// Debounced parameter update for high-frequency changes
  void updateParameterDebounced(int pluginId, String parameter, double value) {
    final key = '${pluginId}_$parameter';

    // Update cache immediately for UI responsiveness
    _parameterCache[key] = value;

    // Cancel existing timer
    _updateTimers[key]?.cancel();

    // Schedule debounced update
    _updateTimers[key] = Timer(_debounceDelay, () {
      final cachedValue = _parameterCache[key];
      if (cachedValue != null) {
        _webSocketService.updateParameter(pluginId, parameter, cachedValue);
        _updateTimers.remove(key);
      }
    });
  }

  /// Immediate update for critical parameters
  void updateParameterImmediate(int pluginId, String parameter, double value) {
    final key = '${pluginId}_$parameter';
    _parameterCache[key] = value;
    _updateTimers[key]?.cancel();
    _updateTimers.remove(key);

    _webSocketService.updateParameter(pluginId, parameter, value);
  }

  void dispose() {
    for (final timer in _updateTimers.values) {
      timer.cancel();
    }
    _updateTimers.clear();
  }
}
```

### 2. Audio Stream Processing

```dart
// lib/services/audio_stream_processor.dart
import 'dart:typed_data';
import 'package:flutter/foundation.dart';

class AudioStreamProcessor {
  static const int _sampleRate = 44100;
  static const int _bufferSize = 1024;

  final StreamController<Float32List> _processedAudioController =
      StreamController<Float32List>.broadcast();

  Float32List? _ringBuffer;
  int _ringBufferWriteIndex = 0;
  int _ringBufferReadIndex = 0;
  bool _isBufferInitialized = false;

  Stream<Float32List> get processedAudio => _processedAudioController.stream;

  /// Process incoming audio stream
  void processAudioStream(Float32List audioData) {
    if (!_isBufferInitialized) {
      _initializeRingBuffer(audioData.length);
    }

    // Add to ring buffer
    for (int i = 0; i < audioData.length; i++) {
      _ringBuffer![_ringBufferWriteIndex] = audioData[i];
      _ringBufferWriteIndex = (_ringBufferWriteIndex + 1) % _ringBuffer!.length;
    }

    // Check if we have enough data for processing
    final availableSamples = (_ringBufferWriteIndex - _ringBufferReadIndex) % _ringBuffer!.length;
    if (availableSamples >= _bufferSize) {
      _processAudioChunk();
    }
  }

  void _initializeRingBuffer(int sampleCount) {
    _ringBuffer = Float32List(sampleCount * 4); // 4x buffer for smooth processing
    _isBufferInitialized = true;
    debugPrint('Audio stream processor initialized with buffer size: ${_ringBuffer!.length}');
  }

  void _processAudioChunk() {
    if (!_isBufferInitialized) return;

    final chunk = Float32List(_bufferSize);

    for (int i = 0; i < _bufferSize; i++) {
      chunk[i] = _ringBuffer![_ringBufferReadIndex];
      _ringBufferReadIndex = (_ringBufferReadIndex + 1) % _ringBuffer!.length;
    }

    // Apply audio processing if needed
    final processedChunk = _applyAudioEffects(chunk);
    _processedAudioController.add(processedChunk);
  }

  Float32List _applyAudioEffects(Float32List audioData) {
    // Apply real-time audio effects
    // Example: simple gain adjustment
    const gain = 0.8;
    final processed = Float32List(audioData.length);

    for (int i = 0; i < audioData.length; i++) {
      processed[i] = audioData[i] * gain;
    }

    return processed;
  }

  void dispose() {
    _processedAudioController.close();
  }
}
```

### 3. Connection Management

```dart
// lib/services/connection_manager.dart
class ConnectionManager {
  final JuceWebSocketService _webSocketService;
  final StreamController<ConnectionState> _stateController =
      StreamController<ConnectionState>.broadcast();

  Timer? _healthCheckTimer;
  int _reconnectAttempts = 0;
  static const int _maxReconnectAttempts = 5;

  Stream<ConnectionState> get connectionState => _stateController.stream;

  ConnectionManager(this._webSocketService) {
    _webSocketService.connectionState.listen(_handleConnectionStateChange);
  }

  void _handleConnectionStateChange(bool isConnected) {
    if (isConnected) {
      _onConnected();
    } else {
      _onDisconnected();
    }
  }

  void _onConnected() {
    _reconnectAttempts = 0;
    _stateController.add(ConnectionState.connected);
    _startHealthCheck();
  }

  void _onDisconnected() {
    _stateController.add(ConnectionState.disconnected);
    _scheduleReconnect();
  }

  void _startHealthCheck() {
    _healthCheckTimer?.cancel();
    _healthCheckTimer = Timer.periodic(Duration(seconds: 10), (_) {
      _checkConnectionHealth();
    });
  }

  Future<void> _checkConnectionHealth() async {
    try {
      // Send ping and wait for pong
      final startTime = DateTime.now();
      // Implementation depends on WebSocket service ping/pong support

    } catch (e) {
      print('Health check failed: $e');
    }
  }

  void _scheduleReconnect() {
    if (_reconnectAttempts >= _maxReconnectAttempts) {
      _stateController.add(ConnectionState.failed);
      return;
    }

    final delay = Duration(seconds: pow(2, _reconnectAttempts).toInt());
    _reconnectAttempts++;

    Timer(delay, () {
      _stateController.add(ConnectionState.reconnecting);
      _webSocketService.initialize('your-api-key-here');
    });
  }
}

enum ConnectionState {
  disconnected,
  connecting,
  connected,
  reconnecting,
  failed,
}
```

---

## 🚀 Performance Optimization

### 1. Flutter Performance Tuning

```dart
// lib/services/performance_optimizer.dart
class PerformanceOptimizer {
  static const Duration _maxUpdateInterval = Duration(milliseconds: 16); // 60fps
  static const int _maxQueuedUpdates = 100;

  final Queue<ParameterUpdate> _updateQueue = Queue<ParameterUpdate>();
  Timer? _updateTimer;

  void scheduleUpdate(ParameterUpdate update) {
    if (_updateQueue.length >= _maxQueuedUpdates) {
      _updateQueue.removeFirst(); // Remove oldest update
    }

    _updateQueue.add(update);
    _scheduleUpdateProcessing();
  }

  void _scheduleUpdateProcessing() {
    _updateTimer?.cancel();
    _updateTimer = Timer(_maxUpdateInterval, () {
      _processQueuedUpdates();
    });
  }

  void _processQueuedUpdates() {
    if (_updateQueue.isEmpty) return;

    final updates = List<ParameterUpdate>.from(_updateQueue);
    _updateQueue.clear();

    // Send batch update
    // _webSocketService.batchUpdateParameters(updates);
  }
}
```

### 2. Memory Management

```dart
// lib/services/memory_manager.dart
class MemoryManager {
  static const int _maxAudioBufferCount = 10;
  final Queue<Float32List> _audioBufferPool = Queue<Float32List>();

  Float32List getAudioBuffer(int size) {
    if (_audioBufferPool.isNotEmpty) {
      final buffer = _audioBufferPool.removeFirst();
      if (buffer.length == size) {
        return buffer;
      } else {
        buffer.dispose();
      }
    }

    return Float32List(size);
  }

  void returnAudioBuffer(Float32List buffer) {
    if (_audioBufferPool.length < _maxAudioBufferCount) {
      _audioBufferPool.add(buffer);
    } else {
      buffer.dispose();
    }
  }

  void dispose() {
    for (final buffer in _audioBufferPool) {
      buffer.dispose();
    }
    _audioBufferPool.clear();
  }
}
```

---

## 🛠️ Troubleshooting

### Common Issues and Solutions

#### 1. Connection Failures

```dart
// Enhanced connection error handling
try {
  await _webSocketService.initialize(apiKey);
} on WebSocketChannelException catch (e) {
  print('WebSocket connection failed: ${e.message}');
  // Check if backend is running
  await _checkBackendAvailability();
} on TimeoutException catch (e) {
  print('Connection timeout: ${e.message}');
  // Implement retry logic
} catch (e) {
  print('Unexpected connection error: $e');
}

Future<bool> _checkBackendAvailability() async {
  try {
    final response = await http.get(
      Uri.parse('http://localhost:8080/api/system/info'),
      headers: {'Authorization': 'Bearer $apiKey'},
    ).timeout(Duration(seconds: 5));

    return response.statusCode == 200;
  } catch (e) {
    print('Backend not available: $e');
    return false;
  }
}
```

#### 2. Parameter Update Latency

```dart
// Measure and optimize parameter update latency
class LatencyMonitor {
  final Map<String, DateTime> _sentUpdates = {};
  final Map<String, int> _latencyMeasurements = {};

  void trackParameterUpdate(String parameterId) {
    _sentUpdates[parameterId] = DateTime.now();
  }

  void trackParameterResponse(String parameterId) {
    final sentTime = _sentUpdates[parameterId];
    if (sentTime != null) {
      final latency = DateTime.now().difference(sentTime).inMilliseconds;
      _latencyMeasurements[parameterId] = latency;
      _sentUpdates.remove(parameterId);

      // Log high latency updates
      if (latency > 10) {
        print('High latency warning: $parameterId took ${latency}ms');
      }
    }
  }

  double getAverageLatency() {
    if (_latencyMeasurements.isEmpty) return 0.0;

    final totalLatency = _latencyMeasurements.values.reduce((a, b) => a + b);
    return totalLatency / _latencyMeasurements.length;
  }
}
```

---

## 📱 Flutter Testing

### WebSocket Integration Tests

```dart
// test/widget_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import '../lib/services/juce_websocket_service.dart';

void main() {
  group('JUCE WebSocket Integration Tests', () {
    late JuceWebSocketService webSocketService;

    setUp(() {
      webSocketService = JuceWebSocketService();
    });

    tearDown(() {
      webSocketService.dispose();
    });

    testWidgets('WebSocket connection test', (WidgetTester tester) async {
      // Test connection establishment
      await webSocketService.initialize('test-api-key');

      // Wait for connection
      await tester.pump(Duration(seconds: 3));

      // Verify connection state
      expect(webSocketService.isConnected, isTrue);
    });

    testWidgets('Parameter update test', (WidgetTester tester) async {
      await webSocketService.initialize('test-api-key');
      await tester.pump(Duration(seconds: 3));

      // Test parameter update
      final result = await webSocketService.updateParameter(0, 'frequency', 440.0);
      expect(result, isTrue);
    });

    testWidgets('Batch parameter update test', (WidgetTester tester) async {
      await webSocketService.initialize('test-api-key');
      await tester.pump(Duration(seconds: 3));

      final updates = [
        ParameterUpdate(pluginId: 0, parameter: 'frequency', value: 440.0),
        ParameterUpdate(pluginId: 0, parameter: 'gain', value: 0.5),
      ];

      final result = await webSocketService.batchUpdateParameters(updates);
      expect(result, isTrue);
    });
  });
}
```

---

## 📚 API Reference

### WebSocket Message Formats

#### Authentication
```json
{
  "type": "auth",
  "apiKey": "your-api-key"
}
```

#### Parameter Update
```json
{
  "type": "parameter_update",
  "pluginId": 0,
  "parameter": "frequency",
  "value": 440.0,
  "timestamp": 1703920800000
}
```

#### Batch Parameter Update
```json
{
  "type": "batch_parameter_update",
  "updates": [
    {
      "type": "parameter_update",
      "pluginId": 0,
      "parameter": "frequency",
      "value": 440.0,
      "timestamp": 1703920800000
    }
  ]
}
```

#### Plugin Load
```json
{
  "type": "plugin_load",
  "path": "/path/to/plugin.vst3",
  "name": "Test Plugin"
}
```

---

## 🔐 Security Considerations

### 1. API Key Management

```dart
class SecureApiKeyManager {
  static const String _keyStorageKey = 'juce_api_key';

  static Future<void> storeApiKey(String apiKey) async {
    final secureStorage = FlutterSecureStorage();
    await secureStorage.write(key: _keyStorageKey, value: apiKey);
  }

  static Future<String?> getApiKey() async {
    final secureStorage = FlutterSecureStorage();
    return await secureStorage.read(key: _keyStorageKey);
  }

  static Future<void> clearApiKey() async {
    final secureStorage = FlutterSecureStorage();
    await secureStorage.delete(key: _keyStorageKey);
  }
}
```

### 2. Input Validation

```dart
class InputValidator {
  static bool isValidParameterValue(double value) {
    return value.isFinite && !value.isNaN && value >= 0.0 && value <= 1.0;
  }

  static bool isValidPluginId(int pluginId) {
    return pluginId >= 0 && pluginId < 1000;
  }

  static bool isValidParameterName(String name) {
    return name.isNotEmpty &&
           name.length <= 100 &&
           RegExp(r'^[a-zA-Z_][a-zA-Z0-9_]*$').hasMatch(name);
  }
}
```

---

## 🎯 Best Practices

### 1. Connection Management
- Always implement proper reconnection logic
- Monitor connection health with heartbeat
- Gracefully handle disconnections
- Use exponential backoff for reconnection attempts

### 2. Performance Optimization
- Debounce rapid parameter updates
- Use batch updates for multiple parameters
- Implement memory pooling for audio buffers
- Monitor and optimize latency

### 3. Error Handling
- Implement comprehensive error logging
- Provide user-friendly error messages
- Gracefully degrade functionality when disconnected
- Implement retry logic for failed operations

### 4. Security
- Store API keys securely
- Validate all input parameters
- Use HTTPS for REST API calls
- Implement rate limiting on the client side

---

## 📞 Support

For issues related to Flutter integration with the JUCE WebSocket API:

1. **Backend Status**: Check if JUCE backend is running on port 8080
2. **API Key**: Ensure valid API key is provided
3. **Network**: Verify local network connectivity
4. **Logs**: Check both Flutter and JUCE backend logs for detailed error information

**Contact**: Backend team for WebSocket API-specific issues
**Flutter Team**: For Flutter-specific integration questions

---

**Version**: 1.2.0
**Last Updated**: December 2024
**Compatible with**: JUCE Backend v1.2.0+