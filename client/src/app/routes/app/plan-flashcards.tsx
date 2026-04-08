import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router'
import { paths } from '@/config/paths'
import { apiFetch } from '@/lib/api'
import { FlashcardGenerator } from '@/features/flashcard'

interface Exam {
  code: string
  label: string
  category: string
  description: string
}

export const PlanFlashcards = () => {
  const { examCode } = useParams()
  const [exam, setExam] = useState<Exam | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    apiFetch('/api/exams/all')
      .then((res) => res.json())
      .then((exams: Exam[]) => {
        const match = exams.find((e) => e.code === examCode)
        if (match) setExam(match)
        else setNotFound(true)
      })
      .catch(() => setNotFound(true))
  }, [examCode])

  if (notFound) {
    return (
      <div className="p-8">
        <div className="max-w-3xl mx-auto space-y-4">
          <h1 className="text-2xl font-bold text-[#e8e6f0]">Exam not found</h1>
          <Link to={paths.app.plans.getHref()} className="text-sm text-[#4f8ef7] hover:underline">
            &larr; Back to plans
          </Link>
        </div>
      </div>
    )
  }

  if (!exam) {
    return (
      <div className="flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#4f8ef7] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#555]">
          <Link to={paths.app.plans.getHref()} className="text-[#4f8ef7] hover:underline">Plans</Link>
          <span>/</span>
          <Link to={paths.app.plan.getHref(exam.code)} className="text-[#4f8ef7] hover:underline">{exam.label}</Link>
          <span>/</span>
          <span className="text-[#888]">Flashcards</span>
        </div>

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-[#e8e6f0]">
            Flashcard Generator
          </h1>
          <p className="text-sm text-[#888]">
            Paste notes or upload a PDF to generate {exam.label} flashcards with AI.
          </p>
        </div>

        {/* Generator */}
        <FlashcardGenerator examCode={exam.code} />
      </div>
    </div>
  )
}
