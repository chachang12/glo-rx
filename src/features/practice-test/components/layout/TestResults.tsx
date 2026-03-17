import { AnswerState, Question, SelectionHistory, TestData, TimingData } from '@/types';
import React, { useMemo } from 'react';
import { cn, isCorrect } from '@/lib/utils';
import { getTypeColor, getTypeLabel } from '@/lib/utils';

interface TestResultProps {
  answers: AnswerState;
  testData: TestData;
  selectionHistory: SelectionHistory;
  timingData: TimingData;
  onRetake: () => void;
  onLoadNew: () => void;
}

export const TestResult: React.FC<TestResultProps> = ({
  answers,
  testData,
  selectionHistory,
  timingData,
  onRetake,
  onLoadNew,
}) => {
  const { correct, missed, skipped, byType, pct, secondGuessed, avgTime } = useMemo(() => {
    const missed: Question[] = [];
    const skipped: Question[] = [];
    let correct = 0;

    const byType: Record<string, { correct: number; total: number }> = {};

    for (const q of testData.questions) {
      const t = q.type;
      if (!byType[t]) byType[t] = { correct: 0, total: 0 };
      byType[t].total++;

      const selected = answers[q.id] ?? [];
      if (!selected.length) {
        skipped.push(q);
      } else if (isCorrect(q, selected)) {
        correct++;
        byType[t].correct++;
      } else {
        missed.push(q);
      }
    }

    const pct =
      testData.question_count > 0
        ? Math.round((correct / testData.question_count) * 100)
        : 0;

    // Questions where she had the correct answer at some point but changed away
    const secondGuessed = testData.questions.filter((q) => {
      const history = selectionHistory[q.id] ?? [];
      const everHadCorrect = history.some((snapshot) => isCorrect(q, snapshot));
      const endedCorrect = isCorrect(q, answers[q.id] ?? []);
      return everHadCorrect && !endedCorrect;
    });

    // Average time on incorrect questions in seconds
    const timings = Object.values(timingData).map(
      ({ started, submitted }) => Math.round((submitted - started) / 1000)
    );
    const avgTime = timings.length
      ? Math.round(timings.reduce((a, b) => a + b, 0) / timings.length)
      : null;

    return { correct, missed, skipped, byType, pct, secondGuessed, avgTime };
  }, [answers, testData, selectionHistory, timingData]);

  const passed = pct >= 67;
  const scoreColor = pct >= 80 ? '#10b981' : pct >= 67 ? '#f59e0b' : '#ef4444';

  return (
    <div className="min-h-screen bg-[#0d0d14] text-[#e8e6f0] px-6 py-12 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-[820px] mb-10">
        <p className="text-[11px] font-mono text-[#444] tracking-widest uppercase mb-2">
          {testData.title}
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-[#e8e6f0]">
          Test Results
        </h1>
      </div>

      {/* Score hero */}
      <div className="w-full max-w-[820px] bg-[#13131f] border border-[#1e1e2e] rounded-2xl p-8 mb-6 flex flex-col sm:flex-row items-center gap-8">
        <div
          className="flex flex-col items-center justify-center w-36 h-36 rounded-full border-4 shrink-0"
          style={{ borderColor: scoreColor }}
        >
          <span className="text-4xl font-bold leading-none" style={{ color: scoreColor }}>
            {pct}%
          </span>
          <span className="text-[11px] font-mono text-[#555] mt-1 tracking-widest uppercase">
            Score
          </span>
        </div>
        <div className="flex flex-1 flex-wrap gap-6 justify-center sm:justify-start">
          <Stat label="Correct" value={`${correct}/${testData.question_count}`} color="#10b981" />
          <Stat label="Missed" value={missed.length} color="#ef4444" />
          <Stat label="Skipped" value={skipped.length} color="#f59e0b" />
          <Stat
            label="Result"
            value={passed ? 'PASS' : 'FAIL'}
            color={passed ? '#10b981' : '#ef4444'}
          />
        </div>
      </div>

      {/* Test taking insights */}
      {(secondGuessed.length > 0 || avgTime !== null) && (
        <div className="w-full max-w-[820px] bg-[#13131f] border border-[#1e1e2e] rounded-2xl p-6 mb-6">
          <h2 className="text-[10px] font-mono text-[#444] tracking-widest uppercase mb-5">
            Test Taking Insights
          </h2>
          <div className="flex flex-col gap-3">
            {secondGuessed.length > 0 && (
              <div className="flex items-start gap-4 p-4 bg-[#0d0d14] rounded-xl border border-[#f59e0b33]">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="text-[14px] font-semibold text-[#f59e0b] mb-1">
                    Second-guessed {secondGuessed.length} question{secondGuessed.length > 1 ? 's' : ''}
                  </p>
                  <p className="text-[12px] text-[#666] leading-relaxed">
                    You selected the correct answer at some point but changed your response on{' '}
                    {secondGuessed.map((q) => `Q${q.id}`).join(', ')}. Trust your first instinct.
                  </p>
                </div>
              </div>
            )}
            {avgTime !== null && (
              <div className="flex items-start gap-4 p-4 bg-[#0d0d14] rounded-xl border border-[#1e1e2e]">
                <span className="text-2xl">⏱️</span>
                <div>
                  <p className="text-[14px] font-semibold text-[#e8e6f0] mb-1">
                    Avg {avgTime}s on missed questions
                  </p>
                  <p className="text-[12px] text-[#666] leading-relaxed">
                    {avgTime > 90
                      ? 'You spent a long time on questions you missed — consider moving on sooner when stuck.'
                      : avgTime < 20
                      ? 'You moved quickly through missed questions — slowing down may help.'
                      : 'Your pacing on missed questions looks reasonable.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* By question type */}
      <div className="w-full max-w-[820px] bg-[#13131f] border border-[#1e1e2e] rounded-2xl p-6 mb-6">
        <h2 className="text-[10px] font-mono text-[#444] tracking-widest uppercase mb-5">
          Performance by Type
        </h2>
        <div className="flex flex-col gap-3">
          {Object.entries(byType).map(([type, { correct, total }]) => {
            const typePct = Math.round((correct / total) * 100);
            const color = getTypeColor(type as Question['type']);
            return (
              <div key={type}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded border"
                      style={{
                        color,
                        borderColor: color + '55',
                        backgroundColor: color + '18',
                      }}
                    >
                      {getTypeLabel(type as Question['type'])}
                    </span>
                    <span className="text-[13px] text-[#666] font-mono">
                      {correct}/{total}
                    </span>
                  </div>
                  <span className="text-[13px] font-bold font-mono" style={{ color }}>
                    {typePct}%
                  </span>
                </div>
                <div className="h-1.5 bg-[#1e1e2e] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${typePct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Missed questions */}
      {missed.length > 0 && (
        <div className="w-full max-w-[820px] bg-[#13131f] border border-[#1e1e2e] rounded-2xl p-6 mb-6">
          <h2 className="text-[10px] font-mono text-[#444] tracking-widest uppercase mb-5">
            Missed Questions ({missed.length})
          </h2>
          <div className="flex flex-col gap-5">
            {missed.map((q) => {
              const selected = answers[q.id] ?? [];
              const color = getTypeColor(q.type);
              const timing = timingData[q.id];
              const timeSpent = timing
                ? Math.round((timing.submitted - timing.started) / 1000)
                : null;
              const wasSecondGuessed = secondGuessed.some((sg) => sg.id === q.id);

              return (
                <div
                  key={q.id}
                  className={cn(
                    "border rounded-xl p-5 bg-[#0d0d14]",
                    wasSecondGuessed ? "border-[#f59e0b55]" : "border-[#1e1e2e]"
                  )}
                >
                  {/* Question header */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="text-[11px] font-mono font-bold text-[#555]">
                      Q{q.id}
                    </span>
                    <span
                      className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded border"
                      style={{
                        color,
                        borderColor: color + '55',
                        backgroundColor: color + '18',
                      }}
                    >
                      {getTypeLabel(q.type)}
                    </span>
                    {wasSecondGuessed && (
                      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded border border-[#f59e0b55] bg-[#f59e0b18] text-[#f59e0b]">
                        ⚠️ Second-guessed
                      </span>
                    )}
                    {timeSpent !== null && (
                      <span className="text-[11px] font-mono text-[#555] ml-auto">
                        ⏱ {timeSpent}s
                      </span>
                    )}
                  </div>

                  {/* Stem */}
                  <p className="text-[14px] leading-relaxed text-[#ccc] mb-4">{q.stem}</p>

                  {/* Your answer vs correct */}
                  <div className="flex flex-col gap-2 mb-4">
                    <div className="flex items-start gap-2">
                      <span className="text-[11px] font-mono text-[#ef4444] shrink-0 mt-0.5">
                        YOUR ANSWER
                      </span>
                      <span className="text-[13px] text-[#ef4444]">
                        {selected.length
                          ? selected.map((k) => `${k}: ${q.options[k]}`).join(', ')
                          : 'No answer selected'}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-[11px] font-mono text-[#10b981] shrink-0 mt-0.5">
                        CORRECT
                      </span>
                      <span className="text-[13px] text-[#10b981]">
                        {q.answer.map((k) => `${k}: ${q.options[k]}`).join(', ')}
                      </span>
                    </div>
                  </div>

                  {/* Rationale */}
                  {'rationale' in q && (
                    <div className="border-t border-[#1e1e2e] pt-3 mt-3">
                      <p className="text-[10px] font-mono text-[#444] tracking-widest uppercase mb-1.5">
                        Rationale
                      </p>
                      <p className="text-[13px] text-[#888] leading-relaxed">
                        {(q as Question & { rationale: string }).rationale}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Skipped questions */}
      {skipped.length > 0 && (
        <div className="w-full max-w-[820px] bg-[#13131f] border border-[#1e1e2e] rounded-2xl p-6 mb-6">
          <h2 className="text-[10px] font-mono text-[#444] tracking-widest uppercase mb-3">
            Skipped Questions ({skipped.length})
          </h2>
          <div className="flex flex-col gap-2">
            {skipped.map((q) => (
              <div
                key={q.id}
                className="flex items-center gap-3 px-4 py-3 bg-[#0d0d14] border border-[#1e1e2e] rounded-lg"
              >
                <span className="text-[11px] font-mono font-bold text-[#555]">Q{q.id}</span>
                <span className="text-[13px] text-[#666] truncate">{q.stem}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="w-full max-w-[820px] flex gap-3">
        <button
          onClick={onRetake}
          className="flex-1 bg-[#4f8ef7] text-white font-semibold text-[14px] py-3 rounded-xl transition-opacity hover:opacity-90"
        >
          Retake Test
        </button>
        <button
          onClick={onLoadNew}
          className="flex-1 bg-transparent border border-[#2a2a3a] text-[#888] font-semibold text-[14px] py-3 rounded-xl transition-colors hover:border-[#4f8ef7] hover:text-[#e8e6f0]"
        >
          Load New Test
        </button>
      </div>
    </div>
  );
};

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-2xl font-bold leading-none" style={{ color }}>
        {value}
      </span>
      <span className="text-[10px] font-mono text-[#555] tracking-widest uppercase">
        {label}
      </span>
    </div>
  );
}