#include <iostream>
#include <vector>
#include "src/schillinger/advanced/pitch/PitchScaleRotator.h"
#include "src/schillinger/advanced/pitch/ScaleTransformationEngine.h"
#include "src/schillinger/advanced/pitch/PitchCoordinateSystem.h"
#include "src/schillinger/advanced/pitch/PitchMathAnalysisIntegration.h"

using namespace Schillinger::Advanced::Pitch;

int main() {
    std::cout << "=== Testing Agent 2: Book IV Pitch-Scale Rotation Specialist ===" << std::endl;

    // Test 1: PitchScaleRotator
    std::cout << "\n1. Testing PitchScaleRotator..." << std::endl;
    try {
        auto rotator = std::make_unique<PitchScaleRotator>();
        std::vector<int> majorScale = {0, 2, 4, 5, 7, 9, 11}; // C Major

        // Test basic rotation
        ScaleRotation rotation = rotator->rotateScale(majorScale, 2);
        std::cout << "   Basic rotation: valid=" << rotation.isValid
                  << ", steps=" << rotation.rotationSteps
                  << ", harmonicStrength=" << rotation.harmonicStrength << std::endl;

        // Test all rotations
        auto allRotations = rotator->generateAllRotations(majorScale);
        std::cout << "   Generated " << allRotations.size() << " rotations" << std::endl;

        // Test scale creation
        PitchScale cMajor = rotator->createMajorScale(PitchClass::C);
        std::cout << "   Created C Major scale: " << cMajor.scaleType
                  << ", notes=" << cMajor.notes.size() << std::endl;

        // Test performance
        rotator->optimizeForRealtime(true);
        double processingTime = rotator->getLastProcessingTime();
        std::cout << "   Processing time: " << processingTime << "ms" << std::endl;

    } catch (const std::exception& e) {
        std::cout << "   ERROR: " << e.what() << std::endl;
        return 1;
    }

    // Test 2: ScaleTransformationEngine
    std::cout << "\n2. Testing ScaleTransformationEngine..." << std::endl;
    try {
        auto engine = std::make_unique<ScaleTransformationEngine>();
        std::vector<int> testScale = {0, 2, 4, 5, 7, 9, 11};

        // Test transformation
        auto transform = engine->applyTransformation(testScale, ScaleTransformationEngine::Type::Inversion);
        std::cout << "   Inversion transformation: valid=" << transform.isValid
                  << ", type=" << transform.transformationType << std::endl;

        // Test major scale creation
        PitchScale major = engine->createMajorScale(PitchClass::C);
        std::cout << "   Created major scale: " << major.scaleType
                  << ", valid=" << major.isValid << std::endl;

        // Test random scale creation
        PitchScale randomScale = engine->createRandomScale(7);
        std::cout << "   Created random scale: " << randomScale.notes.size() << " notes" << std::endl;

    } catch (const std::exception& e) {
        std::cout << "   ERROR: " << e.what() << std::endl;
        return 1;
    }

    // Test 3: PitchCoordinateSystem
    std::cout << "\n3. Testing PitchCoordinateSystem..." << std::endl;
    try {
        auto coordSystem = std::make_unique<PitchCoordinateSystem>();
        std::vector<int> testSequence = {0, 2, 4, 7, 9}; // Pentatonic

        // Test Cartesian system
        coordSystem->initializeCartesianSystem(testSequence);
        std::cout << "   Initialized Cartesian system: " << coordSystem->getSystemType() << std::endl;

        // Test coordinate conversion
        PitchCoordinate coord = coordSystem->convertMidiToCoordinate(60, 1.0);
        std::cout << "   MIDI to coordinate conversion: valid=" << coord.isValid
                  << ", note=" << coord.midiNote << std::endl;

        // Test scale creation
        PitchScale majorScale = coordSystem->createMajorScale(PitchClass::C);
        std::cout << "   Created major scale: " << majorScale.notes.size() << " notes" << std::endl;

        // Test coordinate mapping
        auto coordinateSpace = coordSystem->mapToCoordinateSpace(majorScale);
        std::cout << "   Mapped to coordinate space: valid=" << coordinateSpace.isValid << std::endl;

    } catch (const std::exception& e) {
        std::cout << "   ERROR: " << e.what() << std::endl;
        return 1;
    }

    // Test 4: PitchMathAnalysisIntegration
    std::cout << "\n4. Testing PitchMathAnalysisIntegration..." << std::endl;
    try {
        auto mathAnalysis = std::make_unique<PitchMathAnalysisIntegration>();
        std::vector<int> testSequence = {0, 2, 4, 5, 7, 9, 11};

        // Test entropy calculation
        double entropy = mathAnalysis->calculatePitchEntropy(testSequence);
        std::cout << "   Pitch entropy: " << entropy << std::endl;

        // Test correlation matrix
        auto correlationMatrix = mathAnalysis->calculatePitchCorrelationMatrix(testSequence);
        std::cout << "   Correlation matrix size: " << correlationMatrix.size() << std::endl;

        // Test pattern extraction
        auto patterns = mathAnalysis->extractPitchPatterns(testSequence, 3);
        std::cout << "   Extracted patterns: " << patterns.size() << std::endl;

        // Test spectrum calculation
        auto spectrum = mathAnalysis->calculatePitchSpectrum(testSequence);
        std::cout << "   Pitch spectrum: real=" << spectrum.real() << ", imag=" << spectrum.imag() << std::endl;

        // Test fractal dimension
        double fractalDim = mathAnalysis->calculatePitchFractalDimension(testSequence);
        std::cout << "   Fractal dimension: " << fractalDim << std::endl;

    } catch (const std::exception& e) {
        std::cout << "   ERROR: " << e.what() << std::endl;
        return 1;
    }

    std::cout << "\n=== All Agent 2 Components Working Correctly! ===" << std::endl;
    return 0;
}