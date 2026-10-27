/**
 * @description Operational HTTP error with status code for centralized handling.
 */
export class AppError extends Error {
  /** @description HTTP status code sent to the client. */
  readonly statusCode: number;

  /** @description Whether the error is safe to expose to API clients. */
  readonly isOperational: boolean;

  /**
   * @description Creates an operational application error.
   * @param {string} message - Client-safe error message.
   * @param {number} statusCode - HTTP status code.
   * @param {boolean} [isOperational=true] - Marks error as operational.
   */
  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = isOperational;
  }
}
