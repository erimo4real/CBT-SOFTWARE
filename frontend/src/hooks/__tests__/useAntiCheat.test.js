import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import useAntiCheat from '@/hooks/useAntiCheat'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useAntiCheat', () => {
  it('returns initial state', () => {
    const { result } = renderHook(() => useAntiCheat({ enabled: true }))
    expect(result.current.tabSwitches).toBe(0)
    expect(result.current.violations).toEqual([])
    expect(result.current.totalViolations).toBe(0)
    expect(result.current.showWarning).toBe(false)
  })

  it('detects tab switch via visibilitychange', () => {
    const onViolation = vi.fn()
    const { result } = renderHook(() => useAntiCheat({ onViolation, enabled: true }))

    act(() => {
      Object.defineProperty(document, 'hidden', { value: true, writable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(result.current.tabSwitches).toBe(1)
    expect(result.current.violations.length).toBe(1)
    expect(result.current.violations[0].type).toBe('tab_switch')
    expect(result.current.showWarning).toBe(true)
    expect(onViolation).toHaveBeenCalled()
  })

  it('detects right-click via contextmenu', () => {
    const { result } = renderHook(() => useAntiCheat({ enabled: true }))

    act(() => {
      const event = new Event('contextmenu', { bubbles: true })
      event.preventDefault = vi.fn()
      document.dispatchEvent(event)
    })

    expect(result.current.violations.length).toBe(1)
    expect(result.current.violations[0].type).toBe('right_click')
  })

  it('detects copy attempt', () => {
    const { result } = renderHook(() => useAntiCheat({ enabled: true }))

    act(() => {
      const event = new Event('copy', { bubbles: true })
      event.preventDefault = vi.fn()
      document.dispatchEvent(event)
    })

    expect(result.current.violations.length).toBe(1)
    expect(result.current.violations[0].type).toBe('copy')
  })

  it('detects paste attempt', () => {
    const { result } = renderHook(() => useAntiCheat({ enabled: true }))

    act(() => {
      const el = document.createElement('div')
      document.body.appendChild(el)
      el.dispatchEvent(new Event('paste', { bubbles: true }))
      document.body.removeChild(el)
    })

    expect(result.current.violations.length).toBe(1)
    expect(result.current.violations[0].type).toBe('paste')
  })

  it('allows paste in input/textarea', () => {
    const { result } = renderHook(() => useAntiCheat({ enabled: true }))

    act(() => {
      const el = document.createElement('input')
      document.body.appendChild(el)
      el.dispatchEvent(new Event('paste', { bubbles: true }))
      document.body.removeChild(el)
    })

    expect(result.current.violations.length).toBe(0)
  })

  it('detects keyboard shortcuts', () => {
    const { result } = renderHook(() => useAntiCheat({ enabled: true }))

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'c',
        ctrlKey: true,
        bubbles: true,
      }))
    })

    expect(result.current.violations.length).toBe(1)
    expect(result.current.violations[0].type).toBe('keyboard')
  })

  it('detects F12', () => {
    const { result } = renderHook(() => useAntiCheat({ enabled: true }))

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'F12',
        bubbles: true,
      }))
    })

    expect(result.current.violations.length).toBe(1)
  })

  it('warning auto-hides after 4 seconds', () => {
    const { result } = renderHook(() => useAntiCheat({ enabled: true }))

    act(() => {
      Object.defineProperty(document, 'hidden', { value: true, writable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(result.current.showWarning).toBe(true)

    act(() => {
      vi.advanceTimersByTime(4000)
    })

    expect(result.current.showWarning).toBe(false)
  })

  it('does nothing when disabled', () => {
    const { result } = renderHook(() => useAntiCheat({ enabled: false }))

    act(() => {
      Object.defineProperty(document, 'hidden', { value: true, writable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(result.current.tabSwitches).toBe(0)
    expect(result.current.violations).toEqual([])
  })

  it('increments tab_switches only for tab_switch type', () => {
    const { result } = renderHook(() => useAntiCheat({ enabled: true }))

    act(() => {
      Object.defineProperty(document, 'hidden', { value: true, writable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })

    act(() => {
      const event = new Event('contextmenu', { bubbles: true })
      event.preventDefault = vi.fn()
      document.dispatchEvent(event)
    })

    expect(result.current.tabSwitches).toBe(1)
    expect(result.current.violations.length).toBe(2)
    expect(result.current.totalViolations).toBe(2)
  })
})
