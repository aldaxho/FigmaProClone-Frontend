import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { toast, Toaster } from 'react-hot-toast';

interface Proyecto {
  id: number;
  nombre: string;
  proyectoNombre: string;
  emisorNombre: string;
  descripcion: string;
  tipo: string;
}
interface Invitacion {
  id: number;
  proyectoNombre: string;
  emisorNombre: string;
}

export default function Projects() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [nombre, setNombre] = useState('');
  const navigate = useNavigate();
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([]);
  const [tipo, setTipo] = useState('flutter-mobile');
  const fetchProjects = async () => {
    try {
      const res = await axios.get('/projects');
      setProyectos(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    const fetchInvitaciones = async () => {
      try {
        const res = await axios.get('/projects/invitaciones/pendientes');
        setInvitaciones(res.data);
      } catch (err) {
        console.error('Error al obtener invitaciones', err);
      }
    };
    fetchInvitaciones();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('/projects', {
        nombre,
        descripcion: JSON.stringify([]),
        tipo,
      });
      setProyectos((prev) => [...prev, res.data]);
      setNombre('');
      toast.success('✅ Proyecto creado exitosamente');
    } catch (err) {
      console.error(err);
      toast.error('❌ Error al crear el proyecto');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`/projects/${id}`);
      setProyectos((prev) => prev.filter((p) => p.id !== id));
      toast('🗑️ Proyecto eliminado', { icon: '🗑️' });
    } catch (err) {
      console.error(err);
      toast.error('❌ Error al eliminar el proyecto');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="max-w-4xl mx-auto p-8 min-h-screen">
  <Toaster position="top-right" reverseOrder={false} />

  <div className="flex justify-between items-center mb-8">
    <h1 className="text-4xl font-bold">🚀 Tus Proyectos</h1>
    <button
      onClick={handleLogout}
      className="hover:bg-red-600 bg-red-500 px-4 py-2 rounded-lg shadow-md"
    >
      Cerrar sesión
    </button>
  </div>

  <div className=" rounded-2xl p-8 shadow-xl flex flex-col items-center">
    <form onSubmit={handleCreate} className="flex flex-col items-center gap-4 w-full mb-8">
      <input
        type="text"
        placeholder="Nombre del proyecto"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        required
        className="w-full max-w-md shadow-md"
      />
      <select
  value={tipo}
  onChange={(e) => setTipo(e.target.value)}
  className="w-full max-w-md shadow-md"
>
  <option value="flutter-mobile">Flutter Móvil</option>
  <option value="web">Web</option>
  <option value="otro">Otro</option>
</select>

      <button
        type="submit"
        className="w-full max-w-md bg-green-600 hover:bg-green-700 shadow-md py-3 rounded-lg text-lg font-semibold"
      >
        Crear
      </button>
    </form>

    <div className="w-full flex flex-col items-center gap-6">
      {proyectos.map((p) => (
        <div
          key={p.id}
          className="bg-[#0a1412] w-full max-w-md p-6 rounded-lg shadow-md hover:shadow-green-400/50 transition-all duration-300 cursor-pointer"
          onClick={() => {
            if (p.tipo === 'flutter-mobile') {
              navigate(`/flutter-editor/${p.id}`);
            } else {
              navigate(`/editor/${p.id}`);
            }
          }}

        >
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-green-200">{p.nombre}</h2>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(p.id);
              }}
              className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-md text-sm shadow-md"
            >
              Eliminar
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>

  {invitaciones.length > 0 && (
    <div className="mt-16">
      <h2 className="text-2xl font-bold mb-6 text-green-100">📨 Invitaciones Pendientes</h2>
      <div className="flex flex-col items-center gap-6">
        {invitaciones.map((inv) => (
          <div
            key={inv.id}
            className="bg-[#0a1412] w-full max-w-md p-6 rounded-lg shadow-md hover:shadow-green-400/50 transition-all duration-300 cursor-pointer"
          >
            <p className="text-green-300 mb-2">Proyecto: <span className="font-semibold">{inv.proyectoNombre}</span></p>
            <p className="text-green-500 text-sm mb-4">Invitado por: {inv.emisorNombre}</p>
            <div className="flex justify-end">
              <button
                className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded-lg text-sm font-semibold shadow-md"
                onClick={async () => {
                  try {
                    await axios.post(`/projects/invitations/${inv.id}/accept`);
                    setInvitaciones((prev) => prev.filter((i) => i.id !== inv.id));
                    await fetchProjects();
                    toast.success('🎉 Invitación aceptada');
                  } catch (err) {
                    console.error(err);
                    toast.error('❌ Error al aceptar la invitación');
                  }
                }}
              >
                Aceptar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )}
</div>

  
  );
}
