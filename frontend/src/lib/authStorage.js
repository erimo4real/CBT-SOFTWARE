import Cookies from 'js-cookie';

const TOKEN_KEY = 'cbt_tokens';
const USER_KEY = 'cbt_user';
const COOKIE_OPTIONS = {
  path: '/',
  sameSite: window.location.protocol === 'https:' ? 'lax' : 'lax',
  secure: window.location.protocol === 'https:',
};

export const authStorage = {
  getTokens() {
    const raw = Cookies.get(TOKEN_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },

  setTokens(tokens) {
    Cookies.set(TOKEN_KEY, JSON.stringify(tokens), {
      ...COOKIE_OPTIONS,
      expires: 30,
    });
  },

  removeTokens() {
    Cookies.remove(TOKEN_KEY, { path: '/' });
  },

  getUser() {
    const raw = Cookies.get(USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },

  setUser(user) {
    Cookies.set(USER_KEY, JSON.stringify(user), {
      ...COOKIE_OPTIONS,
      expires: 30,
    });
  },

  removeUser() {
    Cookies.remove(USER_KEY, { path: '/' });
  },

  clear() {
    this.removeTokens();
    this.removeUser();
  },
};
