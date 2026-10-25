import { describe, expect, it } from 'vitest';
import { calculateSimilarity, calculateSpectrumAutocorrelation } from './spectrum-analysis';

const tone = (frequency: number, amplitude = 0.5, sampleRate = 16000, length = 8192) =>
  Float32Array.from({ length }, (_, i) => amplitude * Math.sin(2 * Math.PI * frequency * i / sampleRate));

describe('calculateSpectrumAutocorrelation', () => {
  it('returns null when raw energy is at or below the threshold, before normalization', () => {
    expect(calculateSpectrumAutocorrelation(tone(440, 0.001), 16000)).toBeNull();
  });

  it('returns a finite feature vector for a sufficiently energetic tone', () => {
    const result = calculateSpectrumAutocorrelation(tone(440), 16000);
    expect(result).not.toBeNull();
    expect(result?.[0]).toBeCloseTo(1);
    expect(Array.from(result ?? []).every(Number.isFinite)).toBe(true);
  });

  it('returns null for empty or invalid input', () => {
    expect(calculateSpectrumAutocorrelation(new Float32Array(), 16000)).toBeNull();
    expect(calculateSpectrumAutocorrelation(tone(440), 0)).toBeNull();
  });
});

describe('calculateSimilarity', () => {
  it('returns zero if feature or model is null', () => {
    expect(calculateSimilarity(null, new Float32Array([1, 0]))).toBe(0);
    expect(calculateSimilarity(new Float32Array([1, 0]), null)).toBe(0);
  });

  it('scores identical and orthogonal vectors', () => {
    expect(calculateSimilarity(new Float32Array([1, 0]), new Float32Array([1, 0]))).toBeCloseTo(1);
    expect(calculateSimilarity(new Float32Array([1, 0]), new Float32Array([0, 1]))).toBe(0);
  });

  it('returns zero for mismatched vector lengths', () => {
    expect(calculateSimilarity(new Float32Array([1]), new Float32Array([1, 0]))).toBe(0);
  });
});
