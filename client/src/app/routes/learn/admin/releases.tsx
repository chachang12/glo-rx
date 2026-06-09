import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { PageLoader } from '@/features/shared/ui/PageLoader'
import {
  useArchiveRelease,
  useCreateRelease,
  useListAdminExams,
  useListCorpusVersions,
  useListReleaseCandidates,
  useListReleases,
  usePublishRelease,
  type Release,
  type ReleaseCandidate,
} from '@/features/learn/admin'

const statusTone: Record<Release['status'], { bg: string; fg: string; label: string }> = {
  draft: { bg: 'bg-[#facc15]/10', fg: 'text-[#facc15]', label: 'Draft' },
  live: { bg: 'bg-[#10b981]/10', fg: 'text-[#10b981]', label: 'Live' },
  archived: { bg: 'bg-white/[0.04]', fg: 'text-[#888]', label: 'Archived' },
}

export const AdminReleases = () => {
  const { data: exams = [], isLoading: examsLoading } = useListAdminExams()
  const [examCode, setExamCode] = useState<string | null>(null)
  const activeExam = examCode ?? exams[0]?.code ?? null

  const { data: releases = [], isLoading: releasesLoading } = useListReleases(
    activeExam ?? undefined
  )
  const { data: candidates = [], isLoading: candidatesLoading } = useListReleaseCandidates(
    activeExam ?? undefined
  )
  const { data: versions = [] } = useListCorpusVersions(activeExam ?? undefined)

  const [composeOpen, setComposeOpen] = useState(false)
  const [version, setVersion] = useState('')
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [corpusVersion, setCorpusVersion] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [feedback, setFeedback] = useState<string | null>(null)

  const createMutation = useCreateRelease()
  const publishMutation = usePublishRelease()
  const archiveMutation = useArchiveRelease()

  const candidatesById = useMemo(() => {
    const m = new Map<string, ReleaseCandidate>()
    for (const c of candidates) m.set(c._id, c)
    return m
  }, [candidates])

  const resetCompose = () => {
    setComposeOpen(false)
    setVersion('')
    setName('')
    setNotes('')
    setCorpusVersion('')
    setSelectedIds(new Set())
    setFeedback(null)
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => setSelectedIds(new Set(candidates.map((c) => c._id)))
  const clearAll = () => setSelectedIds(new Set())

  const handleCreate = async () => {
    if (!activeExam) return
    setFeedback(null)
    if (selectedIds.size === 0) {
      setFeedback('Select at least one approved question.')
      return
    }
    try {
      await createMutation.mutateAsync({
        examCode: activeExam,
        version: version.trim(),
        name: name.trim(),
        notes: notes.trim() || undefined,
        corpusVersion: corpusVersion.trim() || null,
        questionIds: Array.from(selectedIds),
      })
      resetCompose()
    } catch (err) {
      setFeedback(`Create failed: ${(err as Error).message}`)
    }
  }

  const handlePublish = async (release: Release) => {
    if (
      !confirm(
        `Publish ${release.version} with ${release.questionIds.length} question(s)? Listed questions go live immediately.`
      )
    )
      return
    try {
      const r = await publishMutation.mutateAsync(release._id)
      if (r.skipped > 0) {
        alert(
          `Published ${r.stamped} of ${release.questionIds.length}. ${r.skipped} skipped (no longer approved or already assigned).`
        )
      }
    } catch (err) {
      alert(`Publish failed: ${(err as Error).message}`)
    }
  }

  const handleArchive = async (release: Release) => {
    if (
      !confirm(
        `Archive ${release.version}? Its questions revert to "approved" and stop serving immediately.`
      )
    )
      return
    try {
      await archiveMutation.mutateAsync(release._id)
    } catch (err) {
      alert(`Archive failed: ${(err as Error).message}`)
    }
  }

  if (examsLoading) return <PageLoader />

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-[#555]">
            <Link to={paths.app.admin.getHref()} className="hover:text-[#888]">
              Admin
            </Link>
            <span>/</span>
            <span className="text-[#888]">Releases</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#e8e6f0]">Releases</h1>
          <p className="text-xs text-[#555]">
            Bundle approved questions into a named version. Publish to make them live in test
            sessions, archive to roll back instantly.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {exams.map((exam) => (
            <button
              key={exam._id}
              onClick={() => {
                setExamCode(exam.code)
                resetCompose()
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeExam === exam.code
                  ? 'bg-[#4f8ef7]/10 text-[#4f8ef7]'
                  : 'text-[#555] hover:text-[#888] bg-white/[0.02]'
              }`}
            >
              {exam.label}
            </button>
          ))}
        </div>

        {activeExam && (
          <>
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#bbb]">
                  Releases ({releases.length})
                </h2>
                {!composeOpen && (
                  <button
                    onClick={() => setComposeOpen(true)}
                    className="text-[10px] font-semibold text-[#4f8ef7] hover:underline"
                  >
                    + New release
                  </button>
                )}
              </div>

              {releasesLoading ? (
                <p className="text-xs text-[#555]">Loading…</p>
              ) : releases.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/[0.06] bg-white/[0.02] p-8 text-center">
                  <p className="text-sm text-[#888]">No releases for {activeExam} yet</p>
                  <p className="text-xs text-[#555] mt-1">
                    Compose a release from approved questions to start publishing.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm divide-y divide-white/[0.04]">
                  {releases.map((r) => {
                    const tone = statusTone[r.status]
                    return (
                      <div
                        key={r._id}
                        className="px-5 py-4 grid grid-cols-[1fr_auto_auto] gap-4 items-center"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-mono text-[#e8e6f0]">
                              {r.version}
                            </span>
                            <span className="text-xs text-[#bbb]">{r.name}</span>
                            <span
                              className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${tone.bg} ${tone.fg}`}
                            >
                              {tone.label}
                            </span>
                          </div>
                          <p className="text-[10px] text-[#555] mt-1">
                            {r.questionIds.length} question(s)
                            {r.corpusVersion ? ` · corpus ${r.corpusVersion}` : ''}
                            {r.publishedAt
                              ? ` · published ${new Date(r.publishedAt).toLocaleDateString()}`
                              : ''}
                            {r.archivedAt
                              ? ` · archived ${new Date(r.archivedAt).toLocaleDateString()}`
                              : ''}
                          </p>
                          {r.notes && (
                            <p className="text-[10px] text-[#777] mt-1 line-clamp-2">{r.notes}</p>
                          )}
                        </div>
                        <span className="text-[10px] text-[#555] tabular-nums">
                          {r.createdAt
                            ? new Date(r.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })
                            : '—'}
                        </span>
                        <div className="flex items-center gap-2">
                          {r.status === 'draft' && (
                            <button
                              onClick={() => handlePublish(r)}
                              disabled={publishMutation.isPending}
                              className="px-2.5 py-1 rounded-md bg-[#10b981]/10 text-[#10b981] text-[10px] font-semibold disabled:opacity-50"
                            >
                              Publish
                            </button>
                          )}
                          {r.status === 'live' && (
                            <button
                              onClick={() => handleArchive(r)}
                              disabled={archiveMutation.isPending}
                              className="px-2.5 py-1 rounded-md bg-[#ef4444]/10 text-[#ef4444] text-[10px] font-semibold disabled:opacity-50"
                            >
                              Archive
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {composeOpen && (
              <section className="space-y-5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[#bbb]">New release</h2>
                  <button
                    onClick={resetCompose}
                    className="text-[10px] text-[#555] hover:text-[#888]"
                  >
                    Cancel
                  </button>
                </div>

                <Row label="Version">
                  <input
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="e.g. 2026.06.01"
                    className="bg-white/[0.04] border border-white/[0.06] rounded-md px-3 py-1.5 text-xs text-[#ddd] w-48 font-mono"
                  />
                  <span className="text-[10px] text-[#555]">
                    Must be unique per exam.
                  </span>
                </Row>

                <Row label="Name">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. DAT Biology first cut"
                    className="flex-1 max-w-md bg-white/[0.04] border border-white/[0.06] rounded-md px-3 py-1.5 text-xs text-[#ddd]"
                  />
                </Row>

                <Row label="Corpus version">
                  <select
                    value={corpusVersion}
                    onChange={(e) => setCorpusVersion(e.target.value)}
                    className="bg-white/[0.04] border border-white/[0.06] rounded-md px-3 py-1.5 text-xs text-[#ddd] min-w-[200px]"
                  >
                    <option value="">— none —</option>
                    {versions.map((v) => (
                      <option key={v._id} value={v.version}>
                        {v.version}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-[#555]">Optional — for tracing.</span>
                </Row>

                <Row label="Notes">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Optional — release notes for the admin log."
                    className="bg-white/[0.04] border border-white/[0.06] rounded-md px-3 py-1.5 text-xs text-[#ddd] flex-1 max-w-2xl"
                  />
                </Row>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-[#bbb]">
                        Approved questions ({candidates.length})
                      </span>
                      <span className="text-[10px] text-[#555]">
                        {selectedIds.size} selected
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={selectAll}
                        disabled={candidates.length === 0}
                        className="text-[10px] text-[#4f8ef7] hover:underline disabled:opacity-50"
                      >
                        Select all
                      </button>
                      <span className="text-[10px] text-[#333]">·</span>
                      <button
                        onClick={clearAll}
                        disabled={selectedIds.size === 0}
                        className="text-[10px] text-[#555] hover:text-[#888] disabled:opacity-50"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {candidatesLoading ? (
                    <p className="text-xs text-[#555]">Loading candidates…</p>
                  ) : candidates.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-white/[0.06] bg-white/[0.02] p-6 text-center">
                      <p className="text-xs text-[#888]">
                        No approved questions available for {activeExam}.
                      </p>
                      <p className="text-[10px] text-[#555] mt-1">
                        Promote drafts via Generation, then have contributors approve them.
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-[420px] overflow-y-auto rounded-lg border border-white/[0.06] bg-white/[0.02] divide-y divide-white/[0.04]">
                      {candidates.map((c) => {
                        const selected = selectedIds.has(c._id)
                        return (
                          <label
                            key={c._id}
                            className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02] ${
                              selected ? 'bg-[#4f8ef7]/[0.04]' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleSelect(c._id)}
                              className="mt-1 accent-[#4f8ef7]"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-[#ddd] line-clamp-2">{c.stem}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/[0.04] text-[#888]">
                                  {c.type}
                                </span>
                                {c.difficulty && (
                                  <span className="text-[10px] text-[#888]">
                                    {c.difficulty}
                                  </span>
                                )}
                                {c.topics.slice(0, 2).map((t) => (
                                  <span key={t} className="text-[10px] text-[#555]">
                                    {t}
                                  </span>
                                ))}
                                <span className="text-[10px] text-[#555] ml-auto">
                                  {c.approvalCount} approval(s)
                                </span>
                              </div>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>

                {selectedIds.size > 0 && (
                  <div className="text-[10px] text-[#555]">
                    Selected:{' '}
                    {Array.from(selectedIds)
                      .slice(0, 5)
                      .map((id) => {
                        const c = candidatesById.get(id)
                        return c ? c.stem.slice(0, 40) : id
                      })
                      .join(' · ')}
                    {selectedIds.size > 5 ? ` · +${selectedIds.size - 5} more` : ''}
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleCreate}
                    disabled={
                      createMutation.isPending ||
                      !version.trim() ||
                      !name.trim() ||
                      selectedIds.size === 0
                    }
                    className="px-4 py-2 rounded-md bg-[#4f8ef7] text-xs font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createMutation.isPending ? 'Creating…' : 'Create draft release'}
                  </button>
                  {feedback && <span className="text-[10px] text-[#ef4444]">{feedback}</span>}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-start gap-4">
    <span className="text-xs font-semibold text-[#888] w-32 flex-shrink-0 pt-1">{label}</span>
    <div className="flex-1 flex items-center flex-wrap gap-2">{children}</div>
  </div>
)
