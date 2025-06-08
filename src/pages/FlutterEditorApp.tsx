import type { Transformer as KonvaTransformer } from "konva/lib/shapes/Transformer";
import { nanoid } from "nanoid";
import { useEffect, useRef, useState } from "react";
import { Group, Text as KonvaText, Layer, Rect, Stage, Transformer } from "react-konva";
import { useParams } from "react-router-dom";
import api from "../api/axios";
import { generarPantallaDesdeTexto } from "../services/api"; // ajusta la ruta según tu estructura
import socket from "../useSocket";

interface Shape {
  id: string;
  type: "text" | "container" | "button" | "input" | "sidebar" | "sidebarItem" | "sidebarToggle" ;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fill?: string;
  text?: string;
  originalText?: string;
  fontSize?: number;
  targetScreen?: string;
  group?: string;
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

const dispositivos = [
  { nombre: "iPhone 13", width: 390, height: 844 },
  { nombre: "Pixel 6", width: 412, height: 915 },
  { nombre: "Samsung S22", width: 360, height: 800 },
  { nombre: "Tablet 10\"", width: 800, height: 1280 },
  { nombre: "Personalizado", width: 0, height: 0 },
];

export default function FlutterEditorApp() {
  //estados 
  const { id: projectId } = useParams();
  const [screens, setScreens] = useState<Screen[]>([]);
  const [currentScreenId, setCurrentScreenId] = useState("");
  const [selectedDevice, setSelectedDevice] = useState(dispositivos[0]);
  const [customSize, setCustomSize] = useState({ width: 360, height: 800 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingInput, setEditingInput] = useState<{ id: string; x: number; y: number; width: number } | null>(null);
  const [renamingTab, setRenamingTab] = useState<string | null>(null);
  const trRef = useRef<KonvaTransformer>(null);
  const shapeRefs = useRef<{ [key: string]: any }>({});
 
  const canvasWidth = selectedDevice.nombre === "Personalizado" ? customSize.width : selectedDevice.width;
  const canvasHeight = selectedDevice.nombre === "Personalizado" ? customSize.height : selectedDevice.height;

  const currentScreen = screens.find((s) => s.id === currentScreenId);
  const selectedShape = currentScreen?.shapes.find((s) => s.id === selectedId);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [projectMeta, setProjectMeta] = useState({
    width: canvasWidth,
    height: canvasHeight
  });
  const [previewMode, setPreviewMode] = useState(false);
  const [undoStack, setUndoStack]  = useState<Screen[][]>([]);
  const [redoStack, setRedoStack] = useState<Screen[][]>([]);
  const [ showAIGenerator, setShowAIGenerator] = useState(false);
  const [ aiPrompt, setAIPrompt] = useState("");
  const [ aiLoading, setAILoading] = useState(false);
  const [confirmDevice, setConfirmDevice] = useState<null | "yes" | "no">(null);
//estados para el socket
const [usuariosConectados, setUsuariosConectados] = useState<Usuario[]>([]);
const [invitaciones, setInvitaciones] = useState<Invitacion[]>([]);

const [showInviteModal, setShowInviteModal] = useState(false);
const [emailInvitado, setEmailInvitado] = useState("");

  // Nueva función para agregar secciones al sidebar
  const addSidebarItem = (sidebarId: string) => {
    const count = currentScreen?.shapes.filter(s => s.group === sidebarId && s.type === "sidebarItem").length || 0;
    const newItem: Shape = {
      id: nanoid(),
      type: "sidebarItem",
      x: 10,
      y: 60 + count * 50,
      width: sidebarExpanded ? 180 : 40,
      height: 40,
      fill: "#22d3ee",
      text: sidebarExpanded ? `Item ${count}` : "",
      originalText: `Item ${count}`,

      fontSize: 16,
      group: sidebarId
    };
    addShapeToCurrentScreen(newItem);
    const plusButton = currentScreen?.shapes.find(
      (s) => s.group === sidebarId && s.type === "sidebarItem" && s.text === "+"
      );

      if (plusButton) {
        updateShape(plusButton.id, { y: 60 + (count + 1) * 50 });
      }

    };
//useEffect para los sockets : 
useEffect(() => {
  const usuario = JSON.parse(localStorage.getItem("user") || "{}");
  if (!usuario || !projectId) return;

  socket.emit("join-project", { projectId, user: usuario });

  const hUsers = (users: Usuario[]) => setUsuariosConectados(users);
  const hInvite = (inv: Invitacion) => {
    alert(`📨 Nueva invitación de ${inv.emisorNombre}`);
    setInvitaciones(prev => [...prev, inv]);
  };

  socket.on("update-users", hUsers);
  socket.on("nueva-invitacion", hInvite);

  return () => {
    socket.emit("leave-project", { projectId });
    socket.off("update-users", hUsers);
    socket.off("nueva-invitacion", hInvite);
  };
}, [projectId]);


useEffect(() => {
  if (!projectId) return;

  const hShapeUpdated = ({ screenId, shape }: { screenId: string; shape: Shape }) => {
    setScreens(prev =>
      prev.map(screen =>
        screen.id === screenId
          ? {
              ...screen,
              shapes: screen.shapes.map(s => (s.id === shape.id ? shape : s)),
            }
          : screen
      )
    );
  };

  const hShapeAdded = ({ screenId, shape }: { screenId?: string; shape?: Shape }) => {
    if (!shape || !shape.id || !screenId) return;
    setScreens(prev => prev.map(scr =>
      scr.id === screenId ? { ...scr, shapes: [...scr.shapes, shape] } : scr
    ));
  };



  const hShapeDeleted = ({ screenId, shapeId }: { screenId: string; shapeId: string }) => {
    setScreens(prev =>
      prev.map(screen =>
        screen.id === screenId
          ? {
              ...screen,
              shapes: screen.shapes.filter(s => s.id !== shapeId),
            }
          : screen
      )
    );
  };

  const hShapeMoving = ({ screenId, shapeId, x, y }: { screenId: string; shapeId: string; x: number; y: number }) => {
    setScreens(prev =>
      prev.map(screen =>
        screen.id === screenId
          ? {
              ...screen,
              shapes: screen.shapes.map(s =>
                s.id === shapeId ? { ...s, x, y } : s
              ),
            }
          : screen
      )
    );
  };
 
const hScreenAdded = (payload: { screen?: Screen } | Screen) => {
    const newScreen = (payload as any).screen ?? payload;
    
    if (!newScreen || typeof (newScreen as Screen).id !== "string") {
      console.warn("[socket] screen-added mal formado:", payload);
      return;
    }

    setScreens(prev => (
      prev.some(s => s.id === newScreen.id) ? prev : [...prev, newScreen as Screen]
    ));
    setCurrentScreenId(id => id || (newScreen as Screen).id);
  };

  // CORRECCIÓN: Cambiar el nombre del handler para que coincida con el evento
  const hScreenRenamed = ({ screenId, newName }: { screenId: string; newName: string }) => {
    console.log("🔄 Renombrando pantalla:", { screenId, newName }); // Debug
    setScreens(prev => prev.map(s => (s.id === screenId ? { ...s, name: newName } : s)));
  };

  // NUEVO: Handler para eliminar pantallas
  const hScreenDeleted = ({ screenId }: { screenId: string }) => {
    console.log("🗑️ Eliminando pantalla:", screenId); // Debug
    setScreens(prev => prev.filter(s => s.id !== screenId));
    
    // Si la pantalla eliminada era la actual, cambiar a otra
    if (currentScreenId === screenId) {
      setScreens(prevScreens => {
        const remaining = prevScreens.filter(s => s.id !== screenId);
        if (remaining.length > 0) {
          setCurrentScreenId(remaining[0].id);
        }
        return remaining;
      });
    }
  };

   socket.on("shape-added", hShapeAdded);
  socket.on("shape-deleted", hShapeDeleted);
  socket.on("shape-updated", hShapeUpdated);
  socket.on("shape-moving", hShapeMoving);
  socket.on("screen-added", hScreenAdded);
  socket.on("screen-renamed", hScreenRenamed);
  socket.on("screen-deleted", hScreenDeleted); 


  return () => {
    socket.off("shape-added", hShapeAdded);
    socket.off("shape-deleted", hShapeDeleted);
    socket.off("shape-updated", hShapeUpdated);
    socket.off("shape-moving", hShapeMoving);
    socket.off("screen-added", hScreenAdded);
    socket.off("screen-renamed", hScreenRenamed); 
    socket.off("screen-deleted", hScreenDeleted);
  };
}, [projectId]);

const handleInvitar = async () => {
  try {
    await api.post(`/projects/${projectId}/invite`, {
      email: emailInvitado
    });
    alert("✅ Invitación enviada");
    setShowInviteModal(false);
    setEmailInvitado("");
  } catch (err) {
    console.error("❌ Error al invitar:", err);
    alert("❌ Error al enviar la invitación");
  }
};
 

//para cargar o inicializar el proyecto
useEffect(() => {
  async function loadProject() {
    try {
      /* ───────────────────────── 1. Consulta ───────────────────────── */
      const res  = await api.get(`/projects/${projectId}`);
      const data = res.data.descripcion ? JSON.parse(res.data.descripcion) : {};

      /* ───────────────────────── 2. Pantallas ───────────────────────── */
      const defaultScreen: Screen = { id: nanoid(), name: "Pantalla 1", shapes: [] };

      const parsed      = (Array.isArray(data) ? data : data.screens) ?? [];
      const sanitized   : Screen[] = parsed.filter(
        (s): s is Screen => s && typeof s.id === "string"
      );

      const finalScreens = sanitized.length ? sanitized : [defaultScreen];
      setScreens(finalScreens);
      setCurrentScreenId(finalScreens[0].id);

      /* ───────────────────────── 3. Metadatos ───────────────────────── */
      if (data.meta) {
        const found = dispositivos.find(d => d.nombre === data.meta.device);

        if (found) {
          setSelectedDevice(found);
          if (found.nombre === "Personalizado") {
            setCustomSize({ width: data.meta.width, height: data.meta.height });
          }
        } else {
          // Dispositivo desconocido ⇒ usamos “Personalizado”
          const custom = dispositivos.find(d => d.nombre === "Personalizado")!;
          setSelectedDevice(custom);
          setCustomSize({ width: data.meta.width, height: data.meta.height });
        }

        setProjectMeta({ width: data.meta.width, height: data.meta.height });
      } else {
        // Sin meta ⇒ mantén el tamaño por defecto del dispositivo elegido
        setProjectMeta({ width: canvasWidth, height: canvasHeight });
      }

    } catch (err) {
      console.error("❌ Error al cargar el proyecto:", err);
    }
  }

  if (projectId) loadProject();
  /*  IMPORTANT: si cambias `dispositivos` en caliente, quieres
      que se vuelva a evaluar el meta → añádelo como dep. opcional:
      [...], [projectId, dispositivos]  */
}, [projectId]);

  useEffect(() => {
    if (!trRef.current || !selectedId) return;
    const node = shapeRefs.current[selectedId];
    if (node) {
      trRef.current.nodes([node]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [selectedId, currentScreenId, screens]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" && selectedId) {
        setScreens(prev => prev.map(screen =>
          screen.id === currentScreenId
            ? { ...screen, shapes: screen.shapes.filter(s => s.id !== selectedId) }
            : screen
        ));
        broadcastDeleteShape(selectedId);
        setSelectedId(null);

      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, currentScreenId]);


useEffect(() => {
  const width = selectedDevice.nombre === "Personalizado" ? customSize.width : selectedDevice.width;
  const height = selectedDevice.nombre === "Personalizado" ? customSize.height : selectedDevice.height;
  setProjectMeta({ width, height });
}, [selectedDevice, customSize]);


useEffect(() => {
    if (!currentScreen) return;
    setScreens(prev => prev.map(screen => {
      if (screen.id !== currentScreenId) return screen;
      return {
        ...screen,
        shapes: screen.shapes.map(shape => {
          if (shape.type === "sidebar") {
            return { ...shape, width: sidebarExpanded ? 200 : 60 };
          }
          if (shape.type === "sidebarItem") {
            return { ...shape, width: sidebarExpanded ? 180 : 40, text: sidebarExpanded ? shape.originalText ?? shape.text : "" };
          }
          return shape;
        })
      };
    }));
  }, [sidebarExpanded]);


  const addScreen = () => {
    const name = `Pantalla ${screens.length + 1}`;
    const id = nanoid();
    const newScreen: Screen = { id, name, shapes: [] };

    setScreens(prev => [...prev, newScreen]);
    setCurrentScreenId(id);

    if (projectId) {
      socket.emit("add-screen", { projectId, screen: newScreen }); // 👈 AÑADÍ ESTO
    }
  };


 const deleteScreen = (id: string) => {
  console.log("🗑️ Eliminando pantalla local:", id); // Debug
  
  setScreens(prev => {
    const filtered = prev.filter(s => s.id !== id);
    
    // Si eliminamos la pantalla actual, cambiar a otra
    if (currentScreenId === id && filtered.length > 0) {
      setCurrentScreenId(filtered[0].id);
    }
    
    return filtered;
  });

  // Emitir al socket
  if (projectId) {
    console.log("📡 Emitiendo delete-screen:", { projectId, screenId: id }); // Debug
    socket.emit("screen-deleted", { projectId, screenId: id });
  }
};
 const draftRenameScreen = (id: string, name: string) => {
  setScreens(p => p.map(s => s.id === id ? { ...s, name } : s));
  
};


const confirmRenameScreen = (id: string, name: string) => {
  console.log("✏️ Confirmando renombre:", { id, name }); // Debug
  setRenamingTab(null);
  setScreens(prev => prev.map(s => (s.id === id ? { ...s, name } : s)));

  if (projectId) {
    // CORRECCIÓN: Usar los nombres correctos de parámetros
    console.log("📡 Emitiendo rename-screen:", { projectId, screenId: id, newName: name }); // Debug
    socket.emit("screen-renamed", { projectId, screenId: id, newName: name });
  }
};

  const addShapeToCurrentScreen = (shape: Shape) => {
    pushToUndoStack();

    setScreens((prev) =>
      prev.map((screen) =>
        screen.id === currentScreenId
          ? { ...screen, shapes: [...screen.shapes, shape] }
          : screen
      )
    );

    // Emitir al servidor si hay un proyecto activo
    if (projectId) {
      socket.emit("add-shape", {
        projectId,
        screenId: currentScreenId,
        shape
      });
    }
  };
const broadcastDeleteShape = (shapeId: string) => {
  if (projectId) {
    socket.emit("delete-shape", { projectId, screenId: currentScreenId, shapeId });
  }
};
function throttle<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  return function (...args: any[]) {
    const now = Date.now();
    if (now - last >= delay) {
      last = now;
      fn(...args);
    } else {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay - (now - last));
    }
  } as T;
}

const emitDragPosition = throttle((shapeId: string, x: number, y: number) => {
  if (projectId) {
    socket.emit("shape-moving", {
      projectId,
      screenId: currentScreenId,
      shapeId,
      x,
      y,
    });
  }
}, 33); // 30 fps


  // Modifica el renderizado de cada shape para que detecte clicks en el "botón +"
  const handleShapeClick = (shape: Shape) => {
    setSelectedId(shape.id);

    if (shape.type === "sidebarToggle") {
      setSidebarExpanded(prev => !prev);
    } else if (shape.type === "sidebarItem") {
      if (shape.text === "+") {
        addSidebarItem(shape.group!);
      } else if (previewMode && shape.targetScreen) {
        const target = screens.find(s => s.id === shape.targetScreen);
        if (target) {
          setCurrentScreenId(target.id);
        } else {
          alert("⚠️ Pantalla destino no encontrada");
        }
      }
    } else if (shape.type === "button" && previewMode && shape.targetScreen) {
      const target = screens.find(s => s.id === shape.targetScreen);
      if (target) {
        setCurrentScreenId(target.id);
      } else {
        alert("⚠️ Pantalla destino no encontrada");
      }
    }
  };
  //pa volver atras o adelante : 
  const undo = () => {
    if (undoStack.length === 0) return;
    setRedoStack(prev => [...prev, screens]);
    const prevState = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setScreens(prevState);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    setUndoStack(prev => [...prev, screens]);
    const nextState = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setScreens(nextState);
  };
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "z") {
        e.preventDefault();
        undo();
      }
      if (e.ctrlKey && e.key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undoStack, redoStack, screens]);


/////////////////////////

  const handleSaveProject = async () => {
    if (!projectId) return alert("No hay ID de proyecto");

    try {
      await api.put(`/projects/${projectId}`, {
        descripcion: JSON.stringify({
          meta: {
            width: projectMeta.width,
            height: projectMeta.height,
            device: selectedDevice.nombre,
          },    
          screens}),
      });
      alert("✅ Proyecto guardado correctamente");
    } catch (err) {
      console.error("❌ Error al guardar:", err);
      alert("❌ Error al guardar el proyecto");
    }
  };

const handleExportFlutter = async () => {
  if (!projectId) return alert("❌ Proyecto no válido");

  try {
    const payload = {
      meta: {
        width: projectMeta.width,
        height: projectMeta.height,
        device: selectedDevice.nombre
      },
      screens
    };

   const res = await api.post("/export/flutter", payload, {

      responseType: "blob", // 🔥 importante para archivos binarios
    });

    // Crear enlace de descarga
    const blob = new Blob([res.data], { type: "application/zip" });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "flutter_project.zip");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    alert("✅ Proyecto Flutter exportado y descargado.");
  } catch (err) {
    console.error("❌ Error al exportar Flutter:", err);
    alert("❌ Error al exportar Flutter");
  }
};




const updateShape = (id: string, updates: Partial<Shape>) => {
  pushToUndoStack();

  // Encuentra el shape actual
  const currentShape = currentScreen?.shapes.find((s) => s.id === id);
  
  if (!currentShape) {
    console.warn("⚠️ Shape no encontrado:", id);
    return;
  }

  // Actualiza el estado local
  setScreens((prev) =>
    prev.map((screen) =>
      screen.id === currentScreenId
        ? {
            ...screen,
            shapes: screen.shapes.map((s) => s.id === id ? { ...s, ...updates } : s)
          }
        : screen
    )
  );

  // Emitir al socket (solo si se encontró el shape y hay proyecto activo)
 if (projectId) {
    const updatedShape = { ...currentShape, ...updates };
    console.log("📡 Emitiendo update-shape:", { projectId, screenId: currentScreenId, shape: updatedShape }); // Debug
    socket.emit("shape-updated", {
      projectId,
      screenId: currentScreenId,
      shape: updatedShape
    });
  }
};
const pushToUndoStack = () => {
  setUndoStack(prev => [...prev, screens.map(s => ({ ...s, shapes: [...s.shapes] }))]);
  setRedoStack([]); // Al hacer un cambio nuevo, vacía el redo
};

  const addText = () => 
    addShapeToCurrentScreen({ 
      id: nanoid(),
      type: "text",
      x: 50, y: 50,
      text: "Texto",
      fontSize: 18,
      fill: "#ffffff",
      width: 200,
      height: 30 });

  const addContainer = () => addShapeToCurrentScreen({ id: nanoid(), type: "container", x: 80, y: 120, width: 200, height: 100, fill: "#22d3ee" });
  const addButton = () => addShapeToCurrentScreen({ id: nanoid(), type: "button", x: 100, y: 250, text: "Ir", width: 160, height: 50, fontSize: 16, fill: "#3b82f6", targetScreen: "" });
  const addInput = () => addShapeToCurrentScreen({ id: nanoid(), type: "input", x: 100, y: 320, width: 200, height: 40, text: "", fontSize: 14, fill: "#ffffff" });
  const addSidebar = () => {
    const sidebarId = nanoid();
    const sidebar: Shape = {
      id: sidebarId,
      type: "sidebar",
      x: 0,
      y: 0,
      width: 200,
      height: canvasHeight,
      fill: "#1f2937"
    };
    const toggle: Shape = {
      id: nanoid(),
      type: "sidebarToggle",
      x: 10,
      y: 10,
      width: 40,
      height: 40,
      fill: "#facc15",
      text: ">",
      fontSize: 24,
      group: sidebarId
    };
    const firstItem: Shape = {
      id: nanoid(),
      type: "sidebarItem",
      x: 10,
      y: 60,
      width: 180,
      height: 40,
      fill: "#22d3ee",
      text: "Usuarios",
      originalText: "Usuarios",
      fontSize: 16,
      group: sidebarId
    };
    const plusButton: Shape = {
      id: nanoid(),
      type: "sidebarItem",
      x: 10,
      y: 60 + 50,
      width: 180,
      height: 40,
      fill: "#16a34a",
      text: "+",
      originalText: "+",
      fontSize: 24,
      group: sidebarId
    };

    addShapeToCurrentScreen(sidebar);
    addShapeToCurrentScreen(toggle);
    addShapeToCurrentScreen(firstItem);
    addShapeToCurrentScreen(plusButton);
  };
const typeLabels: Record<string, string> = {
  text: "📝 Texto",
  container: "📦 Contenedor",
  button: "🔘 Botón",
  input: "🔤 Entrada",
  sidebar: "📚 Sidebar",
  sidebarItem: "📁 Sección de Sidebar",
  sidebarToggle: "➡️ Botón de Toggle"
};

  if (!currentScreen) return <div className="text-white p-4">⏳ Cargando pantalla...</div>;

  return (
      <div className="w-screen h-screen flex flex-col bg-[#0d1117] text-white">
        <div className="flex justify-between items-center px-6 py-3 bg-black border-b border-gray-800">
          <h1 className="text-2xl font-bold">🎯 Flutter Editor</h1>
          <div className="flex gap-3">
            <button onClick={() => setShowInviteModal(true)} className="bg-green-600 px-4 py-1 rounded">
              👥 Invitar
            </button>

            <button onClick={undo} disabled={undoStack.length === 0} className="bg-gray-700 px-3 py-1 rounded">↩️</button>
            <button onClick={redo} disabled={redoStack.length === 0} className="bg-gray-700 px-3 py-1 rounded">↪️</button>
            <button
                onClick={() => {
                  setShowAIGenerator(true);
                  setConfirmDevice(null); // Reinicia  para volver a seleccionar
                }}
              className="bg-purple-600 px-4 py-1 rounded"
            >
              🤖 Generar con IA
            </button>

              <select
              value={selectedDevice.nombre}
              onChange={(e) => {
                const found = dispositivos.find((d) => d.nombre === e.target.value);
                if (found) setSelectedDevice(found);
              }}
              className="text-black px-2 py-1 rounded"
            >
              {dispositivos.map((d) => (
                <option key={d.nombre} value={d.nombre}>{d.nombre}</option>
              ))}
            </select>
            {selectedDevice.nombre === "Personalizado" && (
              <>
                <input
                  type="number"
                  placeholder="Ancho"
                  value={customSize.width}
                  onChange={(e) => setCustomSize(prev => ({ ...prev, width: parseInt(e.target.value) || 0 }))}
                  className="w-24 text-black px-2 py-1 rounded"
                />
                <input
                  type="number"
                  placeholder="Alto"
                  value={customSize.height}
                  onChange={(e) => setCustomSize(prev => ({ ...prev, height: parseInt(e.target.value) || 0 }))}
                  className="w-24 text-black px-2 py-1 rounded"
                />
              </>
            )}
            <button onClick={handleSaveProject} className="bg-green-600 px-4 py-1 rounded">
              💾 Guardar
            </button>
            <button onClick={() => setPreviewMode(prev => !prev)}
            className={`px-4 py-1 rounded ${previewMode ? "bg-yellow-600": "bg-sky-600"}`}>
              {previewMode ? "👁 Modo vista previa" : "🛠 Modo edición"}
            </button>

           <button
            onClick={handleExportFlutter}
            className="bg-amber-600 px-4 py-1 rounded"
          >
            📦 Exportar a Flutter
          </button>

          </div>
          
        </div>

        <div className="flex items-center gap-2 px-6 py-2 bg-[#0f172a] border-b border-[#1e293b]">
     {screens.map((screen) => (
        <div key={screen.id} className="relative">
          {renamingTab === screen.id ? (
            <input
              autoFocus
              value={screen.name || ""}
              onChange={(e) => draftRenameScreen(screen.id, e.target.value)}
               onBlur={e => confirmRenameScreen(screen.id, e.currentTarget.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  confirmRenameScreen(screen.id, e.currentTarget.value);
                }
              }}
              className="text-black px-2 rounded"
            />
          ) : (
            <button
              onClick={() => setCurrentScreenId(screen.id)}
              onDoubleClick={() => setRenamingTab(screen.id)}
              className={`px-3 py-1 rounded ${screen.id === currentScreenId ? 'bg-green-600' : 'bg-gray-800'}`}
            >
              {screen.name || "Pantalla"}{" "}
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  deleteScreen(screen.id);
                }}
              >
                ×
              </span>
            </button>
          )}
        </div>
      ))}

          <button onClick={addScreen} className="bg-gray-700 px-3 py-1 rounded">＋</button>
        </div>

        <div className="flex flex-1">
          <div className="w-[220px] bg-[#0f172a] p-4 space-y-2 border-r border-[#1e293b]">
            <h2 className="text-lg font-bold mb-2">🧩 Widgets</h2>
          
            <button onClick={addText} className="bg-emerald-700 w-full py-1 rounded">📝 Texto</button>
            <button onClick={addContainer} className="bg-cyan-700 w-full py-1 rounded">📦 Contenedor</button>
            <button onClick={addButton} className="bg-blue-700 w-full py-1 rounded">🔘 Botón</button>
            <button onClick={addInput} className="bg-gray-700 w-full py-1 rounded">🔤 Entrada/input</button>
            <button onClick={addSidebar} className="bg-indigo-700 w-full py-1 rounded">📚 Sidebar</button>
             <div className="p-4">
            <h2 className="text-lg font-semibold mb-2">👥 Usuarios activos</h2>
            {usuariosConectados.map((u, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-green-400 py-1">
                <span>🟢 {u.nombre}</span>
              </div>
            ))}
          </div>
          {/* Invitaciones */} 
          <div className="p-4 border-t border-[#1e293b] mt-4">
            <h2 className="text-lg font-semibold mb-2">📨 Invitaciones</h2>
            {invitaciones.length === 0 ? (
              <p className="text-sm text-gray-400">No hay invitaciones pendientes</p>
            ) : (
              invitaciones.map((inv, i) => (
                <div key={i} className="text-sm p-2 bg-[#151f1e] rounded shadow mb-2 border border-[#2a3a38]">
                  <p>De: {inv.emisorNombre}</p>
                  <div className="flex gap-2 mt-2">
                    <button className="bg-green-600 text-white px-2 py-1 rounded text-xs">
                      Aceptar
                    </button>
                    <button className="bg-red-500 text-white px-2 py-1 rounded text-xs">
                      Rechazar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          </div>
         

          <div className="flex-1 flex items-center justify-center bg-[#111827] relative">
        <Stage
          width={canvasWidth}
          height={canvasHeight}
          className="border shadow-lg bg-[#14b8a6]"
          onMouseDown={(e) => {
          
            const clickedOnEmpty = e.target === e.target.getStage();
            if (clickedOnEmpty) {
              setSelectedId(null);
            }
          }}
        >

    <Layer>
    {/* 🟢 Agrupaciones reales como sidebars */}
    {[...new Set(currentScreen.shapes.map(s => s.group).filter(g => g && g !== ""))].map(groupId => {
      const groupShapes = currentScreen.shapes.filter(s => s.group === groupId || s.id === groupId);
      return (
        <Group
          key={groupId}
          draggable={!previewMode}
          x={0}
          y={0}
           onDragMove={(e) => {
            const dx = e.target.x();
            const dy = e.target.y();
            groupShapes.forEach(shape => {
              updateShape(shape.id, {
                x: shape.x + dx,
                y: shape.y + dy
              });
              emitDragPosition(shape.id, shape.x + dx, shape.y + dy);
            });
          }}
          onDragEnd={(e) => {
            if (!previewMode) {
              const dx = e.target.x();
              const dy = e.target.y();
              groupShapes.forEach(shape => {
                updateShape(shape.id, {
                  x: shape.x + dx,
                  y: shape.y + dy
                });
              });
            }
          }}
          ref={(node) => {
            if (node) shapeRefs.current[groupId] = node;
          }}
        >
          {groupShapes.map(shape => (
            <Group
              key={shape.id}
              x={shape.x}
              y={shape.y}
              onClick={() => handleShapeClick(shape)}
              onDblClick={() => {
                if (
                  ["text", "input", "sidebarItem"].includes(shape.type) &&
                  shape.text !== "+"
                ) {
                  setEditingInput({ id: shape.id, x: shape.x, y: shape.y, width: shape.width || 200 });
                }
              }}
            >
              <Rect
                width={shape.width}
                height={shape.height}
                fill={selectedId === shape.id ? "#4ade80" : shape.fill}
                cornerRadius={shape.type === "button" ? 6 : 0}
              />
              {shape.text && (
                <KonvaText
                  text={shape.text}
                  fontSize={shape.fontSize || 16}
                  width={shape.width}
                  height={shape.height}
                  align="center"
                  verticalAlign="middle"
                  fill="#000"
                />
              )}
            </Group>
          ))}
        </Group>
      );
    })}

    {/* 🔵 Elementos sueltos (sin grupo ni vínculo al sidebar) */}
    {currentScreen.shapes.filter(s => !s.group && s.type !== "sidebar").map(shape => (
      <Group
        key={shape.id}
        x={shape.x}
        y={shape.y}
        draggable={!previewMode}
        onDragMove={(e) => {
          const { x, y } = e.target.position();
          updateShape(shape.id, { x, y });
          emitDragPosition(shape.id, x, y);
        }}
        onDragEnd={(e) => {
          if (!previewMode) {
            updateShape(shape.id, {
              x: e.target.x(),
              y: e.target.y(),
            });
          }
        }}
        onClick={() => handleShapeClick(shape)}
        onDblClick={() => {
          if (["text", "input"].includes(shape.type)) {
            setEditingInput({ id: shape.id, x: shape.x, y: shape.y, width: shape.width || 200 });
          }
        }}
      >
        <Rect
          width={shape.width}
          height={shape.height}
          fill={selectedId === shape.id ? "#4ade80" : shape.fill}
          cornerRadius={shape.type === "button" ? 6 : 0}
        />
        {shape.text && (
          <KonvaText
            text={shape.text}
            fontSize={shape.fontSize || 16}
            width={shape.width}
            height={shape.height}
            align="center"
            verticalAlign="middle"
            fill="#000"
          />
        )}
      </Group>
    ))}

    <Transformer ref={trRef} />
  </Layer>


  </Stage>

            {editingInput && (
              <input
                type="text"
                value={currentScreen.shapes.find(s => s.id === editingInput.id)?.text || ""}
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
                  backgroundColor: "#fff",
                }}
              />
            )}
          </div>

        {selectedShape && (
          <div className="w-[260px] bg-[#0f172a] p-4 space-y-3 border-l border-[#1e293b]">
            <h3 className="font-semibold text-lg mb-1">
              {typeLabels[selectedShape.type] || "🔧 Propiedades"}
            </h3>
            <p className="text-xs text-gray-400 mb-2">
              ID: <span className="text-green-400">{selectedShape.id.slice(0, 8)}</span>
            </p>

            {/* General */}
            <div className="border-t border-gray-600 pt-2">
              <p className="text-xs text-gray-400 uppercase mb-1">General</p>
              <label className="block text-sm">Texto</label>
              <input
                className="w-full p-1 rounded text-black"
                type="text"
                value={selectedShape.text || ""}
                onChange={(e) =>
                  updateShape(selectedShape.id, {
                    text: e.target.value,
                    originalText: e.target.value,
                  })
                }
              />
            </div>

            {/* Acción (para botones y sidebarItems) */}
            {["button", "sidebarItem"].includes(selectedShape.type) &&
              selectedShape.text !== "+" && (
                <div className="border-t border-gray-600 pt-2">
                  <p className="text-xs text-gray-400 uppercase mb-1">Acción</p>
                  <label className="block text-sm mb-1">Pantalla destino</label>
                  <select
                    className="w-full p-1 rounded text-black"
                    value={selectedShape.targetScreen || ""}
                    onChange={(e) => {
                      const targetScreenId = e.target.value;
                      const screen = screens.find((s) => s.id === targetScreenId);
                      updateShape(selectedShape.id, {
                        targetScreen: targetScreenId,
                        text: screen?.name ?? selectedShape.text,
                        originalText: screen?.name ?? selectedShape.originalText,
                      });
                    }}
                  >
                    <option value="">(Ninguna)</option>
                    {screens.map((screen) => (
                      <option key={screen.id} value={screen.id}>
                        {screen.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

            {/* Eliminar sección (solo sidebarItem) */}
            {selectedShape.type === "sidebarItem" && selectedShape.text !== "+" && (
              <div className="border-t border-gray-600 pt-2">
                <p className="text-xs text-gray-400 uppercase mb-1">Acciones</p>
                <button
                  onClick={() => {
                    setScreens((prev) =>
                      prev.map((s) =>
                        s.id === currentScreenId
                          ? {
                              ...s,
                              shapes: s.shapes.filter((sh) => sh.id !== selectedShape.id),
                            }
                          : s
                      )
                    );
                    broadcastDeleteShape(selectedShape.id);
                    setSelectedId(null);
                    
                  }}
                  className="w-full bg-red-700 py-1 rounded text-white"
                >
                  🗑 Eliminar sección
                </button>
              </div>
            )}

            {/* Estilo */}
            <div className="border-t border-gray-600 pt-2">
              <p className="text-xs text-gray-400 uppercase mb-1">Estilo</p>
              <label className="block text-sm">Color</label>
              <input
                className="w-full"
                type="color"
                value={selectedShape.fill || "#ffffff"}
                onChange={(e) =>
                  updateShape(selectedShape.id, { fill: e.target.value })
                }
              />
            </div>

            {/* Eliminar general */}
            <button
              onClick={() => {
                setScreens((prev) =>
                  prev.map((s) =>
                    s.id === currentScreenId
                      ? {
                          ...s,
                          shapes: s.shapes.filter((sh) => sh.id !== selectedShape.id),
                        }
                      : s
                  )
                );
                setSelectedId(null);
              }}
              className="w-full bg-red-600 py-2 mt-2 rounded text-white"
            >
              Eliminar
            </button>
          </div>
        )}

        </div>
        {showAIGenerator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
          <div className="bg-[#1e293b] rounded-xl shadow-2xl w-[90%] max-w-md p-6 text-white space-y-4 animate-fadeIn">
            {!confirmDevice && (
              <>
                <h2 className="text-xl font-bold">📱 Dispositivo seleccionado</h2>
                <p className="text-sm text-gray-300">
                  ¿Ya seleccionaste el dispositivo deseado para esta pantalla?
                </p>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => {
                      setConfirmDevice("no");
                      setShowAIGenerator(false);
                    }}
                    className="px-4 py-1 rounded bg-gray-600 hover:bg-gray-700 transition"
                  >
                    No, volver
                  </button>
                  <button
                    onClick={() => setConfirmDevice("yes")}
                    className="px-4 py-1 rounded bg-green-600 hover:bg-green-700 transition"
                  >
                    Sí, continuar
                  </button>
                </div>
              </>
            )}

            {confirmDevice === "yes" && (
              <>
                <h2 className="text-2xl font-bold">🧠 Generador con IA</h2>
                <p className="text-sm text-gray-300">
                  Describe la pantalla que quieres crear. Ejemplo: <br />
                  <span className="italic text-green-400">
                    "Una pantalla de login con fondo azul, dos inputs y un botón verde que diga 'Entrar'"
                  </span>
                </p>
                <textarea
                  className="w-full h-28 p-3 rounded text-black focus:outline-none"
                  placeholder="Escribe tu descripción aquí..."
                  value={aiPrompt}
                  onChange={(e) => setAIPrompt(e.target.value)}
                />

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => {
                      setConfirmDevice(null);
                      setShowAIGenerator(false);
                    }}
                    className="px-4 py-1 rounded bg-gray-600 hover:bg-gray-700 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    disabled={aiLoading || aiPrompt.trim() === ""}
                    onClick={async () => {
                      setAILoading(true);
                      try {
                        const deviceInfo = `${selectedDevice.nombre} de tamaño ${canvasWidth}x${canvasHeight}`;
                        const fullPrompt = `${aiPrompt.trim()} (Diseñado para ${deviceInfo})`; // 👈 Aquí se combina

                        const generatedShapes = await generarPantallaDesdeTexto(fullPrompt);
                        generatedShapes.forEach(shape => {
                          const shapeConId = { ...shape, id: nanoid() } as Shape;
                          addShapeToCurrentScreen(shapeConId);
                        });

                        setShowAIGenerator(false);
                        setAIPrompt("");
                      } catch (err) {
                        alert("❌ Error al generar pantalla con IA");
                        console.error(err);
                      } finally {
                        setAILoading(false);
                      }
                    }}

                    className="px-4 py-1 rounded bg-green-600 hover:bg-green-700 transition disabled:opacity-50"
                  >
                    {aiLoading ? "Generando..." : "Generar"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#0a1110] p-6 rounded-lg w-96 border border-[#2a3a38]">
            <h3 className="text-lg font-semibold mb-4">Invitar al proyecto</h3>
            <input
              type="email"
              value={emailInvitado}
              onChange={(e) => setEmailInvitado(e.target.value)}
              placeholder="Email del usuario"
              className="w-full border border-[#2a3a38] p-2 rounded mb-4 bg-[#151f1e] text-white"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleInvitar}
                className="bg-green-600 text-white px-4 py-2 rounded"
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
