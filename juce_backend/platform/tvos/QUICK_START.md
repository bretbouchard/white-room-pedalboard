# tvOS SDK Integration - Quick Start

**Status:** READY TO IMPLEMENT
**Total Estimated Time:** 4-6 hours
**Documentation:** [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)

---

## 🚀 Quick Start Guide

### Step 1: Add EventEmitter Shim (5-10 min)

**File:** `platform/tvos/SchillingerBridge.swift`

Add this method to `SchillingerBridge`:

```swift
private func setupNodeJSShims() {
    let eventEmitterShim = """
    class EventEmitter {
        constructor() { this._events = {}; }
        on(event, listener) {
            if (!this._events[event]) this._events[event] = [];
            this._events[event].push(listener);
            return this;
        }
        emit(event, ...args) {
            if (!this._events[event]) return false;
            this._events[event].forEach(l => l(...args));
            return true;
        }
    }
    """

    jsContext.evaluateScript(eventEmitterShim)
    print("✅ Node.js shims loaded")
}
```

Call it in `setupJSContext()` **before** loading the bundle:

```swift
private func setupJSContext() {
    jsContext = JSContext()!
    setupNodeJSShims()  // ← ADD THIS
    loadSDKBundle()
}
```

**Test:** Run app, check console for "✅ Node.js shims loaded"

---

### Step 2: Test Bundle Loading (15-20 min)

**File:** `SchillingerBridge.swift`

Add verification method:

```swift
func verifyBundleLoaded() -> Bool {
    let sdkExists = jsContext.evaluateScript(
        "typeof SchillingerSDK !== 'undefined'"
    ).toBool()

    print("SchillingerSDK loaded: \(sdkExists)")
    return sdkExists
}
```

Call after loading bundle:

```swift
private func loadSDKBundle() {
    // ... load bundle code ...

    let loaded = verifyBundleLoaded()
    if !loaded {
        print("❌ ERROR: Bundle failed to load")
    }
}
```

**Test:** Should print "SchillingerSDK loaded: true"

---

### Step 3: Test SDK API (30-40 min)

**File:** `SchillingerBridge.swift`

Add this test method:

```swift
func testBasicAPI() {
    let result = jsContext.evaluateScript("""
        const gen = new SchillingerSDK.RhythmGenerator();
        gen.isValid();
    """)

    print("API test result: \(result.toString())")
}
```

Call from your view controller:

```swift
bridge.testBasicAPI()
```

**Test:** Should not throw any errors

---

### Step 4: Test Plan Generation (1-2 hours)

**File:** Create new test file `SchillingerWorkflowTests.swift`

Run the complete workflow test from [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)

**Key test:**
```swift
func testCompletePlanGenerationWorkflow() {
    // Initialize → Apply IR → Generate Plan → Verify
    // See full implementation in plan document
}
```

**Test:** All assertions pass

---

### Step 5: Create Golden Fixtures (2-4 hours)

**Location:** `tests/schillinger/fixtures/`

Run the fixture generator script from [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md):

```bash
cd /Users/bretbouchard/apps/schill/juce_backend
python3 scripts/generate_golden_fixtures.py
```

**Test:** Fixtures created in `tests/schillinger/fixtures/`

---

## 📋 Verification Checklist

After each step, verify:

- [ ] No JavaScriptCore exceptions
- [ ] Console shows success messages
- [ ] Bundle file size is ~1.2 MB
- [ ] Memory usage is reasonable
- [ ] Tests pass consistently

---

## 🐛 Common Issues

### Issue: "EventEmitter is not defined"

**Solution:** Ensure `setupNodeJSShims()` is called **before** loading the bundle

### Issue: Bundle file not found

**Solution:** Add `SchillingerSDK.bundle.js` to Xcode target as a resource

### Issue: "Cannot read property 'X' of undefined"

**Solution:** SDK hasn't loaded correctly, check JavaScriptCore exceptions

---

## 📚 Full Documentation

See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for:
- Complete implementation details
- All code examples
- Comprehensive test suites
- Fixtures generator
- Deployment checklist

---

## ✅ When Complete

- [ ] EventEmitter shim working
- [ ] Bundle loads successfully
- [ ] SDK API accessible from Swift
- [ ] Plan generation works
- [ ] Golden fixtures created
- [ ] All tests passing

**Ready for:** tvOS hardware testing

---

**Created:** December 31, 2025
**Status:** READY FOR IMPLEMENTATION
