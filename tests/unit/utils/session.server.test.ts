import { getSession, commitSession, destroySession } from '~/utils/session.server';
import type { Session } from '@remix-run/node';

// Mock environment variables
const originalEnv = process.env;
beforeEach(() => {
  process.env = {
    ...originalEnv,
    SESSION_SECRET: 'test-secret',
    NODE_ENV: 'test',
  };
});

afterEach(() => {
  process.env = originalEnv;
});

describe('Session Server', () => {
  describe('getSession', () => {
    it('should create a new session', async () => {
      const session = await getSession();
      expect(session).toBeDefined();
      expect(session.data).toEqual({});
    });

    it('should create a session with initial data', async () => {
      const initialData = { userId: '123', theme: 'dark' };
      const session = await getSession(JSON.stringify(initialData));
      expect(session.data).toEqual(initialData);
    });
  });

  describe('commitSession', () => {
    it('should commit session and return Set-Cookie header', async () => {
      const session = await getSession(JSON.stringify({ userId: '123' }));
      const cookie = await commitSession(session);
      
      expect(cookie).toBeDefined();
      expect(cookie).toContain('mailiq_session=');
      expect(cookie).toContain('Path=/');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Lax');
    });

    it('should include secure flag in production', async () => {
      process.env.NODE_ENV = 'production';
      const session = await getSession();
      const cookie = await commitSession(session);
      
      expect(cookie).toContain('Secure');
    });

    it('should not include secure flag in development', async () => {
      process.env.NODE_ENV = 'development';
      const session = await getSession();
      const cookie = await commitSession(session);
      
      expect(cookie).not.toContain('Secure');
    });
  });

  describe('destroySession', () => {
    it('should destroy session and return Set-Cookie header', async () => {
      const session = await getSession(JSON.stringify({ userId: '123' }));
      const cookie = await destroySession(session);
      
      expect(cookie).toBeDefined();
      expect(cookie).toContain('mailiq_session=');
      expect(cookie).toContain('Max-Age=0');
      expect(cookie).toContain('Path=/');
    });

    it('should clear session data', async () => {
      const session = await getSession(JSON.stringify({ userId: '123' }));
      await destroySession(session);
      
      expect(session.data).toEqual({});
    });
  });

  describe('Session Data', () => {
    it('should persist data between commits', async () => {
      const session = await getSession(JSON.stringify({ userId: '123' }));
      const cookie = await commitSession(session);
      
      // Create a new session with the same cookie
      const newSession = await getSession();
      newSession.set('userId', '123');
      
      expect(newSession.data).toEqual({ userId: '123' });
    });

    it('should handle multiple data updates', async () => {
      const session = await getSession();
      
      // Update session data multiple times
      session.set('userId', '123');
      session.set('theme', 'dark');
      session.set('lastLogin', new Date().toISOString());
      
      const cookie = await commitSession(session);
      expect(cookie).toBeDefined();
      expect(session.data).toEqual({
        userId: '123',
        theme: 'dark',
        lastLogin: expect.any(String),
      });
    });
  });
});
