# System Architecture Diagrams

**Visual architecture documentation for White Room using Mermaid diagrams.**

---

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Component Interaction](#component-interaction)
3. [Data Flow](#data-flow)
4. [Deployment Architecture](#deployment-architecture)

---

## High-Level Architecture

### System Overview

```mermaid
graph TB
    subgraph "User Interface Layer"
        A[Swift UI - macOS]
        B[Swift UI - tvOS]
        C[Swift UI - iOS]
    end

    subgraph "SDK Layer"
        D[TypeScript SDK]
        E[Projection Engine]
        F[State Management]
    end

    subgraph "FFI Bridge"
        G[C FFI Interface]
        H[Serialization]
    end

    subgraph "Audio Engine Layer"
        I[JUCE Audio Engine]
        J[DSP Processors]
        K[MIDI Handler]
    end

    subgraph "Hardware Layer"
        L[Audio Device]
        M[MIDI Device]
        N[Storage]
    end

    A --> D
    B --> D
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
    H --> I
    I --> J
    I --> K
    I --> L
    I --> M
    D --> N
```

### Platform Architecture

```mermaid
graph LR
    subgraph "macOS"
        A1[Native App]
        A2[Core Audio]
        A3[Audio Units]
    end

    subgraph "tvOS"
        B1[Apple TV App]
        B2[Core Audio]
        B3[Remote Control]
    end

    subgraph "iOS"
        C1[Companion App]
        C2[Remote Control]
        C3[Bluetooth]
    end

    subgraph "Shared Components"
        D1[SDK]
        D2[FFI Bridge]
        D3[JUCE Engine]
    end

    A1 --> D1
    B1 --> D1
    C1 --> D1
    D1 --> D2
    D2 --> D3
```

---

## Component Interaction

### MVC Pattern (SwiftUI)

```mermaid
graph TB
    subgraph "View Layer"
        A1[TimelineView]
        A2[PianoRollView]
        A3[MixerView]
    end

    subgraph "ViewModel Layer"
        B1[TimelineViewModel]
        B2[PianoRollViewModel]
        B3[MixerViewModel]
    end

    subgraph "Model Layer"
        C1[Project]
        C2[Track]
        C3[Region]
        C4[Note]
    end

    subgraph "Manager Layer"
        D1[AudioManager]
        D2[ProjectManager]
        D3[MIDIManager]
    end

    A1 --> B1
    A2 --> B2
    A3 --> B3

    B1 --> C1
    B1 --> C2
    B1 --> C3
    B2 --> C4
    B3 --> C2

    B1 --> D1
    B1 --> D2
    B2 --> D3

    C1 -.-> B1
    C2 -.-> B1
    C3 -.-> B1
```

### FFI Bridge Interaction

```mermaid
sequenceDiagram
    participant UI as Swift UI
    participant VM as ViewModel
    participant SDK as TypeScript SDK
    participant FFI as C FFI
    participant JUCE as JUCE Engine

    UI->>VM: User Action
    VM->>SDK: API Call
    SDK->>SDK: Validate
    SDK->>FFI: Serialize (JSON)
    FFI->>FFI: Parse JSON
    FFI->>JUCE: C Function Call
    JUCE->>JUCE: Process Audio
    JUCE->>FFI: Return Result
    FFI->>SDK: Serialize Result
    SDK->>VM: Return Data
    VM->>UI: Update UI
```

---

## Data Flow

### Audio Processing Flow

```mermaid
graph TB
    A[MIDI Input] --> B[MIDI Handler]
    B --> C[Note Processor]
    C --> D[Instrument Synth]
    D --> E[Effect Chain]
    E --> F[Mixer]
    F --> G[Master Bus]
    G --> H[Audio Output]

    I[Audio Input] --> J[Audio Recorder]
    J --> F

    K[Automation] --> L[Parameter Smoother]
    L --> E
    L --> D
```

### Project Save Flow

```mermaid
sequenceDiagram
    participant UI as User Interface
    participant VM as ViewModel
    participant PM as ProjectManager
    participant SDK as SDK
    participant FS as File System

    UI->>VM: Save Command
    VM->>PM: saveProject()
    PM->>PM: Serialize Project
    PM->>SDK: Validate
    SDK->>PM: Validation OK
    PM->>FS: Write to Disk
    FS->>PM: Success/Error
    PM->>VM: Result
    VM->>UI: Update UI
```

### Real-Time Playback Flow

```mermaid
graph LR
    A[Play Button] --> B[Transport Manager]
    B --> C[Audio Engine]
    C --> D[Process Tracks]
    D --> E[Synthesize MIDI]
    D --> F[Process Audio]
    E --> G[Apply Effects]
    F --> G
    G --> H[Mix to Stereo]
    H --> I[Output to Device]
```

---

## Deployment Architecture

### CI/CD Pipeline

```mermaid
graph TB
    A[Git Push] --> B[GitHub Actions]
    B --> C[Build Swift]
    B --> D[Build SDK]
    B --> E[Build JUCE]
    C --> F[Run Tests]
    D --> F
    E --> F
    F --> G{All Tests Pass?}
    G -->|Yes| H[Create Release]
    G -->|No| I[Notify Failure]
    H --> J[Build DMG]
    J --> K[Upload to GitHub]
    K --> L[Deploy to TestFlight]
```

### Multi-Platform Deployment

```mermaid
graph TB
    subgraph "Source Code"
        A[Swift UI]
        B[SDK]
        C[JUCE Backend]
    end

    subgraph "Build Targets"
        D[macOS App]
        E[tvOS App]
        E[iOS App]
    end

    subgraph "Distribution"
        F[App Store]
        G[Direct Download]
        H[TestFlight]
    end

    A --> D
    A --> E
    B --> D
    B --> E
    C --> D
    C --> E

    D --> F
    D --> G
    E --> F
    E --> H
```

### Runtime Architecture

```mermaid
graph TB
    subgraph "Process Spaces"
        A[Main Process - Swift UI]
        B[Audio Process - JUCE]
        C[Plugin Processes - AU/VST3]
    end

    subgraph "Inter-Process Communication"
        D[XPC - macOS]
        E[Shared Memory]
        F[MIDI Callbacks]
    end

    subgraph "Hardware"
        G[Audio Device]
        H[MIDI Device]
    end

    A --> D
    B --> D
    D --> E
    B --> F
    H --> F
    B --> G
```

---

## Component Relationships

### Dependency Graph

```mermaid
graph TD
    A[Swift UI Views] --> B[ViewModels]
    B --> C[Models]
    B --> D[Managers]

    D --> E[AudioManager]
    D --> F[ProjectManager]
    D --> G[MIDIManager]

    E --> H[FFI Bridge]
    H --> I[JUCE Engine]

    I --> J[Audio Processing]
    I --> K[MIDI Processing]
    I --> L[File I/O]
```

### Module Dependencies

```mermaid
graph LR
    subgraph "Frontend"
        A[Views]
        B[ViewModels]
        C[Models]
    end

    subgraph "SDK"
        D[API Layer]
        E[Projection Engine]
        F[State Manager]
    end

    subgraph "Backend"
        G[FFI Layer]
        H[JUCE Engine]
    end

    A --> B
    B --> C
    B --> D
    D --> E
    E --> F
    D --> G
    G --> H
```

---

## State Management

### Data Flow Architecture

```mermaid
graph TB
    A[User Action] --> B[ViewModel]
    B --> C[Intent]
    C --> D[Reducer]
    D --> E[State Update]
    E --> F[New State]
    F --> G[View Update]
    F --> H[Persistence]
```

### State Synchronization

```mermaid
sequenceDiagram
    participant UI as UI
    participant VM as ViewModel
    participant State as State Manager
    participant Engine as Audio Engine

    UI->>VM: User Input
    VM->>State: Create Action
    State->>State: Process Action
    State->>Engine: Update Engine
    Engine->>State: Confirm Update
    State->>VM: New State
    VM->>UI: Re-render
```

---

## Plugin Architecture

### Audio Unit Hosting

```mermaid
graph TB
    A[White Room] --> B[Audio Unit Manager]
    B --> C[Scan Plugins]
    C --> D[Load Component]
    D --> E[Initialize Plugin]
    E --> F[Process Audio]
    F --> G[Output to Mixer]

    H[Plugin UI] --> I[Plugin View]
    I --> A
```

### Effect Chain Processing

```mermaid
graph LR
    A[Input Audio] --> B[Effect 1]
    B --> C[Effect 2]
    C --> D[Effect 3]
    D --> E[Effect N]
    E --> F[Output Audio]

    G[Automation] --> B
    G --> C
    G --> D
    G --> E
```

---

**Last Updated**: January 16, 2026
**Version**: 1.0.0

---

*These diagrams use Mermaid syntax. Render them using any Mermaid-compatible renderer (GitHub, MkDocs with Mermaid plugin, etc.).*
