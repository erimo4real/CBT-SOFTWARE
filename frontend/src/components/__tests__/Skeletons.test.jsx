import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  CourseCardSkeleton, TableRowSkeleton, ListSkeleton,
  StatsSkeleton, PageSkeleton,
} from '@/components/Skeletons'

describe('Skeleton components', () => {
  it('CourseCardSkeleton renders skeleton blocks', () => {
    const { container } = render(<CourseCardSkeleton />)
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('TableRowSkeleton renders default 5 columns', () => {
    const { container } = render(<TableRowSkeleton />)
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBe(5)
  })

  it('TableRowSkeleton renders custom column count', () => {
    const { container } = render(<TableRowSkeleton cols={3} />)
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBe(3)
  })

  it('ListSkeleton renders default 5 items', () => {
    const { container } = render(<ListSkeleton />)
    const items = container.querySelectorAll('.border.rounded-lg')
    expect(items.length).toBe(5)
  })

  it('ListSkeleton renders custom count', () => {
    const { container } = render(<ListSkeleton count={3} />)
    const items = container.querySelectorAll('.border.rounded-lg')
    expect(items.length).toBe(3)
  })

  it('StatsSkeleton renders 4 stat cards', () => {
    const { container } = render(<StatsSkeleton />)
    const cards = container.querySelectorAll('.border.rounded-xl')
    expect(cards.length).toBe(4)
  })

  it('PageSkeleton renders a full page layout', () => {
    const { container } = render(<PageSkeleton />)
    expect(container.firstChild).toBeTruthy()
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(5)
  })
})
