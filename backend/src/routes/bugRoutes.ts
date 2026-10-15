import { Router } from 'express';
import { bugController } from '../controllers/bugController';
import { uploadController } from '../controllers/uploadController';
import { authMiddleware } from '../middleware/authMiddleware';
import {
  validate,
  createBugSchema,
  updateBugSchema,
  uploadUrlSchema,
  bugQuerySchema,
  objectIdParamSchema,
} from '../middleware/validate';

const router = Router();

router.use(authMiddleware);

router.post(
  '/upload-url',
  validate({ body: uploadUrlSchema }),
  (req, res, next) => {
    uploadController.getUploadUrl(req, res, next);
  }
);

router.post(
  '/',
  validate({ body: createBugSchema }),
  (req, res, next) => {
    bugController.createBug(req, res, next);
  }
);

router.get(
  '/',
  validate({ query: bugQuerySchema }),
  (req, res, next) => {
    bugController.listBugs(req, res, next);
  }
);

router.get(
  '/:id',
  validate({ params: objectIdParamSchema }),
  (req, res, next) => {
    bugController.getBugById(req, res, next);
  }
);

router.put(
  '/:id',
  validate({ params: objectIdParamSchema, body: updateBugSchema }),
  (req, res, next) => {
    bugController.updateBug(req, res, next);
  }
);

router.delete(
  '/:id',
  validate({ params: objectIdParamSchema }),
  (req, res, next) => {
    bugController.deleteBug(req, res, next);
  }
);

export const bugRoutes = router;
