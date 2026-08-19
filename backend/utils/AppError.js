'use strict';

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, code = 'BAD_REQUEST', details = null) {
    return new AppError(message, 400, code, details);
  }

  static unauthorized(message = 'Not authenticated.', code = 'UNAUTHORIZED', details = null) {
    return new AppError(message, 401, code, details);
  }

  static forbidden(message = 'Access denied.', code = 'FORBIDDEN', details = null) {
    return new AppError(message, 403, code, details);
  }

  static notFound(message = 'Resource not found.', code = 'NOT_FOUND', details = null) {
    return new AppError(message, 404, code, details);
  }

  static internal(message = 'An unexpected internal error occurred.', code = 'INTERNAL_ERROR', details = null) {
    return new AppError(message, 500, code, details);
  }

  toJSON() {
    return {
      success: false,
      message: this.message,
      code: this.code,
      ...(this.details ? { details: this.details } : {}),
    };
  }
}

module.exports = { AppError };
