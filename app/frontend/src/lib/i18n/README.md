# Translations (English + Czech)

The UI is available in English (`en`, the source) and Czech (`cs`). Everything lives in `src/lib/i18n/`.

| File                                                      | What it is                                                                                                                                                                                                                                                                            |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `messages/<lang>/<area>.ts`                               | The texts, one file per area: `common`, `activity`, `layout`, `auth`, `dashboard`, `tasks`, `projects`, `views`, `filters`, `teams`, `labels`, `settings`, `admin`, `legal`, `errors`. Lives in `messages/en/` (source) and `messages/cs/`, same file names; each exports `messages`. |
| `messages/{en,cs}/index.ts`, `messages/index.ts`          | Merges the areas. **English defines the keys; Czech must have exactly the same ones** (enforced by `svelte-check` and by `catalog.test.ts`).                                                                                                                                          |
| `index.ts`                                                | What components import: `t`, `fmt`, `locale`, `setLocale`, `LOCALES`, `tr`.                                                                                                                                                                                                           |
| `translate.ts`, `locale-store.ts`, `core.ts`, `format.ts` | Plumbing (plural rules, interpolation, language detection, date/number formatting).                                                                                                                                                                                                   |
| `server-messages.ts`                                      | Turns the backend's English error messages into the current language. Unknown messages are shown as the server sent them.                                                                                                                                                             |

## Using it

```svelte
<script lang="ts">
	import { t, fmt } from '$lib/i18n';
</script>

<h1>{$t('tasks.title')}</h1>
<input placeholder={$t('tasks.search.placeholder')} aria-label={$t('tasks.search.label')} />
<p>{$t('tasks.count', { count: tasks.length })}</p>
<!-- plural forms chosen from `count` -->
<p>{$t('tasks.dueOn', { date: $fmt.date(task.dueDate) })}</p>
```

In plain TypeScript (toasts, helpers, anything that is not a component template) use `tr`:

```ts
import { tr } from '$lib/i18n';
showToast(tr('tasks.saved'), 'success');
```

`$fmt.date(...)`, `$fmt.dateTime(...)`, `$fmt.dateLong(...)`, `$fmt.number(...)` format in the current language **and
the time zone saved in the user's settings**. Never call `toLocaleDateString()` directly.

## Adding or changing a text

1. Add the key to the area file in `messages/en/` **and** `messages/cs/`. Keys are `area.something`, camelCase segments, e.g. `tasks.relations.empty`.
2. Reuse `common.*` for the everyday words (Save, Cancel, Delete, statuses, priorities, field labels) instead of making a new one.
3. Plurals: give an object `{ one, other }` in English and `{ one, few, many, other }` in Czech, with `{count}` inside.
   Czech: `one` = 1, `few` = 2-4, `many` = fractions (1,5), `other` = 0 and 5 or more.
4. Placeholders are `{name}`; both languages must use the same set. Never build a sentence by concatenating translated pieces:
   word order differs between languages, so make one message with placeholders.
5. Run `npm test` (catalogs consistent) and `npm run check` (every key used exists).

## Czech style

Natural, neutral, polite (formal "vy" only where a sentence needs a pronoun; most UI text is imperative or nominal):
"Uložit", "Zrušit", "Nemáte oprávnění". Glossary, so every page says the same thing:

| English                     | Czech                      | English     | Czech               |
| --------------------------- | -------------------------- | ----------- | ------------------- |
| task                        | úkol                       | project     | projekt             |
| subtask                     | podúkol                    | team        | tým                 |
| label                       | štítek                     | comment     | komentář            |
| attachment                  | příloha                    | reminder    | připomínka          |
| due date                    | termín                     | assignee    | řešitel             |
| filter / saved filter       | filtr / uložený filtr      | view        | pohled              |
| mind map                    | myšlenková mapa            | dashboard   | Přehled             |
| upcoming                    | Nadcházející               | settings    | Nastavení           |
| sign in / sign out          | přihlásit se / odhlásit se | account     | účet                |
| profile                     | profil                     | session     | přihlášení (relace) |
| API token                   | API token                  | webhook     | webhook             |
| administration              | Správa                     | member      | člen                |
| permission read/write/admin | čtení / zápis / správce    | in progress | probíhá             |

## What is not translated

- Terms of Service and Privacy Policy bodies: they are templates the operator replaces with their own legal text, in their
  own language. Only the page chrome around them is translated.
- The names of keys and fields in API validation messages (`password must be ...` becomes `password: minimální délka je 8 znaků`).
- Names the user typed (projects, tasks, labels).

## Language choice

A signed-in user's saved language (Settings > General) wins; otherwise the choice remembered in this browser; otherwise the
browser's language (Czech browsers get Czech, everything else English). The `lang` attribute of the page follows.
