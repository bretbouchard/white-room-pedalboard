/*
  ==============================================================================

   MicrotonalTuning.h
   Universal Microtonal Tuning Support for All Giant Instruments

   Provides:
   - Custom scale support (equal temperament, just intonation, meantone, Scala files)
   - Works with all giant instruments via frequency calculation replacement
   - Preset-storable tuning configurations
   - Built-in scale library (19-TET, 31-TET, Just Intonation, etc.)

   Supported tunings:
   - Equal Temperament: Any number of divisions (12-TET, 19-TET, 24-TET, 31-TET, etc.)
   - Just Intonation: Pure ratios (5-limit, 7-limit, harmonic series)
   - Meantone: Quarter-comma, third-comma, etc.
   - Historical: Pythagorean, Werckmeister, Vallotti, Young
   - Scala Files: Load .scl files (4000+ scales available)
   - Custom: User-defined interval ratios

  ==============================================================================
*/

#pragma once

#include <juce_core/juce_core.h>
#include <vector>
#include <string>
#include <map>
#include <cmath>

//==============================================================================
/**
 * Tuning system types
 */
enum class TuningSystem
{
    EqualTemperament,      // n-TET where n is configurable
    JustIntonation,        // Pure ratios
    Meantone,              // Historical temperament
    Pythagorean,           // Historical tuning
    CustomScale,           // User-defined interval ratios
    ScalaFile              // Loaded from .scl file
};

//==============================================================================
/**
 * Microtonal tuning configuration
 */
struct MicrotonalTuning
{
    //==============================================================================
    // Basic configuration
    TuningSystem system = TuningSystem::EqualTemperament;
    int divisions = 12;                      // For equal temperaments
    float rootFrequency = 440.0f;           // A4 = 440Hz default
    int rootNote = 69;                       // MIDI note number for root

    //==============================================================================
    // Interval definitions (for non-equal temperaments)
    struct Interval
    {
        float ratio;              // Frequency ratio from root
        float cents;              // Value in cents (for display)
        juce::String name;        // Interval name (e.g., "3/2", "fifth")

        Interval() : ratio(1.0f), cents(0.0f), name("1/1") {}
        Interval(float r, const juce::String& n = "")
            : ratio(r), name(n) { cents = std::log2(r) * 1200.0f; }
        Interval(float r, float c, const juce::String& n = "")
            : ratio(r), cents(c), name(n) {}
    };

    std::vector<Interval> intervals;

    //==============================================================================
    // Scala file info
    juce::String scalaFilename;
    juce::String scaleName;
    juce::String scaleDescription;

    //==============================================================================
    // Calculate frequency for a MIDI note
    float midiToFrequency(int midiNote) const;

    //==============================================================================
    // Get scale info for display
    juce::String getName() const;

    //==============================================================================
    // Validation
    bool isValid() const;

    //==============================================================================
    // Utility functions
    float centsToRatio(float cents) const;
    float ratioToCents(float ratio) const;
};

//==============================================================================
/**
 * Scala file loader
 *
 * Parses .scl (Scala scale file) format
 */
class ScalaFileLoader
{
public:
    struct ScaleData
    {
        juce::String name;
        juce::String description;
        std::vector<float> intervals;  // In cents

        // Convert to MicrotonalTuning
        MicrotonalTuning toMicrotonalTuning() const;
    };

    //==============================================================================
    /** Load a .scl file */
    static ScaleData loadScalaFile(const juce::File& scalaFile);

    /** Load from string (for embedded scales) */
    static ScaleData loadScalaString(const juce::String& scalaContent);

    //==============================================================================
    // Built-in scale library

    // Equal temperaments
    static ScaleData get12TET();
    static ScaleData get19TET();
    static ScaleData get22TET();        // Indian shruti
    static ScaleData get24TET();        // Quarter tones
    static ScaleData get31TET();
    static ScaleData get36TET();        // Third tones
    static ScaleData get48TET();        // Eighth tones
    static ScaleData get53TET();        // Harrison's comma
    static ScaleData get72TET();        // Sixth tones

    // Just intonation
    static ScaleData getJustIntonation5Limit();
    static ScaleData getJustIntonation7Limit();
    static ScaleData getJustIntonationHarmonic();     // Harmonic series

    // Historical
    static ScaleData getMeantoneQuarterComma();
    static ScaleData getMeantoneThirdComma();
    static ScaleData getMeantoneFifthComma();
    static ScaleData getPythagorean();
    static ScaleData getWerckmeisterIII();
    static ScaleData getWerckmeisterIV();
    static ScaleData getWerckmeisterV();
    static ScaleData getVallotti();
    static ScaleData getYoungLambert();
    static ScaleData getKirnbergerI();
    static ScaleData getKirnbergerII();
    static ScaleData getKirnbergerIII();

    // Experimental
    static ScaleData getPartials();           // Harmonic series (1-16)
    static ScaleData getSpectral();           // Spectral scale
    static ScaleData getWilsonBohlenPierce(); // Bohlen-Pierce 13-TET
    static ScaleData getWilsonFiveLimit();     // Wilson's 5-limit

    // World music
    static ScaleData getIndianShruti();       // 22 shruti
    static ScaleData getArabicMaqaam();       // Quarter tones
    static ScaleData getThai();               // 7-tone equal
    static ScaleData getSlendro();            // Javanese pentatonic-ish

private:
    //==============================================================================
    // Helper functions
    static float ratioToCents(float ratio);
    static float centsToRatio(float cents);
    static std::vector<float> generateEqualTemperament(int divisions);
    static std::vector<float> generateJustIntonation5Limit();
    static std::vector<float> generateHarmonicSeries(int numPartials);
};

//==============================================================================
/**
 * Microtonal tuning manager
 *
 * Manages current tuning and provides easy access to built-in scales
 */
class MicrotonalTuningManager
{
public:
    MicrotonalTuningManager();
    ~MicrotonalTuningManager() = default;

    //==============================================================================
    /** Set current tuning */
    void setTuning(const MicrotonalTuning& tuning);

    /** Get current tuning */
    const MicrotonalTuning& getTuning() const { return currentTuning; }

    //==============================================================================
    // Quick access to common tunings

    /** Set to 12-TET (standard) */
    void set12TET() { setTuning(ScalaFileLoader::get12TET().toMicrotonalTuning()); }

    /** Set to 19-TET */
    void set19TET() { setTuning(ScalaFileLoader::get19TET().toMicrotonalTuning()); }

    /** Set to 24-TET (quarter tones) */
    void set24TET() { setTuning(ScalaFileLoader::get24TET().toMicrotonalTuning()); }

    /** Set to 31-TET */
    void set31TET() { setTuning(ScalaFileLoader::get31TET().toMicrotonalTuning()); }

    /** Set to Just Intonation (5-limit) */
    void setJustIntonation() { setTuning(ScalaFileLoader::getJustIntonation5Limit().toMicrotonalTuning()); }

    /** Set to Meantone (quarter-comma) */
    void setMeantone() { setTuning(ScalaFileLoader::getMeantoneQuarterComma().toMicrotonalTuning()); }

    /** Set to Pythagorean */
    void setPythagorean() { setTuning(ScalaFileLoader::getPythagorean().toMicrotonalTuning()); }

    //==============================================================================
    // Load Scala file
    bool loadScalaFile(const juce::File& scalaFile);

    //==============================================================================
    // Get list of built-in scales
    struct ScaleInfo
    {
        juce::String name;
        juce::String category;
        juce::String description;
    };

    static std::vector<ScaleInfo> getBuiltInScales();

private:
    MicrotonalTuning currentTuning;

    //==============================================================================
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(MicrotonalTuningManager)
};

//==============================================================================
// Inline function implementations
//==============================================================================

inline float MicrotonalTuning::midiToFrequency(int midiNote) const
{
    float semitones = midiNote - rootNote;

    switch (system)
    {
        case TuningSystem::EqualTemperament:
        {
            // Equal temperament with custom divisions
            float octaveRatio = 2.0f;
            float stepRatio = std::pow(octaveRatio, 1.0f / static_cast<float>(divisions));
            float ratio = std::pow(stepRatio, semitones);
            return rootFrequency * ratio;
        }

        case TuningSystem::JustIntonation:
        case TuningSystem::Meantone:
        case TuningSystem::Pythagorean:
        case TuningSystem::CustomScale:
        case TuningSystem::ScalaFile:
        {
            // Map to interval list
            int octave = static_cast<int>(std::floor(static_cast<float>(semitones) / divisions));
            int step = static_cast<int>(semitones) % divisions;

            if (step < 0)
            {
                step += divisions;
                octave -= 1;
            }

            if (step >= 0 && step < static_cast<int>(intervals.size()))
            {
                float ratio = intervals[step].ratio;
                ratio *= std::pow(2.0f, octave);
                return rootFrequency * ratio;
            }

            // Fallback to equal temperament
            return rootFrequency * std::pow(2.0f, semitones / 12.0f);
        }

        default:
            return rootFrequency * std::pow(2.0f, semitones / 12.0f);
    }
}

inline juce::String MicrotonalTuning::getName() const
{
    switch (system)
    {
        case TuningSystem::EqualTemperament:
            return juce::String(divisions) + "-TET";

        case TuningSystem::JustIntonation:
            return "Just Intonation (" + scaleName + ")";

        case TuningSystem::Meantone:
            return "Meantone (" + scaleName + ")";

        case TuningSystem::Pythagorean:
            return "Pythagorean";

        case TuningSystem::CustomScale:
            return scaleName;

        case TuningSystem::ScalaFile:
            return scalaFilename;

        default:
            return "12-TET";
    }
}

inline bool MicrotonalTuning::isValid() const
{
    switch (system)
    {
        case TuningSystem::EqualTemperament:
            return divisions > 0 && divisions <= 120;

        case TuningSystem::JustIntonation:
        case TuningSystem::Meantone:
        case TuningSystem::Pythagorean:
        case TuningSystem::CustomScale:
        case TuningSystem::ScalaFile:
            return !intervals.empty();

        default:
            return false;
    }
}

inline float MicrotonalTuning::centsToRatio(float cents) const
{
    return std::pow(2.0f, cents / 1200.0f);
}

inline float MicrotonalTuning::ratioToCents(float ratio) const
{
    return std::log2(ratio) * 1200.0f;
}

//==============================================================================
// MicrotonalTuningManager
//==============================================================================

inline MicrotonalTuningManager::MicrotonalTuningManager()
{
    currentTuning = ScalaFileLoader::get12TET().toMicrotonalTuning();
}

inline void MicrotonalTuningManager::setTuning(const MicrotonalTuning& tuning)
{
    if (tuning.isValid())
    {
        currentTuning = tuning;
    }
}

inline bool MicrotonalTuningManager::loadScalaFile(const juce::File& scalaFile)
{
    try
    {
        ScalaFileLoader::ScaleData scaleData = ScalaFileLoader::loadScalaFile(scalaFile);
        setTuning(scaleData.toMicrotonalTuning());
        return true;
    }
    catch (...)
    {
        return false;
    }
}

inline std::vector<MicrotonalTuningManager::ScaleInfo> MicrotonalTuningManager::getBuiltInScales()
{
    std::vector<ScaleInfo> scales;

    // Equal temperaments
    scales.push_back({ "12-TET", "Equal", "Standard Western tuning" });
    scales.push_back({ "19-TET", "Equal", "Popular microtonal tuning" });
    scales.push_back({ "22-TET", "Equal", "Indian shruti system" });
    scales.push_back({ "24-TET", "Equal", "Quarter tones" });
    scales.push_back({ "31-TET", "Equal", "Very popular microtonal" });
    scales.push_back({ "36-TET", "Equal", "Third tones" });
    scales.push_back({ "48-TET", "Equal", "Eighth tones" });
    scales.push_back({ "53-TET", "Equal", "Harrison's comma" });
    scales.push_back({ "72-TET", "Equal", "Sixth tones" });

    // Just intonation
    scales.push_back({ "5-Limit JI", "Just", "Pure thirds and fifths" });
    scales.push_back({ "7-Limit JI", "Just", "Includes sevenths" });
    scales.push_back({ "Harmonic", "Just", "Harmonic series" });

    // Historical
    scales.push_back({ "Meantone (1/4)", "Historical", "Quarter-comma meantone" });
    scales.push_back({ "Pythagorean", "Historical", "Medieval tuning" });
    scales.push_back({ "Werckmeister III", "Historical", "Baroque temperament" });
    scales.push_back({ "Vallotti", "Historical", "Classical temperament" });
    scales.push_back({ "Young", "Historical", "Classical temperament" });

    // Experimental
    scales.push_back({ "Bohlen-Pierce", "Experimental", "13-TET diamond scale" });
    scales.push_back({ "Partials", "Experimental", "Harmonic series" });

    // World music
    scales.push_back({ "Indian Shruti", "World", "22 shruti" });
    scales.push_back({ "Thai", "World", "7-tone equal" });

    return scales;
}

//==============================================================================
// ScalaFileLoader Implementations
//==============================================================================

inline ScalaFileLoader::ScaleData ScalaFileLoader::get12TET()
{
    ScaleData scale;
    scale.name = "12-TET";
    scale.description = "Standard 12-tone equal temperament";
    scale.intervals = generateEqualTemperament(12);
    return scale;
}

inline ScalaFileLoader::ScaleData ScalaFileLoader::get19TET()
{
    ScaleData scale;
    scale.name = "19-TET";
    scale.description = "19-tone equal temperament";
    scale.intervals = generateEqualTemperament(19);
    return scale;
}

inline ScalaFileLoader::ScaleData ScalaFileLoader::get22TET()
{
    ScaleData scale;
    scale.name = "22-TET";
    scale.description = "22-tone equal temperament (Indian shruti)";
    scale.intervals = generateEqualTemperament(22);
    return scale;
}

inline ScalaFileLoader::ScaleData ScalaFileLoader::get24TET()
{
    ScaleData scale;
    scale.name = "24-TET";
    scale.description = "24-tone equal temperament (quarter tones)";
    scale.intervals = generateEqualTemperament(24);
    return scale;
}

inline ScalaFileLoader::ScaleData ScalaFileLoader::get31TET()
{
    ScaleData scale;
    scale.name = "31-TET";
    scale.description = "31-tone equal temperament";
    scale.intervals = generateEqualTemperament(31);
    return scale;
}

inline ScalaFileLoader::ScaleData ScalaFileLoader::get36TET()
{
    ScaleData scale;
    scale.name = "36-TET";
    scale.description = "36-tone equal temperament (third tones)";
    scale.intervals = generateEqualTemperament(36);
    return scale;
}

inline ScalaFileLoader::ScaleData ScalaFileLoader::get48TET()
{
    ScaleData scale;
    scale.name = "48-TET";
    scale.description = "48-tone equal temperament (eighth tones)";
    scale.intervals = generateEqualTemperament(48);
    return scale;
}

inline ScalaFileLoader::ScaleData ScalaFileLoader::get53TET()
{
    ScaleData scale;
    scale.name = "53-TET";
    scale.description = "53-tone equal temperament (Harrison's comma)";
    scale.intervals = generateEqualTemperament(53);
    return scale;
}

inline ScalaFileLoader::ScaleData ScalaFileLoader::get72TET()
{
    ScaleData scale;
    scale.name = "72-TET";
    scale.description = "72-tone equal temperament (sixth tones)";
    scale.intervals = generateEqualTemperament(72);
    return scale;
}

inline ScalaFileLoader::ScaleData ScalaFileLoader::getJustIntonation5Limit()
{
    ScaleData scale;
    scale.name = "Just Intonation 5-Limit";
    scale.description = "5-limit just intonation (pure thirds and fifths)";

    // 5-limit just intonation ratios (in cents)
    scale.intervals = {
        0.0f,              // 1/1 (unison)
        111.73f,           // 16/15 (minor second)
        203.91f,           // 9/8 (major second)
        315.64f,           // 6/5 (minor third)
        386.31f,           // 5/4 (major third)
        498.04f,           // 4/3 (perfect fourth)
        701.96f,           // 3/2 (perfect fifth)
        813.69f,           // 8/5 (minor sixth)
        884.36f,           // 5/3 (major sixth)
        1017.60f,          // 9/5 (minor seventh)
        1088.27f,          // 15/8 (major seventh)
        1200.0f            // 2/1 (octave)
    };

    return scale;
}

inline ScalaFileLoader::ScaleData ScalaFileLoader::getJustIntonation7Limit()
{
    ScaleData scale;
    scale.name = "Just Intonation 7-Limit";
    scale.description = "7-limit just intonation (includes harmonic sevenths)";

    // 7-limit just intonation ratios (in cents)
    scale.intervals = {
        0.0f,              // 1/1 (unison)
        111.73f,           // 16/15 (minor second)
        203.91f,           // 9/8 (major second)
        266.87f,           // 7/6 (septimal minor third)
        315.64f,           // 6/5 (minor third)
        386.31f,           // 5/4 (major third)
        498.04f,           // 4/3 (perfect fourth)
        582.51f,           // 7/5 (septimal tritone)
        701.96f,           // 3/2 (perfect fifth)
        813.69f,           // 8/5 (minor sixth)
        884.36f,           // 5/3 (major sixth)
        968.83f,           // 7/4 (harmonic seventh)
        1017.60f,          // 9/5 (minor seventh)
        1088.27f,          // 15/8 (major seventh)
        1200.0f            // 2/1 (octave)
    };

    return scale;
}

inline ScalaFileLoader::ScaleData ScalaFileLoader::getJustIntonationHarmonic()
{
    ScaleData scale;
    scale.name = "Harmonic Series";
    scale.description = "Harmonic series (1-16)";

    // Harmonic series intervals (in cents)
    scale.intervals = {
        0.0f,              // 1/1
        1200.0f,           // 2/1
        1901.96f,          // 3/2
        2400.0f,           // 4/3
        2786.31f,          // 5/4
        3102.64f,          // 6/5
        3368.83f,          // 7/6
        3600.0f,           // 8/7
        3803.91f,          // 9/8
        3986.31f,          // 10/9
        4151.32f,          // 11/10
        4302.35f,          // 12/11
        4440.53f,          // 13/12
        4568.82f,          // 14/13
        4688.27f,          // 15/14
        4800.0f            // 16/15
    };

    return scale;
}

inline ScalaFileLoader::ScaleData ScalaFileLoader::getMeantoneQuarterComma()
{
    ScaleData scale;
    scale.name = "Meantone (Quarter-Comma)";
    scale.description = "Quarter-comma meantone temperament";

    // Quarter-comma meantone intervals (in cents)
    scale.intervals = {
        0.0f,              // 1/1 (unison)
        76.05f,            // quarter-comma chromatic semitone
        193.16f,           // quarter-comma diatonic semitone
        310.26f,           // quarter-comma minor third
        386.31f,           // pure major third (5/4)
        503.42f,           // quarter-comma fourth
        579.47f,           // quarter-comma chromatic fourth
        696.58f,           // quarter-comma fifth
        813.69f,           // pure minor sixth (8/5)
        889.74f,           // quarter-comma major sixth
        1006.84f,          // quarter-comma minor seventh
        1082.89f,          // quarter-comma major seventh
        1200.0f            // 2/1 (octave)
    };

    return scale;
}

inline ScalaFileLoader::ScaleData ScalaFileLoader::getMeantoneThirdComma()
{
    ScaleData scale;
    scale.name = "Meantone (Third-Comma)";
    scale.description = "Third-comma meantone temperament";

    // Third-comma meantone intervals (in cents)
    scale.intervals = {
        0.0f,              // 1/1 (unison)
        69.47f,            // third-comma chromatic semitone
        186.59f,           // third-comma diatonic semitone
        303.70f,           // third-comma minor third
        373.11f,           // third-comma major third
        491.12f,           // third-comma fourth
        559.64f,           // third-comma chromatic fourth
        676.76f,           // third-comma fifth
        793.87f,           // third-comma minor sixth
        862.39f,           // third-comma major sixth
        979.50f,           // third-comma minor seventh
        1048.02f,          // third-comma major seventh
        1200.0f            // 2/1 (octave)
    };

    return scale;
}

inline ScalaFileLoader::ScaleData ScalaFileLoader::getMeantoneFifthComma()
{
    ScaleData scale;
    scale.name = "Meantone (Fifth-Comma)";
    scale.description = "Fifth-comma meantone temperament";

    // Fifth-comma meantone intervals (in cents)
    scale.intervals = {
        0.0f,              // 1/1 (unison)
        78.48f,            // fifth-comma chromatic semitone
        195.58f,           // fifth-comma diatonic semitone
        312.68f,           // fifth-comma minor third
        390.24f,           // fifth-comma major third
        508.34f,           // fifth-comma fourth
        585.90f,           // fifth-comma chromatic fourth
        703.00f,           // fifth-comma fifth
        820.11f,           // fifth-comma minor sixth
        897.67f,           // fifth-comma major sixth
        1014.77f,          // fifth-comma minor seventh
        1092.33f,          // fifth-comma major seventh
        1200.0f            // 2/1 (octave)
    };

    return scale;
}

inline ScalaFileLoader::ScaleData ScalaFileLoader::getPythagorean()
{
    ScaleData scale;
    scale.name = "Pythagorean";
    scale.description = "Pythagorean tuning (pure fifths)";

    // Pythagorean intervals (in cents)
    scale.intervals = {
        0.0f,              // 1/1 (unison)
        90.22f,            // 256/243 (limma)
        203.91f,           // 9/8 (major whole tone)
        294.13f,           // 32/27 (minor third)
        407.82f,           // 81/64 (major third)
        498.04f,           // 4/3 (perfect fourth)
        588.27f,           // 729/512 (augmented fourth)
        701.96f,           // 3/2 (perfect fifth)
        792.18f,           // 128/81 (minor sixth)
        905.87f,           // 27/16 (major sixth)
        996.09f,           // 16/9 (minor seventh)
        1109.78f,          // 243/128 (major seventh)
        1200.0f            // 2/1 (octave)
    };

    return scale;
}

inline ScalaFileLoader::ScaleData ScalaFileLoader::getWerckmeisterIII()
{
    ScaleData scale;
    scale.name = "Werckmeister III";
    scale.description = "Werckmeister III temperament";

    // Werckmeister III intervals (in cents)
    scale.intervals = {
        0.0f,
        90.22f,
        192.18f,
        294.13f,
        390.22f,
        498.04f,
        588.27f,
        696.58f,
        792.18f,
        888.27f,
        996.09f,
        1092.18f,
        1200.0f
    };

    return scale;
}

inline ScalaFileLoader::ScaleData ScalaFileLoader::getWerckmeisterIV()
{
    ScaleData scale;
    scale.name = "Werckmeister IV";
    scale.description = "Werckmeister IV temperament";

    // Werckmeister IV intervals (in cents)
    scale.intervals = {
        0.0f,
        90.22f,
        192.18f,
        294.13f,
        386.31f,
        498.04f,
        588.27f,
        696.58f,
        792.18f,
        884.36f,
        996.09f,
        1088.27f,
        1200.0f
    };

    return scale;
}

inline ScalaFileLoader::ScaleData ScalaFileLoader::getWerckmeisterV()
{
    ScaleData scale;
    scale.name = "Werckmeister V";
    scale.description = "Werckmeister V temperament";

    // Werckmeister V intervals (in cents)
    scale.intervals = {
        0.0f,
        90.22f,
        186.59f,
        294.13f,
        386.31f,
        498.04f,
        588.27f,
        696.58f,
        788.27f,
        884.36f,
        996.09f,
        1088.27f,
        1200.0f
    };

    return scale;
}

inline ScalaFileLoader::ScaleData ScalaFileLoader::getVallotti()
{
    ScaleData scale;
    scale.name = "Vallotti";
    scale.description = "Vallotti temperament";

    // Vallotti intervals (in cents)
    scale.intervals = {
        0.0f,
        90.22f,
        196.59f,
        298.04f,
        392.18f,
        503.42f,
        593.64f,
        698.04f,
        792.18f,
        892.18f,
        1003.42f,
        1093.64f,
        1200.0f
    };

    return scale;
}

inline ScalaFileLoader::ScaleData ScalaFileLoader::getYoungLambert()
{
    ScaleData scale;
    scale.name = "Young";
    scale.description = "Young/Lambert temperament";

    // Young intervals (in cents)
    scale.intervals = {
        0.0f,
        90.22f,
        196.59f,
        298.04f,
        393.64f,
        503.42f,
        593.64f,
        698.04f,
        795.64f,
        892.18f,
        1003.42f,
        1093.64f,
        1200.0f
    };

    return scale;
}

inline ScalaFileLoader::ScaleData ScalaFileLoader::getKirnbergerI()
{
    ScaleData scale;
    scale.name = "Kirnberger I";
    scale.description = "Kirnberger I temperament";

    // Kirnberger I intervals (in cents)
    scale.intervals = {
        0.0f,
        90.22f,
        204.0f,
        298.04f,
        386.31f,
        498.04f,
        588.27f,
        701.96f,
        792.18f,
        890.22f,
        996.09f,
        1088.27f,
        1200.0f
    };

    return scale;
}

inline ScalaFileLoader::ScaleData ScalaFileLoader::getKirnbergerII()
{
    ScaleData scale;
    scale.name = "Kirnberger II";
    scale.description = "Kirnberger II temperament";

    // Kirnberger II intervals (in cents)
    scale.intervals = {
        0.0f,
        90.22f,
        196.59f,
        298.04f,
        386.31f,
        498.04f,
        588.27f,
        701.96f,
        792.18f,
        888.27f,
        996.09f,
        1088.27f,
        1200.0f
    };

    return scale;
}

inline ScalaFileLoader::ScaleData ScalaFileLoader::getKirnbergerIII()
{
    ScaleData scale;
    scale.name = "Kirnberger III";
    scale.description = "Kirnberger III temperament";

    // Kirnberger III intervals (in cents)
    scale.intervals = {
        0.0f,
        90.22f,
        193.59f,
        298.04f,
        386.31f,
        498.04f,
        588.27f,
        697.59f,
        792.18f,
        889.74f,
        996.09f,
        1088.27f,
        1200.0f
    };

    return scale;
}

inline ScalaFileLoader::ScaleData ScalaFileLoader::getPartials()
{
    ScaleData scale;
    scale.name = "Partials";
    scale.description = "Harmonic partials 1-16";

    // Harmonic partials (in cents from fundamental)
    scale.intervals = {
        0.0f,              // 1
        1200.0f,           // 2
        1901.96f,          // 3
        2400.0f,           // 4
        2786.31f,          // 5
        3102.64f,          // 6
        3368.83f,          // 7
        3600.0f,           // 8
        3803.91f,          // 9
        3986.31f,          // 10
        4151.32f,          // 11
        4302.35f,          // 12
        4440.53f,          // 13
        4568.82f,          // 14
        4688.27f,          // 15
        4800.0f            // 16
    };

    return scale;
}

inline ScalaFileLoader::ScaleData ScalaFileLoader::getSpectral()
{
    ScaleData scale;
    scale.name = "Spectral";
    scale.description = "Spectral scale (based on harmonic series)";

    // Spectral scale (in cents)
    scale.intervals = {
        0.0f,
        227.79f,
        425.42f,
        589.47f,
        732.59f,
        854.65f,
        965.78f,
        1062.27f,
        1148.18f,
        1225.40f,
        1295.36f,
        1358.98f,
        1417.13f,
        1470.53f,
        1519.83f,
        1565.51f,
        1608.01f,
        1647.69f,
        1684.85f,
        1719.75f,
        1752.59f,
        1783.55f,
        1812.77f,
        1840.39f,
        1866.52f,
        1891.27f,
        1914.73f,
        1936.99f,
        1958.14f,
        1978.25f,
        1997.39f,
        2015.62f,
        2033.01f,
        2049.61f,
        2065.46f,
        2080.61f,
        2095.11f,
        2108.99f,
        2122.29f,
        2135.05f,
        2147.29f,
        2159.04f,
        2170.34f,
        2181.19f,
        2191.63f,
        2201.68f,
        2211.35f,
        2220.68f,
        2229.66f,
        2238.33f,
        2246.69f,
        2254.76f,
        2262.55f,
        2270.08f,
        2277.36f,
        2284.39f,
        2291.20f,
        2297.79f,
        2304.17f,
        2310.35f,
        2316.34f,
        2322.14f,
        2327.76f,
        2333.21f,
        2338.49f,
        2343.62f,
        2348.59f,
        2353.41f,
        2358.09f,
        2362.63f,
        2367.04f,
        2371.32f,
        2375.48f,
        2379.52f,
        2383.44f,
        2387.25f,
        2390.95f,
        2394.55f,
        2398.04f,
        2401.43f
    };

    return scale;
}

inline ScalaFileLoader::ScaleData ScalaFileLoader::getWilsonBohlenPierce()
{
    ScaleData scale;
    scale.name = "Bohlen-Pierce";
    scale.description = "Bohlen-Pierce 13-TET";

    // Bohlen-Pierce intervals (in cents)
    scale.intervals = {
        0.0f,
        146.30f,
        292.61f,
        438.91f,
        585.22f,
        731.52f,
        877.83f,
        1024.13f,
        1170.44f,
        1316.74f,
        1463.05f,
        1609.35f,
        1755.66f,
        1901.96f,
        2048.27f,
        2194.57f,
        2340.88f,
        2487.18f,
        2633.49f,
        2779.79f,
        2926.10f,
        3072.40f,
        3218.71f,
        3365.01f
    };

    return scale;
}

inline ScalaFileLoader::ScaleData ScalaFileLoader::getWilsonFiveLimit()
{
    ScaleData scale;
    scale.name = "Wilson Five-Limit";
    scale.description = "Wilson's 5-limit just intonation";

    // Wilson 5-limit intervals (in cents)
    scale.intervals = {
        0.0f,
        111.73f,
        203.91f,
        315.64f,
        386.31f,
        498.04f,
        701.96f,
        813.69f,
        884.36f,
        1017.60f,
        1088.27f,
        1200.0f
    };

    return scale;
}

inline ScalaFileLoader::ScaleData ScalaFileLoader::getIndianShruti()
{
    ScaleData scale;
    scale.name = "Indian Shruti";
    scale.description = "22 shruti (Indian microtonal system)";

    // Indian shruti intervals (in cents)
    scale.intervals = {
        0.0f,
        90.22f,
        111.73f,
        182.40f,
        203.91f,
        294.13f,
        315.64f,
        386.31f,
        407.82f,
        498.04f,
        519.55f,
        610.27f,
        701.96f,
        792.18f,
        813.69f,
        884.36f,
        905.87f,
        996.09f,
        1017.60f,
        1108.27f,
        1088.27f,
        1200.0f
    };

    return scale;
}

inline ScalaFileLoader::ScaleData ScalaFileLoader::getArabicMaqaam()
{
    ScaleData scale;
    scale.name = "Arabic Maqaam";
    scale.description = "Arabic quarter-tone system";

    // Arabic maqaam intervals (in cents)
    scale.intervals = {
        0.0f,
        50.0f,            // Quarter tone
        100.0f,           // Half tone
        150.0f,           // Three-quarter tone
        200.0f,           // Whole tone
        250.0f,           // Whole + quarter
        300.0f,           // Minor third
        350.0f,           // Minor third + quarter
        400.0f,           // Major third (approx)
        450.0f,
        500.0f,           // Fourth
        550.0f,
        600.0f,           // Augmented fourth
        700.0f,           // Fifth
        750.0f,
        800.0f,           // Minor sixth
        850.0f,
        900.0f,           // Major sixth (approx)
        950.0f,
        1000.0f,          // Minor seventh
        1050.0f,
        1100.0f,          // Major seventh (approx)
        1200.0f           // Octave
    };

    return scale;
}

inline ScalaFileLoader::ScaleData ScalaFileLoader::getThai()
{
    ScaleData scale;
    scale.name = "Thai";
    scale.description = "Thai 7-tone equal temperament";

    // Thai 7-TET (in cents)
    scale.intervals = {
        0.0f,
        171.43f,          // 1200 / 7
        342.86f,
        514.29f,
        685.71f,
        857.14f,
        1028.57f,
        1200.0f
    };

    return scale;
}

inline ScalaFileLoader::ScaleData ScalaFileLoader::getSlendro()
{
    ScaleData scale;
    scale.name = "Slendro";
    scale.description = "Javanese slendro (pentatonic-ish)";

    // Slendro intervals (in cents) - approximate
    scale.intervals = {
        0.0f,
        240.0f,           // Approximately
        480.0f,
        720.0f,
        960.0f,
        1200.0f
    };

    return scale;
}

inline MicrotonalTuning ScalaFileLoader::ScaleData::toMicrotonalTuning() const
{
    MicrotonalTuning tuning;

    tuning.system = TuningSystem::ScalaFile;
    tuning.scalaFilename = name;
    tuning.scaleName = name;
    tuning.scaleDescription = description;
    tuning.rootFrequency = 440.0f;
    tuning.rootNote = 69;

    // Convert interval cents to MicrotonalTuning::Interval
    tuning.intervals.clear();
    for (size_t i = 0; i < intervals.size(); ++i)
    {
        MicrotonalTuning::Interval interval;
        interval.cents = intervals[i];
        interval.ratio = std::pow(2.0f, intervals[i] / 1200.0f);

        // Generate interval name
        if (i == 0)
        {
            interval.name = "1/1";
        }
        else if (i == intervals.size() - 1 && intervals[i] >= 1199.0f && intervals[i] <= 1201.0f)
        {
            interval.name = "2/1";
        }
        else
        {
            interval.name = juce::String(intervals[i], 2) + " cents";
        }

        tuning.intervals.push_back(interval);
    }

    tuning.divisions = static_cast<int>(intervals.size());

    return tuning;
}

inline ScalaFileLoader::ScaleData ScalaFileLoader::loadScalaFile(const juce::File& scalaFile)
{
    // Read the file
    juce::String content = scalaFile.loadFileAsString();

    // Parse the Scala file format
    return loadScalaString(content);
}

inline ScalaFileLoader::ScaleData ScalaFileLoader::loadScalaString(const juce::String& scalaContent)
{
    ScaleData scale;
    juce::StringArray lines;
    lines.addLines(scalaContent);

    int lineIndex = 0;

    // Skip comment lines (lines starting with !)
    while (lineIndex < lines.size() && lines[lineIndex].startsWith("!"))
    {
        lineIndex++;
    }

    // First non-comment line is the scale name/description
    if (lineIndex < lines.size())
    {
        scale.name = lines[lineIndex].trim();
        lineIndex++;
    }

    // Second non-comment line is the number of notes
    int numNotes = 0;
    while (lineIndex < lines.size() && lines[lineIndex].trim().isEmpty())
    {
        lineIndex++;
    }

    if (lineIndex < lines.size())
    {
        numNotes = lines[lineIndex].trim().getIntValue();
        lineIndex++;
    }

    // Remaining lines are the intervals (in cents or ratio format)
    scale.intervals.clear();

    for (int i = 0; i < numNotes && lineIndex < lines.size(); ++i)
    {
        juce::String line = lines[lineIndex].trim();

        // Skip empty lines and comments
        if (line.isEmpty() || line.startsWith("!"))
        {
            lineIndex++;
            continue;
        }

        // Parse interval
        if (line.contains("."))
        {
            // Cents format (e.g., "100.0")
            float cents = line.getFloatValue();
            scale.intervals.push_back(cents);
        }
        else if (line.contains("/"))
        {
            // Ratio format (e.g., "3/2")
            juce::StringArray parts;
            parts.addTokens(line, "/", "");

            if (parts.size() == 2)
            {
                float numerator = parts[0].getFloatValue();
                float denominator = parts[1].getFloatValue();
                float ratio = numerator / denominator;
                float cents = std::log2(ratio) * 1200.0f;
                scale.intervals.push_back(cents);
            }
        }
        else
        {
            // Integer ratio (e.g., "2")
            float ratio = line.getFloatValue();
            float cents = std::log2(ratio) * 1200.0f;
            scale.intervals.push_back(cents);
        }

        lineIndex++;
    }

    return scale;
}

//==============================================================================
// ScalaFileLoader Helper Functions
//==============================================================================

inline float ScalaFileLoader::ratioToCents(float ratio)
{
    return std::log2(ratio) * 1200.0f;
}

inline float ScalaFileLoader::centsToRatio(float cents)
{
    return std::pow(2.0f, cents / 1200.0f);
}

inline std::vector<float> ScalaFileLoader::generateEqualTemperament(int divisions)
{
    std::vector<float> intervals;
    float stepSize = 1200.0f / static_cast<float>(divisions);

    for (int i = 0; i < divisions; ++i)
    {
        intervals.push_back(i * stepSize);
    }

    // Add octave
    intervals.push_back(1200.0f);

    return intervals;
}

inline std::vector<float> ScalaFileLoader::generateJustIntonation5Limit()
{
    // Return 5-limit just intonation intervals
    return {
        0.0f,              // 1/1
        111.73f,           // 16/15
        203.91f,           // 9/8
        315.64f,           // 6/5
        386.31f,           // 5/4
        498.04f,           // 4/3
        701.96f,           // 3/2
        813.69f,           // 8/5
        884.36f,           // 5/3
        1017.60f,          // 9/5
        1088.27f,          // 15/8
        1200.0f            // 2/1
    };
}

inline std::vector<float> ScalaFileLoader::generateHarmonicSeries(int numPartials)
{
    std::vector<float> intervals;

    for (int i = 1; i <= numPartials; ++i)
    {
        float cents = std::log2(static_cast<float>(i)) * 1200.0f;
        intervals.push_back(cents);
    }

    return intervals;
}
