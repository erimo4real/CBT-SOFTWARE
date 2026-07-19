import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Scorecard from '@/components/Scorecard'

const passedResult = {
  id: 'att-001',
  score: 80,
  total_marks: 100,
  percentage: 80,
  passing_score: 50,
  passed: true,
  exam_title: 'Midterm Exam',
  attempt_number: 1,
  start_time: '2025-06-15T10:00:00Z',
}

const failedResult = {
  id: 'att-002',
  score: 30,
  total_marks: 100,
  percentage: 30,
  passing_score: 50,
  passed: false,
  exam_title: 'Final Exam',
  attempt_number: 2,
  start_time: '2025-07-01T14:00:00Z',
}

const mockUser = { email: 'ada@student.cbt.com', full_name: 'Ada Eze' }

describe('Scorecard', () => {
  it('renders PASSED when result.passed is true', () => {
    render(<Scorecard result={passedResult} user={mockUser} />)
    expect(screen.getByText('PASSED')).toBeInTheDocument()
  })

  it('renders FAILED when result.passed is false', () => {
    render(<Scorecard result={failedResult} user={mockUser} />)
    expect(screen.getByText('FAILED')).toBeInTheDocument()
  })

  it('displays exam title', () => {
    render(<Scorecard result={passedResult} user={mockUser} />)
    expect(screen.getByText('Midterm Exam')).toBeInTheDocument()
  })

  it('displays score and total marks', () => {
    render(<Scorecard result={passedResult} user={mockUser} />)
    expect(screen.getByText('80 / 100')).toBeInTheDocument()
  })

  it('displays percentage', () => {
    render(<Scorecard result={passedResult} user={mockUser} />)
    expect(screen.getByText('80%')).toBeInTheDocument()
  })

  it('displays passing score', () => {
    render(<Scorecard result={passedResult} user={mockUser} />)
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('displays attempt number', () => {
    render(<Scorecard result={failedResult} user={mockUser} />)
    expect(screen.getByText('#2')).toBeInTheDocument()
  })

  it('displays student name', () => {
    render(<Scorecard result={passedResult} user={mockUser} />)
    expect(screen.getByText('Ada Eze')).toBeInTheDocument()
  })

  it('displays student email', () => {
    render(<Scorecard result={passedResult} user={mockUser} />)
    expect(screen.getByText('ada@student.cbt.com')).toBeInTheDocument()
  })

  it('displays CBT branding', () => {
    render(<Scorecard result={passedResult} user={mockUser} />)
    expect(screen.getByText('CBT')).toBeInTheDocument()
  })

  it('displays reference ID', () => {
    render(<Scorecard result={passedResult} user={mockUser} />)
    expect(screen.getByText(/att-001/)).toBeInTheDocument()
  })

  it('displays date', () => {
    render(<Scorecard result={passedResult} user={mockUser} />)
    expect(screen.getByText(/Jun/)).toBeInTheDocument()
  })

  it('renders with ref for PDF capture', () => {
    const ref = { current: null }
    const { container } = render(<Scorecard ref={ref} result={passedResult} user={mockUser} />)
    expect(container.querySelector('.scorecard-print')).toBeTruthy()
  })
})
