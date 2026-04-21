import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/useAuth';
import { Loader } from 'lucide-react';

export default function SystemAdminGuard({ children }) {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const isSystemAdmin =
    profile?.role === 'system_admin' || profile?.role === 'admin';

  if (!isSystemAdmin) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return children;
}
