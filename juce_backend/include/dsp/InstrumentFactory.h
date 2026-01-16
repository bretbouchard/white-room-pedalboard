/*
  ==============================================================================

    InstrumentFactory.h
    Created: December 30, 2025
    Author:  Bret Bouchard

    Auto-registration helpers for instrument factories

  ==============================================================================
*/

#ifndef DSP_INSTRUMENT_FACTORY_H_INCLUDED
#define DSP_INSTRUMENT_FACTORY_H_INCLUDED

#include "InstrumentDSP.h"
#include <functional>
#include <unordered_map>
#include <string>

namespace DSP {

//==============================================================================
// Instrument Registry
//==============================================================================

/**
 * @brief Global registry of instrument factories
 *
 * Maps instrument name strings to factory functions.
 */
class InstrumentRegistry {
public:
    using FactoryFunc = std::function<InstrumentDSP*()>;

    static InstrumentRegistry& getInstance() {
        static InstrumentRegistry instance;
        return instance;
    }

    void registerFactory(const char* name, FactoryFunc factory) {
        factories_[name] = factory;
    }

    InstrumentDSP* create(const char* name) {
        auto it = factories_.find(name);
        if (it != factories_.end()) {
            return it->second();
        }
        return nullptr;
    }

private:
    std::unordered_map<std::string, FactoryFunc> factories_;
};

//==============================================================================
// Auto-Registration Detail
//==============================================================================

namespace Detail {

/**
 * @brief Helper class for auto-registration of instruments
 *
 * Creates a global object that registers an instrument factory
 * during static initialization.
 */
struct AutoRegistrar {
    AutoRegistrar(const char* name, std::function<InstrumentDSP*()> factory) {
        InstrumentRegistry::getInstance().registerFactory(name, factory);
    }
};

} // namespace Detail

//==============================================================================
// Auto-Registration Macros
//==============================================================================

/**
 * @brief Register instrument factory at static initialization
 *
 * Use this macro in your instrument's .cpp file to automatically
 * register the instrument factory when the program loads.
 *
 * Example usage:
 * ```cpp
 * // In NexSynthDSP.cpp
 * #include "dsp/InstrumentFactory.h"
 *
 * DSP_REGISTER_INSTRUMENT(NexSynthDSP, "NexSynth");
 * ```
 *
 * This creates a global object that registers the factory during
 * static initialization (before main()).
 */
#define DSP_REGISTER_INSTRUMENT(ClassName, InstrumentName) \
    namespace { \
        static ::DSP::Detail::AutoRegistrar ClassName##_registrar_( \
            InstrumentName, \
            []() -> ::DSP::InstrumentDSP* { return new ClassName(); } \
        ); \
    }

/**
 * @brief Register instrument factory with custom create function
 *
 * Use this if you need a custom factory function (e.g., with parameters).
 *
 * Example:
 * ```cpp
 * DSP_REGISTER_INSTRUMENT_CUSTOM("NexSynth", []() {
 *     auto* synth = new NexSynthDSP();
 *     synth->setCustomMode(true);
 *     return synth;
 * });
 * ```
 */
#define DSP_REGISTER_INSTRUMENT_CUSTOM(InstrumentName, FactoryLambda) \
    namespace { \
        static ::DSP::Detail::AutoRegistrar ClassName##_registrar_( \
            InstrumentName, \
            FactoryLambda \
        ); \
    }

//==============================================================================
// Convenience Macros
//==============================================================================

/**
 * @brief Declare factory function for instrument
 *
 * Place in header file to declare the static create() method.
 */
#define DSP_DECLARE_FACTORY(ClassName) \
    static ::DSP::InstrumentDSP* create();

/**
 * @brief Define factory function for instrument
 *
 * Place in .cpp file to implement the static create() method.
 */
#define DSP_DEFINE_FACTORY(ClassName) \
    ::DSP::InstrumentDSP* ClassName::create() { \
        return new ClassName(); \
    }

/**
 * @brief Declare and define factory in one place
 *
 * Use in header if you want everything inline.
 */
#define DSP_FACTORY(ClassName) \
    static ::DSP::InstrumentDSP* create() { \
        return new ClassName(); \
    }

//==============================================================================
// Factory Functions
//==============================================================================

/**
 * @brief Create an instrument by name
 *
 * Creates a new instrument instance using the registered factory.
 * The caller is responsible for deleting the returned pointer.
 *
 * @param name Instrument name (e.g., "NexSynth", "SamSampler", "AetherGiantDrums")
 * @return New instrument instance, or nullptr if not found
 */
InstrumentDSP* createInstrument(const char* name);

/**
 * @brief Register an instrument factory
 *
 * Registers a factory function for creating instruments by name.
 *
 * @param name Instrument name to register
 * @param factory Factory function that creates new instances
 */
void registerInstrumentFactory(const char* name, std::function<InstrumentDSP*()> factory);

} // namespace DSP

#endif // DSP_INSTRUMENT_FACTORY_H_INCLUDED
