-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#10b981',
  icon TEXT NOT NULL DEFAULT 'tag',
  budget DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payments table (monthly income)
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create challenge_40k table
CREATE TABLE public.challenge_40k (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_value DECIMAL(12,2) NOT NULL DEFAULT 40000,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create challenge_deposits table
CREATE TABLE public.challenge_deposits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES public.challenge_40k(id) ON DELETE CASCADE,
  deposit_value INTEGER NOT NULL,
  sequence_order INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_40k ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_deposits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories
CREATE POLICY "Users can view their own categories" ON public.categories
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own categories" ON public.categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own categories" ON public.categories
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own categories" ON public.categories
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for expenses
CREATE POLICY "Users can view their own expenses" ON public.expenses
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own expenses" ON public.expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own expenses" ON public.expenses
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own expenses" ON public.expenses
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for payments
CREATE POLICY "Users can view their own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own payments" ON public.payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own payments" ON public.payments
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own payments" ON public.payments
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for challenge_40k
CREATE POLICY "Users can view their own challenge" ON public.challenge_40k
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own challenge" ON public.challenge_40k
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own challenge" ON public.challenge_40k
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own challenge" ON public.challenge_40k
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for challenge_deposits (access through challenge ownership)
CREATE POLICY "Users can view their challenge deposits" ON public.challenge_deposits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.challenge_40k 
      WHERE id = challenge_deposits.challenge_id 
      AND user_id = auth.uid()
    )
  );
CREATE POLICY "Users can create their challenge deposits" ON public.challenge_deposits
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.challenge_40k 
      WHERE id = challenge_deposits.challenge_id 
      AND user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update their challenge deposits" ON public.challenge_deposits
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.challenge_40k 
      WHERE id = challenge_deposits.challenge_id 
      AND user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete their challenge deposits" ON public.challenge_deposits
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.challenge_40k 
      WHERE id = challenge_deposits.challenge_id 
      AND user_id = auth.uid()
    )
  );

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_40k;
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_deposits;