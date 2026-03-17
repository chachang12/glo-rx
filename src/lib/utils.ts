// src/lib/utils.ts
import { Question } from "@/types";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isCorrect(question: Question, selected: string[]): boolean {
  if (!selected.length) return false;
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
  };
  return map[type] ?? "#888";
}