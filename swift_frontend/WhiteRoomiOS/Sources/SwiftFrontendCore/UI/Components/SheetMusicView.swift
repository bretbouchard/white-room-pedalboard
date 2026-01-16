import SwiftUI
import WebKit

/// Sheet music rendering view using VexFlow JavaScript library
/// Displays musical notation with staves, notes, rests, and dynamics
struct SheetMusicView: View {
    let notes: [SheetNote]
    let title: String
    let composer: String

    @State private var isLoading = true
    @State private var renderError: String?

    var body: some View {
        VStack(spacing: 0) {
            // Header with metadata
            if !title.isEmpty || !composer.isEmpty {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(title)
                            .font(.headline)
                            .foregroundColor(.primary)
                        if !composer.isEmpty {
                            Text(composer)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                    }
                    Spacer()
                }
                .padding()
                .background(Color(.systemBackground))
            }

            // Loading indicator
            if isLoading {
                VStack(spacing: 16) {
                    ProgressView()
                        .scaleEffect(1.5)
                    Text("Rendering sheet music...")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }

            // Error display
            if let error = renderError {
                VStack(spacing: 12) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.system(size: 48))
                        .foregroundColor(.orange)
                    Text("Rendering Error")
                        .font(.headline)
                    Text(error)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }

            // VexFlow WebView
            if !isLoading && renderError == nil {
                SheetMusicWebView(
                    notes: notes,
                    title: title,
                    composer: composer,
                    isLoading: $isLoading,
                    renderError: $renderError
                )
            }
        }
        .background(Color(.systemBackground))
    }
}

/// WKWebView wrapper for VexFlow rendering
struct SheetMusicWebView: UIViewRepresentable {
    let notes: [SheetNote]
    let title: String
    let composer: String
    @Binding var isLoading: Bool
    @Binding var renderError: String?

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.dataDetectorTypes = [] // Disable data detection

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.scrollView.isScrollEnabled = true
        webView.scrollView.bounces = true
        webView.backgroundColor = .clear
        webView.isOpaque = false

        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        // Only load HTML if not already loaded
        if webView.URL == nil {
            webView.loadHTMLString(htmlContent, baseURL: nil)
        }
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    /// HTML content with VexFlow integration
    private var htmlContent: String {
        """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                    background-color: transparent;
                    padding: 20px;
                    overflow-x: auto;
                }

                #output {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 20px;
                }

                .stave-container {
                    background: white;
                    border-radius: 8px;
                    padding: 20px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }

                .error-message {
                    background: #ff3b30;
                    color: white;
                    padding: 16px;
                    border-radius: 8px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    font-size: 14px;
                }
            </style>
            <script src="https://cdn.jsdelivr.net/npm/vexflow@4.2.2/build/cjs/vexflow.js"></script>
        </head>
        <body>
            <div id="output"></div>

            <script>
                // Wait for VexFlow to load
                window.addEventListener('load', function() {
                    try {
                        renderSheetMusic();
                        window.webkit.messageHandlers.sheetMusicRenderer.postMessage({
                            type: 'success',
                            message: 'Sheet music rendered successfully'
                        });
                    } catch (error) {
                        console.error('VexFlow rendering error:', error);
                        window.webkit.messageHandlers.sheetMusicRenderer.postMessage({
                            type: 'error',
                            message: error.toString()
                        });
                    }
                });

                function renderSheetMusic() {
                    const { Factory } = Vex.Flow;
                    const output = document.getElementById('output');

                    // Create VF Factory
                    const vf = new Factory({
                        renderer: { elementId: 'output', width: 600, height: 200 }
                    });

                    \(generateStavesCode(vactory: vf))
                }

                function createStave(vf, notesData, x, y, width, clef = 'treble', timeSignature = '4/4') {
                    const score = vf.EasyScore();
                    const system = vf.System();

                    // Parse notes for this stave
                    const notes = notesData.map(note => {
                        const keys = note.keys || [note.pitch];
                        return {
                            keys: keys,
                            duration: note.duration || 'q',
                            clef: clef
                        };
                    });

                    // Create voice from notes
                    const voice = score.voice(notes, { time: timeSignature });

                    // Add stave and voice
                    system.addStave({
                        voices: [voice],
                        x: x,
                        y: y,
                        width: width
                    }).addClef(clef).addTimeSignature(timeSignature);

                    return system;
                }
            </script>
        </body>
        </html>
        """
    }

    /// Generate JavaScript code for rendering staves
    private func generateStavesCode(vactory: String) -> String {
        guard !notes.isEmpty else {
            return """
            document.getElementById('output').innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">No notes to display</p>';
            """
        }

        // Group notes by position (for multiple staves)
        let groupedNotes = groupNotesByPosition(notes)

        var jsCode = """
        const vf = new Vex.Flow.Factory({
            renderer: { elementId: 'output', width: 600, height: 200 }
        });

        const score = vf.EasyScore();
        const system = vf.System();
        """

        // Create notes array for VexFlow
        let notesArray = groupedNotes.map { note in
            let keys = note.keys.joined(separator: "','")
            return "{ keys: ['\(keys)'], duration: '\(note.duration)' }"
        }.joined(separator: ",\n                    ")

        jsCode += """

        const notes = [
            \(notesArray)
        ];

        const voice = score.voice(notes, { time: '4/4' });

        system.addStave({
            voices: [voice]
        }).addClef('treble').addTimeSignature('4/4');

        vf.draw();
        """

        return jsCode
    }

    /// Group notes by position for multi-stave rendering
    private func groupNotesByPosition(_ notes: [SheetNote]) -> [[SheetNote]] {
        // Simple grouping: split into groups of 8 beats (2 measures of 4/4)
        let beatsPerGroup = 8
        var groupedNotes: [[SheetNote]] = []
        var currentGroup: [SheetNote] = []
        var currentBeats = 0

        for note in notes {
            let noteDuration = durationToBeats(note.duration)
            if currentBeats + noteDuration > beatsPerGroup && !currentGroup.isEmpty {
                groupedNotes.append(currentGroup)
                currentGroup = []
                currentBeats = 0
            }
            currentGroup.append(note)
            currentBeats += noteDuration
        }

        if !currentGroup.isEmpty {
            groupedNotes.append(currentGroup)
        }

        return groupedNotes.isEmpty ? [notes] : groupedNotes
    }

    /// Convert duration string to beat count
    private func durationToBeats(_ duration: String) -> Int {
        switch duration.lowercased() {
        case "w": return 4
        case "h": return 2
        case "q": return 1
        case "8": return 0.5
        case "16": return 0.25
        default: return 1
        }
    }

    /// Coordinator for WebView delegate handling
    class Coordinator: NSObject, WKNavigationDelegate {
        var parent: SheetMusicWebView

        init(_ parent: SheetMusicWebView) {
            self.parent = parent
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            // Add script message handler
            let contentController = webView.configuration.userContentController
            contentController.add(self, name: "sheetMusicRenderer")
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            DispatchQueue.main.async {
                self.parent.isLoading = false
                self.parent.renderError = "Failed to load: \(error.localizedDescription)"
            }
        }
    }
}

/// Extension for handling script messages
extension SheetMusicWebView.Coordinator: WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any],
              let type = body["type"] as? String else {
            return
        }

        DispatchQueue.main.async {
            switch type {
            case "success":
                self.parent.isLoading = false
                self.parent.renderError = nil
            case "error":
                self.parent.isLoading = false
                if let message = body["message"] as? String {
                    self.parent.renderError = message
                } else {
                    self.parent.renderError = "Unknown rendering error"
                }
            default:
                break
            }
        }
    }
}

/// Sheet music note model
struct SheetNote: Identifiable, Codable {
    let id: UUID
    let keys: [String]  // ["c/4", "e/4", "g/4"] for chord
    let duration: String  // "w" (whole), "h" (half), "q" (quarter), "8" (eighth), "16" (sixteenth)
    let clef: String?  // "treble", "bass", "alto", "tenor"
    let dots: Int?  // 0, 1, or 2 (augmentation dots)
    let articulation: String?  // "staccato", "accent", "tenuto"
    let dynamic: String?  // "pp", "p", "mp", "mf", "f", "ff"

    init(
        id: UUID = UUID(),
        keys: [String],
        duration: String,
        clef: String? = nil,
        dots: Int? = nil,
        articulation: String? = nil,
        dynamic: String? = nil
    ) {
        self.id = id
        self.keys = keys
        self.duration = duration
        self.clef = clef
        self.dots = dots
        self.articulation = articulation
        self.dynamic = dynamic
    }

    /// Convert from UniversalNote (if it exists in the codebase)
    static func from(universalNote: any Codable) -> SheetNote {
        // This would be implemented when UniversalNote is available
        // For now, return a default note
        return SheetNote(keys: ["c/4"], duration: "q")
    }
}

/// Preview provider for SwiftUI canvas
#Preview("Simple Melody") {
    SheetMusicView(
        notes: [
            SheetNote(keys: ["c/4"], duration: "q"),
            SheetNote(keys: ["d/4"], duration: "q"),
            SheetNote(keys: ["e/4"], duration: "q"),
            SheetNote(keys: ["f/4"], duration: "q"),
            SheetNote(keys: ["g/4"], duration: "q"),
            SheetNote(keys: ["a/4"], duration: "q"),
            SheetNote(keys: ["b/4"], duration: "q"),
            SheetNote(keys: ["c/5"], duration: "q"),
        ],
        title: "C Major Scale",
        composer: "Traditional"
    )
}

#Preview("Chords") {
    SheetMusicView(
        notes: [
            SheetNote(keys: ["c/4", "e/4", "g/4"], duration: "w"),
            SheetNote(keys: ["f/4", "a/4", "c/5"], duration: "w"),
            SheetNote(keys: ["g/4", "b/4", "d/5"], duration: "w"),
        ],
        title: "C Major Chords",
        composer: "Triads"
    )
}

#Preview("Mixed Rhythms") {
    SheetMusicView(
        notes: [
            SheetNote(keys: ["c/4"], duration: "w"),
            SheetNote(keys: ["d/4"], duration: "h"),
            SheetNote(keys: ["e/4"], duration: "q"),
            SheetNote(keys: ["f/4"], duration: "8"),
            SheetNote(keys: ["g/4"], duration: "8"),
            SheetNote(keys: ["a/4"], duration: "q"),
        ],
        title: "Rhythm Study",
        composer: "Rhythmic Variations"
    )
}

#Preview("Empty") {
    SheetMusicView(
        notes: [],
        title: "Empty Score",
        composer: ""
    )
}
