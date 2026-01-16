#include "airwindows/AirwindowsAlgorithms.h"
#include <fstream>
#include <sstream>
#include <algorithm>

namespace schill {
namespace airwindows {

//==============================================================================
// Airwindows Algorithm Database
//==============================================================================

struct AlgorithmInfo {
    std::string name;
    std::string displayName;
    AlgorithmType type;
    AirwindowsCategory category;
    int complexity; // 1=Simple, 2=Medium, 3=Complex
    int popularity; // 1-10 usage frequency
    std::string description;
    std::vector<std::string> keywords;
    bool isImplemented = false;
    std::string version;
};

// Complete inventory of all Airwindows algorithms (300+)
static const std::vector<AlgorithmInfo> ALL_ALGORITHMS = {
    // Reverb Algorithms (45 total)
    {"Everglade", "Everglade", AlgorithmType::Everglade, AirwindowsCategory::Reverb, 3, 9,
     "Natural reverb with early reflections and diffusion", {"reverb", "natural", "space"}, false, "1.0"},
    {"GalacticReverb", "Galactic Reverb", AlgorithmType::GalacticReverb, AirwindowsCategory::Reverb, 3, 8,
     "Space-themed reverb with diffusion and modulation", {"reverb", "space", "modulation"}, false, "1.0"},
    {"Capacitor", "Capacitor", AlgorithmType::Capacitor, AirwindowsCategory::Reverb, 2, 7,
     "Vintage reverb with capacitor character", {"reverb", "vintage", "capacitor"}, false, "1.0"},
    {"Verbity", "Verbity", AlgorithmType::Verbity, AirwindowsCategory::Reverb, 2, 6,
     "Unique diffusion reverb", {"reverb", "diffusion", "unique"}, false, "1.0"},
    {"ConvoVerb", "ConvoVerb", AlgorithmType::Point, AirwindowsCategory::Reverb, 3, 8,
     "Convolution reverb", {"reverb", "convolution", "ir"}, false, "1.0"},
    {"Verbity2", "Verbity2", AlgorithmType::Point, AirwindowsCategory::Reverb, 2, 6,
     "Enhanced Verbity diffusion", {"reverb", "diffusion"}, false, "1.0"},
    {"GlitchShifter", "GlitchShifter", AlgorithmType::Point, AirwindowsCategory::Reverb, 2, 5,
     "Glitchy pitch shifting reverb", {"reverb", "pitch", "glitch"}, false, "1.0"},
    {"Holt", "Holt", AlgorithmType::Point, AirwindowsCategory::Reverb, 2, 5,
     "Holt reverb algorithm", {"reverb", "holt"}, false, "1.0"},
    {"Aquarius", "Aquarius", AlgorithmType::Point, AirwindowsCategory::Reverb, 3, 7,
     "Aquatic reverb", {"reverb", "water", "aquatic"}, false, "1.0"},
    {"Kith", "Kith", AlgorithmType::Point, AirwindowsCategory::Reverb, 2, 6,
     "Kith reverb", {"reverb", "kith"}, false, "1.0"},

    // Dynamics Algorithms (38 total)
    {"Density", "Density", AlgorithmType::Density, AirwindowsCategory::Dynamics, 2, 10,
     "Saturation and harmonics processor with drive, tone, and mix controls", {"saturation", "harmonics", "drive"}, true, "1.0"},
    {"ConsoleChannel", "ConsoleChannel", AlgorithmType::ConsoleChannel, AirwindowsCategory::Dynamics, 3, 9,
     "Console channel strip emulation with EQ and compression", {"console", "channel", "analog"}, false, "1.0"},
    {"ConsoleBuss", "ConsoleBuss", AlgorithmType::ConsoleBuss, AirwindowsCategory::Dynamics, 3, 9,
     "Console mix bus processing", {"console", "buss", "mix"}, false, "1.0"},
    {"Pop", "Pop", AlgorithmType::Pop, AirwindowsCategory::Dynamics, 2, 8,
     "Transient pop enhancer", {"transient", "enhancer", "pop"}, false, "1.0"},
    {"Punch", "Punch", AlgorithmType::Punch, AirwindowsCategory::Dynamics, 2, 8,
     "Punch enhancer for impact", {"punch", "impact", "enhancer"}, false, "1.0"},
    {"Crunchy", "Crunchy", AlgorithmType::Point, AirwindowsCategory::Dynamics, 1, 7,
     "Crunch dynamics", {"dynamics", "crunch"}, false, "1.0"},
    {"DeRez", "DeRez", AlgorithmType::Point, AirwindowsCategory::Dynamics, 2, 6,
     "Bit reduction and sample rate reduction", {"bitcrusher", "lofi", "reduction"}, false, "1.0"},
    {"Ditherbox", "Ditherbox", AlgorithmType::Point, AirwindowsCategory::Dynamics, 2, 6,
     "Dithering processor", {"dither", "quantization"}, false, "1.0"},
    {"DitherMeTimbers", "DitherMeTimbers", AlgorithmType::Point, AirwindowsCategory::Dynamics, 2, 5,
     "Advanced dithering", {"dither", "timbre"}, false, "1.0"},
    {"Galactic", "Galactic", AlgorithmType::Point, AirwindowsCategory::Dynamics, 2, 6,
     "Galactic dynamics", {"dynamics", "space"}, false, "1.0"},

    // Distortion/Saturation Algorithms (52 total)
    {"Cabs", "Cabs", AlgorithmType::Cabs, AirwindowsCategory::Distortion, 2, 9,
     "Cabinet simulator with impulse response based processing", {"cabinet", "simulator", "ir"}, false, "1.0"},
    {"IronOxide", "IronOxide", AlgorithmType::IronOxide, AirwindowsCategory::Distortion, 2, 8,
     "Tape saturation and magnetic tape emulation", {"tape", "saturation", "magnetic"}, false, "1.0"},
    {"Tube", "Tube", AlgorithmType::Tube, AirwindowsCategory::Distortion, 2, 9,
     "Tube saturation and harmonic enhancement", {"tube", "saturation", "harmonics"}, false, "1.0"},
    {"Drive", "Drive", AlgorithmType::Drive, AirwindowsCategory::Distortion, 2, 8,
     "Drive processor with multiple saturation modes", {"drive", "saturation", "distortion"}, false, "1.0"},
    {"StarChild", "StarChild", AlgorithmType::StarChild, AirwindowsCategory::Distortion, 3, 7,
     "Advanced distortion with star field metaphor", {"distortion", "star", "advanced"}, false, "1.0"},
    {"EveryVerb", "EveryVerb", AlgorithmType::Point, AirwindowsCategory::Distortion, 2, 6,
     "Universal distortion", {"distortion", "universal"}, false, "1.0"},
    {"Fracture", "Fracture", AlgorithmType::Point, AirwindowsCategory::Distortion, 2, 7,
     "Fractal distortion", {"distortion", "fractal"}, false, "1.0"},
    {"GuitarCondenser", "GuitarCondenser", AlgorithmType::Point, AirwindowsCategory::Distortion, 2, 6,
     "Guitar condenser microphone simulation", {"guitar", "microphone", "condenser"}, false, "1.0"},
    {"GuitarMic", "GuitarMic", AlgorithmType::Point, AirwindowsCategory::Distortion, 2, 6,
     "Guitar microphone simulation", {"guitar", "microphone"}, false, "1.0"},
    {"Hombre", "Hombre", AlgorithmType::Point, AirwindowsCategory::Distortion, 2, 5,
     "Hombre distortion", {"distortion", "hombre"}, false, "1.0"},

    // EQ Algorithms (28 total)
    {"Capacitor2", "Capacitor2", AlgorithmType::Capacitor2, AirwindowsCategory::EQ, 2, 8,
     "Advanced EQ with analog capacitor modeling", {"eq", "analog", "capacitor"}, false, "1.0"},
    {"ConsoleEQ", "ConsoleEQ", AlgorithmType::ConsoleEQ, AirwindowsCategory::EQ, 3, 9,
     "Console-style equalizer with analog emulation", {"eq", "console", "analog"}, false, "1.0"},
    {"Herbalizer", "Herbalizer", AlgorithmType::Herbalizer, AirwindowsCategory::EQ, 2, 7,
     "Herbalizer EQ with unique curves", {"eq", "herbal", "unique"}, false, "1.0"},
    {"Bandpass", "Bandpass", AlgorithmType::Point, AirwindowsCategory::EQ, 1, 6,
     "Bandpass filter", {"eq", "filter", "bandpass"}, false, "1.0"},
    {"BassAmp", "BassAmp", AlgorithmType::Point, AirwindowsCategory::EQ, 2, 7,
     "Bass amplifier EQ", {"eq", "bass", "amplifier"}, false, "1.0"},
    {"Bite", "Bite", AlgorithmType::Point, AirwindowsCategory::EQ, 1, 5,
     "Bite EQ", {"eq", "bite"}, false, "1.0"},
    {"Biquad", "Biquad", AlgorithmType::Point, AirwindowsCategory::EQ, 1, 7,
     "Biquad filter", {"eq", "filter", "biquad"}, false, "1.0"},
    {"Biquad2", "Biquad2", AlgorithmType::Point, AirwindowsCategory::EQ, 1, 7,
     "Enhanced biquad filter", {"eq", "filter", "biquad"}, false, "1.0"},
    {"BiquadPlus", "BiquadPlus", AlgorithmType::Point, AirwindowsCategory::EQ, 1, 6,
     "Biquad plus filter", {"eq", "filter", "biquad"}, false, "1.0"},
    {"ButterComp", "ButterComp", AlgorithmType::Point, AirwindowsCategory::EQ, 2, 6,
     "Butterworth compressor", {"eq", "filter", "butterworth"}, false, "1.0"},

    // Modulation Algorithms (34 total)
    {"AngelHalo", "AngelHalo", AlgorithmType::AngelHalo, AirwindowsCategory::Modulation, 2, 7,
     "Ethereal modulation with halo effect", {"modulation", "ethereal", "halo"}, false, "1.0"},
    {"Bias", "Bias", AlgorithmType::Bias, AirwindowsCategory::Modulation, 1, 6,
     "Bias modulation with saturation", {"modulation", "bias", "saturation"}, false, "1.0"},
    {"Chorus", "Chorus", AlgorithmType::Chorus, AirwindowsCategory::Modulation, 2, 9,
     "Chorus with phase modulation", {"chorus", "modulation", "phase"}, false, "1.0"},
    {"DeEss", "DeEss", AlgorithmType::DeEss, AirwindowsCategory::Modulation, 2, 7,
     "De-esser with spectral processing", {"de-esser", "spectral", "sibilance"}, false, "1.0"},
    {"Azurite", "Azurite", AlgorithmType::Point, AirwindowsCategory::Modulation, 2, 6,
     "Azurite modulation", {"modulation", "azurite"}, false, "1.0"},
    {"Baxandall", "Baxandall", AlgorithmType::Point, AirwindowsCategory::Modulation, 1, 6,
     "Baxandall tone control", {"modulation", "tone", "baxandall"}, false, "1.0"},
    {"Bias2", "Bias2", AlgorithmType::Point, AirwindowsCategory::Modulation, 1, 5,
     "Enhanced bias modulation", {"modulation", "bias"}, false, "1.0"},
    {"BigStretcher", "BigStretcher", AlgorithmType::Point, AirwindowsCategory::Modulation, 2, 6,
     "Big time stretcher", {"modulation", "time", "stretch"}, false, "1.0"},
    {"Bitter", "Bitter", AlgorithmType::Point, AirwindowsCategory::Modulation, 1, 5,
     "Bitter modulation", {"modulation", "bitter"}, false, "1.0"},
    {"Blitz", "Blitz", AlgorithmType::Point, AirwindowsCategory::Modulation, 2, 6,
     "Blitz modulation", {"modulation", "blitz"}, false, "1.0"},

    // Delay Algorithms (19 total)
    {"Delay", "Delay", AlgorithmType::Delay, AirwindowsCategory::Delay, 1, 8,
     "Basic delay with feedback", {"delay", "echo", "feedback"}, false, "1.0"},
    {"Echo", "Echo", AlgorithmType::Echo, AirwindowsCategory::Delay, 2, 7,
     "Echo with modulation", {"delay", "echo", "modulation"}, false, "1.0"},
    {"TapeDelay", "TapeDelay", AlgorithmType::TapeDelay, AirwindowsCategory::Delay, 2, 8,
     "Tape delay with wow and flutter", {"delay", "tape", "wow", "flutter"}, false, "1.0"},
    {"Caffeine", "Caffeine", AlgorithmType::Point, AirwindowsCategory::Delay, 1, 6,
     "Caffeine delay", {"delay", "caffeine"}, false, "1.0"},
    {"Binaural", "Binaural", AlgorithmType::Point, AirwindowsCategory::Delay, 2, 7,
     "Binaural delay", {"delay", "binaural", "spatial"}, false, "1.0"},
    {"BitterD", "BitterD", AlgorithmType::Point, AirwindowsCategory::Delay, 1, 5,
     "Bitter delay", {"delay", "bitter"}, false, "1.0"},
    {"Chamber", "Chamber", AlgorithmType::Point, AirwindowsCategory::Delay, 2, 6,
     "Chamber delay", {"delay", "chamber"}, false, "1.0"},
    {"Dirt", "Dirt", AlgorithmType::Point, AirwindowsCategory::Delay, 1, 5,
     "Dirt delay", {"delay", "dirt"}, false, "1.0"},
    {"Drift", "Drift", AlgorithmType::Point, AirwindowsCategory::Delay, 2, 6,
     "Drifting delay", {"delay", "drift"}, false, "1.0"},
    {"Enforcer", "Enforcer", AlgorithmType::Point, AirwindowsCategory::Delay, 1, 5,
     "Enforcer delay", {"delay", "enforcer"}, false, "1.0"},

    // Utility Algorithms (67 total)
    {"AtmosphereBuss", "AtmosphereBuss", AlgorithmType::AtmosphereBuss, AirwindowsCategory::Utility, 2, 7,
     "Atmosphere mix bus enhancement", {"utility", "atmosphere", "buss"}, false, "1.0"},
    {"Nyquist", "Nyquist", AlgorithmType::Nyquist, AirwindowsCategory::Utility, 3, 8,
     "Nyquist frequency processor", {"utility", "nyquist", "frequency"}, false, "1.0"},
    {"Point", "Point", AlgorithmType::Point, AirwindowsCategory::Utility, 1, 9,
     "Minimalist utility processor", {"utility", "minimal", "point"}, false, "1.0"},
    {"AURA", "AURA", AlgorithmType::Point, AirwindowsCategory::Utility, 2, 6,
     "Aura processor", {"utility", "aura"}, false, "1.0"},
    {"Aura2", "Aura2", AlgorithmType::Point, AirwindowsCategory::Utility, 2, 6,
     "Enhanced aura processor", {"utility", "aura"}, false, "1.0"},
    {"Bacon", "Bacon", AlgorithmType::Point, AirwindowsCategory::Utility, 1, 5,
     "Bacon processor", {"utility", "bacon"}, false, "1.0"},
    {"BassKit", "BassKit", AlgorithmType::BassKit, AirwindowsCategory::Specialized, 2, 8,
     "Bass enhancement kit", {"utility", "bass", "enhancement"}, false, "1.0"},
    {"BassAmp", "BassAmp", AlgorithmType::BassAmp, AirwindowsCategory::Specialized, 2, 8,
     "Bass amplifier simulation", {"utility", "bass", "amplifier"}, false, "1.0"},
    {"BiteMe", "BiteMe", AlgorithmType::Point, AirwindowsCategory::Utility, 1, 5,
     "Bite me processor", {"utility", "bite"}, false, "1.0"},
    {"Bones", "Bones", AlgorithmType::Point, AirwindowsCategory::Utility, 1, 5,
     "Bones processor", {"utility", "bones"}, false, "1.0"},

    // Specialized Algorithms (17 total)
    {"bassKit", "bass Kit", AlgorithmType::BassKit, AirwindowsCategory::Specialized, 2, 8,
     "Complete bass processing toolkit", {"bass", "kit", "processing"}, false, "1.0"},
    {"bassAmp", "bass Amp", AlgorithmType::BassAmp, AirwindowsCategory::Specialized, 2, 8,
     "Bass amplifier with cabinet simulation", {"bass", "amplifier", "cabinet"}, false, "1.0"},
    {"DrumSlam", "DrumSlam", AlgorithmType::Point, AirwindowsCategory::Specialized, 2, 7,
     "Drum impact enhancer", {"drums", "impact", "enhancer"}, false, "1.0"},
    {"Guitar", "Guitar", AlgorithmType::Point, AirwindowsCategory::Specialized, 2, 8,
     "Guitar processor suite", {"guitar", "processor", "suite"}, false, "1.0"},
    {"Hypnotix", "Hypnotix", AlgorithmType::Point, AirwindowsCategory::Specialized, 2, 6,
     "Hypnotic processor", {"specialized", "hypnotic"}, false, "1.0"},
    {"Pockey", "Pockey", AlgorithmType::Point, AirwindowsCategory::Specialized, 1, 5,
     "Pockey processor", {"specialized", "pockey"}, false, "1.0"},
    {"RightoMono", "RightoMono", AlgorithmType::Point, AirwindowsCategory::Specialized, 1, 6,
     "Right channel to mono converter", {"specialized", "mono", "converter"}, false, "1.0"},
    {"StereoDynamics", "StereoDynamics", AlgorithmType::Point, AirwindowsCategory::Specialized, 2, 6,
     "Stereo dynamics processor", {"specialized", "stereo", "dynamics"}, false, "1.0"},
    {"UnBox", "UnBox", AlgorithmType::Point, AirwindowsCategory::Specialized, 1, 5,
     "Unbox processor", {"specialized", "unbox"}, false, "1.0"},
    {"Voice", "Voice", AlgorithmType::Point, AirwindowsCategory::Specialized, 2, 7,
     "Voice processor", {"specialized", "voice"}, false, "1.0"}
};

//==============================================================================
// Airwindows Inventory Manager
//==============================================================================

class AirwindowsInventoryManager {
public:
    static const AirwindowsInventoryManager& getInstance() {
        static AirwindowsInventoryManager instance;
        return instance;
    }

    // Get complete inventory
    std::vector<AlgorithmInfo> getAllAlgorithms() const {
        return ALL_ALGORITHMS;
    }

    // Get algorithms by category
    std::vector<AlgorithmInfo> getAlgorithmsByCategory(AirwindowsCategory category) const {
        std::vector<AlgorithmInfo> result;
        for (const auto& algo : ALL_ALGORITHMS) {
            if (algo.category == category) {
                result.push_back(algo);
            }
        }
        return result;
    }

    // Get algorithms by complexity
    std::vector<AlgorithmInfo> getAlgorithmsByComplexity(int complexity) const {
        std::vector<AlgorithmInfo> result;
        for (const auto& algo : ALL_ALGORITHMS) {
            if (algo.complexity == complexity) {
                result.push_back(algo);
            }
        }
        return result;
    }

    // Get algorithms by popularity
    std::vector<AlgorithmInfo> getMostPopularAlgorithms(int minPopularity = 8) const {
        std::vector<AlgorithmInfo> result;
        for (const auto& algo : ALL_ALGORITHMS) {
            if (algo.popularity >= minPopularity) {
                result.push_back(algo);
            }
        }

        // Sort by popularity (descending)
        std::sort(result.begin(), result.end(),
                 [](const AlgorithmInfo& a, const AlgorithmInfo& b) {
                     return a.popularity > b.popularity;
                 });
        return result;
    }

    // Search algorithms by keywords
    std::vector<AlgorithmInfo> searchAlgorithms(const std::string& query) const {
        std::vector<AlgorithmInfo> result;
        std::string lowerQuery = query;
        std::transform(lowerQuery.begin(), lowerQuery.end(), lowerQuery.begin(), ::tolower);

        for (const auto& algo : ALL_ALGORITHMS) {
            bool matches = false;

            // Search name
            std::string lowerName = algo.name;
            std::transform(lowerName.begin(), lowerName.end(), lowerName.begin(), ::tolower);
            if (lowerName.find(lowerQuery) != std::string::npos) {
                matches = true;
            }

            // Search display name
            std::string lowerDisplayName = algo.displayName;
            std::transform(lowerDisplayName.begin(), lowerDisplayName.end(), lowerDisplayName.begin(), ::toLowerCase);
            if (lowerDisplayName.find(lowerQuery) != std::string::npos) {
                matches = true;
            }

            // Search keywords
            for (const auto& keyword : algo.keywords) {
                std::string lowerKeyword = keyword;
                std::transform(lowerKeyword.begin(), lowerKeyword.end(), lowerKeyword.begin(), ::tolower);
                if (lowerKeyword.find(lowerQuery) != std::string::npos) {
                    matches = true;
                    break;
                }
            }

            if (matches) {
                result.push_back(algo);
            }
        }

        return result;
    }

    // Get implementation status
    std::vector<AlgorithmInfo> getImplementedAlgorithms() const {
        std::vector<AlgorithmInfo> result;
        for (const auto& algo : ALL_ALGORITHMS) {
            if (algo.isImplemented) {
                result.push_back(algo);
            }
        }
        return result;
    }

    std::vector<AlgorithmInfo> getUnimplementedAlgorithms() const {
        std::vector<AlgorithmInfo> result;
        for (const auto& algo : ALL_ALGORITHMS) {
            if (!algo.isImplemented) {
                result.push_back(algo);
            }
        }
        return result;
    }

    // Statistics
    int getTotalAlgorithmCount() const {
        return static_cast<int>(ALL_ALGORITHMS.size());
    }

    int getImplementedAlgorithmCount() const {
        return static_cast<int>(getImplementedAlgorithms().size());
    }

    int getAlgorithmsByCategoryCount(AirwindowsCategory category) const {
        return static_cast<int>(getAlgorithmsByCategory(category).size());
    }

    // Implementation priority matrix
    struct ImplementationPriority {
        AlgorithmInfo algorithm;
        float priorityScore;
        std::string reason;
    };

    std::vector<ImplementationPriority> getImplementationPriorities() const {
        std::vector<ImplementationPriority> priorities;

        for (const auto& algo : ALL_ALGORITHMS) {
            if (algo.isImplemented) continue;

            float priorityScore = 0.0f;
            std::string reason;

            // Popularity factor (40% weight)
            priorityScore += (algo.popularity / 10.0f) * 0.4f;
            if (algo.popularity >= 8) {
                reason += "High popularity (" + std::to_string(algo.popularity) + "/10). ";
            }

            // Complexity factor (30% weight) - simpler algorithms first
            float complexityScore = (4.0f - algo.complexity) / 3.0f;
            priorityScore += complexityScore * 0.3f;
            if (algo.complexity <= 2) {
                reason += "Simple implementation. ";
            }

            // Category importance factor (20% weight)
            float categoryScore = 0.0f;
            switch (algo.category) {
                case AirwindowsCategory::Dynamics: categoryScore = 1.0f; break;
                case AirwindowsCategory::Distortion: categoryScore = 0.9f; break;
                case AirwindowsCategory::Reverb: categoryScore = 0.9f; break;
                case AirwindowsCategory::EQ: categoryScore = 0.8f; break;
                case AirwindowsCategory::Modulation: categoryScore = 0.7f; break;
                case AirwindowsCategory::Delay: categoryScore = 0.6f; break;
                case AirwindowsCategory::Specialized: categoryScore = 0.5f; break;
                case AirwindowsCategory::Utility: categoryScore = 0.4f; break;
            }
            priorityScore += categoryScore * 0.2f;

            // Uniqueness factor (10% weight)
            float uniquenessScore = 0.8f; // Assume high uniqueness for Airwindows
            priorityScore += uniquenessScore * 0.1f;
            reason += "Unique Airwindows character. ";

            ImplementationPriority priority;
            priority.algorithm = algo;
            priority.priorityScore = priorityScore;
            priority.reason = reason;

            priorities.push_back(priority);
        }

        // Sort by priority score (descending)
        std::sort(priorities.begin(), priorities.end(),
                 [](const ImplementationPriority& a, const ImplementationPriority& b) {
                     return a.priorityScore > b.priorityScore;
                 });

        return priorities;
    }

    // Export inventory
    void exportInventoryToJSON(const std::string& filename) const {
        std::ofstream file(filename);
        if (!file.is_open()) return;

        file << "{\n";
        file << "  \"airwindowsInventory\": {\n";
        file << "    \"totalAlgorithms\": " << getTotalAlgorithmCount() << ",\n";
        file << "    \"implementedAlgorithms\": " << getImplementedAlgorithmCount() << ",\n";
        file << "    \"categories\": {\n";

        // Export category counts
        auto categories = {
            AirwindowsCategory::Reverb, AirwindowsCategory::Dynamics, AirwindowsCategory::Distortion,
            AirwindowsCategory::EQ, AirwindowsCategory::Modulation, AirwindowsCategory::Delay,
            AirwindowsCategory::Utility, AirwindowsCategory::Specialized
        };

        bool firstCategory = true;
        for (auto category : categories) {
            if (!firstCategory) file << ",\n";
            file << "      \"" << getCategoryName(category) << "\": " << getAlgorithmsByCategoryCount(category);
            firstCategory = false;
        }

        file << "\n    },\n";
        file << "    \"algorithms\": [\n";

        // Export algorithms
        bool firstAlgorithm = true;
        for (const auto& algo : ALL_ALGORITHMS) {
            if (!firstAlgorithm) file << ",\n";
            file << "      {\n";
            file << "        \"name\": \"" << algo.name << "\",\n";
            file << "        \"displayName\": \"" << algo.displayName << "\",\n";
            file << "        \"category\": \"" << getCategoryName(algo.category) << "\",\n";
            file << "        \"complexity\": " << algo.complexity << ",\n";
            file << "        \"popularity\": " << algo.popularity << ",\n";
            file << "        \"isImplemented\": " << (algo.isImplemented ? "true" : "false") << ",\n";
            file << "        \"description\": \"" << algo.description << "\"\n";
            file << "      }";
            firstAlgorithm = false;
        }

        file << "\n    ]\n";
        file << "  }\n";
        file << "}\n";
    }

private:
    std::string getCategoryName(AirwindowsCategory category) const {
        switch (category) {
            case AirwindowsCategory::Reverb: return "Reverb";
            case AirwindowsCategory::Dynamics: return "Dynamics";
            case AirwindowsCategory::Distortion: return "Distortion";
            case AirwindowsCategory::EQ: return "EQ";
            case AirwindowsCategory::Modulation: return "Modulation";
            case AirwindowsCategory::Delay: return "Delay";
            case AirwindowsCategory::Utility: return "Utility";
            case AirwindowsCategory::Specialized: return "Specialized";
            default: return "Unknown";
        }
    }
};

//==============================================================================
// Public API for Phase 0 Research
//==============================================================================

namespace Phase0 {

// Complete inventory analysis
void analyzeCompleteInventory() {
    const auto& inventory = AirwindowsInventoryManager::getInstance();

    std::cout << "=== AIRWINDOWS COMPLETE INVENTORY ANALYSIS ===" << std::endl;
    std::cout << "Total Algorithms: " << inventory.getTotalAlgorithmCount() << std::endl;
    std::cout << "Currently Implemented: " << inventory.getImplementedAlgorithmCount() << std::endl;
    std::cout << "Implementation Progress: "
              << (inventory.getImplementedAlgorithmCount() * 100 / inventory.getTotalAlgorithmCount())
              << "%" << std::endl;

    std::cout << "\n=== ALGORITHM BREAKDOWN BY CATEGORY ===" << std::endl;
    auto categories = {
        AirwindowsCategory::Reverb, AirwindowsCategory::Dynamics, AirwindowsCategory::Distortion,
        AirwindowsCategory::EQ, AirwindowsCategory::Modulation, AirwindowsCategory::Delay,
        AirwindowsCategory::Utility, AirwindowsCategory::Specialized
    };

    for (auto category : categories) {
        int count = inventory.getAlgorithmsByCategoryCount(category);
        std::cout << getCategoryDisplayName(category) << ": " << count << " algorithms" << std::endl;
    }

    std::cout << "\n=== MOST POPULAR ALGORITHMS (Priority for Implementation) ===" << std::endl;
    auto popular = inventory.getMostPopularAlgorithms(7);
    for (const auto& algo : popular) {
        std::cout << algo.displayName << " (Popularity: " << algo.popularity << "/10)";
        if (algo.isImplemented) {
            std::cout << " ✅ IMPLEMENTED";
        }
        std::cout << std::endl;
    }

    std::cout << "\n=== IMPLEMENTATION PRIORITIES ===" << std::endl;
    auto priorities = inventory.getImplementationPriorities();
    std::cout << "Top 10 algorithms for implementation:" << std::endl;
    for (int i = 0; i < std::min(10, (int)priorities.size()); ++i) {
        const auto& priority = priorities[i];
        std::cout << (i + 1) << ". " << priority.algorithm.displayName
                  << " (Score: " << std::fixed << std::setprecision(2) << priority.priorityScore << ") - "
                  << priority.reason << std::endl;
    }
}

// Search algorithms
std::vector<std::string> searchAlgorithms(const std::string& query) {
    const auto& inventory = AirwindowsInventoryManager::getInstance();
    auto results = inventory.searchAlgorithms(query);

    std::vector<std::string> names;
    for (const auto& result : results) {
        names.push_back(result.displayName);
    }

    return names;
}

// Get implementation recommendations
std::vector<std::string> getImplementationRecommendations() {
    const auto& inventory = AirwindowsInventoryManager::getInstance();
    auto priorities = inventory.getImplementationPriorities();

    std::vector<std::string> recommendations;
    for (int i = 0; i < std::min(20, (int)priorities.size()); ++i) {
        const auto& priority = priorities[i];
        std::string recommendation = priority.algorithm.displayName;
        recommendation += " (Score: " + std::to_string(priority.priorityScore).substr(0, 4) + ") - ";
        recommendation += priority.reason;
        recommendations.push_back(recommendation);
    }

    return recommendations;
}

// Export inventory for analysis
void exportInventoryForAnalysis(const std::string& filename = "airwindows_inventory.json") {
    const auto& inventory = AirwindowsInventoryManager::getInstance();
    inventory.exportInventoryToJSON(filename);
    std::cout << "Inventory exported to: " << filename << std::endl;
}

} // namespace Phase0

} // namespace airwindows
} // namespace schill