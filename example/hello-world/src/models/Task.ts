// Model: owns the data and the rules for changing it.
// Data lives in memory, so it resets when the server restarts.

export interface Task {
  id: number;
  title: string;
  done: boolean;
  createdAt: Date;
}

let nextId = 1;
const tasks: Task[] = [];

function create(title: string): Task {
  const clean = title.trim();
  if (!clean) throw new Error('Title is required');
  if (clean.length > 100) throw new Error('Title must be 100 characters or fewer');

  const task: Task = { id: nextId++, title: clean, done: false, createdAt: new Date() };
  tasks.push(task);
  return task;
}

function findAll(): Task[] {
  return [...tasks];
}

function findById(id: number): Task | undefined {
  return tasks.find((task) => task.id === id);
}

function toggle(id: number): Task | undefined {
  const task = findById(id);
  if (task) task.done = !task.done;
  return task;
}

function remove(id: number): boolean {
  const index = tasks.findIndex((task) => task.id === id);
  if (index === -1) return false;
  tasks.splice(index, 1);
  return true;
}

// Some starting data so the list isn't empty
create('Read the Express 5 docs');
create('Build an MVC app');
toggle(1);

export default { create, findAll, findById, toggle, remove };
