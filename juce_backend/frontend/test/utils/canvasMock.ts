export function makeCanvasMock(contextOverride?: Partial<CanvasRenderingContext2D>) {
  const originalGetContext = (HTMLCanvasElement.prototype as any).getContext;
  const originalGetBounding = (Element.prototype as any).getBoundingClientRect;

  function createContext() {
    const base = {
      clearRect: () => {},
      fillRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fillText: () => {},
      arc: () => {},
      save: () => {},
      restore: () => {},
      closePath: () => {},
      rect: () => {},
      fill: () => {},
      measureText: () => ({ width: 0 }),
      // properties that components may set
      fillStyle: '#000',
      strokeStyle: '#000',
      lineWidth: 1,
    } as unknown as CanvasRenderingContext2D;
    if (contextOverride) {
      return Object.assign(base, contextOverride) as CanvasRenderingContext2D;
    }
    return base;
  }

  return {
    install() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (HTMLCanvasElement.prototype as any).getContext = function () {
        return createContext();
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Element.prototype as any).getBoundingClientRect = function () {
        return {
          left: 0,
          top: 0,
          width: 800,
          height: 120,
          right: 800,
          bottom: 120,
          x: 0,
          y: 0,
          toJSON: () => {},
        };
      };
    },
    uninstall() {
      // restore originals
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (HTMLCanvasElement.prototype as any).getContext = originalGetContext;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Element.prototype as any).getBoundingClientRect = originalGetBounding;
    },
  };
}

// Simple test helper to mock the `cn` utility if path aliases or bundling
// cause the real utility to be unavailable. Tests can call `installMockCn`
// in a beforeEach and `uninstallMockCn` in afterEach.
export function installMockCn() {
  // Attach to global window so tests can import via relative mocks if needed
  (globalThis as any).__testMocks__ = (globalThis as any).__testMocks__ || {};
  (globalThis as any).__testMocks__.cn = function cn(...inputs: any[]) {
    return inputs.flat().filter(Boolean).join(' ');
  };
}

export function uninstallMockCn() {
  if ((globalThis as any).__testMocks__) {
    delete (globalThis as any).__testMocks__.cn;
  }
}
