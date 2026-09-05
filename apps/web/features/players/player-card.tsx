import type { PlayerSummary } from '@jdr-hub/shared'

export function PlayerCard({ player }: { player: PlayerSummary }) {
  return (
    <article className="rounded-xl border border-outline-variant/30 bg-surface p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-4">
        {player.avatarUrl ? <img className="h-14 w-14 rounded-full object-cover" src={player.avatarUrl} alt="" /> : <div className="grid h-14 w-14 place-items-center rounded-full bg-primary-fixed font-display text-xl font-semibold text-primary" aria-hidden="true">{player.username.slice(0, 1).toUpperCase()}</div>}
        <div className="min-w-0 flex-1"><h2 className="m-0 truncate font-display text-xl font-semibold">{player.username}</h2><p className="m-0 mt-1 text-sm text-on-surface-variant">{player.level ? `Niveau ${player.level}` : 'Aventurier'}</p></div>
        {player.availabilityCompatible !== null && <span className={player.availabilityCompatible ? 'rounded-full bg-primary-fixed px-2.5 py-1 text-xs font-semibold text-primary' : 'rounded-full bg-surface-container px-2.5 py-1 text-xs font-semibold text-on-surface-variant'}>{player.availabilityCompatible ? 'Compatible' : 'À vérifier'}</span>}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">{player.preferredSystems.map((system) => <span className="rounded-full bg-surface-container-low px-2.5 py-1 text-xs text-on-surface-variant" key={system}>{system}</span>)}</div>
      <p className="m-0 mt-4 text-sm text-on-surface-variant">Compatibilité visible selon les préférences de disponibilité.</p>
    </article>
  )
}
