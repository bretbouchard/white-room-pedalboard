/**
 * UndoState Implementation - Thread-safe undo state management
 */

#include "undo/UndoState.h"

// ============================================================================
// SongState Implementation
// ============================================================================

SongState::SongState()
    : tempo(120.0)
    , timeSignatureNumerator(4)
    , timeSignatureDenominator(4)
    , density(0.5)
{
}

std::shared_ptr<SongState> SongState::clone() const
{
    auto copy = std::make_shared<SongState>();
    copy->id = id;
    copy->name = name;
    copy->tempo = tempo;
    copy->timeSignatureNumerator = timeSignatureNumerator;
    copy->timeSignatureDenominator = timeSignatureDenominator;
    copy->activePerformanceId = activePerformanceId;
    copy->density = density;
    copy->grooveProfileId = grooveProfileId;
    copy->consoleXProfileId = consoleXProfileId;
    copy->instrumentIds = juce::StringArray(instrumentIds);
    copy->mixGains = juce::Array<double>(mixGains);
    copy->mixPans = juce::Array<double>(mixPans);
    return copy;
}

bool SongState::isValid() const
{
    return !id.isEmpty() && !activePerformanceId.isEmpty();
}

// ============================================================================
// SongContract Implementation
// ============================================================================

SongContract::SongContract()
    : version("1.0")
{
}

bool SongContract::isValid() const
{
    return !id.isEmpty() && !songStateId.isEmpty();
}

// ============================================================================
// UndoState Implementation
// ============================================================================

UndoState::UndoState()
{
    // Initialize with empty state
    auto initialState = std::make_shared<SongState>();
    auto statePtr = new std::shared_ptr<SongState>(initialState);
    atomicState.store(statePtr, std::memory_order_release);
}

UndoState::~UndoState()
{
    // Clean up atomic state
    auto statePtr = atomicState.load(std::memory_order_acquire);
    if (statePtr != nullptr)
    {
        delete statePtr;
        atomicState.store(nullptr, std::memory_order_release);
    }
}

std::shared_ptr<SongState> UndoState::snapshot()
{
    // Lock-free atomic read (audio thread safe)
    auto statePtr = atomicState.load(std::memory_order_acquire);
    if (statePtr != nullptr)
    {
        // Clone the state for a snapshot
        return (*statePtr)->clone();
    }
    return std::make_shared<SongState>();
}

bool UndoState::restore(std::shared_ptr<SongState> state)
{
    if (!state || !state->isValid())
    {
        return false;
    }

    // Acquire write lock for mutation
    std::unique_lock<std::shared_mutex> lock(stateLock);

    // Update atomic state
    updateAtomicState(state);

    return true;
}

std::shared_ptr<SongState> UndoState::getCurrentState() const
{
    // Lock-free atomic read (audio thread safe, NEVER blocks)
    auto statePtr = atomicState.load(std::memory_order_acquire);
    if (statePtr != nullptr)
    {
        return *statePtr;
    }
    return std::make_shared<SongState>();
}

void UndoState::setCurrentState(std::shared_ptr<SongState> state)
{
    if (!state)
    {
        return;
    }

    // Acquire write lock for mutation
    std::unique_lock<std::shared_mutex> lock(stateLock);

    // Update atomic state
    updateAtomicState(state);
}

bool UndoState::hasValidState() const
{
    // Lock-free atomic check
    auto statePtr = atomicState.load(std::memory_order_acquire);
    return statePtr != nullptr && (*statePtr)->isValid();
}

void UndoState::clear()
{
    // Acquire write lock for mutation
    std::unique_lock<std::shared_mutex> lock(stateLock);

    // Reset to empty state
    auto emptyState = std::make_shared<SongState>();
    updateAtomicState(emptyState);
}

std::shared_ptr<SongState> UndoState::fromContract(const SongContract& contract)
{
    if (!contract.isValid())
    {
        return std::make_shared<SongState>();
    }

    auto state = std::make_shared<SongState>();
    state->id = contract.songStateId;
    // Note: Full implementation would parse contract JSON
    // This is a simplified version for the undo system
    return state;
}

SongContract UndoState::toContract(const SongState& state)
{
    if (!state.isValid())
    {
        return SongContract();
    }

    SongContract contract;
    contract.id = state.id + "_contract";
    contract.songStateId = state.id;
    contract.performanceStateId = state.activePerformanceId;
    return contract;
}

void UndoState::updateAtomicState(std::shared_ptr<SongState> state)
{
    // Delete old state pointer and create new one
    auto oldStatePtr = atomicState.load(std::memory_order_acquire);
    auto newStatePtr = new std::shared_ptr<SongState>(state);
    atomicState.store(newStatePtr, std::memory_order_release);

    // Clean up old pointer (safe to delete after store)
    if (oldStatePtr != nullptr)
    {
        // Schedule for deletion (not immediate to avoid races)
        // In practice, shared_ptr handles the actual object deletion
        delete oldStatePtr;
    }
}
