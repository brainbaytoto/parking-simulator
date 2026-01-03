// Scenario definitions for parking practice

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  type: 'car' | 'wall' | 'curb';
}

export interface ParkingSpot {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

export interface Scenario {
  name: string;
  carStart: { x: number; y: number; heading: number };
  obstacles: Obstacle[];
  parkingSpot?: ParkingSpot;
  bounds?: { minX: number; minY: number; maxX: number; maxY: number };
}

// Factory functions that take canvas dimensions
export function createFreeDriveScenario(width: number, height: number): Scenario {
  return {
    name: 'Free Drive',
    carStart: { x: width / 2, y: height / 2, heading: 0 },
    obstacles: [
      // Boundary walls
      { x: 0, y: 0, width: width, height: 10, type: 'wall' },
      { x: 0, y: height - 10, width: width, height: 10, type: 'wall' },
      { x: 0, y: 0, width: 10, height: height, type: 'wall' },
      { x: width - 10, y: 0, width: 10, height: height, type: 'wall' },
      // Some random obstacles to practice around
      { x: width * 0.25, y: height * 0.3, width: 80, height: 40, type: 'car', rotation: 0 },
      { x: width * 0.7, y: height * 0.6, width: 80, height: 40, type: 'car', rotation: Math.PI / 6 },
    ],
    bounds: { minX: 10, minY: 10, maxX: width - 10, maxY: height - 10 },
  };
}

export function createParallelParkingScenario(width: number, height: number): Scenario {
  const carLength = 80;
  const carWidth = 40;
  const gapSize = carLength * 1.8; // Gap for parallel parking
  const curbY = height * 0.6;

  return {
    name: 'Parallel Parking',
    carStart: { x: width * 0.7, y: curbY - carWidth - 60, heading: Math.PI }, // Start facing left
    obstacles: [
      // Curb
      { x: 0, y: curbY, width: width, height: 15, type: 'curb' },
      // Front car
      { x: width * 0.3 + gapSize / 2 + 10, y: curbY - carWidth / 2 - 10, width: carLength, height: carWidth, type: 'car' },
      // Rear car
      { x: width * 0.3 - gapSize / 2 - carLength - 10, y: curbY - carWidth / 2 - 10, width: carLength, height: carWidth, type: 'car' },
    ],
    parkingSpot: {
      x: width * 0.3 - gapSize / 2,
      y: curbY - carWidth - 20,
      width: gapSize,
      height: carWidth + 15,
    },
    bounds: { minX: 10, minY: 10, maxX: width - 10, maxY: height - 10 },
  };
}

export function createBayParkingScenario(width: number, height: number): Scenario {
  const carLength = 80;
  const carWidth = 40;
  const bayWidth = carWidth + 30;
  const bayHeight = carLength + 20;
  const bayY = height * 0.2;
  const bayX = width / 2 - bayWidth / 2;

  return {
    name: 'Bay Parking',
    carStart: { x: width / 2, y: height * 0.7, heading: -Math.PI / 2 }, // Start facing up
    obstacles: [
      // Adjacent parked cars
      { x: bayX - carWidth - 15, y: bayY + 10, width: carLength, height: carWidth, type: 'car', rotation: -Math.PI / 2 },
      { x: bayX + bayWidth + 15, y: bayY + 10, width: carLength, height: carWidth, type: 'car', rotation: -Math.PI / 2 },
      // Back wall
      { x: bayX - carWidth - 30, y: bayY - 10, width: bayWidth + carWidth * 2 + 90, height: 10, type: 'wall' },
    ],
    parkingSpot: {
      x: bayX,
      y: bayY,
      width: bayWidth,
      height: bayHeight,
    },
    bounds: { minX: 10, minY: 10, maxX: width - 10, maxY: height - 10 },
  };
}

export function getScenario(name: string, width: number, height: number): Scenario {
  switch (name) {
    case 'parallel':
      return createParallelParkingScenario(width, height);
    case 'bay':
      return createBayParkingScenario(width, height);
    case 'free':
    default:
      return createFreeDriveScenario(width, height);
  }
}
