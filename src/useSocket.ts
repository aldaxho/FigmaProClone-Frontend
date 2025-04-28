import { io } from "socket.io-client";

/**
 * Socket global para toda la SPA.
 * – No se desconecta nunca; sólo se hace `leave-project`
 *   cuando abandonamos un proyecto.
 */
const socket = io("http://localhost:5000", {
  autoConnect: true,
  // Mejor WebSocket directo; elimina long-polling si tu server lo permite
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 10000,
});

socket.on("connect", () => console.log("🟢 Conectado al servidor de sockets"));
socket.on("disconnect", () => console.log("🔴 Desconectado del servidor de sockets"));
socket.on("connect_error", (err) => console.error("❌ Error de conexión:", err));

export default socket;
