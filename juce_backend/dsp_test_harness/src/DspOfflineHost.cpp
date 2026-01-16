/*
  ==============================================================================

    DspOfflineHost.cpp
    Implementation of offline rendering test harness

  ==============================================================================
*/

#include "dsp_test/DspOfflineHost.h"
#include <cstring>
#include <cmath>
#include <cstdio>
#include <algorithm>
#include <complex>

namespace DspTest {

//==============================================================================
// InstrumentAdapter Implementation
//==============================================================================

InstrumentAdapter::InstrumentAdapter(DSP::InstrumentDSP* dsp)
    : dsp_(dsp)
{
}

void InstrumentAdapter::prepare(double sampleRate, int blockSize, int channels)
{
    sampleRate_ = sampleRate;
    blockSize_ = blockSize;
    channels_ = channels;

    // Allocate buffers (non-interleaved)
    buffers_.resize(channels);
    bufferPtrs_.resize(channels);
    for (int c = 0; c < channels; ++c)
    {
        buffers_[c].resize(blockSize);
        bufferPtrs_[c] = buffers_[c].data();
    }

    // Prepare the DSP
    dsp_->prepare(sampleRate, blockSize);
}

void InstrumentAdapter::reset()
{
    dsp_->reset();
    for (auto& buf : buffers_)
        std::fill(buf.begin(), buf.end(), 0.0f);
}

void InstrumentAdapter::setParam(const char* name, double value)
{
    dsp_->setParameter(name, static_cast<float>(value));
}

void InstrumentAdapter::noteOn(int note, float vel)
{
    dsp_->noteOn(note, vel);
}

void InstrumentAdapter::noteOff(int note)
{
    dsp_->noteOff(note);
}

void InstrumentAdapter::panic()
{
    if (dsp_)
        dsp_->panic();
}

void InstrumentAdapter::processBlock(float** audio, int channels, int numSamples)
{
    // Clear buffers
    for (int c = 0; c < channels; ++c)
        std::fill(buffers_[c].begin(), buffers_[c].begin() + numSamples, 0.0f);

    // Process DSP (adds to buffers)
    dsp_->process(bufferPtrs_.data(), channels, numSamples);

    // Copy to output (non-interleaved format)
    for (int c = 0; c < channels; ++c)
    {
        for (int i = 0; i < numSamples; ++i)
        {
            audio[c][i] = buffers_[c][i];
        }
    }
}

const char* InstrumentAdapter::getName() const
{
    return dsp_ ? dsp_->getInstrumentName() : "Unknown";
}

const char* InstrumentAdapter::getVersion() const
{
    return dsp_ ? dsp_->getInstrumentVersion() : "0.0.0";
}

int InstrumentAdapter::getActiveVoices() const
{
    return dsp_ ? dsp_->getActiveVoiceCount() : 0;
}

//==============================================================================
// PRNG Implementation
//==============================================================================

uint32_t DspOfflineHost::xorshift32(uint32_t& state)
{
    uint32_t x = state;
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    state = x;
    return x;
}

float DspOfflineHost::randFloat(uint32_t& state)
{
    return (xorshift32(state) / float(UINT32_MAX)) * 2.0f - 1.0f;
}

//==============================================================================
// Metrics Computation
//==============================================================================

double DspOfflineHost::computeFftPeak(
    const float* audio,
    int frames,
    int sampleRate,
    double& outFreqHz,
    double& outLevelDb)
{
    // Use reasonable FFT size
    int nfft = std::min(65536, frames);
    nfft = 1 << (int)floor(log2(nfft));  // Power of 2

    // Apply Hanning window
    std::vector<double> windowed(nfft);
    const double twoPi = 2.0 * M_PI;
    for (int i = 0; i < nfft; ++i)
    {
        double win = 0.5 * (1.0 - cos(twoPi * i / (nfft - 1)));
        windowed[i] = audio[i] * win;
    }

    // Real FFT (naive implementation for portability)
    // For production, use FFTW or Apple vDSP
    int nfreq = nfft / 2 + 1;
    std::vector<std::complex<double>> fft(nfreq);

    // DFT for positive frequencies only
    for (int k = 0; k < nfreq; ++k)
    {
        std::complex<double> sum(0.0, 0.0);
        for (int n = 0; n < nfft; ++n)
        {
            double phase = -2.0 * M_PI * k * n / nfft;
            std::complex<double> twiddle(cos(phase), sin(phase));
            sum += twiddle * std::complex<double>(windowed[n], 0.0);
        }
        fft[k] = sum;
    }

    // Find peak magnitude
    double maxMag = 0.0;
    int maxK = 0;
    for (int k = 1; k < nfreq; ++k)  // Skip DC
    {
        double mag = std::abs(fft[k]);
        if (mag > maxMag)
        {
            maxMag = mag;
            maxK = k;
        }
    }

    outFreqHz = double(maxK) * sampleRate / nfft;
    outLevelDb = 20.0 * log10(maxMag / nfft + 1e-12);

    return outFreqHz;
}

Metrics DspOfflineHost::computeMetrics(
    const float* audio,
    int frames,
    int channels,
    int sampleRate)
{
    Metrics m;

    double sum = 0.0;
    double sumSq = 0.0;
    double peak = 0.0;
    int nanCount = 0;
    int infCount = 0;
    int clipped = 0;
    int zc = 0;

    float lastSample = 0.0f;
    bool haveLast = false;

    int totalSamples = frames * channels;

    for (int i = 0; i < totalSamples; ++i)
    {
        float s = audio[i];

        // Error detection
        if (std::isnan(s)) nanCount++;
        if (!std::isfinite(s)) infCount++;

        // Statistics
        peak = std::max(peak, std::abs(double(s)));
        if (std::abs(s) >= 0.999999f) clipped++;

        sum += s;
        sumSq += double(s) * double(s);

        // Zero-crossing rate (channel 0 only)
        int sampleIdx = i / channels;
        if ((i % channels) == 0 && sampleIdx < frames)
        {
            if (haveLast && ((lastSample <= 0 && s > 0) || (lastSample >= 0 && s < 0)))
                zc++;
            lastSample = s;
            haveLast = true;
        }
    }

    m.rms = std::sqrt(sumSq / totalSamples);
    m.peak = peak;
    m.dcOffset = sum / totalSamples;
    m.nanCount = nanCount;
    m.infCount = infCount;
    m.clippedSamples = clipped;
    m.zcrPerSec = double(zc) * sampleRate / frames;

    // FFT analysis (channel 0 only)
    std::vector<float> channel0(frames);
    for (int i = 0; i < frames; ++i)
        channel0[i] = audio[i * channels];

    computeFftPeak(channel0.data(), frames, sampleRate, m.fftPeakHz, m.fftPeakDb);

    m.energy = sumSq;

    return m;
}

//==============================================================================
// Offline Rendering
//==============================================================================

RenderResult DspOfflineHost::render(
    InstrumentAdapter& adapter,
    const RenderConfig& rc,
    const InputConfig& ic,
    const std::vector<TestEvent>& events)
{
    RenderResult out;
    out.channels = rc.channels;
    out.sampleRate = rc.sampleRate;
    out.frames = int(std::llround(rc.durationSec * rc.sampleRate));

    adapter.prepare(rc.sampleRate, rc.blockSize, rc.channels);
    adapter.reset();

    out.interleaved.resize(size_t(out.frames) * rc.channels, 0.0f);

    // PRNG state
    uint32_t rng = ic.seed;
    double phase = 0.0;
    const double phaseInc = (2.0 * M_PI * ic.sineHz) / double(rc.sampleRate);

    // Event cursors
    size_t eventIdx = 0;
    double currentTime = 0.0;

    // Block edge tracking
    float lastSample = 0.0f;
    bool haveLastSample = false;
    double blockEdgeMaxJump = 0.0;

    // Track last sample of previous block for continuity check
    std::vector<float> lastBlockSamples(rc.channels, 0.0f);
    bool haveLastBlock = false;

    for (int frame = 0; frame < out.frames; frame += rc.blockSize)
    {
        const int nThis = std::min(rc.blockSize, out.frames - frame);
        const double tBlock = double(frame) / double(rc.sampleRate);

        // Fire events whose timestamps fall within this block
        while (eventIdx < events.size())
        {
            const auto& ev = events[eventIdx];
            if (ev.timeSec > tBlock)
                break;

            // Execute event
            switch (ev.type)
            {
                case TestEvent::NoteOn:
                    adapter.noteOn(ev.noteOn.note, ev.noteOn.vel);
                    break;
                case TestEvent::NoteOff:
                    adapter.noteOff(ev.noteOff.note);
                    break;
                case TestEvent::ParamSet:
                    adapter.setParam(ev.param.name, ev.param.value);
                    break;
                case TestEvent::Gate:
                    // Gate handling depends on instrument
                    if (ev.gate.on)
                        adapter.noteOn(60, 0.8f);  // Default note
                    else
                        adapter.noteOff(60);
                    break;
            }
            eventIdx++;
        }

        // Prepare work buffer (interleaved for this block)
        std::vector<float> workBuf(size_t(nThis) * rc.channels);

        // Generate input signal (if testing processors, not generators)
        for (int i = 0; i < nThis; ++i)
        {
            const double t = double(frame + i) / double(rc.sampleRate);
            float x = 0.0f;

            switch (ic.source)
            {
                case InputSource::Silence:
                    x = 0.0f;
                    break;

                case InputSource::Impulse:
                    x = (std::abs(t - ic.impulseAtSec) < (1.0 / rc.sampleRate))
                        ? ic.amplitude : 0.0f;
                    break;

                case InputSource::Sine:
                    x = float(std::sin(phase) * ic.amplitude);
                    phase += phaseInc;
                    if (phase > 2.0 * M_PI) phase -= 2.0 * M_PI;
                    break;

                case InputSource::Noise:
                    x = randFloat(rng) * ic.amplitude;
                    break;

                case InputSource::DC:
                    x = ic.amplitude;
                    break;
            }

            // Write to all channels
            for (int c = 0; c < rc.channels; ++c)
                workBuf[i * rc.channels + c] = x;
        }

        // Process (convert interleaved to non-interleaved)
        std::vector<float*> nonInterleaved(rc.channels);
        std::vector<std::vector<float>> nonIntBufs(rc.channels);
        for (int c = 0; c < rc.channels; ++c)
        {
            nonIntBufs[c].resize(nThis);
            nonInterleaved[c] = nonIntBufs[c].data();
        }

        // Deinterleave
        for (int i = 0; i < nThis; ++i)
        {
            for (int c = 0; c < rc.channels; ++c)
                nonIntBufs[c][i] = workBuf[i * rc.channels + c];
        }

        // Call DSP (modifies nonInterleaved in place)
        adapter.processBlock(nonInterleaved.data(), rc.channels, nThis);

        // Interleave back and copy to output
        for (int i = 0; i < nThis; ++i)
        {
            for (int c = 0; c < rc.channels; ++c)
            {
                out.interleaved[size_t(frame + i) * rc.channels + c] = nonIntBufs[c][i];
            }
        }

        // Check block edge continuity
        if (haveLastBlock)
        {
            for (int c = 0; c < rc.channels; ++c)
            {
                float jump = std::abs(nonIntBufs[c][0] - lastBlockSamples[c]);
                blockEdgeMaxJump = std::max(blockEdgeMaxJump, double(jump));
            }
        }

        // Store last samples for next block
        for (int c = 0; c < rc.channels; ++c)
            lastBlockSamples[c] = nonIntBufs[c][nThis - 1];
        haveLastBlock = true;
    }

    out.metrics.blockEdgeMaxJump = blockEdgeMaxJump;
    out.metrics = computeMetrics(
        out.interleaved.data(),
        out.frames,
        out.channels,
        out.sampleRate
    );

    out.success = true;
    return out;
}

//==============================================================================
// EffectAdapter Rendering
//==============================================================================

RenderResult DspOfflineHost::render(
    EffectAdapter& adapter,
    const RenderConfig& rc,
    const InputConfig& ic,
    const std::vector<TestEvent>& events)
{
    RenderResult out;
    out.channels = rc.channels;
    out.sampleRate = rc.sampleRate;
    out.frames = int(std::llround(rc.durationSec * rc.sampleRate));

    // Effects require stereo
    if (rc.channels != 2)
    {
        out.success = false;
        out.errorMessage = "Effects require stereo (2 channels)";
        return out;
    }

    adapter.prepare(rc.sampleRate, rc.blockSize, rc.channels);
    adapter.reset();

    out.interleaved.resize(size_t(out.frames) * rc.channels, 0.0f);

    // PRNG state
    uint32_t rng = ic.seed;
    double phase = 0.0;
    const double phaseInc = (2.0 * M_PI * ic.sineHz) / double(rc.sampleRate);

    // Event cursors
    size_t eventIdx = 0;

    // Block edge tracking
    std::vector<float> lastBlockSamples(rc.channels, 0.0f);
    bool haveLastBlock = false;
    double blockEdgeMaxJump = 0.0;

    for (int frame = 0; frame < out.frames; frame += rc.blockSize)
    {
        const int nThis = std::min(rc.blockSize, out.frames - frame);
        const double tBlock = double(frame) / double(rc.sampleRate);

        // Fire events whose timestamps fall within this block
        while (eventIdx < events.size())
        {
            const auto& ev = events[eventIdx];
            if (ev.timeSec > tBlock)
                break;

            // Execute event (effects only support ParamSet)
            switch (ev.type)
            {
                case TestEvent::ParamSet:
                    adapter.setParam(ev.param.name, ev.param.value);
                    break;
                default:
                    // NoteOn, NoteOff, Gate ignored for effects
                    break;
            }
            eventIdx++;
        }

        // Prepare work buffer (non-interleaved for stereo processing)
        std::vector<float*> nonInterleaved(rc.channels);
        std::vector<std::vector<float>> nonIntBufs(rc.channels);
        for (int c = 0; c < rc.channels; ++c)
        {
            nonIntBufs[c].resize(nThis);
            nonInterleaved[c] = nonIntBufs[c].data();
        }

        // Generate input signal
        for (int i = 0; i < nThis; ++i)
        {
            const double t = double(frame + i) / double(rc.sampleRate);
            float x = 0.0f;

            switch (ic.source)
            {
                case InputSource::Silence:
                    x = 0.0f;
                    break;

                case InputSource::Impulse:
                    x = (std::abs(t - ic.impulseAtSec) < (1.0 / rc.sampleRate))
                        ? ic.amplitude : 0.0f;
                    break;

                case InputSource::Sine:
                    x = float(std::sin(phase) * ic.amplitude);
                    phase += phaseInc;
                    if (phase > 2.0 * M_PI) phase -= 2.0 * M_PI;
                    break;

                case InputSource::Noise:
                    x = randFloat(rng) * ic.amplitude;
                    break;

                case InputSource::DC:
                    x = ic.amplitude;
                    break;
            }

            // Write to both channels (stereo input)
            nonIntBufs[0][i] = x;
            nonIntBufs[1][i] = x;
        }

        // Process through effect (modifies buffers in place)
        adapter.processBlock(nonInterleaved.data(), rc.channels, nThis);

        // Interleave to output
        for (int i = 0; i < nThis; ++i)
        {
            for (int c = 0; c < rc.channels; ++c)
            {
                out.interleaved[size_t(frame + i) * rc.channels + c] = nonIntBufs[c][i];
            }
        }

        // Check block edge continuity
        if (haveLastBlock)
        {
            for (int c = 0; c < rc.channels; ++c)
            {
                float jump = std::abs(nonIntBufs[c][0] - lastBlockSamples[c]);
                blockEdgeMaxJump = std::max(blockEdgeMaxJump, double(jump));
            }
        }

        // Store last samples for next block
        for (int c = 0; c < rc.channels; ++c)
            lastBlockSamples[c] = nonIntBufs[c][nThis - 1];
        haveLastBlock = true;
    }

    out.metrics.blockEdgeMaxJump = blockEdgeMaxJump;
    out.metrics = computeMetrics(
        out.interleaved.data(),
        out.frames,
        out.channels,
        out.sampleRate
    );

    out.success = true;
    return out;
}

//==============================================================================
// WAV File Writing
//==============================================================================

bool DspOfflineHost::writeWav(
    const char* path,
    const float* interleaved,
    int frames,
    int channels,
    int sampleRate)
{
    FILE* f = fopen(path, "wb");
    if (!f) return false;

    // Write RIFF header
    fwrite("RIFF", 1, 4, f);
    int32_t fileSize = 36 + frames * channels * 2;  // 16-bit PCM
    fwrite(&fileSize, 4, 1, f);
    fwrite("WAVE", 1, 4, f);

    // Write fmt chunk
    fwrite("fmt ", 1, 4, f);
    int32_t fmtSize = 16;
    fwrite(&fmtSize, 4, 1, f);
    int16_t format = 1;  // PCM
    fwrite(&format, 2, 1, f);
    int16_t numChannels = channels;
    fwrite(&numChannels, 2, 1, f);
    int32_t sr = sampleRate;
    fwrite(&sr, 4, 1, f);
    int32_t byteRate = sampleRate * channels * 2;
    fwrite(&byteRate, 4, 1, f);
    int16_t blockAlign = channels * 2;
    fwrite(&blockAlign, 2, 1, f);
    int16_t bitsPerSample = 16;
    fwrite(&bitsPerSample, 2, 1, f);

    // Write data chunk
    fwrite("data", 1, 4, f);
    int32_t dataSize = frames * channels * 2;
    fwrite(&dataSize, 4, 1, f);

    // Convert and write samples
    for (int i = 0; i < frames * channels; ++i)
    {
        float s = std::clamp(interleaved[i], -1.0f, 1.0f);
        int16_t sample = int16_t(s * 32767.0f);
        fwrite(&sample, 2, 1, f);
    }

    fclose(f);
    return true;
}

//==============================================================================
// Golden File Comparison
//==============================================================================

int GoldenComparator::findLag(
    const float* a,
    const float* b,
    int frames,
    int maxLag)
{
    // Use channel 0 for alignment
    int bestLag = 0;
    double bestCorr = -1e30;

    for (int lag = -maxLag; lag <= maxLag; ++lag)
    {
        double corr = 0.0;
        int count = 0;

        for (int i = 0; i < frames; ++i)
        {
            int idxA = i;
            int idxB = i + lag;

            if (idxB < 0 || idxB >= frames)
                continue;

            corr += double(a[idxA]) * double(b[idxB]);
            count++;
        }

        if (count > 0 && corr > bestCorr)
        {
            bestCorr = corr;
            bestLag = lag;
        }
    }

    return bestLag;
}

ComparisonResult GoldenComparator::compare(
    const float* candidate,
    const float* golden,
    int frames,
    int channels,
    int maxLag,
    double maxAbsTol,
    double rmsTol,
    double snrMin)
{
    ComparisonResult r;

    // Align using cross-correlation on channel 0
    std::vector<float> c0(frames), g0(frames);
    for (int i = 0; i < frames; ++i)
    {
        c0[i] = candidate[i * channels];
        g0[i] = golden[i * channels];
    }

    r.lagSamples = findLag(c0.data(), g0.data(), frames, maxLag);

    // Apply alignment
    int alignedFrames = frames - std::abs(r.lagSamples);
    if (alignedFrames < 256)
    {
        r.pass = false;
        r.details = "Insufficient aligned samples";
        return r;
    }

    // Compare aligned data
    double sumSqDiff = 0.0;
    double sumSqSignal = 0.0;
    double maxAbsDiff = 0.0;

    for (int i = 0; i < alignedFrames; ++i)
    {
        int idx = i + std::max(0, r.lagSamples);

        for (int c = 0; c < channels; ++c)
        {
            float cVal = candidate[idx * channels + c];
            float gVal = golden[(idx - r.lagSamples) * channels + c];

            double diff = double(cVal) - double(gVal);
            maxAbsDiff = std::max(maxAbsDiff, std::abs(diff));
            sumSqDiff += diff * diff;
            sumSqSignal += double(gVal) * double(gVal);
        }
    }

    int totalSamples = alignedFrames * channels;
    r.maxAbsDiff = maxAbsDiff;
    r.rmsDiff = std::sqrt(sumSqDiff / totalSamples);

    // SNR calculation
    double signalPower = sumSqSignal;
    double noisePower = sumSqDiff;
    if (noisePower > 1e-12)
        r.snrDb = 10.0 * log10(signalPower / noisePower);
    else
        r.snrDb = 150.0;  // Near-perfect match

    // Pass/fail determination
    r.pass = (r.maxAbsDiff <= maxAbsTol) &&
             (r.rmsDiff <= rmsTol) &&
             (r.snrDb >= snrMin);

    char detailsBuf[512];
    snprintf(detailsBuf, sizeof(detailsBuf),
        "MaxAbs: %.6f (tol %.6f) | RMS: %.6f (tol %.6f) | SNR: %.2f dB (min %.2f) | Lag: %d samples",
        r.maxAbsDiff, maxAbsTol, r.rmsDiff, rmsTol, r.snrDb, snrMin, r.lagSamples);
    r.details = detailsBuf;

    return r;
}

} // namespace DspTest
