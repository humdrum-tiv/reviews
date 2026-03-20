'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navigation() {
  const pathname = usePathname()

  const links = [
    { href: '/', label: 'Today' },
    { href: '/history', label: 'Archive' },
    { href: '/settings', label: 'Settings' },
  ]

  return (
    <nav className="nav-bar">
      <div className="nav-inner">
        <Link href="/" className="nav-wordmark">
          reviews
        </Link>
        <div className="nav-links">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`nav-link ${pathname === href ? 'nav-link--active' : ''}`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
