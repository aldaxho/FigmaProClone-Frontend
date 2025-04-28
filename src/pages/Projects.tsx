import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';

interface Proyecto {
  id: number;
  nombre: string;
  proyectoNombre: string;
  emisorNombre: string;
  descripcion: string;
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

 //const token = localStorage.getItem('token');

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
        descripcion: JSON.stringify([]), // inicializamos vacío
      });
      setProyectos((prev) => [...prev, res.data]);
      setNombre('');
    } catch (err) {
      console.error(err);
      alert('Error al crear el proyecto');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`/projects/${id}`);
      setProyectos((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
      alert('Error al eliminar el proyecto');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tus Proyectos</h1>
        <button onClick={handleLogout} className="text-sm text-red-600 underline">
          Cerrar sesión
        </button>
      </div>

      <form onSubmit={handleCreate} className="space-y-3 mb-6">
        <input
          type="text"
          placeholder="Nombre del proyecto"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          className="border w-full px-3 py-2"
        />
        <button className="bg-blue-600 text-white px-4 py-2 rounded" type="submit">
          Crear Proyecto
        </button>
      </form>

      <ul className="space-y-4">
        {proyectos.map((p) => (
          <li key={p.id} className="border p-4 rounded shadow-sm">
            <div className="flex justify-between items-center">
              <h2
                className="text-lg font-semibold cursor-pointer text-blue-700 hover:underline"
                onClick={() => navigate(`/editor/${p.id}`)}
              >
                {p.nombre}
              </h2>
              <button className="text-sm text-red-500" onClick={() => handleDelete(p.id)}>
                Eliminar
              </button>
            </div>
          </li>
        ))}
      </ul>
      {invitaciones.length > 0 && (
  <div className="mt-10">
    <h2 className="text-xl font-semibold mb-4">📨 Invitaciones pendientes</h2>
    <ul className="space-y-3">
      {invitaciones.map((inv) => (
        <li key={inv.id} className="border p-4 rounded shadow-sm">
          <p className="text-sm">Proyecto: <strong>{inv.proyectoNombre}</strong></p>
          <p className="text-sm text-gray-600">Invitado por: {inv.emisorNombre}</p>
          <div className="flex gap-2 mt-2">
            <button className="bg-green-500 text-white px-3 py-1 rounded text-sm"
              onClick={async () => {
                try {
                  await axios.post(`/projects/invitations/${inv.id}/accept`);
                  setInvitaciones((prev) => prev.filter((i) => i.id !== inv.id));
                  await fetchProjects(); 
                } catch (err) {
                  console.error(err);
                  alert('Error al aceptar la invitación');
                }
              }}
            >
              Aceptar
            </button>
          </div>
        </li>
      ))}
    </ul>
  </div>
)}

    </div>
  );
}
