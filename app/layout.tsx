import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import Navigation from '@/components/Navigation'
import { ThemeProvider } from '@/components/ThemeProvider'

export const metadata: Metadata = {
  title: 'Reviews',
  description: 'Guided daily, weekly, and annual personal reviews',
}

// Inline script runs before React hydration to prevent flash of wrong theme.
const antiFlashScript = `
(function(){try{
  var t=localStorage.getItem('ui-theme')||'stone';
  var m=localStorage.getItem('ui-mode')||'system';
  var r=m==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):m;
  document.documentElement.setAttribute('data-theme',t);
  document.documentElement.setAttribute('data-mode',r);
}catch(e){}})();
`.trim()

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider signInUrl="/sign-in">
      <html lang="en" data-theme="stone" data-mode="light">
        <head>
          <script dangerouslySetInnerHTML={{ __html: antiFlashScript }} />
        </head>
        <body>
          <ThemeProvider>
            <Navigation />
            <main className="main-content">
              {children}
            </main>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
