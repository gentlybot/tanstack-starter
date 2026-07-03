import { Link } from '@tanstack/react-router'

// Site-wide nav. Add an entry here when you add a page in src/routes/.
const links = [
  { to: '/', label: 'Home' },
  { to: '/tasks', label: 'Tasks' },
  { to: '/chat', label: 'Chat' },
  { to: '/about', label: 'About' },
] as const

export default function Header() {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-4xl items-center gap-6 px-4">
        <Link to="/" className="font-semibold tracking-tight">
          TanStack Starter
        </Link>
        <nav className="flex gap-1 text-sm">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              activeProps={{ className: 'bg-accent text-accent-foreground' }}
              activeOptions={{ exact: link.to === '/' }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
