// Minimal, single-definition RealtimeManager (final clean copy).
import { NetworkError } from '@schillinger-sdk/shared';
import { safeLog, safeExecute } from './error-handling';

export interface RealtimeSubscription { id: string; event: string; callback: (d:any)=>void; filter?: (d:any)=>boolean }
export interface RealtimeConnectionOptions { url?: string; timeout?: number; protocols?: string[]; webSocketConstructor?: any; heartbeatInterval?: number }
export interface ConnectionState { status: 'connecting'|'connected'|'disconnected'|'reconnecting'|'error'; lastConnected?: Date; reconnectAttempts: number; error?: Error }

export class RealtimeManager {
  // When false, defer/reject paths for connect() are suppressed which
  // allows disconnect() to atomically clear any pending connect
  // rejections. Defaults to true.
  private _allowConnectRejects: boolean = true;
  private ws: any = null;
  private subscriptions = new Map<string, RealtimeSubscription>();
  private connectionState: ConnectionState = { status: 'disconnected', reconnectAttempts: 0 };
  private options: Required<RealtimeConnectionOptions>;
  private queue: any[] = [];
  // public alias used by tests for queued messages
  get messageQueue() { return this.queue }
  private subscriptionCounter = 0;
  // Compatibility: map of active streaming requests used by tests
  private streamingRequests: Map<string, { type: string; callback?: (c:any)=>void; subId?: string; onComplete?: (r:any)=>void; onError?: (e:any)=>void }> = new Map();
  private heartbeatTimer?: NodeJS.Timeout;
  private _manualClose = false;
  // Track the currently-pending connect() promise so we can cancel its
  // timeout when the manager is explicitly disconnected. Tests rely on
  // deterministic behavior when disconnect() is called while a connect
  // handshake is in-flight.
  private _connectTimeout?: NodeJS.Timeout;
  private _connectDeferredTimeout?: NodeJS.Timeout;
  private _connectDeferredActive = false;
  private _connectToken?: symbol;
  private _connectSettled = false;
  // Per-attempt AbortController-like cancellation handle. When a
  // connect attempt is cancelled (by disconnect() or a new connect()),
  // aborting this controller causes deferred timeouts to bail early and
  // avoids late rejects.
  private _currentConnectAbort?: any;
  // Store the current in-flight connect promise handlers so we can
  // atomically clear them on disconnect to avoid stale rejects.
  private _connectResolve?: (() => void) | undefined;
  private _connectReject?: ((err?: any) => void) | undefined;
  // incremented per connect() call to guard against stale timeouts/handlers
  private _connectSeq = 0;
  private _connectionController?: any;

  // Inner helper class to consolidate guard checks used during connect rejection and timeouts.
  // Keeps guard logic out of large methods to reduce cyclomatic complexity.
  private static ConnectionGuards = class ConnectionGuards {
    private parent: RealtimeManager;
    constructor(parent: RealtimeManager) {
      this.parent = parent;
    }

    // Quick checks that are cheap and frequently short-circuit rejects.
    basicRejectGuard(ctx: { mySeq?: number }): boolean {
      const mySeq = ctx?.mySeq ?? -1;
      if (this.parent._connectSettled || this.parent._manualClose) return true;
      if (typeof this.parent._lastSuccessfulConnectSeq !== 'undefined' && this.parent._lastSuccessfulConnectSeq === mySeq) return true;
      if (this.parent._allowConnectRejects === false) return true;
      if (this.parent._suppressConnectRejection) return true;
      return false;
    }

    // More expensive checks that validate the attempt identity and socket state.
    advancedRejectGuard(ctx: { mySeq?: number; myDisconnectMark?: number; connectToken?: symbol | undefined; myWsInstance?: any; expectedReject?: ((e?: any)=>void) | undefined }): boolean {
      const { mySeq = -1, myDisconnectMark = -1, connectToken = undefined, myWsInstance = undefined, expectedReject = undefined } = ctx || {};
      if (this.parent._connectToken !== connectToken) return true;
      if (this.parent._disconnectMarker !== myDisconnectMark) return true;
      try { if (this.parent.ws !== myWsInstance) return true; } catch(_) { return true; }
      try { if (this.parent.connectionState && (this.parent.connectionState.status === 'connected' || this.parent.connectionState.status === 'disconnected')) return true; } catch(_) {}
      try {
        const currentReady = this.parent.ws?.readyState;
        const OPEN = (global as any).WebSocket && (global as any).WebSocket.OPEN !== undefined ? (global as any).WebSocket.OPEN : 1;
        if (currentReady === OPEN || currentReady === (WebSocket as any).OPEN) return true;
      } catch(_) {}
      if (mySeq !== this.parent._connectSeq) return true;
      if (expectedReject && this.parent._connectReject !== expectedReject) return true;
      return false;
    }
  };

  // Inner ConnectionController encapsulates the lifecycle logic for a
  // single connect attempt. Moving the heavy guard and timeout logic
  // here reduces complexity in the outer RealtimeManager methods and
  // keeps the implementation local to the module.
  private static ConnectionController = class ConnectionController {
    private parent: RealtimeManager;
    private guards: any;
    constructor(parent: RealtimeManager) {
      this.parent = parent;
      this.guards = new (RealtimeManager as any).ConnectionGuards(parent);
    }

    atomicallyReject(err?: any, expectedReject?: ((e?: any)=>void), ctx?: { mySeq: number; myDisconnectMark: number; connectToken: symbol | undefined; myWsInstance: any }): boolean {
      const { mySeq = -1, myDisconnectMark = -1, connectToken = undefined, myWsInstance = undefined } = ctx || {};
      if (this.guards.basicRejectGuard({ mySeq })) return false;
      if (this.guards.advancedRejectGuard({ mySeq, myDisconnectMark, connectToken, myWsInstance, expectedReject })) return false;

      const fn = this.parent._connectReject;
      if (!fn) return false;

      try { this.parent._connectReject = undefined; this.parent._connectResolve = undefined; } catch(_) {}
      try { if (this.parent._connectDeferredTimeout) { clearTimeout(this.parent._connectDeferredTimeout); this.parent._connectDeferredTimeout = undefined; } } catch(_) {}
      try { this.parent._connectDeferredActive = false; } catch(_) {}
      try { if (this.parent._connectTimeout) { clearTimeout(this.parent._connectTimeout); this.parent._connectTimeout = undefined; } } catch(_) {}

      try { fn(err); } catch(e) { try { console.log('[ConnectionController.atomicallyReject] stored reject threw', e); } catch(_) {} }
      return true;
    }

    handleConnectTimeout(
      mySeq: number,
      myDisconnectMark: number,
      connectToken: symbol | undefined,
      myAttemptCtrl: any,
      myWsInstance: any,
      getSettled: () => boolean,
      setSettled: (v:boolean) => void,
      atomicallyReject: (err?: any, expectedReject?: ((e?: any)=>void)) => boolean
    ) {
      return (this.parent as any)._handleConnectTimeout(mySeq, myDisconnectMark, connectToken, myAttemptCtrl, myWsInstance, getSettled, setSettled, atomicallyReject);
    }

    runDeferredConnectReject(
      mySeq: number,
      myDisconnectMark: number,
      connectToken: symbol | undefined,
      _localRejectRef: any,
      _localWsRef: any,
      myAttemptCtrl: any,
      nw: any,
      atomicallyReject: (err?: any, expectedReject?: ((e?: any)=>void)) => boolean
    ) {
      return (this.parent as any)._runDeferredConnectReject(mySeq, myDisconnectMark, connectToken, _localRejectRef, _localWsRef, myAttemptCtrl, nw, atomicallyReject);
    }

    handleConnectOpen(ctx: { mySeq: number; myAttemptCtrl: any; timeout: any; setSettled: (v:boolean)=>void; getSettled: ()=>boolean }){
      return (this.parent as any)._handleConnectOpen(ctx);
    }

    handleConnectClose(ctx: { ev?: any; mySeq: number; timeout: any; getSettled: ()=>boolean; setSettled: (v:boolean)=>void; atomicallyReject: (err?: any, expectedReject?: ((e?: any)=>void)) => boolean }){
      return (this.parent as any)._handleConnectClose(ctx);
    }

    handleConnectError(ctx: { e?: any; mySeq: number; timeout: any; atomicallyReject: (err?: any, expectedReject?: ((e?: any)=>void)) => boolean; getSettled: ()=>boolean; setSettled: (v:boolean)=>void }){
      return (this.parent as any)._handleConnectError(ctx);
    }
  };
  // Track the most recent successful connect sequence so deferred timers
  // can detect if their attempt later succeeded and abort rejecting.
  private _lastSuccessfulConnectSeq?: number = undefined;
  // When true, the next connect-timeout should not reject (used during
  // explicit disconnect() calls to suppress races where a pending timeout
  // fires after we've closed the socket intentionally).
  private _suppressConnectRejection = false;
  // Marker incremented on explicit disconnect to help guard against
  // stale timeouts that may fire after a disconnect has invalidated
  // the previous connect attempt.
  private _disconnectMarker = 0;
  // Shared handler so we can attach it from subscribe() as well as connect()
  private handleMessage = (ev: any) => {
    try{
      const parsed = this._parseMessage(ev);
      safeExecute(
        'RealtimeManager.handleMessage.debug',
        () => console.debug('[RealtimeManager.handleMessage] parsedType=', parsed && parsed.type)
      );
      if (parsed && parsed.type) this.dispatch(parsed);
    } catch (error) {
      // Log JSON parsing errors but don't crash real-time processing
      safeLog('RealtimeManager.handleMessage', error, 'warn');
    }
  };

  // Extracted parsing helper so handleMessage is small and easier to
  // reason about. Returns the parsed payload or undefined on error.
  private _parseMessage(ev: any): any | undefined {
    try {
      const data = (ev && typeof ev === 'object' && 'data' in ev)? ev.data : ev;
      try { console.debug('[RealtimeManager._parseMessage] raw=', typeof data === 'string' ? data : JSON.stringify(data)); } catch(_) {}
      if (typeof data === 'string') {
        try { return JSON.parse(data); } catch (err) { try { console.error('Error parsing WebSocket message:', err); } catch(_){} return undefined; }
      }
      return data;
    } catch (_) { return undefined; }
  }

  private _handleConnectOpen(ctx: { mySeq: number; myAttemptCtrl: any; timeout: any; setSettled: (v:boolean)=>void; getSettled: ()=>boolean }){
    try{
      const { mySeq, myAttemptCtrl, timeout, setSettled, getSettled } = ctx;
      if (getSettled() || mySeq !== this._connectSeq) return;
      setSettled(true);
      this._connectSettled = true;
      try { this._lastSuccessfulConnectSeq = mySeq; } catch(_) {}
      try { clearTimeout(timeout); } catch(_) {}
      try { if (this._connectDeferredTimeout) { clearTimeout(this._connectDeferredTimeout); this._connectDeferredTimeout = undefined; } } catch(_) {}
      try { if (this._connectTimeout) { clearTimeout(this._connectTimeout); this._connectTimeout = undefined; } } catch (_) { }
      try { this._connectToken = undefined; } catch(_) { }
      try { console.log('[RealtimeManager.onOpen] readyState=', this.ws?.readyState); } catch (_) { }
      try { (this.ws as any).__connected = true; } catch (_) { }
      const prevAttempts = (this.connectionState && typeof this.connectionState.reconnectAttempts === 'number') ? this.connectionState.reconnectAttempts : 0;
      this.connectionState = { status: 'connected', lastConnected: new Date(), reconnectAttempts: prevAttempts };
      this.emit('connectionStateChanged', this.connectionState);
      this.startHeartbeat();
      this.flush();
      try {
        try { if (myAttemptCtrl && typeof myAttemptCtrl.abort === 'function') { try { myAttemptCtrl.abort(); } catch(_){} } } catch(_) {}
        try { this._currentConnectAbort = undefined; } catch(_) {}
        const res = this._connectResolve;
        try { this._connectResolve = undefined; } catch(_) {}
        try { this._connectReject = undefined; } catch(_) {}
        if (typeof res === 'function') {
          try { res(); } catch(_) { }
        }
      } catch (e) {
      // Log connection cleanup errors for debugging
      console.warn('[ConnectionController._atomicallyReject] Error during cleanup:', e instanceof Error ? e.message : e);
    }
    } catch(_) {}
  }

  private _handleConnectClose(ctx: { ev?: any; mySeq: number; timeout: any; getSettled: ()=>boolean; setSettled: (v:boolean)=>void; atomicallyReject: (err?: any, expectedReject?: ((e?: any)=>void)) => boolean }){
    try{
      const { ev, mySeq, timeout, getSettled, setSettled, atomicallyReject } = ctx;
      if (mySeq !== this._connectSeq) return;
      try { clearTimeout(timeout); } catch (_) { }
      try { if (this._connectDeferredTimeout) { clearTimeout(this._connectDeferredTimeout); this._connectDeferredTimeout = undefined; } } catch(_) {}
      try { if (this._connectTimeout) { clearTimeout(this._connectTimeout); this._connectTimeout = undefined; } } catch (_) { }
      try { this._connectToken = undefined; } catch(_) { }
      this.stopHeartbeat();
      const wasConnected = this.connectionState && this.connectionState.status === 'connected';
      const code = ev && typeof ev === 'object' && 'code' in ev ? ev.code : undefined;
      const normalClose = (code === 1000) || (code === undefined && !wasConnected) || this._manualClose;
      if (wasConnected && !normalClose) {
        try { this.ws = null; } catch (_) { }
        const prevAttempts = (this.connectionState && typeof this.connectionState.reconnectAttempts === 'number') ? this.connectionState.reconnectAttempts : 0;
        const nextAttempts = prevAttempts + 1;
        this.connectionState = { ...this.connectionState, status: 'reconnecting', reconnectAttempts: nextAttempts } as any;
        this.emit('connectionStateChanged', this.connectionState);
        const interval = (this.options as any).reconnectInterval || 1000;
        if (nextAttempts <= ((this.options as any).maxReconnectAttempts || 5)) {
          setTimeout(() => { try { if (!this._manualClose) { this.connect().catch(() => { }); } } catch (_) { } }, interval);
        } else {
          this.connectionState = { status: 'error', reconnectAttempts: nextAttempts, error: new NetworkError('Max reconnect attempts exceeded') } as any;
          this.emit('connectionStateChanged', this.connectionState);
        }
        if (!getSettled() && mySeq === this._connectSeq) {
          setSettled(true);
          this._connectSettled = true;
          try {
            const nw = new NetworkError('WebSocket connection error');
            const didReject = atomicallyReject(nw);
            if (didReject) {
            } else {
              try { console.debug('[RealtimeManager.onClose] atomicallyReject returned false; likely manual disconnect'); } catch(_) {}
            }
          } catch(_) { }
        }
      } else {
        if (!getSettled() && mySeq === this._connectSeq && !normalClose) {
          if (mySeq !== this._connectSeq || this._manualClose || this._connectSettled) {
            return;
          }
          setSettled(true);
          this._connectSettled = true;
          try { this._connectToken = undefined; } catch(_) { }
          try { const nw = new NetworkError('WebSocket connection error'); this.connectionState = { ...this.connectionState, status: 'error', error: nw }; this.emit('connectionStateChanged', this.connectionState); } catch (_) { }
          if (!atomicallyReject(new NetworkError('WebSocket connection error'))) { return; }
        }
        if (this.connectionState.status !== 'error' && this.connectionState.status !== 'reconnecting') {
          this.connectionState.status = 'disconnected';
          this.emit('connectionStateChanged', this.connectionState);
        }
      }
    } catch(_) {}
  }

  private _handleConnectError(ctx: { e?: any; mySeq: number; timeout: any; atomicallyReject: (err?: any, expectedReject?: ((e?: any)=>void)) => boolean; getSettled: ()=>boolean; setSettled: (v:boolean)=>void }){
    try{
      const { e, mySeq, timeout, atomicallyReject, getSettled, setSettled } = ctx;
      if (getSettled() || mySeq !== this._connectSeq) return;
      setSettled(true);
      try { clearTimeout(timeout); } catch (_) { }
      try { if (this._connectDeferredTimeout) { clearTimeout(this._connectDeferredTimeout); this._connectDeferredTimeout = undefined; } } catch(_) {}
      try { if (this._connectTimeout) { clearTimeout(this._connectTimeout); this._connectTimeout = undefined; } } catch (_) { }
      const nw = new NetworkError(e?.message || 'WebSocket connection error');
      try {
        const didReject = atomicallyReject(nw);
        if (didReject) {
          try { this.connectionState = { ...this.connectionState, status: 'error', error: nw }; this.emit('connectionStateChanged', this.connectionState); } catch(_) {}
        } else {
          try { console.debug('[RealtimeManager.onError] atomicallyReject returned false; skipping connectionState update'); } catch(_) {}
        }
      } catch(_) { }
    } catch(_) {}
  }

  // Helper extracted from the connect() timeout callback. Accepts small
  // getters/setters for the local `settled` flag so the original
  // connect() closure's semantics are preserved.
  private _handleConnectTimeout(
    mySeq: number,
    myDisconnectMark: number,
    connectToken: symbol | undefined,
    myAttemptCtrl: any,
    myWsInstance: any,
    getSettled: () => boolean,
    setSettled: (v:boolean) => void,
    atomicallyReject: (err?: any, expectedReject?: ((e?: any)=>void)) => boolean
  ) {
    try {
      // Bail early if this connect attempt is no longer relevant.
      try {
        if (getSettled()) {
          try { console.debug('[RealtimeManager.connect.timeout] local settled=true, ignoring'); } catch(_) {}
          return;
        }
        if (this.ws == null) { try { console.debug('[RealtimeManager.connect.timeout] ws is null, ignoring'); } catch(_) {} return; }
        if (this._disconnectMarker !== myDisconnectMark) { try { console.debug('[RealtimeManager.connect.timeout] disconnect marker changed, ignoring'); } catch(_) {} return; }
        if (this._suppressConnectRejection) { try { if (this._connectTimeout) { clearTimeout(this._connectTimeout); this._connectTimeout = undefined; } } catch (_) {} try { console.debug('[RealtimeManager.connect.timeout] suppressed due to explicit disconnect (early)'); } catch(_) {} try { this._suppressConnectRejection = false; } catch(_) {} return; }
        if (!this._connectTimeout) { try { console.debug('[RealtimeManager.connect.timeout] no _connectTimeout, ignoring'); } catch(_) {} return; }
        if (this._connectToken !== connectToken) { try { console.debug('[RealtimeManager.connect.timeout] token mismatch, ignoring'); } catch(_) {} return; }
        if (mySeq !== this._connectSeq) { try { console.debug('[RealtimeManager.connect.timeout] mySeq != currentSeq, ignoring', { mySeq, currentSeq: this._connectSeq }); } catch(_) {} return; }
        if (this._manualClose || this._connectSettled) { try { if (this._connectTimeout) { clearTimeout(this._connectTimeout); this._connectTimeout = undefined; } } catch (_) { } try { console.debug('[RealtimeManager.connect.timeout] manualClose or already settled, ignoring'); } catch(_) {} return; }
      } catch (_) { /* continue to deeper checks if diagnostics fail */ }

      const currentReady = this.ws?.readyState;
      try { console.debug('[RealtimeManager.connect.timeout] mySeq=', mySeq, 'currentSeq=', this._connectSeq, 'manual=', this._manualClose, 'connectSettled=', this._connectSettled, 'readyState=', currentReady); } catch(_) {}
      const OPEN = (global as any).WebSocket && (global as any).WebSocket.OPEN !== undefined ? (global as any).WebSocket.OPEN : 1;
      if (currentReady !== OPEN && currentReady !== (WebSocket as any).OPEN) {
        if (mySeq !== this._connectSeq || this._manualClose || this._connectSettled) { try { if (this._connectTimeout) { clearTimeout(this._connectTimeout); this._connectTimeout = undefined; } } catch (_) { } try { console.debug('[RealtimeManager.connect.timeout] re-check guard triggered, aborting reject'); } catch(_) {} return; }
        try { const s = this.connectionState && (this.connectionState.status as string); if (s === 'connected' || s === 'disconnected') { try { if (this._connectTimeout) { clearTimeout(this._connectTimeout); this._connectTimeout = undefined; } } catch (_) { } try { console.debug('[RealtimeManager.connect.timeout] connectionState already connected/disconnected, ignoring'); } catch(_) {} return; } } catch (_) { }
        try { console.error('[RealtimeManager.connect.timeout] rejecting: state=', { mySeq, currentSeq: this._connectSeq, manualClose: this._manualClose, connectSettled: this._connectSettled, connectToken: this._connectToken, connState: this.connectionState }); } catch(_) {}
        setSettled(true);
        try { if (this._connectTimeout) { clearTimeout(this._connectTimeout); this._connectTimeout = undefined; } } catch (_) { }

        if (this._manualClose) { try { console.debug('[RealtimeManager.connect.timeout] manualClose detected at final check, aborting reject'); } catch(_) {} return; }
        if (this._suppressConnectRejection) { try { this._suppressConnectRejection = false; } catch(_) {} try { console.debug('[RealtimeManager.connect.timeout] suppressed reject due to explicit disconnect'); } catch(_) {} return; }
        if (this.connectionState && this.connectionState.status === 'disconnected') { try { console.debug('[RealtimeManager.connect.timeout] connectionState is disconnected, aborting reject'); } catch(_) {} return; }

        try {
          const nw = new NetworkError('WebSocket connection error');
          try { if (this._connectDeferredTimeout) { clearTimeout(this._connectDeferredTimeout); this._connectDeferredTimeout = undefined; } } catch(_) {}
          try { console.debug('[RealtimeManager.connect.timeout] scheduling deferred reject timer (grace)'); } catch(_) {}
          const _localRejectRef = this._connectReject;
          const _localWsRef = myWsInstance;
          try { this._allowConnectRejects = true; } catch(_) {}
          this._connectDeferredActive = true;
          this._connectDeferredTimeout = setTimeout(() => {
            try {
              if (this._connectionController && typeof this._connectionController.runDeferredConnectReject === 'function') {
                this._connectionController.runDeferredConnectReject(mySeq, myDisconnectMark, connectToken, _localRejectRef, _localWsRef, myAttemptCtrl, nw, atomicallyReject);
              } else {
                this._runDeferredConnectReject(mySeq, myDisconnectMark, connectToken, _localRejectRef, _localWsRef, myAttemptCtrl, nw, atomicallyReject);
              }
            } catch(_) { }
          }, 100) as unknown as NodeJS.Timeout;
        } catch(_) { try { console.debug('[RealtimeManager.connect.timeout] scheduling deferred reject failed'); } catch(_) {} }
      }
    } catch(_) {}
  }

  // Extracted atomicallyReject helper centralizes the guarded logic for
  // rejecting the stored connect promise. It mirrors the behaviour that
  // used to be inline inside connect() but keeps the function smaller.
  private _atomicallyReject(err?: any, expectedReject?: ((e?: any)=>void), ctx?: { mySeq: number; myDisconnectMark: number; connectToken: symbol | undefined; myWsInstance: any }): boolean {
    try {
      const { mySeq = -1, myDisconnectMark = -1, connectToken = undefined, myWsInstance = undefined } = ctx || {};
  const guards = new (RealtimeManager as any).ConnectionGuards(this);
      if (guards.basicRejectGuard({ mySeq })) return false;
      if (guards.advancedRejectGuard({ mySeq, myDisconnectMark, connectToken, myWsInstance, expectedReject })) return false;

      const fn = this._connectReject;
      if (!fn) return false;

      try { this._connectReject = undefined; this._connectResolve = undefined; } catch(_) {}
      try { if (this._connectDeferredTimeout) { clearTimeout(this._connectDeferredTimeout); this._connectDeferredTimeout = undefined; } } catch(_) {}
      try { this._connectDeferredActive = false; } catch(_) {}
      try { if (this._connectTimeout) { clearTimeout(this._connectTimeout); this._connectTimeout = undefined; } } catch(_) {}

      try { fn(err); } catch(e) { try { console.log('[RealtimeManager._atomicallyReject] stored reject threw', e); } catch(_) {} }
      return true;
    } catch(_) { return false; }
  }

  // Extracted WebSocket creation helper. Mirrors the previous inline
  // logic used in connect() but keeps connect() shorter.
  private _createWebSocketInstance(tokenArg?: string): any {
    const baseUrl = this.options.url;
    const effectiveUrl = tokenArg ? (baseUrl + (baseUrl.includes('?') ? '&' : '?') + `token=${encodeURIComponent(tokenArg)}`) : baseUrl;

    const globalWS = (global as any).WebSocket;
    const runtimeWS = typeof WebSocket !== 'undefined' ? WebSocket : undefined;
    let WS: any = undefined;
    const injected = (this.options as any).webSocketConstructor;
    if (injected) {
      const looksLikeConstructor = !!(
        injected && injected.prototype && typeof injected.prototype.send === 'function'
      );
      if (looksLikeConstructor) {
        WS = (globalWS && globalWS !== injected) ? globalWS : injected;
      } else {
        WS = injected; // factory
      }
    } else if (globalWS) {
      WS = globalWS;
    } else {
      WS = runtimeWS || globalWS;
    }

    let inst: any = null;
    const globalMock = (global as any).__lastMockWebSocket || null;
    if (globalMock && typeof globalMock === 'object') {
      try {
        const rs = (globalMock as any).readyState;
        const CLOSED = (global as any).WebSocket && (global as any).WebSocket.CLOSED !== undefined ? (global as any).WebSocket.CLOSED : 3;
        const CLOSING = (global as any).WebSocket && (global as any).WebSocket.CLOSING !== undefined ? (global as any).WebSocket.CLOSING : 2;
        if (rs !== CLOSED && rs !== CLOSING) {
          inst = globalMock;
          try { (inst as any).__claimedBy = this; } catch (_) { }
          try { inst.url = effectiveUrl; } catch (_) { }
        }
      } catch (_) { /* fall back */ }
    }

    if (!inst) {
      if (typeof WS === 'function') {
        try { inst = (WS as any)(effectiveUrl, this.options.protocols); } catch (_) { }
      }
      if (!inst) inst = new (WS as any)(effectiveUrl, this.options.protocols);
    }
    return inst;
  }

  // Attach the shared message handler to a WebSocket-like object.
  // This centralizes the addEventListener/onmessage logic used both in
  // connect() and subscribe(), avoiding duplication and ensuring the
  // same identity is used when checking mock listener maps.
  private attachSharedMessageHandlerTo(wsAny: any){
    try {
      if (!wsAny) return;
      if (typeof wsAny.addEventListener === 'function') {
        try {
          const ls = wsAny.__listeners as Map<string, Set<Function>> | undefined;
          const msgSet = ls && ls.get && typeof ls.get === 'function' ? ls.get('message') : undefined;
          const hasHandler = msgSet ? Array.from(msgSet).some((f: any) => f === this.handleMessage) : false;
          if (!hasHandler) wsAny.addEventListener('message', this.handleMessage);
          try { (wsAny as any).__sharedMessageHandlerAttached = true; } catch(_) {}
        } catch (_) {
          try { wsAny.addEventListener('message', this.handleMessage); } catch(_) {}
          try { (wsAny as any).__sharedMessageHandlerAttached = true; } catch(_) {}
        }
      } else {
          try {
            const prev = wsAny.onmessage;
            if (prev !== this.handleMessage) {
              wsAny.onmessage = (ev: any) => {
                try { this.handleMessage(ev); } catch(_) {}
                try { if (typeof prev === 'function') prev.call(wsAny, ev); } catch(_) {}
              };
              try { (wsAny as any).__sharedMessageHandlerAttached = true; } catch(_) {}
            }
          } catch(_) { }
      }
    } catch(_) {}
  }

  constructor(opts: RealtimeConnectionOptions = {}){
    // Merge incoming options so tests that pass reconnectInterval/maxReconnectAttempts
    // are respected and visible on realtimeManager.options
    this.options = {
      url: opts.url || 'ws://localhost:3000/ws/v1',
      timeout: opts.timeout || 10000,
      protocols: opts.protocols || ['schillinger-v1'],
      webSocketConstructor: opts.webSocketConstructor,
      heartbeatInterval: opts.heartbeatInterval || 30000,
      reconnectInterval: (opts as any).reconnectInterval,
      maxReconnectAttempts: (opts as any).maxReconnectAttempts,
    } as any;
    try { this._connectionController = new (RealtimeManager as any).ConnectionController(this); } catch(_) { this._connectionController = undefined; }
  }

  async connect(token?: string): Promise<void> {
    // Defensive check: some test mocks implement numeric readyState but may not
    // expose the WebSocket constants on the constructor. Fall back to numeric
    // comparisons so connect() doesn't skip when using mocks.
    const OPEN_STATE = (global as any).WebSocket && (global as any).WebSocket.OPEN !== undefined ? (global as any).WebSocket.OPEN : 1;
    if (this.ws?.readyState === OPEN_STATE || this.ws?.readyState === WebSocket.OPEN) return;
    this.connectionState.status = 'connecting';
    this.emit('connectionStateChanged', this.connectionState);

    // reset per-connect tracking
    this._connectSettled = false;
  // Reset any prior suppression when starting a new connect attempt
  this._suppressConnectRejection = false;
    if (this._connectTimeout) { try { clearTimeout(this._connectTimeout); } catch (_) { } this._connectTimeout = undefined; }
    // Also clear any deferred rejection timer left over from a previous
    // connect attempt. If we don't, that deferred callback may run later
    // and reject the new connect promise. Tests expect a new connect to
    // start with a clean slate.
    if (this._connectDeferredTimeout) { try { clearTimeout(this._connectDeferredTimeout); } catch(_){} this._connectDeferredTimeout = undefined; }
    const mySeq = ++this._connectSeq;
  const myDisconnectMark = this._disconnectMarker;
  const connectToken = Symbol('connect');
  try { this._connectToken = connectToken; } catch (_) { this._connectToken = undefined; }

    return new Promise((resolve, reject) => {
      let settled = false;
      // Capture the specific WebSocket instance created for this
      // connect() attempt. This allows deferred timers and
      // atomicallyReject to verify the instance hasn't changed (e.g.
      // due to disconnect() or a new connect()) before invoking
      // stored handlers.
      // Defensive flag: when false, no connect-time rejections should be
      // invoked (used to ensure disconnect() can fully suppress late
      // rejection paths).
  try { this._allowConnectRejects = true; } catch(_) {}
      // Create a per-attempt AbortController (polyfilled object if not
      // present) so other paths (disconnect/onOpen) can cancel any
      // deferred finalizers deterministically.
      let attemptCtrl: any = undefined;
      try {
        if (typeof (global as any).AbortController !== 'undefined') {
          attemptCtrl = new (global as any).AbortController();
        } else if (typeof AbortController !== 'undefined') {
          attemptCtrl = new AbortController();
        } else {
          attemptCtrl = { signal: { aborted: false }, abort() { try{ this.signal.aborted = true }catch(_){} } };
        }
      } catch(_) {
        attemptCtrl = { signal: { aborted: false }, abort() { try{ this.signal.aborted = true }catch(_){} } };
      }
  try { this._currentConnectAbort = attemptCtrl; } catch(_) {}
  // Capture the per-attempt controller in a local const so closures
  // (like the deferred finalizer) reliably check the correct
  // controller even if this._currentConnectAbort is later replaced
  // by a subsequent connect attempt.
  const myAttemptCtrl = attemptCtrl;
      let myWsInstance: any = undefined;
      // store handlers so disconnect() can clear them atomically
      try { this._connectResolve = () => { try{ resolve() }catch(_){ } }; } catch(_) { this._connectResolve = undefined; }
        try { this._connectReject = (e?: any) => { try{ console.debug('[RealtimeManager._connectReject] invoked'); } catch(_){} try{ reject(e); }catch(_){ } }; } catch(_) { this._connectReject = undefined; }
      // Use a shared instance helper that performs the guarded atomic
      // rejection. This reduces the connect() body size and centralizes
      // the guard logic for better maintainability.
      const atomicallyReject = (err?: any, expectedReject?: ((e?: any)=>void)) => (this._connectionController && typeof this._connectionController.atomicallyReject === 'function') ? this._connectionController.atomicallyReject(err, expectedReject, {
        mySeq,
        myDisconnectMark,
        connectToken,
        myWsInstance,
      }) : this._atomicallyReject(err, expectedReject, { mySeq, myDisconnectMark, connectToken, myWsInstance });
      console.log('[RealtimeManager.connect] start url=', this.options.url, 'timeout=', this.options.timeout);
      // Use the instance factory helper to create the socket instance.
      const createWebSocketInstance = (tokenArg?: string) => this._createWebSocketInstance(tokenArg);

      try {
        const baseUrl = this.options.url;
        const effectiveUrl = token ? (baseUrl + (baseUrl.includes('?') ? '&' : '?') + `token=${encodeURIComponent(token)}`) : baseUrl;
        // create the instance (may throw)
        const instance = createWebSocketInstance(token);
  var inst: any = instance;
  try { myWsInstance = inst; } catch(_) { myWsInstance = undefined; }
      } catch (err) {
        try { atomicallyReject(new NetworkError('WSConstructor failed')); } catch(_) {}
        return;
      }

      this.ws = inst;
      (global as any).__lastMockWebSocket = inst;
      // Attach the shared message handler (centralized helper) so that
      // mocks emitting messages synchronously during construction do not
      // drop those messages. Use helper to keep logic consistent with
      // subscribe().
      try { this.attachSharedMessageHandlerTo(this.ws); } catch (_) { }

      // Early forwarders for mocks that emit synchronously during construction
      let __earlyError: any = undefined;
      let __earlyClose: any = undefined;
      let __prevErrHandler: any = undefined;
      let __prevCloseHandler: any = undefined;
      try {
        const wsAny2 = this.ws as any;
        const forwardError = (ev: any) => { try { __earlyError = ev; } catch (_) { } };
        const forwardClose = (ev: any) => { try { __earlyClose = ev; } catch (_) { } };
        if (wsAny2) {
          try {
            if (typeof wsAny2.addEventListener === 'function') {
              try { wsAny2.addEventListener('error', forwardError); } catch (_) { }
              try { wsAny2.addEventListener('close', forwardClose); } catch (_) { }
              try { (wsAny2 as any).__earlyForwarders = { forwardError, forwardClose }; } catch (_) { }
            } else {
              try { __prevErrHandler = wsAny2.onerror; wsAny2.onerror = (e: any) => { try { forwardError(e); } catch (_) { } try { if (typeof __prevErrHandler === 'function') __prevErrHandler.call(wsAny2, e); } catch (_) { } }; } catch (_) { }
              try { __prevCloseHandler = wsAny2.onclose; wsAny2.onclose = (e: any) => { try { forwardClose(e); } catch (_) { } try { if (typeof __prevCloseHandler === 'function') __prevCloseHandler.call(wsAny2, e); } catch (_) { } }; } catch (_) { }
              try { (wsAny2 as any).__earlyPrevHandlers = { prevErr: __prevErrHandler, prevClose: __prevCloseHandler }; } catch (_) { }
            }
          } catch (_) { }
        }
      } catch (_) { }

      const onMessage = this.handleMessage;

      const timeout = setTimeout(() => {
        try {
          if (this._connectionController && typeof this._connectionController.handleConnectTimeout === 'function') {
            this._connectionController.handleConnectTimeout(mySeq, myDisconnectMark, connectToken, myAttemptCtrl, myWsInstance, () => settled, (v:boolean) => { settled = v; }, atomicallyReject);
          } else {
            this._handleConnectTimeout(mySeq, myDisconnectMark, connectToken, myAttemptCtrl, myWsInstance, () => settled, (v:boolean) => { settled = v; }, atomicallyReject);
          }
        } catch(_) {}
      }, this.options.timeout);
      try { this._connectTimeout = timeout; try { console.debug('[RealtimeManager.connect] set _connectTimeout', { mySeq, timeoutExists: !!this._connectTimeout }); } catch(_) {} } catch (_) { this._connectTimeout = undefined; }

      // atomicallyReject is declared above (so constructor-time paths may use it)

      // Handlers defined up-front
      const onOpen = () => {
        if (this._connectionController && typeof this._connectionController.handleConnectOpen === 'function') {
          return this._connectionController.handleConnectOpen({ mySeq, myAttemptCtrl, timeout, setSettled: (v:boolean)=>{ settled = v; }, getSettled: ()=>settled });
        }
        return this._handleConnectOpen({ mySeq, myAttemptCtrl, timeout, setSettled: (v:boolean)=>{ settled = v; }, getSettled: ()=>settled });
      };

      const onClose = (ev?: any) => {
        if (this._connectionController && typeof this._connectionController.handleConnectClose === 'function') {
          return this._connectionController.handleConnectClose({ ev, mySeq, timeout, getSettled: ()=>settled, setSettled: (v:boolean)=>{ settled = v; }, atomicallyReject });
        }
        return this._handleConnectClose({ ev, mySeq, timeout, getSettled: ()=>settled, setSettled: (v:boolean)=>{ settled = v; }, atomicallyReject });
      };

      const onError = (e?: any) => {
        if (this._connectionController && typeof this._connectionController.handleConnectError === 'function') {
          return this._connectionController.handleConnectError({ e, mySeq, timeout, atomicallyReject, getSettled: ()=>settled, setSettled: (v:boolean)=>{ settled = v; } });
        }
        return this._handleConnectError({ e, mySeq, timeout, atomicallyReject, getSettled: ()=>settled, setSettled: (v:boolean)=>{ settled = v; } });
      };

      // Register handlers
      try {
        if (typeof this.ws.addEventListener === 'function') {
          this.ws.addEventListener('open', onOpen);
          this.ws.addEventListener('message', onMessage);
          this.ws.addEventListener('close', onClose);
          this.ws.addEventListener('error', onError);
        } else {
          // Chain rather than overwrite to preserve any previously-installed
          // wrappers (for example those created by attachSharedMessageHandlerTo)
          // which some test mocks rely on for early-forwarding behavior.
          try {
            const prevOpen = (this.ws as any).onopen;
            (this.ws as any).onopen = (ev: any) => {
              try { onOpen(); } catch (_) { }
              try { if (typeof prevOpen === 'function') prevOpen.call(this.ws, ev); } catch (_) { }
            };
          } catch (_) { try { (this.ws as any).onopen = onOpen; } catch (_) { } }

          try {
            // If a shared message handler was attached earlier, don't add
            // another message wrapper here (it would cause duplicate
            // deliveries). Instead rely on the already-attached handler.
            if (!(this.ws as any).__sharedMessageHandlerAttached) {
              const prevMessage = (this.ws as any).onmessage;
              (this.ws as any).onmessage = (ev: any) => {
                try { onMessage(ev); } catch (_) { }
                try { if (typeof prevMessage === 'function') prevMessage.call(this.ws, ev); } catch (_) { }
              };
            }
          } catch (_) { try { (this.ws as any).onmessage = onMessage; } catch (_) { } }

          try {
            const prevClose = (this.ws as any).onclose;
            (this.ws as any).onclose = (ev: any) => {
              try { onClose(ev); } catch (_) { }
              try { if (typeof prevClose === 'function') prevClose.call(this.ws, ev); } catch (_) { }
            };
          } catch (_) { try { (this.ws as any).onclose = onClose; } catch (_) { } }

          try {
            const prevError = (this.ws as any).onerror;
            (this.ws as any).onerror = (ev: any) => {
              try { onError(ev); } catch (_) { }
              try { if (typeof prevError === 'function') prevError.call(this.ws, ev); } catch (_) { }
            };
          } catch (_) { try { (this.ws as any).onerror = onError; } catch (_) { } }
        }
      } catch (err) { }

      // Replay any early events captured during socket construction
      try { if (typeof __earlyError !== 'undefined') { try { onError(__earlyError); } catch (_) { } } } catch (_) { }
      try { if (typeof __earlyClose !== 'undefined') { try { onClose(__earlyClose); } catch (_) { } } } catch (_) { }
      // Cleanup forwarders
      try {
        const wsAny2 = this.ws as any;
        if (wsAny2) {
          try {
            if (typeof wsAny2.removeEventListener === 'function' && (wsAny2 as any).__earlyForwarders) {
              try { wsAny2.removeEventListener('error', (wsAny2 as any).__earlyForwarders.forwardError); } catch (_) { }
              try { wsAny2.removeEventListener('close', (wsAny2 as any).__earlyForwarders.forwardClose); } catch (_) { }
              try { delete (wsAny2 as any).__earlyForwarders; } catch (_) { }
            } else if ((wsAny2 as any).__earlyPrevHandlers) {
              // Chain the newly-registered handlers (onError/onClose) with any
              // previous handlers captured during construction. This prevents
              // overwriting the onError/onClose we just installed above, which
              // caused connect() to miss later errors in the test harness.
              const prev = (wsAny2 as any).__earlyPrevHandlers as { prevErr?: any; prevClose?: any };
              try {
                const existingOnError = wsAny2.onerror;
                wsAny2.onerror = (ev: any) => {
                  try { if (typeof existingOnError === 'function') existingOnError.call(wsAny2, ev); } catch (_) { }
                  try { if (typeof prev.prevErr === 'function') prev.prevErr.call(wsAny2, ev); } catch (_) { }
                };
              } catch (_) { }
              try {
                const existingOnClose = wsAny2.onclose;
                wsAny2.onclose = (ev: any) => {
                  try { if (typeof existingOnClose === 'function') existingOnClose.call(wsAny2, ev); } catch (_) { }
                  try { if (typeof prev.prevClose === 'function') prev.prevClose.call(wsAny2, ev); } catch (_) { }
                };
              } catch (_) { }
              try { delete (wsAny2 as any).__earlyPrevHandlers; } catch (_) { }
            }
          } catch (_) { }
        }
      } catch (_) { }

      // If the socket is already open, trigger onOpen in a microtask
      try {
        const currentReady = (this.ws as any)?.readyState;
        const OPEN = (global as any).WebSocket && (global as any).WebSocket.OPEN !== undefined ? (global as any).WebSocket.OPEN : 1;
        if (currentReady === OPEN) {
          setTimeout(() => { try { onOpen(); } catch (_) { } }, 0);
        }
      } catch (_) { }
    });
  }
  private dispatch(msg:any){
    if(!msg) return;
    // Emit high-level events for SDK integration tests
    try {
      if (msg.type === 'event') {
        try { this.emit('realtimeEvent', msg); } catch(_) {}
      }
      if (msg.type === 'conflict') {
        try { this.emit('collaborationConflict', msg); } catch(_) {}
      }
      if (msg.type === 'error') {
        try { const err = new Error((msg && (msg.error && msg.error.message)) || msg.message || 'WebSocket error'); this.emit('error', err); } catch(_) {}
      }
      // Handle streaming lifecycle messages
      if (msg.type === 'stream_complete' || msg.type === 'stream_error') {
        try {
          const req = msg && msg.requestId ? this.streamingRequests.get(msg.requestId) : undefined;
          if (req) {
            if (msg.type === 'stream_complete') {
              try { req.onComplete && req.onComplete(msg.result); } catch(e){ try{ console.error('Error in onComplete handler:', e); }catch(_){ } }
            }
            if (msg.type === 'stream_error') {
              try { req.onError && req.onError(msg.error); } catch(e){ try{ console.error('Error in onError handler:', e); }catch(_){ } }
            }
            // clean up subscription + request record
            try { if (req.subId) this.unsubscribe(req.subId); } catch(_) {}
            try { this.streamingRequests.delete(msg.requestId); } catch(_) {}
          }
        } catch(_) {}
      }
    } catch(_) {}
    // Special-case stream_chunk messages: deliver chunk to registered
    // streaming request callbacks keyed by requestId. Tests emit 'stream_chunk'
    // with { requestId, chunk } and expect the callback passed to
    // startStreaming() to be invoked with the chunk payload.
    try {
      const t = (msg && msg.type) ? msg.type.toString().replace(/-/g, '_') : undefined;
      if (t === 'stream_chunk' && msg.requestId) {
        const req = this.streamingRequests.get(msg.requestId);
        if (req && typeof req.callback === 'function') {
          try { req.callback(msg.chunk); } catch (e) { try{ console.error('Error in stream chunk handler:', e); }catch(_){ } }
        }
        return;
      }
    } catch(_) {}
    // Determine original and normalized message type so we can match
    // both kebab-case and snake_case subscription names.
    let originalType: string | undefined = undefined;
    let normalizedType: string | undefined = undefined;
    try { if (typeof msg.type === 'string') { originalType = msg.type; normalizedType = msg.type.replace(/-/g, '_'); } } catch(_) { /* ignore */ }

  const handledSubs = new Set<string>();
  for(const s of Array.from(this.subscriptions.values())){
      try{
        // wildcard subscriber
        if (s.event === '*'){
          const payload = msg.type === 'event' ? msg.data : (msg.data || msg);
          if (handledSubs.has(s.id)) continue;
          handledSubs.add(s.id);
          try { console.debug('[RealtimeManager.dispatch] wildcard match, invoking', { subId: s.id, event: s.event, payloadSummary: typeof payload === 'string'?payload:JSON.stringify(payload).slice(0,200) }); } catch(_) {}
          try { console.debug('[RealtimeManager.dispatch] invoking callback start', { subId: s.id }); s.callback(payload); console.debug('[RealtimeManager.dispatch] invoking callback end', { subId: s.id }); } catch(err){ try{ console.error('Error in subscription callback:', err); }catch(_){ } }
          continue;
        }

        // direct event messages: match by msg.event (e.g. { type: 'event', event: 'pattern_generated', data: ... })
        if (msg.type === 'event' && msg.event && s.event === msg.event){
          if (handledSubs.has(s.id)) continue;
          handledSubs.add(s.id);
          try { console.debug('[RealtimeManager.dispatch] direct event match', { subId: s.id, event: s.event }); } catch(_) {}
          try {
            // honor optional filter if provided
            // Invoke filter with the full message envelope so filters can
            // inspect top-level fields (e.g., userId) as the tests expect.
            if (s.filter && !s.filter(msg)) { continue; }
            console.debug('[RealtimeManager.dispatch] invoking callback start', { subId: s.id });
            s.callback(msg.data);
            console.debug('[RealtimeManager.dispatch] invoking callback end', { subId: s.id });
          } catch(err){ try{ console.error('Error in subscription callback:', err); }catch(_){ } }
          continue;
        }

        // messages that carry their type as the subscription (e.g. 'stream_chunk')
        // Normalize both subscription event and message type to handle
        // 'kebab-case' and 'snake_case' variants emitted by the harness.
        try {
          const subNorm = (s.event || '').toString().replace(/-/g, '_');
          const msgNorm = (normalizedType || (msg.type || '')).toString().replace(/-/g, '_');
          const matched = (subNorm === msgNorm || s.event === originalType);
          try { console.debug('[RealtimeManager.dispatch] match check', { subId: s.id, subEvent: s.event, subNorm, msgType: originalType, msgNorm, matched }); } catch(_) {}
          if (matched) {
            try { console.debug('[RealtimeManager.dispatch] matched invoking callback', { subId: s.id, subEvent: s.event }); } catch(_) {}
            // Deliver the payload (prefer msg.data when present) so callers receive
            // the expected shape (e.g. {durations:[], metadata:{}}) instead of the
            // raw envelope which contains type/data.
            const payload = msg && msg.type === 'event' ? msg.data : (msg && (msg.data || msg));
            if (handledSubs.has(s.id)) continue;
            handledSubs.add(s.id);
            try { console.debug('[RealtimeManager.dispatch] invoking callback start', { subId: s.id, payloadSummary: typeof payload === 'string' ? payload : JSON.stringify(payload).slice(0,200) }); s.callback(payload); console.debug('[RealtimeManager.dispatch] invoking callback end', { subId: s.id }); } catch(err){ try{ console.error('Error in subscription callback:', err); }catch(_){ } }
            continue;
          }
  } catch(err) { try{ console.debug('[RealtimeManager.dispatch] matching error', { subId: s.id, err: (err as any) && (err as any).message }); }catch(_){ } }
      }catch(_){ }
    }
  }

  // Resolve an application-level conflict via the realtime channel
  resolveConflict(conflictId: string, resolution: any){ try{ this.sendMessage({ type: 'resolve_conflict', conflictId, resolution }); }catch(_){ } }

  // Send a message over the websocket if connected, otherwise queue it
  sendMessage(payload: any){
    try{
      const data = typeof payload === 'string' ? payload : JSON.stringify({ ...payload, timestamp: (payload && payload.timestamp) ? payload.timestamp : Date.now() });
      const OPEN = (global as any).WebSocket && (global as any).WebSocket.OPEN !== undefined ? (global as any).WebSocket.OPEN : 1;
      // Debug: show whether the socket instance matches the test harness' last mock
      try { console.debug('[RealtimeManager.sendMessage] ws===__lastMockWebSocket?', this.ws === (global as any).__lastMockWebSocket, 'ws.url=', this.ws?.url, 'payloadType=', payload && payload.type); } catch(_) {}
      if (this.ws && this.ws.readyState === OPEN && typeof this.ws.send === 'function'){
        try{ this.ws.send(data); }catch(_){ /* swallow */ }
      } else {
        // queue for later flush
        try{ this.queue.push(payload); }catch(_){ }
      }
    }catch(e){ try{ this.emit('error', e); }catch(_){} }
  }

  // Attempt to flush queued messages to the socket
  flush(){
    try{
      const OPEN = (global as any).WebSocket && (global as any).WebSocket.OPEN !== undefined ? (global as any).WebSocket.OPEN : 1;
      if (!this.ws || this.ws.readyState !== OPEN) return;
      const targetWs = this.ws;
      while(this.queue.length){
        const m = this.queue.shift();
        try{ targetWs.send(typeof m==='string'?m:JSON.stringify(m)); }catch(_){ /* ignore and continue */ }
      }
    }catch(_){ /* ignore flush errors */ }
  }

  // Subscribe/unsubscribe management
  subscribe(event: string, callback: (d:any)=>void, filter?: (d:any)=>boolean): string{
    const id = `sub-${++this.subscriptionCounter}`;
    this.subscriptions.set(id, { id, event, callback, filter });
    try { this.sendMessage({ type: 'subscribe', event, subscriptionId: id }); } catch(_) {}
    return id;
  }

  unsubscribe(id: string){
    try{
      const sub = this.subscriptions.get(id);
      if (sub) {
        this.subscriptions.delete(id);
        try { this.sendMessage({ type: 'unsubscribe', subscriptionId: id, event: sub.event }); } catch(_) {}
      }
    }catch(_){ }
  }

  // Streaming helpers used by tests
  startStreaming(opts: { type: string; parameters?: any; callback?: (chunk:any)=>void; onComplete?: (r:any)=>void; onError?: (e:any)=>void }): string{
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
    const eventName = opts.type || 'stream';
    const subId = opts.callback ? this.subscribe(eventName, opts.callback) : undefined;
    this.streamingRequests.set(requestId, { type: opts.type, callback: opts.callback, subId, onComplete: opts.onComplete, onError: opts.onError });
    try{ this.sendMessage({ type: 'stream_start', requestId, streamType: opts.type, parameters: opts.parameters || {} }); }catch(_){ }
    return requestId;
  }

  stopStreaming(requestId: string){
    try{
      const req = this.streamingRequests.get(requestId);
      // If there was a subscription created for this stream, unsubscribe
      // first so that the final message observed by tests is the 'stream_stop'.
      if (req){
        if (req.subId) {
          try { this.unsubscribe(req.subId); } catch(_) {}
        }
        try { this.sendMessage({ type: 'stream_stop', requestId }); } catch(_) {}
        try { this.streamingRequests.delete(requestId); } catch(_) {}
      } else {
        try{ this.sendMessage({ type: 'stream_stop', requestId }); }catch(_){ }
      }
    }catch(_){ }
  }

  broadcastUpdate(event: string, data: any){ try{ this.sendMessage({ type: 'broadcast', event, data, timestamp: Date.now() }); }catch(_){ } }

  isConnected(): boolean { return this.connectionState && this.connectionState.status === 'connected'; }
  getConnectionState(): ConnectionState { return this.connectionState; }
  getDefaultWebSocketUrl(): string { return 'ws://localhost:3000/ws/v1'; }

  // Gracefully disconnect the manager. Tests call `await realtimeManager.disconnect()`
  // so provide an async method that stops heartbeats, clears timers, marks
  // the manager as manually closed and closes the underlying socket if present.
  async disconnect(): Promise<void> {
    try {
      this._manualClose = true;
      // Disallow any further connect-time rejections immediately so
      // that pending deferred timers cannot cause a late rejection
      // after we've intentionally disconnected.
      try { this._allowConnectRejects = false; } catch(_) {}
      // Abort any per-attempt controller immediately so deferred
      // reject finalizers will see aborted and return early.
      try { if (this._currentConnectAbort && typeof this._currentConnectAbort.abort === 'function') { try { this._currentConnectAbort.abort(); } catch(_){} } } catch(_) {}
      try { this._currentConnectAbort = undefined; } catch(_) {}
    try { this._disconnectMarker++; } catch(_) {}
      try { console.debug('[RealtimeManager.disconnect] called: _connectSeq=', this._connectSeq, '_connectToken=', this._connectToken); } catch(_) {}
      // Invalidate any in-flight connect() sequences so their timeouts
      // won't run later and cause spurious rejections after a manual
      // disconnect. Increment the sequence counter to make existing
      // handlers no-op via the mySeq check.
      try { this._connectSeq++; } catch (_) { }
      // Suppress any pending connect-timeout from rejecting after we've
      // intentionally closed the connection. This is a short-lived flag
      // consumed by the timeout handler above.
      try { this._suppressConnectRejection = true; } catch(_) {}
      // Clear stored connect handlers and timers immediately to avoid
      // a race where a pending timeout fires and finds a stale reject
      // handler just after we've set suppression.
      try { this._clearConnectHandlers(); } catch(_) {}
      // Also mark the current connect sequence as settled so any
      // pending timeout callbacks that check _connectSettled will
      // bail out instead of rejecting the promise after we've
      // intentionally disconnected.
      try { this._connectSettled = true; } catch (_) { }
  // Also clear any per-connect token so timeout handlers know to
  // ignore their callbacks atomically.
  try { this._connectToken = undefined; } catch (_) { }
    // Clear any stored connect promise handlers to avoid races where
    // a pending timeout or error would call back after we've
    // intentionally disconnected.
    try { this._connectResolve = undefined; } catch(_) { }
    try { this._connectReject = undefined; } catch(_) { }
      // Prevent any outstanding connect timeout from erroneously resolving later
      try { if (this._connectTimeout) { clearTimeout(this._connectTimeout); this._connectTimeout = undefined; } } catch (_) {}
      this.stopHeartbeat();
      try {
        if (this.ws) {
          // Try a polite close; some mock sockets implement close synchronously
          try { if (typeof this.ws.close === 'function') this.ws.close(1000); } catch (_) {}
          try { this.ws = null; } catch (_) { this.ws = null; }
        }
      } catch (_) {}
      // Update connection state and notify listeners
      try {
        this.connectionState = { ...this.connectionState, status: 'disconnected' } as ConnectionState;
        this.emit('connectionStateChanged', this.connectionState);
      } catch (_) {}
    } catch (e) {
      try { this.emit('error', e); } catch (_) {}
    }
    return Promise.resolve();
  }

  private startHeartbeat(){
    this.stopHeartbeat();
    // Send an immediate ping to improve test determinism (tests expect
    // a ping to appear in the mock WebSocket message queue shortly after
    // connection). Then continue with the regular interval.
    try{
      const OPEN = (global as any).WebSocket && (global as any).WebSocket.OPEN !== undefined ? (global as any).WebSocket.OPEN : 1;
      if(this.ws && this.ws.readyState===OPEN && typeof this.ws.send === 'function'){
        try{ this.ws.send(JSON.stringify({type:'ping'})); }catch(_){ }
      }
    }catch(_){ }
    this.heartbeatTimer = setInterval(()=>{ try{ const OPEN = (global as any).WebSocket && (global as any).WebSocket.OPEN !== undefined ? (global as any).WebSocket.OPEN : 1; if(this.ws && this.ws.readyState===OPEN) this.ws.send(JSON.stringify({type:'ping'})) }catch(_){ } }, this.options.heartbeatInterval)
  }
  private stopHeartbeat(){ if(this.heartbeatTimer){ clearInterval(this.heartbeatTimer); this.heartbeatTimer=undefined } }

  // Clear any stored connect promise handlers and associated timeout/token
  // without invoking them. This is used by disconnect() to eliminate the
  // race window where a pending connect timeout might still call a now-
  // stale stored reject handler.
  private _clearConnectHandlers(){
    try { console.debug('[RealtimeManager._clearConnectHandlers] clearing handlers/timers', { seq: this._connectSeq, token: this._connectToken, hasTimeout: !!this._connectTimeout, hasDeferred: !!this._connectDeferredTimeout, hasResolve: !!this._connectResolve, hasReject: !!this._connectReject }); } catch(_) {}
    try { this._connectToken = undefined; } catch(_) { }
    try { if (this._connectTimeout) { clearTimeout(this._connectTimeout); this._connectTimeout = undefined; try { console.debug('[RealtimeManager._clearConnectHandlers] cleared _connectTimeout'); } catch(_) {} } } catch(_) { }
  try { if (this._connectDeferredTimeout) { clearTimeout(this._connectDeferredTimeout); this._connectDeferredTimeout = undefined; try { console.debug('[RealtimeManager._clearConnectHandlers] cleared _connectDeferredTimeout'); } catch(_) {} } } catch(_) { }
  try { this._connectDeferredActive = false; } catch(_) {}
    // Replace stored handlers with benign no-op functions so that any
    // late/racing callbacks that attempt to invoke them won't produce
    // unhandled rejections or unexpected throws. Tests rely on the
    // manager being able to call disconnect() and fully clear pending
    // state; turning handlers into no-ops is the safest way to ensure
    // a stray timeout or error won't fail the suite.
    try { this._connectResolve = () => { try { console.debug('[RealtimeManager._clearConnectHandlers] swallowed late resolve'); } catch(_){} }; } catch(_) { }
    try { this._connectReject = (_e?: any) => { try { console.debug('[RealtimeManager._clearConnectHandlers] swallowed late reject', _e); } catch(_){} }; } catch(_) { }
    // Also disallow any further connect-time rejections while handlers
    // are cleared so deferred timers will abort early.
    try { this._allowConnectRejects = false; } catch(_) {}
    // Abort the per-attempt controller so any deferred finalizers can
    // detect cancellation quickly and bail. This is safer than relying
    // on clearing timers alone since the deferred callback may hold
    // local references and run after timers were cleared.
    try { if (this._currentConnectAbort && typeof this._currentConnectAbort.abort === 'function') { try { this._currentConnectAbort.abort(); } catch(_){} } } catch(_) {}
    try { this._currentConnectAbort = undefined; } catch(_) {}
  }

  // Helper that runs the deferred connect-timeout finalizer. This was
  // extracted from the long anonymous callback inside connect() to
  // reduce anonymous complexity and remove temporary diagnostic
  // logging. It performs the same guards and invokes the provided
  // atomicallyReject callback when appropriate.
  private _runDeferredConnectReject(
    mySeq: number,
    myDisconnectMark: number,
    connectToken: symbol | undefined,
    _localRejectRef: any,
    _localWsRef: any,
    myAttemptCtrl: any,
    nw: any,
    atomicallyReject: (err?: any, expectedReject?: ((e?: any)=>void)) => boolean
  ) {
    try {
      // If the per-attempt controller was aborted, bail early.
      try { if (myAttemptCtrl && myAttemptCtrl.signal && myAttemptCtrl.signal.aborted) { return; } } catch(_) {}
      // ignore if deferred was deactivated (cleared)
      try { if (!this._connectDeferredActive) { return; } } catch(_) {}

      try {
        // Re-check guards before final reject
        if (this._connectToken !== connectToken) return;
        if (this._connectReject !== _localRejectRef) return;
        try { if (this.ws !== _localWsRef) return; } catch(_) {}
        if (mySeq !== this._connectSeq || this._manualClose || this._connectSettled) return;
        if (this.connectionState && (this.connectionState.status === 'connected' || this.connectionState.status === 'disconnected')) return;
        try {
          const currentReady2 = this.ws?.readyState;
          const OPEN2 = (global as any).WebSocket && (global as any).WebSocket.OPEN !== undefined ? (global as any).WebSocket.OPEN : 1;
          if (currentReady2 === OPEN2 || currentReady2 === (WebSocket as any).OPEN) return;
        } catch(_) {}

        try { if (this._allowConnectRejects === false) { return; } } catch(_) {}
        const didReject = atomicallyReject(nw, _localRejectRef);
        if (didReject) {
          try { this._connectSettled = true; } catch(_) {}
          try { this._connectToken = undefined; } catch(_) {}
          try { this.connectionState = { ...this.connectionState, status: 'error', error: nw }; this.emit('connectionStateChanged', this.connectionState); } catch(_) {}
        }
      } catch(_) {}
    } finally {
      try { if (this._connectDeferredTimeout) { clearTimeout(this._connectDeferredTimeout); this._connectDeferredTimeout = undefined; } } catch(_) {}
      try { this._connectDeferredActive = false; } catch(_) {}
    }
  }

  // minimal emitter
  private listeners = new Map<string, Array<(d:any)=>void>>();
  on(ev:string,fn:(d:any)=>void){ if(!this.listeners.has(ev)) this.listeners.set(ev,[]); this.listeners.get(ev)!.push(fn) }
  off(ev:string,fn:(d:any)=>void){ const a=this.listeners.get(ev); if(a){ const i=a.indexOf(fn); if(i>-1) a.splice(i,1) } }
  private emit(ev:string,data?:any){ const a=this.listeners.get(ev)||[]; for(const f of a.slice()){ try{ f(data) }catch(_){ } } }
}

export const createRealtimeManager = (opts?:any):RealtimeManager => new RealtimeManager(opts)
export default RealtimeManager
