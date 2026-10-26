import { describe, expect, it } from 'vitest';
import {
  loadRoomState,
  parseRoomState,
  ROOM_STORAGE_KEY,
  saveRoomState,
  serializeRoomState,
} from './room-storage';
import { createInitialRoomState, type RoomState } from './room-types';

const sample: RoomState = {
  skinId: 'skin-a',
  furniture: [{
    placementId: 'p1',
    furnitureId: 'chair',
    x: 1.25,
    y: 2.5,
    z: 3,
    facing: 'front-right',
  }],
};

const memoryStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
};

describe('room storage', () => {
  it('serializes and parses room state', () => {
    expect(parseRoomState(serializeRoomState(sample))).toEqual(sample);
  });

  it('rejects invalid JSON and invalid state shapes', () => {
    expect(parseRoomState('{')).toBeNull();
    expect(parseRoomState(JSON.stringify({ skinId: 3, furniture: [] }))).toBeNull();
    expect(parseRoomState(JSON.stringify({
      skinId: 'skin-a',
      furniture: [{ placementId: 'p1', furnitureId: 'chair', x: NaN, y: 0, z: 0, facing: 'front-left' }],
    }))).toBeNull();
    expect(parseRoomState(JSON.stringify({
      skinId: 'skin-a',
      furniture: [
        { placementId: 'p1', furnitureId: 'chair', x: 0, y: 0, z: 0, facing: 'front-left' },
        { placementId: 'p1', furnitureId: 'chair', x: 1, y: 0, z: 0, facing: 'front-left' },
      ],
    }))).toBeNull();
  });

  it('saves and loads from an injected storage object', () => {
    const storage = memoryStorage();
    saveRoomState(storage, sample);
    expect(storage.getItem(ROOM_STORAGE_KEY)).toBe(serializeRoomState(sample));
    expect(loadRoomState(storage)).toEqual(sample);
  });

  it('returns null when there is no saved state', () => {
    expect(loadRoomState(memoryStorage())).toBeNull();
  });

  it('creates an empty initial state independently of browser storage', () => {
    expect(createInitialRoomState('skin-a')).toEqual({ skinId: 'skin-a', furniture: [] });
  });
});
