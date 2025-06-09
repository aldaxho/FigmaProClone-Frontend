import { io } from "socket.io-client";

/**
 * Socket global para toda la SPA.
 * – No se desconecta nunca; sólo se hace `leave-project`
 *   cuando abandonamos un proyecto.
 */
const isLocal = window.location.hostname === 'localhost';
const BACKEND = isLocal
  ? 'http://localhost:5000'
  : 'https://figmaproclone-backend-vow0.onrender.com';

const socket = io(BACKEND, {
  autoConnect: true,
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 10000,
});
socket.on("connect", () => console.log("🟢 Conectado al servidor de sockets"));
socket.on("disconnect", () => console.log("🔴 Desconectado del servidor de sockets"));
socket.on("connect_error", (err) => console.error("❌ Error de conexión:", err));

export default socket;
