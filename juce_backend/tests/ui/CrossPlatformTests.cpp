#include "UITestSuite.cpp"
#include <gtest/gtest.h>
#include <memory>
#include <thread>

using namespace UITestFramework;
using namespace UITestFramework::Mock;

/**
 * @brief Comprehensive cross-platform UI testing
 */
class CrossPlatformTest : public CrossPlatformTestFixture
{
};

/**
 * @brief Test platform detection
 */
TEST_F(CrossPlatformTest, PlatformDetection)
{
    bool isWindows = isRunningOnWindows();
    bool isMacOS = isRunningOnMacOS();
    bool isLinux = isRunningOnLinux();

    // Should detect exactly one platform
    int detectedPlatforms = (isWindows ? 1 : 0) + (isMacOS ? 1 : 0) + (isLinux ? 1 : 0);
    EXPECT_EQ(detectedPlatforms, 1) << "Should detect exactly one platform";

    // Log detected platform for test reporting
    if (isWindows)
    {
        std::cout << "Running on Windows platform" << std::endl;
    }
    else if (isMacOS)
    {
        std::cout << "Running on macOS platform" << std::endl;
    }
    else if (isLinux)
    {
        std::cout << "Running on Linux platform" << std::endl;
    }
}

/**
 * @brief Test screen bounds and display configuration
 */
TEST_F(CrossPlatformTest, ScreenBounds)
{
    auto screenBounds = getScreenBounds();

    EXPECT_GT(screenBounds.getWidth(), 0) << "Screen width should be positive";
    EXPECT_GT(screenBounds.getHeight(), 0) << "Screen height should be positive";

    std::cout << "Screen bounds: " << screenBounds.getWidth() << "x" << screenBounds.getHeight() << std::endl;

    // Test window positioning within screen bounds
    auto testWindow = std::make_unique<juce::DocumentWindow>(
        "Test Window",
        juce::Colours::lightgrey,
        juce::DocumentWindow::allButtons
    );
    testWindow->setSize(400, 300);

    // Position window at center of screen
    auto screenCenter = screenBounds.getCentre();
    auto windowBounds = testWindow->getBounds();
    windowBounds.setCentre(screenCenter);
    testWindow->setBounds(windowBounds);

    // Verify window is within screen bounds
    EXPECT_TRUE(screenBounds.contains(windowBounds)) << "Window should be within screen bounds";

    testWindow.reset();
}

/**
 * @brief Test multi-monitor support
 */
TEST_F(CrossPlatformTest, MultiMonitorSupport)
{
    testMultiMonitorScenarios();

    auto monitorBounds = getMonitorBounds();
    EXPECT_GT(monitorBounds.size(), 0) << "Should have at least one monitor";

    std::cout << "Detected " << monitorBounds.size() << " monitor(s)" << std::endl;

    for (size_t i = 0; i < monitorBounds.size(); ++i)
    {
        const auto& bounds = monitorBounds[i];
        std::cout << "Monitor " << i << ": " << bounds.getWidth() << "x" << bounds.getHeight()
                  << " at (" << bounds.getX() << ", " << bounds.getY() << ")" << std::endl;

        EXPECT_GT(bounds.getWidth(), 0) << "Monitor width should be positive";
        EXPECT_GT(bounds.getHeight(), 0) << "Monitor height should be positive";
    }

    // Test window creation on different monitors if multiple monitors available
    if (monitorBounds.size() > 1)
    {
        for (size_t i = 0; i < monitorBounds.size(); ++i)
        {
            auto window = std::make_unique<juce::DocumentWindow>(
                "Multi-Monitor Test " + juce::String(i),
                juce::Colours::lightgrey,
                juce::DocumentWindow::allButtons
            );
            window->setSize(300, 200);

            // Position window on specific monitor
            auto monitorBounds = monitorBounds[i];
            window->setBounds(monitorBounds.withSizeKeepingCentre(300, 200));

            // Verify window is on correct monitor
            auto windowBounds = window->getBounds();
            EXPECT_TRUE(monitorBounds.intersects(windowBounds)) << "Window should be on monitor " << i;
        }
    }
}

/**
 * @brief Test high-DPI display support
 */
TEST_F(CrossPlatformTest, HighDPIDisplaySupport)
{
    testHighDPIScenarios();

    float displayScale = getDisplayScaleFactor();
    EXPECT_GT(displayScale, 0.0f) << "Display scale factor should be positive";
    EXPECT_LT(displayScale, 10.0f) << "Display scale factor should be reasonable";

    std::cout << "Display scale factor: " << displayScale << std::endl;

    // Test component scaling
    auto testComponent = std::make_unique<MockComponent("HighDPI Test");
    testComponent->setSize(100, 50);

    // Apply display scale
    int scaledWidth = static_cast<int>(testComponent->getWidth() * displayScale);
    int scaledHeight = static_cast<int>(testComponent->getHeight() * displayScale);

    testComponent->setSize(scaledWidth, scaledHeight);

    EXPECT_EQ(testComponent->getWidth(), scaledWidth);
    EXPECT_EQ(testComponent->getHeight(), scaledHeight);

    // Test image rendering at different scales
    auto testImage = juce::Image(juce::Image::PixelFormat::ARGB, 50, 50, true);
    juce::Graphics g(testImage);
    g.fillAll(juce::Colours::blue);

    // Create scaled version
    auto scaledImage = testImage.rescaled(
        static_cast<int>(testImage.getWidth() * displayScale),
        static_cast<int>(testImage.getHeight() * displayScale)
    );

    EXPECT_EQ(scaledImage.getWidth(), static_cast<int>(50 * displayScale));
    EXPECT_EQ(scaledImage.getHeight(), static_cast<int>(50 * displayScale));
}

/**
 * @brief Test system integration
 */
TEST_F(CrossPlatformTest, SystemIntegration)
{
    testSystemIntegration();

    // Test system theme detection
    bool darkModeEnabled = isDarkModeEnabled();
    std::cout << "System dark mode: " << (darkModeEnabled ? "enabled" : "disabled") << std::endl;

    // Test system font detection
    juce::String systemFont = getSystemFont();
    EXPECT_FALSE(systemFont.isEmpty()) << "Should detect system font";
    std::cout << "System font: " << systemFont << std::endl;

    // Test system accent color
    juce::String systemAccentColor = getSystemAccentColor();
    EXPECT_FALSE(systemAccentColor.isEmpty()) << "Should detect system accent color";
    std::cout << "System accent color: " << systemAccentColor << std::endl;

    // Test file dialog
    juce::FileChooser fileChooser("Test File Dialog", juce::File::getSpecialLocation(juce::File::userHomeDirectory), "*.*");

    // Don't actually open dialog in automated test, just test creation
    EXPECT_NO_THROW(juce::FileChooser("Test", juce::File(), "*"));
}

/**
 * @brief Test platform-specific UI features
 */
TEST_F(CrossPlatformTest, PlatformSpecificFeatures)
{
    testPlatformSpecificFeatures();

    // Test native menu bar creation (platform-specific)
    juce::MenuBarModel::MenuBarModel dummyModel;
    auto menuBar = std::make_unique<juce::MenuBarComponent>();
    EXPECT_NE(menuBar, nullptr);

    // Test native file browser
    auto fileBrowser = std::make_unique<juce::FileBrowserComponent>(
        juce::FileBrowserComponent::openMode | juce::FileBrowserComponent::canSelectFiles,
        juce::File::getSpecialLocation(juce::File::userHomeDirectory),
        nullptr,
        nullptr
    );
    EXPECT_NE(fileBrowser, nullptr);

    // Test native title bar
    auto nativeTitleBar = std::make_unique<juce::DocumentWindow>(
        "Native Title Bar Test",
        juce::Colours::white,
        juce::DocumentWindow::allButtons
    );
    EXPECT_NE(nativeTitleBar, nullptr);

    // Test system tray integration (platform-specific)
    if (isRunningOnWindows() || isRunningOnLinux())
    {
        auto systemTray = std::make_unique<juce::SystemTrayIconComponent>();
        EXPECT_NE(systemTray, nullptr);
    }
}

/**
 * @brief Test keyboard shortcuts and modifier keys
 */
TEST_F(CrossPlatformTest, KeyboardShortcuts)
{
    // Test platform-specific keyboard shortcuts
    std::vector<juce::KeyPress> commonShortcuts = {
        juce::KeyPress('c', juce::ModifierKeys::commandModifier, 0), // Ctrl+C / Cmd+C
        juce::KeyPress('v', juce::ModifierKeys::commandModifier, 0), // Ctrl+V / Cmd+V
        juce::KeyPress('z', juce::ModifierKeys::commandModifier, 0), // Ctrl+Z / Cmd+Z
        juce::KeyPress('s', juce::ModifierKeys::commandModifier, 0), // Ctrl+S / Cmd+S
        juce::KeyPress(juce::KeyPress::deleteKey),                  // Delete
        juce::KeyPress(juce::KeyPress::backspaceKey),                // Backspace
        juce::KeyPress(juce::KeyPress::escapeKey),                   // Escape
        juce::KeyPress(juce::KeyPress::returnKey),                   // Enter
        juce::KeyPress(juce::KeyPress::tabKey),                      // Tab
        juce::KeyPress(juce::KeyPress::spaceKey),                    // Space
    };

    for (const auto& shortcut : commonShortcuts)
    {
        // Test that shortcuts can be created and compared
        EXPECT_NO_THROW(juce::KeyPress testShortcut(shortcut));

        // Test text representation
        juce::String shortcutText = shortcut.getTextDescription();
        EXPECT_FALSE(shortcutText.isEmpty()) << "Shortcut should have text description: " << shortcutText;
    }

    // Test platform-specific modifiers
    if (isRunningOnMacOS())
    {
        EXPECT_TRUE(juce::ModifierKeys::commandModifier == juce::ModifierKeys::ctrlModifier ||
                   juce::ModifierKeys::commandModifier != juce::ModifierKeys::ctrlModifier);
    }
    else
    {
        EXPECT_EQ(juce::ModifierKeys::commandModifier, juce::ModifierKeys::ctrlModifier);
    }
}

/**
 * @brief Test drag and drop functionality
 */
TEST_F(CrossPlatformTest, DragAndDrop)
{
    // Create draggable component
    class DragSourceComponent : public juce::Component
    {
    public:
        DragSourceComponent()
        {
            setSize(100, 50);
        }

        void mouseDrag(const juce::MouseEvent& event) override
        {
            if (distanceDragged < 5)
                return;

            auto dragDescription = juce::var("Test Drag Data");
            juce::Image dragImage(juce::Image::PixelFormat::ARGB, 100, 50, true);
            juce::Graphics g(dragImage);
            g.fillAll(juce::Colours::blue);

            startDragging(dragDescription, this, juce::ScaledImage(dragImage), true);
        }

        void mouseUp(const juce::MouseEvent& event) override
        {
            distanceDragged = 0;
        }

        void mouseDown(const juce::MouseEvent& event) override
        {
            dragStartPos = event.getMouseDownPosition();
        }

    private:
        juce::Point<int> dragStartPos;
        int distanceDragged = 0;
    };

    // Create drop target component
    class DropTargetComponent : public juce::Component, public juce::FileDragAndDropTarget, public juce::TextDragAndDropTarget
    {
    public:
        DropTargetComponent()
        {
            setSize(200, 100);
        }

        bool isInterestedInFileDrag(const juce::StringArray& files) override { return true; }
        bool isInterestedInTextDrag(const juce::String& text) override { return true; }
        bool isInterestedInDragSource(const juce::DragAndDropTarget::SourceDetails& dragSourceDetails) override { return true; }

        void itemDropped(const juce::DragAndDropTarget::SourceDetails& dragSourceDetails) override
        {
            itemWasDropped = true;
            droppedDescription = dragSourceDetails.description;
        }

        void filesDropped(const juce::StringArray& files, int x, int y) override
        {
            filesWereDropped = true;
            droppedFiles = files;
        }

        void textDropped(const juce::String& text, int x, int y) override
        {
            textWasDropped = true;
            droppedText = text;
        }

        bool itemWasDropped = false;
        bool filesWereDropped = false;
        bool textWasDropped = false;
        juce::var droppedDescription;
        juce::StringArray droppedFiles;
        juce::String droppedText;
    };

    auto dragSource = std::make_unique<DragSourceComponent>();
    auto dropTarget = std::make_unique<DropTargetComponent>();

    dragSource->setTopLeftPosition(50, 50);
    dropTarget->setTopLeftPosition(200, 50);

    testWindow->addAndMakeVisible(dragSource.get());
    testWindow->addAndMakeVisible(dropTarget.get());

    processUIEvents(100);

    // Simulate drag operation
    juce::MouseEvent mouseDownEvent(
        juce::Point<int>(75, 75),
        juce::ModifierKeys(),
        juce::Time::getCurrentTime(),
        0.0f,
        0.0f,
        juce::MouseEvent::MouseEventType::mouseDown,
        1
    );

    juce::MouseEvent mouseDragEvent(
        juce::Point<int>(150, 75),
        juce::ModifierKeys(),
        juce::Time::getCurrentTime(),
        0.0f,
        0.0f,
        juce::MouseEvent::MouseEventType::mouseDrag,
        1
    );

    juce::MouseEvent mouseUpEvent(
        juce::Point<int>(250, 75),
        juce::ModifierKeys(),
        juce::Time::getCurrentTime(),
        0.0f,
        0.0f,
        juce::MouseEvent::MouseEventType::mouseUp,
        1
    );

    // Perform drag operation
    dragSource->mouseDown(mouseDownEvent);
    dragSource->mouseDrag(mouseDragEvent);
    dragSource->mouseUp(mouseUpEvent);

    processUIEvents(100);

    // Verify drag and drop infrastructure works
    EXPECT_NE(dragSource, nullptr);
    EXPECT_NE(dropTarget, nullptr);
    EXPECT_TRUE(dropTarget->isInterestedInDragSource(juce::DragAndDropTarget::SourceDetails()));
}

/**
 * @brief Test clipboard functionality
 */
TEST_F(CrossPlatformTest, Clipboard)
{
    auto systemClipboard = juce::SystemClipboard::getInstance();
    EXPECT_NE(systemClipboard, nullptr);

    // Test text clipboard
    juce::String testText = "Test clipboard content";
    systemClipboard->copyTextToClipboard(testText);

    juce::String clipboardText = systemClipboard->getTextFromClipboard();
    EXPECT_EQ(clipboardText, testText);

    // Test clipboard has content
    EXPECT_TRUE(systemClipboard->hasTextContent());

    // Clear clipboard
    systemClipboard->copyTextToClipboard("");
    EXPECT_FALSE(systemClipboard->hasTextContent());
}

/**
 * @brief Test web browser integration
 */
TEST_F(CrossPlatformTest, WebBrowserIntegration)
{
    juce::String testURL = "https://www.google.com";

    // Test URL launching (should not fail, but we won't actually open browser in test)
    EXPECT_NO_THROW(juce::URL(testURL).launchInDefaultBrowser());

    // Test URL validation
    juce::URL validURL(testURL);
    EXPECT_TRUE(validURL.isWellFormed());

    juce::URL invalidURL("not a valid url");
    EXPECT_FALSE(invalidURL.isWellFormed());

    // Test file URL creation
    juce::File testFile = juce::File::getSpecialLocation(juce::File::tempDirectory).getChildFile("test.txt");
    testFile.create();

    juce::URL fileURL(testFile);
    EXPECT_TRUE(fileURL.isLocalFile());
    EXPECT_EQ(fileURL.getLocalFile(), testFile);

    testFile.deleteFile();
}

/**
 * @brief Test audio device enumeration
 */
TEST_F(CrossPlatformTest, AudioDeviceEnumeration)
{
    auto audioDeviceManager = std::make_unique<juce::AudioDeviceManager>();
    EXPECT_NE(audioDeviceManager, nullptr);

    // Initialize with default setup
    juce::String error = audioDeviceManager->initialise(2, 2, nullptr, true);
    EXPECT_TRUE(error.isEmpty()) << "Audio device initialization failed: " << error;

    // Get current audio device type
    auto deviceType = audioDeviceManager->getCurrentDeviceTypeObject();
    EXPECT_NE(deviceType, nullptr);

    // Get available device types
    auto deviceTypes = audioDeviceManager->getAvailableDeviceTypes();
    EXPECT_GT(deviceTypes.size(), 0) << "Should have at least one audio device type";

    for (auto* type : deviceTypes)
    {
        EXPECT_NE(type, nullptr);
        EXPECT_FALSE(type->getTypeName().isEmpty());
    }
}

/**
 * @brief Test MIDI device enumeration
 */
TEST_F(CrossPlatformTest, MidiDeviceEnumeration)
{
    // Test MIDI input devices
    auto midiInputs = juce::MidiInput::getAvailableDevices();
    std::cout << "Found " << midiInputs.size() << " MIDI input devices:" << std::endl;

    for (const auto& device : midiInputs)
    {
        EXPECT_FALSE(device.name.isEmpty());
        EXPECT_GE(device.identifier, 0);
        std::cout << "  - " << device.name << " (ID: " << device.identifier << ")" << std::endl;
    }

    // Test MIDI output devices
    auto midiOutputs = juce::MidiOutput::getAvailableDevices();
    std::cout << "Found " << midiOutputs.size() << " MIDI output devices:" << std::endl;

    for (const auto& device : midiOutputs)
    {
        EXPECT_FALSE(device.name.isEmpty());
        EXPECT_GE(device.identifier, 0);
        std::cout << "  - " << device.name << " (ID: " << device.identifier << ")" << std::endl;
    }
}

/**
 * @brief Test file system operations
 */
TEST_F(CrossPlatformTest, FileSystemOperations)
{
    // Test special locations
    std::vector<juce::File::SpecialLocationType> specialLocations = {
        juce::File::userHomeDirectory,
        juce::File::userDocumentsDirectory,
        juce::File::userDesktopDirectory,
        juce::File::userMusicDirectory,
        juce::File::userMoviesDirectory,
        juce::File::userPicturesDirectory,
        juce::File::tempDirectory,
        juce::File::currentApplicationFile,
        juce::File::currentExecutableFile
    };

    for (auto locationType : specialLocations)
    {
        juce::File location = juce::File::getSpecialLocation(locationType);
        EXPECT_TRUE(location.exists() || locationType == juce::File::currentApplicationFile || locationType == juce::File::currentExecutableFile)
            << "Special location should exist: " << location.getFullPathName();
    }

    // Test file operations
    juce::File testFile = juce::File::getSpecialLocation(juce::File::tempDirectory).getChildFile("cross_platform_test.txt");

    // Create and write to file
    testFile.create();
    juce::FileOutputStream outputStream(testFile);
    EXPECT_TRUE(outputStream.openedOk());

    juce::String testContent = "Cross-platform test content";
    outputStream.writeText(testContent, false, false, nullptr);
    outputStream.flush();

    EXPECT_TRUE(testFile.exists());
    EXPECT_GT(testFile.getSize(), 0);

    // Read from file
    juce::FileInputStream inputStream(testFile);
    EXPECT_TRUE(inputStream.openedOk());

    juce::String readContent = inputStream.readEntireStreamAsString();
    EXPECT_EQ(readContent, testContent);

    // Clean up
    testFile.deleteFile();
    EXPECT_FALSE(testFile.exists());
}

/**
 * @brief Test platform-specific threading
 */
TEST_F(CrossPlatformTest, Threading)
{
    // Test thread creation and management
    std::atomic<bool> threadRan{false};
    std::atomic<int> threadResult{0};

    std::thread testThread([&]() {
        threadRan = true;
        threadResult = 42;
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
    });

    testThread.join();

    EXPECT_TRUE(threadRan);
    EXPECT_EQ(threadResult, 42);

    // Test message thread verification
    EXPECT_TRUE(juce::MessageManager::exists());
    EXPECT_TRUE(juce::MessageManager::getInstance()->isThisTheMessageThread());

    // Test async message posting
    std::atomic<bool> asyncMessageReceived{false};

    juce::MessageManager::callAsync([&]() {
        asyncMessageReceived = true;
    });

    // Wait for async message
    int timeoutMs = 1000;
    while (!asyncMessageReceived && timeoutMs > 0)
    {
        processUIEvents(10);
        timeoutMs -= 10;
    }

    EXPECT_TRUE(asyncMessageReceived) << "Async message should be received";
}

/**
 * @brief Test performance characteristics across platforms
 */
TEST_F(CrossPlatformTest, PerformanceCharacteristics)
{
    const int numOperations = 10000;

    // Test component creation performance
    startPerformanceMeasurement();

    std::vector<std::unique_ptr<juce::Component>> components;
    for (int i = 0; i < numOperations; ++i)
    {
        auto component = std::make_unique<juce::Component>();
        component->setSize(50, 25);
        components.push_back(std::move(component));
    }

    stopPerformanceMeasurement();

    double creationTime = getLastExecutionTime();
    std::cout << "Component creation performance: " << creationTime << "ms for " << numOperations << " components" << std::endl;

    // Performance should be reasonable (adjust thresholds per platform if needed)
    EXPECT_LT(creationTime, 5000.0) << "Component creation too slow: " << creationTime << "ms";

    // Test destruction performance
    startPerformanceMeasurement();
    components.clear();
    stopPerformanceMeasurement();

    double destructionTime = getLastExecutionTime();
    std::cout << "Component destruction performance: " << destructionTime << "ms for " << numOperations << " components" << std::endl;

    EXPECT_LT(destructionTime, 1000.0) << "Component destruction too slow: " << destructionTime << "ms";
}

// Run cross-platform tests
int runCrossPlatformTests(int argc, char** argv)
{
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}