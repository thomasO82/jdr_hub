import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('default game tag seeds', () => {
  it('contains the curated active tags and is safe to run repeatedly', () => {
    const migration = readFileSync(new URL('../migrations/0002_seed_game_tags.sql', import.meta.url), 'utf8')

    expect(migration).toContain('INSERT INTO "tags"')
    expect(migration).toContain('ON CONFLICT ("slug") DO NOTHING')
    for (const slug of ['fantasy', 'horreur', 'debutant', 'exploration', 'roleplay']) {
      expect(migration).toContain(`'${slug}'`)
    }
  })
})
