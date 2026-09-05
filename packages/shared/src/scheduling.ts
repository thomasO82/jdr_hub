import { z } from 'zod'

const dateTimeSchema = z.iso.datetime({ offset: true })

export const sessionStatusSchema = z.enum(['PROPOSED', 'SCHEDULED', 'COMPLETED', 'CANCELLED'])
export const proposalStatusSchema = z.enum(['OPEN', 'CLOSED', 'SELECTED'])
export const voteValueSchema = z.enum(['YES', 'MAYBE', 'NO'])

export const sessionWindowSchema = z.object({
  startsAt: dateTimeSchema,
  endsAt: dateTimeSchema,
}).strict().superRefine((window, context) => {
  const duration = new Date(window.endsAt).getTime() - new Date(window.startsAt).getTime()
  if (duration < 15 * 60_000 || duration > 24 * 60 * 60_000) {
    context.addIssue({ code: 'custom', message: 'Session duration must be between 15 minutes and 24 hours' })
  }
})

export const proposalInputSchema = z.object({
  slots: z.array(sessionWindowSchema).min(1).max(10),
}).strict()

export const fixedSessionInputSchema = sessionWindowSchema.extend({
  notes: z.string().trim().max(2_000).nullable().default(null),
}).strict()

export const voteCommandSchema = z.object({ vote: voteValueSchema }).strict()
export const sessionCommandSchema = z.union([
  fixedSessionInputSchema,
  z.object({ proposalId: z.uuid() }).strict(),
])

export const planningQuerySchema = z.object({
  from: dateTimeSchema.optional(),
  to: dateTimeSchema.optional(),
}).strict().superRefine((query, context) => {
  if ((query.from === undefined) !== (query.to === undefined)) {
    context.addIssue({ code: 'custom', message: 'Planning range requires from and to' })
    return
  }
  if (query.from !== undefined && query.to !== undefined) {
    const duration = new Date(query.to).getTime() - new Date(query.from).getTime()
    if (duration <= 0 || duration > 62 * 24 * 60 * 60_000) {
      context.addIssue({ code: 'custom', message: 'Planning range must be between 1 and 62 days' })
    }
  }
})

export type SessionStatus = z.infer<typeof sessionStatusSchema>
export type ProposalStatus = z.infer<typeof proposalStatusSchema>
export type VoteValue = z.infer<typeof voteValueSchema>
export type SessionWindow = z.infer<typeof sessionWindowSchema>
export type ProposalInput = z.infer<typeof proposalInputSchema>
export type FixedSessionInput = z.infer<typeof fixedSessionInputSchema>
export type VoteCommand = z.infer<typeof voteCommandSchema>
export type SessionCommand = z.infer<typeof sessionCommandSchema>

export type SchedulingProposal = {
  id: string
  gameId: string
  startsAt: string
  endsAt: string
  status: ProposalStatus
  votes: { yes: number; maybe: number; no: number }
  userVote: VoteValue | null
}

export type PlanningSession = {
  id: string
  gameId: string
  proposalId: string | null
  gameTitle: string
  startsAt: string
  endsAt: string
  status: SessionStatus
  notes: string | null
}

export type PlanningPage = { items: PlanningSession[]; from: string | null; to: string | null }
export type PlanningQuery = z.infer<typeof planningQuerySchema>
