-- RLS policies (design/database.md §8)

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_daily ENABLE ROW LEVEL SECURITY;

-- profiles
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- goals
DROP POLICY IF EXISTS goals_select_own ON public.goals;
CREATE POLICY goals_select_own ON public.goals
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS goals_insert_own ON public.goals;
CREATE POLICY goals_insert_own ON public.goals
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS goals_update_own ON public.goals;
CREATE POLICY goals_update_own ON public.goals
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS goals_delete_own ON public.goals;
CREATE POLICY goals_delete_own ON public.goals
  FOR DELETE
  USING (user_id = auth.uid());

-- goal_items (all)
DROP POLICY IF EXISTS goal_items_all_own ON public.goal_items;
CREATE POLICY goal_items_all_own ON public.goal_items
  FOR ALL
  USING (public.is_goal_owner(goal_id))
  WITH CHECK (public.is_goal_owner(goal_id));

-- chat_messages (all)
DROP POLICY IF EXISTS chat_messages_all_own ON public.chat_messages;
CREATE POLICY chat_messages_all_own ON public.chat_messages
  FOR ALL
  USING (public.is_goal_owner(goal_id))
  WITH CHECK (public.is_goal_owner(goal_id));

-- review_sessions (all)
DROP POLICY IF EXISTS review_sessions_all_own ON public.review_sessions;
CREATE POLICY review_sessions_all_own ON public.review_sessions
  FOR ALL
  USING (public.is_goal_owner(goal_id))
  WITH CHECK (public.is_goal_owner(goal_id));

-- ai_usage_daily
DROP POLICY IF EXISTS ai_usage_select_own ON public.ai_usage_daily;
CREATE POLICY ai_usage_select_own ON public.ai_usage_daily
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS ai_usage_insert_own ON public.ai_usage_daily;
CREATE POLICY ai_usage_insert_own ON public.ai_usage_daily
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS ai_usage_update_own ON public.ai_usage_daily;
CREATE POLICY ai_usage_update_own ON public.ai_usage_daily
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
