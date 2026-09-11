import type { Field } from "payload"

export interface PageTemplateTab {
  label: string
  fields: Field[]
}

/**
 * One entry in the template registry — the Payload-config half of a
 * WordPress-style "page template" (the React render half lives in your own
 * app, this plugin only knows about schema). `value`/`label` populate the
 * selector's options; `contentFields`/`tab` are the "dynamic meta boxes"
 * that appear only while this template is selected.
 */
export interface PageTemplateDefinition {
  value: string
  label: string
  /** Merged into the collection's existing content tab, each field individually shown only while this template is selected — for fields that belong alongside title/slug (e.g. a block-based layout builder). */
  contentFields?: Field[]
  /** A whole new tab shown only while this template is selected — for template-specific settings that don't belong in the main content tab. */
  tab?: PageTemplateTab
}

export interface PageTemplatesPluginOptions {
  /** Collection slugs to add the template selector to, or `true` for every collection in the config. If a target collection has no top-level `{ type: "tabs" }` field yet, the plugin creates one (wrapping the collection's existing non-sidebar fields into a `contentTabLabel` tab) rather than requiring you to restructure it first. */
  collections: string[] | true
  /** The template registry. The first entry is used as the default selection. */
  templates: PageTemplateDefinition[]
  /** Name of the generated select field. @default "pageTemplate" */
  fieldName?: string
  /** Label of the generated select field. @default "Page Template" */
  label?: string
  /** Optional admin field component for the generated selector. */
  fieldComponent?: string
  /** Which tab (matched by label) `contentFields` get merged into — created automatically if the collection has no tabs yet. @default "Content" */
  contentTabLabel?: string
  /**
   * On save, null out any field owned by a template OTHER than the one
   * currently selected — keeps stored documents free of orphaned data from
   * a template an editor previously picked and moved away from (Payload
   * still stores hidden-by-condition fields' values otherwise, since a
   * condition only affects the admin UI, not persistence).
   * @default true
   */
  clearInactiveTemplateFields?: boolean
}
