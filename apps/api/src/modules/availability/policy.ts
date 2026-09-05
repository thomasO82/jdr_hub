import type { AvailabilityRule } from '@jdr-hub/shared'

type AvailabilityWindow = {
  dayOfWeek: number
  startMinute: number
  endMinute: number
}

export function validateAvailabilityRules(rules: AvailabilityRule[]): void {
  const byDay = new Map<number, AvailabilityRule[]>()
  for (const rule of rules) {
    const dayRules = byDay.get(rule.dayOfWeek) ?? []
    dayRules.push(rule)
    byDay.set(rule.dayOfWeek, dayRules)
  }

  for (const dayRules of byDay.values()) {
    const ordered = [...dayRules].sort((left, right) => left.startMinute - right.startMinute)
    for (let index = 1; index < ordered.length; index += 1) {
      const previous = ordered[index - 1]
      const current = ordered[index]
      if (previous && current && current.startMinute < previous.endMinute) {
        throw new Error('AVAILABILITY_OVERLAP')
      }
    }
  }
}

export function isCompatibleWithWindow(rules: AvailabilityRule[], window: AvailabilityWindow): boolean {
  return rules.some((rule) => rule.dayOfWeek === window.dayOfWeek && rule.startMinute < window.endMinute && rule.endMinute > window.startMinute)
}

export function validateTimeZone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format()
    return true
  } catch {
    return false
  }
}
