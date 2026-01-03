import './style.css';
import { Car, CAR_CONFIGS, PICANTO_CONFIG } from './car';
import { Controls } from './controls';
import { Renderer } from './renderer';
import { getScenario } from './scenarios';
import { Editor } from './editor';
import { saveMap, loadMap, getMapNames, deleteMap } from './mapStorage';
import type { Scenario, Obstacle, Difficulty } from './scenarios';
import type { ToolType, CarSize, MapData } from './editor';

type AppMode = 'drive' | 'edit';

class ParkingSimulator {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private car: Car;
  private controls: Controls;
  private editor: Editor;
  private scenario: Scenario;
  private lastTime: number = 0;
  private currentScenarioName: string = 'free';
  private currentDifficulty: Difficulty = 'medium';
  private mode: AppMode = 'drive';
  private showFrontTrails: boolean = true;
  private customMapData: MapData | null = null;

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.renderer = new Renderer(this.canvas);
    this.controls = new Controls();
    this.editor = new Editor(this.canvas, this.renderer.width, this.renderer.height);

    // Initialize with free drive scenario and first car
    this.scenario = getScenario('free', this.renderer.width, this.renderer.height, this.currentDifficulty);
    this.car = new Car(
      this.scenario.carStart.x,
      this.scenario.carStart.y,
      this.scenario.carStart.heading,
      PICANTO_CONFIG
    );

    this.setupUI();
    this.setupEditorUI();
    this.start();
  }

  private setupUI() {
    // Mode toggle buttons
    const driveModeBtn = document.getElementById('drive-mode-btn');
    const editModeBtn = document.getElementById('edit-mode-btn');
    const driveControls = document.getElementById('drive-controls');
    const editControls = document.getElementById('edit-controls');
    const controlPanel = document.getElementById('control-panel');
    const infoPanel = document.getElementById('info-panel');
    const controlsHint = document.getElementById('controls-hint');

    driveModeBtn?.addEventListener('click', () => {
      this.setMode('drive');
      driveModeBtn.classList.add('active');
      editModeBtn?.classList.remove('active');
      driveControls!.style.display = 'flex';
      editControls!.style.display = 'none';
      controlPanel!.style.display = 'flex';
      infoPanel!.style.display = 'block';
      controlsHint!.style.display = 'block';
    });

    editModeBtn?.addEventListener('click', () => {
      this.setMode('edit');
      editModeBtn.classList.add('active');
      driveModeBtn?.classList.remove('active');
      driveControls!.style.display = 'none';
      editControls!.style.display = 'flex';
      controlPanel!.style.display = 'none';
      infoPanel!.style.display = 'none';
      controlsHint!.style.display = 'none';
    });

    // Scenario buttons
    const scenarioButtons = document.querySelectorAll('.scenario-btn');
    scenarioButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const scenarioName = target.dataset.scenario || 'free';

        // Update active button
        scenarioButtons.forEach((b) => b.classList.remove('active'));
        target.classList.add('active');

        // Load scenario with current difficulty
        this.loadScenario(scenarioName);
      });
    });

    // Difficulty buttons within dropdowns
    const difficultyButtons = document.querySelectorAll('.difficulty-btn');
    difficultyButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering parent scenario button
        const target = e.target as HTMLElement;
        const difficulty = target.dataset.difficulty as Difficulty;
        const dropdown = target.closest('.scenario-dropdown');
        const scenarioBtn = dropdown?.querySelector('.scenario-btn') as HTMLElement;
        const scenarioName = scenarioBtn?.dataset.scenario || 'free';

        // Update active difficulty button within this dropdown
        dropdown?.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
        target.classList.add('active');

        // Update active scenario button
        scenarioButtons.forEach((b) => b.classList.remove('active'));
        scenarioBtn?.classList.add('active');

        // Update current difficulty and load scenario
        this.currentDifficulty = difficulty;
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

    // Front trails toggle
    const frontTrailsToggle = document.getElementById('show-front-trails') as HTMLInputElement;
    frontTrailsToggle?.addEventListener('change', () => {
      this.showFrontTrails = frontTrailsToggle.checked;
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      // Reload scenario with new dimensions
      setTimeout(() => {
        if (this.mode === 'drive') {
          this.loadScenario(this.currentScenarioName);
        }
      }, 100);
    });
  }

  private setupEditorUI() {
    // Tool selector
    const toolButtons = document.querySelectorAll('.tool-btn');
    const carSizeSelector = document.getElementById('car-size-selector');

    toolButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const tool = target.dataset.tool as ToolType;

        toolButtons.forEach((b) => b.classList.remove('active'));
        target.classList.add('active');

        this.editor.setTool(tool);

        // Show/hide car size selector
        if (carSizeSelector) {
          carSizeSelector.style.display = tool === 'car' ? 'flex' : 'none';
        }
      });
    });

    // Car size selector
    const sizeButtons = document.querySelectorAll('.size-btn');
    sizeButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const size = target.dataset.size as CarSize;

        sizeButtons.forEach((b) => b.classList.remove('active'));
        target.classList.add('active');

        this.editor.setCarSize(size);
      });
    });

    // Rotate button
    const rotateBtn = document.getElementById('rotate-btn');
    rotateBtn?.addEventListener('click', () => this.editor.rotateSelected());

    // Delete button
    const deleteBtn = document.getElementById('delete-btn');
    deleteBtn?.addEventListener('click', () => this.editor.deleteSelected());

    // Save map button
    const saveMapBtn = document.getElementById('save-map-btn');
    saveMapBtn?.addEventListener('click', () => this.showSaveDialog());

    // Load map button
    const loadMapBtn = document.getElementById('load-map-btn');
    loadMapBtn?.addEventListener('click', () => this.showLoadDialog());

    // Clear map button
    const clearMapBtn = document.getElementById('clear-map-btn');
    clearMapBtn?.addEventListener('click', () => {
      if (confirm('Clear all objects from the map?')) {
        this.editor.clear();
      }
    });

    // Editor change callback - trigger re-render
    this.editor.onChange(() => {
      // Force a render update
    });
  }

  private showSaveDialog() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <h3>Save Map</h3>
        <input type="text" id="map-name-input" placeholder="Enter map name...">
        <div class="modal-buttons">
          <button class="modal-btn secondary" id="save-cancel">Cancel</button>
          <button class="modal-btn primary" id="save-confirm">Save</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const input = document.getElementById('map-name-input') as HTMLInputElement;
    const cancelBtn = document.getElementById('save-cancel');
    const confirmBtn = document.getElementById('save-confirm');

    input?.focus();

    const close = () => document.body.removeChild(overlay);

    cancelBtn?.addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    confirmBtn?.addEventListener('click', () => {
      const name = input?.value.trim();
      if (name) {
        const data = this.editor.getMapData(name);
        saveMap(name, data);
        close();
      }
    });

    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        confirmBtn?.click();
      } else if (e.key === 'Escape') {
        close();
      }
    });
  }

  private showLoadDialog() {
    const mapNames = getMapNames();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <h3>Load Map</h3>
        <div class="map-list" id="map-list">
          ${mapNames.length === 0 ? '<div style="color: rgba(255,255,255,0.5); padding: 10px;">No saved maps</div>' : ''}
          ${mapNames.map(name => `
            <div class="map-item" data-name="${name}">
              <span>${name}</span>
              <button class="map-item-delete" data-delete="${name}">&times;</button>
            </div>
          `).join('')}
        </div>
        <div class="modal-buttons">
          <button class="modal-btn secondary" id="load-cancel">Cancel</button>
          <button class="modal-btn primary" id="load-confirm" disabled>Load</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const cancelBtn = document.getElementById('load-cancel');
    const confirmBtn = document.getElementById('load-confirm') as HTMLButtonElement;
    const mapList = document.getElementById('map-list');
    let selectedName: string | null = null;

    const close = () => document.body.removeChild(overlay);

    cancelBtn?.addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    mapList?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      // Handle delete button
      if (target.classList.contains('map-item-delete')) {
        const name = target.dataset.delete;
        if (name && confirm(`Delete "${name}"?`)) {
          deleteMap(name);
          const item = target.closest('.map-item');
          item?.remove();
          if (selectedName === name) {
            selectedName = null;
            confirmBtn.disabled = true;
          }
        }
        return;
      }

      // Handle item selection
      const item = target.closest('.map-item') as HTMLElement;
      if (item) {
        mapList.querySelectorAll('.map-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        selectedName = item.dataset.name || null;
        confirmBtn.disabled = false;
      }
    });

    confirmBtn?.addEventListener('click', () => {
      if (selectedName) {
        const data = loadMap(selectedName);
        if (data) {
          this.editor.loadMapData(data);
          this.customMapData = data;
        }
        close();
      }
    });
  }

  private setMode(mode: AppMode) {
    this.mode = mode;

    if (mode === 'drive') {
      // Load custom map if we have one and "custom" scenario is selected
      if (this.currentScenarioName === 'custom' && this.customMapData) {
        this.loadCustomMap();
      }
    }
  }

  private loadCustomMap() {
    if (!this.customMapData) return;

    // Convert editor objects to scenario obstacles
    const obstacles: Obstacle[] = this.customMapData.objects.map(obj => ({
      type: obj.type === 'parking' ? 'curb' : obj.type,
      x: obj.x - obj.width / 2,
      y: obj.y - obj.height / 2,
      width: obj.width,
      height: obj.height,
      rotation: obj.rotation,
    }));

    // Create custom scenario
    this.scenario = {
      name: 'Custom',
      difficulty: 'medium',
      carStart: {
        x: this.customMapData.startPosition.x,
        y: this.customMapData.startPosition.y,
        heading: this.customMapData.startPosition.heading,
      },
      obstacles,
      parkingSpot: this.customMapData.objects
        .filter(obj => obj.type === 'parking')
        .map(obj => ({
          x: obj.x - obj.width / 2,
          y: obj.y - obj.height / 2,
          width: obj.width,
          height: obj.height,
          rotation: obj.rotation,
        }))[0] || undefined,
      bounds: {
        minX: 0,
        minY: 0,
        maxX: this.renderer.width,
        maxY: this.renderer.height,
      },
    };

    this.car.reset(
      this.scenario.carStart.x,
      this.scenario.carStart.y,
      this.scenario.carStart.heading
    );
    this.controls.resetSteering();
  }

  private loadScenario(name: string) {
    this.currentScenarioName = name;

    if (name === 'custom') {
      if (this.customMapData) {
        this.loadCustomMap();
      } else {
        // No custom map, use free drive
        this.scenario = getScenario('free', this.renderer.width, this.renderer.height, this.currentDifficulty);
        this.car.reset(
          this.scenario.carStart.x,
          this.scenario.carStart.y,
          this.scenario.carStart.heading
        );
        this.controls.resetSteering();
      }
    } else {
      this.scenario = getScenario(name, this.renderer.width, this.renderer.height, this.currentDifficulty);
      this.car.reset(
        this.scenario.carStart.x,
        this.scenario.carStart.y,
        this.scenario.carStart.heading
      );
      this.controls.resetSteering();
    }
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
    if (this.mode !== 'drive') return;

    const input = this.controls.getInput();
    this.car.update(dt, input);

    // Keep car within bounds (using rear axle position)
    if (this.scenario.bounds) {
      const { minX, minY, maxX, maxY } = this.scenario.bounds;
      const margin = 50;
      this.car.state.rearAxleX = Math.max(minX + margin, Math.min(maxX - margin, this.car.state.rearAxleX));
      this.car.state.rearAxleY = Math.max(minY + margin, Math.min(maxY - margin, this.car.state.rearAxleY));
    }
  }

  private render() {
    this.renderer.clear();

    if (this.mode === 'drive') {
      // Draw environment first (surfaces and markings)
      if (this.scenario.environment) {
        this.renderer.drawEnvironment(
          this.scenario.environment.surfaces,
          this.scenario.environment.markings
        );
      } else {
        // Fallback to grid for scenarios without environment
        this.renderer.drawGrid();
      }

      // Draw wheel trails
      this.renderer.drawWheelTrails(this.car, this.showFrontTrails);

      // Draw obstacles
      this.renderer.drawObstacles(this.scenario.obstacles);

      // Draw parking spot if exists
      if (this.scenario.parkingSpot) {
        this.renderer.drawParkingSpot(this.scenario.parkingSpot);
      }

      // Draw car
      this.renderer.drawCar(this.car);

      // Draw legend
      this.renderer.drawTrailLegend(this.showFrontTrails);

      // Update steering display
      this.renderer.drawSteeringIndicator(this.car);
    } else {
      // Edit mode rendering
      this.renderer.drawGrid();
      this.renderer.drawEditorObjects(this.editor.objects, this.editor.selectedId);
      this.renderer.drawStartPosition(this.editor.startPosition, this.editor.selectedId === 'start');
    }
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
