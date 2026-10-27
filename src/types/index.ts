/** @description Standard successful JSON envelope for API responses. */
export type ApiSuccessResponse<T extends Record<string, unknown>> = {
  success: true;
} & T;

/** @description Standard error JSON envelope for API responses. */
export type ApiErrorResponse = {
  success: false;
  message: string;
  stack?: string;
};
