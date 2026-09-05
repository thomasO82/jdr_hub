import type { SchedulingProposal, VoteValue } from '@jdr-hub/shared'

function date(value: string): string { return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(value)) }
function time(value: string): string { return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)) }

export function ProposalCard({ proposal, selected, onSelect }: { proposal: SchedulingProposal; selected: VoteValue | undefined; onSelect: (value: VoteValue) => void }) {
  const options: Array<{ value: VoteValue; label: string }> = [{ value: 'YES', label: 'Oui' }, { value: 'MAYBE', label: 'Peut-être' }, { value: 'NO', label: 'Non' }]
  return <article className="rounded-xl border border-outline-variant/40 bg-surface p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h3 className="m-0 font-display text-lg font-semibold capitalize">{date(proposal.startsAt)}</h3><p className="m-0 mt-1 text-sm text-on-surface-variant">{time(proposal.startsAt)} – {time(proposal.endsAt)}</p></div><span className="rounded-full bg-surface-container px-2 py-1 text-xs text-on-surface-variant">{proposal.votes.yes + proposal.votes.maybe + proposal.votes.no} votes</span></div><div className="mt-4 grid gap-2">{options.map((option) => <button aria-label={`${option.label} pour ${date(proposal.startsAt)}`} className={selected === option.value ? 'rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-on-primary' : 'rounded-lg border border-outline-variant px-3 py-2 text-sm text-on-surface hover:border-primary hover:text-primary'} disabled={proposal.userVote !== null} key={option.value} onClick={() => onSelect(option.value)} type="button">{option.label}</button>)}</div></article>
}
