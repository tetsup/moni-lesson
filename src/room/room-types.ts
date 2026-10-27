export type FurnitureFacing = 'front-left' | 'front-right';

export type FurnitureType = 'solid' | 'floor-covering' | 'wall-mounted';

/** Logical room dimensions, independent of rendered pixel size. */
export type Vector3 = {
  x: number;
  y: number;
  z: number;
};

/**
 * Image-space point that corresponds to the furniture placement anchor.
 * Coordinates are pixels measured from the image's top-left corner.
 */
export type FurnitureImage = {
  src: string;
  anchor: {
    x: number;
    y: number;
  };
};

export type FurnitureDefinition = {
  id: string;
  name: string;
  type: FurnitureType;
  image: FurnitureImage;
  /** Logical footprint/height; the meaning of each axis depends on furniture type. */
  size: Vector3;
};

export type FurniturePlacement = {
  placementId: string;
  furnitureId: string;
  /**
   * Position of the furniture's logical lower/back anchor in room coordinates.
   * Room origin is the back corner of the floor where the three axes meet.
   */
  x: number;
  /** Depth: 0 is at the back; larger values are closer to the viewer. */
  y: number;
  /** Height above the floor. */
  z: number;
  facing: FurnitureFacing;
};

/**
 * Room background image and the pixel within it that represents logical (0, 0, 0).
 * Coordinates are measured from the image's top-left corner.
 */
export type RoomSkinDefinition = {
  id: string;
  name: string;
  backgroundImage: string;
  anchor: {
    x: number;
    y: number;
  };
  layoutId: string;
};

export type RoomState = {
  skinId: string;
  furniture: FurniturePlacement[];
};

export const createInitialRoomState = (skinId: string): RoomState => ({
  skinId,
  furniture: [],
});
