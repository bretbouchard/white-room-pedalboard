import SwiftUI

/// Main DSP parameter control panel
///
/// Features:
/// - Parameter grouping (oscillator, filter, envelope, effects, master)
/// - Real-time parameter updates
/// - Bi-directional parameter binding
/// - Smooth value transitions
/// - Preset management
/// - Undo/redo support
/// - Parameter automation
public struct DSPParameterView: View {
    // MARK: - Properties

    @StateObject private var model = DSPParameterModel()
    @State private var selectedGroup: DSPParameterGroup = .oscillator
    @State private var showingPresetSheet = false

    @Environment(\.colorScheme) private var colorScheme

    // MARK: - Body

    public var body: some View {
        VStack(spacing: 0) {
            // Header
            headerView

            // Group selector
            groupSelectorView

            // Parameter controls
            ScrollView {
                parameterControlsView
                    .padding()
            }

            // Footer
            footerView
        }
        .background(backgroundColor)
        .sheet(isPresented: $showingPresetSheet) {
            presetSheetView
        }
    }

    // MARK: - Header View

    private var headerView: some View {
        HStack {
            Text("DSP Parameters")
                .font(.headline)
                .foregroundColor(.primary)

            Spacer()

            // Preset button
            Button(action: { showingPresetSheet = true }) {
                HStack(spacing: 4) {
                    Text(model.presetName)
                        .font(.caption)
                    Image(systemName: "chevron.down")
                        .font(.caption2)
                }
                .foregroundColor(.secondary)
            }
            .buttonStyle(PlainButtonStyle())
        }
        .padding()
        .background(headerBackgroundColor)
    }

    // MARK: - Group Selector

    private var groupSelectorView: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(DSPParameterGroup.allCases, id: \.self) { group in
                    groupButton(for: group)
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
        }
        .background(separatorColor)
    }

    private func groupButton(for group: DSPParameterGroup) -> some View {
        Button(action: { selectedGroup = group }) {
            Text(group.rawValue)
                .font(.caption)
                .fontWeight(selectedGroup == group ? .semibold : .regular)
                .foregroundColor(selectedGroup == group ? .white : .secondary)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(selectedGroup == group ? Color.accentColor : Color.clear)
                .cornerRadius(12)
        }
        .buttonStyle(PlainButtonStyle())
    }

    // MARK: - Parameter Controls

    private var parameterControlsView: some View {
        VStack(spacing: 20) {
            ForEach(parameterGroups, id: \.self) { group in
                parameterGroupView(for: group)
            }
        }
    }

    private var parameterGroups: [DSPParameterGroup] {
        [selectedGroup]
    }

    private func parameterGroupView(for group: DSPParameterGroup) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            // Group header
            Text(group.rawValue)
                .font(.headline)
                .foregroundColor(.primary)

            // Parameters grid
            LazyVGrid(
                columns: [
                    GridItem(.flexible()),
                    GridItem(.flexible()),
                    GridItem(.flexible())
                ],
                spacing: 16
            ) {
                ForEach(parameters(for: group)) { parameter in
                    parameterControl(for: parameter)
                }
            }
        }
        .padding()
        .background(groupBackgroundColor)
        .cornerRadius(12)
    }

    private func parameters(for group: DSPParameterGroup) -> [DSPParameter] {
        model.getParameters(in: group)
    }

    @ViewBuilder
    private func parameterControl(for parameter: DSPParameter) -> some View {
        switch parameter.type {
        case .continuous:
            continuousParameterControl(for: parameter)
        case .enumeration:
            enumParameterControl(for: parameter)
        case .boolean:
            booleanParameterControl(for: parameter)
        }
    }

    // MARK: - Parameter Control Types

    private func continuousParameterControl(for parameter: DSPParameter) -> some View {
        VStack(spacing: 8) {
            // Use knob for most parameters
            if parameter.unit == "" && parameter.maxValue <= 1.0 {
                DSPKnobControl(
                    value: binding(for: parameter),
                    in: parameter.minValue...parameter.maxValue,
                    title: parameter.name,
                    unit: parameter.unit
                )
            } else {
                // Use slider for frequency and time parameters
                sliderParameterControl(for: parameter)
            }
        }
    }

    private func sliderParameterControl(for parameter: DSPParameter) -> some View {
        VStack(spacing: 8) {
            Text(parameter.name)
                .font(.caption2)
                .foregroundColor(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)

            VStack(spacing: 4) {
                HStack {
                    Text(formatMinValue(parameter))
                        .font(.caption2)
                        .foregroundColor(.secondary)

                    Spacer()

                    Text(parameter.displayValue())
                        .font(.caption)
                        .foregroundColor(.primary)

                    Spacer()

                    Text(formatMaxValue(parameter))
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }

                Slider(
                    value: binding(for: parameter),
                    in: parameter.minValue...parameter.maxValue
                )
                .accentColor(.accentColor)
            }
        }
        .padding()
        .background(controlBackgroundColor)
        .cornerRadius(8)
    }

    private func enumParameterControl(for parameter: DSPParameter) -> some View {
        VStack(spacing: 8) {
            Text(parameter.name)
                .font(.caption2)
                .foregroundColor(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)

            Picker(parameter.name, selection: binding(for: parameter)) {
                ForEach(0..<parameter.enumValues.count, id: \.self) { index in
                    Text(parameter.enumValues[index]).tag(Float(index))
                }
            }
            .pickerStyle(.menu)
            .buttonStyle(PlainButtonStyle())
        }
        .padding()
        .background(controlBackgroundColor)
        .cornerRadius(8)
    }

    private func booleanParameterControl(for parameter: DSPParameter) -> some View {
        Toggle(parameter.name, isOn: booleanBinding(for: parameter))
            .toggleStyle(SwitchToggleStyle(tint: .accentColor))
    }

    // MARK: - Footer

    private var footerView: some View {
        HStack(spacing: 16) {
            // Undo/Redo
            HStack(spacing: 8) {
                Button(action: { model.undo() }) {
                    Image(systemName: "arrow.uturn.backward")
                        .font(.body)
                        .foregroundColor(model.canUndo ? .primary : .secondary)
                }
                .disabled(!model.canUndo)
                .buttonStyle(PlainButtonStyle())

                Button(action: { model.redo() }) {
                    Image(systemName: "arrow.uturn.forward")
                        .font(.body)
                        .foregroundColor(model.canRedo ? .primary : .secondary)
                }
                .disabled(!model.canRedo)
                .buttonStyle(PlainButtonStyle())
            }

            Spacer()

            // Reset
            Button(action: resetParameters) {
                Text("Reset")
                    .font(.caption)
                    .foregroundColor(.accentColor)
            }
            .buttonStyle(PlainButtonStyle())

            // Save preset
            Button(action: { showingPresetSheet = true }) {
                Text("Save")
                    .font(.caption)
                    .foregroundColor(model.isModified ? .accentColor : .secondary)
            }
            .disabled(!model.isModified)
            .buttonStyle(PlainButtonStyle())
        }
        .padding()
        .background(separatorColor)
    }

    // MARK: - Preset Sheet

    private var presetSheetView: some View {
        NavigationView {
            VStack(alignment: .leading, spacing: 20) {
                // Save preset
                VStack(alignment: .leading, spacing: 12) {
                    Text("Save Preset")
                        .font(.headline)

                    TextField("Preset Name", text: $model.presetName)
                        .textFieldStyle(RoundedBorderTextFieldStyle())

                    Button(action: { model.savePreset(name: model.presetName) }) {
                        Text("Save")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                }

                Divider()

                // Load preset
                VStack(alignment: .leading, spacing: 12) {
                    Text("Load Preset")
                        .font(.headline)

                    // TODO: List available presets
                    Text("No presets saved yet")
                        .foregroundColor(.secondary)
                }

                Spacer()
            }
            .padding()
            .navigationTitle("Presets")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { showingPresetSheet = false }
                }
            }
        }
    }

    // MARK: - Helper Methods

    private func binding(for parameter: DSPParameter) -> Binding<Float> {
        Binding(
            get: { model.getValue(for: parameter.id) },
            set: { model.setValue($0, for: parameter.id) }
        )
    }

    private func booleanBinding(for parameter: DSPParameter) -> Binding<Bool> {
        Binding(
            get: { model.getValue(for: parameter.id) > 0.5 },
            set: { model.setValue($0 ? 1.0 : 0.0, for: parameter.id) }
        )
    }

    private func formatMinValue(_ parameter: DSPParameter) -> String {
        formatValue(parameter.minValue, parameter: parameter)
    }

    private func formatMaxValue(_ parameter: DSPParameter) -> String {
        formatValue(parameter.maxValue, parameter: parameter)
    }

    private func formatValue(_ value: Float, parameter: DSPParameter) -> String {
        let scaled = value * parameter.displayScaler

        if parameter.unit == "Hz" {
            return scaled >= 1000 ? String(format: "%.1fk", scaled / 1000) : String(format: "%.0f", scaled)
        } else if parameter.unit == "s" {
            return scaled < 0.001 ? String(format: "%.1fm", scaled * 1000) : String(format: "%.2f", scaled)
        } else {
            return String(format: "%.1f", scaled)
        }
    }

    private func resetParameters() {
        // Reset all parameters to default
        for parameter in model.parameters {
            model.setValue(parameter.defaultValue, for: parameter.id)
        }
        model.isModified = false
    }

    // MARK: - Colors

    private var backgroundColor: Color {
        colorScheme == .dark ? Color.black : Color.white
    }

    private var headerBackgroundColor: Color {
        colorScheme == .dark ? Color(white: 0.15) : Color(white: 0.95)
    }

    private var separatorColor: Color {
        colorScheme == .dark ? Color(white: 0.1) : Color(white: 0.9)
    }

    private var groupBackgroundColor: Color {
        colorScheme == .dark ? Color(white: 0.12) : Color(white: 0.92)
    }

    private var controlBackgroundColor: Color {
        colorScheme == .dark ? Color(white: 0.1) : Color(white: 0.9)
    }
}

// MARK: - Preview

#if DEBUG
struct DSPParameterView_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            DSPParameterView()
                .previewDisplayName("Light Mode")
                .frame(height: 600)

            DSPParameterView()
                .preferredColorScheme(.dark)
                .previewDisplayName("Dark Mode")
                .frame(height: 600)

            DSPParameterView()
                .previewDevice("iPhone SE (3rd generation)")
                .previewDisplayName("iPhone SE")
        }
    }
}
#endif
