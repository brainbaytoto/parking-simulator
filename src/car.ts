// Car physics using the bicycle model (simplified Ackermann steering)
// Key insight: The REAR AXLE moves along the heading direction, not the car center
// The car rotates around a point on the extended rear axle line

export interface CarState {
  // Position of the REAR AXLE CENTER (not car center)
  rearAxleX: number;
  rearAxleY: number;
  heading: number; // radians, 0 = pointing right
  steeringAngle: number; // front wheel angle in radians
  velocity: number; // pixels per second (at rear axle)
}

export interface CarConfig {
  name: string;
  length: number; // total car length in pixels
  width: number;
  wheelbase: number; // distance between front and rear axles
  maxSteeringAngle: number; // max steering angle in radians (full lock)
  speed: number; // constant movement speed
  rearOverhang: number; // distance from rear axle to back of car
}

export interface WheelTrailPoint {
  x: number;
  y: number;
}

export interface WheelTrails {
  frontLeft: WheelTrailPoint[];
  frontRight: WheelTrailPoint[];
  rearLeft: WheelTrailPoint[];
  rearRight: WheelTrailPoint[];
}

// Steering positions: -1 = full left, -0.5 = half left, 0 = straight, 0.5 = half right, 1 = full right
export type SteeringPosition = -1 | -0.5 | 0 | 0.5 | 1;

// Realistic car dimensions (scaled: 1 pixel ≈ 3cm)
// Real dimensions in mm, converted to pixels

// Kia Picanto: 3595mm x 1595mm, wheelbase 2400mm, rear overhang ~600mm
export const PICANTO_CONFIG: CarConfig = {
  name: 'Kia Picanto',
  length: 120,
  width: 53,
  wheelbase: 80,
  maxSteeringAngle: Math.PI / 4, // ~45 degrees
  speed: 60,
  rearOverhang: 20,
};

// Mid-size SUV (Hyundai Tucson): 4500mm x 1865mm, wheelbase 2680mm
export const SUV_CONFIG: CarConfig = {
  name: 'SUV',
  length: 150,
  width: 62,
  wheelbase: 89,
  maxSteeringAngle: Math.PI / 4.5,
  speed: 60,
  rearOverhang: 30,
};

// Hyundai Staria Load: 5253mm x 1997mm, wheelbase 3273mm
export const STARIA_CONFIG: CarConfig = {
  name: 'Hyundai Staria',
  length: 175,
  width: 67,
  wheelbase: 109,
  maxSteeringAngle: Math.PI / 5,
  speed: 60,
  rearOverhang: 33,
};

export const CAR_CONFIGS: CarConfig[] = [PICANTO_CONFIG, SUV_CONFIG, STARIA_CONFIG];

export class Car {
  state: CarState;
  config: CarConfig;
  wheelTrails: WheelTrails = {
    frontLeft: [],
    frontRight: [],
    rearLeft: [],
    rearRight: [],
  };

  constructor(x: number, y: number, heading: number = 0, config: CarConfig = PICANTO_CONFIG) {
    this.config = config;
    // x, y passed in is the car center, convert to rear axle position
    const centerOffset = (config.length / 2) - config.rearOverhang;
    this.state = {
      rearAxleX: x - Math.cos(heading) * centerOffset,
      rearAxleY: y - Math.sin(heading) * centerOffset,
      heading,
      steeringAngle: 0,
      velocity: 0,
    };
  }

  setConfig(config: CarConfig) {
    this.config = config;
  }

  // Get the car center position (for rendering)
  getCarCenter(): { x: number; y: number } {
    const { rearAxleX, rearAxleY, heading } = this.state;
    const { length, rearOverhang } = this.config;
    // Car center is ahead of rear axle by half the distance from rear to front
    const centerOffset = (length / 2) - rearOverhang;
    return {
      x: rearAxleX + Math.cos(heading) * centerOffset,
      y: rearAxleY + Math.sin(heading) * centerOffset,
    };
  }

  // Update car physics based on inputs
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

      // Bicycle model physics - REAR AXLE based
      // The rear axle moves along the heading direction
      // The heading changes based on the steering angle

      if (Math.abs(state.steeringAngle) > 0.001) {
        // Turning radius (from rear axle to instantaneous center of rotation)
        // R = wheelbase / tan(steering_angle)
        const turningRadius = config.wheelbase / Math.tan(state.steeringAngle);

        // Angular velocity = rear axle velocity / turning radius
        const angularVelocity = state.velocity / turningRadius;

        // Update heading
        state.heading += angularVelocity * dt;
      }

      // Move the rear axle along the heading direction
      // This is the key difference - rear axle always moves along heading
      state.rearAxleX += Math.cos(state.heading) * state.velocity * dt;
      state.rearAxleY += Math.sin(state.heading) * state.velocity * dt;

      // Normalize heading to [0, 2π]
      state.heading = ((state.heading % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    }
  }

  private recordWheelPositions() {
    // Record each wheel's position
    const wheels = this.getWheels();

    // wheels[0] = front left, [1] = front right, [2] = rear left, [3] = rear right
    this.wheelTrails.frontLeft.push({ x: wheels[0].x, y: wheels[0].y });
    this.wheelTrails.frontRight.push({ x: wheels[1].x, y: wheels[1].y });
    this.wheelTrails.rearLeft.push({ x: wheels[2].x, y: wheels[2].y });
    this.wheelTrails.rearRight.push({ x: wheels[3].x, y: wheels[3].y });
  }

  clearTrails() {
    this.wheelTrails = {
      frontLeft: [],
      frontRight: [],
      rearLeft: [],
      rearRight: [],
    };
  }

  // Get wheel positions and angles for rendering
  getWheels(): { x: number; y: number; angle: number; isfront: boolean }[] {
    const { rearAxleX, rearAxleY, heading, steeringAngle } = this.state;
    const { wheelbase, width } = this.config;
    const halfWidth = width / 2 - 5; // Wheels slightly inset

    const cos = Math.cos(heading);
    const sin = Math.sin(heading);

    // Front axle center
    const frontAxleX = rearAxleX + cos * wheelbase;
    const frontAxleY = rearAxleY + sin * wheelbase;

    // Front wheels (steered) - positioned on front axle
    const frontLeftX = frontAxleX - sin * halfWidth;
    const frontLeftY = frontAxleY + cos * halfWidth;
    const frontRightX = frontAxleX + sin * halfWidth;
    const frontRightY = frontAxleY - cos * halfWidth;

    // Rear wheels (fixed) - positioned on rear axle
    const rearLeftX = rearAxleX - sin * halfWidth;
    const rearLeftY = rearAxleY + cos * halfWidth;
    const rearRightX = rearAxleX + sin * halfWidth;
    const rearRightY = rearAxleY - cos * halfWidth;

    return [
      { x: frontLeftX, y: frontLeftY, angle: heading + steeringAngle, isfront: true },
      { x: frontRightX, y: frontRightY, angle: heading + steeringAngle, isfront: true },
      { x: rearLeftX, y: rearLeftY, angle: heading, isfront: false },
      { x: rearRightX, y: rearRightY, angle: heading, isfront: false },
    ];
  }

  // Get corners of the car for rendering
  getCorners(): { x: number; y: number }[] {
    const { rearAxleX, rearAxleY, heading } = this.state;
    const { length, width, rearOverhang } = this.config;
    const halfWidth = width / 2;

    const cos = Math.cos(heading);
    const sin = Math.sin(heading);

    // Calculate front and back distances from rear axle
    const frontDist = length - rearOverhang;
    const backDist = rearOverhang;

    // Four corners
    return [
      // Front-left
      {
        x: rearAxleX + cos * frontDist - sin * halfWidth,
        y: rearAxleY + sin * frontDist + cos * halfWidth
      },
      // Front-right
      {
        x: rearAxleX + cos * frontDist + sin * halfWidth,
        y: rearAxleY + sin * frontDist - cos * halfWidth
      },
      // Rear-right
      {
        x: rearAxleX - cos * backDist + sin * halfWidth,
        y: rearAxleY - sin * backDist - cos * halfWidth
      },
      // Rear-left
      {
        x: rearAxleX - cos * backDist - sin * halfWidth,
        y: rearAxleY - sin * backDist + cos * halfWidth
      },
    ];
  }

  reset(x: number, y: number, heading: number = 0) {
    // x, y is car center, convert to rear axle
    const { rearOverhang, length } = this.config;
    const centerOffset = (length / 2) - rearOverhang;
    this.state = {
      rearAxleX: x - Math.cos(heading) * centerOffset,
      rearAxleY: y - Math.sin(heading) * centerOffset,
      heading,
      steeringAngle: 0,
      velocity: 0,
    };
    this.clearTrails();
  }
}
