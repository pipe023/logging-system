import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center h-screen text-center p-8">
      <h1 className="text-6xl font-bold mb-4">404</h1>
      <p className="text-xl mb-8">Oops! The page you are looking for does not exist.</p>
      <button 
        onClick={() => navigate('/')} 
        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold"
      >
        Return Home
      </button>
    </div>
  );
}