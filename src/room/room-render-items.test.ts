import { describe, expect, it } from 'vitest';
import { getRoomRenderItems } from './room-render-items';
import type { FurnitureDefinition, FurniturePlacement, RoomSkinDefinition } from './room-types';

const skin: RoomSkinDefinition = {
  id: 'room',
  name: 'Room',
  backgroundImage: 'room.png',
  anchor: { x: 40, y: 80 },
  layoutId: 'layout',
};

const definitions: FurnitureDefinition[] = [{
  id: 'chair',
  name: 'Chair',
  type: 'solid',
  image: {
    src: 'chair.png',
    width: 100,
    height: 200,
    anchor: { x: 10, y: 20 },
  },
  size: { x: 1, y: 1, z: 1 },
}];

const placement: FurniturePlacement = {
  placementId: 'chair-1',
  furnitureId: 'chair',
  x: 1,
  y: 2,
  z: 1,
  facing: 'front-left',
};

const projection = {
  origin: { x: 300, y: 100 },
  unitWidth: 64,
  unitDepth: 32,
  unitHeight: 48,
};

describe('getRoomRenderItems', () => {
  it('places the background first and aligns its anchor with the projection origin', () => {
    const items = getRoomRenderItems({
      skin,
      skinSize: { width: 1024, height: 768 },
      furniture: [],
      definitions,
      projection,
    });

    expect(items).toEqual([{
      src: 'room.png',
      x: 260,
      y: 20,
      width: 1024,
      height: 768,
    }]);
  });

  it('converts furniture anchors, source dimensions, and scale into render items', () => {
    const items = getRoomRenderItems({
      skin,
      skinSize: { width: 1024, height: 768 },
      furniture: [placement],
      definitions,
      projection,
      scale: 2,
    });

    expect(items[1]).toEqual({
      src: 'chair.png',
      x: 248,
      y: 60,
      width: 200,
      height: 400,
    });
  });
});
