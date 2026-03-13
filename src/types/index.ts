interface Question {
  id: number;
  type: "mcq" | "sata" | "ordered" | "calculation" | "exhibit";
  stem: string;
  options: Record<string, string>;
  answer: string[];
}

interface TestData {
  title: string;
  generated_at: string;
  question_count: number;
  sources: string[];
  questions: Question[];
}

type AnswerState = Record<number, string[]>;
type RevealState = Record<number, boolean>;