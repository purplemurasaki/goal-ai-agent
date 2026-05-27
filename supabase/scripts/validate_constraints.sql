-- Local validation script (not a migration)
BEGIN;

INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  is_sso_user,
  is_anonymous
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'a@test.com',
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now(),
  false,
  false
);
-- profile row is created by on_auth_user_created trigger

INSERT INTO goals (user_id, title, due_date)
VALUES ('11111111-1111-1111-1111-111111111111', 'Goal 1', '2026-12-31');

DO $test$
BEGIN
  INSERT INTO goals (user_id, title, due_date)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Goal 2', '2026-12-31');
  RAISE EXCEPTION 'expected unique violation';
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'OK: goals.user_id UNIQUE works';
END
$test$;

DO $test$
BEGIN
  INSERT INTO goals (user_id, title, due_date, description)
  VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Bad',
    '2026-12-31',
    repeat('x', 2001)
  );
  RAISE EXCEPTION 'expected check violation';
EXCEPTION
  WHEN check_violation THEN
    RAISE NOTICE 'OK: goals description length CHECK works';
END
$test$;

DO $test$
DECLARE
  v_goal_id UUID;
BEGIN
  SELECT id INTO v_goal_id FROM goals WHERE user_id = '11111111-1111-1111-1111-111111111111' LIMIT 1;

  BEGIN
    INSERT INTO goal_items (goal_id, parent_id, item_type, title)
    VALUES (v_goal_id, NULL, 'task', 'invalid task without parent');
    RAISE EXCEPTION 'expected check violation for task parent';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE 'OK: goal_items parent_type CHECK works';
  END;
END
$test$;

ROLLBACK;
