import type { CollectionBeforeChangeHook, Config, Field, Tab } from "payload"

import { withTemplateCondition } from "./field"
import type { PageTemplatesPluginOptions } from "./types"

function isTabsField(field: Field): field is Field & { tabs: Tab[]; type: "tabs" } {
  return field.type === "tabs"
}

function hasLabel(tab: Tab): tab is Tab & { label: string } {
  return "label" in tab && typeof tab.label === "string"
}

function isSidebarPositioned(field: Field): boolean {
  return (field as { admin?: { position?: string } }).admin?.position === "sidebar"
}

function fieldName(field: Field): string | undefined {
  return "name" in field ? (field.name as string | undefined) : undefined
}

/**
 * A real Payload plugin — drop it into `plugins: []` the same way you would
 * `@payloadcms/plugin-seo`. Adds a "Page Template" select to each target
 * collection, and — using only Payload's own native conditional
 * fields/tabs, no custom admin UI — shows each template's own extra fields
 * only while it's selected. The WordPress analogy: this is the `<select>`
 * of page templates and the plumbing that swaps in each one's "meta boxes";
 * the templates themselves (their fields AND their front-end render) are
 * defined by your app, not this package.
 *
 * Works on any collection, tabbed or not — see `collections` in
 * PageTemplatesPluginOptions.
 *
 * @example
 * ```ts
 * pageTemplatesPlugin({
 *   collections: ["pages"],
 *   templates: [
 *     { value: "default", label: "Default", contentFields: [layoutBlocksField] },
 *     { value: "showcase", label: "Showcase", tab: { label: "Showcase", fields: [...] } },
 *   ],
 * })
 * ```
 */
export function pageTemplatesPlugin(options: PageTemplatesPluginOptions) {
  const fieldNameOpt = options.fieldName ?? "pageTemplate"
  const label = options.label ?? "Page Template"
  const contentTabLabel = options.contentTabLabel ?? "Content"
  const clearInactive = options.clearInactiveTemplateFields ?? true
  const defaultValue = options.templates[0]?.value

  if (!defaultValue) {
    throw new Error("payload-plugin-page-templates: at least one template is required.")
  }

  const seenValues = new Set<string>()
  for (const template of options.templates) {
    if (seenValues.has(template.value)) {
      throw new Error(`payload-plugin-page-templates: duplicate template value "${template.value}".`)
    }
    seenValues.add(template.value)
  }

  // fieldName -> owning template value, used both to catch cross-template
  // name collisions up front and to drive the clear-inactive-fields hook.
  const fieldOwner = new Map<string, string>()
  for (const template of options.templates) {
    for (const field of [...(template.contentFields ?? []), ...(template.tab?.fields ?? [])]) {
      const name = fieldName(field)
      if (!name) continue
      const existingOwner = fieldOwner.get(name)
      if (existingOwner && existingOwner !== template.value) {
        throw new Error(
          `payload-plugin-page-templates: field "${name}" is declared by both "${existingOwner}" and "${template.value}" — template field names must be unique across the whole registry.`
        )
      }
      fieldOwner.set(name, template.value)
    }
  }

  return (config: Config): Config => {
    config.collections = (config.collections ?? []).map((collection) => {
      const targeted = options.collections === true || options.collections.includes(collection.slug)
      if (!targeted) return collection

      let fields = [...collection.fields]
      const tabsFieldIndex = fields.findIndex(isTabsField)
      let tabsField: (Field & { tabs: Tab[]; type: "tabs" }) | undefined

      if (tabsFieldIndex !== -1) {
        const sourceTabsField = fields[tabsFieldIndex] as Field & { tabs: Tab[]; type: "tabs" }

        // Never mutate a collection's source field config. Payload can build
        // the config more than once in development (for example during HMR).
        // Mutating the imported Pages tabs in place made every rebuild append
        // all template fields again, causing the block-heavy Pages schema to
        // grow without bound and eventually stall the entire admin process.
        tabsField = {
          ...sourceTabsField,
          tabs: sourceTabsField.tabs.map((tab) => ({
            ...tab,
            fields: [...tab.fields],
          })),
        }
        fields[tabsFieldIndex] = tabsField
      }

      if (!tabsField) {
        // No tabs yet — synthesize one rather than requiring every
        // collection to be pre-structured for this plugin. Sidebar fields
        // stay top-level siblings of the new tabs field (Payload only
        // renders `position: "sidebar"` fields that stay top-level —
        // nesting them inside a tab would silently hide them).
        const sidebarFields = fields.filter(isSidebarPositioned)
        const mainFields = fields.filter((field) => !isSidebarPositioned(field))
        tabsField = { type: "tabs", tabs: [{ label: contentTabLabel, fields: mainFields }] }
        fields = [tabsField, ...sidebarFields]
      }

      const contentTab = tabsField.tabs.find((tab) => hasLabel(tab) && tab.label === contentTabLabel)
      if (!contentTab) {
        throw new Error(
          `payload-plugin-page-templates: no tab labeled "${contentTabLabel}" found on "${collection.slug}" — pass a matching contentTabLabel, or add that tab yourself.`
        )
      }

      for (const template of options.templates) {
        if (template.contentFields?.length) {
          contentTab.fields = [
            ...contentTab.fields,
            ...withTemplateCondition(fieldNameOpt, template.value, defaultValue, template.contentFields),
          ]
        }
      }

      const extraTabs: Tab[] = options.templates
        .filter((template) => template.tab)
        .map((template) => ({
          label: template.tab!.label,
          fields: template.tab!.fields,
          admin: {
            condition: (data: Record<string, unknown>) =>
              ((data?.[fieldNameOpt] as string | undefined) ?? defaultValue) === template.value,
          },
        }))

      tabsField.tabs = [...tabsField.tabs, ...extraTabs]

      const selectorField: Field = {
        name: fieldNameOpt,
        type: "select",
        label,
        defaultValue,
        options: options.templates.map(({ label: optionLabel, value }) => ({ label: optionLabel, value })),
        admin: {
          position: "sidebar",
          description: "Controls which fields and front-end renderer this document uses.",
          ...(options.fieldComponent
            ? {
                components: {
                  Field: options.fieldComponent,
                },
              }
            : {}),
        },
      }

      const clearInactiveHook: CollectionBeforeChangeHook = ({ data }) => {
        const current = (data?.[fieldNameOpt] as string | undefined) ?? defaultValue
        for (const [ownedField, owner] of fieldOwner) {
          if (owner !== current && data && ownedField in data) {
            data[ownedField] = null
          }
        }
        return data
      }

      return {
        ...collection,
        fields: [...fields, selectorField],
        hooks: clearInactive
          ? {
              ...collection.hooks,
              beforeChange: [...(collection.hooks?.beforeChange ?? []), clearInactiveHook],
            }
          : collection.hooks,
      }
    })

    return config
  }
}
