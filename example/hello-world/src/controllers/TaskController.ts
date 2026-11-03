// Controller: reads the request, asks the Model for data, picks a View.
import { Request, Response } from 'express';
import Task from '../models/Task';

function parseId(req: Request): number {
  return Number(req.params.id);
}

export function index(req: Request, res: Response) {
  res.render('tasks/index', { tasks: Task.findAll(), error: null });
}

export function show(req: Request, res: Response) {
  const task = Task.findById(parseId(req));
  if (!task) return notFound(req, res);
  res.render('tasks/show', { task });
}

export function create(req: Request, res: Response) {
  try {
    Task.create(String(req.body?.title ?? ''));
    res.redirect('/tasks');
  } catch (err) {
    res.status(400).render('tasks/index', { tasks: Task.findAll(), error: (err as Error).message });
  }
}

export function toggle(req: Request, res: Response) {
  if (!Task.toggle(parseId(req))) return notFound(req, res);
  res.redirect('back' in req.query ? `/tasks/${req.params.id}` : '/tasks');
}

export function remove(req: Request, res: Response) {
  if (!Task.remove(parseId(req))) return notFound(req, res);
  res.redirect('/tasks');
}

export function notFound(req: Request, res: Response) {
  res.status(404).render('notFound', { path: req.originalUrl });
}
