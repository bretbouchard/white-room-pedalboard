/**
 * Audio Meter Component
 * VU meter and peak meter for level visualization
 */

class AudioMeter {
    constructor(elementId, options = {}) {
        this.element = document.getElementById(elementId);
        this.channel = options.channel || 'stereo'; // 'mono', 'left', 'right', 'stereo'
        this.minLevel = options.minLevel || -60; // dB
        this.maxLevel = options.maxLevel || 0; // dB
        this.ballistics = options.ballistics || 'VU'; // 'VU' or 'PPM' (Peak)

        // State
        this.levels = { left: -100, right: -100 };
        this.peaks = { left: -100, right: -100 };
        this.lastUpdateTime = 0;
        this.peakHoldTime = options.peakHoldTime || 2000; // ms
        this.peakDecayRate = options.peakDecayRate || 20; // dB per second

        // Initialize
        this.init();
    }

    init() {
        this.createMeterStructure();
        this.startAnimation();
    }

    createMeterStructure() {
        this.element.innerHTML = '';
        this.element.className = 'audio-meter';

        if (this.channel === 'stereo') {
            // Stereo meter
            const leftMeter = this.createChannelMeter('Left');
            const rightMeter = this.createChannelMeter('Right');

            const container = document.createElement('div');
            container.className = 'stereo-meter-container';
            container.style.display = 'flex';
            container.style.gap = '10px';
            container.appendChild(leftMeter);
            container.appendChild(rightMeter);

            this.element.appendChild(container);

            this.leftMeterElement = leftMeter.querySelector('.meter-fill');
            this.leftPeakElement = leftMeter.querySelector('.peak-indicator');
            this.rightMeterElement = rightMeter.querySelector('.meter-fill');
            this.rightPeakElement = rightMeter.querySelector('.peak-indicator');
        } else {
            // Mono meter
            const meter = this.createChannelMeter(this.channel.charAt(0).toUpperCase() + this.channel.slice(1));
            this.element.appendChild(meter);

            this.meterElement = meter.querySelector('.meter-fill');
            this.peakElement = meter.querySelector('.peak-indicator');
        }
    }

    createChannelMeter(label) {
        const container = document.createElement('div');
        container.className = 'channel-meter';

        // Label
        const labelElement = document.createElement('div');
        labelElement.className = 'meter-label';
        labelElement.textContent = label;
        labelElement.style.fontSize = '10px';
        labelElement.style.color = '#888';
        labelElement.style.marginBottom = '5px';
        labelElement.style.textAlign = 'center';

        // Meter bar
        const meterBar = document.createElement('div');
        meterBar.className = 'meter-bar';
        meterBar.style.position = 'relative';
        meterBar.style.width = '20px';
        meterBar.style.height = '200px';
        meterBar.style.background = '#1a1a1a';
        meterBar.style.borderRadius = '3px';
        meterBar.style.overflow = 'hidden';

        // Fill
        const fill = document.createElement('div');
        fill.className = 'meter-fill';
        fill.style.position = 'absolute';
        fill.style.bottom = '0';
        fill.style.left = '0';
        fill.style.right = '0';
        fill.style.height = '0%';
        fill.style.background = 'linear-gradient(to top, #00FF00 0%, #00FF00 70%, #FFFF00 70%, #FFFF00 90%, #FF0000 90%, #FF0000 100%)';
        fill.style.transition = 'height 0.1s ease-out';

        // Peak indicator
        const peak = document.createElement('div');
        peak.className = 'peak-indicator';
        peak.style.position = 'absolute';
        peak.style.left = '0';
        peak.style.right = '0';
        peak.style.height = '3px';
        peak.style.bottom = '0%';
        peak.style.background = 'rgba(255, 255, 255, 0.8)';
        peak.style.transition = 'bottom 0.05s ease-out';

        meterBar.appendChild(fill);
        meterBar.appendChild(peak);
        container.appendChild(labelElement);
        container.appendChild(meterBar);

        return container;
    }

    setLevels(leftLevel, rightLevel = null) {
        this.levels.left = leftLevel;
        this.levels.right = rightLevel !== null ? rightLevel : leftLevel;
    }

    update(currentTime) {
        const deltaTime = currentTime - this.lastUpdateTime;
        this.lastUpdateTime = currentTime;

        // Update peaks
        if (this.levels.left > this.peaks.left) {
            this.peaks.left = this.levels.left;
        } else {
            this.peaks.left -= this.peakDecayRate * (deltaTime / 1000);
        }

        if (this.levels.right > this.peaks.right) {
            this.peaks.right = this.levels.right;
        } else {
            this.peaks.right -= this.peakDecayRate * (deltaTime / 1000);
        }

        // Update visual
        if (this.channel === 'stereo') {
            this.updateChannelMeter(this.leftMeterElement, this.leftPeakElement, this.levels.left, this.peaks.left);
            this.updateChannelMeter(this.rightMeterElement, this.rightPeakElement, this.levels.right, this.peaks.right);
        } else {
            const level = this.levels.left;
            const peak = this.peaks.left;
            this.updateChannelMeter(this.meterElement, this.peakElement, level, peak);
        }
    }

    updateChannelMeter(meterElement, peakElement, level, peak) {
        // Clamp levels
        level = Math.max(this.minLevel, Math.min(this.maxLevel, level));
        peak = Math.max(this.minLevel, Math.min(this.maxLevel, peak));

        // Convert to percentage
        const levelPercent = ((level - this.minLevel) / (this.maxLevel - this.minLevel)) * 100;
        const peakPercent = ((peak - this.minLevel) / (this.maxLevel - this.minLevel)) * 100;

        meterElement.style.height = `${levelPercent}%`;
        peakElement.style.bottom = `${peakPercent}%`;
    }

    startAnimation() {
        const animate = (currentTime) => {
            this.update(currentTime);
            requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }

    reset() {
        this.levels = { left: -100, right: -100 };
        this.peaks = { left: -100, right: -100 };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioMeter;
}
