
"use client";

import { useState, useEffect, useRef } from "react";
import { Stage, Layer, Rect, Group, Text as KonvaText, Transformer } from "react-konva";
import Konva from "konva";
import { nanoid } from "nanoid";
import api from "../api/axios";
import { useParams } from "react-router-dom";


import socket from "../useSocket";

interface Shape {
  id: string;
  type: "rect" | "input" | "button" | "label";
  x: number;
  y: number;
  width?: number;
  height?: number;
  fill: string;
  text?: string;
  fontSize?: number;
  targetScreen?: string;
}

interface Screen {
  id: string;
  name: string;
  shapes: Shape[];
}

interface Usuario {
  id: number;
  nombre: string;
}

interface Invitacion {
  id: number;
  emisorId: number;
  emisorNombre: string;
  proyectoId: number;
  estado: 'pendiente' | 'aceptada' | 'rechazada';
}

export default function EditorApp() {
  const { id: projectId } = useParams();

  const [screens, setScreens] = useState<Screen[]>([{
    id: "Home",
    name: "Home",
    shapes: []
  }]);

  const [currentScreenId, setCurrentScreenId] = useState("Home");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [showSidebar, setShowSidebar] = useState(true);
  const [renamingTab, setRenamingTab] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; screenId: string } | null>(null);
  const [editingInput, setEditingInput] = useState<{ id: string; x: number; y: number; width: number } | null>(null);
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [emailInvitado, setEmailInvitado] = useState('');
  const [usuariosConectados, setUsuariosConectados] = useState<Usuario[]>([]);
  const currentScreen = screens.find((s) => s.id === currentScreenId);
 
  // ✅ Aquí TypeScript ya está seguro que currentScreen no es undefined
  const selectedShape = currentScreen?.shapes.find((shape) => shape.id === selectedId);
  const trRef = useRef<Konva.Transformer>(null);
  const shapeRefs = useRef<{ [key: string]: Konva.Group | Konva.Text }>({});
  const [showSketchModal, setShowSketchModal] = useState(false);
const [selectedFile, setSelectedFile] = useState<File | null>(null);
const [previewURL,  setPreviewURL]  = useState<string | null>(null);
  // Cargar proyecto
  useEffect(() => {
    const loadProject = async () => {
      try {
        const res = await api.get(`/projects/${projectId}`);
        const { descripcion } = res.data;
        const parsedScreens = descripcion ? JSON.parse(descripcion) : [];
  
        // Si no hay pantallas en la base de datos, usa una por defecto
        if (parsedScreens.length === 0) {
          const defaultScreen = { id: "Home", name: "Home", shapes: [] };
          setScreens([defaultScreen]);
          setCurrentScreenId(defaultScreen.id);
        } else {
          setScreens(parsedScreens);
          setCurrentScreenId(parsedScreens[0].id);
        }
      } catch (err) {
        console.error("Error al cargar el proyecto:", err);
      }
    };
  
    if (projectId) {
      loadProject();
    }
  }, [projectId]);



  /* Tamañi del canvas  */
  useEffect(() => {
    const updateSize = () => {
      setCanvasSize({
        width: window.innerWidth - (showSidebar ? 300 : 0),
        height: window.innerHeight - 64,
      });
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [showSidebar]);



  useEffect(() => {
    const usuario = JSON.parse(localStorage.getItem("user") || "{}");
    if (!usuario || !projectId) return;
  
    socket.emit("join-project", { projectId, user: usuario });

    return () => {
      socket.emit("leave-project", { projectId }); 
      
    };
  }, [projectId]);
  


  /* ---------- listeners globales de Socket.IO ---------- */
 /* ---------- listeners globales de Socket.IO ---------- */
useEffect(() => {
  if (!projectId) return;

  /* --- 1. usuarios conectados ------------------------ */
  const hUsers = (users: Usuario[]) => setUsuariosConectados(users);

  /* --- 2. shape move / resize ------------------------ */
  const hShapeUpdated = ({ screenId, shape }: { screenId: string; shape: Shape }) => {
    setScreens(prev =>
      prev.map(s =>
        s.id === screenId
          ? { ...s, shapes: s.shapes.map(sh => (sh.id === shape.id ? shape : sh)) }
          : s
      )
    );
  };

  /* --- 3. shape add / delete ------------------------- */
  const hShapeAdded = ({ screenId, shape }: { screenId: string; shape: Shape }) => {
    setScreens(prev =>
      prev.map(s =>
        s.id === screenId ? { ...s, shapes: [...s.shapes, shape] } : s
      )
    );
  };

  const hShapeDeleted = ({
    screenId,
    shapeId,
  }: {
    screenId: string;
    shapeId: string;
  }) => {
    setScreens(prev =>
      prev.map(s =>
        s.id === screenId
          ? { ...s, shapes: s.shapes.filter(sh => sh.id !== shapeId) }
          : s
      )
    );
  };

  /* --- 4. pantallas ---------------------------------- */
  const hScreenAdded = (screen: Screen) =>
    setScreens(prev => [...prev, screen]);

  const hScreenDeleted = (id: string) =>
    setScreens(prev => prev.filter(s => s.id !== id));

  const hScreenRenamed = ({ id, name }: { id: string; name: string }) =>
    setScreens(prev => prev.map(s => (s.id === id ? { ...s, name } : s)));

  /* --- 5. invitaciones / aviso de update ------------- */
  const hInvite = (inv: Invitacion) => {
    alert(`Nueva invitación de ${inv.emisorNombre}`);
    setInvitaciones(p => [...p, inv]);
  };
  const hShapeMoving = ({
    screenId,
    shapeId,
    x,
    y,
  }: {
    screenId: string;
    shapeId: string;
    x: number;
    y: number;
  }) => {
    setScreens(prev =>
      prev.map(s =>
        s.id === screenId
          ? {
              ...s,
              shapes: s.shapes.map(sh =>
                sh.id === shapeId ? { ...sh, x, y } : sh
              ),
            }
          : s
      )
    );
  };
  
  const hUpdated = () => alert("El proyecto ha sido actualizado por otro usuario");

  /* --- registro de todos los eventos ----------------- */
  socket.on("update-users",       hUsers);
  socket.on("shape-updated",      hShapeUpdated);
  socket.on("shape-added",        hShapeAdded);
  socket.on("shape-deleted",      hShapeDeleted);
  socket.on("screen-added",       hScreenAdded);
  socket.on("screen-deleted",     hScreenDeleted);
  socket.on("screen-renamed",     hScreenRenamed);
  socket.on("nueva-invitacion",   hInvite);
  socket.on("proyecto-actualizado", hUpdated);
  socket.on("shape-moving", hShapeMoving);


  /* --- limpieza al desmontar -------------------------- */
  return () => {
    socket.off("update-users",       hUsers);
    socket.off("shape-updated",      hShapeUpdated);
    socket.off("shape-added",        hShapeAdded);
    socket.off("shape-deleted",      hShapeDeleted);
    socket.off("screen-added",       hScreenAdded);
    socket.off("screen-deleted",     hScreenDeleted);
    socket.off("screen-renamed",     hScreenRenamed);
    socket.off("nueva-invitacion",   hInvite);
    socket.off("proyecto-actualizado", hUpdated);
    socket.off("shape-moving", hShapeMoving);
  };
}, [projectId]);



  useEffect(() => {
    if (!trRef.current || !selectedId) return;
    const node = shapeRefs.current[selectedId];
    if (node) {
      trRef.current.nodes([node]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [selectedId, currentScreenId, screens]);
  
  if (!currentScreen) {
    return <div className="p-6 text-red-500">⏳ Cargando pantalla...</div>;
  }
  
  
  

  /* ---------- helpers de edición ---------- */
  const updateShape = (id: string, updates: Partial<Shape>) => {
    setScreens((prev) =>
      prev.map((screen) =>
        screen.id === currentScreenId
          ? {
              ...screen,
              shapes: screen.shapes.map((sh) => (sh.id === id ? { ...sh, ...updates } : sh)),
            }
          : screen
      )
    );

    /* enviar al server */
    const base = currentScreen.shapes.find((sh) => sh.id === id);
    if (base && projectId) {
      socket.emit("update-shape", {
        projectId,
        screenId: currentScreenId,
        shape: { ...base, ...updates },
      });
    }
  };
 


 


  const deleteShape = () => {
    if (!selectedId) return;
    setScreens((prev) =>
      prev.map((screen) =>
        screen.id === currentScreenId
          ? {
              ...screen,
              shapes: screen.shapes.filter((shape) => shape.id !== selectedId),
            }
          : screen
      )
    );
    broadcastDeleteShape(selectedId); 
    setSelectedId(null);
  };
  const broadcastAddShape = (shape: Shape) => {
    if (projectId)
      socket.emit("add-shape", { projectId, screenId: currentScreenId, shape });
  };
  
  const broadcastDeleteShape = (shapeId: string) => {
    if (projectId)
      socket.emit("delete-shape", { projectId, screenId: currentScreenId, shapeId });
  };
  
  /* ------------------------------------------------------------------ */
/*  throttle tipado ≈ 30 fps                                          */
/* ------------------------------------------------------------------ */
function throttle<This, Args extends unknown[]>(
  fn: (this: This, ...args: Args) => void,
  ms: number
): (this: This, ...args: Args) => void {
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  return function (this: This, ...args: Args) {
    const now = Date.now();

    const invoke = () => {
      last = now;
      fn.apply(this, args);
    };

    if (now - last >= ms) {
      invoke();
    } else {
      if (timer) clearTimeout(timer);
      timer = setTimeout(invoke, ms - (now - last));
    }
  };
}

  
  /* emitir posición mientras se arrastra (máx. ≈30fps) */
  const emitDragPosition = throttle(
    (shapeId: string, x: number, y: number) => {
      if (projectId) {
        socket.emit("shape-moving", {
          projectId,
          screenId: currentScreenId,
          shapeId,
          x,
          y,
        });
      }
    },
    33 /* ms */
  );
  
  const addShapeToCurrentScreen = (shape: Shape) => {
    setScreens((prev) =>
      prev.map((screen) =>
        screen.id === currentScreenId
          ? { ...screen, shapes: [...screen.shapes, shape] }
          : screen
      )
    );
    broadcastAddShape(shape);
  };

  const addRectangle = () => {
    const offset = currentScreen.shapes.length * 30;
    addShapeToCurrentScreen({
      id: nanoid(),
      type: "rect",
      x: 50 + offset,
      y: 50 + offset,
      width: 120,
      height: 100,
      fill: "#60a5fa",
      text: "Caja",
      fontSize: 16,
    });
  };

  const addInput = () => {
    const offset = currentScreen.shapes.length * 40;
    addShapeToCurrentScreen({
      id: nanoid(),
      type: "input",
      x: 60,
      y: 100 + offset,
      width: 200,
      height: 40,
      fill: "#ffffff",
      text: "",
      fontSize: 16,
    });
  };

  const addButton = () => {
    addShapeToCurrentScreen({
      id: nanoid(),
      type: "button",
      x: 60,
      y: 300,
      width: 160,
      height: 50,
      fill: "#2563eb",
      text: "Iniciar sesión",
      fontSize: 18,
      targetScreen: "Inicio",
    });
  };

  const addLabel = () => {
    const offset = currentScreen.shapes.length * 20;
    addShapeToCurrentScreen({
      id: nanoid(),
      type: "label",
      x: 50 + offset,
      y: 30 + offset,
      fill: "#000000",
      text: "Etiqueta",
      fontSize: 14,
    });
  };

  const addScreen = () => {
    const name = `Pantalla ${screens.length + 1}`;
    const id   = nanoid();
    const newScreen: Screen = { id, name, shapes: [] };
  
    setScreens(prev => [...prev, newScreen]);
    setCurrentScreenId(id);
  
    if (projectId) {
      socket.emit("add-screen", { projectId, screen: newScreen });
    }
  };

  const deleteScreen = (id: string) => {
    setScreens(prev => prev.filter(s => s.id !== id));
  
    if (projectId) {
      socket.emit("delete-screen", { projectId, screenId: id });
    }
  
    // si borramos la pantalla actual pasamos a la primera que quede
    setCurrentScreenId(prev => (prev === id && screens.length > 1 ? screens[0].id : prev));
  };
// Cambia el nombre localmente mientras se escribe
const draftRenameScreen = (id: string, newName: string) => {
  setScreens(prev => prev.map(s => (s.id === id ? { ...s, name: newName } : s)));
};

// Confirma el nombre, cierra el input y avisa al socket
const confirmRenameScreen = (id: string, newName: string) => {
  setRenamingTab(null);

  if (projectId) {
    socket.emit("rename-screen", { projectId, screenId: id, newName });
  }
};
/*
  const renameScreen = (id: string, newName: string) => {
    setScreens(prev => prev.map(s => (s.id === id ? { ...s, name: newName } : s)));
    setRenamingTab(null);
  
    if (projectId) {
      socket.emit("rename-screen", { projectId, screenId: id, newName });
    }
  };

*/

  const handleSaveProject = async () => {
    if (!projectId) return alert("No hay ID de proyecto");
  
    try {
      await api.put(`/projects/${projectId}`, {
        descripcion: screens,
      });
       // Notificar a otros usuarios que el proyecto ha sido actualizado
    socket.emit("project-update", {
      projectId,
      data: screens
    });

      alert("✅ Proyecto actualizado");
    } catch (err) {
      console.error("Error al guardar:", err);
      alert("❌ Error al guardar el proyecto");
    }
  };
  
  const handleInvitar = async () => {
    try {
      await api.post(`/projects/${projectId}/invite`, {
        email: emailInvitado
      });
      alert("✅ Invitación enviada");
      setShowInviteModal(false);
      setEmailInvitado('');
    } catch (err) {
      console.error("Error al invitar:", err);
      alert("❌ Error al enviar la invitación");
    }
  };

/* upload -> misma función de antes ---------------- */
async function handleSketchUpload(file: File) {
  const fd = new FormData();
  fd.append("file", file);

  const { data } = await api.post("/sketch/vision", fd);   // ←   /api/sketch/vision
  const screen: Screen = data.screen;

  setScreens(prev => [...prev, screen]);
  setCurrentScreenId(screen.id);
  screen.shapes.forEach(broadcastAddShape);
}

/* cerrar modal y reset --------------------------- */
function closeSketchModal() {
  setShowSketchModal(false);
  setSelectedFile(null);
  setPreviewURL(null);
}
  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-white text-black" onClick={() => setContextMenu(null)}>
      <div className="h-16 px-4 bg-gray-100 border-b flex items-center justify-between">
        <h1 className="text-xl font-semibold">🎨 Figma Clone Editor</h1>
        <div className="flex items-center gap-2">
          <button onClick={addRectangle} className="bg-blue-500 text-white px-3 py-1 rounded">+ Rectángulo</button>
          <button onClick={addInput} className="bg-yellow-500 text-white px-3 py-1 rounded">+ Input</button>
          <button onClick={addButton} className="bg-green-600 text-white px-3 py-1 rounded">+ Botón</button>
          <button onClick={addLabel} className="bg-purple-500 text-white px-3 py-1 rounded">+ Label</button>

          <button onClick={() => setShowSidebar(!showSidebar)} className="bg-gray-800 text-white px-3 py-1 rounded">
            {showSidebar ? "Ocultar panel" : "Mostrar panel"}
          </button>
          <button
            onClick={handleSaveProject}
            className="bg-orange-600 text-white px-3 py-1 rounded"
          >
            🔄 Actualizar proyecto
          </button>
          <button
            onClick={() => setShowInviteModal(true)}
            className="bg-green-500 text-white px-3 py-1 rounded"
          >
            👥 Invitar
          </button>
          <button
          onClick={() => setShowSketchModal(true)}
          className="bg-indigo-600 text-white px-3 py-1 rounded"
        >
          📸 Importar boceto
          </button>
        </div>
        
      </div>
{/* Modal de Importar Boceto */}
{showSketchModal && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg w-96 p-6 relative">
      <button
        onClick={closeSketchModal}
        className="absolute right-3 top-3 text-xl"
      >
        ×
      </button>

      <h3 className="text-lg font-semibold mb-4">Importar boceto (foto)</h3>

      {/* selector de archivos */}
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setSelectedFile(f);
          setPreviewURL(URL.createObjectURL(f));
        }}
        className="mb-4"
      />

      {/* vista previa */}
      {previewURL && (
        <img
          src={previewURL}
          alt="preview"
          className="w-full h-40 object-contain border mb-4"
        />
      )}

      <div className="flex justify-end gap-2">
        <button
          onClick={closeSketchModal}
          className="px-4 py-2 text-gray-600"
        >
          Cancelar
        </button>
        <button
          disabled={!selectedFile}
          onClick={async () => {
            if (selectedFile) {
              await handleSketchUpload(selectedFile);
              closeSketchModal();
            }
          }}
          className={`px-4 py-2 rounded text-white ${
            selectedFile ? "bg-indigo-600 hover:bg-indigo-700" : "bg-indigo-300 cursor-not-allowed"
          }`}
        >
          Procesar
        </button>
      </div>
    </div>
  </div>
)}

      <div className="flex bg-gray-200 px-4 py-2 border-b">
        {screens.map((screen) => (
          <div key={screen.id} onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY, screenId: screen.id });
          }} className="relative">
            {renamingTab === screen.id ? (
              <input
                autoFocus
                className="px-2 py-1 border text-sm"
                value={screen.name}
                onChange={(e) => draftRenameScreen(screen.id, e.target.value)}
                onBlur={() => confirmRenameScreen(screen.id, screen.name)}
                onKeyDown={(e) => e.key === "Enter" && confirmRenameScreen(screen.id, screen.name)}
              />
            ) : (
              <button onClick={() => setCurrentScreenId(screen.id)} className={`px-4 py-1 mr-2 rounded ${screen.id === currentScreenId ? 'bg-black text-white' : 'bg-white border border-gray-400'}`}>
                {screen.name} <span onClick={(e) => { e.stopPropagation(); deleteScreen(screen.id); }}>×</span>
              </button>
            )}
          </div>
        ))}
        <button onClick={addScreen} className="px-4 py-1 rounded bg-white border border-gray-400">＋</button>
      </div>

      {contextMenu && (
        <div className="absolute bg-white border rounded shadow-md text-sm" style={{ top: contextMenu.y, left: contextMenu.x }}>
          <button onClick={() => setRenamingTab(contextMenu.screenId)} className="block w-full px-4 py-2 hover:bg-gray-100">Renombrar</button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 bg-white relative">
          <Stage width={canvasSize.width} height={canvasSize.height} onMouseDown={(e) => {
            if (e.target === e.target.getStage()) setSelectedId(null);
          }}>
            <Layer>
              {currentScreen.shapes.map((shape) => (
                <Group
                  key={shape.id}
                  x={shape.x}
                  y={shape.y}
                  draggable

                  onClick={(e) => {
                    e.cancelBubble = true;
                    setSelectedId(shape.id);
                    const target = screens.find((s) => s.name.toLowerCase() === shape.targetScreen?.toLowerCase());
                    if (shape.type === "button" && target) setCurrentScreenId(target.id);
                  }}
                  onDblClick={() => {
                    if (shape.type === "input") {
                      setEditingInput({ id: shape.id, x: shape.x, y: shape.y, width: shape.width || 200 });
                    }
                  }}
                  onDragMove={(e) => {
                    const { x, y } = e.target.position();
                    updateShape(shape.id, { x, y });          // mueve localmente
                    emitDragPosition(shape.id, x, y);         // avisa en “streaming”
                  }}
                  onDragEnd={(e) => {
                    const { x, y } = e.target.position();
                    updateShape(shape.id, { x, y });          // estado final (ya emite update-shape)
                  }}
                  ref={(node) => { if (node) shapeRefs.current[shape.id] = node; }}
                  onTransformEnd={() => {
                    const node = shapeRefs.current[shape.id];
                    const scaleX = node.scaleX();
                    const scaleY = node.scaleY();
                    updateShape(shape.id, {
                      width: Math.max(20, (shape.width || 100) * scaleX),
                      height: Math.max(20, (shape.height || 100) * scaleY),
                    });
                    node.scaleX(1);
                    node.scaleY(1);
                  }}>
                  <Rect
                    width={shape.width}
                    height={shape.height}
                    fill={selectedId === shape.id ? "deepskyblue" : shape.fill}
                    stroke={shape.type === "input" ? "#d1d5db" : undefined}
                    strokeWidth={shape.type === "input" ? 1 : 0}
                    cornerRadius={shape.type === "button" ? 6 : 0}
                  />
                  <KonvaText
                    text={shape.text || ""}
                    fontSize={shape.fontSize || 16}
                    fill={shape.type === "button" ? "white" : "#111"}
                    width={shape.width}
                    height={shape.height}
                    align="center"
                    verticalAlign="middle"
                  />
                </Group>
              ))}
              <Transformer ref={trRef} />
            </Layer>
          </Stage>
          {editingInput && (
            <input
              type="text"
              value={currentScreen.shapes.find((s) => s.id === editingInput.id)?.text || ""}
              onChange={(e) => updateShape(editingInput.id, { text: e.target.value })}
              onBlur={() => setEditingInput(null)}
              autoFocus
              style={{
                position: "absolute",
                top: editingInput.y,
                left: editingInput.x,
                width: editingInput.width,
                fontSize: "16px",
                padding: "6px 8px",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            />
          )}
        </div>

        {showSidebar && (
          <div className="w-[300px] border-l p-4 bg-gray-50 overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">🛠 Propiedades</h2>
            {selectedShape ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">ID: {selectedShape.id}</p>
                <label className="text-sm">Texto</label>
                <input type="text" value={selectedShape.text} onChange={(e) => updateShape(selectedShape.id, { text: e.target.value })} className="border px-2 py-1 rounded text-sm w-full" />
                <label className="text-sm">Tamaño fuente</label>
                <input type="number" value={selectedShape.fontSize || 16} onChange={(e) => updateShape(selectedShape.id, { fontSize: parseInt(e.target.value) })} className="border px-2 py-1 rounded text-sm w-full" />
                <label className="block text-sm">Color</label>
                <input type="color" value={selectedShape.fill} onChange={(e) => updateShape(selectedShape.id, { fill: e.target.value })} className="w-full h-10 border rounded" />
                {selectedShape.type === "button" && (
                  <>
                    <label className="text-sm">Ir a pantalla (nombre)</label>
                    <input type="text" value={selectedShape.targetScreen || ""} onChange={(e) => updateShape(selectedShape.id, { targetScreen: e.target.value })} className="border px-2 py-1 rounded text-sm w-full" />
                  </>
                )}
                <button onClick={deleteShape} className="bg-red-500 text-white w-full py-2 rounded">Eliminar elemento</button>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Selecciona un elemento</p>
            )}
            
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">👥 Usuarios activos</h3>
              {usuariosConectados.map((u, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-green-600">
                  <span className="text-sm text-green-600">🟢 {u.nombre}</span>

                </div>
              ))}
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">📨 Invitaciones pendientes</h3>
              {invitaciones.map((inv, i) => (
                <div key={i} className="text-sm p-2 bg-white rounded shadow mb-2">
                  <p>De: {inv.emisorNombre}</p>
                  <div className="flex gap-2 mt-2">
                    <button className="bg-green-500 text-white px-2 py-1 rounded text-xs">
                      Aceptar
                    </button>
                    <button className="bg-red-500 text-white px-2 py-1 rounded text-xs">
                      Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Modal de Invitación */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Invitar al proyecto</h3>
            <input
              type="email"
              value={emailInvitado}
              onChange={(e) => setEmailInvitado(e.target.value)}
              placeholder="Email del usuario"
              className="w-full border p-2 rounded mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleInvitar}
                className="bg-blue-500 text-white px-4 py-2 rounded"
              >
                Enviar invitación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}