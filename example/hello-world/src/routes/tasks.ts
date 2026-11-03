// Routes: map URLs to controller actions.
import { Router } from 'express';
import * as TaskController from '../controllers/TaskController';

const router = Router();

router.get('/', TaskController.index);
router.post('/', TaskController.create);
router.get('/:id', TaskController.show);
router.post('/:id/toggle', TaskController.toggle);
router.post('/:id/delete', TaskController.remove);

export default router;
