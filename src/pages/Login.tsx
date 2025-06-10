import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthLayout from '../components/AuthLayout';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      //no olvidar cambiar ruta : https://figmaproclone-backend-vow0.onrender.com
      const res = await axios.post('https://figmaproclone-backend-vow0.onrender.com/api/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem("user",  JSON.stringify(res.data.user)); // 👈 nuevo

      
      navigate('/projects');
    } catch (err) {
        console.error(err);
      alert('Credenciales incorrectas');
    }
  };

  return (
    <AuthLayout>
      <form onSubmit={handleLogin} className="space-y-6">
        <h2 className="text-2xl text-center font-light mb-4">Iniciar Sesión</h2>
        <Input label="Usuario" value={email} onChange={setEmail} type="email" />
        <Input label="Contraseña" value={password} onChange={setPassword} type="password" />
        <div className="text-right text-sm text-[#1ab188] hover:underline cursor-pointer">
          ¿Se te olvidó la contraseña?
        </div>
        <button type="submit" className="w-full py-3 rounded bg-[#1ab188] hover:bg-[#159b74] transition text-lg">
          Iniciar Sesión
        </button>
      </form>
    </AuthLayout>
  );
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
}) {
  return (
    <div className="relative">
      <label className="block text-sm text-gray-300 mb-1">
        {label} <span className="text-[#1ab188]">*</span>
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="w-full px-3 py-2 bg-transparent border border-gray-600 rounded text-white focus:outline-none focus:border-[#1ab188]"
      />
    </div>
  );
}
