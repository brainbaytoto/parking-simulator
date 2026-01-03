// Input handling for keyboard and touch controls
import type { SteeringPosition } from './car';

export interface InputState {
  movement: number; // -1 = reverse, 0 = stopped, 1 = forward
  steeringPosition: SteeringPosition; // -1, -0.5, 0, 0.5, 1
}

export class Controls {
  private keys: Set<string> = new Set();
  private touchMovement: number = 0;
  private touchSteering: SteeringPosition = 0;

  constructor() {
    this.setupKeyboard();
    this.setupTouch();
  }

  private setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      // Prevent scrolling with arrow keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      this.keys.add(e.key.toLowerCase());
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });

    // Clear keys when window loses focus
    window.addEventListener('blur', () => {
      this.keys.clear();
    });
  }

  private setupTouch() {
    // Movement buttons
    const btnForward = document.getElementById('btn-forward');
    const btnReverse = document.getElementById('btn-reverse');

    // Steering buttons
    const btnHardLeft = document.getElementById('btn-hard-left');
    const btnHalfLeft = document.getElementById('btn-half-left');
    const btnStraight = document.getElementById('btn-straight');
    const btnHalfRight = document.getElementById('btn-half-right');
    const btnHardRight = document.getElementById('btn-hard-right');

    const addMovementListeners = (
      element: HTMLElement | null,
      value: number
    ) => {
      if (!element) return;

      const start = (e: Event) => {
        e.preventDefault();
        this.touchMovement = value;
      };

      const end = (e: Event) => {
        e.preventDefault();
        if (this.touchMovement === value) {
          this.touchMovement = 0;
        }
      };

      element.addEventListener('touchstart', start, { passive: false });
      element.addEventListener('touchend', end, { passive: false });
      element.addEventListener('touchcancel', end, { passive: false });
      element.addEventListener('mousedown', start);
      element.addEventListener('mouseup', end);
      element.addEventListener('mouseleave', end);
    };

    const addSteeringListener = (
      element: HTMLElement | null,
      value: SteeringPosition
    ) => {
      if (!element) return;

      const click = (e: Event) => {
        e.preventDefault();
        this.touchSteering = value;
        // Update button active states
        this.updateSteeringButtons(value);
      };

      element.addEventListener('touchstart', click, { passive: false });
      element.addEventListener('mousedown', click);
    };

    // Movement
    addMovementListeners(btnForward, 1);
    addMovementListeners(btnReverse, -1);

    // Steering (click to set position)
    addSteeringListener(btnHardLeft, -1);
    addSteeringListener(btnHalfLeft, -0.5);
    addSteeringListener(btnStraight, 0);
    addSteeringListener(btnHalfRight, 0.5);
    addSteeringListener(btnHardRight, 1);
  }

  private updateSteeringButtons(position: SteeringPosition) {
    const buttons = [
      { id: 'btn-hard-left', value: -1 },
      { id: 'btn-half-left', value: -0.5 },
      { id: 'btn-straight', value: 0 },
      { id: 'btn-half-right', value: 0.5 },
      { id: 'btn-hard-right', value: 1 },
    ];

    buttons.forEach(({ id, value }) => {
      const btn = document.getElementById(id);
      if (btn) {
        if (value === position) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      }
    });
  }

  getInput(): InputState {
    let movement = this.touchMovement;
    let steeringPosition = this.touchSteering;

    // Keyboard input for movement (up/down arrows)
    if (this.keys.has('arrowup')) {
      movement = 1;
    } else if (this.keys.has('arrowdown')) {
      movement = -1;
    }

    // Keyboard input for steering (A, S, D, F, G)
    if (this.keys.has('a')) {
      steeringPosition = -1; // Hard left
      this.updateSteeringButtons(-1);
    } else if (this.keys.has('s')) {
      steeringPosition = -0.5; // Half left
      this.updateSteeringButtons(-0.5);
    } else if (this.keys.has('d')) {
      steeringPosition = 0; // Straight
      this.updateSteeringButtons(0);
    } else if (this.keys.has('f')) {
      steeringPosition = 0.5; // Half right
      this.updateSteeringButtons(0.5);
    } else if (this.keys.has('g')) {
      steeringPosition = 1; // Hard right
      this.updateSteeringButtons(1);
    }

    return { movement, steeringPosition };
  }

  // Reset steering to straight
  resetSteering() {
    this.touchSteering = 0;
    this.updateSteeringButtons(0);
  }
}
