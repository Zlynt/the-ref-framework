import Layout from '../components/Layout';
import type { Task } from '../../models/Task';

export default function TaskShow({ task }: { task: Task }) {
  return (
    <Layout title={task.title}>
      <h1 className={task.done ? 'done' : undefined}>{task.title}</h1>
      <p>Status: {task.done ? 'Done' : 'To do'}</p>
      <p>Created: {task.createdAt.toLocaleString('en-GB')}</p>

      <form className="inline" method="post" action={`/tasks/${task.id}/toggle?back`}>
        <button type="submit">{task.done ? 'Mark as to do' : 'Mark as done'}</button>
      </form>{' '}
      <form className="inline" method="post" action={`/tasks/${task.id}/delete`}>
        <button type="submit">Delete</button>
      </form>

      <p>
        <a href="/tasks">← Back to all tasks</a>
      </p>
    </Layout>
  );
}
