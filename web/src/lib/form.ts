import { useState, useCallback } from "react";

// ── Validation rules ─────────────────────────────────────────
export type Rules = {
  required?: boolean;
  minLength?: number;
  min?: number;       // for numeric fields
  pattern?: RegExp;
  email?: boolean;
  custom?: (v: string) => string | null;
};

export function validate(value: string, rules: Rules): string | null {
  const v = value.trim();
  if (rules.required && !v) return "Kjo fushë është e detyrueshme";
  if (!v) return null; // optional + empty → valid
  if (rules.minLength && v.length < rules.minLength)
    return `Duhet të ketë të paktën ${rules.minLength} karaktere`;
  if (rules.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
    return "Vendosni një adresë emaili të vlefshme";
  if (rules.min !== undefined && parseFloat(v) < rules.min)
    return `Vlera duhet të jetë ${rules.min} ose më e madhe`;
  if (rules.pattern && !rules.pattern.test(v))
    return "Format i pavlefshëm";
  if (rules.custom) return rules.custom(v);
  return null;
}

// ── Hook ─────────────────────────────────────────────────────
export function useFormErrors() {
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const touch = useCallback((field: string) => {
    setTouched((t) => ({ ...t, [field]: true }));
  }, []);

  const touchAll = useCallback((fields: string[]) => {
    setTouched(Object.fromEntries(fields.map((f) => [f, true])));
  }, []);

  const reset = useCallback(() => setTouched({}), []);

  // Returns the error string only when the field has been touched
  const fieldError = useCallback(
    (field: string, value: string, rules: Rules): string | null => {
      const err = validate(value, rules);
      return touched[field] ? err : null;
    },
    [touched]
  );

  // Returns true when ALL given fields pass their rules
  const isStepValid = useCallback(
    (checks: { field: string; value: string; rules: Rules }[]): boolean =>
      checks.every(({ value, rules }) => validate(value, rules) === null),
    []
  );

  return { touched, touch, touchAll, reset, fieldError, isStepValid };
}
