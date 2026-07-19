import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { MemoryRouter } from 'react-router-dom'
import authReducer from '@/store/slices/authSlice'
import { ProtectedRoute, StudentRoute, GuestRoute } from '@/components/ProtectedRoute'

function renderWithStore(ui, preloadedState, route = '/') {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState,
  })
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </Provider>
  )
}

describe('ProtectedRoute', () => {
  it('shows loading screen when loading', () => {
    renderWithStore(
      <ProtectedRoute><div>content</div></ProtectedRoute>,
      { auth: { user: null, loading: true, error: null } }
    )
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('redirects to /login when not authenticated', () => {
    const { container } = renderWithStore(
      <ProtectedRoute><div>content</div></ProtectedRoute>,
      { auth: { user: null, loading: false, error: null } }
    )
    expect(screen.queryByText('content')).not.toBeInTheDocument()
  })

  it('renders children when authenticated', () => {
    renderWithStore(
      <ProtectedRoute><div>secret content</div></ProtectedRoute>,
      { auth: { user: { id: 1, role: 'student' }, loading: false, error: null } }
    )
    expect(screen.getByText('secret content')).toBeInTheDocument()
  })

  it('redirects when role not in allowed roles', () => {
    renderWithStore(
      <ProtectedRoute roles={['admin']}><div>admin content</div></ProtectedRoute>,
      { auth: { user: { id: 1, role: 'student' }, loading: false, error: null } }
    )
    expect(screen.queryByText('admin content')).not.toBeInTheDocument()
  })

  it('renders children when role matches', () => {
    renderWithStore(
      <ProtectedRoute roles={['admin', 'instructor']}><div>staff content</div></ProtectedRoute>,
      { auth: { user: { id: 1, role: 'admin' }, loading: false, error: null } }
    )
    expect(screen.getByText('staff content')).toBeInTheDocument()
  })
})

describe('StudentRoute', () => {
  it('redirects to /student/login when not authenticated', () => {
    renderWithStore(
      <StudentRoute><div>student content</div></StudentRoute>,
      { auth: { user: null, loading: false, error: null } }
    )
    expect(screen.queryByText('student content')).not.toBeInTheDocument()
  })

  it('redirects non-student users', () => {
    renderWithStore(
      <StudentRoute><div>student content</div></StudentRoute>,
      { auth: { user: { id: 1, role: 'admin' }, loading: false, error: null } }
    )
    expect(screen.queryByText('student content')).not.toBeInTheDocument()
  })

  it('renders children for student', () => {
    renderWithStore(
      <StudentRoute><div>student content</div></StudentRoute>,
      { auth: { user: { id: 1, role: 'student' }, loading: false, error: null } }
    )
    expect(screen.getByText('student content')).toBeInTheDocument()
  })
})

describe('GuestRoute', () => {
  it('renders children when not authenticated', () => {
    renderWithStore(
      <GuestRoute><div>guest content</div></GuestRoute>,
      { auth: { user: null, loading: false, error: null } }
    )
    expect(screen.getByText('guest content')).toBeInTheDocument()
  })

  it('redirects authenticated users', () => {
    renderWithStore(
      <GuestRoute><div>guest content</div></GuestRoute>,
      { auth: { user: { id: 1, role: 'student' }, loading: false, error: null } }
    )
    expect(screen.queryByText('guest content')).not.toBeInTheDocument()
  })
})
