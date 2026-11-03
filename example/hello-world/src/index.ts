import express from 'express';
import path from 'path';
import RenderEngine from '../../../src';
import taskRoutes from './routes/tasks';
import { notFound } from './controllers/TaskController';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// View layer: REF renders the .tsx files in ./views as HTML
new RenderEngine({
  viewsPath: path.join(__dirname, 'views'),
  jsxOrTsx: 'TypeScript XML',
  expressApp: app,
});

// Parse HTML form posts into req.body
app.use(express.urlencoded({ extended: false }));

app.get('/', (req, res) => res.redirect('/tasks'));
app.use('/tasks', taskRoutes);
app.use(notFound);

app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
