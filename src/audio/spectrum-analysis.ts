export type SpectrumAnalysisOptions = {
  energyThreshold?: number;
  minFrequency?: number;
  maxFrequency?: number;
  logBinCount?: number;
  autocorrelationLength?: number;
};

/** RMS gate is evaluated on the raw window, before any normalization. */
export function calculateSpectrumAutocorrelation(
  samples: Float32Array,
  sampleRate: number,
  options: SpectrumAnalysisOptions = {},
): Float32Array | null {
  const threshold = options.energyThreshold ?? 0.008;
  const bins = options.logBinCount ?? 256;
  const length = options.autocorrelationLength ?? 64;
  const minFrequency = options.minFrequency ?? 80;
  const maxFrequency = Math.min(options.maxFrequency ?? 4000, sampleRate / 2);
  if (samples.length < 2 || sampleRate <= 0 || bins < 2 || length < 1 ||
      minFrequency <= 0 || maxFrequency <= minFrequency) return null;

  let energy = 0;
  for (const sample of samples) energy += sample * sample;
  const rms = Math.sqrt(energy / samples.length);
  if (!Number.isFinite(rms) || rms <= threshold) return null;

  const size = nextPowerOfTwo(samples.length);
  const real = new Float64Array(size);
  const imag = new Float64Array(size);
  for (let i = 0; i < samples.length; i++) {
    const window = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (samples.length - 1));
    real[i] = samples[i] * window;
  }
  fft(real, imag);

  const spectrum = new Float64Array(bins);
  const logMin = Math.log(minFrequency);
  const logMax = Math.log(maxFrequency);
  for (let i = 0; i < bins; i++) {
    const hz = Math.exp(logMin + (logMax - logMin) * i / (bins - 1));
    const position = hz * size / sampleRate;
    const lo = Math.floor(position);
    const hi = Math.min(lo + 1, size / 2);
    if (lo < 0 || lo > size / 2) continue;
    const fraction = position - lo;
    const a = Math.hypot(real[lo], imag[lo]);
    const b = Math.hypot(real[hi], imag[hi]);
    spectrum[i] = a * (1 - fraction) + b * fraction;
  }

  // Normalize the log-frequency spectrum only after the energy gate.
  const mean = spectrum.reduce((sum, value) => sum + value, 0) / bins;
  let norm = 0;
  for (let i = 0; i < bins; i++) {
    spectrum[i] -= mean;
    norm += spectrum[i] * spectrum[i];
  }
  norm = Math.sqrt(norm);
  if (norm <= Number.EPSILON) return null;
  for (let i = 0; i < bins; i++) spectrum[i] /= norm;

  const result = new Float32Array(length);
  for (let lag = 0; lag < length; lag++) {
    let sum = 0;
    for (let i = 0; i < bins - lag; i++) sum += spectrum[i] * spectrum[i + lag];
    result[lag] = sum / (bins - lag);
  }
  if (result[0] > Number.EPSILON) {
    const zeroLag = result[0];
    for (let i = 0; i < result.length; i++) result[i] /= zeroLag;
  }
  return result;
}

/** Cosine similarity; null/invalid input is treated as no match. */
export function calculateSimilarity(
  features: Float32Array | null,
  model: Float32Array | null,
): number {
  if (!features || !model || features.length === 0 || features.length !== model.length) return 0;
  let dot = 0, featureNorm = 0, modelNorm = 0;
  for (let i = 0; i < features.length; i++) {
    const a = features[i], b = model[i];
    if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
    dot += a * b;
    featureNorm += a * a;
    modelNorm += b * b;
  }
  if (featureNorm <= Number.EPSILON || modelNorm <= Number.EPSILON) return 0;
  return Math.max(0, Math.min(1, dot / Math.sqrt(featureNorm * modelNorm)));
}

function nextPowerOfTwo(value: number): number {
  let size = 1;
  while (size < value) size <<= 1;
  return size;
}

function fft(real: Float64Array, imag: Float64Array): void {
  const n = real.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; (j & bit) !== 0; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }
  for (let width = 2; width <= n; width <<= 1) {
    const angle = -2 * Math.PI / width;
    const stepR = Math.cos(angle), stepI = Math.sin(angle);
    for (let start = 0; start < n; start += width) {
      let wr = 1, wi = 0;
      for (let j = 0; j < width / 2; j++) {
        const even = start + j, odd = even + width / 2;
        const tr = wr * real[odd] - wi * imag[odd];
        const ti = wr * imag[odd] + wi * real[odd];
        real[odd] = real[even] - tr;
        imag[odd] = imag[even] - ti;
        real[even] += tr;
        imag[even] += ti;
        const nextWr = wr * stepR - wi * stepI;
        wi = wr * stepI + wi * stepR;
        wr = nextWr;
      }
    }
  }
}
