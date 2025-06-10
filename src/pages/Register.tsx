import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthLayout from '../components/AuthLayout'; // Asegúrate que la ruta sea correcta

export default function Register() {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // no olvidar cambiar  : https://figmaproclone-backend-vow0.onrender.com
      await axios.post('https://figmaproclone-backend-vow0.onrender.com/api/auth/register', { nombre, email, password });
      navigate('/login');
    } catch (err) {
      console.error(err);
      alert('Error al registrar');
    }
  };

  return (
    <AuthLayout>
      <form onSubmit={handleRegister} className="space-y-6">
        <h2 className="text-2xl text-center font-light mb-4">Registrarse</h2>
        <Input label="Nombre" value={nombre} onChange={setNombre} />
        <Input label="Correo" type="email" value={email} onChange={setEmail} />
        <Input label="Contraseña" type="password" value={password} onChange={setPassword} />
        <button type="submit" className="w-full py-3 rounded bg-[#1ab188] hover:bg-[#159b74] transition text-lg">
          Registrarse
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
