# Flutter Integration Cheat Sheet - JUCE Backend v1.2.0

## 🚀 Quick Reference

### WebSocket Control
```dart
// Initialize
final wsService = JuceWebSocketService();
await wsService.initialize('your-api-key');

// Real-time parameter update
await wsService.updateParameter(pluginId, 'frequency', 440.0);

// Listen to updates
wsService.parameterUpdates.listen((update) {
  print('Parameter ${update['parameter']} changed to ${update['value']}');
});

// Connect to audio stream
wsService.audioStream.listen((audioData) {
  // Process Float32List audio data
});
```

### REST API Management
```dart
// Initialize
final apiService = JuceRestApiService();
apiService.initialize('your-api-key');

// Load plugin
final response = await apiService.loadPlugin(
  path: '/path/to/plugin.vst3',
  name: 'My Plugin',
);

// List plugins
final plugins = await apiService.listPlugins();

// Save state
final stateResponse = await apiService.savePluginState(
  pluginId: 0,
  stateName: 'preset_1',
);
```

---

## 📱 Flutter Widget Templates

### Connection Status Widget
```dart
class ConnectionStatusWidget extends StatelessWidget {
  final bool isConnected;

  const ConnectionStatusWidget({Key? key, required this.isConnected}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: isConnected ? Colors.green.shade100 : Colors.red.shade100,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            isConnected ? Icons.wifi : Icons.wifi_off,
            color: isConnected ? Colors.green : Colors.red,
            size: 16,
          ),
          const SizedBox(width: 8),
          Text(
            isConnected ? 'Connected' : 'Disconnected',
            style: TextStyle(
              color: isConnected ? Colors.green.shade800 : Colors.red.shade800,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
```

### Parameter Slider Widget
```dart
class ParameterSlider extends StatefulWidget {
  final String name;
  final double value;
  final double min;
  final double max;
  final ValueChanged<double> onChanged;
  final String? unit;

  const ParameterSlider({
    Key? key,
    required this.name,
    required this.value,
    required this.min,
    required this.max,
    required this.onChanged,
    this.unit,
  }) : super(key: key);

  @override
  _ParameterSliderState createState() => _ParameterSliderState();
}

class _ParameterSliderState extends State<ParameterSlider> {
  double _currentValue;

  @override
  void initState() {
    super.initState();
    _currentValue = widget.value;
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '${widget.name}: ${_currentValue.toStringAsFixed(2)}${widget.unit != null ? ' ${widget.unit}' : ''}',
          style: const TextStyle(fontWeight: FontWeight.w500),
        ),
        const SizedBox(height: 8),
        Slider(
          value: _currentValue,
          min: widget.min,
          max: widget.max,
          onChanged: (value) {
            setState(() => _currentValue = value);
            widget.onChanged(value);
          },
        ),
      ],
    );
  }
}
```

### Plugin List Widget
```dart
class PluginListWidget extends StatelessWidget {
  final List<PluginInfo> plugins;
  final Function(int) onUnload;
  final Function(PluginInfo) onSelect;

  const PluginListWidget({
    Key? key,
    required this.plugins,
    required this.onUnload,
    required this.onSelect,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      itemCount: plugins.length,
      itemBuilder: (context, index) {
        final plugin = plugins[index];
        return ListTile(
          leading: CircleAvatar(
            backgroundColor: plugin.loaded ? Colors.green : Colors.grey,
            child: Icon(
              plugin.loaded ? Icons.check : Icons.close,
              color: Colors.white,
              size: 16,
            ),
          ),
          title: Text(plugin.name),
          subtitle: Text('ID: ${plugin.id}'),
          trailing: plugin.loaded
              ? IconButton(
                  icon: const Icon(Icons.delete_outline),
                  onPressed: () => onUnload(plugin.id),
                )
              : null,
          onTap: () => onSelect(plugin),
        );
      },
    );
  }
}
```

---

## 🔧 Common Code Patterns

### Service Manager Pattern
```dart
class JuceServiceManager {
  static final JuceServiceManager _instance = JuceServiceManager._internal();
  JuceWebSocketService? _webSocketService;
  JuceRestApiService? _restApiService;

  factory JuceServiceManager() => _instance;
  JuceServiceManager._internal();

  JuceWebSocketService get webSocket {
    _webSocketService ??= JuceWebSocketService();
    return _webSocketService!;
  }

  JuceRestApiService get restApi {
    _restApiService ??= JuceRestApiService();
    return _restApiService!;
  }

  Future<void> initialize(String apiKey) async {
    webSocket.initialize(apiKey);
    restApi.initialize(apiKey);
  }

  void dispose() {
    _webSocketService?.dispose();
    _restApiService = null;
  }
}
```

### State Manager Pattern
```dart
class AudioStateManager extends ChangeNotifier {
  final Map<int, Map<String, double>> _pluginParameters = {};
  final Map<int, bool> _pluginLoadedState = {};

  void updateParameter(int pluginId, String parameter, double value) {
    _pluginParameters[pluginId] ??= {};
    _pluginParameters[pluginId]![parameter] = value;
    notifyListeners();
  }

  double? getParameter(int pluginId, String parameter) {
    return _pluginParameters[pluginId]?[parameter];
  }

  void setPluginLoaded(int pluginId, bool loaded) {
    _pluginLoadedState[pluginId] = loaded;
    notifyListeners();
  }

  bool isPluginLoaded(int pluginId) {
    return _pluginLoadedState[pluginId] ?? false;
  }
}
```

### Error Handler Pattern
```dart
class ErrorHandler {
  static void showError(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  static void showSuccess(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.green,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  static Future<bool> showConfirmation(
    BuildContext context,
    String title,
    String message,
  ) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Confirm'),
          ),
        ],
      ),
    );
    return result ?? false;
  }
}
```

---

## 🎨 UI Component Templates

### Audio Control Panel
```dart
class AudioControlPanel extends StatefulWidget {
  const AudioControlPanel({Key? key}) : super(key: key);

  @override
  _AudioControlPanelState createState() => _AudioControlPanelState();
}

class _AudioControlPanelState extends State<AudioControlPanel>
    with TickerProviderStateMixin {
  late AnimationController _animationController;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _animationController,
      child: ScaleTransition(
        scale: _animationController,
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.1),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            children: [
              _buildHeader(),
              const SizedBox(height: 16),
              _buildParameterControls(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Row(
      children: [
        Icon(Icons.graphic_eq, color: Theme.of(context).colorScheme.primary),
        const SizedBox(width: 8),
        Text(
          'Audio Control',
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const Spacer(),
        ConnectionStatusWidget(
          isConnected: JuceServiceManager().webSocket.isConnected,
        ),
      ],
    );
  }

  Widget _buildParameterControls() {
    return Column(
      children: [
        ParameterSlider(
          name: 'Frequency',
          value: 440.0,
          min: 20.0,
          max: 20000.0,
          unit: 'Hz',
          onChanged: (value) => _updateParameter('frequency', value),
        ),
        const SizedBox(height: 16),
        ParameterSlider(
          name: 'Gain',
          value: 0.5,
          min: 0.0,
          max: 1.0,
          onChanged: (value) => _updateParameter('gain', value),
        ),
        const SizedBox(height: 16),
        ParameterSlider(
          name: 'Reverb Mix',
          value: 0.3,
          min: 0.0,
          max: 1.0,
          onChanged: (value) => _updateParameter('reverb_mix', value),
        ),
      ],
    );
  }

  void _updateParameter(String parameter, double value) {
    JuceServiceManager().webSocket.updateParameter(0, parameter, value);
  }
}
```

### Plugin Manager Panel
```dart
class PluginManagerPanel extends StatefulWidget {
  const PluginManagerPanel({Key? key}) : super(key: key);

  @override
  _PluginManagerPanelState createState() => _PluginManagerPanelState();
}

class _PluginManagerPanelState extends State<PluginManagerPanel> {
  final JuceRestApiService _apiService = JuceServiceManager().restApi;
  List<PluginInfo> _plugins = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadPlugins();
  }

  Future<void> _loadPlugins() async {
    setState(() => _isLoading = true);
    try {
      _plugins = await _apiService.listPlugins();
    } catch (e) {
      ErrorHandler.showError(context, e.toString());
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.library_music, color: Theme.of(context).colorScheme.primary),
              const SizedBox(width: 8),
              Text(
                'Plugin Manager',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const Spacer(),
              if (_isLoading)
                const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              else
                IconButton(
                  icon: const Icon(Icons.refresh),
                  onPressed: _loadPlugins,
                  tooltip: 'Refresh',
                ),
            ],
          ),
          const SizedBox(height: 16),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _plugins.isEmpty
                    ? const Center(child: Text('No plugins loaded'))
                    : PluginListWidget(
                        plugins: _plugins,
                        onUnload: _unloadPlugin,
                        onSelect: _showPluginDetails,
                      ),
          ),
        ],
      ),
    );
  }

  Future<void> _unloadPlugin(int pluginId) async {
    final confirmed = await ErrorHandler.showConfirmation(
      context,
      'Unload Plugin',
      'Are you sure you want to unload this plugin?',
    );

    if (confirmed) {
      try {
        final success = await _apiService.unloadPlugin(pluginId);
        if (success) {
          ErrorHandler.showSuccess(context, 'Plugin unloaded');
          _loadPlugins();
        }
      } catch (e) {
        ErrorHandler.showError(context, e.toString());
      }
    }
  }

  void _showPluginDetails(PluginInfo plugin) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(plugin.name),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('ID: ${plugin.id}'),
            Text('Path: ${plugin.path}'),
            Text('Status: ${plugin.loaded ? "Loaded" : "Not Loaded"}'),
            if (plugin.parameters.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text('Parameters:'),
              ...plugin.parameters.entries.map(
                (entry) => Text('  ${entry.key}: ${entry.value}'),
              ),
            ],
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }
}
```

---

## 📱 Navigation Patterns

### Tab-based Interface
```dart
class AudioInterface extends StatefulWidget {
  const AudioInterface({Key? key}) : super(key: key);

  @override
  _AudioInterfaceState createState() => _AudioInterfaceState();
}

class _AudioInterfaceState extends State<AudioInterface>
    with TickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('JUCE Backend Control'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(icon: Icon(Icons.graphic_eq), text: 'Control'),
            Tab(icon: Icon(Icons.library_music), text: 'Plugins'),
            Tab(icon: Icon(Icons.settings), text: 'System'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: const [
          AudioControlPanel(),
          PluginManagerPanel(),
          SystemInfoPanel(),
        ],
      ),
    );
  }
}
```

### Drawer Navigation
```dart
class MainScaffold extends StatelessWidget {
  const MainScaffold({Key? key, required this.child}) : super(key: key);

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('JUCE Backend'),
        backgroundColor: Theme.of(context).colorScheme.primary,
        foregroundColor: Colors.white,
      ),
      drawer: Drawer(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            DrawerHeader(
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primary,
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(height: 20),
                  Text(
                    'JUCE Backend',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    'v1.2.0',
                    style: TextStyle(
                      color: Colors.white70,
                      fontSize: 16,
                    ),
                  ),
                ],
              ),
            ),
            ListTile(
              leading: const Icon(Icons.graphic_eq),
              title: const Text('Audio Control'),
              onTap: () {
                Navigator.of(context).pushReplacementNamed('/control');
              },
            ),
            ListTile(
              leading: const Icon(Icons.library_music),
              title: const Text('Plugin Manager'),
              onTap: () {
                Navigator.of(context).pushReplacementNamed('/plugins');
              },
            ),
            ListTile(
              leading: const Icon(Icons.save),
              title: const Text('State Management'),
              onTap: () {
                Navigator.of(context).pushReplacementNamed('/states');
              },
            ),
            ListTile(
              leading: const Icon(Icons.info),
              title: const Text('System Info'),
              onTap: () {
                Navigator.of(context).pushReplacementNamed('/system');
              },
            ),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.settings),
              title: const Text('Settings'),
              onTap: () {
                Navigator.of(context).pushReplacementNamed('/settings');
              },
            ),
          ],
        ),
      ),
      body: child,
    );
  }
}
```

---

## 🔧 Development Tools

### Logger for Debugging
```dart
class JuceLogger {
  static void log(String message, [String? tag]) {
    final timestamp = DateTime.now().toIso8601String();
    final tagString = tag != null ? '[$tag] ' : '';
    print('$timestamp $tagString$message');
  }

  static void error(String message, [Object? error, StackTrace? stackTrace]) {
    log('ERROR: $message', 'ERROR');
    if (error != null) {
      log('Error details: $error', 'ERROR');
    }
    if (stackTrace != null) {
      log('Stack trace: $stackTrace', 'ERROR');
    }
  }

  static void warning(String message, [String? tag]) {
    log('WARNING: $message', 'WARNING');
  }

  static void info(String message, [String? tag]) {
    log('INFO: $message', 'INFO');
  }

  static void debug(String message, [String? tag]) {
    log('DEBUG: $message', 'DEBUG');
  }
}
```

### Performance Monitor
```dart
class PerformanceMonitor {
  static final Map<String, DateTime> _startTimes = {};
  static final Map<String, List<int>> _durations = {};

  static void startTimer(String operation) {
    _startTimes[operation] = DateTime.now();
  }

  static void endTimer(String operation) {
    final startTime = _startTimes[operation];
    if (startTime != null) {
      final duration = DateTime.now().difference(startTime).inMilliseconds;
      _durations[operation] ??= [];
      _durations[operation]!.add(duration);
      _startTimes.remove(operation);
    }
  }

  static double getAverageTime(String operation) {
    final durations = _durations[operation];
    if (durations == null || durations.isEmpty) return 0.0;
    return durations.reduce((a, b) => a + b) / durations.length;
  }

  static void logPerformance() {
    for (final entry in _durations.entries) {
      final avgTime = getAverageTime(entry.key);
      JuceLogger.info('${entry.key}: ${avgTime.toStringAsFixed(2)}ms average');
    }
  }
}
```

---

## 🎯 Quick Integration Checklist

### Project Setup
- [ ] Add `web_socket_channel`, `http`, `dio` dependencies
- [ ] Add `flutter_secure_storage` for API keys
- [ ] Create service classes
- [ ] Set up state management

### WebSocket Integration
- [ ] Initialize JuceWebSocketService
- [ ] Implement connection state monitoring
- [ ] Add parameter update handlers
- [ ] Set up audio stream processing
- [ ] Add reconnection logic

### REST API Integration
- [ ] Initialize JuceRestApiService
- [ ] Add authentication headers
- [ ] Implement error handling
- [ ] Add response parsing
- [ ] Set up pagination for lists

### UI Development
- [ ] Create connection status widgets
- [ ] Implement parameter controls
- [ ] Add plugin management UI
- [ ] Create state persistence interface
- [ ] Add system information display

### Testing
- [ ] Unit tests for service classes
- [ ] Widget tests for UI components
- [ ] Integration tests for API calls
- [ ] Mock HTTP/WebSocket clients
- [ ] Performance testing

---

## 📱 Material Design Integration

### Theme Configuration
```dart
MaterialApp(
  theme: ThemeData(
    colorScheme: ColorScheme.fromSeed(
      seedColor: Colors.blue,
      brightness: Brightness.dark,
    ),
    useMaterial3: true,
  ),
  home: const AudioInterface(),
)
```

### Color Scheme
```dart
const AudioThemeColors = {
  primary: Color(0xFF1976D2),
  secondary: Color(0xFF388E3C),
  success: Color(0xFF4CAF50),
  warning: Color(0xFFFF9800),
  error: Color(0xFFF44336),
  surface: Color(0xFF2E2E2E),
};
```

---

**Version**: 1.2.0
**Last Updated**: December 2024
**Flutter Version**: 3.0+
**Compatible with**: JUCE Backend v1.2.0+