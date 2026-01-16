/**
 * SCH-BUS/1 Protocol Implementation
 * White Room Hardware Platform - Bus Protocol
 */

#include "sch_bus_protocol.h"

// ============================================================================
// Initialization
// ============================================================================

void SchBusProtocol::init(uint16_t module_addr, uint16_t host_addr) {
    module_addr_ = module_addr;
    host_addr_ = host_addr;
    seq_out_ = 0;
    seq_in_ = 0;
    rx_index_ = 0;

    // Initialize USB serial (SCH-BUS/1 transport)
    Serial.begin(115200);
}

// ============================================================================
// Message Sending
// ============================================================================

bool SchBusProtocol::sendHello() {
    // HELLO message has no payload
    uint8_t frame[SCH_BUS_MAX_FRAME_SIZE];
    size_t frame_len = buildFrame(SCH_BUS_MSG_HELLO, nullptr, 0, frame, sizeof(frame));

    if (frame_len == 0) {
        return false;
    }

    // Send frame via USB
    Serial.write(frame, frame_len);
    return true;
}

bool SchBusProtocol::sendManifest(const char* manifest) {
    size_t manifest_len = strlen(manifest);

    if (manifest_len > SCH_BUS_MAX_PAYLOAD) {
        return false;  // Manifest too large
    }

    uint8_t frame[SCH_BUS_MAX_FRAME_SIZE];
    size_t frame_len = buildFrame(SCH_BUS_MSG_MANIFEST,
                                   (const uint8_t*)manifest,
                                   manifest_len,
                                   frame,
                                   sizeof(frame));

    if (frame_len == 0) {
        return false;
    }

    // Send frame via USB
    Serial.write(frame, frame_len);
    return true;
}

bool SchBusProtocol::sendEncoderEvent(uint8_t encoder_index, uint16_t value, uint64_t timestamp) {
    // EVENT message payload: [endpoint_id_hi, endpoint_id_lo, value_hi, value_lo, timestamp...]
    uint8_t payload[16];
    size_t payload_len = 0;

    // Endpoint ID (e.g., "knob.0" -> hash or simple encoding)
    uint16_t endpoint_id = 0x0000 + encoder_index;  // Simple: knob.0 = 0x0000, knob.1 = 0x0001, etc.

    payload[payload_len++] = (endpoint_id >> 8) & 0xFF;
    payload[payload_len++] = endpoint_id & 0xFF;

    // Value (16-bit)
    payload[payload_len++] = (value >> 8) & 0xFF;
    payload[payload_len++] = value & 0xFF;

    // Timestamp (64-bit, future: for replay)
    for (int i = 56; i >= 0; i -= 8) {
        payload[payload_len++] = (timestamp >> i) & 0xFF;
    }

    uint8_t frame[SCH_BUS_MAX_FRAME_SIZE];
    size_t frame_len = buildFrame(SCH_BUS_MSG_EVENT, payload, payload_len, frame, sizeof(frame));

    if (frame_len == 0) {
        return false;
    }

    // Send frame via USB
    Serial.write(frame, frame_len);
    return true;
}

bool SchBusProtocol::sendSwitchEvent(uint8_t switch_index, bool pressed, uint64_t timestamp) {
    // EVENT message payload for switch: [endpoint_id_hi, endpoint_id_lo, state, timestamp...]
    uint8_t payload[17];
    size_t payload_len = 0;

    // Endpoint ID (e.g., "switch.0" -> hash or simple encoding)
    uint16_t endpoint_id = 0x0100 + switch_index;  // Simple: switch.0 = 0x0100, etc.

    payload[payload_len++] = (endpoint_id >> 8) & 0xFF;
    payload[payload_len++] = endpoint_id & 0xFF;

    // State (1 = pressed, 0 = released)
    payload[payload_len++] = pressed ? 1 : 0;

    // Timestamp (64-bit)
    for (int i = 56; i >= 0; i -= 8) {
        payload[payload_len++] = (timestamp >> i) & 0xFF;
    }

    uint8_t frame[SCH_BUS_MAX_FRAME_SIZE];
    size_t frame_len = buildFrame(SCH_BUS_MSG_EVENT, payload, payload_len, frame, sizeof(frame));

    if (frame_len == 0) {
        return false;
    }

    // Send frame via USB
    Serial.write(frame, frame_len);
    return true;
}

// ============================================================================
// Message Receiving
// ============================================================================

bool SchBusProtocol::receive(SchBusMessage* msg) {
    // Read all available bytes from USB
    while (Serial.available()) {
        uint8_t byte = Serial.read();

        // Look for SOF (start of frame)
        if (rx_index_ == 0 && byte != SCH_BUS_SOF) {
            continue;  // Not a start of frame, keep looking
        }

        // Add byte to receive buffer
        if (rx_index_ < SCH_BUS_MAX_FRAME_SIZE) {
            rx_buffer_[rx_index_++] = byte;
        } else {
            // Buffer overflow, reset
            rx_index_ = 0;
            continue;
        }

        // Check if we have minimum frame size (SOF + VER + TYPE + LEN + SRC + DST + SEQ + CRC = 13 bytes)
        if (rx_index_ >= 13) {
            // Extract payload length (bytes 4-5, big-endian)
            uint16_t payload_len = read16BE(rx_buffer_, 4);

            // Total frame size = 13 (header + CRC) + payload_len
            size_t total_frame_len = 13 + payload_len;

            // Check if complete frame received
            if (rx_index_ >= total_frame_len) {
                // Parse frame
                if (parseFrame(rx_buffer_, total_frame_len, msg)) {
                    // Reset receive buffer
                    rx_index_ = 0;
                    return true;  // Valid message received
                } else {
                    // Invalid frame, reset
                    rx_index_ = 0;
                }
            }
        }
    }

    return false;  // No complete message yet
}

// ============================================================================
// Frame Building
// ============================================================================

size_t SchBusProtocol::buildFrame(uint8_t type, const uint8_t* payload, size_t payload_len,
                                  uint8_t* output, size_t output_size) {
    // Check output buffer size
    size_t frame_len = 13 + payload_len;  // 13 bytes header + CRC + payload
    if (frame_len > output_size) {
        return 0;  // Buffer too small
    }

    size_t index = 0;

    // SOF (Start of Frame)
    output[index++] = SCH_BUS_SOF;

    // VER (Protocol Version)
    output[index++] = SCH_BUS_VERSION;

    // TYPE (Message Type)
    output[index++] = type;

    // LEN (Payload Length, big-endian)
    write16BE(output, index, payload_len);
    index += 2;

    // SRC (Source Address, big-endian)
    write16BE(output, index, module_addr_);
    index += 2;

    // DST (Destination Address, big-endian)
    write16BE(output, index, host_addr_);
    index += 2;

    // SEQ (Sequence Number, big-endian)
    write16BE(output, index, seq_out_);
    index += 2;
    seq_out_++;

    // PAYLOAD
    if (payload_len > 0 && payload != nullptr) {
        memcpy(&output[index], payload, payload_len);
        index += payload_len;
    }

    // CRC16-CCITT (calculated over everything except CRC field itself)
    uint16_t crc = calculateCRC16(output, index);
    write16BE(output, index, crc);
    index += 2;

    return index;
}

// ============================================================================
// Frame Parsing
// ============================================================================

bool SchBusProtocol::parseFrame(const uint8_t* frame, size_t frame_len, SchBusMessage* msg) {
    // Verify SOF
    if (frame[0] != SCH_BUS_SOF) {
        return false;
    }

    // Verify protocol version
    if (frame[1] != SCH_BUS_VERSION) {
        return false;
    }

    // Extract message type
    msg->type = frame[2];

    // Extract payload length
    uint16_t payload_len = read16BE(frame, 4);
    msg->length = payload_len;

    // Verify frame length
    if (frame_len != 13 + payload_len) {
        return false;
    }

    // Extract source address
    msg->src_addr = read16BE(frame, 6);

    // Extract destination address
    msg->dst_addr = read16BE(frame, 8);

    // Extract sequence number
    msg->seq = read16BE(frame, 10);

    // Extract payload
    if (payload_len > 0 && payload_len <= SCH_BUS_MAX_PAYLOAD) {
        memcpy(msg->payload, &frame[12], payload_len);
    }

    // Verify CRC
    uint16_t crc_calculated = calculateCRC16(frame, frame_len - 2);
    uint16_t crc_received = read16BE(frame, frame_len - 2);

    if (crc_calculated != crc_received) {
        return false;  // CRC mismatch
    }

    return true;  // Valid frame
}

// ============================================================================
// CRC16-CCITT Calculation
// ============================================================================

uint16_t SchBusProtocol::calculateCRC16(const uint8_t* data, size_t length) {
    uint16_t crc = 0xFFFF;  // Initial value
    const uint16_t polynomial = 0x1021;  // CRC16-CCITT polynomial

    for (size_t i = 0; i < length; i++) {
        crc ^= (uint16_t)data[i] << 8;

        for (int bit = 0; bit < 8; bit++) {
            if (crc & 0x8000) {
                crc = (crc << 1) ^ polynomial;
            } else {
                crc <<= 1;
            }
        }
    }

    return crc;
}

// ============================================================================
// Utility Functions
// ============================================================================

void SchBusProtocol::write16BE(uint8_t* buf, size_t offset, uint16_t value) {
    buf[offset] = (value >> 8) & 0xFF;
    buf[offset + 1] = value & 0xFF;
}

uint16_t SchBusProtocol::read16BE(const uint8_t* buf, size_t offset) {
    return ((uint16_t)buf[offset] << 8) | buf[offset + 1];
}
