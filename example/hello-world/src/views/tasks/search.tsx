import { useState } from 'react';
import Layout from '../components/Layout';
import type { Task } from '../../models/Task';

// This view runs in the browser, so it can use state and event handlers.
export const render = 'client';

export default function TaskSearch({ tasks }: { tasks: Task[] }) {
  const [query, setQuery] = useState('');
  const matches = tasks.filter((task) => task.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <Layout title="Search tasks">
      <h1>Search tasks</h1>
      <input
        type="text"
        placeholder="Type to filter…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />

      <ul>
        {matches.map((task) => (
          <li key={task.id}>
            <a className={task.done ? 'title done' : 'title'} href={`/tasks/${task.id}`}>
              {task.title}
            </a>
          </li>
        ))}
      </ul>
      {matches.length === 0 && <p>No tasks match "{query}".</p>}
    </Layout>
  );
}
