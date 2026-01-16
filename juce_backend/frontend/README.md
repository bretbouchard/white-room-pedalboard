# DAW UI Frontend

A modern React-based Digital Audio Workstation interface built with TypeScript, Vite, and Tailwind CSS.

## Development Environment Setup

### Prerequisites

- Node.js 18+ 
- pnpm (recommended package manager)

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Authentication (Clerk)

- Set `VITE_CLERK_PUBLISHABLE_KEY` in `frontend/.env` to enable Clerk in the UI.
- The app wraps all routes in `ClerkProvider` via `AuthProvider` and will append the Clerk session token to the backend WebSocket URL automatically using `WebSocketAuthProvider`.

Optional envs:
- `VITE_WS_URL` to override the backend WebSocket endpoint (defaults to `ws://localhost:8000/ws`).

### Development Scripts

```bash
# Development
pnpm dev                 # Start development server on http://localhost:3000
pnpm build              # Build for production
pnpm preview            # Preview production build

# Code Quality
pnpm lint               # Run ESLint
pnpm lint:fix           # Fix ESLint issues automatically
pnpm format             # Format code with Prettier
pnpm format:check       # Check code formatting
pnpm type-check         # Run TypeScript type checking
pnpm check-all          # Run all checks (type-check, lint, format)

# Utilities
pnpm clean              # Clean build artifacts and cache
```

## Technology Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling with custom DAW design system
- **Zustand** - State management
- **React Query** - Server state synchronization
- **React Router** - Client-side routing
- **ESLint + Prettier** - Code quality and formatting

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI components
│   ├── daw/            # DAW-specific components
│   └── layout/         # Layout components
├── hooks/              # Custom React hooks
├── stores/             # Zustand stores
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
├── App.tsx             # Main application component
├── main.tsx            # Application entry point
└── index.css           # Global styles with Tailwind
```

## Design System

The project includes a custom design system optimized for professional audio interfaces:

### Color Palette

- **Background**: Dark theme optimized for studio environments
- **Surface**: Multiple levels for depth and hierarchy
- **Accent**: Professional audio colors (green, orange, teal)
- **Audio Levels**: Standard audio metering colors

### Components

- **daw-panel**: Container panels with proper borders and backgrounds
- **daw-button**: Professional-style buttons with hover states
- **daw-input**: Form inputs with focus states
- **daw-slider**: Custom sliders for audio controls
- **daw-knob**: Rotary controls for parameters
- **level-meter**: Audio level visualization components

### Responsive Breakpoints

- **mobile**: 320px (Phone portrait)
- **tablet**: 768px (Tablet portrait)
- **desktop**: 1024px (Desktop)
- **studio**: 1440px (Large studio monitors)
- **ultrawide**: 2560px (Ultra-wide displays)

## Configuration

### Path Aliases

The project is configured with path aliases for cleaner imports:

```typescript
import Button from '@/components/ui/Button'
import { useAudioStore } from '@/stores/audioStore'
import { AudioAnalysis } from '@/types/audio'
```

### Backend Integration

The development server is configured to proxy API calls to the Python backend:

- `/api/*` → `http://localhost:8000`
- `/ws/*` → `ws://localhost:8000` (WebSocket). When Clerk is configured, the frontend will automatically append the Clerk session token as `?token=...`.

### Build Optimization

The production build includes:

- Code splitting for vendor libraries
- Source maps for debugging
- Optimized chunk sizes
- Tree shaking for unused code

## Development Guidelines

### Code Style

- Use TypeScript strict mode
- Follow ESLint and Prettier configurations
- Use functional components with hooks
- Implement proper error boundaries
- Write accessible components (WCAG 2.1 AA)

### State Management

- Use Zustand for client state
- Use React Query for server state
- Implement optimistic updates for real-time features
- Handle WebSocket connections gracefully

### Performance

- Use React.memo for expensive components
- Implement virtual scrolling for large lists
- Optimize re-renders with useCallback and useMemo
- Use Web Workers for heavy computations

## Testing

Testing infrastructure will be added in subsequent tasks:

- Unit tests with Jest and React Testing Library
- Integration tests for WebSocket communication
- End-to-end tests with Cypress
- Visual regression tests for UI components

## Deployment

The frontend is built as a static site that can be deployed to:

- CDN (recommended for production)
- Static hosting services
- Docker containers
- Integrated with backend deployment

## Next Steps

This completes the React Development Environment Setup. The next tasks will implement:

1. Core UI Component Library
2. State Management and Data Flow
3. WebSocket Communication Layer
4. DAW Interface Components
