import { describe, expect, it } from 'vitest';
import { PlayingStatusDetector } from './playing-status';
import { calculateSimilarity, calculateSpectrumAutocorrelation } from './spectrum-analysis';

const AVERAGE_WINDOW_SIZE = 5;
const START_THRESHOLD = 0.5;
const STOP_THRESHOLD = 0.3;
const update = (detector: PlayingStatusDetector, score: number) =>
  detector.update(score, AVERAGE_WINDOW_SIZE, START_THRESHOLD, STOP_THRESHOLD);

describe('PlayingStatusDetector', () => {
  it('uses a rolling average of up to five scores', () => {
    const detector = new PlayingStatusDetector();
    expect(update(detector, 1).average).toBeCloseTo(1);
    expect(update(detector, 0).average).toBeCloseTo(0.5);
    expect(update(detector, 0).average).toBeCloseTo(1 / 3);
    expect(update(detector, 0).average).toBeCloseTo(0.25);
    expect(update(detector, 0).average).toBeCloseTo(0.2);
    expect(update(detector, 1).average).toBeCloseTo(0.2);
  });

  it('turns on at 0.5 and retains state between thresholds', () => {
    const detector = new PlayingStatusDetector();
    expect(update(detector, 0.5).isPlaying).toBe(true);
    expect(update(detector, 0.3).isPlaying).toBe(true);
    expect(update(detector, 0.4).isPlaying).toBe(true);
  });

  it('turns off only when average falls below 0.3', () => {
    const detector = new PlayingStatusDetector();
    update(detector, 1);
    update(detector, 1);
    update(detector, 1);
    update(detector, 1);
    expect(update(detector, 1).isPlaying).toBe(true);
    expect(update(detector, 0).isPlaying).toBe(true); // average 0.8
    expect(update(detector, 0).isPlaying).toBe(true); // average 0.6
    expect(update(detector, 0).isPlaying).toBe(true); // average 0.4
    expect(update(detector, 0).isPlaying).toBe(false); // average 0.2
    expect(update(detector, 0).isPlaying).toBe(false); // average 0
  });

  it('includes quiet frames (zero scores) and resets its state', () => {
    const detector = new PlayingStatusDetector();
    update(detector, 1);
    update(detector, 1);
    update(detector, 1);
    update(detector, 1);
    update(detector, 1);
    expect(update(detector, 0).isPlaying).toBe(true); // 1 quiet frame: 0.8
    expect(update(detector, 0).isPlaying).toBe(true); // 2 quiet frames: 0.6
    expect(update(detector, 0).isPlaying).toBe(true); // 3 quiet frames: 0.4
    expect(update(detector, 0).isPlaying).toBe(false); // 4 quiet frames: 0.2
    expect(update(detector, 0).isPlaying).toBe(false); // 5 quiet frames: 0
    detector.reset();
    expect(update(detector, 0.5)).toEqual({ average: 0.5, isPlaying: true });
  });

  it('treats non-finite scores as zero and clamps scores to [0, 1]', () => {
    const detector = new PlayingStatusDetector();
    expect(update(detector, 2).average).toBe(1);
    expect(detector.update(2, 2, START_THRESHOLD, STOP_THRESHOLD).average).toBe(1);
    expect(detector.update(Number.NaN, 2, START_THRESHOLD, STOP_THRESHOLD).average).toBe(0.5);
  });
});

describe('audio analysis to playing status flow', () => {
  const tone = (frequency: number, amplitude = 0.5, sampleRate = 16000, length = 8192) =>
    Float32Array.from({ length }, (_, i) => amplitude * Math.sin(2 * Math.PI * frequency * i / sampleRate));

  it('converts feature similarity into a smoothed playing state and quiet audio clears it', () => {
    const model = calculateSpectrumAutocorrelation(tone(440), 16000);
    expect(model).not.toBeNull();
    const detector = new PlayingStatusDetector();

    const feature = calculateSpectrumAutocorrelation(tone(440), 16000);
    const score = calculateSimilarity(feature, model);
    expect(score).toBeCloseTo(1);
    expect(update(detector, score).isPlaying).toBe(true);

    const quietFeature = calculateSpectrumAutocorrelation(tone(440, 0.001), 16000);
    const quietScore = calculateSimilarity(quietFeature, model);
    expect(quietScore).toBe(0);
    update(detector, quietScore);
    update(detector, quietScore);
    update(detector, quietScore);
    update(detector, quietScore);
    expect(update(detector, quietScore).isPlaying).toBe(false);
  });
});
