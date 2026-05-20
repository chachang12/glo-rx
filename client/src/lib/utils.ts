// src/lib/utils.ts
import { Question } from "@/types";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function normalizeFibAnswer(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isCorrect(question: Question, selected: string[]): boolean {
  if (!selected.length) return false;

  if (question.type === "ordered") {
    // selected[] is option keys in user's chosen order. The server emits
    // `answer` as the option strings in correct order, so we need to resolve
    // each selected key to its option value before comparing.
    const userSequence = selected.map((k) => {
      const opts = question.options as unknown
      if (Array.isArray(opts)) return opts[Number(k)] as string
      return (opts as Record<string, string>)[k]
    });
    return (
      question.answer.length === userSequence.length &&
      question.answer.every((v, i) => v === userSequence[i])
    );
  }

  if (question.type === "fib") {
    // FIB: user-typed answer in selected[0]. Match against any accepted form.
    const user = normalizeFibAnswer(selected[0] ?? "");
    if (!user) return false;
    return question.answer.some((a) => normalizeFibAnswer(a) === user);
  }

  // MCQ, SATA, calculation, exhibit, priority — order doesn't matter
  const a = [...question.answer].sort();
  const b = [...selected].sort();
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

export function getTypeLabel(type: Question["type"]): string {
  const map: Record<Question["type"], string> = {
    mcq: "MCQ",
    sata: "SATA",
    ordered: "ORDER",
    calculation: "CALC",
    exhibit: "EXHIBIT",
    priority: "PRIORITY",
    fib: "FILL-IN",
  };
  return map[type] ?? type.toUpperCase();
}

export function getTypeColor(type: Question["type"]): string {
  const map: Record<Question["type"], string> = {
    mcq: "#4f8ef7",
    sata: "#e07b3f",
    ordered: "#8b5cf6",
    calculation: "#10b981",
    exhibit: "#ec4899",
    priority: "#f97316",
    fib: "#06b6d4",
  };
  return map[type] ?? "#888";
}