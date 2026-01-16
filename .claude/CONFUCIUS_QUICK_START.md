# Confucius Quick Start Guide

## What is Confucius?

Confucius is an AI assistant that **remembers everything** your team learns from closed issues and **helps you reuse that knowledge** instantly.

---

## 🚀 Quick Start

### The Golden Rule:

**Before you start ANY task, ask Claude:**
```
"Check Confucius for patterns about [your task topic]"
```

That's it! Confucius will tell you what your team already knows.

---

## When to Use Confucius

### ✅ DO Use Confucius For:

| Situation | What to Say |
|-----------|-------------|
| Starting new work | "Check Confucius for [topic] patterns" |
| Seeing an error | "What does Confucius know about [error]?" |
| Making decisions | "What has Confucius learned about [topic]?" |
| Feeling stuck | "Search Confucius for similar problems" |
| Learning something | "Store this in Confucius: [your insight]" |

### ❌ DON'T Use Confucius For:

- Simple syntax questions (use docs)
- One-time calculations
- Real-time system status
- Non-project questions

---

## Example Conversations

### Starting a New Task:
```
YOU: I need to fix the JUCE build

CLAUDE: Let me check Confucius for build patterns...

[Confucius retrieves 3 relevant artifacts about CMake configuration,
compilation errors, and module resolution]

CLAUDE: Based on past issues, here are common build problems:
1. Missing .js extensions in TypeScript imports
2. Incorrect CMake target dependencies
3. Module resolution in tsconfig.json

Which one matches your error?
```

### When You Learn Something:
```
YOU: I just figured out that Swift UI preview crashes happen
when @State bindings are missing

CLAUDE: I'll store that in Confucius for future reference.

[Stored as pattern with confidence 0.8]
```

### Before Making Decisions:
```
YOU: Should I use Combine or async/await for this audio stream?

CLAUDE: Let me check what Confucius knows about audio streaming...

[Retrieves past decision: Combine was chosen for reactive audio
graph because it handles multiple subscribers better]

CLAUDE: Based on white_room-42, your team chose Combine for audio
streams because it handles multiple subscribers and provides
better cancellation support.
```

---

## How It Works

### Automatic Learning (Magic!)
```
You close a bd issue
↓
Confucius reads it automatically
↓
Extracts the pattern/learning
↓
Stores in memory
↓
Ready to help next time
```

**You don't do anything** - it just works!

### Manual Retrieval (When You Need It)
```
You ask Claude a question
↓
Claude searches Confucius
↓
Finds relevant past solutions
↓
Injects context into answer
↓
You get smarter answers
```

**Just ask** - Claude handles the rest!

---

## Confucius Commands

### Check Learning Status:
```
"Is Confucius learning? How many artifacts does it have?"
```

### Get Statistics:
```
"What does Confucius know about [topic]?"
```

### Manual Storage:
```
"Store this in Confucius: When fixing X, always do Y"
```

### Create Task Context:
```
"I'm starting work on [task]. Create a task scope and inject
relevant context from Confucius."
```

---

## Real Examples from White Room

### Example 1: TypeScript Build Error
```
YOU: I'm getting "Cannot find module" error

CLAUDE: Checking Confucius for module resolution patterns...

Found in white_room-87:
"When fixing TypeScript ES module imports, always use .js
extensions in import statements, not .ts extensions. This
is because TypeScript compiles to .js files."

CLAUDE: Check your imports - are you using .js extensions?
```

### Example 2: Testing Question
```
YOU: What's the testing approach here?

CLAUDE: Checking Confucius for testing patterns...

Found in white_room-169:
"Unit testing is essential for quality assurance. Use vitest
for TypeScript/JavaScript tests. Target 90%+ coverage for
critical components."

CLAUDE: Your team uses vitest with 90%+ coverage target.
Should I help you write tests?
```

### Example 3: Architecture Decision
```
YOU: Should this be in the SDK or backend?

CLAUDE: Checking Confucius for architecture patterns...

Found in white_room-45:
"Shared types that both frontend and backend need go in
sdk/packages/shared. Implementation-specific code stays
in the respective backend/frontend."

CLAUDE: Is this type needed by both Swift and JUCE? If yes,
put it in sdk/shared. If not, keep it in the specific module.
```

---

## Pro Tips

### 1. Check First, Work Second
```
❌ "How do I fix this error?" (wastes time)
✅ "Check Confucius for this error" (gets instant solution)
```

### 2. Store Your Learnings
```
❌ Just fixing it and moving on
✅ "Store this in Confucius: When [problem], do [solution]"
```

### 3. Close Issues Properly
```
❌ "Fixed it" (no learning captured)
✅ "Fixed by updating tsconfig to use ESNext module resolution"
(Captures the solution for Confucius)
```

### 4. Be Specific in Queries
```
❌ "What does Confucius know?"
✅ "What does Confucius know about Swift UI previews?"
```

---

## FAQ

### Q: Do I need to do anything special?
**A:** No! Just ask Claude to check Confucius before starting work.

### Q: When does Confucius learn?
**A:** Automatically when you close a bd issue.

### Q: Can I add things manually?
**A:** Yes! Just say "Store this in Confucius: [your learning]"

### Q: What if Confucius doesn't know?
**A:** It will say so. Then you can teach it by storing your solution.

### Q: How does it make me faster?
**A:** Reuses proven solutions instead of reinventing the wheel.

---

## Summary

### One Rule to Rule Them All:

**"Check Confucius first"**

That's it. Before you:
- Start a task
- Fix an error
- Make a decision
- Write code
- Design something

Just ask: **"What does Confucius know about [topic]?"**

Confucius will make you:
- ✅ Faster (reuse solutions)
- ✅ Smarter (learn from team)
- ✅ Consistent (follow patterns)
- ✅ Confident (proven approaches)

---

## Need Help?

1. Check `CLAUDE.md` for full documentation
2. Check `CONFUCIUS_GUIDE.md` for technical details
3. Ask: "What does Confucius know about [your problem]?"

**Confucius is your team's brain - use it!** 🧠
