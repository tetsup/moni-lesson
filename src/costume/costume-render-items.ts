import type { ImageRenderItem } from '../components/ImageLayerRenderer';

export type Point = {
  x: number;
  y: number;
};

/**
 * A costume image positioned by its center relative to the character's torso
 * center. Array order is the desired paint order (back to front).
 */
export type CostumePart = {
  src: string;
  centerOffset: Point;
  width: number;
  height: number;
};

export type CostumeRenderItemsInput = {
  parts: readonly CostumePart[];
  torsoCenter: Point;
  scale?: number;
};

/**
 * Converts costume-part center offsets into top-left image coordinates for
 * the shared image renderer. It deliberately does not sort the parts.
 */
export const getCostumeRenderItems = ({
  parts,
  torsoCenter,
  scale = 1,
}: CostumeRenderItemsInput): ImageRenderItem[] =>
  parts.map((part) => {
    const width = part.width * scale;
    const height = part.height * scale;
    const centerX = torsoCenter.x + part.centerOffset.x * scale;
    const centerY = torsoCenter.y + part.centerOffset.y * scale;

    return {
      src: part.src,
      x: centerX - width / 2,
      y: centerY - height / 2,
      width,
      height,
    };
  });
