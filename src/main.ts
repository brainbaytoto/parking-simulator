import './style.css';
import { Car, CAR_CONFIGS, PICANTO_CONFIG } from './car';
import { Controls } from './controls';
import { Renderer } from './renderer';
import { getScenario } from './scenarios';
import type { Scenario } from './scenarios';

class ParkingSimulator {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private car: Car;
  private controls: Controls;
  private scenario: Scenario;
  private lastTime: number = 0;
  private currentScenarioName: string = 'free';

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.renderer = new Renderer(this.canvas);
    this.controls = new Controls();

    // Initialize with free drive scenario and first car
    this.scenario = getScenario('free', this.renderer.width, this.renderer.height);
    this.car = new Car(
      this.scenario.carStart.x,
      this.scenario.carStart.y,
      this.scenario.carStart.heading,
      PICANTO_CONFIG
    );

    this.setupUI();
    this.start();
  }

  private setupUI() {
    // Scenario buttons
    const scenarioButtons = document.querySelectorAll('.scenario-btn');
    scenarioButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const scenarioName = target.dataset.scenario || 'free';

        // Update active button
        scenarioButtons.forEach((b) => b.classList.remove('active'));
        target.classList.add('active');

        // Load scenario
        this.loadScenario(scenarioName);
      });
    });

    // Car selector buttons
    const carButtons = document.querySelectorAll('.car-btn');
    carButtons.forEach((btn, index) => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;

        // Update active button
        carButtons.forEach((b) => b.classList.remove('active'));
        target.classList.add('active');

        // Change car
        this.car.setConfig(CAR_CONFIGS[index]);
        this.car.clearTrails();
      });
    });

    // Reset button
    const resetBtn = document.getElementById('reset-btn');
    resetBtn?.addEventListener('click', () => this.reset());

    // Clear trails button
    const clearTrailsBtn = document.getElementById('clear-trails-btn');
    clearTrailsBtn?.addEventListener('click', () => this.car.clearTrails());

    // Handle window resize
    window.addEventListener('resize', () => {
      // Reload scenario with new dimensions
      setTimeout(() => this.loadScenario(this.currentScenarioName), 100);
    });
  }

  private loadScenario(name: string) {
    this.currentScenarioName = name;
    this.scenario = getScenario(name, this.renderer.width, this.renderer.height);
    this.car.reset(
      this.scenario.carStart.x,
      this.scenario.carStart.y,
      this.scenario.carStart.heading
    );
    this.controls.resetSteering();
  }

  private reset() {
    this.car.reset(
      this.scenario.carStart.x,
      this.scenario.carStart.y,
      this.scenario.carStart.heading
    );
    this.controls.resetSteering();
  }

  private update(dt: number) {
    const input = this.controls.getInput();
    this.car.update(dt, input);

    // Keep car within bounds
    if (this.scenario.bounds) {
      const { minX, minY, maxX, maxY } = this.scenario.bounds;
      const margin = 50;
      this.car.state.x = Math.max(minX + margin, Math.min(maxX - margin, this.car.state.x));
      this.car.state.y = Math.max(minY + margin, Math.min(maxY - margin, this.car.state.y));
    }
  }

  private render() {
    this.renderer.clear();
    this.renderer.drawGrid();

    // Draw wheel trails first (behind everything)
    this.renderer.drawWheelTrails(this.car);

    // Draw obstacles
    this.renderer.drawObstacles(this.scenario.obstacles);

    // Draw parking spot if exists
    if (this.scenario.parkingSpot) {
      this.renderer.drawParkingSpot(this.scenario.parkingSpot);
    }

    // Draw car
    this.renderer.drawCar(this.car);

    // Draw legend
    this.renderer.drawTrailLegend();

    // Update steering display
    this.renderer.drawSteeringIndicator(this.car);
  }

  private gameLoop = (timestamp: number) => {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1); // Cap dt to prevent huge jumps
    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    requestAnimationFrame(this.gameLoop);
  };

  private start() {
    this.lastTime = performance.now();
    requestAnimationFrame(this.gameLoop);
  }
}

// Start the simulator
new ParkingSimulator();
