
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8"
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders
  });
}

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "Método no permitido." }, 405);
  }

  if (!GEMINI_API_KEY) {
    return json({
      error: "Falta configurar GEMINI_API_KEY en los secretos de Supabase."
    }, 500);
  }

  const authorization = request.headers.get("Authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return json({ error: "Debes iniciar sesión para usar NOVA IA." }, 401);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const { data: { user }, error: authError } =
    await supabase.auth.getUser();

  if (authError || !user) {
    return json({ error: "Sesión no válida. Vuelve a iniciar sesión." }, 401);
  }

  let body: { message?: unknown };

  try {
    body = await request.json();
  } catch {
    return json({ error: "El cuerpo de la solicitud no es JSON válido." }, 400);
  }

  if (typeof body.message !== "string") {
    return json({ error: "El mensaje debe ser texto." }, 400);
  }

  const message = body.message.trim();

  if (!message || message.length > 4000) {
    return json({ error: "El mensaje debe tener entre 1 y 4000 caracteres." }, 400);
  }

  // Defensa adicional: las consultas sensibles no se envían a Gemini.
  const sensitive =
    /\b(contraseña|contraseñas|password|passphrase|credenciales|código de acceso|codigo de acceso|número pin|numero pin|token privado)\b/i;

  if (sensitive.test(message)) {
    return json({
      error: "Por seguridad, no puedo procesar contraseñas ni credenciales. Usa la bóveda privada de NOVA."
    }, 400);
  }

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
        encodeURIComponent(GEMINI_API_KEY),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text:
                "Tu nombre es Nova. Eres el asistente de Nova Apps. " +
                "Responde en español de forma clara, útil y segura. " +
                "No afirmes haber realizado acciones externas que no ejecutaste."
            }]
          },
          contents: [{
            role: "user",
            parts: [{ text: message }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1200
          }
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", response.status);
      return json({
        error: "Gemini no pudo completar la solicitud. Comprueba la clave, el modelo y los límites de uso."
      }, 502);
    }

    const answer = result?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text || "")
      .join("")
      .trim();

    if (!answer) {
      return json({ error: "Gemini no devolvió una respuesta de texto." }, 502);
    }

    return json({ answer });
  } catch (error) {
    console.error("NOVA IA error:", error);
    return json({ error: "No se pudo conectar con el servicio de IA." }, 502);
  }
});
