// Canvas rendering utilities

import { Car } from './car';
import type { Obstacle, Surface, Marking } from './scenarios';
import type { MapObject, StartPosition } from './editor';

// Environment color palette
const COLORS = {
  asphalt: '#3d3d3d',
  grass: '#3d6b1e',
  natureStrip: '#4a7c23',
  footpath: '#c8c8c8',
  curb: '#b0b0b0',
  laneMarking: '#ffffff',
  bayMarking: '#ffd700',
};

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.dpr = window.devicePixelRatio || 1;
    this.resize();

    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
  }

  get width(): number {
    return this.canvas.width / this.dpr;
  }

  get height(): number {
    return this.canvas.height / this.dpr;
  }

  clear() {
    this.ctx.fillStyle = '#2d3436';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawGrid() {
    const gridSize = 50;
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 1;

    for (let x = 0; x <= this.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }

    for (let y = 0; y <= this.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }
  }

  // Environment rendering methods
  drawSurface(surface: Surface) {
    const ctx = this.ctx;

    switch (surface.type) {
      case 'grass':
        ctx.fillStyle = COLORS.grass;
        break;
      case 'asphalt':
        ctx.fillStyle = COLORS.asphalt;
        break;
      case 'footpath':
        ctx.fillStyle = COLORS.footpath;
        break;
      case 'curb':
        ctx.fillStyle = COLORS.curb;
        break;
      default:
        ctx.fillStyle = '#666666';
    }

    ctx.fillRect(surface.x, surface.y, surface.width, surface.height);
  }

  drawMarking(marking: Marking) {
    const ctx = this.ctx;

    ctx.strokeStyle = marking.type === 'bay' ? COLORS.bayMarking : COLORS.laneMarking;
    ctx.lineWidth = marking.type === 'bay' ? 3 : 2;
    ctx.lineCap = 'round';

    if (marking.dashed) {
      ctx.setLineDash([15, 10]);
    } else {
      ctx.setLineDash([]);
    }

    ctx.beginPath();
    ctx.moveTo(marking.x1, marking.y1);
    ctx.lineTo(marking.x2, marking.y2);
    ctx.stroke();

    // Reset line dash
    ctx.setLineDash([]);
  }

  drawEnvironment(surfaces: Surface[], markings: Marking[]) {
    // Draw surfaces first (back to front order)
    for (const surface of surfaces) {
      this.drawSurface(surface);
    }

    // Then draw markings on top
    for (const marking of markings) {
      this.drawMarking(marking);
    }
  }

  drawWheelTrails(car: Car, showFrontTrails: boolean = true) {
    const ctx = this.ctx;
    const wheelWidth = 12; // Match the wheel rendering width
    const { wheelTrails } = car;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = wheelWidth;

    // Draw rear wheel trails (red - important for learning)
    ctx.strokeStyle = '#c0392b'; // Dark red for rear wheels

    // Rear left
    if (wheelTrails.rearLeft.length > 1) {
      ctx.beginPath();
      ctx.moveTo(wheelTrails.rearLeft[0].x, wheelTrails.rearLeft[0].y);
      for (let i = 1; i < wheelTrails.rearLeft.length; i++) {
        ctx.lineTo(wheelTrails.rearLeft[i].x, wheelTrails.rearLeft[i].y);
      }
      ctx.stroke();
    }

    // Rear right
    if (wheelTrails.rearRight.length > 1) {
      ctx.beginPath();
      ctx.moveTo(wheelTrails.rearRight[0].x, wheelTrails.rearRight[0].y);
      for (let i = 1; i < wheelTrails.rearRight.length; i++) {
        ctx.lineTo(wheelTrails.rearRight[i].x, wheelTrails.rearRight[i].y);
      }
      ctx.stroke();
    }

    // Draw front wheel trails (blue) - only if enabled
    if (showFrontTrails) {
      ctx.strokeStyle = '#2980b9'; // Dark blue for front wheels

      // Front left
      if (wheelTrails.frontLeft.length > 1) {
        ctx.beginPath();
        ctx.moveTo(wheelTrails.frontLeft[0].x, wheelTrails.frontLeft[0].y);
        for (let i = 1; i < wheelTrails.frontLeft.length; i++) {
          ctx.lineTo(wheelTrails.frontLeft[i].x, wheelTrails.frontLeft[i].y);
        }
        ctx.stroke();
      }

      // Front right
      if (wheelTrails.frontRight.length > 1) {
        ctx.beginPath();
        ctx.moveTo(wheelTrails.frontRight[0].x, wheelTrails.frontRight[0].y);
        for (let i = 1; i < wheelTrails.frontRight.length; i++) {
          ctx.lineTo(wheelTrails.frontRight[i].x, wheelTrails.frontRight[i].y);
        }
        ctx.stroke();
      }
    }
  }

  drawCar(car: Car) {
    const { config } = car;
    const ctx = this.ctx;
    const corners = car.getCorners();

    // Draw car body using corners
    ctx.fillStyle = '#74b9ff';
    ctx.strokeStyle = '#0984e3';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    ctx.lineTo(corners[1].x, corners[1].y);
    ctx.lineTo(corners[2].x, corners[2].y);
    ctx.lineTo(corners[3].x, corners[3].y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw windshield and headlights using car center and heading
    const center = car.getCarCenter();
    const heading = car.state.heading;
    const halfLength = config.length / 2;
    const halfWidth = config.width / 2;

    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(heading);

    // Windshield (to show front of car)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.roundRect(halfLength - 25, -halfWidth + 5, 20, config.width - 10, 3);
    ctx.fill();

    // Headlights
    ctx.fillStyle = '#ffeaa7';
    ctx.beginPath();
    ctx.arc(halfLength - 3, -halfWidth + 8, 4, 0, Math.PI * 2);
    ctx.arc(halfLength - 3, halfWidth - 8, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Draw wheels separately (they rotate with steering)
    this.drawWheels(car);
  }

  drawWheels(car: Car) {
    const wheels = car.getWheels();
    const ctx = this.ctx;

    for (const wheel of wheels) {
      ctx.save();
      ctx.translate(wheel.x, wheel.y);
      ctx.rotate(wheel.angle);

      // Wheel - front wheels are highlighted yellow
      ctx.fillStyle = '#2d3436';
      ctx.strokeStyle = wheel.isfront ? '#f1c40f' : '#636e72';
      ctx.lineWidth = wheel.isfront ? 3 : 1;

      ctx.beginPath();
      ctx.roundRect(-12, -6, 24, 12, 2);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }
  }

  drawSteeringIndicator(car: Car) {
    const steeringDegrees = Math.round((car.state.steeringAngle * 180) / Math.PI);

    // Update UI display
    const display = document.getElementById('steering-display');
    if (display) {
      display.textContent = `${steeringDegrees}°`;
    }

    // Update car name display
    const carDisplay = document.getElementById('car-display');
    if (carDisplay) {
      carDisplay.textContent = car.config.name;
    }
  }

  drawObstacles(obstacles: Obstacle[]) {
    const ctx = this.ctx;

    for (const obs of obstacles) {
      ctx.save();
      ctx.translate(obs.x + obs.width / 2, obs.y + obs.height / 2);
      ctx.rotate(obs.rotation || 0);

      if (obs.type === 'car') {
        // Parked car
        ctx.fillStyle = '#636e72';
        ctx.strokeStyle = '#2d3436';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height, 5);
        ctx.fill();
        ctx.stroke();

        // Windows
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.roundRect(-obs.width / 2 + 10, -obs.height / 2 + 5, 20, obs.height - 10, 3);
        ctx.fill();
      } else if (obs.type === 'wall') {
        ctx.fillStyle = '#b2bec3';
        ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      } else if (obs.type === 'curb') {
        ctx.fillStyle = '#dfe6e9';
        ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      }

      ctx.restore();
    }
  }

  drawParkingSpot(spot: { x: number; y: number; width: number; height: number; rotation?: number }) {
    const ctx = this.ctx;

    ctx.save();
    ctx.translate(spot.x + spot.width / 2, spot.y + spot.height / 2);
    ctx.rotate(spot.rotation || 0);

    // Parking lines
    ctx.strokeStyle = '#ffeaa7';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);

    const halfWidth = spot.width / 2;
    const halfHeight = spot.height / 2;

    // Draw U-shape for parking spot
    ctx.beginPath();
    ctx.moveTo(-halfWidth, -halfHeight);
    ctx.lineTo(-halfWidth, halfHeight);
    ctx.lineTo(halfWidth, halfHeight);
    ctx.lineTo(halfWidth, -halfHeight);
    ctx.stroke();

    ctx.restore();
  }

  drawTrailLegend(showFrontTrails: boolean = true) {
    const ctx = this.ctx;
    const x = this.width - 150;
    const legendHeight = showFrontTrails ? 55 : 35;
    const y = this.height - (showFrontTrails ? 60 : 40);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.roundRect(x - 10, y - 10, 150, legendHeight, 8);
    ctx.fill();

    ctx.font = '12px sans-serif';

    // Front wheel legend (only if shown)
    if (showFrontTrails) {
      ctx.fillStyle = '#3498db';
      ctx.fillRect(x, y, 20, 3);
      ctx.fillStyle = '#fff';
      ctx.fillText('Front wheels', x + 30, y + 5);

      // Rear wheel legend
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(x, y + 25, 20, 3);
      ctx.fillStyle = '#fff';
      ctx.fillText('Rear wheels', x + 30, y + 30);
    } else {
      // Only rear wheel legend
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(x, y, 20, 3);
      ctx.fillStyle = '#fff';
      ctx.fillText('Rear wheels', x + 30, y + 5);
    }
  }

  // Editor rendering methods
  drawEditorObjects(objects: MapObject[], selectedId: string | null) {
    const ctx = this.ctx;

    for (const obj of objects) {
      ctx.save();
      ctx.translate(obj.x, obj.y);
      ctx.rotate(obj.rotation);

      const isSelected = obj.id === selectedId;

      if (obj.type === 'car') {
        // Parked car (gray)
        ctx.fillStyle = '#636e72';
        ctx.strokeStyle = isSelected ? '#f1c40f' : '#2d3436';
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.beginPath();
        ctx.roundRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height, 5);
        ctx.fill();
        ctx.stroke();

        // Windows
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.roundRect(-obj.width / 2 + obj.width * 0.6, -obj.height / 2 + 5, obj.width * 0.25, obj.height - 10, 3);
        ctx.fill();
      } else if (obj.type === 'wall') {
        ctx.fillStyle = '#b2bec3';
        ctx.strokeStyle = isSelected ? '#f1c40f' : '#636e72';
        ctx.lineWidth = isSelected ? 3 : 1;
        ctx.fillRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);
        ctx.strokeRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);
      } else if (obj.type === 'curb') {
        ctx.fillStyle = '#dfe6e9';
        ctx.strokeStyle = isSelected ? '#f1c40f' : '#b2bec3';
        ctx.lineWidth = isSelected ? 3 : 1;
        ctx.fillRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);
        ctx.strokeRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);
      } else if (obj.type === 'parking') {
        // Parking bay lines
        ctx.strokeStyle = isSelected ? '#f1c40f' : '#ffeaa7';
        ctx.lineWidth = isSelected ? 4 : 3;
        ctx.setLineDash([]);

        const halfWidth = obj.width / 2;
        const halfHeight = obj.height / 2;

        // Draw U-shape
        ctx.beginPath();
        ctx.moveTo(-halfWidth, -halfHeight);
        ctx.lineTo(-halfWidth, halfHeight);
        ctx.lineTo(halfWidth, halfHeight);
        ctx.lineTo(halfWidth, -halfHeight);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  drawStartPosition(startPosition: StartPosition, isSelected: boolean) {
    const ctx = this.ctx;

    ctx.save();
    ctx.translate(startPosition.x, startPosition.y);
    ctx.rotate(startPosition.heading);

    // Draw a car outline to show start position
    const width = 50;
    const height = 100;

    ctx.strokeStyle = isSelected ? '#f1c40f' : '#27ae60';
    ctx.lineWidth = isSelected ? 4 : 3;
    ctx.setLineDash([5, 5]);

    ctx.beginPath();
    ctx.roundRect(-width / 2, -height / 2, width, height, 5);
    ctx.stroke();

    // Draw arrow showing direction
    ctx.setLineDash([]);
    ctx.fillStyle = isSelected ? '#f1c40f' : '#27ae60';
    ctx.beginPath();
    ctx.moveTo(0, -height / 2 - 10);
    ctx.lineTo(-10, -height / 2 + 5);
    ctx.lineTo(10, -height / 2 + 5);
    ctx.closePath();
    ctx.fill();

    // Label
    ctx.fillStyle = '#fff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('START', 0, 5);

    ctx.restore();
  }
}
