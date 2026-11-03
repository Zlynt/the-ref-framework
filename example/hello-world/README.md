# Hello World: MVC with Express 5 and REF

A small task list app that uses Express 5 with the Model-View-Controller pattern. REF renders the React views on the server.

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
  index.ts                     App setup: view engine, body parsing, routes
  models/Task.ts               Model: in-memory task data and validation
  controllers/TaskController.ts  Controller: handles requests, picks a view
  routes/tasks.ts              Maps URLs to controller actions
  views/                       Views: React components rendered to HTML
    components/Layout.tsx      Shared page layout
    tasks/index.tsx            Task list and "add task" form
    tasks/show.tsx             One task
    notFound.tsx               404 page
register.js                    Lets Node load .ts/.tsx files (Babel)
```

## Routes

| Method | URL                 | Action                  |
| ------ | ------------------- | ----------------------- |
| GET    | `/tasks`            | List tasks              |
| POST   | `/tasks`            | Add a task              |
| GET    | `/tasks/:id`        | Show one task           |
| POST   | `/tasks/:id/toggle` | Mark done / not done    |
| POST   | `/tasks/:id/delete` | Delete a task           |

The views use plain HTML forms, so the app works without client-side JavaScript. Tasks are kept in memory and reset when the server restarts.
