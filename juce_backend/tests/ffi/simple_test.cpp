//
//  simple_test.cpp
//  Simple FFI bridge test
//

#include "../src/ffi/sch_engine_ffi.h"
#include <iostream>
#include <cstring>

int main() {
    std::cout << "Testing Schillinger FFI Bridge..." << std::endl;

    // Test 1: Create engine
    sch_engine_handle engine = nullptr;
    sch_result_t result = sch_engine_create(&engine);

    if (result != SCH_OK) {
        std::cerr << "ERROR: Failed to create engine: " << result << std::endl;
        return 1;
    }

    std::cout << "✓ Engine created successfully" << std::endl;

    // Test 2: Get version
    sch_string_t version;
    result = sch_engine_get_version(&version);

    if (result != SCH_OK) {
        std::cerr << "ERROR: Failed to get version: " << result << std::endl;
        sch_engine_destroy(engine);
        return 1;
    }

    std::cout << "✓ Version: " << version.data << std::endl;
    sch_free_string(&version);

    // Test 3: Create default song
    result = sch_engine_create_default_song(engine);

    if (result != SCH_OK) {
        std::cerr << "ERROR: Failed to create default song: " << result << std::endl;
        sch_engine_destroy(engine);
        return 1;
    }

    std::cout << "✓ Default song created" << std::endl;

    // Test 4: Get song
    sch_string_t json;
    result = sch_engine_get_song(engine, &json);

    if (result != SCH_OK) {
        std::cerr << "ERROR: Failed to get song: " << result << std::endl;
        sch_engine_destroy(engine);
        return 1;
    }

    std::cout << "✓ Song JSON retrieved (" << json.length << " bytes)" << std::endl;
    sch_free_string(&json);

    // Test 5: Set tempo
    result = sch_engine_set_tempo(engine, 140.0);

    if (result != SCH_OK) {
        std::cerr << "ERROR: Failed to set tempo: " << result << std::endl;
        sch_engine_destroy(engine);
        return 1;
    }

    std::cout << "✓ Tempo set to 140.0 BPM" << std::endl;

    // Test 6: Send MIDI note
    result = sch_engine_send_note_on(engine, 0, 60, 0.8f);

    if (result != SCH_OK) {
        std::cerr << "ERROR: Failed to send note on: " << result << std::endl;
        sch_engine_destroy(engine);
        return 1;
    }

    std::cout << "✓ Note ON sent (ch=0, note=60, vel=0.8)" << std::endl;

    // Test 7: All notes off
    result = sch_engine_all_notes_off(engine);

    if (result != SCH_OK) {
        std::cerr << "ERROR: Failed to send all notes off: " << result << std::endl;
        sch_engine_destroy(engine);
        return 1;
    }

    std::cout << "✓ All notes off sent" << std::endl;

    // Test 8: Destroy engine
    result = sch_engine_destroy(engine);

    if (result != SCH_OK) {
        std::cerr << "ERROR: Failed to destroy engine: " << result << std::endl;
        return 1;
    }

    std::cout << "✓ Engine destroyed successfully" << std::endl;

    std::cout << "\n✅ All tests passed!" << std::endl;
    return 0;
}
