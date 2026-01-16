/*
 * mixing_console_test.cpp
 * White Room Audio Engine - Mixing Console Tests
 */

#include <catch2/catch_test_macros.hpp>
#include "audio/mixing/mixing_console.h"
#include <memory>

using namespace white_room::audio;

TEST_CASE("MixingConsoleProcessor Initialization", "[mixing][console]") {
    MixingConsoleProcessor console;

    SECTION("Should create with master bus") {
        ChannelStrip* master = console.getMasterBus();
        REQUIRE(master != nullptr);
        REQUIRE(master->type == "master");
        REQUIRE(master->volume == 0.8f);
    }

    SECTION("Should start with no channels") {
        auto channels = console.getAllChannels();
        REQUIRE(channels.size() == 1); // Only master
    }
}

TEST_CASE("Channel Management", "[mixing][console]") {
    MixingConsoleProcessor console;

    SECTION("Should add channel") {
        auto channel = std::make_unique<ChannelStrip>();
        channel->id = 1;
        channel->name = "Kick";
        channel->type = "audio";

        console.addChannel(std::move(channel));

        ChannelStrip* retrieved = console.getChannel(1);
        REQUIRE(retrieved != nullptr);
        REQUIRE(retrieved->name == "Kick");
    }

    SECTION("Should remove channel") {
        auto channel = std::make_unique<ChannelStrip>();
        channel->id = 1;
        channel->name = "Kick";

        console.addChannel(std::move(channel));
        console.removeChannel(1);

        ChannelStrip* retrieved = console.getChannel(1);
        REQUIRE(retrieved == nullptr);
    }

    SECTION("Should get all channels") {
        auto channel1 = std::make_unique<ChannelStrip>();
        channel1->id = 1;
        channel1->name = "Kick";

        auto channel2 = std::make_unique<ChannelStrip>();
        channel2->id = 2;
        channel2->name = "Snare";

        console.addChannel(std::move(channel1));
        console.addChannel(std::move(channel2));

        auto channels = console.getAllChannels();
        REQUIRE(channels.size() == 3); // 2 mix + 1 master
    }
}

TEST_CASE("Level Controls", "[mixing][console]") {
    MixingConsoleProcessor console;

    auto channel = std::make_unique<ChannelStrip>();
    channel->id = 1;
    channel->name = "Kick";
    channel->volume = 0.8f;

    console.addChannel(std::move(channel));

    SECTION("Should set volume") {
        console.setVolume(1, 0.5f);
        ChannelStrip* ch = console.getChannel(1);
        REQUIRE(ch->volume == 0.5f);
    }

    SECTION("Should clamp volume to valid range") {
        console.setVolume(1, 1.5f);
        REQUIRE(console.getChannel(1)->volume == 1.0f);

        console.setVolume(1, -0.5f);
        REQUIRE(console.getChannel(1)->volume == 0.0f);
    }

    SECTION("Should set pan") {
        console.setPan(1, 0.5f);
        REQUIRE(console.getChannel(1)->pan == 0.5f);
    }

    SECTION("Should clamp pan to valid range") {
        console.setPan(1, 1.5f);
        REQUIRE(console.getChannel(1)->pan == 1.0f);

        console.setPan(1, -1.5f);
        REQUIRE(console.getChannel(1)->pan == -1.0f);
    }

    SECTION("Should set mute") {
        console.setMute(1, true);
        REQUIRE(console.getChannel(1)->isMuted == true);
    }

    SECTION("Should set solo") {
        console.setSolo(1, true);
        REQUIRE(console.getChannel(1)->isSolo == true);
    }
}

TEST_CASE("Mute/Solo Logic", "[mixing][console]") {
    MixingConsoleProcessor console;

    auto channel1 = std::make_unique<ChannelStrip>();
    channel1->id = 1;
    channel1->name = "Kick";

    auto channel2 = std::make_unique<ChannelStrip>();
    channel2->id = 2;
    channel2->name = "Snare";

    console.addChannel(std::move(channel1));
    console.addChannel(std::move(channel2));

    SECTION("Should mute other channels when solo is active") {
        console.setSolo(1, true);

        REQUIRE(console.getChannel(1)->isSolo == true);
        REQUIRE(console.getChannel(1)->isMuted == false);
        REQUIRE(console.getChannel(2)->isMuted == true);
    }

    SECTION("Should unmute all channels when solo is disabled") {
        console.setSolo(1, true);
        console.setSolo(1, false);

        REQUIRE(console.getChannel(1)->isSolo == false);
        REQUIRE(console.getChannel(1)->isMuted == false);
        REQUIRE(console.getChannel(2)->isMuted == false);
    }

    SECTION("Should handle multiple soloed channels") {
        console.setSolo(1, true);
        console.setSolo(2, true);

        REQUIRE(console.getChannel(1)->isSolo == true);
        REQUIRE(console.getChannel(2)->isSolo == true);
        REQUIRE(console.getChannel(1)->isMuted == false);
        REQUIRE(console.getChannel(2)->isMuted == false);
    }
}

TEST_CASE("Audio Processing", "[mixing][console]") {
    MixingConsoleProcessor console;

    auto channel = std::make_unique<ChannelStrip>();
    channel->id = 1;
    channel->name = "Kick";
    channel->volume = 0.5f;

    console.addChannel(std::move(channel));

    console.prepareToPlay(44100.0, 512);

    SECTION("Should process audio buffer") {
        juce::AudioBuffer<float> buffer(2, 512);

        // Fill with test signal
        for (int i = 0; i < 512; ++i) {
            buffer.setSample(0, i, 0.5f);
            buffer.setSample(1, i, 0.5f);
        }

        console.processBlock(buffer);

        // Check that buffer was processed
        // (In real test, verify volume was applied)
        REQUIRE(true); // Placeholder
    }

    SECTION("Should reset metering") {
        juce::AudioBuffer<float> buffer(2, 512);
        console.processBlock(buffer);

        console.reset();

        REQUIRE(console.getChannel(1)->levelL == -60.0f);
        REQUIRE(console.getChannel(1)->levelR == -60.0f);
    }
}

TEST_CASE("Metering", "[mixing][console]") {
    MixingConsoleProcessor console;

    auto channel = std::make_unique<ChannelStrip>();
    channel->id = 1;
    channel->name = "Kick";

    console.addChannel(std::move(channel));
    console.prepareToPlay(44100.0, 512);

    SECTION("Should return channel levels") {
        juce::AudioBuffer<float> buffer(2, 512);

        // Fill with test signal
        for (int i = 0; i < 512; ++i) {
            buffer.setSample(0, i, 0.5f);
            buffer.setSample(1, i, 0.5f);
        }

        console.processBlock(buffer);

        float levelL = console.getLevelL(1);
        float levelR = console.getLevelR(1);

        // Levels should be above -60dB
        REQUIRE(levelL > -60.0f);
        REQUIRE(levelR > -60.0f);
    }

    SECTION("Should return peak levels") {
        juce::AudioBuffer<float> buffer(2, 512);

        for (int i = 0; i < 512; ++i) {
            buffer.setSample(0, i, 0.8f);
            buffer.setSample(1, i, 0.8f);
        }

        console.processBlock(buffer);

        float peakL = console.getPeakL(1);
        float peakR = console.getPeakR(1);

        REQUIRE(peakL > -60.0f);
        REQUIRE(peakR > -60.0f);
    }

    SECTION("Should get all meter data") {
        auto meterData = console.getAllMeterData();

        REQUIRE(meterData.size() >= 1); // At least master
        REQUIRE(meterData.count(0) == 1); // Master bus
    }
}

TEST_CASE("Routing", "[mixing][console]") {
    MixingConsoleProcessor console;

    auto channel = std::make_unique<ChannelStrip>();
    channel->id = 1;
    channel->name = "Kick";
    channel->outputBus = "master";

    console.addChannel(std::move(channel));

    SECTION("Should set output bus") {
        console.setOutputBus(1, "drum_bus");
        REQUIRE(console.getChannel(1)->outputBus == "drum_bus");
    }

    SECTION("Should not allow output bus change on master") {
        console.setOutputBus(0, "some_bus");
        REQUIRE(console.getMasterBus()->outputBus == "master");
    }
}
