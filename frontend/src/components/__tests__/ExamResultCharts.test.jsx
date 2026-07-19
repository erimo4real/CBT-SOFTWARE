import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ExamResultCharts from '@/components/ExamResultCharts'

const sampleQuestions = [
  { topic: 'Algebra', question_type: 'multiple_choice', difficulty: 'easy', is_correct: true, time_spent: 30 },
  { topic: 'Algebra', question_type: 'multiple_choice', difficulty: 'easy', is_correct: false, time_spent: 45 },
  { topic: 'Geometry', question_type: 'true_false', difficulty: 'medium', is_correct: true, time_spent: 20 },
  { topic: 'Geometry', question_type: 'true_false', difficulty: 'medium', is_correct: true, time_spent: 15 },
  { topic: 'Calculus', question_type: 'multiple_choice', difficulty: 'hard', is_correct: false, time_spent: 60 },
]

describe('ExamResultCharts', () => {
  it('returns null for empty questions', () => {
    const { container } = render(<ExamResultCharts questions={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null for null questions', () => {
    const { container } = render(<ExamResultCharts questions={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders Performance Breakdown heading', () => {
    render(<ExamResultCharts questions={sampleQuestions} />)
    expect(screen.getByText('Performance Breakdown')).toBeInTheDocument()
  })

  it('renders Accuracy by Topic card', () => {
    render(<ExamResultCharts questions={sampleQuestions} />)
    expect(screen.getByText('Accuracy by Topic')).toBeInTheDocument()
  })

  it('renders Results by Question Type card', () => {
    render(<ExamResultCharts questions={sampleQuestions} />)
    expect(screen.getByText('Results by Question Type')).toBeInTheDocument()
  })

  it('renders Difficulty Breakdown card', () => {
    render(<ExamResultCharts questions={sampleQuestions} />)
    expect(screen.getByText('Difficulty Breakdown')).toBeInTheDocument()
  })

  it('renders Time Analysis card', () => {
    render(<ExamResultCharts questions={sampleQuestions} />)
    expect(screen.getByText('Time Analysis')).toBeInTheDocument()
  })

  it('displays total questions count', () => {
    render(<ExamResultCharts questions={sampleQuestions} />)
    expect(screen.getByText('Total questions')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('displays correct count', () => {
    render(<ExamResultCharts questions={sampleQuestions} />)
    expect(screen.getByText('Correct')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('displays incorrect count', () => {
    render(<ExamResultCharts questions={sampleQuestions} />)
    expect(screen.getByText('Incorrect')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('handles questions with null is_correct (ungraded)', () => {
    const questions = [
      ...sampleQuestions,
      { topic: 'Stats', question_type: 'essay', difficulty: 'easy', is_correct: null, time_spent: 0 },
    ]
    render(<ExamResultCharts questions={questions} />)
    expect(screen.getByText('Ungraded')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })
})
