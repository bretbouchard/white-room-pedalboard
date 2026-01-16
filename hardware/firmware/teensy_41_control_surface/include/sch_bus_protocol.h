/**
 * SCH-BUS/1 Protocol Implementation for Teensy 4.1
 * White Room Hardware Platform - Bus Protocol Specification
 *
 * Message Frame Format:
 * [SOF 1B][VER 1B][TYPE 1B][LEN 2B][SRC 2B][DST 2B][SEQ 2B][PAYLOAD...][CRC 2B]
 *
 * SOF: 0xAA (start of frame)
 * VER: 0x01 (protocol version)
 * TYPE: Message type (HELLO, WELCOME, EVENT, FEEDBACK, ERROR)
 * LEN: Payload length (big-endian)
 * SRC: Source address (big-endian)
 * DST: Destination address (big-endian)
 * SEQ: Sequence number (big-endian)
 * PAYLOAD: Variable-length payload
 * CRC: CRC16-CCITT (polynomial 0x1021)
 */

#ifndef SCH_BUS_PROTOCOL_H
#define SCH_BUS_PROTOCOL_H

#include <Arduino.h>
#include <stdint.h>

// ============================================================================
// Protocol Constants
// ============================================================================

#define SCH_BUS_SOF              0xAA
#define SCH_BUS_VERSION          0x01
#define SCH_BUS_MAX_PAYLOAD      256
#define SCH_BUS_MAX_FRAME_SIZE   (SCH_BUS_MAX_PAYLOAD + 13)  // 13 bytes overhead

// ============================================================================
// Message Types
// ============================================================================

enum SchBusMessageType : uint8_t {
    SCH_BUS_MSG_HELLO             = 0x01,
    SCH_BUS_MSG_WELCOME           = 0x02,
    SCH_BUS_MSG_MANIFEST_REQUEST  = 0x03,
    SCH_BUS_MSG_MANIFEST          = 0x04,
    SCH_BUS_MSG_EVENT             = 0x10,
    SCH_BUS_MSG_FEEDBACK          = 0x11,
    SCH_BUS_MSG_ERROR             = 0xFF
};

// ============================================================================
// Message Structure
// ============================================================================

struct SchBusMessage {
    uint8_t  type;
    uint16_t src_addr;
    uint16_t dst_addr;
    uint16_t seq;
    uint16_t length;
    uint8_t  payload[SCH_BUS_MAX_PAYLOAD];
};

// ============================================================================
// SCH-BUS/1 Protocol Handler
// ============================================================================

class SchBusProtocol {
public:
    /**
     * Initialize SCH-BUS/1 protocol handler
     * @param module_addr Module's address (e.g., 0x0001)
     * @param host_addr Host's address (typically 0x0000)
     */
    void init(uint16_t module_addr, uint16_t host_addr);

    /**
     * Send HELLO message (module enumeration)
     * @return true if sent successfully
     */
    bool sendHello();

    /**
     * Send MANIFEST message (module capabilities)
     * @param_manifest JSON manifest string
     * @return true if sent successfully
     */
    bool sendManifest(const char* manifest);

    /**
     * Send EVENT message (encoder change)
     * @param encoder_index Encoder index (0-7)
     * @param value Normalized value (0-4095)
     * @param timestamp Timestamp in microseconds
     * @return true if sent successfully
     */
    bool sendEncoderEvent(uint8_t encoder_index, uint16_t value, uint64_t timestamp);

    /**
     * Send EVENT message (switch press)
     * @param switch_index Switch index (0-7)
     * @param pressed Switch state (true=pressed, false=released)
     * @param timestamp Timestamp in microseconds
     * @return true if sent successfully
     */
    bool sendSwitchEvent(uint8_t switch_index, bool pressed, uint64_t timestamp);

    /**
     * Receive and parse incoming message
     * @param msg Output message structure
     * @return true if valid message received
     */
    bool receive(SchBusMessage* msg);

private:
    uint16_t module_addr_;
    uint16_t host_addr_;
    uint16_t seq_out_;
    uint16_t seq_in_;

    // Receive buffer
    uint8_t rx_buffer_[SCH_BUS_MAX_FRAME_SIZE];
    size_t rx_index_;

    /**
     * Build SCH-BUS/1 frame
     * @param type Message type
     * @param payload Payload data
     * @param payload_len Payload length
     * @param output Output buffer
     * @param output_size Output buffer size
     * @return Frame length, or 0 on error
     */
    size_t buildFrame(uint8_t type, const uint8_t* payload, size_t payload_len,
                      uint8_t* output, size_t output_size);

    /**
     * Parse SCH-BUS/1 frame
     * @param frame Input frame data
     * @param frame_len Frame length
     * @param msg Output message structure
     * @return true if valid frame parsed
     */
    bool parseFrame(const uint8_t* frame, size_t frame_len, SchBusMessage* msg);

    /**
     * Calculate CRC16-CCITT checksum
     * @param data Input data
     * @param length Data length
     * @return CRC16 checksum
     */
    uint16_t calculateCRC16(const uint8_t* data, size_t length);

    /**
     * Write 16-bit value in big-endian format
     * @param buf Output buffer
     * @param offset Offset in buffer
     * @param value Value to write
     */
    void write16BE(uint8_t* buf, size_t offset, uint16_t value);

    /**
     * Read 16-bit value in big-endian format
     * @param buf Input buffer
     * @param offset Offset in buffer
     * @return 16-bit value
     */
    uint16_t read16BE(const uint8_t* buf, size_t offset);
};

#endif // SCH_BUS_PROTOCOL_H
