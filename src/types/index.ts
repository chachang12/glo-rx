export interface Question {
  id: number;
  type: "mcq" | "sata" | "ordered" | "calculation" | "exhibit";
  stem: string;
  options: Record<string, string>;
  answer: string[];
}

export interface TestData {
  title: string;
  generated_at: string;
  question_count: number;
  sources: string[];
  questions: Question[];
}

export type AnswerState = Record<number, string[]>;
export type RevealState = Record<number, boolean>;