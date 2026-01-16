-- Logic Pro Automated Plugin Testing Suite
-- Tests White Room AU plugins for basic compatibility
--
-- NOTE: This requires AU plugins to be built first
-- Usage:
-- 1. Open Script Editor.app
-- 2. Load this script
-- 3. Run with Logic Pro as target application

--==============================================================================
-- Configuration
--==============================================================================

property PLUGIN_LIST : {"NexSynth", "KaneMarcoAether", "SamSampler", "FilterGate"}
property TEST_OUTPUT_PATH : POSIX path of (path to desktop folder as string) & "WhiteRoomLogicTests/"

--==============================================================================
-- Utility Functions
--==============================================================================

on Log(message)
  set timestamp to (current date) as string
  set log_message to "[" & timestamp & "] " & message & return

  -- Write to log file
  set log_file to open for access (TEST_OUTPUT_PATH & "test_log.txt") with write permission
  write log_message to log_file starting at eof
  close access log_file

  return log_message
end Log

on CreateTestDirectory()
  do shell script "mkdir -p " & quoted form of TEST_OUTPUT_PATH
  Log("Created test directory: " & TEST_OUTPUT_PATH)
end CreateTestDirectory

on SaveTestResult(plugin_name, test_name, passed, message)
  set result_string to plugin_name & "," & test_name & "," & (passed as string) & "," & message & return

  set results_file to open for access (TEST_OUTPUT_PATH & "test_results.csv") with write permission
  write result_string to results_file starting at eof
  close access results_file

  set status_icon to "✅" if passed else "❌"
  Log(test_name & ": " & plugin_name & " - " & status_icon)

  return passed
end SaveTestResult

--==============================================================================
-- Test Functions
--==============================================================================

on TestPluginLoading(plugin_name)
  Log("Testing plugin loading: " & plugin_name)

  tell application "Logic Pro"
    try
      -- Create new software instrument track
      set new_track to make new track 1 at end of tracks 1

      -- Create instrument channel strip
      set channel_strip to make new instrument channel strip 1 at end of channel strips 1

      -- Try to insert AU plugin
       insertAU plugin_name at channel_strip 1

      SaveTestResult(plugin_name, "PluginLoading", true, "Plugin loaded successfully")
      return {track:new_track, channel_strip:channel_strip}

    on error error_message
      SaveTestResult(plugin_name, "PluginLoading", false, error_message)
      return {missing value, missing value}
    end try
  end tell
end TestPluginLoading

on TestPluginUI(plugin_name, channel_strip)
  Log("Testing plugin UI: " & plugin_name)

  tell application "Logic Pro"
    try
      -- Open plugin UI
       openUI of (first AU plugin 1 whose name is plugin_name) of channel_strip

      SaveTestResult(plugin_name, "PluginUI", true, "UI opened successfully")

      -- Close UI after delay
      delay 1
       closeUI of (first AU plugin 1 whose name is plugin_name) of channel_strip

      return true

    on error error_message
      SaveTestResult(plugin_name, "PluginUI", false, error_message)
      return false
    end try
  end tell
end TestPluginUI

on TestPluginParameters(plugin_name, channel_strip)
  Log("Testing plugin parameters: " & plugin_name)

  tell application "Logic Pro"
    try
      -- Get AU plugin
      set au_plugin to first AU plugin 1 whose name is plugin_name of channel_strip

      -- Get parameter count
      set param_count to count of parameters 1 of au_plugin

      if param_count > 0 then
        SaveTestResult(plugin_name, "ParameterCount", true, "Found " & (param_count as string) & " parameters")

        -- Try to get first parameter
        set first_param to first item of parameters 1 of au_plugin
        set param_name to name of first_param

        -- Try to set parameter value
        set value of first_param to 0.5

        -- Read it back
        set read_value to value of first_param

        if read_value ≥ 0 then
          SaveTestResult(plugin_name, "ParameterReadWrite", true, "Parameter '" & param_name & "' read/write successful")
          return true
        else
          SaveTestResult(plugin_name, "ParameterReadWrite", false, "Failed to read parameter value")
          return false
        end if

      else
        SaveTestResult(plugin_name, "ParameterCount", false, "No parameters found")
        return false
      end if

    on error error_message
      SaveTestResult(plugin_name, "ParameterReadWrite", false, error_message)
      return false
    end try
  end tell
end TestPluginParameters

on TestPluginPresets(plugin_name, channel_strip)
  Log("Testing plugin presets: " & plugin_name)

  tell application "Logic Pro"
    try
      set au_plugin to first AU plugin 1 whose name is plugin_name of channel_strip

      -- Try to access presets
      set preset_count to count of presets 1 of au_plugin

      if preset_count > 0 then
        SaveTestResult(plugin_name, "PluginPresets", true, "Found " & (preset_count as string) & " presets")
        return true
      else
        SaveTestResult(plugin_name, "PluginPresets", false, "No presets found")
        return false
      end if

    on error error_message
      SaveTestResult(plugin_name, "PluginPresets", false, error_message)
      return false
    end try
  end tell
end TestPluginPresets

--==============================================================================
-- Test Suite Runner
--==============================================================================

on RunAllTestsForPlugin(plugin_name)
  Log("===== Testing Plugin: " & plugin_name & " =====")

  -- Create CSV header
  set results_file to open for access (TEST_OUTPUT_PATH & "test_results.csv") with write permission
  try
    write "Plugin,Test,Status,Message\n" to results_file starting at eof
  end try
  close access results_file

  -- Run tests
  set test_result to TestPluginLoading(plugin_name)

  if item 2 of test_result is not missing value then
    set channel_strip to item 2 of test_result

    TestPluginUI(plugin_name, channel_strip)
    TestPluginParameters(plugin_name, channel_strip)
    TestPluginPresets(plugin_name, channel_strip)

    -- Cleanup
    tell application "Logic Pro"
       delete channel_strip
    end tell
  end if

  Log("===== Completed Testing: " & plugin_name & " =====" & return & return)
end RunAllTestsForPlugin

on RunAllTests()
  Log("Starting White Room Logic Pro Plugin Test Suite")

  CreateTestDirectory()

  repeat with plugin_name in PLUGIN_LIST
    RunAllTestsForPlugin(plugin_name)
  end repeat

  Log("White Room Logic Pro Plugin Test Suite Complete")
  Log("Results saved to: " & TEST_OUTPUT_PATH & "test_results.csv")
end RunAllTests

on RunQuickTest()
  Log("Running quick plugin loading test")

  CreateTestDirectory()

  repeat with plugin_name in PLUGIN_LIST
    TestPluginLoading(plugin_name)
  end repeat

  Log("Quick test complete")
end RunQuickTest

--==============================================================================
-- Main Entry Point
--==============================================================================

RunAllTests()

-- Display completion message
display dialog "Logic Pro plugin testing complete. Results saved to: " & TEST_OUTPUT_PATH buttons {"OK"} default button "OK"
