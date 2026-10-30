import { describe, expect, it } from 'vitest';
import { getFurnitureImagePosition, projectRoomPosition, type IsometricProjection } from './room-coordinate';

const projection: IsometricProjection = {
  origin: { x: 300, y: 100 },
  unitWidth: 64,
  unitDepth: 32,
  unitHeight: 48,
};

describe('projectRoomPosition', () => {
  it('maps the logical origin to the configured screen origin', () => {
    expect(projectRoomPosition({ x: 0, y: 0, z: 0 }, projection))
      .toEqual({ x: 300, y: 100 });
  });

  it('projects positive X to the right and down', () => {
    expect(projectRoomPosition({ x: 1, y: 0, z: 0 }, projection))
      .toEqual({ x: 332, y: 116 });
  });

  it('projects positive Y to the left and down', () => {
    expect(projectRoomPosition({ x: 0, y: 1, z: 0 }, projection))
      .toEqual({ x: 268, y: 116 });
  });

  it('projects positive Z straight upward', () => {
    expect(projectRoomPosition({ x: 0, y: 0, z: 1 }, projection))
      .toEqual({ x: 300, y: 52 });
  });

  it('combines all axes without mutating the input', () => {
    const position = { x: 2, y: 3, z: 1 };
    expect(projectRoomPosition(position, projection)).toEqual({ x: 268, y: 132 });
    expect(position).toEqual({ x: 2, y: 3, z: 1 });
  });
});

describe('getFurnitureImagePosition', () => {
  it('aligns the image anchor with the projected placement point', () => {
    const placement = {
      placementId: 'p1',
      furnitureId: 'chair',
      x: 1,
      y: 2,
      z: 1,
      facing: 'front-left' as const,
    };
    const definition = {
      image: { src: 'chair.png', width: 100, height: 200, anchor: { x: 20, y: 70 } },
    };

    expect(getFurnitureImagePosition(placement, definition, projection))
      .toEqual({ x: 248, y: 30 });
  });
});
