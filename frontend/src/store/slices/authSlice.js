import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authAPI } from '@/api/auth';
import { authStorage } from '@/lib/authStorage';

export const fetchProfile = createAsyncThunk(
  'auth/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authAPI.getProfile();
      authStorage.setUser(response.data);
      return response.data;
    } catch {
      authStorage.clear();
      return rejectWithValue('Session expired');
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await authAPI.login({ email, password });
      const { user: userData, tokens } = response.data;
      authStorage.setTokens(tokens);
      authStorage.setUser(userData);
      return userData;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Invalid credentials');
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (data, { rejectWithValue }) => {
    try {
      const response = await authAPI.register(data);
      const { user: userData, tokens } = response.data;
      authStorage.setTokens(tokens);
      authStorage.setUser(userData);
      return userData;
    } catch (err) {
      const msg = err.response?.data;
      const detail = typeof msg === 'object' ? Object.values(msg).flat().join(' ') : msg;
      return rejectWithValue(detail || 'Registration failed');
    }
  }
);

export const googleLogin = createAsyncThunk(
  'auth/googleLogin',
  async (token, { rejectWithValue }) => {
    try {
      const response = await authAPI.googleLogin(token);
      const { user: userData, tokens } = response.data;
      authStorage.setTokens(tokens);
      authStorage.setUser(userData);
      return userData;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Google login failed');
    }
  }
);

const storedUser = authStorage.getUser();

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: storedUser,
    loading: !!storedUser,
    error: null,
  },
  reducers: {
    logout(state) {
      state.user = null;
      state.loading = false;
      state.error = null;
      authStorage.clear();
    },
    setTokens(state, action) {
      authStorage.setTokens(action.payload);
    },
    setUser(state, action) {
      state.user = action.payload;
      state.loading = false;
      authStorage.setUser(action.payload);
    },
    updateUser(state, action) {
      state.user = action.payload;
      authStorage.setUser(action.payload);
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfile.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.user = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.user = null;
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(googleLogin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(googleLogin.fulfilled, (state, action) => {
        state.user = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(googleLogin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { logout, setTokens, setUser, updateUser, clearError } = authSlice.actions;

export const selectUser = (state) => state.auth.user;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;
export const selectIsAuthenticated = (state) => !!state.auth.user;
export const selectIsStudent = (state) => state.auth.user?.role === 'student';
export const selectIsInstructor = (state) => state.auth.user?.role === 'instructor';
export const selectIsAdmin = (state) => state.auth.user?.role === 'admin';

export default authSlice.reducer;
