import { Box, Chip } from '@mui/material';
import type { LessonExercise, LessonSong } from '../data/lesson-session';

type ExerciseBadgeValues = Pick<
  LessonExercise,
  'pointsPerCompletion' | 'targetCount' | 'goalBonusPoints' | 'repeatAllowed'
>;

type SongBadgeValues = Pick<LessonSong, 'exercises' | 'allGoalsBonusPoints'>;

const badgeSx = {
  fontWeight: 800,
  '& .MuiChip-label': { px: 0.8 },
};

type BadgeRowProps = {
  children: React.ReactNode;
  'aria-label': string;
};

function BadgeRow({ children, 'aria-label': ariaLabel }: BadgeRowProps) {
  return (
    <Box
      aria-label={ariaLabel}
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 0.5,
        minWidth: 0,
      }}
    >
      {children}
    </Box>
  );
}

export function ExerciseBadges({ exercise }: { exercise: ExerciseBadgeValues }) {
  return (
    <BadgeRow aria-label="お題の設定">
      {exercise.pointsPerCompletion > 0 && (
        <Chip
          size="small"
          label={`1回 +${exercise.pointsPerCompletion}pt`}
          aria-label={`1回のポイント ${exercise.pointsPerCompletion}ポイント`}
          sx={{ ...badgeSx, bgcolor: '#eee5f5', color: '#80509a' }}
        />
      )}
      <Chip
        size="small"
        label={`目標 ${exercise.targetCount}回`}
        aria-label={`目標回数 ${exercise.targetCount}回`}
        sx={{ ...badgeSx, bgcolor: '#f3eaf8', color: '#80509a' }}
      />
      {exercise.goalBonusPoints > 0 && (
        <Chip
          size="small"
          label={`ボーナス +${exercise.goalBonusPoints}pt`}
          aria-label={`達成ボーナス ${exercise.goalBonusPoints}ポイント`}
          sx={{ ...badgeSx, bgcolor: '#fff0bd', color: '#8a6412', '& .MuiChip-icon': { color: '#d99a13' } }}
        />
      )}
      {exercise.repeatAllowed && (
        <Chip
          size="small"
          label="リピート"
          aria-label="繰り返しあり"
          sx={{ ...badgeSx, bgcolor: '#e5f4ed', color: '#286b50' }}
        />
      )}
    </BadgeRow>
  );
}

export function SongBadges({ song }: { song: SongBadgeValues }) {
  return (
    <BadgeRow aria-label="曲の設定">
      <Chip
        size="small"
        label={`お題 ${song.exercises.length}`}
        aria-label={`お題の数 ${song.exercises.length}件`}
        sx={{ ...badgeSx, bgcolor: '#eee5f5', color: '#80509a' }}
      />
      {song.allGoalsBonusPoints > 0 && (
        <Chip
          size="small"
          label={`ボーナス +${song.allGoalsBonusPoints}pt`}
          aria-label={`曲のボーナスポイント ${song.allGoalsBonusPoints}ポイント`}
          sx={{ ...badgeSx, bgcolor: '#fff0bd', color: '#8a6412' }}
        />
      )}
    </BadgeRow>
  );
}
