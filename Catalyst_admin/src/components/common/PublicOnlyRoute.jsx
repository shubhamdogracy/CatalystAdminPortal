import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ROLE_HOME = {
  mentor:     '/mentor/dashboard',
  operations: '/operations/dashboard',
};

export default function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to={ROLE_HOME[user.role] || '/'} replace /> : children;
}
