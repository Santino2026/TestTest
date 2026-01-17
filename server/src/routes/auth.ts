import { Router } from 'express';
import {
  signup,
  login,
  logout,
  refreshAccessToken,
  getUserById,
  verifyAccessToken
} from '../auth';

const router = Router();

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const result = await signup(email, password, name);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: getErrorMessage(error, 'Signup failed') });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await login(email, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: getErrorMessage(error, 'Login failed') });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const refreshToken = req.body.refresh_token || req.body.refreshToken;
    if (refreshToken) {
      await logout(refreshToken);
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.body.refresh_token || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const result = await refreshAccessToken(refreshToken);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const user = await getUserById(payload.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user' });
  }
});

export default router;
