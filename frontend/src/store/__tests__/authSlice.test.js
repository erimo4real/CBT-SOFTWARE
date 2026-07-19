import { describe, it, expect, vi, beforeEach } from 'vitest'
import authReducer, {
  logout, setTokens, setUser, updateUser, clearError,
  selectUser, selectAuthLoading, selectAuthError,
  selectIsAuthenticated, selectIsStudent, selectIsInstructor, selectIsAdmin,
} from '@/store/slices/authSlice'
import { loginUser, registerUser, fetchProfile, googleLogin } from '@/store/slices/authSlice'

vi.mock('@/lib/authStorage', () => ({
  authStorage: {
    getTokens: vi.fn(() => null),
    setTokens: vi.fn(),
    removeTokens: vi.fn(),
    getUser: vi.fn(() => null),
    setUser: vi.fn(),
    removeUser: vi.fn(),
    clear: vi.fn(),
  },
}))

const initialState = { user: null, loading: false, error: null }

function rejectedAction(asyncThunk, payload) {
  return { type: asyncThunk.rejected.type, payload }
}

describe('authSlice reducers', () => {
  it('returns initial state', () => {
    expect(authReducer(undefined, { type: 'init' })).toEqual(initialState)
  })

  it('logout clears state', () => {
    const state = { user: { id: 1 }, loading: true, error: 'err' }
    const next = authReducer(state, logout())
    expect(next.user).toBeNull()
    expect(next.loading).toBe(false)
    expect(next.error).toBeNull()
  })

  it('setUser sets user and stops loading', () => {
    const next = authReducer(initialState, setUser({ id: 1 }))
    expect(next.user).toEqual({ id: 1 })
    expect(next.loading).toBe(false)
  })

  it('updateUser updates user', () => {
    const state = { ...initialState, user: { id: 1, name: 'old' } }
    const next = authReducer(state, updateUser({ id: 1, name: 'new' }))
    expect(next.user.name).toBe('new')
  })

  it('clearError clears error', () => {
    const state = { ...initialState, error: 'some error' }
    const next = authReducer(state, clearError())
    expect(next.error).toBeNull()
  })

  it('setTokens does not change user/loading/error', () => {
    const state = { ...initialState, user: { id: 1 } }
    const next = authReducer(state, setTokens({ access: 'x', refresh: 'y' }))
    expect(next.user).toEqual({ id: 1 })
  })
})

describe('authSlice extraReducers', () => {
  it('loginUser.pending sets loading true', () => {
    const next = authReducer(initialState, loginUser.pending())
    expect(next.loading).toBe(true)
    expect(next.error).toBeNull()
  })

  it('loginUser.fulfilled sets user', () => {
    const payload = { id: 1, email: 'a@b.com' }
    const next = authReducer(initialState, loginUser.fulfilled(payload))
    expect(next.user).toEqual(payload)
    expect(next.loading).toBe(false)
  })

  it('loginUser.rejected sets error', () => {
    const next = authReducer(initialState, rejectedAction(loginUser, 'bad'))
    expect(next.error).toBe('bad')
    expect(next.loading).toBe(false)
  })

  it('registerUser.pending sets loading', () => {
    expect(authReducer(initialState, registerUser.pending()).loading).toBe(true)
  })

  it('registerUser.fulfilled sets user', () => {
    const next = authReducer(initialState, registerUser.fulfilled({ id: 2 }))
    expect(next.user.id).toBe(2)
  })

  it('registerUser.rejected sets error', () => {
    const next = authReducer(initialState, rejectedAction(registerUser, 'fail'))
    expect(next.error).toBe('fail')
  })

  it('fetchProfile.pending sets loading', () => {
    expect(authReducer(initialState, fetchProfile.pending()).loading).toBe(true)
  })

  it('fetchProfile.fulfilled sets user', () => {
    const next = authReducer(initialState, fetchProfile.fulfilled({ id: 3 }))
    expect(next.user.id).toBe(3)
    expect(next.loading).toBe(false)
  })

  it('fetchProfile.rejected clears user', () => {
    const state = { ...initialState, user: { id: 3 } }
    const next = authReducer(state, rejectedAction(fetchProfile, 'expired'))
    expect(next.user).toBeNull()
    expect(next.error).toBe('expired')
  })

  it('googleLogin.pending sets loading', () => {
    expect(authReducer(initialState, googleLogin.pending()).loading).toBe(true)
  })

  it('googleLogin.fulfilled sets user', () => {
    const next = authReducer(initialState, googleLogin.fulfilled({ id: 4 }))
    expect(next.user.id).toBe(4)
  })

  it('googleLogin.rejected sets error', () => {
    const next = authReducer(initialState, rejectedAction(googleLogin, 'err'))
    expect(next.error).toBe('err')
  })
})

describe('authSlice selectors', () => {
  const state = {
    auth: { user: { id: 1, role: 'student' }, loading: false, error: null },
  }

  it('selectUser returns user', () => {
    expect(selectUser(state)).toEqual({ id: 1, role: 'student' })
  })

  it('selectAuthLoading returns loading', () => {
    expect(selectAuthLoading(state)).toBe(false)
  })

  it('selectAuthError returns error', () => {
    expect(selectAuthError(state)).toBeNull()
  })

  it('selectIsAuthenticated returns true when user exists', () => {
    expect(selectIsAuthenticated(state)).toBe(true)
  })

  it('selectIsAuthenticated returns false when no user', () => {
    expect(selectIsAuthenticated({ auth: { user: null } })).toBe(false)
  })

  it('selectIsStudent returns true for student role', () => {
    expect(selectIsStudent(state)).toBe(true)
  })

  it('selectIsInstructor returns false for student', () => {
    expect(selectIsInstructor(state)).toBe(false)
  })

  it('selectIsAdmin returns false for student', () => {
    expect(selectIsAdmin(state)).toBe(false)
  })

  it('selectIsInstructor returns true for instructor', () => {
    const instrState = { auth: { user: { role: 'instructor' } } }
    expect(selectIsInstructor(instrState)).toBe(true)
  })

  it('selectIsAdmin returns true for admin', () => {
    const adminState = { auth: { user: { role: 'admin' } } }
    expect(selectIsAdmin(adminState)).toBe(true)
  })
})
