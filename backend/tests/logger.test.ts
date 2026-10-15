import { sanitize, logger } from '../src/utils/logger';

describe('Structured Logger & Sanitization Tests', () => {
  it('should redact sensitive properties from log metadata', () => {
    const sensitivePayload = {
      email: 'user@example.com',
      password: 'PlainSecretPassword123!',
      token: 'jwt.token.string',
      authorization: 'Bearer secret_token',
      nested: {
        aws_secret_access_key: 'SuperSecretAwsKey',
        safeProperty: 'VisibleValue',
      },
    };

    const sanitized = sanitize(sensitivePayload);

    expect(sanitized.email).toBe('user@example.com');
    expect(sanitized.password).toBe('[REDACTED]');
    expect(sanitized.token).toBe('[REDACTED]');
    expect(sanitized.authorization).toBe('[REDACTED]');
    expect(sanitized.nested.aws_secret_access_key).toBe('[REDACTED]');
    expect(sanitized.nested.safeProperty).toBe('VisibleValue');
  });

  it('should output valid JSON logs for info, warn, and error', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    logger.info('Test info message', { count: 5 });
    logger.warn('Test warning message', { reason: 'deprecate' });
    logger.error('Test error message', new Error('Something exploded'));

    expect(consoleSpy).toHaveBeenCalled();
    const infoOutput = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(infoOutput).toHaveProperty('level', 'info');
    expect(infoOutput).toHaveProperty('message', 'Test info message');
    expect(infoOutput.meta).toEqual({ count: 5 });

    expect(warnSpy).toHaveBeenCalled();
    const warnOutput = JSON.parse(warnSpy.mock.calls[0][0]);
    expect(warnOutput).toHaveProperty('level', 'warn');
    expect(warnOutput).toHaveProperty('message', 'Test warning message');

    expect(errorSpy).toHaveBeenCalled();
    const errorOutput = JSON.parse(errorSpy.mock.calls[0][0]);
    expect(errorOutput).toHaveProperty('level', 'error');
    expect(errorOutput.error).toHaveProperty('message', 'Something exploded');

    consoleSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
