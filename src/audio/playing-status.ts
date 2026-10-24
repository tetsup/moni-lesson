export type PlayingStatusOptions = {
  windowSize?: number;
  startThreshold?: number;
  stopThreshold?: number;
};

/**
 * Smooths similarity scores and applies hysteresis to determine playing status.
 * Every score, including zero for quiet frames, enters the rolling window.
 */
export class PlayingStatusDetector {
  private readonly scores: number[] = [];
  private playing = false;
  private readonly windowSize: number;
  private readonly startThreshold: number;
  private readonly stopThreshold: number;

  constructor(options: PlayingStatusOptions = {}) {
    this.windowSize = Math.max(1, Math.floor(options.windowSize ?? 5));
    this.startThreshold = options.startThreshold ?? 0.5;
    this.stopThreshold = options.stopThreshold ?? 0.3;
    if (this.stopThreshold > this.startThreshold) {
      throw new Error('stopThreshold must be less than or equal to startThreshold');
    }
  }

  update(score: number): { average: number; isPlaying: boolean } {
    const safeScore = Number.isFinite(score) ? Math.max(0, Math.min(1, score)) : 0;
    this.scores.push(safeScore);
    if (this.scores.length > this.windowSize) this.scores.shift();

    const average = this.scores.reduce((sum, value) => sum + value, 0) / this.scores.length;
    if (!this.playing && average >= this.startThreshold) this.playing = true;
    else if (this.playing && average < this.stopThreshold) this.playing = false;

    return { average, isPlaying: this.playing };
  }

  reset(): void {
    this.scores.length = 0;
    this.playing = false;
  }
}
