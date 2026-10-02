import React from 'react';
import { useTranslation } from '../i18n/I18nContext.jsx';

export default function LanguageSwitcher({ className = '' }) {
  const { locale, setLocale, locales, labels, t } = useTranslation();

  return (
    <div
      className={`language-switcher-group ${className}`}
      role="group"
      aria-label={t('aria.language_switcher')}
    >
      {locales.map((lang) => {
        const isActive = locale === lang;
        return (
          <button
            key={lang}
            type="button"
            className={`lang-btn ${isActive ? 'is-active' : ''}`}
            aria-pressed={isActive}
            aria-label={t(`aria.lang_${lang}`)}
            onClick={() => setLocale(lang)}
          >
            {labels[lang] || lang.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
