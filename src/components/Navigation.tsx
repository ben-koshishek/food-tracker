import { NavLink, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/log', label: 'Daily Log' },
  { to: '/my-foods', label: 'My Foods' },
  { to: '/templates', label: 'Templates' },
  { to: '/settings', label: 'Settings' },
];

export function Navigation() {
  return (
    <nav className="border-b bg-card shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg hover:text-primary transition-colors">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" className="w-9 h-9 object-contain" />
            Food Tracker
          </Link>
          <div className="flex gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
