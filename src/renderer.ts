// Canvas rendering utilities

import { Car } from './car';
import type { Obstacle } from './scenarios';

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

  drawWheelTrails(car: Car) {
    const ctx = this.ctx;

    // Draw rear wheel trail (red/orange - important for learning)
    if (car.rearWheelTrail.length > 1) {
      ctx.strokeStyle = '#e74c3c'; // Red for rear wheels
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(car.rearWheelTrail[0].x, car.rearWheelTrail[0].y);
      for (let i = 1; i < car.rearWheelTrail.length; i++) {
        ctx.lineTo(car.rearWheelTrail[i].x, car.rearWheelTrail[i].y);
      }
      ctx.stroke();
    }

    // Draw front wheel trail (blue)
    if (car.frontWheelTrail.length > 1) {
      ctx.strokeStyle = '#3498db'; // Blue for front wheels
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(car.frontWheelTrail[0].x, car.frontWheelTrail[0].y);
      for (let i = 1; i < car.frontWheelTrail.length; i++) {
        ctx.lineTo(car.frontWheelTrail[i].x, car.frontWheelTrail[i].y);
      }
      ctx.stroke();
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

  drawTrailLegend() {
    const ctx = this.ctx;
    const x = this.width - 150;
    const y = this.height - 60;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.roundRect(x - 10, y - 10, 150, 55, 8);
    ctx.fill();

    ctx.font = '12px sans-serif';

    // Front wheel legend
    ctx.fillStyle = '#3498db';
    ctx.fillRect(x, y, 20, 3);
    ctx.fillStyle = '#fff';
    ctx.fillText('Front wheels', x + 30, y + 5);

    // Rear wheel legend
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(x, y + 25, 20, 3);
    ctx.fillStyle = '#fff';
    ctx.fillText('Rear wheels', x + 30, y + 30);
  }
}
