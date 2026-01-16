#include "UITestSuite.cpp"
#include <gtest/gtest.h>
#include <memory>
#include <random>
#include <filesystem>
#include <fstream>

using namespace UITestFramework;
using namespace UITestFramework::Mock;

/**
 * @brief Comprehensive visual regression testing
 */
class VisualRegressionTest : public UITestFixture
{
protected:
    void SetUp() override
    {
        UITestFixture::SetUp();

        // Set up visual regression environment
        testImagesDirectory = tempDirectory.getChildFile("test_images");
        testImagesDirectory.createDirectory();

        baselineImagesDirectory = tempDirectory.getChildFile("baseline_images");
        baselineImagesDirectory.createDirectory();

        diffImagesDirectory = tempDirectory.getChildFile("diff_images");
        diffImagesDirectory.createDirectory();

        // Initialize image comparison system
        imageComparator = std::make_unique<ImageComparator>();
        imageComparator->setTolerance(0.01); // 1% tolerance
        imageComparator->setMinimumDifferenceSize(1); // Minimum 1 pixel difference
    }

    void TearDown() override
    {
        imageComparator.reset();

        // Clean up test directories
        testImagesDirectory.deleteRecursively();
        baselineImagesDirectory.deleteRecursively();
        diffImagesDirectory.deleteRecursively();

        UITestFixture::TearDown();
    }

    void createTestScenarios()
    {
        // Create various UI components for testing
        testButton = std::make_unique<MockButton>("Test Button");
        testButton->setSize(120, 40);
        testButton->setColour(juce::TextButton::buttonColourId, juce::Colours::blue);

        testSlider = std::make_unique<MockSlider>("Test Slider");
        testSlider->setSize(200, 30);
        testSlider->setRange(0.0, 100.0, 1.0);
        testSlider->setValue(50.0);

        testComboBox = std::make_unique<MockComboBox>("Test ComboBox");
        testComboBox->setSize(150, 30);
        testComboBox->addItem("Option 1", 1);
        testComboBox->addItem("Option 2", 2);
        testComboBox->addItem("Option 3", 3);
        testComboBox->setSelectedId(2);

        testPanel = std::make_unique<MockPanel>("Test Panel");
        testPanel->setSize(300, 200);
        testPanel->setColour(juce::Panel::backgroundColourId, juce::Colours::lightgrey);

        // Add components to panel
        testPanel->addAndMakeVisible(testButton.get());
        testPanel->addAndMakeVisible(testSlider.get());
        testPanel->addAndMakeVisible(testComboBox.get());

        testButton->setTopLeftPosition(20, 20);
        testSlider->setTopLeftPosition(20, 80);
        testComboBox->setTopLeftPosition(20, 130);

        testWindow->addAndMakeVisible(testPanel.get());
        testPanel->setCentrePosition(testWindow->getLocalBounds().getCentre());

        processUIEvents(100);
    }

    juce::Image captureComponentSnapshot(juce::Component* component)
    {
        if (component == nullptr)
            return juce::Image();

        auto bounds = component->getLocalBounds();
        juce::Image snapshot(juce::Image::PixelFormat::ARGB, bounds.getWidth(), bounds.getHeight(), true);

        juce::Graphics g(snapshot);
        component->paintEntireComponent(g, false);

        return snapshot;
    }

    bool saveSnapshotForComparison(const juce::Image& image, const juce::String& testName, bool isBaseline = false)
    {
        juce::File targetDirectory = isBaseline ? baselineImagesDirectory : testImagesDirectory;
        juce::File imageFile = targetDirectory.getChildFile(testName + ".png");

        juce::PNGImageFormat pngFormat;
        std::unique_ptr<juce::FileOutputStream> outputStream(imageFile.createOutputStream());

        if (outputStream != nullptr)
        {
            return pngFormat.writeImageToStream(image, *outputStream);
        }

        return false;
    }

    juce::Image loadSnapshot(const juce::String& testName, bool isBaseline = true)
    {
        juce::File sourceDirectory = isBaseline ? baselineImagesDirectory : testImagesDirectory;
        juce::File imageFile = sourceDirectory.getChildFile(testName + ".png");

        if (!imageFile.existsAsFile())
            return juce::Image();

        juce::PNGImageFormat pngFormat;
        std::unique_ptr<juce::FileInputStream> inputStream(imageFile.createInputStream());

        if (inputStream != nullptr)
        {
            return pngFormat.loadImage(*inputStream);
        }

        return juce::Image();
    }

    struct ComparisonResult
    {
        bool identical = false;
        double similarityScore = 0.0;
        int pixelDifferenceCount = 0;
        juce::Rectangle<int> differenceRegion;
        juce::Image diffImage;
        std::vector<juce::Point<int>> differencePixels;
    };

    ComparisonResult compareWithBaseline(const juce::Image& testImage, const juce::String& testName)
    {
        ComparisonResult result;

        juce::Image baselineImage = loadSnapshot(testName, true);

        if (!baselineImage.isValid())
        {
            // No baseline exists, create one
            saveSnapshotForComparison(testImage, testName, true);
            result.identical = true;
            result.similarityScore = 1.0;
            return result;
        }

        // Compare images
        auto compareResult = TestUtils::compareImages(testImage, baselineImage, imageComparator->getTolerance());

        result.identical = compareResult.identical;
        result.similarityScore = compareResult.similarityScore;
        result.pixelDifferenceCount = compareResult.pixelDifferenceCount;
        result.differenceRegion = compareResult.differenceRegion;

        if (!result.identical)
        {
            // Create difference visualization
            result.diffImage = createDifferenceImage(testImage, baselineImage);

            // Save diff image
            juce::File diffFile = diffImagesDirectory.getChildFile(testName + "_diff.png");
            juce::PNGImageFormat pngFormat;
            std::unique_ptr<juce::FileOutputStream> outputStream(diffFile.createOutputStream());

            if (outputStream != nullptr)
            {
                pngFormat.writeImageToStream(result.diffImage, *outputStream);
            }
        }

        return result;
    }

    juce::Image createDifferenceImage(const juce::Image& image1, const juce::Image& image2)
    {
        if (image1.getBounds() != image2.getBounds())
            return juce::Image();

        auto bounds = image1.getBounds();
        juce::Image diffImage(juce::Image::PixelFormat::ARGB, bounds.getWidth(), bounds.getHeight(), true);

        juce::Image::BitmapData imageData1(image1, juce::Image::BitmapData::readOnly);
        juce::Image::BitmapData imageData2(image2, juce::Image::BitmapData::readOnly);
        juce::Image::BitmapData diffData(diffImage, juce::Image::BitmapData::writeOnly);

        for (int y = 0; y < bounds.getHeight(); ++y)
        {
            for (int x = 0; x < bounds.getWidth(); ++x)
            {
                auto pixel1 = imageData1.getPixelColour(x, y);
                auto pixel2 = imageData2.getPixelColour(x, y);

                if (pixel1 != pixel2)
                {
                    // Highlight differences in red
                    diffData.setPixelColour(x, y, juce::Colours::red);
                }
                else
                {
                    // Keep original pixel
                    diffData.setPixelColour(x, y, pixel1);
                }
            }
        }

        return diffImage;
    }

    std::unique_ptr<ImageComparator> imageComparator;
    juce::File testImagesDirectory;
    juce::File baselineImagesDirectory;
    juce::File diffImagesDirectory;

    std::unique_ptr<MockButton> testButton;
    std::unique_ptr<MockSlider> testSlider;
    std::unique_ptr<MockComboBox> testComboBox;
    std::unique_ptr<MockPanel> testPanel;

    class ImageComparator
    {
    public:
        void setTolerance(double tolerance) { this->tolerance = tolerance; }
        double getTolerance() const { return tolerance; }

        void setMinimumDifferenceSize(int size) { minDifferenceSize = size; }
        int getMinimumDifferenceSize() const { return minDifferenceSize; }

        TestUtils::ImageComparisonResult compare(const juce::Image& image1, const juce::Image& image2)
        {
            TestUtils::ImageComparisonResult result;

            if (image1.getBounds() != image2.getBounds())
            {
                result.identical = false;
                result.similarityScore = 0.0;
                return result;
            }

            auto bounds = image1.getBounds();
            int totalPixels = bounds.getWidth() * bounds.getHeight();
            int matchingPixels = 0;
            int differencePixels = 0;

            juce::Rectangle<int> minDiffRect(bounds.getWidth(), bounds.getHeight(), 0, 0);

            juce::Image::BitmapData data1(image1, juce::Image::BitmapData::readOnly);
            juce::Image::BitmapData data2(image2, juce::Image::BitmapData::readOnly);

            for (int y = 0; y < bounds.getHeight(); ++y)
            {
                for (int x = 0; x < bounds.getWidth(); ++x)
                {
                    auto pixel1 = data1.getPixelColour(x, y);
                    auto pixel2 = data2.getPixelColour(x, y);

                    if (areColorsSimilar(pixel1, pixel2))
                    {
                        matchingPixels++;
                    }
                    else
                    {
                        differencePixels++;
                        minDiffRect = minDiffRect.getUnion({x, y, 1, 1});
                    }
                }
            }

            result.identical = (differencePixels == 0);
            result.similarityScore = static_cast<double>(matchingPixels) / totalPixels;
            result.pixelDifferenceCount = differencePixels;
            result.differenceRegion = minDiffRect;

            return result;
        }

    private:
        double tolerance = 0.01;
        int minDifferenceSize = 1;

        bool areColorsSimilar(const juce::Colour& color1, const juce::Colour& color2)
        {
            double rDiff = std::abs(color1.getRed() - color2.getRed()) / 255.0;
            double gDiff = std::abs(color1.getGreen() - color2.getGreen()) / 255.0;
            double bDiff = std::abs(color1.getBlue() - color2.getBlue()) / 255.0;
            double aDiff = std::abs(color1.getAlpha() - color2.getAlpha()) / 255.0;

            double totalDiff = (rDiff + gDiff + bDiff + aDiff) / 4.0;
            return totalDiff <= tolerance;
        }
    };
};

/**
 * @brief Test visual regression for basic components
 */
TEST_F(VisualRegressionTest, BasicComponents)
{
    createTestScenarios();

    // Test button visual regression
    auto buttonSnapshot = captureComponentSnapshot(testButton.get());
    auto buttonResult = compareWithBaseline(buttonSnapshot, "test_button");

    EXPECT_TRUE(buttonResult.identical || buttonResult.similarityScore >= 0.99)
        << "Button visual regression detected. Similarity: " << buttonResult.similarityScore
        << " Differences: " << buttonResult.pixelDifferenceCount;

    // Test slider visual regression
    auto sliderSnapshot = captureComponentSnapshot(testSlider.get());
    auto sliderResult = compareWithBaseline(sliderSnapshot, "test_slider");

    EXPECT_TRUE(sliderResult.identical || sliderResult.similarityScore >= 0.99)
        << "Slider visual regression detected. Similarity: " << sliderResult.similarityScore
        << " Differences: " << sliderResult.pixelDifferenceCount;

    // Test combo box visual regression
    auto comboBoxSnapshot = captureComponentSnapshot(testComboBox.get());
    auto comboBoxResult = compareWithBaseline(comboBoxSnapshot, "test_combobox");

    EXPECT_TRUE(comboBoxResult.identical || comboBoxResult.similarityScore >= 0.99)
        << "ComboBox visual regression detected. Similarity: " << comboBoxResult.similarityScore
        << " Differences: " << comboBoxResult.pixelDifferenceCount;
}

/**
 * @brief Test visual regression for complex layouts
 */
TEST_F(VisualRegressionTest, ComplexLayouts)
{
    createTestScenarios();

    // Test panel with all components
    auto panelSnapshot = captureComponentSnapshot(testPanel.get());
    auto panelResult = compareWithBaseline(panelSnapshot, "test_panel");

    EXPECT_TRUE(panelResult.identical || panelResult.similarityScore >= 0.98)
        << "Panel visual regression detected. Similarity: " << panelResult.similarityScore
        << " Differences: " << panelResult.pixelDifferenceCount;

    // Test layout changes
    testButton->setTopLeftPosition(50, 20);
    testSlider->setTopLeftPosition(50, 80);
    testComboBox->setTopLeftPosition(50, 130);

    processUIEvents(50);

    auto modifiedPanelSnapshot = captureComponentSnapshot(testPanel.get());
    auto modifiedResult = compareWithBaseline(modifiedPanelSnapshot, "test_panel_modified_layout");

    EXPECT_FALSE(modifiedResult.identical) << "Modified layout should be different from baseline";
    EXPECT_GT(modifiedResult.pixelDifferenceCount, 0) << "Modified layout should have pixel differences";
}

/**
 * @brief Test visual regression for theme changes
 */
TEST_F(VisualRegressionTest, ThemeChanges)
{
    createTestScenarios();

    // Capture baseline (default theme)
    auto baselineSnapshot = captureComponentSnapshot(testPanel.get());
    saveSnapshotForComparison(baselineSnapshot, "test_panel_default_theme", true);

    // Apply dark theme
    testPanel->setColour(juce::Panel::backgroundColourId, juce::Colour(30, 30, 30));
    testButton->setColour(juce::TextButton::buttonColourId, juce::Colour(60, 60, 60));

    processUIEvents(50);

    auto darkThemeSnapshot = captureComponentSnapshot(testPanel.get());
    auto darkThemeResult = compareWithBaseline(darkThemeSnapshot, "test_panel_dark_theme");

    EXPECT_FALSE(darkThemeResult.identical) << "Dark theme should be different from default theme";
    EXPECT_GT(darkThemeResult.pixelDifferenceCount, 0) << "Dark theme should have pixel differences";

    // Verify dark theme snapshot saved
    EXPECT_TRUE(saveSnapshotForComparison(darkThemeSnapshot, "test_panel_dark_theme", true));
}

/**
 * @brief Test visual regression for component states
 */
TEST_F(VisualRegressionTest, ComponentStates)
{
    createTestScenarios();

    // Test normal button state
    auto normalButtonSnapshot = captureComponentSnapshot(testButton.get());
    auto normalResult = compareWithBaseline(normalButtonSnapshot, "test_button_normal");

    // Test hover state
    testButton->setMouseOver(true);
    testButton->repaint();
    processUIEvents(50);

    auto hoverButtonSnapshot = captureComponentSnapshot(testButton.get());
    auto hoverResult = compareWithBaseline(hoverButtonSnapshot, "test_button_hover");

    EXPECT_FALSE(hoverResult.identical) << "Hover state should be different from normal state";

    // Test pressed state
    testButton->setMouseOver(false);
    testButton->setToggleState(true, juce::dontSendNotification);
    testButton->repaint();
    processUIEvents(50);

    auto pressedButtonSnapshot = captureComponentSnapshot(testButton.get());
    auto pressedResult = compareWithBaseline(pressedButtonSnapshot, "test_button_pressed");

    EXPECT_FALSE(pressedResult.identical) << "Pressed state should be different from normal state";

    // Test disabled state
    testButton->setEnabled(false);
    testButton->repaint();
    processUIEvents(50);

    auto disabledButtonSnapshot = captureComponentSnapshot(testButton.get());
    auto disabledResult = compareWithBaseline(disabledButtonSnapshot, "test_button_disabled");

    EXPECT_FALSE(disabledResult.identical) << "Disabled state should be different from normal state";
}

/**
 * @brief Test visual regression for animations
 */
TEST_F(VisualRegressionTest, Animations)
{
    createTestScenarios();

    // Test animation start state
    auto startSnapshot = captureComponentSnapshot(testButton.get());
    saveSnapshotForComparison(startSnapshot, "test_animation_start", true);

    // Simulate animation progress
    float animationProgress = 0.5f;
    testButton->setAlpha(0.5f); // 50% opacity
    testButton->setTopLeftPosition(20 + static_cast<int>(50 * animationProgress), 20);

    processUIEvents(50);

    auto progressSnapshot = captureComponentSnapshot(testButton.get());
    auto progressResult = compareWithBaseline(progressSnapshot, "test_animation_progress");

    EXPECT_FALSE(progressResult.identical) << "Animation progress should be different from start state";
    EXPECT_GT(progressResult.pixelDifferenceCount, 0) << "Animation should have visible differences";

    // Test animation completion
    testButton->setAlpha(1.0f);
    testButton->setTopLeftPosition(70, 20);

    processUIEvents(50);

    auto completeSnapshot = captureComponentSnapshot(testButton.get());
    auto completeResult = compareWithBaseline(completeSnapshot, "test_animation_complete");

    EXPECT_FALSE(completeResult.identical) << "Animation completion should be different from start state";
}

/**
 * @brief Test visual regression for different screen sizes
 */
TEST_F(VisualRegressionTest, DifferentScreenSizes)
{
    createTestScenarios();

    // Test small size
    testPanel->setSize(200, 150);
    processUIEvents(50);

    auto smallSnapshot = captureComponentSnapshot(testPanel.get());
    auto smallResult = compareWithBaseline(smallSnapshot, "test_panel_small_size");

    // Test medium size
    testPanel->setSize(300, 200);
    processUIEvents(50);

    auto mediumSnapshot = captureComponentSnapshot(testPanel.get());
    auto mediumResult = compareWithBaseline(mediumSnapshot, "test_panel_medium_size");

    // Test large size
    testPanel->setSize(500, 400);
    processUIStates(50);

    auto largeSnapshot = captureComponentSnapshot(testPanel.get());
    auto largeResult = compareWithBaseline(largeSnapshot, "test_panel_large_size");

    // All sizes should be saved as baselines for future comparison
    saveSnapshotForComparison(smallSnapshot, "test_panel_small_size", true);
    saveSnapshotForComparison(mediumSnapshot, "test_panel_medium_size", true);
    saveSnapshotForComparison(largeSnapshot, "test_panel_large_size", true);
}

/**
 * @brief Test visual regression for high DPI displays
 */
TEST_F(VisualRegressionTest, HighDPIDisplays)
{
    createTestScenarios();

    // Simulate high DPI scaling
    float scaleFactor = 2.0f;
    testPanel->setSize(static_cast<int>(300 * scaleFactor), static_cast<int>(200 * scaleFactor));

    // Scale component sizes for high DPI
    testButton->setSize(static_cast<int>(120 * scaleFactor), static_cast<int>(40 * scaleFactor));
    testSlider->setSize(static_cast<int>(200 * scaleFactor), static_cast<int>(30 * scaleFactor));
    testComboBox->setSize(static_cast<int>(150 * scaleFactor), static_cast<int>(30 * scaleFactor));

    // Reposition for scaled size
    testButton->setTopLeftPosition(static_cast<int>(20 * scaleFactor), static_cast<int>(20 * scaleFactor));
    testSlider->setTopLeftPosition(static_cast<int>(20 * scaleFactor), static_cast<int>(80 * scaleFactor));
    testComboBox->setTopLeftPosition(static_cast<int>(20 * scaleFactor), static_cast<int>(130 * scaleFactor));

    processUIEvents(100);

    auto highDPISnapshot = captureComponentSnapshot(testPanel.get());
    auto highDPIResult = compareWithBaseline(highDPISnapshot, "test_panel_high_dpi");

    // High DPI snapshot should be saved as baseline
    saveSnapshotForComparison(highDPISnapshot, "test_panel_high_dpi", true);

    // Verify high DPI image is larger than standard DPI
    EXPECT_GT(highDPISnapshot.getWidth(), 300);
    EXPECT_GT(highDPISnapshot.getHeight(), 200);
}

/**
 * @brief Test visual regression performance
 */
TEST_F(VisualRegressionTest, Performance)
{
    createTestScenarios();

    const int numSnapshots = 50;
    std::vector<juce::Image> snapshots;

    startPerformanceMeasurement();

    for (int i = 0; i < numSnapshots; ++i)
    {
        // Modify component slightly
        testButton->setTopLeftPosition(20 + i, 20);
        processUIEvents(10);

        // Capture snapshot
        auto snapshot = captureComponentSnapshot(testButton.get());
        snapshots.push_back(snapshot);

        // Compare with baseline
        auto result = compareWithBaseline(snapshot, "test_button_performance");
    }

    stopPerformanceMeasurement();

    // Performance test should complete within reasonable time
    EXPECT_LT(getLastExecutionTime(), 5000.0) // 5 seconds max
        << "Visual regression performance test took too long: " << getLastExecutionTime() << "ms";

    EXPECT_EQ(snapshots.size(), numSnapshots);
}

/**
 * @brief Test visual regression memory usage
 */
TEST_F(VisualRegressionTest, MemoryUsage)
{
    createTestScenarios();

    MemoryUsage baseline = TestUtils::getMemoryUsage();

    const int numSnapshots = 100;
    std::vector<juce::Image> snapshots;

    for (int i = 0; i < numSnapshots; ++i)
    {
        // Create snapshot
        auto snapshot = captureComponentSnapshot(testPanel.get());
        snapshots.push_back(snapshot);

        // Modify component
        testButton->setTopLeftPosition(20 + i % 10, 20);
        processUIEvents(10);
    }

    MemoryUsage afterCreation = TestUtils::getMemoryUsage();

    // Clear snapshots
    snapshots.clear();

    MemoryUsage afterCleanup = TestUtils::getMemoryUsage();

    // Memory should be properly cleaned up
    EXPECT_LT(afterCleanup.usageDeltaBytes, afterCreation.usageDeltaBytes);
    EXPECT_LT(afterCleanup.usageDeltaBytes, 50 * 1024 * 1024); // Less than 50MB overhead
}

/**
 * @brief Test visual regression with text rendering
 */
TEST_F(VisualRegressionTest, TextRendering)
{
    createTestScenarios();

    // Test different font sizes
    std::vector<float> fontSizes = {10.0f, 12.0f, 14.0f, 16.0f, 18.0f, 24.0f};

    for (float fontSize : fontSizes)
    {
        juce::Font testFont(fontSize);
        testButton->setFont(testFont);
        testButton->repaint();

        processUIEvents(50);

        auto textSnapshot = captureComponentSnapshot(testButton.get());
        auto textResult = compareWithBaseline(textSnapshot, "test_button_text_size_" + juce::String(static_cast<int>(fontSize)));

        // Save baseline if it doesn't exist
        if (!baselineImagesDirectory.getChildFile("test_button_text_size_" + juce::String(static_cast<int>(fontSize)) + ".png").existsAsFile())
        {
            saveSnapshotForComparison(textSnapshot, "test_button_text_size_" + juce::String(static_cast<int>(fontSize)), true);
        }
    }

    // Test different font styles
    std::vector<juce::Font> fontStyles = {
        juce::Font(14.0f, juce::Font::plain),
        juce::Font(14.0f, juce::Font::bold),
        juce::Font(14.0f, juce::Font::italic),
        juce::Font(14.0f, juce::Font::bold | juce::Font::italic)
    };

    int styleIndex = 0;
    for (const auto& font : fontStyles)
    {
        testButton->setFont(font);
        testButton->repaint();

        processUIEvents(50);

        auto styleSnapshot = captureComponentSnapshot(testButton.get());
        auto styleResult = compareWithBaseline(styleSnapshot, "test_button_text_style_" + juce::String(styleIndex));

        if (!baselineImagesDirectory.getChildFile("test_button_text_style_" + juce::String(styleIndex) + ".png").existsAsFile())
        {
            saveSnapshotForComparison(styleSnapshot, "test_button_text_style_" + juce::String(styleIndex), true);
        }

        ++styleIndex;
    }
}

/**
 * @brief Test visual regression with custom painting
 */
TEST_F(VisualRegressionTest, CustomPainting)
{
    // Create component with custom painting
    class CustomPaintedComponent : public juce::Component
    {
    public:
        CustomPaintedComponent()
        {
            setSize(200, 200);
        }

        void paint(juce::Graphics& g) override
        {
            // Custom gradient background
            juce::ColourGradient gradient(
                juce::Colours::blue, 0, 0,
                juce::Colours::purple, getWidth(), getHeight(),
                false
            );
            g.setGradientFill(gradient);
            g.fillAll(getLocalBounds());

            // Custom shapes
            g.setColour(juce::Colours::white);
            g.drawEllipse(50, 50, 100, 100, 3.0f);

            g.setColour(juce::Colours::yellow);
            g.drawRect(120, 120, 60, 60, 2.0f);

            // Custom text
            g.setColour(juce::Colours::white);
            g.setFont(16.0f, juce::Font::bold);
            g.drawText("Custom Paint", 10, 170, 180, 20, juce::Justification::centred);
        }
    };

    auto customComponent = std::make_unique<CustomPaintedComponent>();
    testWindow->addAndMakeVisible(customComponent.get());
    customComponent->setCentrePosition(testWindow->getLocalBounds().getCentre());

    processUIEvents(100);

    auto customSnapshot = captureComponentSnapshot(customComponent.get());
    auto customResult = compareWithBaseline(customSnapshot, "test_custom_painted_component");

    if (!baselineImagesDirectory.getChildFile("test_custom_painted_component.png").existsAsFile())
    {
        saveSnapshotForComparison(customSnapshot, "test_custom_painted_component", true);
    }
}

/**
 * @brief Test visual regression batch processing
 */
TEST_F(VisualRegressionTest, BatchProcessing)
{
    createTestScenarios();

    std::vector<std::pair<juce::Component*, juce::String>> testComponents = {
        {testButton.get(), "test_button_batch"},
        {testSlider.get(), "test_slider_batch"},
        {testComboBox.get(), "test_combobox_batch"},
        {testPanel.get(), "test_panel_batch"}
    };

    // Process all components in batch
    std::vector<ComparisonResult> results;

    startPerformanceMeasurement();

    for (const auto& [component, testName] : testComponents)
    {
        auto snapshot = captureComponentSnapshot(component);
        auto result = compareWithBaseline(snapshot, testName);
        results.push_back(result);
    }

    stopPerformanceMeasurement();

    // Verify all components were processed
    EXPECT_EQ(results.size(), testComponents.size());

    // Batch processing should be reasonably fast
    EXPECT_LT(getLastExecutionTime(), 2000.0) // 2 seconds max
        << "Batch processing took too long: " << getLastExecutionTime() << "ms";

    // Check for any regressions
    for (const auto& result : results)
    {
        EXPECT_TRUE(result.identical || result.similarityScore >= 0.99)
            << "Visual regression detected in batch processing";
    }
}

// Run visual regression tests
int runVisualRegressionTests(int argc, char** argv)
{
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}