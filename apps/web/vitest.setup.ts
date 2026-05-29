import "@testing-library/jest-dom/vitest";

// Provide minimal env vars consumed by client-side API helper modules.
process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:8000";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon_test_key";

