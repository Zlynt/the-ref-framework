# Hello World: Express 5 + REF

A small task list app. Routes are defined inline in [src/index.ts](src/index.ts). REF renders most views on the server and hydrates them in the browser; the search page renders only in the browser.

## Run it

From the repository root:

```
npm install
npm run dev
```

Open http://localhost:3000. To use another port, set `PORT`, for example `PORT=4000 npm run dev`.

## Layout

```
src/
  index.ts                  App setup and all routes
  models/Task.ts            In-memory task data and validation
  views/                    React components rendered to HTML
    components/Layout.tsx   Shared page layout
    tasks/index.tsx         Task list and "add task" form
    tasks/show.tsx          One task
    tasks/search.tsx        Live search, rendered in the browser
    notFound.tsx            404 page
register.js                 Lets Node load .ts/.tsx files (Babel)
```

## Routes

| Method | URL                 | Action               |
| ------ | ------------------- | -------------------- |
| GET    | `/tasks`            | List tasks           |
| POST   | `/tasks`            | Add a task           |
| GET    | `/tasks/search`     | Search tasks         |
| GET    | `/tasks/:id`        | Show one task        |
| POST   | `/tasks/:id/toggle` | Mark done / not done |
| POST   | `/tasks/:id/delete` | Delete a task        |

The server-rendered views use plain HTML forms, so they work without JavaScript. Once hydrated, they can add extras: the task page asks for confirmation before deleting. The search view sets `export const render = 'client'`, so it renders only in the browser and filters as you type. Tasks are kept in memory and reset when the server restarts.
