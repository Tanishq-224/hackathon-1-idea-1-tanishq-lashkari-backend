/**
 * @description Augments Express `Request` for validated query params (Express 5 read-only `query`).
 */
declare global {
  namespace Express {
    interface Request {
      validatedQuery?: unknown;
    }
  }
}

export {};
