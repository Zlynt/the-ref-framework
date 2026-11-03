import type { FormEvent } from 'react';
import Layout from '../components/Layout';
import type { Task } from '../../models/Task';

// Runs in the browser once the page is hydrated. Without JavaScript, the form simply submits.
function confirmDelete(event: FormEvent) {
  if (!confirm('Delete this task?')) event.preventDefault();
}

export default function TaskShow({ task }: { task: Task }) {
  return (
    <Layout title={task.title}>
      <h1 className={task.done ? 'done' : undefined}>{task.title}</h1>
      <p>Status: {task.done ? 'Done' : 'To do'}</p>
      {/* Props reach the browser as JSON, so the date arrives as a string there. UTC keeps both sides equal. */}
      <p>Created: {new Date(task.createdAt).toLocaleString('en-GB', { timeZone: 'UTC' })} UTC</p>

      <form className="inline" method="post" action={`/tasks/${task.id}/toggle?back`}>
        <button type="submit">{task.done ? 'Mark as to do' : 'Mark as done'}</button>
      </form>{' '}
      <form className="inline" method="post" action={`/tasks/${task.id}/delete`} onSubmit={confirmDelete}>
        <button type="submit">Delete</button>
      </form>

      <p>
        <a href="/tasks">← Back to all tasks</a>
      </p>
    </Layout>
  );
}
