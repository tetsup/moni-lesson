import { describe, expect, it } from 'vitest';
import {
  changeRoomSkin,
  moveFurniture,
  placeFurniture,
  removeFurniture,
  rotateFurniture,
  setFurnitureFacing,
  setFurnitureHeight,
} from './room-operations';
import { createInitialRoomState, type FurniturePlacement } from './room-types';

const chair: FurniturePlacement = {
  placementId: 'placement-1',
  furnitureId: 'chair',
  x: 1,
  y: 2,
  z: 0,
  facing: 'front-left',
};

describe('room operations', () => {
  it('creates an empty room with the requested skin', () => {
    expect(createInitialRoomState('skin-a')).toEqual({ skinId: 'skin-a', furniture: [] });
  });

  it('places furniture without mutating the previous state', () => {
    const state = createInitialRoomState('skin-a');
    const next = placeFurniture(state, chair);
    expect(next.furniture).toEqual([chair]);
    expect(state.furniture).toEqual([]);
    expect(next).not.toBe(state);
  });

  it('ignores a duplicate placement ID', () => {
    const state = placeFurniture(createInitialRoomState('skin-a'), chair);
    expect(placeFurniture(state, { ...chair, furnitureId: 'table' })).toBe(state);
  });

  it('moves furniture freely and updates only its coordinates', () => {
    const state = placeFurniture(createInitialRoomState('skin-a'), chair);
    const next = moveFurniture(state, chair.placementId, { x: -10, y: 500, z: 7 });
    expect(next.furniture[0]).toEqual({ ...chair, x: -10, y: 500, z: 7 });
    expect(state.furniture[0]).toEqual(chair);
  });

  it('rotates between the two supported facings', () => {
    const state = placeFurniture(createInitialRoomState('skin-a'), chair);
    const rotated = rotateFurniture(state, chair.placementId);
    expect(rotated.furniture[0].facing).toBe('front-right');
    expect(rotateFurniture(rotated, chair.placementId).furniture[0].facing).toBe('front-left');
  });

  it('sets facing and height directly', () => {
    const state = placeFurniture(createInitialRoomState('skin-a'), chair);
    expect(setFurnitureFacing(state, chair.placementId, 'front-right').furniture[0].facing)
      .toBe('front-right');
    expect(setFurnitureHeight(state, chair.placementId, 12).furniture[0].z).toBe(12);
  });

  it('removes a placement without mutating the previous state', () => {
    const state = placeFurniture(createInitialRoomState('skin-a'), chair);
    const next = removeFurniture(state, chair.placementId);
    expect(next.furniture).toEqual([]);
    expect(state.furniture).toEqual([chair]);
  });

  it('leaves the state unchanged when an unknown placement ID is targeted', () => {
    const state = placeFurniture(createInitialRoomState('skin-a'), chair);
    expect(moveFurniture(state, 'missing', { x: 0, y: 0, z: 0 })).toBe(state);
    expect(rotateFurniture(state, 'missing')).toBe(state);
    expect(removeFurniture(state, 'missing')).toBe(state);
  });

  it('changes the skin without changing furniture placement', () => {
    const state = placeFurniture(createInitialRoomState('skin-a'), chair);
    const next = changeRoomSkin(state, 'skin-b');
    expect(next.skinId).toBe('skin-b');
    expect(next.furniture).toEqual(state.furniture);
  });

  it('returns the same state when the skin is unchanged', () => {
    const state = createInitialRoomState('skin-a');
    expect(changeRoomSkin(state, 'skin-a')).toBe(state);
  });
});
