//
//  InstrumentAssignmentView.swift
//  White Room
//
//  Created by AI Assistant
//  Copyright © 2026 White Room. All rights reserved.
//

import SwiftUI

/// Main view for managing instrument assignments
struct InstrumentAssignmentView: View {
    @StateObject private var manager = InstrumentAssignmentManager()
    @State private var selectedTrack: String?
    @State private var showingInstrumentPicker = false
    @State private var showingAddSheet = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationView {
            ZStack {
                if manager.assignments.isEmpty {
                    emptyStateView
                } else {
                    assignmentList
                }
            }
            .navigationTitle("Instruments")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        showingAddSheet = true
                    }) {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showingInstrumentPicker) {
                InstrumentPickerView(
                    selectedInstrument: Binding(
                        get: {
                            if let trackId = selectedTrack {
                                return manager.getInstrument(trackId: trackId)
                            }
                            return nil
                        },
                        set: { newInstrument in
                            if let trackId = selectedTrack, let instrument = newInstrument {
                                updateInstrument(trackId: trackId, instrument: instrument)
                            }
                        }
                    )
                )
            }
            .sheet(isPresented: $showingAddSheet) {
                AddInstrumentSheet(manager: manager)
            }
            .alert("Error", isPresented: .constant(errorMessage != nil)) {
                Button("OK") {
                    errorMessage = nil
                }
            } message: {
                if let error = errorMessage {
                    Text(error)
                }
            }
        }
    }

    private var emptyStateView: some View {
        VStack(spacing: 20) {
            Image(systemName: "music.note")
                .font(.system(size: 60))
                .foregroundColor(.secondary)

            Text("No Instruments Assigned")
                .font(.title2)
                .fontWeight(.semibold)

            Text("Assign instruments to your tracks to get started")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            Button("Add Instrument") {
                showingAddSheet = true
            }
            .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var assignmentList: some View {
        List {
            ForEach(manager.getAllAssignments()) { assignment in
                InstrumentAssignmentRow(assignment: assignment)
                    .contentShape(Rectangle())
                    .onTapGesture {
                        selectedTrack = manager.getAssignedTrackIds().first { id in
                            manager.getInstrument(trackId: id)?.id == assignment.id
                        }
                        showingInstrumentPicker = true
                    }
            }
            .onDelete(perform: deleteAssignments)
        }
    }

    private func deleteAssignments(at offsets: IndexSet) {
        let assignments = manager.getAllAssignments()
        for offset in offsets {
            let assignment = assignments[offset]
            if let trackId = manager.getAssignedTrackIds().first(where: { id in
                manager.getInstrument(trackId: id)?.id == assignment.id
            }) {
                manager.removeAssignment(trackId: trackId)
            }
        }
    }

    private func updateInstrument(trackId: String, instrument: MIDIInstrumentAssignment) {
        do {
            try manager.assignInstrument(trackId: trackId, instrument: instrument)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

/// Row component for displaying an instrument assignment
struct InstrumentAssignmentRow: View {
    let assignment: MIDIInstrumentAssignment

    var body: some View {
        HStack(spacing: 12) {
            // Instrument icon with color
            ZStack {
                Circle()
                    .fill(color(for: assignment.type))
                    .frame(width: 44, height: 44)

                Image(systemName: assignment.icon)
                    .font(.system(size: 20))
                    .foregroundColor(.white)
            }

            // Instrument info
            VStack(alignment: .leading, spacing: 4) {
                Text(assignment.name)
                    .font(.headline)

                Text(assignment.type.displayName)
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                Text("Channel \(assignment.channel) • Patch \(assignment.patch)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            // Plugin badge if applicable
            if assignment.plugin != nil {
                Image(systemName: "plug")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 4)
    }

    private func color(for type: InstrumentType) -> Color {
        Color(hex: assignment.color)
    }
}

/// Instrument picker sheet
struct InstrumentPickerView: View {
    @Binding var selectedInstrument: MIDIInstrumentAssignment?
    @Environment(\.dismiss) var dismiss

    let instrumentTypes: [InstrumentType] = [
        .piano, .organ, .guitar, .bass, .strings,
        .brass, .winds, .percussion, .synth, .drums
    ]

    var body: some View {
        NavigationView {
            List(instrumentTypes, id: \.self) { type in
                Button(action: {
                    selectInstrument(type)
                }) {
                    HStack {
                        ZStack {
                            Circle()
                                .fill(Color(hex: type.defaultColor))
                                .frame(width: 36, height: 36)

                            Image(systemName: type.iconName)
                                .font(.system(size: 16))
                                .foregroundColor(.white)
                        }

                        Text(type.displayName)
                            .foregroundColor(.primary)
                            .font(.body)

                        Spacer()

                        if selectedInstrument?.type == type {
                            Image(systemName: "checkmark")
                                .foregroundColor(.blue)
                        }
                    }
                }
            }
            .navigationTitle("Choose Instrument")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }

    private func selectInstrument(_ type: InstrumentType) {
        guard var instrument = selectedInstrument else { return }
        instrument.type = type
        instrument.color = type.defaultColor
        instrument.icon = type.iconName
        selectedInstrument = instrument
        dismiss()
    }
}

/// Sheet for adding a new instrument
struct AddInstrumentSheet: View {
    @ObservedObject var manager: MIDIInstrumentAssignmentManager
    @Environment(\.dismiss) var dismiss

    @State private var trackId = ""
    @State private var instrumentName = ""
    @State private var selectedType: InstrumentType = .piano
    @State private var channel = 1
    @State private var patch = 0
    @State private var bankMSB = ""
    @State private var bankLSB = ""
    @State private var errorMessage: String?

    var body: some View {
        NavigationView {
            Form {
                Section("Track") {
                    TextField("Track ID", text: $trackId)
                        .autocapitalization(.none)
                }

                Section("Instrument") {
                    TextField("Name", text: $instrumentName)

                    Picker("Type", selection: $selectedType) {
                        ForEach(InstrumentType.allCases, id: \.self) { type in
                            HStack {
                                Image(systemName: type.iconName)
                                Text(type.displayName)
                            }
                            .tag(type)
                        }
                    }

                    Picker("MIDI Channel", selection: $channel) {
                        ForEach(1...16, id: \.self) { ch in
                            Text("Channel \(ch)").tag(ch)
                        }
                    }

                    Picker("Patch", selection: $patch) {
                        ForEach(0...127, id: \.self) { p in
                            Text("Patch \(p)").tag(p)
                        }
                    }

                    TextField("Bank MSB (optional)", text: $bankMSB)
                        .keyboardType(.numberPad)

                    TextField("Bank LSB (optional)", text: $bankLSB)
                        .keyboardType(.numberPad)
                }
            }
            .navigationTitle("Add Instrument")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Add") {
                        addInstrument()
                    }
                    .disabled(trackId.isEmpty || instrumentName.isEmpty)
                }
            }
            .alert("Error", isPresented: .constant(errorMessage != nil)) {
                Button("OK") {
                    errorMessage = nil
                }
            } message: {
                if let error = errorMessage {
                    Text(error)
                }
            }
        }
    }

    private func addInstrument() {
        let instrument = InstrumentAssignment(
            id: UUID().uuidString,
            name: instrumentName,
            type: selectedType,
            channel: channel,
            patch: patch,
            bankMSB: bankMSB.isEmpty ? nil : Int(bankMSB),
            bankLSB: bankLSB.isEmpty ? nil : Int(bankLSB)
        )

        do {
            try manager.assignInstrument(trackId: trackId, instrument: instrument)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

/// Preview provider
struct InstrumentAssignmentView_Previews: PreviewProvider {
    static var previews: some View {
        InstrumentAssignmentView()
    }
}

/// Color extension for hex support
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
