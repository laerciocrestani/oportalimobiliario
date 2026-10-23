import { describe, expect, it } from 'vitest'
import { layersBottomToTop } from '@/apps/builder/components/FloorPerspective'

describe('FloorPerspective', () => {
  it('stacks basements under the hall and the upper floors', () => {
    const ordered = layersBottomToTop([
      { number: 3, kind: 'residential' as const },
      { number: -2, kind: 'garage' as const },
      { number: 0, kind: 'hall' as const },
      { number: -1, kind: 'garage' as const },
      { number: 1, kind: 'residential' as const },
      { number: 2, kind: 'residential' as const },
      { number: 5, kind: 'residential' as const },
      { number: 4, kind: 'residential' as const },
    ])

    expect(ordered.map((floor) => [floor.number, floor.kind])).toEqual([
      [-2, 'garage'],
      [-1, 'garage'],
      [0, 'hall'],
      [1, 'residential'],
      [2, 'residential'],
      [3, 'residential'],
      [4, 'residential'],
      [5, 'residential'],
    ])
  })
})
