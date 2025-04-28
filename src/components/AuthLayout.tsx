import { ReactNode } from 'react';
import { useLocation, Link } from 'react-router-dom';
import '../index.css';
export default function AuthLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="bg-[#13232f] max-w-md mx-auto mt-12 p-8 rounded-lg shadow-lg text-white">
      {/* Tabs */}
      <div className="flex mb-6 border-b border-gray-600">
        <Link
          to="/login"
          className={`w-1/2 py-3 text-center text-lg font-semibold ${
            pathname === '/login' ? 'bg-[#1ab188] text-white' : 'bg-[#2f3e4e] text-gray-400'
          }`}
        >
          Iniciar Sesión
        </Link>
        <Link
          to="/register"
          className={`w-1/2 py-3 text-center text-lg font-semibold ${
            pathname === '/register' ? 'bg-[#1ab188] text-white' : 'bg-[#2f3e4e] text-gray-400'
          }`}
        >
          Registrarse
        </Link>
      </div>

      {/* Formulario (login o register) */}
      {children}
    </div>
  );
}
