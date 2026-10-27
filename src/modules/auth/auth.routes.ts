import { Router } from 'express';

import { authenticate, type AuthenticatedRequest } from '../../middlewares/authenticate.js';
import { authRateLimiter, otpRateLimiter } from '../../middlewares/rateLimiters.js';
import { validateBody } from '../../middlewares/validate.js';
import {
  changePassword,
  forgotPassword,
  getCurrentUser,
  login,
  logout,
  refreshSession,
  resendVerificationOtp,
  resetPassword,
  signupCustomer,
  verifyEmailOtp,
} from '../../services/auth.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import {
  clearAuthCookies,
  getAccessCookieName,
  getRefreshCookieName,
  setAuthCookies,
} from '../../utils/cookies.js';
import { verifyAccessToken } from '../../utils/jwt.js';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resendOtpSchema,
  resetPasswordSchema,
  signupSchema,
  verifyEmailSchema,
} from './auth.schemas.js';

/** @description Authentication routes mounted at `/auth`. */
export const authRouter = Router();

authRouter.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

/**
 * @openapi
 * /auth/signup:
 *   post:
 *     tags: [Auth]
 *     summary: Start customer signup (sends email OTP)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *     responses:
 *       200: { description: Generic success message }
 *       422: { description: Validation error }
 */
authRouter.post('/signup', authRateLimiter, validateBody(signupSchema), async (req, res, next) => {
  try {
    const result = await signupCustomer(req.body);
    sendSuccess(res, 200, result);
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /auth/verify-email:
 *   post:
 *     tags: [Auth]
 *     summary: Verify signup OTP and activate account
 */
authRouter.post(
  '/verify-email',
  authRateLimiter,
  validateBody(verifyEmailSchema),
  async (req, res, next) => {
    try {
      const session = await verifyEmailOtp(req.body);
      setAuthCookies(res, session.accessToken, session.refreshToken);
      sendSuccess(res, 200, { user: session.user });
    } catch (error) {
      next(error);
    }
  },
);

authRouter.post(
  '/resend-verification',
  otpRateLimiter,
  validateBody(resendOtpSchema),
  async (req, res, next) => {
    try {
      const result = await resendVerificationOtp(req.body.email);
      sendSuccess(res, 200, result);
    } catch (error) {
      next(error);
    }
  },
);

authRouter.post('/login', authRateLimiter, validateBody(loginSchema), async (req, res, next) => {
  try {
    const session = await login({
      email: req.body.email,
      password: req.body.password,
      userAgent: req.get('user-agent') ?? '',
    });
    setAuthCookies(res, session.accessToken, session.refreshToken);
    sendSuccess(res, 200, { user: session.user });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/staff/login', authRateLimiter, validateBody(loginSchema), async (req, res, next) => {
  try {
    const session = await login({
      email: req.body.email,
      password: req.body.password,
      userAgent: req.get('user-agent') ?? '',
      staffOnly: true,
    });
    setAuthCookies(res, session.accessToken, session.refreshToken);
    sendSuccess(res, 200, { user: session.user });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/logout', async (req, res, next) => {
  try {
    const refresh = req.cookies?.[getRefreshCookieName()] as string | undefined;
    await logout(refresh);
    clearAuthCookies(res);
    sendSuccess(res, 200, { message: 'Logged out' });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/refresh', async (req, res, next) => {
  try {
    const refresh = req.cookies?.[getRefreshCookieName()] as string | undefined;
    if (!refresh) {
      sendSuccess(res, 401, { message: 'Session expired' });
      return;
    }
    const tokens = await refreshSession(refresh);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    sendSuccess(res, 200, { message: 'Session refreshed' });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', async (req, res, next) => {
  try {
    const accessToken = req.cookies?.[getAccessCookieName()] as string | undefined;
    if (accessToken) {
      try {
        const payload = verifyAccessToken(accessToken);
        const user = await getCurrentUser(payload.sub);
        if (user) {
          sendSuccess(res, 200, { user });
          return;
        }
      } catch {
        // Access token expired or invalid — try refresh below.
      }
    }

    const refreshToken = req.cookies?.[getRefreshCookieName()] as string | undefined;
    if (refreshToken) {
      try {
        const tokens = await refreshSession(refreshToken);
        setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
        const payload = verifyAccessToken(tokens.accessToken);
        const user = await getCurrentUser(payload.sub);
        sendSuccess(res, 200, { user: user ?? null });
        return;
      } catch {
        clearAuthCookies(res);
      }
    }

    sendSuccess(res, 200, { user: null });
  } catch (error) {
    next(error);
  }
});

authRouter.post(
  '/change-password',
  authenticate,
  authRateLimiter,
  validateBody(changePasswordSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const result = await changePassword({
        userId: req.user!.id,
        currentPassword: req.body.currentPassword,
        newPassword: req.body.newPassword,
      });
      sendSuccess(res, 200, result);
    } catch (error) {
      next(error);
    }
  },
);

authRouter.post(
  '/forgot-password',
  otpRateLimiter,
  validateBody(forgotPasswordSchema),
  async (req, res, next) => {
    try {
      const result = await forgotPassword(req.body.email);
      sendSuccess(res, 200, result);
    } catch (error) {
      next(error);
    }
  },
);

authRouter.post(
  '/reset-password',
  authRateLimiter,
  validateBody(resetPasswordSchema),
  async (req, res, next) => {
    try {
      const result = await resetPassword(req.body);
      sendSuccess(res, 200, result);
    } catch (error) {
      next(error);
    }
  },
);
