/**
 * Edge Function: prediccion-riesgo
 *
 * Recibe el vector de 10 features del usuario (contrato FEATURE_ORDER de
 * src/services/prediccionRiesgo.ts), ejecuta el modelo RandomForest (Kaggle
 * Cardiovascular, 70k, ac 0.7357 / AUC 0.8008) e inserta el resultado en la
 * tabla `prediccion_riesgo` (schema.sql:201).
 *
 * INFERENCIA TS PURA: los árboles viajan como risk_model_trees.json (3MB) y
 * la predicción se hace votando árbol por árbol en TypeScript. Se evita
 * onnxruntime-node (bindings nativos NO confiables en Deno Deploy) y
 * onnxruntime-web (WASM pesado de cold-start). El formato trees.json es
 * generado por ml-trainer/src/train.py → exportar_arboles_json().
 *
 * ── Ruta ────────────────────────────────────────────────────────────
 *   POST /functions/v1/prediccion-riesgo
 *   Headers: Authorization: Bearer <JWT>
 *   Body: { vector: number[] }     // 10 features, orden FEATURE_ORDER
 *
 * ── Respuesta 200 ───────────────────────────────────────────────────
 *   { riesgo, score, modelo_version, factores_mas_influyentes,
 *     prediccion_id, disclaimer }
 *
 * ── Auth ────────────────────────────────────────────────────────────
 *   Valida el JWT HS256 contra JWT_SECRET y usa el claim `sub` como
 *   id_usuario. El insert se hace con service-role (confiable en runtime
 *   edge) PERO acotando el id_usuario al claim del token verificado, de modo
 *   que un usuario no puede escribir sobre otro.
 *
 * ── Deploy ──────────────────────────────────────────────────────────
 *   supabase link --project-ref <ref>
 *   supabase functions deploy prediccion-riesgo
 *   (verify_jwt ON por defecto: el gateway ya valida el JWT; acá re-validamos
 *    HS256 para no depender solo del gateway.)
 */

// ── Config ──────────────────────────────────────────────────────────────
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const MODELO_VERSION_DEFAULT = 'v1.0.0';
const FEATURE_ORDER = [
  'age', 'sex_male', 'bmi', 'bp_sistolica', 'bp_diastolica',
  'cholesterol_ord', 'diabetes', 'smoking', 'alcohol', 'active',
];
const SCORE_UMBRAL_MEDIO = 33;
const SCORE_UMBRAL_ALTO = 66;
const DISCLAIMER =
  'Evaluación educativa basada en un modelo poblacional. No constituye diagnóstico médico.';

// Importancia base por feature (heurística para "factores más influyentes").
const FEATURE_IMPORTANCIA_BASE: Record<string, number> = {
  age: 2, sex_male: 1, bmi: 1, bp_sistolica: 3, bp_diastolica: 2,
  cholesterol_ord: 2, diabetes: 2, smoking: 3, alcohol: 2, active: 2,
};

// ── Carga del modelo (una vez por warm start) ───────────────────────────
interface TreeJson {
  feature: number[];
  threshold: number[];
  left: number[];
  right: number[];
  value: number[][]; // [nodo][p0, p1]
}
interface ModelJson {
  n_features: number;
  trees: TreeJson[];
}

const MODEL: ModelJson = JSON.parse(
  new TextDecoder().decode(
    await Deno.readFile(new URL('./risk_model_trees.json', import.meta.url)),
  ),
);

// ── CORS ────────────────────────────────────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

// ── Helpers ─────────────────────────────────────────────────────────────

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Valida JWT HS256 contra JWT_SECRET y extrae el claim `sub` (id_usuario). */
async function subFromJwt(
  authHeader: string | null,
  jwtSecret: string,
): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signatureB64] = parts;
  const b64url = (b64: string): Uint8Array => {
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
    return Uint8Array.from(
      atob(b64.replace(/-/g, '+').replace(/_/g, '/') + pad),
      (c) => c.charCodeAt(0),
    );
  };

  try {
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(jwtSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, data));
    const expected = b64url(signatureB64);
    if (sig.length !== expected.length) return null;
    for (let i = 0; i < sig.length; i++) {
      if (sig[i] !== expected[i]) return null;
    }

    const payload = JSON.parse(new TextDecoder().decode(b64url(payloadB64)));
    if (typeof payload.sub !== 'string') return null;
    if (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()) {
      return null;
    }
    return payload.sub as string;
  } catch {
    return null;
  }
}

/** Probabilidad de clase 1 votando los árboles del RF (TS puro). */
function probRiesgo(model: ModelJson, vector: number[]): number {
  let sumP1 = 0;
  for (const tree of model.trees) {
    let node = 0;
    while (tree.left[node] !== -1) {
      // sklearn: si feature <= threshold va por left, si no por right
      node =
        vector[tree.feature[node]] <= tree.threshold[node]
          ? tree.left[node]
          : tree.right[node];
    }
    // value[node] = [p0, p1] para la clase (RF promedio de hojas)
    const [p0, p1] = tree.value[node];
    sumP1 += p1 / (p0 + p1 || 1);
  }
  return sumP1 / model.trees.length;
}

/** Top-3 features con mayor señal (heurística documentada, no SHAP). */
function factoresMasInfluyentes(
  vector: number[],
): Record<string, number> {
  const scored = FEATURE_ORDER.map((name, i) => ({
    name,
    factor: Math.round(FEATURE_IMPORTANCIA_BASE[name] * (vector[i] ?? 0) * 100) / 100,
  }));
  scored.sort((a, b) => b.factor - a.factor);
  const top: Record<string, number> = {};
  for (const item of scored.slice(0, 3)) top[item.name] = item.factor;
  return top;
}

// ── Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonError(405, 'Método no permitido. Usá POST.');
  }

  try {
    const body = await req.json().catch(() => null);
    if (
      !body ||
      !Array.isArray(body.vector) ||
      body.vector.length !== FEATURE_ORDER.length
    ) {
      return jsonError(
        400,
        `Se espera body.vector con ${FEATURE_ORDER.length} features (${FEATURE_ORDER.join(', ')})`,
      );
    }

    const authHeader = req.headers.get('Authorization');
    const jwtSecret = Deno.env.get('JWT_SECRET');
    if (!authHeader || !jwtSecret) {
      return jsonError(401, 'No autenticado');
    }
    const userId = await subFromJwt(authHeader, jwtSecret);
    if (!userId) {
      return jsonError(401, 'Token inválido o expirado');
    }

    const vector = (body.vector as number[]).map((v) =>
      Number.isFinite(v) ? v : 0,
    );
    const prob = probRiesgo(MODEL, vector);
    const score = Math.round(Math.max(0, Math.min(1, prob)) * 1000) / 10;
    const riesgo: 'bajo' | 'medio' | 'alto' =
      score >= SCORE_UMBRAL_ALTO
        ? 'alto'
        : score >= SCORE_UMBRAL_MEDIO
          ? 'medio'
          : 'bajo';

    const modeloVersion =
      typeof body.modelo_version === 'string'
        ? (body.modelo_version as string).slice(0, 20)
        : MODELO_VERSION_DEFAULT;

    const factores = factoresMasInfluyentes(vector);

    // ── Persistir (service-role, id_usuario acotado al JWT verificado) ──
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/prediccion_riesgo`,
      {
        method: 'POST',
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          id_usuario: userId,
          riesgo,
          score,
          modelo_version: modeloVersion,
          factores_mas_influyentes: factores,
          datos_entrada: vector.map((v: number) => v.toFixed(0)).join(',').slice(0, 64),
        }),
      },
    );

    let prediccionId: string | null = null;
    if (res.ok) {
      const rows = await res.json().catch(() => null);
      if (Array.isArray(rows) && rows.length > 0 && typeof rows[0]?.id === 'string') {
        prediccionId = rows[0].id;
      }
    } else {
      const errBody = await res.json().catch(() => null);
      console.error('insert prediccion_riesgo error:', res.status, errBody?.message);
      return jsonError(500, errBody?.message ?? 'No se pudo guardar la predicción');
    }

    return new Response(
      JSON.stringify({
        riesgo,
        score,
        modelo_version: modeloVersion,
        factores_mas_influyentes: factores,
        prediccion_id: prediccionId,
        disclaimer: DISCLAIMER,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('prediccion-riesgo error:', err);
    return jsonError(500, 'Error interno del servidor');
  }
});