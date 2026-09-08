import type { XpSummary } from '@jdr-hub/shared'

export function XpProgressCard({ summary }: { summary: XpSummary }) {
  const nextLevelMessage = summary.nextLevelXp === null
    ? 'Niveau maximum atteint'
    : `${summary.totalXp} / ${summary.nextLevelXp} XP`

  return <section className="grid gap-4 rounded-2xl bg-primary p-5 text-on-primary shadow-sm sm:p-6" aria-labelledby="xp-progress-title">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="m-0 font-label text-xs font-bold uppercase tracking-wider text-primary-fixed">Progression</p>
        <h2 className="m-0 mt-2 font-display text-2xl font-semibold" id="xp-progress-title">Niveau {summary.level}</h2>
      </div>
      <span className="grid h-12 min-w-12 place-items-center rounded-full bg-on-primary/15 font-display text-lg font-semibold text-primary-fixed" aria-label={`Niveau ${summary.level}`}>{summary.level}</span>
    </div>
    <div className="grid gap-2">
      <progress aria-label="Progression vers le prochain niveau" aria-valuemax={100} aria-valuemin={0} aria-valuenow={summary.progressPercent} className="h-3 w-full overflow-hidden rounded-full accent-primary-fixed" max={100} value={summary.progressPercent} />
      <div className="flex items-center justify-between gap-3 text-sm text-primary-fixed"><span>{summary.progressPercent}%</span><span>{nextLevelMessage}</span></div>
    </div>
  </section>
}
