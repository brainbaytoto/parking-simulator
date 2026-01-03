// Car physics using the bicycle model (simplified Ackermann steering)
// The key insight: rear wheels are fixed, car rotates around rear axle

export interface CarState {
  x: number;
  y: number;
  heading: number; // radians, 0 = pointing right
  steeringAngle: number; // front wheel angle in radians
  velocity: number; // pixels per second
}

export interface CarConfig {
  name: string;
  length: number; // total car length in pixels
  width: number;
  wheelbase: number; // distance between front and rear axles
  maxSteeringAngle: number; // max steering angle in radians (full lock)
  speed: number; // constant movement speed
}

export interface WheelTrailPoint {
  x: number;
  y: number;
  isFront: boolean;
}

// Steering positions: -1 = full left, -0.5 = half left, 0 = straight, 0.5 = half right, 1 = full right
export type SteeringPosition = -1 | -0.5 | 0 | 0.5 | 1;

// Realistic car dimensions (scaled: 1 pixel ≈ 3cm)
// Real dimensions in mm, converted to pixels

// Kia Picanto: 3595mm x 1595mm, wheelbase 2400mm
export const PICANTO_CONFIG: CarConfig = {
  name: 'Kia Picanto',
  length: 120,  // 3600mm / 30
  width: 53,    // 1600mm / 30
  wheelbase: 80, // 2400mm / 30
  maxSteeringAngle: Math.PI / 4, // ~45 degrees
  speed: 60,
};

// Mid-size SUV (Hyundai Tucson): 4500mm x 1865mm, wheelbase 2680mm
export const SUV_CONFIG: CarConfig = {
  name: 'SUV',
  length: 150,  // 4500mm / 30
  width: 62,    // 1860mm / 30
  wheelbase: 89, // 2680mm / 30
  maxSteeringAngle: Math.PI / 4.5, // slightly less than small car
  speed: 60,
};

// Hyundai Staria Load: 5253mm x 1997mm, wheelbase 3273mm
export const STARIA_CONFIG: CarConfig = {
  name: 'Hyundai Staria',
  length: 175,  // 5250mm / 30
  width: 67,    // 2000mm / 30
  wheelbase: 109, // 3270mm / 30
  maxSteeringAngle: Math.PI / 5, // larger vehicles have less steering angle
  speed: 60,
};

export const CAR_CONFIGS: CarConfig[] = [PICANTO_CONFIG, SUV_CONFIG, STARIA_CONFIG];

export class Car {
  state: CarState;
  config: CarConfig;
  frontWheelTrail: WheelTrailPoint[] = [];
  rearWheelTrail: WheelTrailPoint[] = [];
  private maxTrailLength = 500;

  constructor(x: number, y: number, heading: number = 0, config: CarConfig = PICANTO_CONFIG) {
    this.config = config;
    this.state = {
      x,
      y,
      heading,
      steeringAngle: 0,
      velocity: 0,
    };
  }

  setConfig(config: CarConfig) {
    this.config = config;
  }

  // Update car physics based on inputs
  // movement: 1 = forward, -1 = reverse, 0 = stopped
  // steeringPosition: -1, -0.5, 0, 0.5, 1
  update(dt: number, input: { movement: number; steeringPosition: SteeringPosition }) {
    const { state, config } = this;

    // Set steering angle directly based on position (with smooth transition)
    const targetSteering = input.steeringPosition * config.maxSteeringAngle;
    const steeringSpeed = 5; // radians per second
    const steeringDiff = targetSteering - state.steeringAngle;
    const maxSteeringChange = steeringSpeed * dt;
    state.steeringAngle += Math.max(-maxSteeringChange, Math.min(maxSteeringChange, steeringDiff));

    // Set velocity directly (no acceleration, stops immediately when released)
    state.velocity = input.movement * config.speed;

    // Only update position if moving
    if (Math.abs(state.velocity) > 0.1) {
      // Record wheel positions before moving (for trail)
      this.recordWheelPositions();

      // Bicycle model physics
      if (Math.abs(state.steeringAngle) > 0.001) {
        // Turning radius = wheelbase / tan(steering_angle)
        const turningRadius = config.wheelbase / Math.tan(state.steeringAngle);

        // Angular velocity = linear velocity / turning radius
        const angularVelocity = state.velocity / turningRadius;

        // Update heading
        state.heading += angularVelocity * dt;
      }

      // Update position (move in direction of heading)
      state.x += Math.cos(state.heading) * state.velocity * dt;
      state.y += Math.sin(state.heading) * state.velocity * dt;

      // Normalize heading to [0, 2π]
      state.heading = ((state.heading % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    }
  }

  private recordWheelPositions() {
    const wheels = this.getWheels();

    // Get average position of front wheels and rear wheels
    const frontX = (wheels[0].x + wheels[1].x) / 2;
    const frontY = (wheels[0].y + wheels[1].y) / 2;
    const rearX = (wheels[2].x + wheels[3].x) / 2;
    const rearY = (wheels[2].y + wheels[3].y) / 2;

    // Add to trails
    this.frontWheelTrail.push({ x: frontX, y: frontY, isFront: true });
    this.rearWheelTrail.push({ x: rearX, y: rearY, isFront: false });

    // Limit trail length
    if (this.frontWheelTrail.length > this.maxTrailLength) {
      this.frontWheelTrail.shift();
    }
    if (this.rearWheelTrail.length > this.maxTrailLength) {
      this.rearWheelTrail.shift();
    }
  }

  clearTrails() {
    this.frontWheelTrail = [];
    this.rearWheelTrail = [];
  }

  // Get wheel positions and angles for rendering
  getWheels(): { x: number; y: number; angle: number; isfront: boolean }[] {
    const { x, y, heading, steeringAngle } = this.state;
    const { wheelbase, width } = this.config;
    const halfWheelbase = wheelbase / 2;
    const halfWidth = width / 2 - 5; // Wheels slightly inset

    const cos = Math.cos(heading);
    const sin = Math.sin(heading);

    // Front wheels (steered)
    const frontLeftX = x + cos * halfWheelbase - sin * halfWidth;
    const frontLeftY = y + sin * halfWheelbase + cos * halfWidth;
    const frontRightX = x + cos * halfWheelbase + sin * halfWidth;
    const frontRightY = y + sin * halfWheelbase - cos * halfWidth;

    // Rear wheels (fixed)
    const rearLeftX = x - cos * halfWheelbase - sin * halfWidth;
    const rearLeftY = y - sin * halfWheelbase + cos * halfWidth;
    const rearRightX = x - cos * halfWheelbase + sin * halfWidth;
    const rearRightY = y - sin * halfWheelbase - cos * halfWidth;

    return [
      { x: frontLeftX, y: frontLeftY, angle: heading + steeringAngle, isfront: true },
      { x: frontRightX, y: frontRightY, angle: heading + steeringAngle, isfront: true },
      { x: rearLeftX, y: rearLeftY, angle: heading, isfront: false },
      { x: rearRightX, y: rearRightY, angle: heading, isfront: false },
    ];
  }

  // Get corners of the car for rendering
  getCorners(): { x: number; y: number }[] {
    const { x, y, heading } = this.state;
    const { length, width } = this.config;
    const halfLength = length / 2;
    const halfWidth = width / 2;

    const cos = Math.cos(heading);
    const sin = Math.sin(heading);

    return [
      { x: x + cos * halfLength - sin * halfWidth, y: y + sin * halfLength + cos * halfWidth },
      { x: x + cos * halfLength + sin * halfWidth, y: y + sin * halfLength - cos * halfWidth },
      { x: x - cos * halfLength + sin * halfWidth, y: y - sin * halfLength - cos * halfWidth },
      { x: x - cos * halfLength - sin * halfWidth, y: y - sin * halfLength + cos * halfWidth },
    ];
  }

  reset(x: number, y: number, heading: number = 0) {
    this.state = {
      x,
      y,
      heading,
      steeringAngle: 0,
      velocity: 0,
    };
    this.clearTrails();
  }
}
