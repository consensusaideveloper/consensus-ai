import { Router } from 'express';
import { ProjectService } from '../services/projectService';
import { OpinionService } from '../services/opinionService';
import { TaskService } from '../services/taskService';
import { validateCreateProject, validateUpdateProject, validateCreateOpinion, validateUpdateOpinion, validateCreateTask, validateUpdateTask } from '../middleware/validator';

const router = Router();

// Initialize services (singleton pattern for in-memory storage)
const projectService = new ProjectService();
const opinionService = new OpinionService(projectService);
const taskService = new TaskService(projectService);

// Project Routes
router.post('/', validateCreateProject, async (req, res, next) => {
    try {
        const project = await projectService.createProject(req.body);
        res.status(201).json(project);
    } catch (error) {
        next(error);
    }
});

router.get('/', async (req, res, next) => {
    try {
        const projects = await projectService.getProjects();
        res.json(projects);
    } catch (error) {
        next(error);
    }
});

router.get('/:id', async (req, res, next) => {
    try {
        const project = await projectService.getProject(req.params.id);
        res.json(project);
    } catch (error) {
        next(error);
    }
});

router.put('/:id', validateUpdateProject, async (req, res, next) => {
    try {
        const project = await projectService.updateProject(req.params.id, req.body);
        res.json(project);
    } catch (error) {
        next(error);
    }
});

router.delete('/:id', async (req, res, next) => {
    try {
        await projectService.deleteProject(req.params.id);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

router.post('/:id/complete', async (req, res, next) => {
    try {
        const project = await projectService.completeProject(req.params.id);
        res.json(project);
    } catch (error) {
        next(error);
    }
});

router.delete('/:id/priority', async (req, res, next) => {
    try {
        const project = await projectService.resetProjectPriority(req.params.id);
        res.json(project);
    } catch (error) {
        next(error);
    }
});

// Opinion Routes
router.post('/:id/opinions', validateCreateOpinion, async (req, res, next) => {
    try {
        const opinion = await opinionService.createOpinion(req.params.id, req.body);
        res.status(201).json(opinion);
    } catch (error) {
        next(error);
    }
});

router.get('/:id/opinions', async (req, res, next) => {
    try {
        const { topicId } = req.query;
        let opinions;
        
        if (topicId && typeof topicId === 'string') {
            opinions = await opinionService.getOpinionsByTopic(req.params.id, topicId);
        } else {
            opinions = await opinionService.getOpinionsByProject(req.params.id);
        }
        
        res.json(opinions);
    } catch (error) {
        next(error);
    }
});

router.put('/:projectId/opinions/:opinionId', validateUpdateOpinion, async (req, res, next) => {
    try {
        const opinion = await opinionService.updateOpinion(req.params.opinionId, req.body);
        res.json(opinion);
    } catch (error) {
        next(error);
    }
});

router.delete('/:projectId/opinions/:opinionId', async (req, res, next) => {
    try {
        await opinionService.deleteOpinion(req.params.opinionId);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// Task Routes
router.post('/:id/tasks', validateCreateTask, async (req, res, next) => {
    try {
        const task = await taskService.createTask(req.params.id, req.body);
        res.status(201).json(task);
    } catch (error) {
        next(error);
    }
});

router.get('/:id/tasks', async (req, res, next) => {
    try {
        const { status, overdue } = req.query;
        let tasks;
        
        if (overdue === 'true') {
            tasks = await taskService.getOverdueTasks(req.params.id);
        } else if (status && typeof status === 'string') {
            tasks = await taskService.getTasksByStatus(req.params.id, status as any);
        } else {
            tasks = await taskService.getTasksByProject(req.params.id);
        }
        
        res.json(tasks);
    } catch (error) {
        next(error);
    }
});

router.put('/:projectId/tasks/:taskId', validateUpdateTask, async (req, res, next) => {
    try {
        const task = await taskService.updateTask(req.params.taskId, req.body);
        res.json(task);
    } catch (error) {
        next(error);
    }
});

router.delete('/:projectId/tasks/:taskId', async (req, res, next) => {
    try {
        await taskService.deleteTask(req.params.taskId);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

router.post('/:projectId/tasks/:taskId/complete', async (req, res, next) => {
    try {
        const task = await taskService.completeTask(req.params.taskId);
        res.json(task);
    } catch (error) {
        next(error);
    }
});

export default router;