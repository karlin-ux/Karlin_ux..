import { Navigate } from 'react-router-dom';
import React from 'react';
import { useAuth } from '../auth/AuthContext';

export function RequireAuth({ children }: { children: React.ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-6">Loading…</div>;
  if (!user) return <Navigate to="/signin" replace />;
  return children;
}

export function RequireSuper({ children }: { children: React.ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-6">Loading…</div>;
  if (!user || !user.is_superadmin) return <Navigate to="/" replace />;
  return children;
}