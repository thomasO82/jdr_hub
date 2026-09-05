import type { SchedulingProposal, VoteValue } from '@jdr-hub/shared'

const choices: Array<{ value: VoteValue; label: string; icon: string }> = [{ value: 'YES', label: 'Oui', icon: '✓' }, { value: 'MAYBE', label: 'Peut-être', icon: '?' }, { value: 'NO', label: 'Non', icon: '×' }]

function date(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(value))
}

function time(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

export function ProposalMatrix({ proposals, selected, onSelect }: { proposals: SchedulingProposal[]; selected: Record<string, VoteValue | undefined>; onSelect: (proposalId: string, vote: VoteValue) => void }) {
  return <div className="hidden overflow-hidden rounded-xl border border-outline-variant/40 bg-surface shadow-sm md:block"><div className="grid grid-cols-[minmax(180px,1fr)_repeat(3,100px)] border-b border-outline-variant/40 bg-surface-container-low p-3 text-xs font-semibold uppercase tracking-wide text-on-surface-variant"><span>Date & heure</span>{choices.map((choice) => <span className="text-center" key={choice.value}>{choice.label}</span>)}</div>{proposals.map((proposal) => <div className="grid grid-cols-[minmax(180px,1fr)_repeat(3,100px)] items-center border-b border-outline-variant/30 p-3 last:border-b-0" key={proposal.id}><div><p className="m-0 font-semibold capitalize">{date(proposal.startsAt)}</p><p className="m-0 mt-1 text-sm text-on-surface-variant">{time(proposal.startsAt)} – {time(proposal.endsAt)}</p><p className="m-0 mt-1 text-xs text-on-surface-variant">{proposal.votes.yes} oui · {proposal.votes.maybe} peut-être · {proposal.votes.no} non</p></div>{choices.map((choice) => <button aria-label={`${choice.label} pour ${date(proposal.startsAt)}`} className={selected[proposal.id] === choice.value ? 'mx-auto grid h-9 w-9 place-items-center rounded-full bg-primary text-lg font-bold text-on-primary' : 'mx-auto grid h-9 w-9 place-items-center rounded-full border-2 border-outline text-outline hover:border-primary hover:text-primary'} disabled={proposal.userVote !== null} key={choice.value} onClick={() => onSelect(proposal.id, choice.value)} type="button">{choice.icon}</button>)}</div>)}</div>
}

