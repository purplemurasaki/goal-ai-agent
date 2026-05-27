-- Local RLS validation (not a migration)

-- Cleanup leftovers from previous runs
DELETE FROM goals WHERE id IN (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'dddddddd-dddd-dddd-dddd-dddddddddddd'
);
DELETE FROM auth.users WHERE id IN (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
);

-- Setup data (postgres bypasses RLS for INSERT)
INSERT INTO auth.users (
  id, instance_id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous
)
VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'usera@test.com', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), false, false
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'userb@test.com', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), false, false
  );

INSERT INTO goals (id, user_id, title, due_date) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Goal A', '2026-12-31'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Goal B', '2026-12-31');

-- User A
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false);

SELECT CASE
  WHEN auth.uid() = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
   AND (SELECT COUNT(*) FROM goals) = 1
  THEN 'OK: user A RLS'
  ELSE 'FAIL: user A RLS'
END AS rls_user_a_check;

-- User B
SELECT set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', false);

SELECT CASE
  WHEN auth.uid() = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid
   AND (SELECT COUNT(*) FROM goals) = 1
  THEN 'OK: user B RLS'
  ELSE 'FAIL: user B RLS'
END AS rls_user_b_check;

RESET ROLE;

-- Cleanup
DELETE FROM goals WHERE id IN (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'dddddddd-dddd-dddd-dddd-dddddddddddd'
);
DELETE FROM auth.users WHERE id IN (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
);
