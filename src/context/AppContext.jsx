'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations } from './translations.js';

// ─── Language Context ─────────────────────────────────────────────────────────
const LangContext = createContext();

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('sc_lang') || 'en');
  const isRTL = lang === 'ar';
  const t = (key) => translations[lang]?.[key] || translations['en']?.[key] || key;

  const toggleLang = () => {
    const next = lang === 'en' ? 'ar' : 'en';
    setLang(next);
    localStorage.setItem('sc_lang', next);
  };

  useEffect(() => {
    document.documentElement.dir  = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang, isRTL]);

  return (
    <LangContext.Provider value={{ lang, t, isRTL, toggleLang }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);

// ─── Auth Context ─────────────────────────────────────────────────────────────
const AuthContext = createContext();

// Works with both CRA (process.env.REACT_APP_*) and Vite (import.meta.env.VITE_*)
// Next.js: API routes are served from same origin at /api
const API_URL = '/api';

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(() => localStorage.getItem('sc_token'));
  const [loading, setLoading] = useState(true);

  const doLogout = useCallback(() => {
    localStorage.removeItem('sc_token');
    setToken(null);
    setUser(null);
  }, []);

  const fetchMe = useCallback(async (tok) => {
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        doLogout();
      }
    } catch {
      doLogout();
    } finally {
      setLoading(false);
    }
  }, [doLogout]);

  useEffect(() => {
    if (token) fetchMe(token);
    else       setLoading(false);
  }, [token, fetchMe]);

  const login = (newToken, userData) => {
    localStorage.setItem('sc_token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout: doLogout, isAuth: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
