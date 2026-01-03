// Scenario definitions for parking practice
// Australian left-hand traffic: drive on LEFT, park on LEFT

import { PICANTO_CONFIG, SUV_CONFIG, STARIA_CONFIG } from '../car';
import type { CarConfig } from '../car';

export type Difficulty = 'easy' | 'medium' | 'hard';

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

export interface Surface {
  type: 'grass' | 'asphalt' | 'footpath' | 'curb';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Marking {
  type: 'lane' | 'centre' | 'bay';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  dashed?: boolean;
}

export interface Environment {
  surfaces: Surface[];
  markings: Marking[];
}

export interface Scenario {
  name: string;
  difficulty: Difficulty;
  carStart: { x: number; y: number; heading: number };
  obstacles: Obstacle[];
  parkingSpot?: ParkingSpot;
  bounds?: { minX: number; minY: number; maxX: number; maxY: number };
  environment?: Environment;
}

// Car configs for obstacle cars (using realistic dimensions)
const CAR_CONFIGS: CarConfig[] = [PICANTO_CONFIG, SUV_CONFIG, STARIA_CONFIG];

function getRandomCarConfig(): CarConfig {
  return CAR_CONFIGS[Math.floor(Math.random() * CAR_CONFIGS.length)];
}

function getCarObstacle(config: CarConfig, x: number, y: number, rotation: number = 0): Obstacle {
  return {
    x,
    y,
    width: config.length,
    height: config.width,
    rotation,
    type: 'car',
  };
}

// ============================================================================
// FREE DRIVE SCENARIOS
// ============================================================================

export function createFreeDriveScenario(width: number, height: number, difficulty: Difficulty): Scenario {
  const obstacles: Obstacle[] = [];
  const surfaces: Surface[] = [];
  const markings: Marking[] = [];

  // Full asphalt surface
  surfaces.push({ type: 'asphalt', x: 0, y: 0, width, height });

  // Grass border around the edges
  const borderWidth = 40;
  surfaces.push({ type: 'grass', x: 0, y: 0, width, height: borderWidth });
  surfaces.push({ type: 'grass', x: 0, y: height - borderWidth, width, height: borderWidth });
  surfaces.push({ type: 'grass', x: 0, y: 0, width: borderWidth, height });
  surfaces.push({ type: 'grass', x: width - borderWidth, y: 0, width: borderWidth, height });

  // Add parked cars based on difficulty
  const numCars = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 5 : 10;
  const positions = [
    { x: 0.2, y: 0.25 }, { x: 0.75, y: 0.3 }, { x: 0.15, y: 0.65 },
    { x: 0.8, y: 0.7 }, { x: 0.5, y: 0.2 }, { x: 0.4, y: 0.75 },
    { x: 0.65, y: 0.5 }, { x: 0.25, y: 0.45 }, { x: 0.85, y: 0.45 },
    { x: 0.55, y: 0.6 },
  ];

  for (let i = 0; i < numCars; i++) {
    const config = getRandomCarConfig();
    const pos = positions[i];
    const rotation = (Math.random() - 0.5) * Math.PI / 2;
    obstacles.push(getCarObstacle(
      config,
      width * pos.x - config.length / 2,
      height * pos.y - config.width / 2,
      rotation
    ));
  }

  return {
    name: `Free Drive (${difficulty})`,
    difficulty,
    carStart: { x: width / 2, y: height / 2, heading: 0 },
    obstacles,
    bounds: { minX: borderWidth, minY: borderWidth, maxX: width - borderWidth, maxY: height - borderWidth },
    environment: { surfaces, markings },
  };
}

// ============================================================================
// PARALLEL PARKING SCENARIOS (Australian - park on LEFT side)
// ============================================================================

export function createParallelParkingScenario(width: number, height: number, difficulty: Difficulty): Scenario {
  const obstacles: Obstacle[] = [];
  const surfaces: Surface[] = [];
  const markings: Marking[] = [];

  // Use Picanto as reference for gap sizing (player's default car)
  const playerCarLength = PICANTO_CONFIG.length;
  const playerCarWidth = PICANTO_CONFIG.width;

  // Gap size based on difficulty
  const gapMultiplier = difficulty === 'easy' ? 2.0 : difficulty === 'medium' ? 1.6 : 1.4;
  const gapSize = playerCarLength * gapMultiplier;

  // Street layout dimensions (horizontal road)
  const grassHeight = 50;
  const footpathHeight = 35;
  const curbHeight = 8;
  const parkingLaneHeight = playerCarWidth + 20;
  const drivingLaneHeight = 100;

  // Calculate Y positions (from top to bottom)
  // Top side: grass -> footpath -> curb -> road
  const topGrassY = 0;
  const topFootpathY = grassHeight;
  const topCurbY = topFootpathY + footpathHeight;
  const roadTopY = topCurbY + curbHeight;

  // Road area
  const roadHeight = parkingLaneHeight + drivingLaneHeight * 2 + parkingLaneHeight;
  const centreLineY = roadTopY + parkingLaneHeight + drivingLaneHeight;

  // Bottom side
  const roadBottomY = roadTopY + roadHeight;
  const bottomCurbY = roadBottomY;
  const bottomFootpathY = bottomCurbY + curbHeight;
  const bottomGrassY = bottomFootpathY + footpathHeight;

  // Surfaces (back to front: grass first, then footpath, curb, asphalt)
  // Top grass
  surfaces.push({ type: 'grass', x: 0, y: topGrassY, width, height: grassHeight });
  // Top footpath
  surfaces.push({ type: 'footpath', x: 0, y: topFootpathY, width, height: footpathHeight });
  // Top curb
  surfaces.push({ type: 'curb', x: 0, y: topCurbY, width, height: curbHeight });

  // Road (asphalt)
  surfaces.push({ type: 'asphalt', x: 0, y: roadTopY, width, height: roadHeight });

  // Bottom curb
  surfaces.push({ type: 'curb', x: 0, y: bottomCurbY, width, height: curbHeight });
  // Bottom footpath
  surfaces.push({ type: 'footpath', x: 0, y: bottomFootpathY, width, height: footpathHeight });
  // Bottom grass
  surfaces.push({ type: 'grass', x: 0, y: bottomGrassY, width, height: height - bottomGrassY });

  // Lane markings
  // Centre line (dashed)
  markings.push({ type: 'centre', x1: 0, y1: centreLineY, x2: width, y2: centreLineY, dashed: true });

  // Lane divider between parking lane and driving lane (left side)
  const leftLaneDividerY = roadTopY + parkingLaneHeight;
  markings.push({ type: 'lane', x1: 0, y1: leftLaneDividerY, x2: width, y2: leftLaneDividerY, dashed: true });

  // Parking area on the LEFT side (Australian)
  const parkingY = roadTopY + 5;
  const gapCentreX = width * 0.45;

  // Front car (ahead of gap - to the right since we're facing left)
  const frontCarConfig = difficulty === 'hard' ? SUV_CONFIG : PICANTO_CONFIG;
  obstacles.push(getCarObstacle(
    frontCarConfig,
    gapCentreX + gapSize / 2 + 10,
    parkingY,
    0
  ));

  // Rear car (behind gap - to the left)
  const rearCarConfig = difficulty === 'easy' ? PICANTO_CONFIG : SUV_CONFIG;
  obstacles.push(getCarObstacle(
    rearCarConfig,
    gapCentreX - gapSize / 2 - rearCarConfig.length - 10,
    parkingY,
    0
  ));

  // Hard mode: add a car parked across the road limiting reversing space
  if (difficulty === 'hard') {
    const blockingCarConfig = PICANTO_CONFIG;
    obstacles.push(getCarObstacle(
      blockingCarConfig,
      gapCentreX - gapSize / 2 - rearCarConfig.length - blockingCarConfig.length - 40,
      parkingY + 10,
      Math.PI / 8 // Slightly angled
    ));
  }

  // Parking spot marker
  const parkingSpot: ParkingSpot = {
    x: gapCentreX - gapSize / 2,
    y: parkingY,
    width: gapSize,
    height: parkingLaneHeight - 10,
  };

  // Player starts in the driving lane, facing LEFT (heading = π)
  // Position to the right of the gap, ready to pull up beside front car
  const startX = gapCentreX + gapSize / 2 + frontCarConfig.length + 100;
  const startY = roadTopY + parkingLaneHeight + drivingLaneHeight / 2;

  return {
    name: `Parallel Parking (${difficulty})`,
    difficulty,
    carStart: { x: startX, y: startY, heading: Math.PI },
    obstacles,
    parkingSpot,
    bounds: { minX: 10, minY: roadTopY, maxX: width - 10, maxY: roadBottomY },
    environment: { surfaces, markings },
  };
}

// ============================================================================
// BAY PARKING SCENARIOS
// ============================================================================

export function createBayParkingScenario(width: number, height: number, difficulty: Difficulty): Scenario {
  const obstacles: Obstacle[] = [];
  const surfaces: Surface[] = [];
  const markings: Marking[] = [];

  // Use Picanto as reference for bay sizing
  const playerCarLength = PICANTO_CONFIG.length;
  const playerCarWidth = PICANTO_CONFIG.width;

  // Bay dimensions based on difficulty
  const extraWidth = difficulty === 'easy' ? 60 : difficulty === 'medium' ? 40 : 25;
  const bayWidth = playerCarWidth + extraWidth;
  const bayDepth = playerCarLength + 30;

  // Parking lot layout
  const grassBorder = 40;
  const bayRowY = height * 0.15;

  // Surfaces
  // Grass background
  surfaces.push({ type: 'grass', x: 0, y: 0, width, height });
  // Asphalt parking lot
  surfaces.push({ type: 'asphalt', x: grassBorder, y: grassBorder, width: width - grassBorder * 2, height: height - grassBorder * 2 });

  // Create a row of parking bays at the top
  const numBays = 6;
  const totalBaysWidth = numBays * bayWidth;
  const baysStartX = (width - totalBaysWidth) / 2;
  const targetBayIndex = 2; // Player parks in 3rd bay (0-indexed)

  // Draw bay markings
  for (let i = 0; i <= numBays; i++) {
    const bayLineX = baysStartX + i * bayWidth;
    markings.push({
      type: 'bay',
      x1: bayLineX,
      y1: bayRowY,
      x2: bayLineX,
      y2: bayRowY + bayDepth,
      dashed: false,
    });
  }
  // Back line of bays
  markings.push({
    type: 'bay',
    x1: baysStartX,
    y1: bayRowY,
    x2: baysStartX + totalBaysWidth,
    y2: bayRowY,
    dashed: false,
  });

  // Add parked cars based on difficulty
  // Easy: 1 car (on one side only)
  // Medium: 2 cars (both sides)
  // Hard: 2 cars + obstacles in the driving area

  if (difficulty === 'easy') {
    // One car on the left of target bay
    const leftCarConfig = PICANTO_CONFIG;
    const leftBayX = baysStartX + (targetBayIndex - 1) * bayWidth;
    obstacles.push(getCarObstacle(
      leftCarConfig,
      leftBayX + (bayWidth - leftCarConfig.width) / 2,
      bayRowY + 10,
      -Math.PI / 2 // Facing up (into the bay)
    ));
  } else {
    // Two cars on both sides
    const leftCarConfig = difficulty === 'hard' ? SUV_CONFIG : PICANTO_CONFIG;
    const leftBayX = baysStartX + (targetBayIndex - 1) * bayWidth;
    obstacles.push(getCarObstacle(
      leftCarConfig,
      leftBayX + (bayWidth - leftCarConfig.width) / 2,
      bayRowY + 10,
      -Math.PI / 2
    ));

    const rightCarConfig = SUV_CONFIG;
    const rightBayX = baysStartX + (targetBayIndex + 1) * bayWidth;
    obstacles.push(getCarObstacle(
      rightCarConfig,
      rightBayX + (bayWidth - rightCarConfig.width) / 2,
      bayRowY + 10,
      -Math.PI / 2
    ));

    // Hard mode: add obstacles in driving area
    if (difficulty === 'hard') {
      // Shopping trolley / obstacle
      obstacles.push({
        x: width * 0.3,
        y: height * 0.5,
        width: 30,
        height: 20,
        rotation: 0.2,
        type: 'curb', // Use curb as generic obstacle
      });

      // Another parked car in the lot
      const extraCar = STARIA_CONFIG;
      obstacles.push(getCarObstacle(
        extraCar,
        width * 0.7,
        height * 0.55,
        Math.PI / 4
      ));
    }
  }

  // Parking spot (the target bay)
  const targetBayX = baysStartX + targetBayIndex * bayWidth;
  const parkingSpot: ParkingSpot = {
    x: targetBayX,
    y: bayRowY,
    width: bayWidth,
    height: bayDepth,
  };

  // Player starts at bottom, facing up toward the bays
  return {
    name: `Bay Parking (${difficulty})`,
    difficulty,
    carStart: { x: width / 2, y: height * 0.75, heading: -Math.PI / 2 },
    obstacles,
    parkingSpot,
    bounds: { minX: grassBorder, minY: grassBorder, maxX: width - grassBorder, maxY: height - grassBorder },
    environment: { surfaces, markings },
  };
}

// ============================================================================
// SCENARIO SELECTOR
// ============================================================================

export function getScenario(name: string, width: number, height: number, difficulty: Difficulty = 'medium'): Scenario {
  switch (name) {
    case 'parallel':
      return createParallelParkingScenario(width, height, difficulty);
    case 'bay':
      return createBayParkingScenario(width, height, difficulty);
    case 'free':
    default:
      return createFreeDriveScenario(width, height, difficulty);
  }
}
