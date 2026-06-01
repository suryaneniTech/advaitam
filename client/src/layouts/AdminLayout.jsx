import { NavLink, Outlet } from 'react-router-dom';
import UserMenu from '../components/UserMenu';

const navItems = [
  { to: '/admin', label: 'Home', end: true },
  { to: '/admin/users', label: 'Users' },
];

export default function AdminLayout() {
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <div className="sidebar-brand sidebar-brand-desktop">
          <span className="brand-mark sm">A</span>
          <span>Advaitam</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `sidebar-link${isActive ? ' active' : ''}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="shell-main">
        <header className="topbar topbar-admin">
          <div className="topbar-brand topbar-brand-mobile">
            <span className="brand-mark sm">A</span>
            <span>Advaitam</span>
          </div>
          <div className="topbar-spacer" aria-hidden="true" />
          <div className="topbar-actions">
            <UserMenu />
          </div>
        </header>

        <main className="dashboard-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
