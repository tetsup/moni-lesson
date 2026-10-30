import { describe, expect, it } from 'vitest';
import { getCostumeRenderItems, type CostumePart } from './costume-render-items';

const parts: CostumePart[] = [
  {
    src: 'shirt.png',
    centerOffset: { x: 0, y: 10 },
    width: 100,
    height: 80,
  },
  {
    src: 'skirt.png',
    centerOffset: { x: 2, y: 70 },
    width: 90,
    height: 60,
  },
  {
    src: 'shoes.png',
    centerOffset: { x: 0, y: 130 },
    width: 50,
    height: 30,
  },
];

describe('getCostumeRenderItems', () => {
  it('converts each part center into top-left coordinates relative to the torso center', () => {
    expect(getCostumeRenderItems({
      parts,
      torsoCenter: { x: 200, y: 150 },
    })).toEqual([
      { src: 'shirt.png', x: 150, y: 120, width: 100, height: 80 },
      { src: 'skirt.png', x: 157, y: 190, width: 90, height: 60 },
      { src: 'shoes.png', x: 175, y: 265, width: 50, height: 30 },
    ]);
  });

  it('scales dimensions and offsets around the torso center', () => {
    expect(getCostumeRenderItems({
      parts: [parts[0]],
      torsoCenter: { x: 200, y: 150 },
      scale: 2,
    })).toEqual([
      { src: 'shirt.png', x: 100, y: 90, width: 200, height: 160 },
    ]);
  });

  it('preserves the input order for drawing costume layers', () => {
    expect(getCostumeRenderItems({
      parts,
      torsoCenter: { x: 0, y: 0 },
    }).map((item) => item.src)).toEqual(['shirt.png', 'skirt.png', 'shoes.png']);
  });

  it('returns an empty list when no costume parts are supplied', () => {
    expect(getCostumeRenderItems({
      parts: [],
      torsoCenter: { x: 0, y: 0 },
    })).toEqual([]);
  });
});
