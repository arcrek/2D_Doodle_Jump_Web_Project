import { I18nProvider } from './i18n/I18nContext.jsx';
import GamePage from './pages/GamePage.jsx';

export default function App() {
  return (
    <I18nProvider>
      <main><GamePage /></main>
    </I18nProvider>
  );
}
