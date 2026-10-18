import '@fontsource/source-serif-4/500.css';
import '@fontsource/source-serif-4/600.css';
import '@fontsource/source-serif-4/700.css';
import '@fontsource/source-sans-3/400.css';
import '@fontsource/source-sans-3/500.css';
import '@fontsource/source-sans-3/600.css';
import '@fontsource/source-sans-3/700.css';
import '@fontsource/source-code-pro/400.css';
import '../styles/tokens.css';
import '../styles/screens.css';
import '../styles/app.css';
import { SessionProvider } from '@/lib/session';

export const metadata = { title: 'Credstone Learning', description: 'Learn what your work needs. Prove you can do it.' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <body><SessionProvider>{children}</SessionProvider></body>
    </html>
  );
}
