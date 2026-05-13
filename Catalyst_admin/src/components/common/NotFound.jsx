import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ROLE_HOME = {
  mentor:     '/mentor/dashboard',
  operations: '/operations/dashboard',
};

export default function NotFound() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGoHome = () => {
    navigate(user ? (ROLE_HOME[user.role] || '/') : '/');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center px-4">
      <div className="text-[120px] font-black text-gray-200 leading-none mb-4 select-none">404</div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Page not found</h1>
      <p className="text-gray-500 mb-8 max-w-sm text-[15px]">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <button
        onClick={handleGoHome}
        className="px-6 py-2.5 bg-[#0d9488] text-white text-[14px] font-semibold rounded-xl hover:bg-[#0f766e] transition-colors"
      >
        {user ? 'Go to Dashboard' : 'Go to Login'}
      </button>
    </div>
  );
}
