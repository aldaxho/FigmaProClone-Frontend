export async function generarPantallaDesdeTexto(prompt: string): Promise<Shape[]> {
  console.log("🔍 Prompt enviado a backend:", prompt);

  const response = await fetch("https://figmaproclone-backend-vow0.onrender.com/api/generar-ui", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    throw new Error("❌ Error generando UI");
  }

  const data = await response.json();

  // 🚨 Este es el arreglo correcto que viene como "interface"
  if (Array.isArray(data)) {
    return data;
  } else if (Array.isArray(data.shapes)) {
    return data.shapes;
  } else if (Array.isArray(data.interface)) {
    return data.interface; // ← ESTA es la clave que está usando tu backend ahora
  } else {
    throw new Error("❌ Respuesta de backend inválida: no contiene shapes");
  }
}
