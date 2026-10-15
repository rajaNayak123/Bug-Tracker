import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export function validate(schema: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schema.params) {
        req.params = await schema.params.parseAsync(req.params);
      }
      if (schema.query) {
        req.query = await schema.query.parseAsync(req.query);
      }
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));

        res.status(400).json({
          status: 'fail',
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          errors: formattedErrors,
        });
        return;
      }
      next(error);
    }
  };
}

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const objectIdParamSchema = z.object({
  id: z.string().regex(objectIdRegex, 'Invalid MongoDB ObjectId format'),
});

export const signupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters'),
  email: z.string().trim().toLowerCase().email('Invalid email address format'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address format'),
  password: z.string().min(1, 'Password is required'),
});

export const createBugSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200, 'Title cannot exceed 200 characters'),
  description: z.string().trim().min(5, 'Description must be at least 5 characters').max(5000, 'Description cannot exceed 5000 characters'),
  severity: z.enum(['low', 'med', 'high'], {
    errorMap: () => ({ message: "Severity must be 'low', 'med', or 'high'" }),
  }),
  status: z.enum(['open', 'in-progress', 'closed'], {
    errorMap: () => ({ message: "Status must be 'open', 'in-progress', or 'closed'" }),
  }).optional().default('open'),
  imageKey: z.string().trim().optional().nullable(),
});

export const updateBugSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200, 'Title cannot exceed 200 characters').optional(),
  description: z.string().trim().min(5, 'Description must be at least 5 characters').max(5000, 'Description cannot exceed 5000 characters').optional(),
  severity: z.enum(['low', 'med', 'high'], {
    errorMap: () => ({ message: "Severity must be 'low', 'med', or 'high'" }),
  }).optional(),
  status: z.enum(['open', 'in-progress', 'closed'], {
    errorMap: () => ({ message: "Status must be 'open', 'in-progress', or 'closed'" }),
  }).optional(),
  imageKey: z.string().trim().optional().nullable(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field (title, description, severity, status, imageKey) must be provided for update' }
);

export const uploadUrlSchema = z.object({
  fileName: z.string().min(1, 'fileName is required').refine(
    (name) => /\.(jpg|jpeg|png|webp)$/i.test(name),
    { message: 'fileName must end in .jpg, .jpeg, .png, or .webp' }
  ),
  fileType: z.enum(['image/jpeg', 'image/png', 'image/webp'], {
    errorMap: () => ({ message: "fileType must be 'image/jpeg', 'image/png', or 'image/webp'" }),
  }),
  fileSize: z.number().int().positive().max(5 * 1024 * 1024, 'File size cannot exceed 5 MB').optional(),
});

export const bugQuerySchema = z.object({
  status: z.enum(['open', 'in-progress', 'closed', 'all']).optional(),
  search: z.string().optional(),
});
