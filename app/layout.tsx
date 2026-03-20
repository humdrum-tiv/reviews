import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import Navigation from '@/components/Navigation'

export const metadata: Metadata = {
  title: 'Reviews',
  description: 'Guided daily, weekly, and annual personal reviews',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider signInUrl="/sign-in">
      <html lang="en">
        <body>
          <Navigation />
          <main className="main-content">
            {children}
          </main>
        </body>
      </html>
    </ClerkProvider>
  )
}
