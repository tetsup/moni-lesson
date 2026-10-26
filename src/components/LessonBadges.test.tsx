import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ExerciseBadges, SongBadges } from './LessonBadges';

describe('ExerciseBadges rendered DOM', () => {
  const exercise = {
    pointsPerCompletion: 2,
    targetCount: 5,
    goalBonusPoints: 10,
    repeatAllowed: true,
  };

  it('shows points, target, bonus, and repeat badges', () => {
    const html = renderToStaticMarkup(<ExerciseBadges exercise={exercise} />);

    expect(html).toContain('1回 +2pt');
    expect(html).toContain('目標 5回');
    expect(html).toContain('ボーナス +10pt');
    expect(html).toContain('リピート');
    expect(html).toContain('aria-label="繰り返しあり"');
  });

  it('always shows target but hides zero-point and disabled-repeat badges', () => {
    const html = renderToStaticMarkup(
      <ExerciseBadges
        exercise={{
          pointsPerCompletion: 0,
          targetCount: 3,
          goalBonusPoints: 0,
          repeatAllowed: false,
        }}
      />,
    );

    expect(html).toContain('目標 3回');
    expect(html).not.toContain('1回のポイント');
    expect(html).not.toContain('達成ボーナス');
    expect(html).not.toContain('リピート');
  });
});

describe('SongBadges rendered DOM', () => {
  it('shows exercise count and positive song bonus', () => {
    const html = renderToStaticMarkup(
      <SongBadges
        song={{
          exercises: [{}, {}, {}],
          allGoalsBonusPoints: 20,
        } as never}
      />,
    );

    expect(html).toContain('お題 3');
    expect(html).toContain('ボーナス +20pt');
  });

  it('hides a zero-point song bonus but keeps exercise count', () => {
    const html = renderToStaticMarkup(
      <SongBadges song={{ exercises: [{}], allGoalsBonusPoints: 0 } as never} />,
    );

    expect(html).toContain('お題 1');
    expect(html).not.toContain('曲のボーナスポイント');
  });
});
