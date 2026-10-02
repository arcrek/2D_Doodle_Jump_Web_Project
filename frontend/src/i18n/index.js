import en from '../locales/en.json' with { type: 'json' };
import vi from '../locales/vi.json' with { type: 'json' };
import fr from '../locales/fr.json' with { type: 'json' };

export const SUPPORTED_LOCALES = ['en', 'vi', 'fr'];
export const DEFAULT_LOCALE = 'en';
export const STORAGE_KEY = 'doodle_jump_locale';

export const LOCALE_LABELS = {
  en: 'EN',
  vi: 'VI',
  fr: 'FR',
};

const dictionaries = {
  en,
  vi,
  fr,
};

function getStoredLocale() {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && SUPPORTED_LOCALES.includes(stored)) {
        return stored;
      }
    }
  } catch {
    // Ignore storage access errors
  }
  return DEFAULT_LOCALE;
}

let currentLocale = getStoredLocale();
const subscribers = new Set();

export function getLocale() {
  return currentLocale;
}

export function setLocale(locale) {
  if (!SUPPORTED_LOCALES.includes(locale)) {
    return false;
  }
  if (currentLocale === locale) {
    return true;
  }
  currentLocale = locale;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, locale);
    }
  } catch {
    // Ignore storage write errors
  }
  subscribers.forEach((fn) => {
    try {
      fn(currentLocale);
    } catch {
      // Prevent subscriber exceptions from breaking caller
    }
  });
  return true;
}

export function subscribe(callback) {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

function resolvePath(obj, path) {
  if (!obj || typeof obj !== 'object') return undefined;
  const parts = path.split('.');
  let curr = obj;
  for (const part of parts) {
    if (curr == null || typeof curr !== 'object') return undefined;
    curr = curr[part];
  }
  return typeof curr === 'string' ? curr : undefined;
}

export function t(key, params) {
  if (!key || typeof key !== 'string') return '';

  let text = resolvePath(dictionaries[currentLocale], key);
  if (text === undefined && currentLocale !== DEFAULT_LOCALE) {
    text = resolvePath(dictionaries[DEFAULT_LOCALE], key);
  }
  if (text === undefined) {
    return key;
  }

  if (params && typeof params === 'object') {
    return text.replace(/\{(\w+)\}/g, (match, paramKey) => {
      return Object.hasOwn(params, paramKey) && params[paramKey] !== undefined
        ? String(params[paramKey])
        : match;
    });
  }

  return text;
}
