/**
 * Unity Test Framework for Teensy 4.1 Control Surface
 * White Room Hardware Platform - Unit Tests
 */

#include <unity.h>
#include "sch_bus_protocol.h"
#include "control_surface.h"

// ============================================================================
// Test Setup/Teardown
// ============================================================================

void setUp(void) {
    // Run before each test
}

void tearDown(void) {
    // Run after each test
}

// ============================================================================
// SCH-BUS/1 Protocol Tests
// ============================================================================

/**
 * Test CRC16-CCITT calculation
 * Reference: https://www.lammertbies.nl/comm/info/crc-calculation
 */
void test_crc16_ccitt_calculation(void) {
    SchBusProtocol sch_bus;
    sch_bus.init(0x0001, 0x0000);

    // Test vector 1: "123456789"
    // Expected CRC16-CCITT: 0x29B1
    uint8_t test_data_1[] = {'1', '2', '3', '4', '5', '6', '7', '8', '9'};
    uint16_t crc_1 = sch_bus.calculateCRC16(test_data_1, sizeof(test_data_1));
    TEST_ASSERT_EQUAL_HEX16(0x29B1, crc_1);

    // Test vector 2: Empty data
    // Expected CRC16-CCITT: 0xFFFF (initial value)
    uint16_t crc_2 = sch_bus.calculateCRC16(nullptr, 0);
    TEST_ASSERT_EQUAL_HEX16(0xFFFF, crc_2);
}

/**
 * Test frame building for HELLO message
 */
void test_build_hello_frame(void) {
    SchBusProtocol sch_bus;
    sch_bus.init(0x0001, 0x0000);

    uint8_t frame[256];
    size_t frame_len = sch_bus.buildFrame(SCH_BUS_MSG_HELLO, nullptr, 0, frame, sizeof(frame));

    // Verify frame length (13 bytes: SOF + VER + TYPE + LEN + SRC + DST + SEQ + CRC)
    TEST_ASSERT_EQUAL(13, frame_len);

    // Verify SOF
    TEST_ASSERT_EQUAL_HEX8(0xAA, frame[0]);

    // Verify version
    TEST_ASSERT_EQUAL_HEX8(0x01, frame[1]);

    // Verify message type
    TEST_ASSERT_EQUAL_HEX8(SCH_BUS_MSG_HELLO, frame[2]);

    // Verify payload length (0 for HELLO)
    uint16_t payload_len = (frame[4] << 8) | frame[5];
    TEST_ASSERT_EQUAL(0, payload_len);

    // Verify source address
    uint16_t src_addr = (frame[6] << 8) | frame[7];
    TEST_ASSERT_EQUAL_HEX16(0x0001, src_addr);

    // Verify destination address
    uint16_t dst_addr = (frame[8] << 8) | frame[9];
    TEST_ASSERT_EQUAL_HEX16(0x0000, dst_addr);

    // Verify sequence number (should be 0 for first message)
    uint16_t seq = (frame[10] << 8) | frame[11];
    TEST_ASSERT_EQUAL_HEX16(0x0000, seq);

    // Verify CRC (last 2 bytes)
    // Note: We'll verify CRC calculation separately
}

/**
 * Test frame building for EVENT message (encoder)
 */
void test_build_encoder_event_frame(void) {
    SchBusProtocol sch_bus;
    sch_bus.init(0x0001, 0x0000);

    // Build EVENT frame for encoder 0, value 2048, timestamp 1000
    bool result = sch_bus.sendEncoderEvent(0, 2048, 1000);
    TEST_ASSERT_TRUE(result);
}

/**
 * Test big-endian read/write functions
 */
void test_big_endian_read_write(void) {
    uint8_t buffer[4] = {0};

    // Write 16-bit value 0x1234
    SchBusProtocol sch_bus;
    sch_bus.init(0x0001, 0x0000);

    sch_bus.write16BE(buffer, 0, 0x1234);
    TEST_ASSERT_EQUAL_HEX8(0x12, buffer[0]);
    TEST_ASSERT_EQUAL_HEX8(0x34, buffer[1]);

    // Read back
    uint16_t value = sch_bus.read16BE(buffer, 0);
    TEST_ASSERT_EQUAL_HEX16(0x1234, value);
}

// ============================================================================
// Control Surface State Tests
// ============================================================================

/**
 * Test state initialization
 */
void test_state_initialization(void) {
    ControlSurfaceState state;
    state_init(&state);

    // Verify all encoder positions initialized to 2048 (center)
    for (uint8_t i = 0; i < 8; i++) {
        TEST_ASSERT_EQUAL(2048, state.encoder_positions[i]);
    }

    // Verify all switches initialized to false (not pressed)
    for (uint8_t i = 0; i < 8; i++) {
        TEST_ASSERT_FALSE(state.encoder_switch_states[i]);
    }

    // Verify all LEDs initialized to off
    for (uint8_t i = 0; i < 8; i++) {
        TEST_ASSERT_EQUAL(0, state.led_colors[i].r);
        TEST_ASSERT_EQUAL(0, state.led_colors[i].g);
        TEST_ASSERT_EQUAL(0, state.led_colors[i].b);
    }

    // Verify dirty flag initialized to false
    TEST_ASSERT_FALSE(state.leds_dirty);
}

/**
 * Test LED color structure
 */
void test_led_color_structure(void) {
    LEDColor color;
    color.r = 0xFFFF;
    color.g = 0x8000;
    color.b = 0x0000;

    TEST_ASSERT_EQUAL_HEX16(0xFFFF, color.r);
    TEST_ASSERT_EQUAL_HEX16(0x8000, color.g);
    TEST_ASSERT_EQUAL_HEX16(0x0000, color.b);
}

// ============================================================================
// Main Test Runner
// ============================================================================

int main(int argc, char **argv) {
    UNITY_BEGIN();

    // SCH-BUS/1 Protocol Tests
    RUN_TEST(test_crc16_ccitt_calculation);
    RUN_TEST(test_build_hello_frame);
    RUN_TEST(test_build_encoder_event_frame);
    RUN_TEST(test_big_endian_read_write);

    // Control Surface State Tests
    RUN_TEST(test_state_initialization);
    RUN_TEST(test_led_color_structure);

    return UNITY_END();
}
