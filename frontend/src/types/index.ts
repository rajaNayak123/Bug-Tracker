export type BugSeverity = 'low' | 'med' | 'high';
export type BugStatus = 'open' | 'in-progress' | 'closed';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Bug {
  id: string;
  userId: string;
  title: string;
  description: string;
  severity: BugSeverity;
  status: BugStatus;
  imageKey?: string | null;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  status: 'success' | 'fail' | 'error';
  message?: string;
  data: {
    user: User;
    token: string;
  };
}

export interface UploadUrlResponse {
  status: 'success' | 'fail' | 'error';
  message?: string;
  data: {
    uploadUrl: string;
    imageKey: string;
    expiresIn: number;
    requiredHeaders: Record<string, string>;
  };
}

export interface ApiResponse<T> {
  status: 'success' | 'fail' | 'error';
  message?: string;
  data: T;
  results?: number;
  code?: string;
  errors?: Array<{ field: string; message: string }>;
}
