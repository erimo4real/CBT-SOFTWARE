import '@testing-library/jest-dom'
import { vi } from 'vitest'
import React from 'react'

vi.mock('js-cookie', () => ({
  default: {
    get: vi.fn(() => null),
    set: vi.fn(),
    remove: vi.fn(),
  },
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  Toaster: () => null,
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  const Link = ({ children, to }) => React.createElement('a', { href: to }, children)
  const NavLink = ({ children, to }) => React.createElement('a', { href: to }, children)
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }),
    useParams: () => ({}),
    Link,
    NavLink,
    BrowserRouter: ({ children }) => React.createElement('div', null, children),
  }
})
