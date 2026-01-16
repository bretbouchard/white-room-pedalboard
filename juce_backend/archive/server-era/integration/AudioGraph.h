/*
  ==============================================================================

    AudioGraph.h
    Created: December 30, 2025
    Author: Bret Bouchard

    Audio graph structure for SDK integration

  ==============================================================================
*/

#ifndef AUDIO_GRAPH_H_INCLUDED
#define AUDIO_GRAPH_H_INCLUDED

#include "dsp/InstrumentDSP.h"
#include <vector>
#include <memory>

namespace Integration {

/**
 * @brief Audio processing graph
 *
 * Contains all instruments and their connections for playback.
 * This is built from a SongModel by the SongModelAdapter.
 */
struct AudioGraph {
    std::vector<DSP::InstrumentDSP*> instruments;
    bool valid;

    AudioGraph() : valid(false) {}

    ~AudioGraph() {
        // Note: Instruments are owned by EngineController, not the graph
        instruments.clear();
    }
};

} // namespace Integration

#endif // AUDIO_GRAPH_H_INCLUDED
