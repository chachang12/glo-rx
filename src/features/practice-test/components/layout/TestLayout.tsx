import { getTypeColor, getTypeLabel, isCorrect } from "@/lib/utils";
import { useCallback, useRef, useState } from "react";
import { QuestionCard } from "../ui/QuestionCard";
import { UploadScreen } from "@/features/upload/components/ui/UploadScreen";
import { AnswerState, RevealState, SelectionHistory, TestData, TimingData } from "@/types";
import { Test } from "@/app/routes/app/test";
import { TestSidebar } from "../ui/TestSidebar";
import { TestResult } from "./TestResults";

interface TestLayoutProps {
    initialData: TestData | null;
    initialCompleted?: boolean;
}

export const TestLayout: React.FC<TestLayoutProps> = ({ initialData, initialCompleted }) => {
  const [testData, setTestData] = useState<TestData | null>(initialData);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [revealed, setRevealed] = useState<RevealState>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(initialCompleted);
  const [selectionHistory, setSelectionHistory] = useState<SelectionHistory>({});
  const [timingData, setTimingData] = useState<TimingData>({});
  const questionStartTime = useRef<number>(Date.now());

  const handleLoad = useCallback((data: TestData) => {
    setTestData(data);
    setAnswers({});
    setRevealed({});
    setCurrentIndex(0);
  }, []);

  const handleSelect = useCallback((id: number, option: string) => {
    setAnswers((prev) => {
      const q = testData?.questions.find((q) => q.id === id);
      if (!q) return prev;
      const current = prev[id] ?? [];

      if (q.type === "sata") {
        const next = current.includes(option)
          ? current.filter((o) => o !== option)
          : [...current, option];
        setSelectionHistory((h) => ({ ...h, [id]: [...(h[id] ?? []), next] }));
        return { ...prev, [id]: next };
      }

      if (q.type === "ordered") {
        // toggle — if already in sequence remove it, otherwise append
        const next = current.includes(option)
          ? current.filter((o) => o !== option)
          : [...current, option];
        setSelectionHistory((h) => ({ ...h, [id]: [...(h[id] ?? []), next] }));
        return { ...prev, [id]: next };
      }

      // MCQ — single selection
      const next = [option];
      setSelectionHistory((h) => ({ ...h, [id]: [...(h[id] ?? []), next] }));
      return { ...prev, [id]: next };
    });
  }, [testData]);

  const handleSubmit = useCallback((id: number) => {
    setRevealed((prev) => ({ ...prev, [id]: true }));

    const q = testData?.questions.find((q) => q.id === id);
    if (!q) return;
    const finalAnswer = answers[id] ?? [];
    const incorrect = !isCorrect(q, finalAnswer);

    if (incorrect) {
      setTimingData((prev) => ({
        ...prev,
        [id]: { started: questionStartTime.current, submitted: Date.now() },
      }));
    }
  }, [testData, answers]);

  const handleNext = useCallback(() => {
    if (testData && currentIndex < testData.questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      questionStartTime.current = Date.now();
    }
  }, [testData, currentIndex]);

  const handleComplete = useCallback(() => {
    setIsCompleted(true);
  }, []);

  const handleReset = useCallback(() => {
    setTestData(null);
    setAnswers({});
    setRevealed({});
    setCurrentIndex(0);
  }, []);

  const handleRetake = useCallback(() => {
    setAnswers({});
    setRevealed({});
    setCurrentIndex(0);
    setIsCompleted(false);
  }, []);

  const handleLoadNew = useCallback(() => {
    setTestData(null);
    setAnswers({});
    setRevealed({});
    setCurrentIndex(0);
    setIsCompleted(false);
  }, []);

  if (!testData) return <UploadScreen onLoad={handleLoad} />;

  const currentQuestion = testData.questions[currentIndex];
  const isAnswered = (answers[currentQuestion.id] ?? []).length > 0;
  const isRevealed = !!revealed[currentQuestion.id];
  const isLastQuestion = currentIndex === testData.questions.length - 1;

  if (isCompleted) return (
    <TestResult
      testData={testData}
      answers={answers}
      selectionHistory={selectionHistory}
      timingData={timingData}
      onRetake={handleRetake}
      onLoadNew={handleLoadNew}
    />
  );

  return (
    <div className="flex min-h-screen bg-[#0d0d14] text-[#e8e6f0]">
      
      <TestSidebar
        testData={testData}
        currentIndex={currentIndex}
        handleReset={handleReset}
        currentQuestion={currentQuestion}
      />

      {/* Main content */}
      <main className="flex-1 px-10 py-8 overflow-y-auto flex flex-col items-center justify-center">
        <div className="w-full max-w-[800px]">
          <QuestionCard
            question={currentQuestion}
            index={currentIndex + 1}
            selected={answers[currentQuestion.id] ?? []}
            revealed={isRevealed}
            onSelect={handleSelect}
            onSubmit={handleSubmit}
            onNext={handleNext}
            onComplete={handleComplete}
            isNextDisabled={!isRevealed}
            isLastQuestion={isLastQuestion}
          />
        </div>
      </main>
    </div>
  );
}