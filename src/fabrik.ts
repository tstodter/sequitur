// TODO
/*
  - origin point still moving up, not sure why. Likely influence of collider?
    - definitely
*/

export type Point = [number, number] | [number, number, number];

const distance = (a: Point, b: Point) => {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = Math.abs(b[i] - a[i]);
    sum += diff * diff;
  }

  return Math.sqrt(sum);
};

const sum = (arr: number[]) => {
  let retSum = 0;
  for (let i = 0; i < arr.length; i++) {
    retSum += arr[i];
  }
  return retSum;
};

const pointByScalar = (p: Point, n: number): Point => {
  return p.length === 2
    ? [p[0] * n, p[1] * n]
    : [p[0] * n, p[1] * n, p[2] * n];
};

const addPoints = (p1: Point, p2: Point): Point => {
  return p1.length === 2 || p2.length === 2
    ? [p1[0] + p2[0], p1[1] + p2[1]]
    : [p1[0] + p2[0], p1[1] + p2[1], p1[2] + p2[2]];
};

const movePointAlongSegmentBy = (frac: number, pointA: Point, pointB: Point) => (
  addPoints(
    pointByScalar(pointA, frac),
    pointByScalar(pointB, 1 - frac)
  )
);

const last = <T>(arr: T[]) => arr[arr.length - 1];

export const fabrik = (
  tolerance: number,
  maxIterations: Number = Infinity,
  isRootFixed: boolean = true
) => (
  jointPositions: Array<Point>,
  boneDistances: Array<number>,
  target: Point
): Array<Point> => {
  const numJoints = jointPositions.length;

  // Distance between root and target
  const rootToTarget = distance(jointPositions[0], target);

  // Check whether the target is within reach
  if (isRootFixed && rootToTarget > sum(boneDistances)) {
    // The target is unreachable
    for (let i = 0; i < boneDistances.length; i++) {
      // Find the distance r_i between the target and the jointPositions[i]
      const distFromJointToTarget = distance(jointPositions[i], target);
      // Find the new joint positions p_i
      jointPositions[i + 1] = movePointAlongSegmentBy(
        boneDistances[i] / distFromJointToTarget,
        target,
        jointPositions[i]
      );
    }

    return jointPositions;
  }

  // The target is reachable; thus, set as b the initial position of the joint jointPositions[0]
  let initialRootPosition = jointPositions[0];
  // Check whether the distance between the end effector last(jointPositions) and the target
  // is greater than a tolerance
  let iteration = 0;
  let distFromEndToTarget = distance(last(jointPositions), target);

  while (distFromEndToTarget > tolerance && iteration < maxIterations) {
    // STAGE 1: FORWARD REACHING
    // Set the end effector last(jointPositions) as target
    jointPositions[jointPositions.length - 1] = target;
    for (let i = jointPositions.length - 2; i >= 0; i--) {
      // Find the distance r_i between the new joint position jointPositions[i + 1] and jointPositions[i]
      const newBoneDistance = distance(jointPositions[i], jointPositions[i + 1]);

      // Find the new jointPositions[i]
      jointPositions[i] = movePointAlongSegmentBy(
        boneDistances[i] / newBoneDistance,
        jointPositions[i],
        jointPositions[i + 1]
      );
    }

    // STAGE 2: BACKWARD REACHING
    // Set the root jointPositions[0] its initial position
    if (isRootFixed) {
      jointPositions[0] = initialRootPosition;
    }

    for (let i = 0; i < jointPositions.length - 1; i++) {
      // Find the distance r_i between the new jointPositions[i] and jointPositions[i + 1]
      const newBoneDistance = distance(jointPositions[i], jointPositions[i + 1]);
      // Find the new jointPositions[i]
      jointPositions[i + 1] = movePointAlongSegmentBy(
        boneDistances[i] / newBoneDistance,
        jointPositions[i + 1],
        jointPositions[i]
      );
    }

    distFromEndToTarget = distance(last(jointPositions), target);
    iteration += 1;
  }

  return jointPositions;
};

export const fabrikGenerator = (
  tolerance: number,
  maxIterations: Number = Infinity,
  isRootFixed: boolean = true
) => function* (
  jointPositions: Array<Point>,
  boneDistances: Array<number>,
  target: Point
): Iterator<Array<Point>> {
  const numJoints = jointPositions.length;

  // Distance between root and target
  const rootToTarget = distance(jointPositions[0], target);

  // Check whether the target is within reach
  if (isRootFixed && rootToTarget > sum(boneDistances)) {
    // The target is unreachable
    for (let i = 0; i < boneDistances.length; i++) {
      // Find the distance r_i between the target and the jointPositions[i]
      const distFromJointToTarget = distance(jointPositions[i], target);
      // Find the new joint positions p_i
      jointPositions[i + 1] = movePointAlongSegmentBy(
        boneDistances[i] / distFromJointToTarget,
        target,
        jointPositions[i]
      );

      yield jointPositions;
    }

    return jointPositions;
  }

  // The target is reachable; thus, set as b the initial position of the joint jointPositions[0]
  let initialRootPosition = jointPositions[0];
  // Check whether the distance between the end effector last(jointPositions) and the target
  // is greater than a tolerance
  let iteration = 0;
  let distFromEndToTarget = distance(last(jointPositions), target);

  while (distFromEndToTarget > tolerance && iteration < maxIterations) {
    // STAGE 1: FORWARD REACHING
    // Set the end effector last(jointPositions) as target
    jointPositions[jointPositions.length - 1] = target;
    for (let i = jointPositions.length - 2; i >= 0; i--) {
      // Find the distance r_i between the new joint position jointPositions[i + 1] and jointPositions[i]
      const newBoneDistance = distance(jointPositions[i], jointPositions[i + 1]);

      // Find the new jointPositions[i]
      jointPositions[i] = movePointAlongSegmentBy(
        boneDistances[i] / newBoneDistance,
        jointPositions[i],
        jointPositions[i + 1]
      );

      yield jointPositions;
    }

    // STAGE 2: BACKWARD REACHING
    // Set the root jointPositions[0] its initial position
    if (isRootFixed) {
      jointPositions[0] = initialRootPosition;
    }

    for (let i = 0; i < jointPositions.length - 1; i++) {
      // Find the distance r_i between the new jointPositions[i] and jointPositions[i + 1]
      const newBoneDistance = distance(jointPositions[i], jointPositions[i + 1]);
      // Find the new jointPositions[i]
      jointPositions[i + 1] = movePointAlongSegmentBy(
        boneDistances[i] / newBoneDistance,
        jointPositions[i + 1],
        jointPositions[i]
      );

      yield jointPositions;
    }

    distFromEndToTarget = distance(last(jointPositions), target);
    iteration += 1;
  }

  return jointPositions;
};
