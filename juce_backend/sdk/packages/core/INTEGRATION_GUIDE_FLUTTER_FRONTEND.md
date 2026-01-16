# 📱 Flutter Frontend Integration Guide

## Overview

This guide helps the Flutter frontend team integrate the new Schillinger SDK features into Flutter applications for mobile and web platforms.

## 🆕 **NEW FEATURES TO INTEGRATE**

### 1. Visual Composition Editor

#### **Flutter WebView Integration**
```dart
// schillinger_visual_editor.dart
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

class SchillingerVisualEditor extends StatefulWidget {
  final SchillingerComposition composition;
  final Function(SchillingerComposition)? onCompositionChanged;
  final bool enableCollaboration;

  const SchillingerVisualEditor({
    Key? key,
    required this.composition,
    this.onCompositionChanged,
    this.enableCollaboration = true,
  }) : super(key: key);

  @override
  State<SchillingerVisualEditor> createState() => _SchillingerVisualEditorState();
}

class _SchillingerVisualEditorState extends State<SchillingerVisualEditor> {
  late final WebViewController _controller;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _initializeWebViewController();
  }

  Future<void> _initializeWebViewController() async {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0x00000000))
      ..enableZoom(false)
      ..addJavaScriptChannel(
        JavaScriptChannel(
          name: 'SchillingerBridge',
          onMessageReceived: _handleJavaScriptMessage,
        ),
      )
      ..loadFlutterAsset('assets/schillinger_editor.html');

    // Wait for WebView to load
    await _controller.getCurrentUrl();

    if (mounted) {
      setState(() {
        _isLoading = false;
      });

      // Initialize editor with composition
      _initializeEditor();
    }
  }

  Future<void> _initializeEditor() async {
    final compositionJson = jsonEncode(widget.composition.toJson());

    await _controller.runJavaScript('''
      if (window.schillingerEditor) {
        window.schillingerEditor.initializeComposition($compositionJson);
        window.schillingerEditor.setTheme('dark');
        window.schillingerEditor.enableCollaboration(${widget.enableCollaboration});
      }
    ''');
  }

  void _handleJavaScriptMessage(JavaScriptMessage message) {
    try {
      final data = jsonDecode(message.message);

      switch (data['type']) {
        case 'compositionChanged':
          final updatedComposition = SchillingerComposition.fromJson(data['composition']);
          widget.onCompositionChanged?.call(updatedComposition);
          break;

        case 'playbackStarted':
          _onPlaybackStarted();
          break;

        case 'playbackStopped':
          _onPlaybackStopped();
          break;

        case 'exportCompleted':
          _onExportCompleted(data['result']);
          break;

        case 'error':
          _onError(data['error']);
          break;
      }
    } catch (e) {
      debugPrint('Error handling JavaScript message: $e');
    }
  }

  // Public methods for external control
  Future<void> startPlayback() async {
    await _controller.runJavaScript('''
      if (window.schillingerEditor) {
        window.schillingerEditor.startPlayback();
      }
    ''');
  }

  Future<void> stopPlayback() async {
    await _controller.runJavaScript('''
      if (window.schillingerEditor) {
        window.schillingerEditor.stopPlayback();
      }
    ''');
  }

  Future<void> zoomIn() async {
    await _controller.runJavaScript('''
      if (window.schillingerEditor) {
        window.schillingerEditor.zoom(1.5);
      }
    ''');
  }

  Future<void> selectElement(String elementId) async {
    await _controller.runJavaScript('''
      if (window.schillingerEditor) {
        window.schillingerEditor.selectElement('$elementId');
      }
    ''');
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    return Scaffold(
      body: WebViewWidget(controller: _controller),
      floatingActionButton: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          FloatingActionButton(
            heroTag: "play",
            onPressed: () => startPlayback(),
            child: const Icon(Icons.play_arrow),
          ),
          const SizedBox(height: 8),
          FloatingActionButton(
            heroTag: "stop",
            onPressed: () => stopPlayback(),
            child: const Icon(Icons.stop),
          ),
          const SizedBox(height: 8),
          FloatingActionButton(
            heroTag: "export",
            onPressed: _showExportDialog,
            child: const Icon(Icons.file_download),
          ),
        ],
      ),
    );
  }
}
```

#### **HTML Template for WebView**
```html
<!-- assets/schillinger_editor.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Schillinger Visual Editor</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #121212;
            color: #ffffff;
            overflow: hidden;
        }

        #editor-canvas {
            width: 100vw;
            height: 100vh;
            display: block;
        }

        .loading {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="loading" id="loading">
        <div>Loading Schillinger Editor...</div>
    </div>
    <canvas id="editor-canvas"></canvas>

    <!-- Load Schillinger SDK -->
    <script src="https://unpkg.com/@schillinger-sdk/core/dist/index.js"></script>

    <script>
        class FlutterSchillingerBridge {
            constructor() {
                this.editor = null;
                this.initialized = false;
            }

            async initializeEditor() {
                try {
                    // Create visual editor
                    const canvas = document.getElementById('editor-canvas');
                    this.editor = new SchillingerSDK.VisualCompositionEditor(canvas, {
                        theme: 'dark',
                        layout: 'horizontal',
                        autoSave: true,
                        colorScheme: {
                            primary: '#2196F3',
                            accent: '#FF9800',
                            background: '#121212',
                            text: '#FFFFFF'
                        }
                    });

                    // Set up event listeners
                    this.setupEventListeners();

                    // Hide loading indicator
                    document.getElementById('loading').style.display = 'none';

                    // Expose to global scope
                    window.schillingerEditor = this.editor;
                    this.initialized = true;

                    // Notify Flutter
                    this.sendMessage('initialized');
                } catch (error) {
                    console.error('Failed to initialize editor:', error);
                    this.sendMessage('error', { error: error.message });
                }
            }

            setupEventListeners() {
                if (!this.editor) return;

                this.editor.on('playbackStarted', () => {
                    this.sendMessage('playbackStarted');
                });

                this.editor.on('playbackStopped', () => {
                    this.sendMessage('playbackStopped');
                });

                this.editor.on('compositionChanged', (composition) => {
                    this.sendMessage('compositionChanged', {
                        composition: composition
                    });
                });

                this.editor.on('exportCompleted', (result) => {
                    this.sendMessage('exportCompleted', {
                        result: result
                    });
                });
            }

            initializeComposition(compositionData) {
                if (this.editor && compositionData) {
                    try {
                        const composition = JSON.parse(compositionData);
                        this.editor.composition = composition;
                    } catch (error) {
                        console.error('Failed to parse composition:', error);
                    }
                }
            }

            startPlayback() {
                if (this.editor) {
                    this.editor.startPlayback();
                }
            }

            stopPlayback() {
                if (this.editor) {
                    this.editor.stopPlayback();
                }
            }

            zoom(factor) {
                if (this.editor) {
                    this.editor.zoom(factor, this.editor.viewport.width / 2, this.editor.viewport.height / 2);
                }
            }

            selectElement(elementId) {
                if (this.editor) {
                    this.editor.selectElement(elementId);
                }
            }

            sendMessage(type, data = {}) {
                if (window.SchillingerBridge) {
                    window.SchillingerBridge.postMessage(JSON.stringify({
                        type: type,
                        ...data
                    }));
                }
            }
        }

        // Initialize when DOM is ready
        document.addEventListener('DOMContentLoaded', () => {
            window.schillingerBridge = new FlutterSchillingerBridge();
            window.schillingerBridge.initializeEditor();
        });
    </script>
</body>
</html>
```

### 2. Collaboration Features

#### **Real-Time Collaboration Provider**
```dart
// collaboration_provider.dart
import 'package:flutter/foundation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'dart:convert';

class CollaborationProvider extends ChangeNotifier {
  late final WebSocketChannel _channel;
  final String _userId;
  final String _sessionId;

  List<CollaborativeUser> _participants = [];
  List<CollaborativeOperation> _operations = [];
  bool _isConnected = false;
  String? _error;

  CollaborationProvider({
    required String serverUrl,
    required String userId,
    required String sessionId,
  }) : _userId = userId,
       _sessionId = sessionId {

    _channel = WebSocketChannel.connect(Uri.parse('$serverUrl/session/$sessionId'));

    _channel.stream.listen(
      _handleMessage,
      onError: (error) {
        _error = error.toString();
        _isConnected = false;
        notifyListeners();
      },
      onDone: () {
        _isConnected = false;
        notifyListeners();
      },
    );

    _sendJoinMessage();
  }

  void _handleMessage(dynamic message) {
    try {
      final data = jsonDecode(message);

      switch (data['type']) {
        case 'welcome':
          _isConnected = true;
          notifyListeners();
          break;

        case 'userJoined':
          final user = CollaborativeUser.fromJson(data['user']);
          _participants.add(user);
          notifyListeners();
          break;

        case 'userLeft':
          _participants.removeWhere((u) => u.id == data['userId']);
          notifyListeners();
          break;

        case 'operation':
          final operation = CollaborativeOperation.fromJson(data['operation']);
          if (operation.userId != _userId) {
            _operations.add(operation);
            notifyListeners();
          }
          break;

        case 'error':
          _error = data['error'];
          notifyListeners();
          break;
      }
    } catch (e) {
      debugPrint('Error handling collaboration message: $e');
    }
  }

  void _sendJoinMessage() {
    _channel.sink.add(jsonEncode({
      'type': 'join',
      'userId': _userId,
      'sessionId': _sessionId,
    }));
  }

  void sendOperation(CollaborativeOperation operation) {
    if (_isConnected) {
      final message = {
        'type': 'operation',
        'operation': operation.toJson(),
      };

      _channel.sink.add(jsonEncode(message));
    }
  }

  void sendNoteOperation({
    required String noteId,
    required int pitch,
    required double startTime,
    required double duration,
    required int velocity,
  }) {
    final operation = CollaborativeOperation(
      id: const Uuid().v4(),
      type: 'note',
      targetId: noteId,
      targetType: 'note',
      data: {
        'pitch': pitch,
        'startTime': startTime,
        'duration': duration,
        'velocity': velocity,
      },
      userId: _userId,
      sessionId: _sessionId,
      timestamp: DateTime.now(),
    );

    sendOperation(operation);
  }

  void sendTrackOperation({
    required String trackId,
    required String property,
    required dynamic value,
  }) {
    final operation = CollaborativeOperation(
      id: const Uuid().v4(),
      type: 'track',
      targetId: trackId,
      targetType: 'track',
      data: {
        'property': property,
        'value': value,
      },
      userId: _userId,
      sessionId: _sessionId,
      timestamp: DateTime.now(),
    );

    sendOperation(operation);
  }

  // Getters
  List<CollaborativeUser> get participants => _participants;
  List<CollaborativeOperation> get operations => _operations;
  bool get isConnected => _isConnected;
  String? get error => _error;

  @override
  void dispose() {
    _channel.sink.close();
    super.dispose();
  }
}

class CollaborativeUser {
  final String id;
  final String name;
  final String role;
  final String status;
  final Color color;

  CollaborativeUser({
    required this.id,
    required this.name,
    required this.role,
    required this.status,
    required this.color,
  });

  factory CollaborativeUser.fromJson(Map<String, dynamic> json) {
    return CollaborativeUser(
      id: json['id'],
      name: json['name'],
      role: json['role'],
      status: json['status'],
      color: Color(int.parse(json['color'].replace('#', '0xFF'))),
    );
  }
}

class CollaborativeOperation {
  final String id;
  final String type;
  final String targetId;
  final String targetType;
  final Map<String, dynamic> data;
  final String userId;
  final String sessionId;
  final DateTime timestamp;

  CollaborativeOperation({
    required this.id,
    required this.type,
    required this.targetId,
    required this.targetType,
    required this.data,
    required this.userId,
    required this.sessionId,
    required this.timestamp,
  });

  factory CollaborativeOperation.fromJson(Map<String, dynamic> json) {
    return CollaborativeOperation(
      id: json['id'],
      type: json['type'],
      targetId: json['targetId'],
      targetType: json['targetType'],
      data: Map<String, dynamic>.from(json['data']),
      userId: json['userId'],
      sessionId: json['sessionId'],
      timestamp: DateTime.parse(json['timestamp']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type,
      'targetId': targetId,
      'targetType': targetType,
      'data': data,
      'userId': userId,
      'sessionId': sessionId,
      'timestamp': timestamp.toIso8601String(),
    };
  }
}
```

#### **Collaborative UI Components**
```dart
// collaborative_editor_widget.dart
import 'package:flutter/material.dart';
import 'collaboration_provider.dart';

class CollaborativeEditorWidget extends StatelessWidget {
  final CollaborationProvider provider;

  const CollaborativeEditorWidget({
    Key? key,
    required this.provider,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Collaboration status bar
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          color: Colors.grey[900],
          child: Row(
            children: [
              // Connection status
              Icon(
                provider.isConnected ? Icons.wifi : Icons.wifi_off,
                color: provider.isConnected ? Colors.green : Colors.red,
                size: 16,
              ),
              const SizedBox(width: 8),
              Text(
                provider.isConnected ? 'Connected' : 'Disconnected',
                style: TextStyle(
                  color: provider.isConnected ? Colors.green : Colors.red,
                  fontSize: 12,
                ),
              ),

              // Participants
              const Spacer(),
              Row(
                children: provider.participants.map((participant) =>
                  Padding(
                    padding: const EdgeInsets.only(left: 8),
                    child: CircleAvatar(
                      radius: 12,
                      backgroundColor: participant.color,
                      child: Text(
                        participant.name.isNotEmpty
                            ? participant.name[0].toUpperCase()
                            : '?',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  )).toList(),
              ),
            ],
          ),
        ),

        // Error display
        if (provider.error != null)
          Container(
            padding: const EdgeInsets.all(8),
            color: Colors.red[100],
            child: Row(
              children: [
                Icon(Icons.error, color: Colors.red[700]),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    provider.error!,
                    style: TextStyle(color: Colors.red[700]),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () {
                    // Clear error
                  },
                ),
              ],
            ),
          ),

        // Main editor area
        Expanded(
          child: Stack(
            children: [
              // Visual editor
              SchillingerVisualEditor(
                composition: /* your composition */,
                onCompositionChanged: (composition) {
                  // Handle composition changes
                  _handleCompositionChanged(composition);
                },
                enableCollaboration: true,
              ),

              // Collaborative cursors/indicators
              if (provider.isConnected)
                Positioned.fill(
                  child: IgnorePointer(
                    child: _buildCollaborativeOverlays(),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildCollaborativeOverlays() {
    return Stack(
      children: provider.operations.map((operation) {
        if (operation.type == 'note') {
          final data = operation.data;
          return _buildCollaborativeNoteIndicator(
            operation.userId,
            data['pitch'],
            data['startTime'],
            data['duration'],
          );
        }
        return const SizedBox.shrink();
      }).toList(),
    );
  }

  Widget _buildCollaborativeNoteIndicator(
    String userId,
    int pitch,
    double startTime,
    double duration,
  ) {
    final user = provider.participants.firstWhere((u) => u.id == userId);

    // Convert to pixel coordinates
    final x = _beatToX(startTime);
    final y = _pitchToY(pitch);
    final width = _beatToX(startTime + duration) - x;

    return Positioned(
      left: x,
      top: y,
      width: width,
      height: 12, // Note height
      child: Container(
        decoration: BoxDecoration(
          color: user.color.withOpacity(0.5),
          borderRadius: BorderRadius.circular(2),
          border: Border.all(color: user.color),
        ),
        child: Center(
          child: Text(
            user.name[0],
            style: const TextStyle(
              color: Colors.white,
              fontSize: 8,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ),
    );
  }

  void _handleCompositionChanged(SchillingerComposition composition) {
    // Send changes to collaboration server
    // Implementation depends on your composition structure
  }

  double _beatToX(double beat) {
    // Convert beat time to pixel coordinate
    return beat * 40; // 40 pixels per beat
  }

  double _pitchToY(int pitch) {
    // Convert MIDI pitch to pixel coordinate
    return 60 + (96 - pitch) * 12; // 12 pixels per pitch
  }
}
```

### 3. Audio Export

#### **Audio Export Service**
```dart
// audio_export_service.dart
import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

class AudioExportService {
  final Dio _dio = Dio();
  late final String _serverUrl;

  AudioExportService({String serverUrl = 'http://localhost:3000'}) {
    _serverUrl = serverUrl;
    _dio.options.baseUrl = _serverUrl;
    _dio.options.connectTimeout = const Duration(seconds: 30);
    _dio.options.receiveTimeout = const Duration(minutes: 10); // For large files
  }

  Future<ExportResult> exportAudio({
    required SchillingerComposition composition,
    required AudioExportFormat format,
    AudioExportOptions? options,
    ProgressCallback? onProgress,
  }) async {
    try {
      final exportOptions = options ?? AudioExportOptions.defaultForFormat(format);

      final requestData = {
        'composition': composition.toJson(),
        'format': format.toString(),
        'options': exportOptions.toJson(),
      };

      final response = await _dio.post(
        '/export/audio',
        data: requestData,
        options: Options(
          responseType: ResponseType.bytes,
          onSendProgress: onProgress != null
              ? (int sent, int total) {
                  onProgress!(sent, total);
                }
              : null,
        ),
      );

      // Handle download
      final Uint8List audioData = response.data!;

      // Determine file extension
      final extension = _getFileExtension(format);
      final fileName = '${composition.name ?? "export"}.$extension';

      return ExportResult(
        fileName: fileName,
        data: audioData,
        format: format,
        size: audioData.length,
        duration: composition.duration ?? 0,
      );

    } catch (e) {
      throw ExportException('Failed to export audio: $e');
    }
  }

  Future<ExportResult> exportMIDI({
    required SchillingerComposition composition,
    MIDIExportOptions? options,
  }) async {
    try {
      final exportOptions = options ?? const MIDIExportOptions();

      final requestData = {
        'composition': composition.toJson(),
        'format': 'midi',
        'options': exportOptions.toJson(),
      };

      final response = await _dio.post(
        '/export/midi',
        data: requestData,
        options: Options(
          responseType: ResponseType.bytes,
        ),
      );

      final Uint8List midiData = response.data!;

      return ExportResult(
        fileName: '${composition.name ?? "export"}.mid',
        data: midiData,
        format: AudioExportFormat.midi,
        size: midiData.length,
        duration: composition.duration ?? 0,
      );

    } catch (e) {
      throw ExportException('Failed to export MIDI: $e');
    }
  }

  Future<List<ExportResult>> batchExport({
    required SchillingerComposition composition,
    required List<AudioExportFormat> formats,
    Map<AudioExportFormat, AudioExportOptions>? formatOptions,
    ProgressCallback? onProgress,
  }) async {
    final results = <ExportResult>[];
    int completed = 0;

    for (final format in formats) {
      final options = formatOptions?[format];

      try {
        final result = await exportAudio(
          composition: composition,
          format: format,
          options: options,
          onProgress: (sent, total) {
            if (onProgress != null) {
              final overallProgress = (completed + sent / total) / formats.length;
              onProgress(overallProgress * 100, 100);
            }
          },
        );
        results.add(result);
        completed++;
      } catch (e) {
        // Continue with other formats even if one fails
        debugPrint('Failed to export $format: $e');
      }
    }

    return results;
  }

  String _getFileExtension(AudioExportFormat format) {
    switch (format) {
      case AudioExportFormat.wav:
        return 'wav';
      case AudioExportFormat.mp3:
        return 'mp3';
      case AudioExportFormat.flac:
        return 'flac';
      case AudioExportFormat.aac:
        return 'aac';
      case AudioExportFormat.ogg:
        return 'ogg';
      case AudioExportFormat.midi:
        return 'mid';
    }
  }
}

enum AudioExportFormat {
  wav,
  mp3,
  flac,
  aac,
  ogg,
  midi,
}

class AudioExportOptions {
  final int sampleRate;
  final int bitDepth;
  final int channels;
  final AudioQuality quality;
  final bool normalize;
  final double headroomDB;

  const AudioExportOptions({
    this.sampleRate = 48000,
    this.bitDepth = 24,
    this.channels = 2,
    this.quality = AudioQuality.high,
    this.normalize = true,
    this.headroomDB = -3.0,
  });

  factory AudioExportOptions.defaultForFormat(AudioExportFormat format) {
    switch (format) {
      case AudioExportFormat.wav:
        return const AudioExportOptions(
          sampleRate: 48000,
          bitDepth: 24,
          channels: 2,
          quality: AudioQuality.lossless,
          normalize: true,
        );
      case AudioExportFormat.mp3:
        return const AudioExportOptions(
          sampleRate: 44100,
          bitDepth: 16,
          channels: 2,
          quality: AudioQuality.high,
          normalize: true,
        );
      case AudioExportFormat.flac:
        return const AudioExportOptions(
          sampleRate: 48000,
          bitDepth: 24,
          channels: 2,
          quality: AudioQuality.lossless,
          normalize: true,
        );
      default:
        return const AudioExportOptions();
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'sampleRate': sampleRate,
      'bitDepth': bitDepth,
      'channels': channels,
      'quality': quality.toString(),
      'normalize': normalize,
      'headroomDB': headroomDB,
    };
  }
}

enum AudioQuality {
  low,
  medium,
  high,
  lossless,
}

class MIDIExportOptions {
  final int format; // 0 or 1
  final int resolution; // ticks per quarter note
  final bool tempoMap;
  final bool velocityScaling;
  final bool noteOffVelocity;
  final bool controllerData;

  const MIDIExportOptions({
    this.format = 1,
    this.resolution = 480,
    this.tempoMap = true,
    this.velocityScaling = true,
    this.noteOffVelocity = false,
    this.controllerData = true,
  });

  Map<String, dynamic> toJson() {
    return {
      'format': format,
      'resolution': resolution,
      'tempoMap': tempoMap,
      'velocityScaling': velocityScaling,
      'noteOffVelocity': noteOffVelocity,
      'controllerData': controllerData,
    };
  }
}

class ExportResult {
  final String fileName;
  final Uint8List data;
  final AudioExportFormat format;
  final int size;
  final double duration;

  ExportResult({
    required this.fileName,
    required this.data,
    required this.format,
    required this.size,
    required this.duration,
  });

  Future<void> saveToFile(String filePath) async {
    final file = File(filePath);
    await file.writeAsBytes(data);
  }
}

typedef ProgressCallback = void Function(int sent, int total);

class ExportException implements Exception {
  final String message;

  ExportException(this.message);

  @override
  String toString() => 'ExportException: $message';
}
```

#### **Export UI Widget**
```dart
// export_dialog.dart
import 'package:flutter/material.dart';
import 'audio_export_service.dart';

class ExportDialog extends StatefulWidget {
  final SchillingerComposition composition;

  const ExportDialog({
    Key? key,
    required this.composition,
  }) : super(key: key);

  @override
  State<ExportDialog> createState() => _ExportDialogState();
}

class _ExportDialogState extends State<ExportDialog> {
  final AudioExportService _exportService = AudioExportService();
  AudioExportFormat _selectedFormat = AudioExportFormat.wav;
  bool _isExporting = false;
  double _exportProgress = 0.0;
  List<ExportResult> _exportResults = [];

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Export Composition'),
      content: SizedBox(
        width: 400,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Format selection
            const Text('Export Format:'),
            const SizedBox(height: 8),
            DropdownButton<AudioExportFormat>(
              value: _selectedFormat,
              isExpanded: true,
              items: AudioExportFormat.values.map((format) {
                return DropdownMenuItem(
                  value: format,
                  child: Text(format.toString().toUpperCase()),
                );
              }).toList(),
              onChanged: (value) {
                if (value != null) {
                  setState(() {
                    _selectedFormat = value;
                  });
                }
              },
            ),

            const SizedBox(height: 16),

            // Export options
            _buildExportOptions(),

            const SizedBox(height: 16),

            // Batch export options
            CheckboxListTile(
              title: const Text('Export to multiple formats'),
              subtitle: const Text('WAV, MP3, FLAC, MIDI'),
              value: false, // TODO: implement batch export
              onChanged: (value) {
                // TODO: implement batch export
              },
            ),

            const SizedBox(height: 16),

            // Progress indicator
            if (_isExporting) ...[
              LinearProgressIndicator(value: _exportProgress),
              const SizedBox(height: 8),
              Text('${(_exportProgress * 100).toInt()}%'),
            ],

            // Results
            if (_exportResults.isNotEmpty) ...[
              const SizedBox(height: 16),
              const Text('Completed Exports:'),
              const SizedBox(height: 8),
              ..._exportResults.map((result) => ListTile(
                title: Text(result.fileName),
                subtitle: Text('${result.size} bytes • ${result.duration}s'),
                trailing: IconButton(
                  icon: const Icon(Icons.download),
                  onPressed: () => _downloadResult(result),
                ),
              )),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isExporting ? null : () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _isExporting ? null : _startExport,
          child: Text(_isExporting ? 'Exporting...' : 'Export'),
        ),
      ],
    );
  }

  Widget _buildExportOptions() {
    switch (_selectedFormat) {
      case AudioExportFormat.wav:
      case AudioExportFormat.flac:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Sample Rate:'),
            DropdownButton<int>(
              value: 48000,
              items: [44100, 48000, 96000].map((rate) {
                return DropdownMenuItem(value: rate, child: Text('${rate} Hz'));
              }).toList(),
              onChanged: (value) {},
            ),
          ],
        );

      case AudioExportFormat.mp3:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Quality:'),
            DropdownButton<AudioQuality>(
              value: AudioQuality.high,
              items: AudioQuality.values.map((quality) {
                return DropdownMenuItem(
                  value: quality,
                  child: Text(quality.toString().toUpperCase()),
                );
              }).toList(),
              onChanged: (value) {},
            ),
          ],
        );

      default:
        return const SizedBox.shrink();
    }
  }

  Future<void> _startExport() async {
    setState(() {
      _isExporting = true;
      _exportProgress = 0.0;
    });

    try {
      final result = await _exportService.exportAudio(
        composition: widget.composition,
        format: _selectedFormat,
        onProgress: (sent, total) {
          setState(() {
            _exportProgress = sent / total;
          });
        },
      );

      setState(() {
        _exportResults.add(result);
        _isExporting = false;
        _exportProgress = 1.0;
      });

      // Show success message
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Export completed: ${result.fileName}')),
      );

    } catch (e) {
      setState(() {
        _isExporting = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Export failed: $e')),
      );
    }
  }

  Future<void> _downloadResult(ExportResult result) async {
    try {
      // Implement file download for mobile/web
      if (kIsWeb) {
        // Web download
        final bytes = result.data;
        final blob = html.Blob([bytes]);
        final url = html.Url.createObjectUrlFromBlob(blob);
        final anchor = html.AnchorElement(href: url)
          ..setAttribute('download', result.fileName)
          ..click();
        html.Url.revokeObjectUrl(url);
      } else {
        // Mobile download
        // TODO: Implement mobile file saving
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Download not implemented on mobile yet')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Download failed: $e')),
      );
    }
  }
}
```

## 🔧 **IMPLEMENTATION CHECKLIST**

### **Phase 1: WebView Integration**
- [ ] Create HTML template for visual editor
- [ ] Implement Flutter WebView wrapper
- [ ] Set up JavaScript bridge communication
- [ ] Handle canvas rendering and events

### **Phase 2: Collaboration Features**
- [ ] Implement WebSocket connection management
- [ ] Create collaborative operation handling
- [ ] Design participant visualization
- [ ] Add conflict resolution UI

### **Phase 3: Audio Export**
- [ ] Set up audio export service
- [ ] Implement progress tracking
- [ ] Create export format options
- [ ] Handle file downloads on different platforms

### **Phase 4: Optimization**
- [ ] Performance testing on mobile devices
- [ ] Memory optimization for large compositions
- [ ] Battery usage optimization
- [ ] Offline capability

## 🚀 **PERFORMANCE TARGETS**

- **WebView Rendering**: 60fps on most devices
- **Collaboration Latency**: <50ms operation sync
- **Audio Export**: Real-time progress updates
- **Memory Usage**: <200MB on mobile devices
- **Battery Impact**: Minimal background processing

## 📱 **PLATFORM-SPECIFIC CONSIDERATIONS**

### **iOS Integration**
```dart
// iOS-specific audio handling
import 'package:audio_session/audio_session.dart';

void setupIOSAudioSession() async {
  await AudioSession.instance.configure(AudioSessionConfiguration.music);

  // Handle interruptions
  AudioSession.interruptionEventStream.listen((event) {
    if (event.begin) {
      // Audio interrupted - pause playback
      pausePlayback();
    } else {
      // Audio resumed - restart playback
      resumePlayback();
    }
  });
}
```

### **Android Integration**
```dart
// Android-specific permissions and audio focus
import 'package:android_intent_plus/android_intent_plus.dart';

Future<void> setupAndroidAudioFocus() async {
  try {
    await AudioManager.instance.requestAudioFocus();

    // Handle audio focus changes
    AudioManager.instance.audioFocusStream.listen((hasFocus) {
      if (!hasFocus) {
        pausePlayback();
      } else {
        resumePlayback();
      }
    });
  } catch (e) {
    debugPrint('Failed to request audio focus: $e');
  }
}
```

### **Web Integration**
```dart
// Web-specific file handling
import 'dart:html' as html;

Future<void> saveFileToWeb(String fileName, Uint8List data) async {
  final blob = html.Blob([data]);
  final url = html.Url.createObjectUrlFromBlob(blob);

  final anchor = html.AnchorElement(href: url)
    ..setAttribute('download', fileName)
    ..click();

  html.Url.revokeObjectUrl(url);
}
```

---

*This guide is specifically for the Flutter frontend team integrating the new Schillinger SDK features into mobile and web applications.*