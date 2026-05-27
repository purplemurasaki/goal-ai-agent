-- Indexes (design/database.md §6)

-- goals
CREATE INDEX IF NOT EXISTS goals_user_id_idx ON public.goals (user_id);

-- goal_items
CREATE INDEX IF NOT EXISTS goal_items_goal_id_idx ON public.goal_items (goal_id);
CREATE INDEX IF NOT EXISTS goal_items_parent_id_idx ON public.goal_items (parent_id);
CREATE INDEX IF NOT EXISTS goal_items_goal_parent_sort_idx ON public.goal_items (goal_id, parent_id, sort_order);

-- chat_messages
CREATE INDEX IF NOT EXISTS chat_messages_goal_id_created_idx ON public.chat_messages (goal_id, created_at);

-- review_sessions
CREATE INDEX IF NOT EXISTS review_sessions_goal_id_created_idx ON public.review_sessions (goal_id, created_at DESC);
