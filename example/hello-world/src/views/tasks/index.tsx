import Layout from '../components/Layout';
import type { Task } from '../../models/Task';

export default function TaskIndex({ tasks, error }: { tasks: Task[]; error?: string }) {
  const remaining = tasks.filter((task) => !task.done).length;

  return (
    <Layout title="Tasks">
      <h1>Tasks</h1>
      <p>
        {remaining} of {tasks.length} left to do
      </p>

      <form method="post" action="/tasks">
        <input type="text" name="title" placeholder="What needs doing?" maxLength={100} required />{' '}
        <button type="submit">Add</button>
      </form>
      {error && <p className="error">{error}</p>}

      <ul>
        {tasks.map((task) => (
          <li key={task.id}>
            <form className="inline" method="post" action={`/tasks/${task.id}/toggle`}>
              <button type="submit">{task.done ? 'Undo' : 'Done'}</button>
            </form>
            <a className={task.done ? 'title done' : 'title'} href={`/tasks/${task.id}`}>
              {task.title}
            </a>
            <form className="inline" method="post" action={`/tasks/${task.id}/delete`}>
              <button type="submit">Delete</button>
            </form>
          </li>
        ))}
      </ul>
    </Layout>
  );
}
