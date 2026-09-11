import type { Condition, Field } from "payload"

/**
 * Wraps each field's own `admin.condition` (if any) so it ALSO requires the
 * template selector to equal `templateValue` — pure native Payload
 * conditional fields, nothing custom. `defaultValue` mirrors the selector's
 * own default so a brand-new document (where the field hasn't been saved
 * yet) still resolves to the right template's fields instead of hiding
 * everything.
 */
export function withTemplateCondition(
  fieldName: string,
  templateValue: string,
  defaultValue: string,
  fields: Field[]
): Field[] {
  return fields.map((field) => {
    const existing = (field as { admin?: { condition?: Condition } }).admin?.condition
    const condition: Condition = (data, siblingData, context) => {
      const current = (data?.[fieldName] as string | undefined) ?? defaultValue
      if (current !== templateValue) return false
      return existing ? existing(data, siblingData, context) : true
    }
    return {
      ...field,
      admin: { ...(field as { admin?: Record<string, unknown> }).admin, condition },
    } as Field
  })
}
