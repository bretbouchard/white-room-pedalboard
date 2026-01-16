/**
 * Rotary Knob Component
 * Interactive knob control for audio parameters
 */

class Knob {
    constructor(elementId, options = {}) {
        this.element = document.getElementById(elementId);
        this.indicator = this.element.querySelector('.knob-indicator');

        // Configuration
        this.min = options.min !== undefined ? options.min : 0.0;
        this.max = options.max !== undefined ? options.max : 1.0;
        this.defaultValue = options.defaultValue !== undefined ? options.defaultValue : 0.5;
        this.step = options.step || 0.01;
        this.onChange = options.onChange || (() => {});

        // State
        this.value = this.defaultValue;
        this.isDragging = false;
        this.lastY = 0;

        // Initialize
        this.init();
    }

    init() {
        this.updateIndicator();
        this.addEventListeners();
    }

    addEventListeners() {
        // Mouse events
        this.element.addEventListener('mousedown', (e) => this.onDragStart(e));
        document.addEventListener('mousemove', (e) => this.onDragMove(e));
        document.addEventListener('mouseup', () => this.onDragEnd());

        // Touch events
        this.element.addEventListener('touchstart', (e) => this.onDragStart(e));
        document.addEventListener('touchmove', (e) => this.onDragMove(e));
        document.addEventListener('touchend', () => this.onDragEnd());

        // Double-click to reset
        this.element.addEventListener('dblclick', () => this.reset());

        // Scroll wheel
        this.element.addEventListener('wheel', (e) => this.onWheel(e));
    }

    onDragStart(e) {
        this.isDragging = true;
        this.lastY = e.clientY || e.touches[0].clientY;
        this.element.style.cursor = 'grabbing';
        e.preventDefault();
    }

    onDragMove(e) {
        if (!this.isDragging) return;

        const currentY = e.clientY || (e.touches && e.touches[0].clientY);
        const deltaY = this.lastY - currentY;
        this.lastY = currentY;

        // Sensitivity
        const sensitivity = 0.005;
        const deltaValue = deltaY * sensitivity * (this.max - this.min);

        this.value = Math.max(this.min, Math.min(this.max, this.value + deltaValue));
        this.updateIndicator();
        this.onChange(this.value);
    }

    onDragEnd() {
        this.isDragging = false;
        this.element.style.cursor = 'grab';
    }

    onWheel(e) {
        e.preventDefault();

        const delta = e.deltaY > 0 ? -this.step : this.step;
        this.value = Math.max(this.min, Math.min(this.max, this.value + delta));
        this.updateIndicator();
        this.onChange(this.value);
    }

    reset() {
        this.value = this.defaultValue;
        this.updateIndicator();
        this.onChange(this.value);
    }

    setValue(value) {
        this.value = Math.max(this.min, Math.min(this.max, value));
        this.updateIndicator();
    }

    getValue() {
        return this.value;
    }

    updateIndicator() {
        // Calculate rotation angle (-135deg to +135deg)
        const normalized = (this.value - this.min) / (this.max - this.min);
        const angle = -135 + (normalized * 270);

        this.indicator.style.transform = `rotate(${angle}deg)`;

        // Update value display if exists
        const valueDisplay = this.element.parentElement.querySelector('.knob-value');
        if (valueDisplay) {
            valueDisplay.textContent = this.formatValue(this.value);
        }
    }

    formatValue(value) {
        // Format based on range
        if (this.max >= 1000) {
            // Large numbers (frequency)
            return value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value.toFixed(0);
        } else if (this.max <= 1.0) {
            // Normalized
            return (value * 100).toFixed(0) + '%';
        } else if (this.min < 0) {
            // dB range
            return value.toFixed(1) + ' dB';
        } else {
            // Linear
            return value.toFixed(2);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Knob;
}
