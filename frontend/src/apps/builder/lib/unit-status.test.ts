import { describe, expect, it } from 'vitest'
import {
  unitStatusColors,
  unitStatusLabels,
  unitStatusLegend,
} from '@/apps/builder/lib/unit-status'

describe('unit-status', () => {
  it('defines labels and colors for every status', () => {
    for (const { status, label, color } of unitStatusLegend) {
      expect(unitStatusLabels[status]).toBe(label)
      expect(unitStatusColors[status]).toBe(color)
      expect(color.startsWith('bg-')).toBe(true)
    }
  })
})
