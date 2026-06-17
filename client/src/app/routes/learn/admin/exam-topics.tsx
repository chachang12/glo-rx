import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { paths } from '@/config/paths'
import { PageLoader } from '@/features/shared/ui/PageLoader'
import { useGetAdminExam, useUpdateAdminExam } from '@/features/learn/admin'

export const AdminExamTopics = () => {
  const { code } = useParams()
  const { data: remoteExam = null, isLoading: examLoading, isError: examError } = useGetAdminExam(code)
  const updateExamMutation = useUpdateAdminExam()

  const [exam, setExam] = useState(remoteExam)
  useEffect(() => { setExam(remoteExam) }, [remoteExam])

  const [newTopic, setNewTopic] = useState('')
  const [saved, setSaved] = useState(false)
  const saving = updateExamMutation.isPending

  const save = async (topics: string[]) => {
    if (!code) return
    setSaved(false)
    await updateExamMutation.mutateAsync({ code, updates: { topics } })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
  }

  const addTopic = () => {
    if (!newTopic.trim() || !exam) return
    const updated = [...exam.topics, newTopic.trim()]
    setNewTopic('')
    save(updated)
  }

  const removeTopic = (index: number) => {
    if (!exam) return
    save(exam.topics.filter((_, i) => i !== index))
  }

  if (examLoading) return <PageLoader />

  if (examError || !exam) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto text-center space-y-4 py-16">
          <p className="text-sm text-[#888]">Exam not found</p>
          <Link to={paths.app.admin.getHref()} className="text-xs text-[#4f8ef7] hover:underline">
            Back to admin
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-[#555]">
            <Link to={paths.app.admin.getHref()} className="hover:text-[#888]">
              Admin
            </Link>
            <span>/</span>
            <Link to={paths.app.adminExam.getHref(exam.code)} className="hover:text-[#888]">
              {exam.label}
            </Link>
            <span>/</span>
            <span className="text-[#888]">Topics</span>
          </div>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight text-[#e8e6f0]">Topics</h1>
            <div className="text-xs">
              {saving && <span className="text-[#888]">Saving…</span>}
              {saved && <span className="text-[#10b981]">Saved</span>}
            </div>
          </div>
          <p className="text-xs text-[#555]">
            {exam.topics.length} topic{exam.topics.length === 1 ? '' : 's'}
          </p>
        </div>

        <Section title="Topic list">
          <div className="space-y-3">
            {exam.topics.length === 0 && (
              <p className="text-xs text-[#555]">No topics yet. Add one below.</p>
            )}
            {exam.topics.map((topic, i) => (
              <div
                key={`${topic}-${i}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.04] bg-white/[0.01] px-3 py-2"
              >
                <span className="text-sm text-[#ddd]">{topic}</span>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-[10px] text-[#555] italic">Reference: not uploaded</span>
                  <button
                    onClick={() => removeTopic(i)}
                    className="text-[#555] hover:text-[#ef4444] transition-colors text-lg leading-none"
                    title="Remove topic"
                  >
                    &times;
                  </button>
                </div>
              </div>
            ))}

            <div className="flex gap-2">
              <input
                type="text"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTopic()}
                placeholder="Add a topic…"
                className="flex-1 px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-sm text-[#ddd] placeholder-[#555] focus:outline-none focus:ring-2 focus:ring-[#4f8ef7]/40"
              />
              <button
                onClick={addTopic}
                disabled={!newTopic.trim() || saving}
                className="px-4 py-2 rounded-lg border border-[#4f8ef7]/30 bg-[#4f8ef7]/5 text-xs font-semibold text-[#4f8ef7] hover:border-[#4f8ef7]/60 transition-all disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        </Section>

        <Section title="Per-topic references">
          <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] p-5">
            <p className="text-sm text-[#ddd]">Researcher uploads — coming soon</p>
            <p className="text-xs text-[#555]">
              Each topic will accept a reference markdown file uploaded by a researcher. The file becomes the
              corpus chunk that anchors AI-generated questions for that topic.
            </p>
          </div>
        </Section>
      </div>
    </div>
  )
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-4">
    <h2 className="text-sm font-semibold text-[#bbb]">{title}</h2>
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5">
      {children}
    </div>
  </div>
)
