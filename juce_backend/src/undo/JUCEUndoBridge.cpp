/**
 * JUCEUndoBridge Implementation - JUCE UndoManager integration
 */

#include "undo/JUCEUndoBridge.h"

// ============================================================================
// SongContractUndoableAction Implementation
// ============================================================================

SongContractUndoableAction::SongContractUndoableAction(
    std::shared_ptr<SongState> beforeState,
    std::shared_ptr<SongState> afterState,
    const juce::String& description,
    AudioEngineUndo* audioEngine)
    : beforeState(beforeState)
    , afterState(afterState)
    , description(description)
    , audioEngine(audioEngine)
{
    // Compute diff for audio engine
    if (beforeState && afterState && audioEngine)
    {
        diff = AudioEngineUndo::computeDiff(*beforeState, *afterState);
    }
}

bool SongContractUndoableAction::perform()
{
    // Apply "after" state
    if (afterState)
    {
        // Apply to audio engine if available
        if (audioEngine)
        {
            return applyToAudioEngine(afterState);
        }

        // Otherwise just return success
        return true;
    }

    return false;
}

bool SongContractUndoableAction::undo()
{
    // Apply "before" state
    if (beforeState)
    {
        // Apply to audio engine if available
        if (audioEngine)
        {
            return applyToAudioEngine(beforeState);
        }

        // Otherwise just return success
        return true;
    }

    return false;
}

int SongContractUndoableAction::getSizeInUnits()
{
    // Estimate size in bytes
    int size = 0;

    if (beforeState)
    {
        size += beforeState->id.toUTF8().lengthInBytes();
        size += beforeState->name.toUTF8().lengthInBytes();
        size += beforeState->activePerformanceId.toUTF8().lengthInBytes();
        size += sizeof(double) * 3; // tempo, density
        size += sizeof(int) * 2; // time signature
    }

    if (afterState)
    {
        size += afterState->id.toUTF8().lengthInBytes();
        size += afterState->name.toUTF8().lengthInBytes();
        size += afterState->activePerformanceId.toUTF8().lengthInBytes();
        size += sizeof(double) * 3;
        size += sizeof(int) * 2;
    }

    size += description.toUTF8().lengthInBytes();

    return size;
}

juce::String SongContractUndoableAction::getDescription() const
{
    return description;
}

bool SongContractUndoableAction::applyToAudioEngine(std::shared_ptr<SongState> state)
{
    if (!audioEngine || !state)
    {
        return false;
    }

    // Apply diff to audio engine
    // Note: We need a PerformanceRenderer reference here
    // This is a simplified version - full implementation would pass it in
    // return audioEngine->applyDiff(diff, *performanceRenderer);

    return true;
}

// ============================================================================
// PerformanceStateUndoableAction Implementation
// ============================================================================

PerformanceStateUndoableAction::PerformanceStateUndoableAction(
    const juce::String& oldPerformanceId,
    const juce::String& newPerformanceId,
    const juce::String& description,
    AudioEngineUndo* audioEngine)
    : oldPerformanceId(oldPerformanceId)
    , newPerformanceId(newPerformanceId)
    , description(description)
    , audioEngine(audioEngine)
{
}

bool PerformanceStateUndoableAction::perform()
{
    // Apply new performance
    if (audioEngine)
    {
        // Create performance change
        PerformanceChange change;
        change.oldPerformanceId = oldPerformanceId;
        change.newPerformanceId = newPerformanceId;

        // Apply through audio engine
        // Note: Need PerformanceRenderer reference
        // return audioEngine->applyPerformanceChange(change);
    }

    return true;
}

bool PerformanceStateUndoableAction::undo()
{
    // Revert to old performance
    if (audioEngine)
    {
        // Create performance change
        PerformanceChange change;
        change.oldPerformanceId = newPerformanceId;
        change.newPerformanceId = oldPerformanceId;

        // Apply through audio engine
        // Note: Need PerformanceRenderer reference
        // return audioEngine->applyPerformanceChange(change);
    }

    return true;
}

int PerformanceStateUndoableAction::getSizeInUnits()
{
    int size = 0;
    size += oldPerformanceId.toUTF8().lengthInBytes();
    size += newPerformanceId.toUTF8().lengthInBytes();
    size += description.toUTF8().lengthInBytes();
    return size;
}

juce::String PerformanceStateUndoableAction::getDescription() const
{
    return description;
}

// ============================================================================
// UndoManagerWrapper Implementation
// ============================================================================

UndoManagerWrapper::UndoManagerWrapper()
    : undoState(nullptr)
    , audioEngine(nullptr)
{
    // Create JUCE UndoManager with default max actions (100)
    undoManager = std::make_unique<juce::UndoManager>(100, 10000);
}

UndoManagerWrapper::~UndoManagerWrapper()
{
}

void UndoManagerWrapper::initialize(
    UndoState* undoState,
    AudioEngineUndo* audioEngine)
{
    this->undoState = undoState;
    this->audioEngine = audioEngine;
}

void UndoManagerWrapper::beginAction(const juce::String& actionDescription)
{
    if (!undoState)
    {
        return;
    }

    // Capture "before" snapshot
    currentBeforeSnapshot = undoState->snapshot();
    currentActionDescription = actionDescription;
}

void UndoManagerWrapper::endAction(const juce::String& actionDescription)
{
    if (!undoState)
    {
        return;
    }

    // Capture "after" snapshot
    auto afterSnapshot = undoState->snapshot();

    // Use provided description or current action description
    juce::String desc = actionDescription.isNotEmpty() ?
                        actionDescription :
                        currentActionDescription;

    // Create and perform undoable action
    auto action = createAction(currentBeforeSnapshot, afterSnapshot, desc);

    if (action)
    {
        undoManager->beginNewTransaction(desc);
        undoManager->perform(action.get());
    }

    // Clear current snapshots
    currentBeforeSnapshot = nullptr;
    currentActionDescription = juce::String();
}

bool UndoManagerWrapper::undo()
{
    return undoManager->undo();
}

bool UndoManagerWrapper::redo()
{
    return undoManager->redo();
}

bool UndoManagerWrapper::canUndo() const
{
    return undoManager->canUndo();
}

bool UndoManagerWrapper::canRedo() const
{
    return undoManager->canRedo();
}

juce::String UndoManagerWrapper::getUndoDescription() const
{
    return undoManager->getUndoDescription();
}

juce::String UndoManagerWrapper::getRedoDescription() const
{
    return undoManager->getRedoDescription();
}

void UndoManagerWrapper::clearHistory()
{
    undoManager->clearUndoHistory();
}

int UndoManagerWrapper::getNumUndoActions() const
{
    return undoManager->getNumActionsInUndoList();
}

int UndoManagerWrapper::getNumRedoActions() const
{
    return undoManager->getNumActionsInRedoList();
}

int UndoManagerWrapper::getMaxNumberOfActions() const
{
    return undoManager->getMaxNumberOfUnits();
}

void UndoManagerWrapper::setMaxNumberOfActions(int maxActions)
{
    undoManager->setMaxNumberOfUnitsToKeep(maxActions);
}

juce::UndoManager& UndoManagerWrapper::getUndoManager()
{
    return *undoManager;
}

std::unique_ptr<juce::UndoableAction> UndoManagerWrapper::createAction(
    std::shared_ptr<SongState> before,
    std::shared_ptr<SongState> after,
    const juce::String& description)
{
    // Create SongContract undoable action
    return std::make_unique<SongContractUndoableAction>(
        before,
        after,
        description,
        audioEngine
    );
}
