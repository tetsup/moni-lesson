import type { FurnitureFacing, FurniturePlacement, RoomState } from './room-types';

export const ROOM_STORAGE_KEY = 'moni-lesson-room';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFacing = (value: unknown): value is FurnitureFacing =>
  value === 'front-left' || value === 'front-right';

const isPlacement = (value: unknown): value is FurniturePlacement =>
  isRecord(value)
  && typeof value.placementId === 'string'
  && typeof value.furnitureId === 'string'
  && typeof value.x === 'number' && Number.isFinite(value.x)
  && typeof value.y === 'number' && Number.isFinite(value.y)
  && typeof value.z === 'number' && Number.isFinite(value.z)
  && isFacing(value.facing);

export const serializeRoomState = (state: RoomState): string =>
  JSON.stringify(state);

export const parseRoomState = (serialized: string): RoomState | null => {
  try {
    const value: unknown = JSON.parse(serialized);
    if (!isRecord(value) || typeof value.skinId !== 'string' || !Array.isArray(value.furniture)) {
      return null;
    }
    if (!value.furniture.every(isPlacement)) return null;

    const furniture = value.furniture as FurniturePlacement[];
    const ids = furniture.map((placement) => placement.placementId);
    if (new Set(ids).size !== ids.length) return null;

    return {
      skinId: value.skinId,
      furniture: furniture.map((placement) => ({ ...placement })),
    };
  } catch {
    return null;
  }
};

/** Storage access is injected so this module can be tested without a browser. */
export type RoomStorage = Pick<Storage, 'getItem' | 'setItem'>;

export const saveRoomState = (storage: RoomStorage, state: RoomState): void => {
  storage.setItem(ROOM_STORAGE_KEY, serializeRoomState(state));
};

export const loadRoomState = (storage: RoomStorage): RoomState | null => {
  const serialized = storage.getItem(ROOM_STORAGE_KEY);
  return serialized === null ? null : parseRoomState(serialized);
};
