import { describe, expect, it } from 'vitest';
import { getFurnitureDrawOrder } from './room-draw-order';
import type { FurnitureDefinition, FurniturePlacement } from './room-types';

const definitions: FurnitureDefinition[] = [
  { id: 'chair', name: 'Chair', type: 'solid', image: { src: 'chair.png', anchor: { x: 32, y: 64 } }, size: { x: 2, y: 1, z: 2 } },
  { id: 'rug', name: 'Rug', type: 'floor-covering', image: { src: 'rug.png', anchor: { x: 48, y: 48 } }, size: { x: 3, y: 2, z: 0 } },
  { id: 'picture', name: 'Picture', type: 'wall-mounted', image: { src: 'picture.png', anchor: { x: 32, y: 64 } }, size: { x: 2, y: 0, z: 2 } },
];

const placement = (
  placementId: string,
  furnitureId: string,
  y: number,
): FurniturePlacement => ({
  placementId,
  furnitureId,
  x: 0,
  y,
  z: 0,
  facing: 'front-left',
});

describe('getFurnitureDrawOrder', () => {
  it('draws wall-mounted items, floor coverings, then solid furniture', () => {
    const state = {
      skinId: 'skin',
      furniture: [
        placement('chair', 'chair', 1),
        placement('picture', 'picture', 100),
        placement('rug', 'rug', -100),
      ],
    };
    expect(getFurnitureDrawOrder(state, definitions).map((item) => item.placementId))
      .toEqual(['picture', 'rug', 'chair']);
  });

  it('sorts solid furniture from back to front by depth', () => {
    const state = {
      skinId: 'skin',
      furniture: [
        placement('front', 'chair', 10),
        placement('back', 'chair', -2),
        placement('middle', 'chair', 4),
      ],
    };
    expect(getFurnitureDrawOrder(state, definitions).map((item) => item.placementId))
      .toEqual(['back', 'middle', 'front']);
  });

  it('preserves original order for equal-depth solid furniture', () => {
    const state = {
      skinId: 'skin',
      furniture: [
        placement('first', 'chair', 3),
        placement('second', 'chair', 3),
      ],
    };
    expect(getFurnitureDrawOrder(state, definitions).map((item) => item.placementId))
      .toEqual(['first', 'second']);
  });

  it('does not mutate the room state array', () => {
    const state = {
      skinId: 'skin',
      furniture: [placement('front', 'chair', 10), placement('back', 'chair', -2)],
    };
    const original = [...state.furniture];
    getFurnitureDrawOrder(state, definitions);
    expect(state.furniture).toEqual(original);
  });

  it('puts unknown catalog items in the solid layer as a safe fallback', () => {
    const state = {
      skinId: 'skin',
      furniture: [placement('unknown', 'not-in-catalog', 1), placement('picture', 'picture', 0)],
    };
    expect(getFurnitureDrawOrder(state, definitions).map((item) => item.placementId))
      .toEqual(['picture', 'unknown']);
  });
});
