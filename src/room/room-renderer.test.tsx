import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RoomRenderer } from './room-renderer';
import type { FurnitureDefinition, FurniturePlacement, RoomSkinDefinition } from './room-types';

const skin: RoomSkinDefinition = {
  id: 'room-a',
  name: 'Room A',
  backgroundImage: 'https://res.cloudinary.com/demo/image/upload/room.png',
  anchor: { x: 40, y: 80 },
  layoutId: 'layout-a',
};

const definitions: FurnitureDefinition[] = [
  {
    id: 'chair',
    name: 'Chair',
    type: 'solid',
    image: {
      src: 'https://res.cloudinary.com/demo/image/upload/chair.png',
      anchor: { x: 12, y: 30 },
    },
    size: { x: 1, y: 1, z: 1 },
  },
  {
    id: 'rug',
    name: 'Rug',
    type: 'floor-covering',
    image: {
      src: 'https://res.cloudinary.com/demo/image/upload/rug.png',
      anchor: { x: 20, y: 10 },
    },
    size: { x: 2, y: 2, z: 0 },
  },
];

const projection = {
  origin: { x: 100, y: 120 },
  unitWidth: 64,
  unitDepth: 32,
  unitHeight: 48,
};

const placement = (
  placementId: string,
  furnitureId: string,
  x: number,
  y: number,
): FurniturePlacement => ({
  placementId,
  furnitureId,
  x,
  y,
  z: 0,
  facing: 'front-left',
});

describe('RoomRenderer', () => {
  it('aligns the room image anchor with the projection origin', () => {
    const html = renderToStaticMarkup(
      <RoomRenderer
        skin={skin}
        furniture={[]}
        definitions={definitions}
        projection={projection}
        width={400}
        height={300}
      />,
    );

    expect(html).toContain('data-testid="room-background"');
    expect(html).toContain('left:60px;top:40px');
    expect(html).toContain('src="https://res.cloudinary.com/demo/image/upload/room.png"');
  });

  it('draws all known placements in the configured layer and depth order', () => {
    const html = renderToStaticMarkup(
      <RoomRenderer
        skin={skin}
        furniture={[
          placement('chair-front', 'chair', 2, 3),
          placement('rug', 'rug', 0, 0),
          placement('chair-back', 'chair', 1, 1),
        ]}
        definitions={definitions}
        projection={projection}
        width={400}
        height={300}
      />,
    );

    const rugIndex = html.indexOf('data-placement-id="rug"');
    const chairBackIndex = html.indexOf('data-placement-id="chair-back"');
    const chairFrontIndex = html.indexOf('data-placement-id="chair-front"');
    expect(rugIndex).toBeGreaterThan(-1);
    expect(chairBackIndex).toBeGreaterThan(rugIndex);
    expect(chairFrontIndex).toBeGreaterThan(chairBackIndex);
  });

  it('skips placements whose furniture definition is unavailable', () => {
    const html = renderToStaticMarkup(
      <RoomRenderer
        skin={skin}
        furniture={[placement('missing', 'not-in-catalog', 0, 0)]}
        definitions={definitions}
        projection={projection}
        width={400}
        height={300}
      />,
    );

    expect(html).not.toContain('data-placement-id="missing"');
  });
});
