import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';
import { authRateLimiter } from '../middleware/rateLimiter';
import { validate, signupSchema, loginSchema } from '../middleware/validate';

const router = Router();

router.post('/signup', authRateLimiter, validate({ body: signupSchema }), (req, res, next) => {
  authController.signup(req, res, next);
});

router.post('/login', authRateLimiter, validate({ body: loginSchema }), (req, res, next) => {
  authController.login(req, res, next);
});

router.get('/me', authMiddleware, (req, res, next) => {
  authController.getMe(req, res, next);
});

export const authRoutes = router;
