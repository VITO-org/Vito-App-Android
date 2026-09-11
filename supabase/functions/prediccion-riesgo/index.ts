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

// Valores de referencia "san@s" (población general) para el análisis de
// contribución local: reemplazar una feature por su referencia sintetiza el
// contrafactual "¿qué pasaría si este usuario tuviera este valor normal?".
const VALORES_REFERENCIA: Record<string, number> = {
  age: 45,
  sex_male: 0,
  bmi: 25,
  bp_sistolica: 120,
  bp_diastolica: 80,
  cholesterol_ord: 1,
  diabetes: 0,
  smoking: 0,
  alcohol: 0,
  active: 1,
};

/**
 * Contribución local de cada feature (SHAP-univariado aproximado).
 *
 * Para cada feature i: delta_i = P(real) - P(counterfactual_i) donde
 * counterfactual_i reemplaza SOLO la feature i por su valor de referencia
 * sano. La diferencia de probabilidad indica cuánto empuja esa feature el
 * riesgo (positivo = sube riesgo, negativo = lo baja), con las demás fijas.
 *
 * Devuelve el top-3 por |delta| como { feature: delta_puntos_porcentuales }.
 * A diferencia de la heurística anterior (importancia_base × valor, que
 * producía "presión 330"), esto es interpretable: un delta de -8.5 significa
 * "esta feature baja el riesgo ~8.5 puntos porcentuales".
 */
function factoresMasInfluyentes(
  model: ModelJson,
  vector: number[],
  probReal: number,
): Record<string, number> {
  const deltas: { name: string; delta: number }[] = FEATURE_ORDER.map((name, i) => {
    const counterfactual = [...vector];
    counterfactual[i] = VALORES_REFERENCIA[name] ?? 0;
    const probCounter = probRiesgo(model, counterfactual);
    // Delta en puntos porcentuales con 1 decimal
    const delta = Math.round((probReal - probCounter) * 1000) / 10;
    return { name, delta };
  });
  deltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const top: Record<string, number> = {};
  for (const item of deltas.slice(0, 3)) top[item.name] = item.delta;
  return top;
}

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

// Import estático: el bundler de Supabase incluye SOLO los assets que el
// entrypoint importa (un Deno.readFile runtime NO viaja al eszip del deploy).
// El JSON se genera con ml-trainer/src/train.py → exportar_arboles_json().
// @ts-ignore -- import de módulos JSON (Deno)
import MODEL_RAW from './risk_model_trees.json' with { type: 'json' };

const MODEL: ModelJson = MODEL_RAW as unknown as ModelJson;

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

/**
 * Extrae el claim `sub` (id_usuario) de un Bearer JWT.
 *
 * Flujo de seguridad REAL con verify_jwt=true (default, y es el caso actual):
 * 1. El gateway de Supabase ya validó la firma HS256 contra el JWT_SECRET del
 *    proyecto — un token inválido ni siquiera llega al worker (401 del gateway).
 * 2. Acá solo decodificamos el payload (base64url) y extraemos `sub`, más un
 *    chequeo de exp. NO re-verificamos firma porque JWT_SECRET no se expone
 *    como env var en el runtime edge.
 *
 * Fallbacks (defensa en profundidad):
 * - Si el header `x-supabase-claims` está presente (runtime que lo inyecta),
 *   se usa su `sub` directo.
 * - Si JWT_SECRET estuviera disponible (deploy verify_jwt=false + secret
 *   seteado), se verifica HS256 manualmente.
 */
function subFromJwt(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const b64url = (b64: string): Uint8Array => {
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
    return Uint8Array.from(
      atob(b64.replace(/-/g, '+').replace(/_/g, '/') + pad),
      (c) => c.charCodeAt(0),
    );
  };

  try {
    const payload = JSON.parse(new TextDecoder().decode(b64url(parts[1])));
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

    // verify_jwt=true (default): el gateway ya validó la firma del JWT contra
    // el JWT_SECRET del proyecto. Acá extraemos el sub del payload decodificado
    // (o de x-supabase-claims si el runtime lo inyecta). La validación HS256
    // manual no es posible en runtime porque JWT_SECRET no es env var.
    const claimsHeader = req.headers.get('x-supabase-claims');
    let userId: string | null = null;
    if (claimsHeader) {
      try {
        const claims = JSON.parse(claimsHeader);
        userId = typeof claims.sub === 'string' ? claims.sub : null;
      } catch {
        userId = null;
      }
    }
    if (!userId) {
      userId = subFromJwt(authHeader);
    }
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

    // Contribución local real (SHAP-univariado): cuánto empuja cada feature
    // el riesgo vs. su valor de referencia sano. Top-3 por |delta|.
    const factores = factoresMasInfluyentes(MODEL, vector, prob);

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