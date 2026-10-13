import type { AvailabilityRule } from '@jdr-hub/shared'

const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

export function AvailabilityGrid({ rules, onChange }: { rules: AvailabilityRule[]; onChange: (rules: AvailabilityRule[]) => void }) {
  function toggleDay(dayOfWeek: number, enabled: boolean) {
    const withoutDay = rules.filter((rule) => rule.dayOfWeek !== dayOfWeek)
    if (!enabled) {
      onChange(withoutDay)
      return
    }
    onChange([...withoutDay, { dayOfWeek, startMinute: 18 * 60, endMinute: 22 * 60 }])
  }

  function update(dayOfWeek: number, field: 'startMinute' | 'endMinute', value: string) {
    const minute = Math.max(0, Math.min(1440, Number(value) * 60))
    const existing = rules.find((rule) => rule.dayOfWeek === dayOfWeek)
    if (existing) {
      onChange(rules.map((rule) => rule.dayOfWeek === dayOfWeek ? { ...rule, [field]: minute } : rule))
      return
    }
    onChange([...rules, { dayOfWeek, startMinute: field === 'startMinute' ? minute : 18 * 60, endMinute: field === 'endMinute' ? minute : 22 * 60 }])
  }

  return <div aria-label="Disponibilités récurrentes" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    {days.map((day, dayOfWeek) => {
      const rule = rules.find((item) => item.dayOfWeek === dayOfWeek)
      return <fieldset className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-4" key={day}>
        <legend className="font-display text-base font-semibold">{day}</legend>
        <label className="mt-3 flex min-h-12 cursor-pointer items-center gap-2 text-sm font-semibold">
          <input aria-label={`Disponible le ${day}`} checked={Boolean(rule)} className="peer sr-only" onChange={(event) => toggleDay(dayOfWeek, event.target.checked)} type="checkbox" />
          <span aria-hidden="true" className="grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 border-outline-variant bg-surface text-sm text-on-primary transition-colors after:content-none peer-checked:border-primary peer-checked:bg-primary peer-checked:after:content-['✓'] peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 motion-reduce:transition-none" />
          Disponible
        </label>
        <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant" htmlFor={`start-${dayOfWeek}`}>Début</label>
        <input aria-label={`Heure de début ${day}`} className="mt-1 min-h-12 w-full rounded-lg border border-outline-variant bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50" disabled={!rule} id={`start-${dayOfWeek}`} max="23" min="0" onChange={(event) => update(dayOfWeek, 'startMinute', event.target.value)} placeholder="18" type="number" value={rule ? Math.floor(rule.startMinute / 60) : ''} />
        <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant" htmlFor={`end-${dayOfWeek}`}>Fin</label>
        <input aria-label={`Heure de fin ${day}`} className="mt-1 min-h-12 w-full rounded-lg border border-outline-variant bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50" disabled={!rule} id={`end-${dayOfWeek}`} max="24" min="1" onChange={(event) => update(dayOfWeek, 'endMinute', event.target.value)} placeholder="22" type="number" value={rule ? Math.floor(rule.endMinute / 60) : ''} />
      </fieldset>
    })}
  </div>
}
