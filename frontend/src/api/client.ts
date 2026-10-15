import { ApiResponse, AuthResponse, Bug, UploadUrlResponse } from '../types';

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

export class ApiError extends Error {
  statusCode: number;
  code?: string;
  errors?: Array<{ field: string; message: string }>;

  constructor(message: string, statusCode: number, code?: string, errors?: Array<{ field: string; message: string }>) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('bugtracker_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${endpoint}`;
  let response: Response;

  try {
    response = await fetch(url, { ...options, headers });
  } catch (err: any) {
    throw new ApiError('Network connection error. Please verify the backend is running.', 0);
  }

  if (response.status === 401) {
    localStorage.removeItem('bugtracker_token');
    localStorage.removeItem('bugtracker_user');
    window.dispatchEvent(new Event('auth:unauthorized'));
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.message || `Request failed with HTTP status ${response.status}`;
    throw new ApiError(errorMsg, response.status, data?.code, data?.errors);
  }

  return data as T;
}

export const authApi = {
  signup: async (name: string, email: string, password: string): Promise<AuthResponse> => {
    return request<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  getMe: async (): Promise<ApiResponse<{ user: any }>> => {
    return request<ApiResponse<{ user: any }>>('/auth/me');
  },
};

export const bugApi = {
  listBugs: async (params?: { status?: string; search?: string }): Promise<ApiResponse<{ bugs: Bug[] }>> => {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'all') {
      query.set('status', params.status);
    }
    if (params?.search) {
      query.set('search', params.search);
    }
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return request<ApiResponse<{ bugs: Bug[] }>>(`/bugs${queryString}`);
  },

  getBug: async (id: string): Promise<ApiResponse<{ bug: Bug }>> => {
    return request<ApiResponse<{ bug: Bug }>>(`/bugs/${id}`);
  },

  createBug: async (data: {
    title: string;
    description: string;
    severity: string;
    status?: string;
    imageKey?: string | null;
  }): Promise<ApiResponse<{ bug: Bug }>> => {
    return request<ApiResponse<{ bug: Bug }>>('/bugs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateBug: async (
    id: string,
    data: {
      title?: string;
      description?: string;
      severity?: string;
      status?: string;
      imageKey?: string | null;
    }
  ): Promise<ApiResponse<{ bug: Bug }>> => {
    return request<ApiResponse<{ bug: Bug }>>(`/bugs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteBug: async (id: string): Promise<ApiResponse<null>> => {
    return request<ApiResponse<null>>(`/bugs/${id}`, {
      method: 'DELETE',
    });
  },

  getUploadUrl: async (fileName: string, fileType: string, fileSize: number): Promise<UploadUrlResponse> => {
    return request<UploadUrlResponse>('/bugs/upload-url', {
      method: 'POST',
      body: JSON.stringify({ fileName, fileType, fileSize }),
    });
  },
};

export const s3Api = {
  uploadFileToS3: (
    uploadUrl: string,
    file: File,
    requiredHeaders: Record<string, string>,
    onProgress?: (percent: number) => void
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl);

      for (const [key, value] of Object.entries(requiredHeaders)) {
        xhr.setRequestHeader(key, value);
      }

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`S3 upload failed with status ${xhr.status}: ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('S3 upload network error. Please verify S3 CORS and network connectivity.'));
      };

      xhr.send(file);
    });
  },
};
