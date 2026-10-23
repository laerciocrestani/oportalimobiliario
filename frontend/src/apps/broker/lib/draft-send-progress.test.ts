import { describe, expect, it } from 'vitest'
import { draftSendProgress } from '@/apps/broker/lib/draft-send-progress'

const start = new Date('2026-10-16T12:00:00.000Z').getTime()

describe('draftSendProgress', () => {
  it('stays green while more than half of the 20 minutes remain', () => {
    const progress = draftSendProgress('2026-10-16T12:20:00.000Z', start)

    expect(progress.percent).toBe(100)
    expect(progress.tone).toBe('green')
    expect(progress.label).toBe('20:00')
  })

  it('turns yellow after 10 minutes have passed', () => {
    const progress = draftSendProgress('2026-10-16T12:20:00.000Z', start + 11 * 60 * 1000)

    expect(progress.percent).toBe(45)
    expect(progress.tone).toBe('yellow')
    expect(progress.label).toBe('9:00')
  })

  it('turns red when 5 minutes or less remain', () => {
    const progress = draftSendProgress('2026-10-16T12:20:00.000Z', start + 16 * 60 * 1000)

    expect(progress.percent).toBe(20)
    expect(progress.tone).toBe('red')
    expect(progress.label).toBe('4:00')
    expect(progress.expired).toBe(false)
  })
})
