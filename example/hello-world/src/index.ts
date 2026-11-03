import express from 'express';
import path from 'path';
import ref from '../../../src';
import Tasks from './models/Task';

const app = express();
app.use(express.urlencoded()); // Read HTML form posts into req.body
ref(app, { views: path.join(__dirname, 'views') });

app.get('/', (req, res) => res.redirect('/tasks'));

app.get('/tasks', (req, res) => {
  res.render('tasks/index', { tasks: Tasks.findAll() });
});

app.post('/tasks', (req, res) => {
  try {
    Tasks.create(String(req.body?.title ?? ''));
    res.redirect('/tasks');
  } catch (err) {
    res.status(400).render('tasks/index', { tasks: Tasks.findAll(), error: (err as Error).message });
  }
});

app.get('/tasks/:id', (req, res) => {
  const task = Tasks.findById(Number(req.params.id));
  if (!task) return notFound(req, res);
  res.render('tasks/show', { task });
});

app.post('/tasks/:id/toggle', (req, res) => {
  if (!Tasks.toggle(Number(req.params.id))) return notFound(req, res);
  res.redirect('back' in req.query ? `/tasks/${req.params.id}` : '/tasks');
});

app.post('/tasks/:id/delete', (req, res) => {
  if (!Tasks.remove(Number(req.params.id))) return notFound(req, res);
  res.redirect('/tasks');
});

app.use(notFound);

function notFound(req: express.Request, res: express.Response) {
  res.status(404).render('notFound', { path: req.originalUrl });
}

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`Listening on http://localhost:${port}`));
