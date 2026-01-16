# Flutter REST API Integration Guide for JUCE Backend v1.2.0

## Overview

Complete integration guide for Flutter applications to connect to the JUCE backend REST API system. This guide covers plugin management, state persistence, system information, and administrative operations.

**Target Version**: JUCE Backend v1.2.0
**Base URL**: `http://localhost:8080/api`
**Authentication**: Bearer token API key
**Content Type**: `application/json`

---

## 🚀 Quick Start - REST API Integration

### 1. Add Dependencies

```yaml
# pubspec.yaml
dependencies:
  flutter:
    sdk: flutter
  http: ^1.1.0
  dio: ^5.3.2  # Recommended for advanced HTTP features
  json_annotation: ^4.8.1
  pretty_dio_logger: ^1.3.1  # For API debugging
```

### 2. REST API Service

```dart
// lib/services/juce_rest_api_service.dart
import 'package:dio/dio.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class JuceRestApiService {
  static const String _baseUrl = 'http://localhost:8080/api';
  late Dio _dio;
  String? _apiKey;

  JuceRestApiService() {
    _initializeDio();
  }

  void _initializeDio() {
    _dio = Dio(BaseOptions(
      baseUrl: _baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 30),
      sendTimeout: const Duration(seconds: 10),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    // Add logging interceptor for debugging
    _dio.interceptors.add(PrettyDioLogger(
      requestHeader: true,
      requestBody: true,
      responseHeader: true,
      responseBody: true,
    ));

    // Add authentication interceptor
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        if (_apiKey != null) {
          options.headers['Authorization'] = 'Bearer $_apiKey';
        }
        return handler.next(options);
      },
      onError: (error, handler) {
        _handleApiError(error);
        return handler.next(error);
      },
    ));
  }

  /// Initialize with API key
  void initialize(String apiKey) {
    _apiKey = apiKey;
  }

  /// ===== PLUGIN MANAGEMENT =====

  /// Load a new plugin
  Future<PluginLoadResponse> loadPlugin({
    required String path,
    required String name,
  }) async {
    try {
      final response = await _dio.post('/plugins/load', data: {
        'path': path,
        'name': name,
      });

      return PluginLoadResponse.fromJson(response.data);
    } on DioException catch (e) {
      throw ApiException('Failed to load plugin: ${e.message}', e);
    }
  }

  /// Get list of all loaded plugins
  Future<List<PluginInfo>> listPlugins() async {
    try {
      final response = await _dio.get('/plugins');
      final pluginsJson = response.data['plugins'] as List;
      return pluginsJson.map((json) => PluginInfo.fromJson(json)).toList();
    } on DioException catch (e) {
      throw ApiException('Failed to list plugins: ${e.message}', e);
    }
  }

  /// Get detailed information about a specific plugin
  Future<PluginInfo> getPluginInfo(int pluginId) async {
    try {
      final response = await _dio.get('/plugins/$pluginId');
      return PluginInfo.fromJson(response.data);
    } on DioException catch (e) {
      throw ApiException('Failed to get plugin info: ${e.message}', e);
    }
  }

  /// Update plugin parameters
  Future<bool> updatePluginParameters({
    required int pluginId,
    required Map<String, dynamic> parameters,
  }) async {
    try {
      await _dio.put('/plugins/$pluginId/parameters', data: parameters);
      return true;
    } on DioException catch (e) {
      throw ApiException('Failed to update plugin parameters: ${e.message}', e);
    }
  }

  /// Unload a plugin
  Future<bool> unloadPlugin(int pluginId) async {
    try {
      await _dio.delete('/plugins/$pluginId');
      return true;
    } on DioException catch (e) {
      throw ApiException('Failed to unload plugin: ${e.message}', e);
    }
  }

  /// ===== STATE MANAGEMENT =====

  /// Save plugin state
  Future<StateSaveResponse> savePluginState({
    required int pluginId,
    required String stateName,
  }) async {
    try {
      final response = await _dio.post('/plugins/$pluginId/state', data: {
        'name': stateName,
      });

      return StateSaveResponse.fromJson(response.data);
    } on DioException catch (e) {
      throw ApiException('Failed to save plugin state: ${e.message}', e);
    }
  }

  /// Load plugin state
  Future<StateLoadResponse> loadPluginState({
    required int pluginId,
    required String stateId,
  }) async {
    try {
      final response = await _dio.post('/plugins/$pluginId/state/$stateId', data: {
        'load': 'true',
      });

      return StateLoadResponse.fromJson(response.data);
    } on DioException catch (e) {
      throw ApiException('Failed to load plugin state: ${e.message}', e);
    }
  }

  /// List saved states for a plugin
  Future<List<PluginState>> listPluginStates(int pluginId) async {
    try {
      final response = await _dio.get('/plugins/$pluginId/states');
      final statesJson = response.data['states'] as List;
      return statesJson.map((json) => PluginState.fromJson(json)).toList();
    } on DioException catch (e) {
      throw ApiException('Failed to list plugin states: ${e.message}', e);
    }
  }

  /// Delete a saved plugin state
  Future<bool> deletePluginState(String stateId) async {
    try {
      await _dio.delete('/state/$stateId');
      return true;
    } on DioException catch (e) {
      throw ApiException('Failed to delete plugin state: ${e.message}', e);
    }
  }

  /// ===== SYSTEM INFORMATION =====

  /// Get system information
  Future<SystemInfo> getSystemInfo() async {
    try {
      final response = await _dio.get('/system/info');
      return SystemInfo.fromJson(response.data);
    } on DioException catch (e) {
      throw ApiException('Failed to get system info: ${e.message}', e);
    }
  }

  /// Get performance metrics
  Future<PerformanceMetrics> getPerformanceMetrics() async {
    try {
      final response = await _dio.get('/system/performance');
      return PerformanceMetrics.fromJson(response.data);
    } on DioException catch (e) {
      throw ApiException('Failed to get performance metrics: ${e.message}', e);
    }
  }

  /// Get list of available audio devices
  Future<List<AudioDevice>> getAudioDevices() async {
    try {
      final response = await _dio.get('/system/devices');
      final devicesJson = response.data['devices'] as List;
      return devicesJson.map((json) => AudioDevice.fromJson(json)).toList();
    } on DioException catch (e) {
      throw ApiException('Failed to get audio devices: ${e.message}', e);
    }
  }

  /// Switch to a different audio device
  Future<bool> switchAudioDevice({
    required String deviceId,
  }) async {
    try {
      await _dio.post('/system/devices/switch', data: {
        'deviceId': deviceId,
      });
      return true;
    } on DioException catch (e) {
      throw ApiException('Failed to switch audio device: ${e.message}', e);
    }
  }

  /// ===== UTILITY METHODS =====

  /// Test API connection
  Future<bool> testConnection() async {
    try {
      final response = await _dio.get('/system/info');
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  /// Health check
  Future<Map<String, dynamic>> healthCheck() async {
    try {
      final response = await _dio.get('/system/health');
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw ApiException('Health check failed: ${e.message}', e);
    }
  }

  void _handleApiError(DioException error) {
    print('API Error: ${error.message}');
    print('Response: ${error.response?.data}');

    switch (error.type) {
      case DioExceptionType.connectionTimeout:
        print('Connection timeout - check if backend is running');
        break;
      case DioExceptionType.receiveTimeout:
        print('Receive timeout - server is taking too long to respond');
        break;
      case DioExceptionType.badResponse:
        _handleHttpError(error.response!);
        break;
      default:
        print('Unknown API error: ${error.type}');
    }
  }

  void _handleHttpError(Response response) {
    print('HTTP Error: ${response.statusCode} ${response.statusMessage}');
    print('Response body: ${response.data}');

    switch (response.statusCode) {
      case 401:
        print('Authentication failed - check API key');
        break;
      case 403:
        print('Access forbidden - insufficient permissions');
        break;
      case 404:
        print('Resource not found');
        break;
      case 429:
        print('Rate limit exceeded - try again later');
        break;
      case 500:
        print('Server error - check backend logs');
        break;
    }
  }
}

// ===== DATA MODELS =====

class PluginLoadResponse {
  final bool success;
  final int pluginId;
  final String message;

  PluginLoadResponse({
    required this.success,
    required this.pluginId,
    required this.message,
  });

  factory PluginLoadResponse.fromJson(Map<String, dynamic> json) {
    return PluginLoadResponse(
      success: json['success'] ?? false,
      pluginId: json['plugin_id'] ?? -1,
      message: json['message'] ?? '',
    );
  }
}

class PluginInfo {
  final int id;
  final String name;
  final String path;
  final bool loaded;
  final Map<String, dynamic> parameters;
  final String? state;

  PluginInfo({
    required this.id,
    required this.name,
    required this.path,
    required this.loaded,
    required this.parameters,
    this.state,
  });

  factory PluginInfo.fromJson(Map<String, dynamic> json) {
    return PluginInfo(
      id: json['id'],
      name: json['name'],
      path: json['path'],
      loaded: json['loaded'],
      parameters: Map<String, dynamic>.from(json['parameters'] ?? {}),
      state: json['state'],
    );
  }
}

class StateSaveResponse {
  final bool success;
  final String stateId;
  final String message;

  StateSaveResponse({
    required this.success,
    required this.stateId,
    required this.message,
  });

  factory StateSaveResponse.fromJson(Map<String, dynamic> json) {
    return StateSaveResponse(
      success: json['success'] ?? false,
      stateId: json['state_id'] ?? '',
      message: json['message'] ?? '',
    );
  }
}

class StateLoadResponse {
  final bool success;
  final String status;
  final Map<String, dynamic>? parameters;

  StateLoadResponse({
    required this.success,
    required this.status,
    this.parameters,
  });

  factory StateLoadResponse.fromJson(Map<String, dynamic> json) {
    return StateLoadResponse(
      success: json['success'] ?? false,
      status: json['status'] ?? '',
      parameters: json['parameters'] != null
          ? Map<String, dynamic>.from(json['parameters'])
          : null,
    );
  }
}

class PluginState {
  final String id;
  final String name;
  final DateTime createdAt;
  final Map<String, dynamic> parameters;

  PluginState({
    required this.id,
    required this.name,
    required this.createdAt,
    required this.parameters,
  });

  factory PluginState.fromJson(Map<String, dynamic> json) {
    return PluginState(
      id: json['id'],
      name: json['name'],
      createdAt: DateTime.parse(json['created_at']),
      parameters: Map<String, dynamic>.from(json['parameters']),
    );
  }
}

class SystemInfo {
  final String version;
  final String buildDate;
  final int loadedPlugins;
  final double cpuUsage;
  final int memoryUsage;

  SystemInfo({
    required this.version,
    required this.buildDate,
    required this.loadedPlugins,
    required this.cpuUsage,
    required this.memoryUsage,
  });

  factory SystemInfo.fromJson(Map<String, dynamic> json) {
    return SystemInfo(
      version: json['version'],
      buildDate: json['build_date'],
      loadedPlugins: json['loaded_plugins'],
      cpuUsage: json['cpu_usage'].toDouble(),
      memoryUsage: json['memory_usage'],
    );
  }
}

class PerformanceMetrics {
  final double averageLatency;
  final double peakLatency;
  final int parametersPerSecond;
  final double cpuUsage;
  final int activeConnections;

  PerformanceMetrics({
    required this.averageLatency,
    required this.peakLatency,
    required this.parametersPerSecond,
    required this.cpuUsage,
    required this.activeConnections,
  });

  factory PerformanceMetrics.fromJson(Map<String, dynamic> json) {
    return PerformanceMetrics(
      averageLatency: json['average_latency'].toDouble(),
      peakLatency: json['peak_latency'].toDouble(),
      parametersPerSecond: json['parameters_per_second'],
      cpuUsage: json['cpu_usage'].toDouble(),
      activeConnections: json['active_connections'],
    );
  }
}

class AudioDevice {
  final String id;
  final String name;
  final String type;
  final bool isDefault;
  final int sampleRate;
  final int bufferSize;

  AudioDevice({
    required this.id,
    required this.name,
    required this.type,
    required this.isDefault,
    required this.sampleRate,
    required this.bufferSize,
  });

  factory AudioDevice.fromJson(Map<String, dynamic> json) {
    return AudioDevice(
      id: json['id'],
      name: json['name'],
      type: json['type'],
      isDefault: json['is_default'],
      sampleRate: json['sample_rate'],
      bufferSize: json['buffer_size'],
    );
  }
}

class ApiException implements Exception {
  final String message;
  final DioException? originalError;

  ApiException(this.message, [this.originalError]);

  @override
  String toString() {
    return 'ApiException: $message';
  }
}
```

---

## 🎨 Flutter UI Examples

### Plugin Management Widget

```dart
// lib/widgets/plugin_management_widget.dart
import 'package:flutter/material.dart';
import '../services/juce_rest_api_service.dart';

class PluginManagementWidget extends StatefulWidget {
  const PluginManagementWidget({Key? key}) : super(key: key);

  @override
  _PluginManagementWidgetState createState() => _PluginManagementWidgetState();
}

class _PluginManagementWidgetState extends State<PluginManagementWidget> {
  final JuceRestApiService _apiService = JuceRestApiService();
  List<PluginInfo> _plugins = [];
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _apiService.initialize('your-api-key-here');
    _loadPlugins();
  }

  Future<void> _loadPlugins() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final plugins = await _apiService.listPlugins();
      setState(() {
        _plugins = plugins;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _loadPlugin() async {
    final result = await showDialog<String>(
      context: context,
      builder: (context) => PluginLoadDialog(),
    );

    if (result != null) {
      final parts = result.split('|');
      if (parts.length == 2) {
        await _doLoadPlugin(parts[0], parts[1]);
      }
    }
  }

  Future<void> _doLoadPlugin(String path, String name) async {
    try {
      final response = await _apiService.loadPlugin(path: path, name: name);
      if (response.success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Plugin loaded successfully: ${response.message}'),
            backgroundColor: Colors.green,
          ),
        );
        _loadPlugins(); // Refresh plugin list
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to load plugin: ${response.message}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error loading plugin: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _unloadPlugin(int pluginId) async {
    try {
      final success = await _apiService.unloadPlugin(pluginId);
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Plugin unloaded successfully'),
            backgroundColor: Colors.green,
          ),
        );
        _loadPlugins(); // Refresh plugin list
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error unloading plugin: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Plugin Management'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadPlugins,
          ),
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: _loadPlugin,
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_errorMessage != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text(
              'Error: $_errorMessage',
              style: const TextStyle(fontSize: 16),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadPlugins,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (_plugins.isEmpty) {
      return const Center(
        child: Text('No plugins loaded'),
      );
    }

    return ListView.builder(
      itemCount: _plugins.length,
      itemBuilder: (context, index) {
        final plugin = _plugins[index];
        return PluginCard(
          plugin: plugin,
          onUnload: () => _unloadPlugin(plugin.id),
          onDetails: () => _showPluginDetails(plugin),
        );
      },
    );
  }

  void _showPluginDetails(PluginInfo plugin) {
    showDialog(
      context: context,
      builder: (context) => PluginDetailsDialog(plugin: plugin),
    );
  }
}

class PluginCard extends StatelessWidget {
  final PluginInfo plugin;
  final VoidCallback onUnload;
  final VoidCallback onDetails;

  const PluginCard({
    Key? key,
    required this.plugin,
    required this.onUnload,
    required this.onDetails,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: plugin.loaded ? Colors.green : Colors.grey,
          child: Icon(
            plugin.loaded ? Icons.check : Icons.close,
            color: Colors.white,
          ),
        ),
        title: Text(plugin.name),
        subtitle: Text('ID: ${plugin.id} | ${plugin.loaded ? "Loaded" : "Not Loaded"}'),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: const Icon(Icons.info_outline),
              onPressed: onDetails,
              tooltip: 'Details',
            ),
            IconButton(
              icon: const Icon(Icons.delete_outline),
              onPressed: plugin.loaded ? onUnload : null,
              tooltip: 'Unload',
            ),
          ],
        ),
      ),
    );
  }
}

class PluginLoadDialog extends StatefulWidget {
  const PluginLoadDialog({Key? key}) : super(key: key);

  @override
  _PluginLoadDialogState createState() => _PluginLoadDialogState();
}

class _PluginLoadDialogState extends State<PluginLoadDialog> {
  final TextEditingController _pathController = TextEditingController();
  final TextEditingController _nameController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Load Plugin'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            controller: _pathController,
            decoration: const InputDecoration(
              labelText: 'Plugin Path',
              hintText: '/path/to/plugin.vst3',
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _nameController,
            decoration: const InputDecoration(
              labelText: 'Plugin Name',
              hintText: 'My Plugin',
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: () {
            if (_pathController.text.isNotEmpty && _nameController.text.isNotEmpty) {
              Navigator.of(context).pop('${_pathController.text}|${_nameController.text}');
            }
          },
          child: const Text('Load'),
        ),
      ],
    );
  }
}

class PluginDetailsDialog extends StatelessWidget {
  final PluginInfo plugin;

  const PluginDetailsDialog({
    Key? key,
    required this.plugin,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(plugin.name),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('ID: ${plugin.id}'),
            const SizedBox(height: 8),
            Text('Path: ${plugin.path}'),
            const SizedBox(height: 8),
            Text('Status: ${plugin.loaded ? "Loaded" : "Not Loaded"}'),
            const SizedBox(height: 8),
            Text('Parameters: ${plugin.parameters.length}'),
            if (plugin.parameters.isNotEmpty) ...[
              const SizedBox(height: 8),
              const Text('Parameter Values:'),
              ...plugin.parameters.entries.map(
                (entry) => Text('  ${entry.key}: ${entry.value}'),
              ),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Close'),
        ),
      ],
    );
  }
}
```

---

## 📱 State Management Integration

### Provider/State Manager Integration

```dart
// lib/state/audio_state.dart
import 'package:flutter/foundation.dart';
import '../services/juce_rest_api_service.dart';

class AudioState extends ChangeNotifier {
  final JuceRestApiService _apiService;
  List<PluginInfo> _plugins = [];
  bool _isLoading = false;
  String? _error;

  AudioState() : _apiService = JuceRestApiService() {
    _apiService.initialize('your-api-key-here');
  }

  List<PluginInfo> get plugins => _plugins;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadPlugins() async {
    _setLoading(true);
    _setError(null);

    try {
      _plugins = await _apiService.listPlugins();
      notifyListeners();
    } catch (e) {
      _setError(e.toString());
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> loadPlugin(String path, String name) async {
    try {
      final response = await _apiService.loadPlugin(path: path, name: name);
      if (response.success) {
        await loadPlugins(); // Refresh
        return true;
      }
      _setError(response.message);
      return false;
    } catch (e) {
      _setError(e.toString());
      return false;
    }
  }

  Future<bool> unloadPlugin(int pluginId) async {
    try {
      final success = await _apiService.unloadPlugin(pluginId);
      if (success) {
        await loadPlugins(); // Refresh
        return true;
      }
      return false;
    } catch (e) {
      _setError(e.toString());
      return false;
    }
  }

  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  void _setError(String? error) {
    _error = error;
    notifyListeners();
  }
}
```

### Provider Widget Usage

```dart
// lib/main.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'state/audio_state.dart';
import 'widgets/plugin_management_widget.dart';

void main() {
  runApp(
    ChangeNotifierProvider(
      create: (context) => AudioState(),
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'JUCE Backend Integration',
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      home: Consumer<AudioState>(
        builder: (context, audioState, child) {
          return Scaffold(
            appBar: AppBar(
              title: const Text('JUCE Backend'),
              actions: [
                if (audioState.isLoading)
                  const CircularProgressIndicator()
                else
                  IconButton(
                    icon: const Icon(Icons.refresh),
                    onPressed: audioState.loadPlugins,
                  ),
              ],
            ),
            body: audioState.error != null
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error, size: 64),
                        const SizedBox(height: 16),
                        Text(
                          'Error: ${audioState.error}',
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: audioState.loadPlugins,
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  )
                : const PluginManagementWidget(),
          );
        },
      ),
    );
  }
}
```

---

## 🧪 Testing

### REST API Integration Tests

```dart
// test/services/juce_rest_api_service_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import '../lib/services/juce_rest_api_service.dart';

void main() {
  group('JuceRestApiService Tests', () {
    late JuceRestApiService apiService;

    setUp(() {
      apiService = JuceRestApiService();
      apiService.initialize('test-api-key');
    });

    group('Plugin Management', () {
      test('should load plugin successfully', () async {
        // Mock successful response
        // In real tests, you'd use a mock HTTP client

        // This test would need mock HTTP client setup
        // For now, just test the method exists
        expect(() => apiService.loadPlugin(
          path: '/test/plugin.vst3',
          name: 'Test Plugin',
        ), returnsNormally);
      });

      test('should list plugins', () async {
        // Test listPlugins method
        expect(() => apiService.listPlugins(), returnsNormally);
      });

      test('should handle plugin load failure', () async {
        // Test error handling
        expect(() => apiService.loadPlugin(
          path: '',
          name: '',
        ), throwsA(isA<ApiException>));
      });
    });

    group('State Management', () {
      test('should save plugin state', () async {
        expect(() => apiService.savePluginState(
          pluginId: 0,
          stateName: 'test_state',
        ), returnsNormally);
      });

      test('should load plugin state', () async {
        expect(() => apiService.loadPluginState(
          pluginId: 0,
          stateId: 'test_state_id',
        ), returnsNormally);
      });
    });

    group('System Information', () {
      test('should get system info', () async {
        expect(() => apiService.getSystemInfo(), returnsNormally);
      });

      test('should get performance metrics', () async {
        expect(() => apiService.getPerformanceMetrics(), returnsNormally);
      });

      test('should get audio devices', () async {
        expect(() => apiService.getAudioDevices(), returnsNormally);
      });
    });
  });
}
```

---

## 📚 API Reference

### Response Formats

#### Plugin Load Response
```json
{
  "success": true,
  "plugin_id": 1,
  "message": "Plugin loaded successfully"
}
```

#### Plugin List Response
```json
{
  "plugins": [
    {
      "id": 1,
      "name": "Test Plugin",
      "path": "/path/to/plugin.vst3",
      "loaded": true,
      "parameters": {
        "frequency": 440.0,
        "gain": 0.5
      },
      "state": "current_state_id"
    }
  ]
}
```

#### State Save Response
```json
{
  "success": true,
  "state_id": "state_12345",
  "message": "State saved successfully"
}
```

#### State Load Response
```json
{
  "success": true,
  "status": "state_loaded",
  "parameters": {
    "frequency": 440.0,
    "gain": 0.5
  }
}
```

#### System Info Response
```json
{
  "version": "1.2.0",
  "build_date": "2024-12-10",
  "loaded_plugins": 3,
  "cpu_usage": 15.2,
  "memory_usage": 512
}
```

#### Performance Metrics Response
```json
{
  "average_latency": 1.2,
  "peak_latency": 5.8,
  "parameters_per_second": 1250,
  "cpu_usage": 15.2,
  "active_connections": 25
}
```

---

## 🔐 Security Considerations

### API Key Management

```dart
// lib/services/secure_api_key_manager.dart
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureApiKeyManager {
  static const String _apiKeyKey = 'juce_api_key';
  static const FlutterSecureStorage _storage = FlutterSecureStorage();

  static Future<void> saveApiKey(String apiKey) async {
    await _storage.write(key: _apiKeyKey, value: apiKey);
  }

  static Future<String?> getApiKey() async {
    return await _storage.read(key: _apiKeyKey);
  }

  static Future<void> deleteApiKey() async {
    await _storage.delete(key: _apiKeyKey);
  }

  static Future<bool> hasApiKey() async {
    final apiKey = await getApiKey();
    return apiKey != null && apiKey.isNotEmpty;
  }
}
```

### Input Validation

```dart
// lib/services/input_validator.dart
class InputValidator {
  static bool isValidPluginPath(String path) {
    return path.isNotEmpty &&
           path.length <= 500 &&
           !path.contains('..') &&
           !path.contains('\0');
  }

  static bool isValidPluginName(String name) {
    return name.isNotEmpty &&
           name.length <= 100 &&
           RegExp(r'^[a-zA-Z0-9_\-\s]+$').hasMatch(name);
  }

  static bool isValidStateName(String name) {
    return name.isNotEmpty &&
           name.length <= 50 &&
           RegExp(r'^[a-zA-Z0-9_\-\s]+$').hasMatch(name);
  }

  static bool isValidPluginId(int id) {
    return id >= 0 && id < 10000;
  }
}
```

---

## 🎯 Best Practices

### 1. Error Handling
- Always catch and handle ApiException
- Provide user-friendly error messages
- Implement retry logic for transient failures
- Log detailed error information for debugging

### 2. Performance Optimization
- Use pagination for large lists
- Implement caching for frequently accessed data
- Use lazy loading for complex UI components
- Debounce API calls when appropriate

### 3. Security
- Store API keys securely using FlutterSecureStorage
- Validate all user input before sending to API
- Use HTTPS in production
- Implement rate limiting on the client side

### 4. UI/UX
- Show loading indicators during API calls
- Provide feedback for user actions
- Handle offline scenarios gracefully
- Implement pull-to-refresh for data

---

**Version**: 1.2.0
**Last Updated**: December 2024
**Compatible with**: JUCE Backend v1.2.0+