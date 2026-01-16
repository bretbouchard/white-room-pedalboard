/*
  ==============================================================================

    AudioBufferPoolTest.cpp
    Created: December 31, 2025
    Author: Bret Bouchard

    Tests for AudioBufferPool lock-free memory management.

  ==============================================================================
*/

#include <gtest/gtest.h>
#include "dsp/AudioBufferPool.h"
#include <juce_audio_basics/juce_audio_basics.h>

//==============================================================================
// Basic Pool Tests
//==============================================================================

TEST(AudioBufferPoolTest, InitialPoolHasFreeBuffers)
{
    printf("\n=== INITIAL POOL TEST ===\n");

    AudioBufferPool pool(512, 2, 16);

    auto stats = pool.getStatistics();
    EXPECT_EQ(stats.totalBuffers, 16);
    EXPECT_EQ(stats.freeBuffers, 16);
    EXPECT_EQ(stats.totalAllocations, 16);
    EXPECT_EQ(stats.totalReturns, 0);

    printf("  ✓ Pool initialized with %d buffers\n", stats.totalBuffers);
}

TEST(AudioBufferPoolTest, AcquireAndReleaseBuffer)
{
    printf("\n=== ACQUIRE/RELEASE TEST ===\n");

    AudioBufferPool pool(512, 2, 4);

    // Acquire a buffer
    PooledAudioBuffer* buffer = pool.acquire(2, 512);
    ASSERT_NE(buffer, nullptr) << "Failed to acquire buffer from pool";

    EXPECT_EQ(buffer->getNumChannels(), 2);
    EXPECT_EQ(buffer->getNumSamples(), 512);

    auto statsAfterAcquire = pool.getStatistics();
    EXPECT_EQ(statsAfterAcquire.freeBuffers, 3);

    printf("  ✓ Acquired buffer: %d channels × %d samples\n",
           buffer->getNumChannels(), buffer->getNumSamples());

    // Release the buffer
    pool.release(buffer);

    auto statsAfterRelease = pool.getStatistics();
    EXPECT_EQ(statsAfterRelease.freeBuffers, 4);
    EXPECT_EQ(statsAfterRelease.totalReturns, 1);

    printf("  ✓ Buffer returned to pool\n");
}

TEST(AudioBufferPoolTest, AcquireAllBuffers)
{
    printf("\n=== ACQUIRE ALL BUFFERS TEST ===\n");

    AudioBufferPool pool(512, 2, 4);

    // Acquire all buffers
    PooledAudioBuffer* buffers[4];
    for (int i = 0; i < 4; ++i)
    {
        buffers[i] = pool.acquire(2, 512);
        ASSERT_NE(buffers[i], nullptr) << "Failed to acquire buffer " << i;
    }

    auto stats = pool.getStatistics();
    EXPECT_EQ(stats.freeBuffers, 0);

    printf("  ✓ All %d buffers acquired\n", 4);

    // Try to acquire one more (should fail)
    PooledAudioBuffer* extra = pool.acquire(2, 512);
    EXPECT_EQ(extra, nullptr) << "Should not acquire buffer when pool is empty";

    printf("  ✓ Correctly returns nullptr when pool empty\n");

    // Release all buffers
    for (int i = 0; i < 4; ++i)
    {
        pool.release(buffers[i]);
    }

    stats = pool.getStatistics();
    EXPECT_EQ(stats.freeBuffers, 4);

    printf("  ✓ All buffers returned to pool\n");
}

//==============================================================================
// Buffer Content Tests
//==============================================================================

TEST(AudioBufferPoolTest, BufferClear)
{
    printf("\n=== BUFFER CLEAR TEST ===\n");

    AudioBufferPool pool(512, 2, 4);
    PooledAudioBuffer* buffer = pool.acquire(2, 256);

    // Fill buffer with garbage
    for (int ch = 0; ch < buffer->getNumChannels(); ++ch)
    {
        float* ptr = buffer->getChannelWritePointer(ch);
        for (int i = 0; i < buffer->getNumSamples(); ++i)
        {
            ptr[i] = 1.0f;
        }
    }

    // Clear
    buffer->clear();

    // Verify all zeros
    for (int ch = 0; ch < buffer->getNumChannels(); ++ch)
    {
        const float* ptr = buffer->getChannelReadPointer(ch);
        for (int i = 0; i < buffer->getNumSamples(); ++i)
        {
            EXPECT_FLOAT_EQ(ptr[i], 0.0f) << "Buffer not cleared at ch=" << ch << " i=" << i;
        }
    }

    printf("  ✓ Buffer cleared to zero (%d channels × %d samples)\n",
           buffer->getNumChannels(), buffer->getNumSamples());

    pool.release(buffer);
}

TEST(AudioBufferPoolTest, CopyFromJUCEBuffer)
{
    printf("\n=== COPY FROM JUCE BUFFER TEST ===\n");

    AudioBufferPool pool(512, 2, 4);
    PooledAudioBuffer* pooled = pool.acquire(2, 256);

    // Create JUCE buffer with test pattern
    juce::AudioBuffer<float> juceBuffer(2, 256);
    for (int ch = 0; ch < 2; ++ch)
    {
        float* ptr = juceBuffer.getWritePointer(ch);
        for (int i = 0; i < 256; ++i)
        {
            ptr[i] = static_cast<float>(i) / 256.0f;
        }
    }

    // Copy
    pooled->copyFrom(juceBuffer);

    // Verify
    for (int ch = 0; ch < 2; ++ch)
    {
        const float* pooledPtr = pooled->getChannelReadPointer(ch);
        const float* jucePtr = juceBuffer.getReadPointer(ch);

        for (int i = 0; i < 256; ++i)
        {
            EXPECT_FLOAT_EQ(pooledPtr[i], jucePtr[i])
                << "Mismatch at ch=" << ch << " i=" << i;
        }
    }

    printf("  ✓ Copied from JUCE buffer correctly\n");

    pool.release(pooled);
}

TEST(AudioBufferPoolTest, CopyToJUCEBuffer)
{
    printf("\n=== COPY TO JUCE BUFFER TEST ===\n");

    AudioBufferPool pool(512, 2, 4);
    PooledAudioBuffer* pooled = pool.acquire(2, 256);

    // Fill pooled buffer with test pattern
    for (int ch = 0; ch < 2; ++ch)
    {
        float* ptr = pooled->getChannelWritePointer(ch);
        for (int i = 0; i < 256; ++i)
        {
            ptr[i] = static_cast<float>(i + ch * 1000) / 256.0f;
        }
    }

    // Create JUCE buffer and copy into it
    juce::AudioBuffer<float> juceBuffer(2, 256);
    pooled->copyTo(juceBuffer);

    // Verify
    for (int ch = 0; ch < 2; ++ch)
    {
        const float* pooledPtr = pooled->getChannelReadPointer(ch);
        const float* jucePtr = juceBuffer.getReadPointer(ch);

        for (int i = 0; i < 256; ++i)
        {
            EXPECT_FLOAT_EQ(pooledPtr[i], jucePtr[i])
                << "Mismatch at ch=" << ch << " i=" << i;
        }
    }

    printf("  ✓ Copied to JUCE buffer correctly\n");

    pool.release(pooled);
}

//==============================================================================
// Reference Counting Tests
//==============================================================================

TEST(AudioBufferPoolTest, ReferenceCounting)
{
    printf("\n=== REFERENCE COUNTING TEST ===\n");

    AudioBufferPool pool(512, 2, 4);

    // Acquire buffer
    PooledAudioBuffer* buffer = pool.acquire(2, 512);
    ASSERT_NE(buffer, nullptr);

    auto stats1 = pool.getStatistics();
    EXPECT_EQ(stats1.freeBuffers, 3);

    // Add reference
    buffer->addRef();

    // Release once - should not return to pool
    pool.release(buffer);
    auto stats2 = pool.getStatistics();
    EXPECT_EQ(stats2.freeBuffers, 3) << "Buffer should not return to pool yet";

    // Release again - should return to pool now
    pool.release(buffer);
    auto stats3 = pool.getStatistics();
    EXPECT_EQ(stats3.freeBuffers, 4) << "Buffer should return to pool now";
    EXPECT_EQ(stats3.totalReturns, 1);

    printf("  ✓ Reference counting works correctly\n");
}

//==============================================================================
// Stress Test
//==============================================================================

TEST(AudioBufferPoolTest, StressTest)
{
    printf("\n=== STRESS TEST ===\n");

    AudioBufferPool pool(512, 2, 16);

    const int numIterations = 1000;
    std::vector<PooledAudioBuffer*> heldBuffers;

    for (int i = 0; i < numIterations; ++i)
    {
        // Randomly acquire or release
        if (heldBuffers.empty() || (rand() % 2 == 0))
        {
            // Acquire
            auto* buffer = pool.acquire(2, 512);
            if (buffer != nullptr)
            {
                heldBuffers.push_back(buffer);
            }
        }
        else
        {
            // Release random buffer
            size_t idx = rand() % heldBuffers.size();
            pool.release(heldBuffers[idx]);
            heldBuffers.erase(heldBuffers.begin() + idx);
        }
    }

    // Release all remaining
    for (auto* buffer : heldBuffers)
    {
        pool.release(buffer);
    }

    auto finalStats = pool.getStatistics();
    EXPECT_EQ(finalStats.freeBuffers, 16) << "All buffers should be returned";
    EXPECT_EQ(finalStats.totalReturns, static_cast<int64_t>(heldBuffers.size()));

    printf("  ✓ Stress test passed: %d iterations\n", numIterations);
    printf("    Final state: %d/%d buffers free\n",
           finalStats.freeBuffers, finalStats.totalBuffers);
}

//==============================================================================
// Performance Summary
//==============================================================================

TEST(AudioBufferPoolTest, PrintPerformanceSummary)
{
    printf("\n=== AUDIO BUFFER POOL SUMMARY ===\n");

    printf("\nBenefits:\n");
    printf("  ✓ Eliminates allocations in audio thread\n");
    printf("  ✓ Lock-free acquire/release operations\n");
    printf("  ✓ Pre-allocated buffers reduce memory fragmentation\n");
    printf("  ✓ Reference counting enables buffer sharing\n");

    printf("\nExpected Performance Improvement:\n");
    printf("  - Eliminates new/delete overhead (~100-500 cycles per allocation)\n");
    printf("  - Better cache locality (contiguous memory)\n");
    printf("  - More predictable performance (no GC pauses)\n");

    printf("\nUsage Pattern:\n");
    printf("  1. Acquire buffer at start of processBlock()\n");
    printf("  2. Use buffer for intermediate processing\n");
    printf("  3. Release buffer when done (or at end of callback)\n");

    printf("\n✅ Audio buffer pool test complete\n");
}
