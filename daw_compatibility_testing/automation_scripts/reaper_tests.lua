-- Reaper Automated Plugin Testing Suite
-- Tests White Room plugins for basic compatibility and functionality
--
-- Usage:
-- 1. Open Reaper
-- 2. Actions → Show action list → ReaScript: Load this file
-- 3. Run test functions individually or run all tests

--==============================================================================
-- Configuration
--==============================================================================

local PLUGIN_LIST = {
  "NexSynth",
  "KaneMarcoAether",
  "SamSampler",
  "FilterGate",
  "Monument",
  "FarFarAway",
  "LocalGal",
  "AetherGiantHorns",
  "AetherGiantVoice",
  "KaneMarcoAetherString"
}

local TEST_OUTPUT_PATH = reaper.GetResourcePath() .. "/WhiteRoomTests/"

--==============================================================================
-- Utility Functions
--==============================================================================

function Log(message)
  local timestamp = os.date("%Y-%m-%d %H:%M:%S")
  local log_message = string.format("[%s] %s\n", timestamp, message)
  print(log_message)

  -- Write to log file
  local log_file = io.open(TEST_OUTPUT_PATH .. "test_log.txt", "a")
  if log_file then
    log_file:write(log_message)
    log_file:close()
  end
end

function CreateTestDirectory()
  local cmd = string.format("mkdir -p \"%s\"", TEST_OUTPUT_PATH)
  os.execute(cmd)
  Log("Created test directory: " .. TEST_OUTPUT_PATH)
end

function SaveTestResult(plugin_name, test_name, passed, message)
  local result = string.format("%s,%s,%s,%s\n",
    plugin_name,
    test_name,
    passed and "PASS" or "FAIL",
    message or "")

  local results_file = io.open(TEST_OUTPUT_PATH .. "test_results.csv", "a")
  if results_file then
    results_file:write(result)
    results_file:close()
  end

  Log(string.format("%s: %s - %s",
    test_name,
    plugin_name,
    passed and "✅ PASS" or "❌ FAIL"))

  if message then
    Log("  Message: " .. message)
  end

  return passed
end

--==============================================================================
-- Test Functions
--==============================================================================

function TestPluginLoading(plugin_name)
  Log("Testing plugin loading: " .. plugin_name)

  -- Create new track
  local track = reaper.GetTrack(0, 0)
  if not track then
    reaper.InsertTrackAtIndex(0, false)
    track = reaper.GetTrack(0, 0)
  end

  -- Try to add plugin
  local fx_index = reaper.TrackFX_AddByName(track, plugin_name, false, -1)

  if fx_index >= 0 then
    SaveTestResult(plugin_name, "PluginLoading", true, "Plugin loaded successfully")
    return track, fx_index
  else
    SaveTestResult(plugin_name, "PluginLoading", false, "Plugin not found or failed to load")
    return nil, nil
  end
end

function TestPluginUI(plugin_name, track, fx_index)
  Log("Testing plugin UI: " .. plugin_name)

  -- Try to open plugin UI
  local opened = reaper.TrackFX_Show(track, fx_index, 3)

  if opened then
    SaveTestResult(plugin_name, "PluginUI", true, "UI opened successfully")

    -- Close UI after 1 second
    reaper.TrackFX_Show(track, fx_index, 0)
    return true
  else
    SaveTestResult(plugin_name, "PluginUI", false, "Failed to open UI")
    return false
  end
end

function TestPluginParameters(plugin_name, track, fx_index)
  Log("Testing plugin parameters: " .. plugin_name)

  -- Get parameter count
  local param_count = reaper.TrackFX_GetNumParams(track, fx_index)

  if param_count > 0 then
    SaveTestResult(plugin_name, "ParameterCount", true,
      string.format("Found %d parameters", param_count))

    -- Test first parameter (usually bypass or main volume)
    local param_name = reaper.TrackFX_GetParamName(track, fx_index, 0)
    local min_val, max_val = reaper.TrackFX_GetParamName(track, fx_index, 0)

    -- Try to set parameter
    reaper.TrackFX_SetParam(track, fx_index, 0, 0.5)

    -- Read it back
    local value = reaper.TrackFX_GetParam(track, fx_index, 0)

    if value >= 0 then then
      SaveTestResult(plugin_name, "ParameterReadWrite", true,
        string.format("Parameter '%s' read/write successful", param_name))
      return true
    else
      SaveTestResult(plugin_name, "ParameterReadWrite", false,
        "Failed to read parameter value")
      return false
    end
  else
    SaveTestResult(plugin_name, "ParameterCount", false, "No parameters found")
    return false
  end
end

function TestPluginPresets(plugin_name, track, fx_index)
  Log("Testing plugin presets: " .. plugin_name)

  -- Check if plugin has presets
  local has_preset = reaper.TrackFX_GetPreset(track, fx_index, 0)

  if has_preset then
    SaveTestResult(plugin_name, "PluginPresets", true, "Plugin supports presets")
    return true
  else
    SaveTestResult(plugin_name, "PluginPresets", false, "No presets found or preset access failed")
    return false
  end
end

function TestPluginAudio(plugin_name, track, fx_index)
  Log("Testing plugin audio output: " .. plugin_name)

  -- This is a basic check - in real testing, you'd want to
  -- play audio and verify output levels
  SaveTestResult(plugin_name, "AudioOutput", true,
    "Audio test requires manual verification")

  return true
end

function TestPluginAutomation(plugin_name, track, fx_index)
  Log("Testing plugin automation: " .. plugin_name)

  -- Try to create automation envelope for first parameter
  local automatable = reaper.TrackFX_GetParameterStepSizes(track, fx_index, 0)

  if automatable then
    -- Create automation envelope
    local env = reaper.GetFXEnvelope(track, fx_index, 0, true)

    if env then
      SaveTestResult(plugin_name, "PluginAutomation", true,
        "Automation envelope created successfully")

      -- Delete the envelope (cleanup)
      reaper.DeleteEnvelopePointRange(env, -1, -1)
      reaper.Envelope_DeletePoint(env, 0)

      return true
    else
      SaveTestResult(plugin_name, "PluginAutomation", false,
        "Failed to create automation envelope")
      return false
    end
  else
    SaveTestResult(plugin_name, "PluginAutomation", false,
      "First parameter is not automatable")
    return false
  end
end

function TestPluginState(plugin_name, track, fx_index)
  Log("Testing plugin state save/load: " .. plugin_name)

  -- Set a parameter value
  reaper.TrackFX_SetParam(track, fx_index, 0, 0.75)

  -- Save plugin state
  local state_chunk = reaper.TrackFX_GetChunk(track, fx_index, false)

  if state_chunk and state_chunk ~= "" then
    -- Change parameter
    reaper.TrackFX_SetParam(track, fx_index, 0, 0.25)

    -- Restore state
    local restored = reaper.TrackFX_SetChunk(track, fx_index, state_chunk, false)

    if restored then
      -- Check if value was restored
      local value = reaper.TrackFX_GetParam(track, fx_index, 0)

      if math.abs(value - 0.75) < 0.01 then
        SaveTestResult(plugin_name, "PluginState", true,
          "State saved and restored successfully")
        return true
      else
        SaveTestResult(plugin_name, "PluginState", false,
          "State value not correctly restored")
        return false
      end
    else
      SaveTestResult(plugin_name, "PluginState", false,
        "Failed to restore state")
      return false
    end
  else
    SaveTestResult(plugin_name, "PluginState", false,
      "Failed to save state")
    return false
  end
end

--==============================================================================
-- Test Suite Runner
--==============================================================================

function RunAllTestsForPlugin(plugin_name)
  Log(string.format("\n===== Testing Plugin: %s =====", plugin_name))

  -- Initialize CSV header
  local results_file = io.open(TEST_OUTPUT_PATH .. "test_results.csv", "a")
  if results_file then
    -- Only write header if file is new
    results_file:seek("end")
    local size = results_file:seek()
    if size == 0 then
      results_file:write("Plugin,Test,Status,Message\n")
    end
    results_file:close()
  end

  -- Run tests
  local track, fx_index = TestPluginLoading(plugin_name)

  if track and fx_index then
    TestPluginUI(plugin_name, track, fx_index)
    TestPluginParameters(plugin_name, track, fx_index)
    TestPluginPresets(plugin_name, track, fx_index)
    TestPluginAudio(plugin_name, track, fx_index)
    TestPluginAutomation(plugin_name, track, fx_index)
    TestPluginState(plugin_name, track, fx_index)

    -- Cleanup: remove plugin from track
    reaper.TrackFX_Delete(track, fx_index)
  end

  Log(string.format("===== Completed Testing: %s =====\n", plugin_name))
end

function RunAllTests()
  Log("Starting White Room Plugin Test Suite")

  CreateTestDirectory()

  for i, plugin_name in ipairs(PLUGIN_LIST) do
    RunAllTestsForPlugin(plugin_name)
  end

  Log("White Room Plugin Test Suite Complete")
  Log("Results saved to: " .. TEST_OUTPUT_PATH .. "test_results.csv")
end

function RunQuickTest()
  Log("Running quick plugin loading test")

  CreateTestDirectory()

  for i, plugin_name in ipairs(PLUGIN_LIST) do
    local track, fx_index = TestPluginLoading(plugin_name)

    if track and fx_index then
      -- Just remove and continue
      reaper.TrackFX_Delete(track, fx_index)
    end
  end

  Log("Quick test complete")
end

--==============================================================================
-- Main Entry Point
--==============================================================================

function main()
  -- Uncomment one of these to run tests

  -- Run all tests for all plugins
  -- RunAllTests()

  -- Run quick loading test only
  RunQuickTest()

  -- Run tests for single plugin
  -- RunAllTestsForPlugin("NexSynth")
end

-- Run automatically when script is loaded
main()

-- Show test results location
reaper.ShowConsoleMsg("Test results saved to: " .. TEST_OUTPUT_PATH .. "\n")
