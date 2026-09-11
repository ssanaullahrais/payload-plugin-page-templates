# payload-plugin-page-templates

This plugin adds Page Templates to Payload CMS. It works a lot like page templates in WordPress.

## What it does

In WordPress, a page can use different templates. When you pick a template, the edit screen shows different fields for that template. This plugin brings that same idea to Payload.

You add a "Page Template" dropdown to any collection. When someone picks a template, only the fields for that template show up. Pick a different template, and the fields change again.

This plugin only handles the fields and the dropdown. It does not decide how a page looks on your website. Your own code still decides how each template gets rendered on the front end.

## When should you use this

Use this plugin any time one collection needs more than one layout or style of page. Some examples are:

- A normal page template with a simple content area
- A landing page template with its own hero video and extra fields
- A contact page template with its own form fields
- Any collection where different documents need different sets of fields

If you find yourself wanting to show or hide certain fields based on a dropdown choice, this plugin is built exactly for that.

## How this helps you

Without this plugin, you would need to write your own conditional logic for every field, and manage your own tabs by hand. You would also need to remember to clean up old field values when someone switches templates.

This plugin does all of that for you. You just describe your templates and their fields once, and the plugin handles showing the right fields, creating tabs when needed, and clearing out old values automatically. This keeps your Payload config simple and easy to read, even as you add more templates over time.

It also protects you from mistakes. If two templates accidentally use the same field name, or if a template is missing required setup, the plugin tells you right away with a clear error message, instead of letting a hidden bug reach your live site.

## How to install it

```ts
import { pageTemplatesPlugin } from "payload-plugin-page-templates"

export default buildConfig({
  plugins: [
    pageTemplatesPlugin({
      collections: ["pages"],
      templates: [
        {
          value: "default",
          label: "Default",
          contentFields: [{ name: "layout", type: "blocks", blocks: [] }],
        },
        {
          value: "landing",
          label: "Landing Page",
          tab: {
            label: "Landing Page",
            fields: [{ name: "heroVideo", type: "upload", relationTo: "media" }],
          },
        },
      ],
    }),
  ],
})
```

This plugin works on any collection, even ones that do not use tabs yet. If the collection does not already have a "Content" tab, the plugin creates one automatically and moves the existing fields into it. You do not need to restructure anything by hand first.

```ts
pageTemplatesPlugin({
  collections: ["testimonials"],
  templates: [],
})
```

You can also pass `collections: true` to add this feature to every collection at once.

## Settings you can use

| Option | Default value | What it does |
|---|---|---|
| `collections` | none | Which collections get the template dropdown, or `true` for all of them |
| `templates` | none | The list of templates. The first one is used by default |
| `fieldName` | `pageTemplate` | The name of the dropdown field |
| `label` | `Page Template` | The label shown for the dropdown field |
| `contentTabLabel` | `Content` | Which tab holds `contentFields`. Created automatically if it does not exist |
| `clearInactiveTemplateFields` | `true` | Clears out a field's saved value once its template is no longer selected |

When your app starts, the plugin also checks your templates for mistakes. It makes sure every template has its own unique value, and that no two templates use the same field name. If something is wrong, it tells you right away with a clear message.

## Why clearing old field values matters

Hiding a field in the admin panel does not delete its value. If you switch a page from "Landing Page" back to "Default," the landing page fields (like the hero video) are still saved in the database. They are just hidden from view.

This can be a problem, since anyone reading your data through the API could still see those old, unused values.

With `clearInactiveTemplateFields` turned on, which is the default, saving a document automatically clears out any field that belongs to a template other than the one currently selected. This keeps your saved data clean and accurate.

## Rendering your templates

This plugin only manages the fields and dropdown. It does not touch your front end at all. A simple setup on your side might look like this:

```tsx
export function renderPageTemplate(page: Page) {
  switch (page.pageTemplate) {
    case "landing":
      return <LandingPageTemplate page={page} />
    default:
      return <DefaultPageTemplate page={page} />
  }
}
```

## Current status

This plugin was first built for a real project's Pages collection, which needed a Default template and a Showcase template. It was built as its own separate package so it can be reused for future templates and collections, without copying the same code again. It has not been published to npm yet, so please check with the author before assuming it can be installed outside this project.
