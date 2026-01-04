import { vi } from 'vitest';

// Mock environment variables before importing modules that use them
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-key';
process.env.SUPABASE_STORAGE_BUCKET = 'test-bucket';
process.env.JWT_SECRET = 'test-secret';

// Mock Supabase client to avoid network requests during tests
vi.mock('@supabase/supabase-js', () => {
  return {
    createClient: vi.fn(() => ({
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn().mockResolvedValue({ data: {}, error: null }),
          getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'http://mock-url' } }),
          remove: vi.fn().mockResolvedValue({ error: null }),
        })),
      },
    })),
  };
});
