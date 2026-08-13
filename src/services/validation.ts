import { supabase } from './supabase/client';
import type { DatosRelojInsert } from './supabase/models';

export class ValidationError extends Error {
  public errors: string[];
  constructor(errors: string[]) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

export interface ValidationRuleRecord {
  metric_key: string;
  display_name: string;
  data_type: 'integer' | 'decimal' | string;
  unit: string;
  min_value: number | null;
  max_value: number | null;
  format_regex?: string | null;
  is_active: boolean;
}

function isNumberLike(v: any): v is number {
  return typeof v === 'number' && !Number.isNaN(v);
}

/**
 * Fetch validation rules for a set of metric keys.
 */
async function fetchRulesForKeys(keys: string[]): Promise<Record<string, ValidationRuleRecord>> {
  if (!keys || keys.length === 0) return {};
  const { data, error } = await supabase
    .from('validation_rules')
    .select('*')
    .in('metric_key', keys)
    .eq('is_active', true);

  if (error) throw error;
  const rows = (data as any[]) ?? [];
  const map: Record<string, ValidationRuleRecord> = {};
  for (const r of rows) {
    map[r.metric_key] = {
      metric_key: r.metric_key,
      display_name: r.display_name,
      data_type: r.data_type,
      unit: r.unit,
      min_value: r.min_value ?? null,
      max_value: r.max_value ?? null,
      format_regex: r.format_regex ?? null,
      is_active: r.is_active,
    };
  }
  return map;
}

/**
 * Validate a single DatosRelojInsert object against active validation rules.
 * Throws ValidationError when any field is out of range or malformed.
 */
export async function validateDatosReloj(dato: DatosRelojInsert): Promise<void> {
  // keys that map to validation rules
  const candidateKeys = Object.keys(dato).filter(k =>
    !['id', 'id_usuario', 'recorded_at', 'sospechoso', 'created_at', 'updated_at'].includes(k),
  );

  const rules = await fetchRulesForKeys(candidateKeys);
  const errors: string[] = [];

  for (const key of candidateKeys) {
    const rule = rules[key];
    if (!rule) continue; // no rule defined -> skip

    const value = (dato as any)[key];
    if (value === null || value === undefined) continue; // allow nulls (no range validation)

    if (!isNumberLike(value)) {
      errors.push(`${key}: tipo inválido (se esperaba número)`);
      continue;
    }

    const num = Number(value);

    if (rule.data_type === 'integer' && !Number.isInteger(num)) {
      errors.push(`${key}: tipo inválido (se esperaba entero)`);
      continue;
    }

    if (rule.min_value !== null && num < Number(rule.min_value)) {
      errors.push(
        `${key}: valor ${num} menor que mínimo permitido ${rule.min_value} ${rule.unit}`,
      );
      continue;
    }

    if (rule.max_value !== null && num > Number(rule.max_value)) {
      errors.push(
        `${key}: valor ${num} mayor que máximo permitido ${rule.max_value} ${rule.unit}`,
      );
      continue;
    }
  }

  if (errors.length > 0) throw new ValidationError(errors);
}

/**
 * Validate an array of DatosRelojInsert. If any item fails, throws ValidationError
 * with a prefixed index for each failing item.
 */
export async function validateDatosRelojBatch(datos: DatosRelojInsert[]): Promise<void> {
  if (!Array.isArray(datos)) return;

  // gather union of keys to fetch rules once
  const unionKeys = new Set<string>();
  for (const d of datos) {
    for (const k of Object.keys(d)) {
      if (!['id', 'id_usuario', 'recorded_at', 'sospechoso', 'created_at', 'updated_at'].includes(k)) unionKeys.add(k);
    }
  }
  const keys = Array.from(unionKeys);
  const rules = await fetchRulesForKeys(keys);

  const allErrors: string[] = [];

  datos.forEach((d, idx) => {
    const candidateKeys = Object.keys(d).filter(k =>
      !['id', 'id_usuario', 'recorded_at', 'sospechoso', 'created_at', 'updated_at'].includes(k),
    );

    for (const key of candidateKeys) {
      const rule = rules[key];
      if (!rule) continue;
      const value = (d as any)[key];
      if (value === null || value === undefined) continue;
      if (!isNumberLike(value)) {
        allErrors.push(`registro[${idx}].${key}: tipo inválido (se esperaba número)`);
        continue;
      }
      const num = Number(value);
      if (rule.data_type === 'integer' && !Number.isInteger(num)) {
        allErrors.push(`registro[${idx}].${key}: tipo inválido (se esperaba entero)`);
        continue;
      }
      if (rule.min_value !== null && num < Number(rule.min_value)) {
        allErrors.push(
          `registro[${idx}].${key}: valor ${num} menor que mínimo ${rule.min_value} ${rule.unit}`,
        );
        continue;
      }
      if (rule.max_value !== null && num > Number(rule.max_value)) {
        allErrors.push(
          `registro[${idx}].${key}: valor ${num} mayor que máximo ${rule.max_value} ${rule.unit}`,
        );
        continue;
      }
    }
  });

  if (allErrors.length > 0) throw new ValidationError(allErrors);
}

export default {
  validateDatosReloj,
  validateDatosRelojBatch,
  ValidationError,
};
