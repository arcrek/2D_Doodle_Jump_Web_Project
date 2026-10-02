import React, { createContext, useContext, useSyncExternalStore, useMemo } from 'react';
import {
  t as coreT,
  getLocale,
  setLocale,
  subscribe,
  SUPPORTED_LOCALES,
  LOCALE_LABELS,
} from './index.js';

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const locale = useSyncExternalStore(subscribe, getLocale, () => 'en');

  const value = useMemo(() => ({
    locale,
    setLocale,
    locales: SUPPORTED_LOCALES,
    labels: LOCALE_LABELS,
    t: (key, params) => coreT(key, params),
  }), [locale]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  const standaloneLocale = useSyncExternalStore(subscribe, getLocale, () => 'en');

  if (!context) {
    return {
      locale: standaloneLocale,
      setLocale,
      locales: SUPPORTED_LOCALES,
      labels: LOCALE_LABELS,
      t: (key, params) => coreT(key, params),
    };
  }
  return context;
}
