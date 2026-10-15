type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function sanitize(data: any): any {
  if (!data || typeof data !== 'object') return data;
  const clone = Array.isArray(data) ? [...data] : { ...data };
  const sensitiveKeys = ['password', 'token', 'authorization', 'secret', 'key', 'aws_secret_access_key'];
  for (const k of Object.keys(clone)) {
    if (sensitiveKeys.some(s => k.toLowerCase().includes(s))) {
      clone[k] = '[REDACTED]';
    } else if (typeof clone[k] === 'object') {
      clone[k] = sanitize(clone[k]);
    }
  }
  return clone;
}

export const logger = {
  info: (message: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    console.log(JSON.stringify({ timestamp, level: 'info', message, ...(meta ? { meta: sanitize(meta) } : {}) }));
  },
  warn: (message: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    console.warn(JSON.stringify({ timestamp, level: 'warn', message, ...(meta ? { meta: sanitize(meta) } : {}) }));
  },
  error: (message: string, error?: any) => {
    const timestamp = new Date().toISOString();
    const errorDetails = error instanceof Error 
      ? { message: error.message, stack: error.stack }
      : sanitize(error);
    console.error(JSON.stringify({ timestamp, level: 'error', message, error: errorDetails }));
  },
  debug: (message: string, meta?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      const timestamp = new Date().toISOString();
      console.debug(JSON.stringify({ timestamp, level: 'debug', message, ...(meta ? { meta: sanitize(meta) } : {}) }));
    }
  }
};
