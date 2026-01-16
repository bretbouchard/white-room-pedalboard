/**
 * Toggle Switch Component
 * On/off switch for bypass and other binary parameters
 */

class ToggleSwitch {
    constructor(elementId, options = {}) {
        this.element = document.getElementById(elementId);
        this.onStateChange = options.onStateChange || (() => {});
        this.initialState = options.initialState !== undefined ? options.initialState : false;

        // State
        this.isActive = this.initialState;

        // Initialize
        this.init();
    }

    init() {
        this.addEventListeners();
        this.updateVisual();
    }

    addEventListeners() {
        this.element.addEventListener('click', () => this.toggle());

        // Keyboard accessibility
        this.element.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggle();
            }
        });
    }

    toggle() {
        this.isActive = !this.isActive;
        this.updateVisual();
        this.onStateChange(this.isActive);
    }

    setState(state) {
        this.isActive = state;
        this.updateVisual();
    }

    getState() {
        return this.isActive;
    }

    updateVisual() {
        if (this.isActive) {
            this.element.classList.add('active');
            this.element.setAttribute('aria-pressed', 'true');
        } else {
            this.element.classList.remove('active');
            this.element.setAttribute('aria-pressed', 'false');
        }
    }
}

// LED Indicator class
class LEDIndicator {
    constructor(elementId, options = {}) {
        this.element = document.getElementById(elementId);
        this.color = options.color || '#00FF00';
        this.initialState = options.initialState !== undefined ? options.initialState : false;

        // State
        this.isOn = this.initialState;

        // Initialize
        this.init();
    }

    init() {
        this.updateVisual();
    }

    setState(state) {
        this.isOn = state;
        this.updateVisual();
    }

    flash(duration = 100) {
        this.setState(true);
        setTimeout(() => this.setState(false), duration);
    }

    updateVisual() {
        if (this.isOn) {
            this.element.classList.add('on');
            this.element.style.backgroundColor = this.color;
            this.element.style.boxShadow = `0 0 10px ${this.color}, inset 0 1px 3px rgba(255, 255, 255, 0.3)`;
        } else {
            this.element.classList.remove('on');
            this.element.style.backgroundColor = '#333';
            this.element.style.boxShadow = 'inset 0 1px 3px rgba(0, 0, 0, 0.5)';
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ToggleSwitch, LEDIndicator };
}
