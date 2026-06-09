import { useState } from 'react'
import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { PageLoader } from '@/features/shared/ui/PageLoader'
import {
  useListAdminExams,
  useListCorpusVersions,
  useReloadCorpus,
} from '@/features/learn/admin'

export const AdminCorpus = () => {
  const { data: exams = [], isLoading: examsLoading } = useListAdminExams()
  const [examCode, setExamCode] = useState<string | null>(null)
  const activeExam = examCode ?? exams[0]?.code ?? null

  const { data: versions = [], isLoading: versionsLoading } = useListCorpusVersions(
    activeExam ?? undefined
  )
  const reloadMutation = useReloadCorpus()

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
            <span className="text-[#888]">Corpus</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#e8e6f0]">
            Reference Corpus
          </h1>
          <p className="text-xs text-[#555]">
            Loaded reference material per exam, keyed by corpusVersion. Use{' '}
            <code className="text-[#888]">npm run load-corpus -- --exam &lt;code&gt;</code> on the
            server, or hit Reload here to re-run the loader against the repo.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {exams.map((exam) => (
            <button
              key={exam._id}
              onClick={() => setExamCode(exam.code)}
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
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#bbb]">
                Loaded versions ({versions.length})
              </h2>
              <button
                onClick={async () => {
                  if (!activeExam) return
                  try {
                    const r = await reloadMutation.mutateAsync(activeExam)
                    alert(
                      `Loaded ${r.filesLoaded} file(s) at ${r.corpusVersion}${
                        r.skipped > 0 ? ` (skipped ${r.skipped} official-test files)` : ''
                      }.`
                    )
                  } catch (err) {
                    alert(`Reload failed: ${(err as Error).message}`)
                  }
                }}
                disabled={reloadMutation.isPending}
                className="text-[10px] font-semibold text-[#4f8ef7] hover:underline disabled:opacity-50"
              >
                {reloadMutation.isPending ? 'Reloading…' : 'Reload from repo'}
              </button>
            </div>

            {versionsLoading ? (
              <p className="text-xs text-[#555]">Loading…</p>
            ) : versions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/[0.06] bg-white/[0.02] p-8 text-center">
                <p className="text-sm text-[#888]">No corpus loaded for {activeExam} yet</p>
                <p className="text-xs text-[#555] mt-1">
                  Click Reload from repo to ingest reference material declared in{' '}
                  <code>reference/{activeExam}/manifest.yaml</code>.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm divide-y divide-white/[0.04]">
                {versions.map((v) => (
                  <details key={v._id} className="px-5 py-4">
                    <summary className="flex items-center gap-3 cursor-pointer">
                      <span className="text-sm font-mono text-[#e8e6f0]">{v.version}</span>
                      <span className="text-[10px] text-[#555]">
                        {v.files.length} file(s)
                      </span>
                      {v.loadedAt && (
                        <span className="text-[10px] text-[#555] ml-auto">
                          {new Date(v.loadedAt).toLocaleString()}
                        </span>
                      )}
                    </summary>
                    <div className="mt-3 space-y-1">
                      {v.files.map((f) => (
                        <div
                          key={f.path}
                          className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center text-xs"
                        >
                          <span className="text-[#ddd] truncate font-mono">{f.path}</span>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                              f.role === 'official-test'
                                ? 'bg-[#8b5cf6]/10 text-[#8b5cf6]'
                                : 'bg-[#4f8ef7]/10 text-[#4f8ef7]'
                            }`}
                          >
                            {f.role}
                          </span>
                          <span className="text-[#555] tabular-nums">
                            {f.chunkCount} chunks
                          </span>
                          <span className="text-[#555] font-mono">
                            {f.fileHash.slice(0, 8)}…
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
