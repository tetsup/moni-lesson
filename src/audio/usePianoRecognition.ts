import { useEffect, useState } from 'react';
import {
  calculateSimilarity,
  calculateSpectrumAutocorrelation,
  type SpectrumAnalysisOptions,
} from './spectrum-analysis';

export type PianoRecognitionState = {
  isRecording: boolean;
  similarity: number;
  isRecognized: boolean;
  error: Error | null;
};

export type PianoRecognitionOptions = SpectrumAnalysisOptions & {
  enabled: boolean;
  model: Float32Array | null;
  similarityThreshold?: number;
  intervalMs?: number;
};

export function usePianoRecognition({
  enabled,
  model,
  similarityThreshold = 0.72,
  intervalMs = 250,
  ...analysisOptions
}: PianoRecognitionOptions): PianoRecognitionState {
  const [state, setState] = useState<PianoRecognitionState>({
    isRecording: false,
    similarity: 0,
    isRecognized: false,
    error: null,
  });

  useEffect(() => {
    if (!enabled) {
      setState({ isRecording: false, similarity: 0, isRecognized: false, error: null });
      return;
    }

    let disposed = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    let stream: MediaStream | undefined;
    let audioContext: AudioContext | undefined;
    let source: MediaStreamAudioSourceNode | undefined;
    let analyser: AnalyserNode | undefined;
    let samples: Float32Array | undefined;

    const stop = () => {
      if (timer) clearInterval(timer);
      source?.disconnect();
      analyser?.disconnect();
      stream?.getTracks().forEach((track) => track.stop());
      if (audioContext && audioContext.state !== 'closed') void audioContext.close();
    };

    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('このブラウザーではマイク録音を利用できません。');
        }
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        audioContext = new AudioContext();
        await audioContext.resume();
        source = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 8192;
        analyser.smoothingTimeConstant = 0;
        source.connect(analyser);
        samples = new Float32Array(analyser.fftSize);
        setState({ isRecording: true, similarity: 0, isRecognized: false, error: null });

        timer = setInterval(() => {
          if (!analyser || !audioContext || !samples) return;
          analyser.getFloatTimeDomainData(samples);
          const features = calculateSpectrumAutocorrelation(
            samples,
            audioContext.sampleRate,
            analysisOptions,
          );
          const similarity = calculateSimilarity(features, model);
          setState({
            isRecording: true,
            similarity,
            isRecognized: features !== null && similarity >= similarityThreshold,
            error: null,
          });
        }, Math.max(100, intervalMs));
      } catch (cause) {
        stop();
        if (!disposed) {
          const error = cause instanceof Error ? cause : new Error(String(cause));
          setState({ isRecording: false, similarity: 0, isRecognized: false, error });
        }
      }
    };

    void start();
    return () => {
      disposed = true;
      stop();
    };
  }, [
    enabled,
    model,
    similarityThreshold,
    intervalMs,
    analysisOptions.energyThreshold,
    analysisOptions.minFrequency,
    analysisOptions.maxFrequency,
    analysisOptions.logBinCount,
    analysisOptions.autocorrelationLength,
  ]);

  return state;
}
