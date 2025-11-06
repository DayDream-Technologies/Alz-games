-- Create crossword_game_stats table
CREATE TABLE IF NOT EXISTS public.crossword_game_stats (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    solve_time_seconds INTEGER NOT NULL,
    solve_time_formatted TEXT NOT NULL,
    letters_revealed INTEGER DEFAULT 0,
    words_revealed INTEGER DEFAULT 0,
    words_completed_manually INTEGER DEFAULT 0,
    total_words INTEGER NOT NULL,
    completion_type TEXT NOT NULL CHECK (completion_type IN ('manual', 'revealed', 'mixed', 'solution')),
    hints_used INTEGER DEFAULT 0,
    perfect_completion BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.crossword_game_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for crossword_game_stats
-- Ensure users can only interact with their own data

-- Allow users to view their own rows
CREATE POLICY "Users can view their own crossword_game_stats data"
  ON public.crossword_game_stats
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert rows for themselves
CREATE POLICY "Users can insert their own crossword_game_stats data"
  ON public.crossword_game_stats
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own rows
CREATE POLICY "Users can update their own crossword_game_stats data"
  ON public.crossword_game_stats
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own rows
CREATE POLICY "Users can delete their own crossword_game_stats data"
  ON public.crossword_game_stats
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_crossword_game_stats_user_id ON public.crossword_game_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_crossword_game_stats_date ON public.crossword_game_stats(date);
CREATE INDEX IF NOT EXISTS idx_crossword_game_stats_created_at ON public.crossword_game_stats(created_at);
