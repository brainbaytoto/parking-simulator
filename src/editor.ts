// Map editor for creating custom parking scenarios

import { PICANTO_CONFIG, SUV_CONFIG, STARIA_CONFIG } from './car';
import type { CarConfig } from './car';

export type ToolType = 'select' | 'car' | 'wall' | 'curb' | 'parking' | 'start';
export type CarSize = 'picanto' | 'suv' | 'staria';

export interface MapObject {
  id: string;
  type: 'car' | 'wall' | 'curb' | 'parking';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  carSize?: CarSize;
}

export interface StartPosition {
  x: number;
  y: number;
  heading: number;
}

export interface MapData {
  name: string;
  objects: MapObject[];
  startPosition: StartPosition;
}

const CAR_SIZES: Record<CarSize, CarConfig> = {
  picanto: PICANTO_CONFIG,
  suv: SUV_CONFIG,
  staria: STARIA_CONFIG,
};

export class Editor {
  objects: MapObject[] = [];
  startPosition: StartPosition;
  selectedId: string | null = null;
  currentTool: ToolType = 'select';
  currentCarSize: CarSize = 'picanto';

  private canvas: HTMLCanvasElement;
  private isDragging = false;
  private dragOffset = { x: 0, y: 0 };
  private onChangeCallback: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement, defaultWidth: number, defaultHeight: number) {
    this.canvas = canvas;
    this.startPosition = {
      x: defaultWidth / 2,
      y: defaultHeight / 2,
      heading: 0,
    };
    this.setupEventListeners();
  }

  onChange(callback: () => void) {
    this.onChangeCallback = callback;
  }

  private notifyChange() {
    if (this.onChangeCallback) {
      this.onChangeCallback();
    }
  }

  private setupEventListeners() {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));

    // Touch support
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });

    // Keyboard shortcuts
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  private getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  private handleMouseDown(e: MouseEvent) {
    const coords = this.getCanvasCoords(e.clientX, e.clientY);
    this.handlePointerDown(coords.x, coords.y);
  }

  private handleMouseMove(e: MouseEvent) {
    const coords = this.getCanvasCoords(e.clientX, e.clientY);
    this.handlePointerMove(coords.x, coords.y);
  }

  private handleMouseUp(_e: MouseEvent) {
    this.handlePointerUp();
  }

  private handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const coords = this.getCanvasCoords(touch.clientX, touch.clientY);
      this.handlePointerDown(coords.x, coords.y);
    }
  }

  private handleTouchMove(e: TouchEvent) {
    e.preventDefault();
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const coords = this.getCanvasCoords(touch.clientX, touch.clientY);
      this.handlePointerMove(coords.x, coords.y);
    }
  }

  private handleTouchEnd(e: TouchEvent) {
    e.preventDefault();
    this.handlePointerUp();
  }

  private handlePointerDown(x: number, y: number) {
    if (this.currentTool === 'select') {
      // Try to select an object
      const obj = this.getObjectAt(x, y);
      if (obj) {
        this.selectedId = obj.id;
        this.isDragging = true;
        this.dragOffset = {
          x: x - obj.x,
          y: y - obj.y,
        };
      } else {
        // Check if clicking on start position
        if (this.isNearStartPosition(x, y)) {
          this.selectedId = 'start';
          this.isDragging = true;
          this.dragOffset = {
            x: x - this.startPosition.x,
            y: y - this.startPosition.y,
          };
        } else {
          this.selectedId = null;
        }
      }
    } else if (this.currentTool === 'start') {
      // Place start position
      this.startPosition.x = x;
      this.startPosition.y = y;
      this.selectedId = 'start';
    } else {
      // Place new object
      this.placeObject(x, y);
    }
    this.notifyChange();
  }

  private handlePointerMove(x: number, y: number) {
    if (!this.isDragging) return;

    if (this.selectedId === 'start') {
      this.startPosition.x = x - this.dragOffset.x;
      this.startPosition.y = y - this.dragOffset.y;
    } else if (this.selectedId) {
      const obj = this.objects.find(o => o.id === this.selectedId);
      if (obj) {
        obj.x = x - this.dragOffset.x;
        obj.y = y - this.dragOffset.y;
      }
    }
    this.notifyChange();
  }

  private handlePointerUp() {
    this.isDragging = false;
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'r' || e.key === 'R') {
      this.rotateSelected();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      this.deleteSelected();
    }
  }

  private getObjectAt(x: number, y: number): MapObject | null {
    // Check in reverse order (top objects first)
    for (let i = this.objects.length - 1; i >= 0; i--) {
      const obj = this.objects[i];
      if (this.isPointInObject(x, y, obj)) {
        return obj;
      }
    }
    return null;
  }

  private isPointInObject(x: number, y: number, obj: MapObject): boolean {
    // Transform point to object's local coordinates
    const dx = x - obj.x;
    const dy = y - obj.y;
    const cos = Math.cos(-obj.rotation);
    const sin = Math.sin(-obj.rotation);
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;

    return Math.abs(localX) < obj.width / 2 && Math.abs(localY) < obj.height / 2;
  }

  private isNearStartPosition(x: number, y: number): boolean {
    const dx = x - this.startPosition.x;
    const dy = y - this.startPosition.y;
    return Math.sqrt(dx * dx + dy * dy) < 30;
  }

  private placeObject(x: number, y: number) {
    const id = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let obj: MapObject;

    switch (this.currentTool) {
      case 'car':
        const carConfig = CAR_SIZES[this.currentCarSize];
        obj = {
          id,
          type: 'car',
          x,
          y,
          width: carConfig.length,
          height: carConfig.width,
          rotation: 0,
          carSize: this.currentCarSize,
        };
        break;
      case 'wall':
        obj = {
          id,
          type: 'wall',
          x,
          y,
          width: 150,
          height: 15,
          rotation: 0,
        };
        break;
      case 'curb':
        obj = {
          id,
          type: 'curb',
          x,
          y,
          width: 200,
          height: 10,
          rotation: 0,
        };
        break;
      case 'parking':
        obj = {
          id,
          type: 'parking',
          x,
          y,
          width: 70,
          height: 130,
          rotation: 0,
        };
        break;
      default:
        return;
    }

    this.objects.push(obj);
    this.selectedId = id;
    this.notifyChange();
  }

  setTool(tool: ToolType) {
    this.currentTool = tool;
    if (tool !== 'select') {
      this.selectedId = null;
    }
  }

  setCarSize(size: CarSize) {
    this.currentCarSize = size;
  }

  rotateSelected() {
    if (this.selectedId === 'start') {
      this.startPosition.heading += Math.PI / 12; // 15 degrees
      if (this.startPosition.heading >= Math.PI * 2) {
        this.startPosition.heading -= Math.PI * 2;
      }
    } else if (this.selectedId) {
      const obj = this.objects.find(o => o.id === this.selectedId);
      if (obj) {
        obj.rotation += Math.PI / 12; // 15 degrees
        if (obj.rotation >= Math.PI * 2) {
          obj.rotation -= Math.PI * 2;
        }
      }
    }
    this.notifyChange();
  }

  deleteSelected() {
    if (this.selectedId && this.selectedId !== 'start') {
      this.objects = this.objects.filter(o => o.id !== this.selectedId);
      this.selectedId = null;
      this.notifyChange();
    }
  }

  clear() {
    this.objects = [];
    this.selectedId = null;
    this.notifyChange();
  }

  getMapData(name: string): MapData {
    return {
      name,
      objects: [...this.objects],
      startPosition: { ...this.startPosition },
    };
  }

  loadMapData(data: MapData) {
    this.objects = data.objects.map(o => ({ ...o }));
    this.startPosition = { ...data.startPosition };
    this.selectedId = null;
    this.notifyChange();
  }

  getSelectedObject(): MapObject | null {
    if (!this.selectedId || this.selectedId === 'start') return null;
    return this.objects.find(o => o.id === this.selectedId) || null;
  }
}
