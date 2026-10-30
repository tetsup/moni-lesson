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

const skinSize = { width: 1024, height: 768 };

const definitions: FurnitureDefinition[] = [
  {
    id: 'chair',
    name: 'Chair',
    type: 'solid',
    image: {
      src: 'https://res.cloudinary.com/demo/image/upload/chair.png',
      width: 120,
      height: 180,
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
      width: 240,
      height: 100,
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
        skinSize={skinSize}
        furniture={[]}
        definitions={definitions}
        projection={projection}
        width={400}
        height={300}
      />,
    );

    expect(html).toContain('data-testid="image-layer-renderer"');
    expect(html).toContain('left:60px;top:40px;width:1024px;height:768px');
    expect(html).toContain('src="https://res.cloudinary.com/demo/image/upload/room.png"');
  });

  it('draws all known placements in the configured layer and depth order', () => {
    const html = renderToStaticMarkup(
      <RoomRenderer
        skin={skin}
        skinSize={skinSize}
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

    const rugIndex = html.indexOf('src="https://res.cloudinary.com/demo/image/upload/rug.png"');
    const chairBackIndex = html.indexOf('src="https://res.cloudinary.com/demo/image/upload/chair.png"');
    const chairFrontIndex = html.lastIndexOf('src="https://res.cloudinary.com/demo/image/upload/chair.png"');
    expect(rugIndex).toBeGreaterThan(-1);
    expect(chairBackIndex).toBeGreaterThan(rugIndex);
    expect(chairFrontIndex).toBeGreaterThan(chairBackIndex);
  });

  it('skips placements whose furniture definition is unavailable', () => {
    const html = renderToStaticMarkup(
      <RoomRenderer
        skin={skin}
        skinSize={skinSize}
        furniture={[placement('missing', 'not-in-catalog', 0, 0)]}
        definitions={definitions}
        projection={projection}
        width={400}
        height={300}
      />,
    );

    expect(html).not.toContain('chair.png');
    expect(html).not.toContain('not-in-catalog');
  });
});
