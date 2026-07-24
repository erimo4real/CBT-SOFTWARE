import Cookies from 'js-cookie';

const TOKEN_KEY = 'cbt_tokens';
const USER_KEY = 'cbt_user';
const REMEMBER_KEY = 'cbt_remember';
const COOKIE_OPTIONS = {
  path: '/',
  sameSite: window.location.protocol === 'https:' ? 'lax' : 'lax',
  secure: window.location.protocol === 'https:',
};

function _cookieOpts(remember) {
  return remember ? { ...COOKIE_OPTIONS, expires: 30 } : { ...COOKIE_OPTIONS };
}

export const authStorage = {
  getTokens() {
    const raw = Cookies.get(TOKEN_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },

  setTokens(tokens, remember = true) {
    Cookies.set(TOKEN_KEY, JSON.stringify(tokens), _cookieOpts(remember));
    Cookies.set(REMEMBER_KEY, 'true', _cookieOpts(remember));
  },

  removeTokens() {
    Cookies.remove(TOKEN_KEY, { path: '/' });
    Cookies.remove(REMEMBER_KEY, { path: '/' });
  },

  getUser() {
    const raw = Cookies.get(USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },

  setUser(user, remember) {
    if (remember === undefined) {
      remember = Cookies.get(REMEMBER_KEY) === 'true';
    }
    Cookies.set(USER_KEY, JSON.stringify(user), _cookieOpts(remember));
  },

  removeUser() {
    Cookies.remove(USER_KEY, { path: '/' });
  },

  clear() {
    this.removeTokens();
    this.removeUser();
  },
};
