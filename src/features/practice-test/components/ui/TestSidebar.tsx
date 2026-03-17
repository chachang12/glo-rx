import { getTypeColor, getTypeLabel } from '@/lib/utils';
import { Question, TestData } from '@/types';
import React from 'react'

interface TestSidebarProps {
    testData: TestData;
    currentIndex: number;
    handleReset: () => void;
    currentQuestion: Question;
}

export const TestSidebar = ({ testData, currentIndex, handleReset, currentQuestion }: TestSidebarProps) => {
  return (
    <>
    {/* Sidebar */}
      <aside className="w-[240px] min-w-[240px] bg-[#0f0f1a] border-r border-[#1e1e2e] px-5 py-7 flex flex-col gap-4 sticky top-0 h-screen overflow-y-auto">
        <div className="text-[30px] font-bold text-[#4f8ef7] tracking-tight">Glo Rx</div>
        <div className="flex flex-col gap-1">
          <div className="text-[13px] text-[#bbb] font-semibold leading-snug">{testData.title}</div>
          <div className="text-[11px] text-[#555] font-mono">{testData.question_count} questions</div>
          <div className="text-[11px] text-[#555] font-mono overflow-hidden text-ellipsis whitespace-nowrap" title={testData.sources.join(", ")}>
            {testData.sources.slice(0, 2).join(", ")}
            {testData.sources.length > 2 && ` +${testData.sources.length - 2}`}
          </div>
        </div>

        {/* Progress */}
        <div className="mt-4 flex flex-col gap-3">
          <div className="text-[10px] text-[#444] tracking-widest uppercase font-mono">Progress</div>
          <div className="text-[24px] font-bold text-[#4f8ef7]">{currentIndex + 1}</div>
          <div className="text-[12px] text-[#666]">of {testData.question_count}</div>
          <div className="w-full bg-[#1e1e2e] rounded-full h-1 overflow-hidden mt-2">
            <div
              className="bg-[#4f8ef7] h-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / testData.question_count) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Type */}
        <div className="mt-6 flex flex-col gap-2">
          <div className="text-[10px] text-[#444] tracking-widest uppercase font-mono">Question Type</div>
          <span
            className="text-[12px] font-semibold px-3 py-1.5 rounded font-mono border w-fit"
            style={{
                backgroundColor: getTypeColor(currentQuestion.type) + "22",
                color: getTypeColor(currentQuestion.type),
                borderColor: getTypeColor(currentQuestion.type) + "55",
            }}
          >
            {getTypeLabel(currentQuestion.type)}
          </span>
        </div>

        {/* Reset Button */}
        <div className="mt-auto pt-4">
          <button
            onClick={handleReset}
            className="w-full bg-transparent border border-[#333] text-[#888] text-[12px] font-semibold px-3 py-2 rounded-lg cursor-pointer transition-[border-color,color] duration-150 hover:border-[#555] hover:text-[#aaa]"
          >
            Exit Test
          </button>
        </div>
      </aside>
    </>
  )
}
