import SwiftUI

/// Demo view showcasing SheetMusicView with various examples
struct SheetMusicDemoView: View {
    @State private var selectedExample = ExampleType.cMajorScale

    enum ExampleType: String, CaseIterable {
        case cMajorScale = "C Major Scale"
        case chords = "Major Chords"
        case melody = "Simple Melody"
        case rhythms = "Mixed Rhythms"
        case twinkle = "Twinkle Twinkle"
        case odeToJoy = "Ode to Joy"

        var notes: [SheetNote] {
            switch self {
            case .cMajorScale:
                return [
                    SheetNote(keys: ["c/4"], duration: "q"),
                    SheetNote(keys: ["d/4"], duration: "q"),
                    SheetNote(keys: ["e/4"], duration: "q"),
                    SheetNote(keys: ["f/4"], duration: "q"),
                    SheetNote(keys: ["g/4"], duration: "q"),
                    SheetNote(keys: ["a/4"], duration: "q"),
                    SheetNote(keys: ["b/4"], duration: "q"),
                    SheetNote(keys: ["c/5"], duration: "q"),
                ]

            case .chords:
                return [
                    SheetNote(keys: ["c/4", "e/4", "g/4"], duration: "w"),
                    SheetNote(keys: ["f/4", "a/4", "c/5"], duration: "w"),
                    SheetNote(keys: ["g/4", "b/4", "d/5"], duration: "w"),
                ]

            case .melody:
                return [
                    SheetNote(keys: ["c/4"], duration: "q"),
                    SheetNote(keys: ["e/4"], duration: "q"),
                    SheetNote(keys: ["g/4"], duration: "q"),
                    SheetNote(keys: ["c/5"], duration: "h"),
                    SheetNote(keys: ["a/4"], duration: "q"),
                    SheetNote(keys: ["f/4"], duration: "q"),
                    SheetNote(keys: ["d/4"], duration: "q"),
                    SheetNote(keys: ["g/4"], duration: "w"),
                ]

            case .rhythms:
                return [
                    SheetNote(keys: ["c/4"], duration: "w"),
                    SheetNote(keys: ["d/4"], duration: "h"),
                    SheetNote(keys: ["e/4"], duration: "q"),
                    SheetNote(keys: ["f/4"], duration: "8"),
                    SheetNote(keys: ["g/4"], duration: "8"),
                    SheetNote(keys: ["a/4"], duration: "q"),
                    SheetNote(keys: ["b/4"], duration: "h"),
                    SheetNote(keys: ["c/5"], duration: "w"),
                ]

            case .twinkle:
                return [
                    SheetNote(keys: ["c/4"], duration: "q"),
                    SheetNote(keys: ["c/4"], duration: "q"),
                    SheetNote(keys: ["g/4"], duration: "q"),
                    SheetNote(keys: ["g/4"], duration: "q"),
                    SheetNote(keys: ["a/4"], duration: "q"),
                    SheetNote(keys: ["a/4"], duration: "q"),
                    SheetNote(keys: ["g/4"], duration: "h"),
                    SheetNote(keys: ["f/4"], duration: "q"),
                    SheetNote(keys: ["f/4"], duration: "q"),
                    SheetNote(keys: ["e/4"], duration: "q"),
                    SheetNote(keys: ["e/4"], duration: "q"),
                    SheetNote(keys: ["d/4"], duration: "q"),
                    SheetNote(keys: ["d/4"], duration: "q"),
                    SheetNote(keys: ["c/4"], duration: "h"),
                ]

            case .odeToJoy:
                return [
                    SheetNote(keys: ["e/4"], duration: "q"),
                    SheetNote(keys: ["e/4"], duration: "q"),
                    SheetNote(keys: ["f/4"], duration: "q"),
                    SheetNote(keys: ["g/4"], duration: "q"),
                    SheetNote(keys: ["g/4"], duration: "q"),
                    SheetNote(keys: ["f/4"], duration: "q"),
                    SheetNote(keys: ["e/4"], duration: "q"),
                    SheetNote(keys: ["d/4"], duration: "q"),
                    SheetNote(keys: ["c/4"], duration: "q"),
                    SheetNote(keys: ["c/4"], duration: "q"),
                    SheetNote(keys: ["d/4"], duration: "q"),
                    SheetNote(keys: ["e/4"], duration: "q"),
                    SheetNote(keys: ["e/4"], duration: "q"),
                    SheetNote(keys: ["d/4"], duration: "h"),
                    SheetNote(keys: ["d/4"], duration: "h"),
                ]
            }
        }

        var title: String {
            switch self {
            case .cMajorScale: return "C Major Scale"
            case .chords: return "Major Chords"
            case .melody: return "Simple Melody"
            case .rhythms: return "Rhythm Study"
            case .twinkle: return "Twinkle Twinkle Little Star"
            case .odeToJoy: return "Ode to Joy"
            }
        }

        var composer: String {
            switch self {
            case .cMajorScale, .chords, .melody, .rhythms: return "White Room Demo"
            case .twinkle: return "Mozart"
            case .odeToJoy: return "Beethoven"
            }
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Picker for examples
            Picker("Example", selection: $selectedExample) {
                ForEach(ExampleType.allCases, id: \.self) { example in
                    Text(example.rawValue)
                        .tag(example)
                }
            }
            .pickerStyle(.segmented)
            .padding()

            // Sheet music display
            SheetMusicView(
                notes: selectedExample.notes,
                title: selectedExample.title,
                composer: selectedExample.composer
            )
        }
        .navigationTitle("Sheet Music Demo")
    }
}

/// Test data provider for unit testing
struct SheetMusicTestData {
    /// Generate a C major scale
    static func cMajorScale() -> [SheetNote] {
        let noteNames = ["c", "d", "e", "f", "g", "a", "b"]
        return noteNames.enumerated().map { index, name in
            SheetNote(
                keys: ["\(name)/4"],
                duration: "q"
            )
        }
    }

    /// Generate major triads
    static func majorTriads() -> [SheetNote] {
        let roots = ["c", "f", "g"]
        return roots.map { root in
            let rootNum = noteToNumber(root)
            let third = numberToNote(rootNum + 4)
            let fifth = numberToNote(rootNum + 7)
            return SheetNote(
                keys: ["\(root)/4", "\(third)/4", "\(fifth)/4"],
                duration: "w"
            )
        }
    }

    /// Generate mixed rhythms
    static func mixedRhythms() -> [SheetNote] {
        return [
            SheetNote(keys: ["c/4"], duration: "w"),
            SheetNote(keys: ["d/4"], duration: "h"),
            SheetNote(keys: ["e/4"], duration: "q"),
            SheetNote(keys: ["f/4"], duration: "8"),
            SheetNote(keys: ["g/4"], duration: "8"),
        ]
    }

    /// Convert note name to number (c=0, d=2, e=4, etc.)
    private static func noteToNumber(_ note: String) -> Int {
        let notes = ["c", "d", "e", "f", "g", "a", "b"]
        return notes.firstIndex(of: note.lowercased()) ?? 0
    }

    /// Convert number to note name
    private static func numberToNote(_ num: Int) -> String {
        let notes = ["c", "d", "e", "f", "g", "a", "b"]
        return notes[num % 7]
    }
}

#Preview {
    NavigationStack {
        SheetMusicDemoView()
    }
}
