import { useEffect, useRef, useState } from "react";
import { Button, Card, CardContent, Stack, Typography } from "@mui/material";
import FiberManualRecordRoundedIcon from "@mui/icons-material/FiberManualRecordRounded";
import StopRoundedIcon from "@mui/icons-material/StopRounded";
import {
  getRecordingsDirectory,
  nextRecordingAttemptNumber,
  saveLessonRecording,
  type LessonRecording,
} from "../data/lesson-recordings";

const MAX_RECORDING_MS = 5 * 60 * 1000;

type WritableFile = {
  write: (data: Blob | BufferSource | string) => Promise<void>;
  close: () => Promise<void>;
  abort?: () => Promise<void>;
};

type FileHandleWithWritable = FileSystemFileHandle & {
  createWritable: () => Promise<WritableFile>;
};

type DirectoryWithMove = FileSystemDirectoryHandle & {
  getFileHandle: (
    name: string,
    options?: { create?: boolean },
  ) => Promise<FileHandleWithWritable>;
  removeEntry: (name: string) => Promise<void>;
};

type Props = {
  songId: string;
  songTitle: string;
  topicId: string;
  topicTitle: string;
  stopSignal: number;
};

type ActiveRecording = {
  id: string;
  recordedAt: string;
  attemptNumber: number;
  mimeType: string;
  tempName: string;
  finalName: string;
  directory: DirectoryWithMove;
  writable: WritableFile;
  recorder: MediaRecorder;
  writeQueue: Promise<void>;
  startedAt: number;
  timer: number;
  songId: string;
  songTitle: string;
  topicId: string;
  topicTitle: string;
};

const getSupportedMimeType = (): string => {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
};

export default function LessonRecordingControls({
  songId,
  songTitle,
  topicId,
  topicTitle,
  stopSignal,
}: Props) {
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const activeRef = useRef<ActiveRecording | null>(null);
  const finalizingRef = useRef(false);
  const previousStopSignal = useRef(stopSignal);

  const stopRecording = async () => {
    const recording = activeRef.current;
    if (!recording || finalizingRef.current) return;
    finalizingRef.current = true;
    window.clearTimeout(recording.timer);
    setBusy(true);
    try {
      if (recording.recorder.state !== "inactive") {
        await new Promise<void>((resolve) => {
          recording.recorder.addEventListener("stop", () => resolve(), {
            once: true,
          });
          recording.recorder.stop();
        });
      }
      await recording.writeQueue;
      await recording.writable.close();

      // Promote the temporary OPFS file only after MediaRecorder has fully stopped.
      const tempHandle = await recording.directory.getFileHandle(
        recording.tempName,
      );
      const tempFile = await tempHandle.getFile();
      const finalHandle = await recording.directory.getFileHandle(
        recording.finalName,
        { create: true },
      );
      const finalWritable = await finalHandle.createWritable();
      await tempFile.stream().pipeTo(
        new WritableStream({
          write: (chunk) => finalWritable.write(chunk),
          close: () => finalWritable.close(),
          abort: () => finalWritable.abort?.(),
        }),
      );
      await recording.directory.removeEntry(recording.tempName);

      const metadata: LessonRecording = {
        id: recording.id,
        filePath: `${"recordings"}/${recording.finalName}`,
        recordedAt: recording.recordedAt,
        songId: recording.songId,
        songTitle: recording.songTitle,
        topicId: recording.topicId,
        topicTitle: recording.topicTitle,
        attemptNumber: recording.attemptNumber,
        durationMs: Math.max(0, Date.now() - recording.startedAt),
        mimeType: recording.mimeType,
        fileSize: tempFile.size,
      };
      await saveLessonRecording(metadata);
      setMessage("録音を保存したよ！");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "録音を保存できませんでした",
      );
    } finally {
      activeRef.current = null;
      finalizingRef.current = false;
      setActive(false);
      setBusy(false);
    }
  };

  const startRecording = async () => {
    if (activeRef.current || finalizingRef.current) return;
    setMessage("");
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setMessage("このブラウザでは録音できません");
      return;
    }
    setBusy(true);
    let writable: WritableFile | null = null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      const directory = (await getRecordingsDirectory()) as DirectoryWithMove;
      const id = crypto.randomUUID();
      const tempName = `${id}.tmp`;
      const extension = recorder.mimeType.includes("mp4") ? "m4a" : "webm";
      const finalName = `${id}.${extension}`;
      const tempHandle = await directory.getFileHandle(tempName, {
        create: true,
      });
      writable = await tempHandle.createWritable();
      const attemptNumber = await nextRecordingAttemptNumber(songId, topicId);
      const recordedAt = new Date().toISOString();
      const startedAt = Date.now();
      const activeRecording: ActiveRecording = {
        id,
        recordedAt,
        attemptNumber,
        mimeType: recorder.mimeType || "audio/webm",
        tempName,
        finalName,
        directory,
        writable,
        recorder,
        writeQueue: Promise.resolve(),
        startedAt,
        timer: 0,
        songId,
        songTitle,
        topicId,
        topicTitle,
      };
      recorder.addEventListener("dataavailable", (event: BlobEvent) => {
        if (event.data.size > 0) {
          activeRecording.writeQueue = activeRecording.writeQueue.then(() =>
            writable!.write(event.data),
          );
        }
      });
      recorder.addEventListener(
        "stop",
        () => stream.getTracks().forEach((track) => track.stop()),
        { once: true },
      );
      recorder.start(1000);
      activeRecording.timer = window.setTimeout(() => {
        void stopRecording();
      }, MAX_RECORDING_MS);
      activeRef.current = activeRecording;
      setActive(true);
      setMessage("録音中（最大5分）");
    } catch (error) {
      await writable?.abort?.().catch(() => undefined);
      setMessage(
        error instanceof Error ? error.message : "録音を開始できませんでした",
      );
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (previousStopSignal.current !== stopSignal) {
      previousStopSignal.current = stopSignal;
      void stopRecording();
    }
  }, [stopSignal]);

  useEffect(
    () => () => {
      // Leaving the lesson screen must finalize the recording, not discard its temporary file.
      void stopRecording();
    },
    [],
  );

  return (
    <Card
      sx={{ borderRadius: 3, border: "1px solid #eadcf1", bgcolor: "#fff" }}
    >
      <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Stack spacing={0.5} alignItems="stretch" sx={{ minWidth: 0, flex: 1 }}>
          <Button
            fullWidth
            variant={active ? "contained" : "outlined"}
            color={active ? "error" : "secondary"}
            disabled={busy}
            startIcon={
              active ? <StopRoundedIcon /> : <FiberManualRecordRoundedIcon />
            }
            onClick={() => {
              if (active) void stopRecording();
              else void startRecording();
            }}
            sx={{
              minHeight: 42,
              borderRadius: 2,
              fontWeight: 900,
              whiteSpace: "nowrap",
            }}
          >
            {busy ? "保存中…" : active ? "録音停止" : "録音"}
          </Button>
          {message && (
            <Typography
              variant="caption"
              color={
                message.includes("できません") ? "error" : "text.secondary"
              }
            >
              {message}
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
