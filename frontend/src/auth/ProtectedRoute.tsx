import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Loading from '../components/common/Loading';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth();

  if (isLoading) return <Loading />;
  if (!token) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
