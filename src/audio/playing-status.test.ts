import { describe, expect, it } from 'vitest';
import { PlayingStatusDetector } from './playing-status';
import { calculateSimilarity, calculateSpectrumAutocorrelation } from './spectrum-analysis';

describe('PlayingStatusDetector', () => {
  it('uses a rolling average of up to five scores', () => {
    const detector = new PlayingStatusDetector();
    expect(detector.update(1).average).toBeCloseTo(1);
    expect(detector.update(0).average).toBeCloseTo(0.5);
    expect(detector.update(0).average).toBeCloseTo(1 / 3);
    expect(detector.update(0).average).toBeCloseTo(0.25);
    expect(detector.update(0).average).toBeCloseTo(0.2);
    expect(detector.update(1).average).toBeCloseTo(0.2);
  });

  it('turns on at 0.5 and retains state between thresholds', () => {
    const detector = new PlayingStatusDetector();
    expect(detector.update(0.5).isPlaying).toBe(true);
    expect(detector.update(0.3).isPlaying).toBe(true);
    expect(detector.update(0.4).isPlaying).toBe(true);
  });

  it('turns off only when average falls below 0.3', () => {
    const detector = new PlayingStatusDetector();
    detector.update(1);
    detector.update(1);
    detector.update(1);
    detector.update(1);
    expect(detector.update(1).isPlaying).toBe(true);
    expect(detector.update(0).isPlaying).toBe(true);
    expect(detector.update(0).isPlaying).toBe(true);
    expect(detector.update(0).isPlaying).toBe(false);
  });

  it('includes quiet frames (zero scores) and resets its state', () => {
    const detector = new PlayingStatusDetector();
    detector.update(1);
    detector.update(1);
    detector.update(1);
    detector.update(1);
    detector.update(1);
    expect(detector.update(0).isPlaying).toBe(true);
    expect(detector.update(0).isPlaying).toBe(true);
    expect(detector.update(0).isPlaying).toBe(false);
    detector.reset();
    expect(detector.update(0.5)).toEqual({ average: 0.5, isPlaying: true });
  });

  it('treats non-finite scores as zero and clamps scores to [0, 1]', () => {
    const detector = new PlayingStatusDetector({ windowSize: 2 });
    expect(detector.update(2).average).toBe(1);
    expect(detector.update(Number.NaN).average).toBe(0.5);
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
    expect(detector.update(score).isPlaying).toBe(true);

    const quietFeature = calculateSpectrumAutocorrelation(tone(440, 0.001), 16000);
    const quietScore = calculateSimilarity(quietFeature, model);
    expect(quietScore).toBe(0);
    detector.update(quietScore);
    detector.update(quietScore);
    detector.update(quietScore);
    expect(detector.update(quietScore).isPlaying).toBe(false);
  });
});
