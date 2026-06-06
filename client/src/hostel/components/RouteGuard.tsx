import { useEffect, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useHostelAuth } from '@hostel/hooks/useAuth';
import { getHostelBase, roleHome } from '@hostel/lib/basePath';
import type { Role } from '@hostel/types/auth';

export function RouteGuard({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const { user, loading } = useHostelAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const base = getHostelBase(pathname);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate(base, { replace: true });
    } else if (!allow.includes(user.role)) {
      navigate(roleHome(user.role, base), { replace: true });
    }
  }, [user, loading, allow, navigate, base]);

  if (loading || !user || !allow.includes(user.role)) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-500">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
