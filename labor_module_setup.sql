-- 1. Ensure the Transactions table exists and has necessary columns
CREATE TABLE IF NOT EXISTS public.labor_transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    worker_id uuid REFERENCES public.labor_profiles(id) ON DELETE CASCADE,
    amount numeric NOT NULL,
    date date DEFAULT CURRENT_DATE,
    type text NOT NULL, -- 'Weekly Settle', 'Advance', 'Advance Repayment', 'Annual Installment'
    note text,
    repayment_method text, -- 'Cash' or 'Wage Income'
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Check if column exists, add if not (for users who already ran the previous script)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='labor_transactions' AND column_name='repayment_method') THEN
        ALTER TABLE public.labor_transactions ADD COLUMN repayment_method text;
    END IF;
END $$;

-- 2. Make sure RLS is on
ALTER TABLE public.labor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labor_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labor_transactions ENABLE ROW LEVEL SECURITY;

-- 3. DROP and RE-CREATE policies (to avoid the "already exists" error)
DROP POLICY IF EXISTS "Users can manage their own labor profiles" ON public.labor_profiles;
CREATE POLICY "Users can manage their own labor profiles" ON public.labor_profiles
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own labor attendance" ON public.labor_attendance;
CREATE POLICY "Users can manage their own labor attendance" ON public.labor_attendance
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own labor transactions" ON public.labor_transactions;
CREATE POLICY "Users can manage their own labor transactions" ON public.labor_transactions
    FOR ALL USING (auth.uid() = user_id);

-- 4. Add performance indices
CREATE INDEX IF NOT EXISTS idx_labor_attendance_date ON public.labor_attendance(date);
CREATE INDEX IF NOT EXISTS idx_labor_transactions_worker ON public.labor_transactions(worker_id);

-- 5. RELOAD SCHEMA
-- After running this, remember to click "Reload Schema" in your Supabase API settings!

-- 6. Labor Contracts table
CREATE TABLE IF NOT EXISTS public.labor_contracts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    contractor_id uuid REFERENCES public.labor_profiles(id) ON DELETE CASCADE,
    project_name text NOT NULL,
    service text,
    start_date date DEFAULT CURRENT_DATE,
    deadline date,
    total_amount numeric DEFAULT 0,
    advance_paid numeric DEFAULT 0,
    status text DEFAULT 'Active', -- 'Active', 'Completed', 'Cancelled'
    plot_id uuid REFERENCES public.plots(id),
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Safely add new columns to labor_contracts (if table already exists)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='labor_contracts' AND column_name='service') THEN
        ALTER TABLE public.labor_contracts ADD COLUMN service text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='labor_contracts' AND column_name='start_date') THEN
        ALTER TABLE public.labor_contracts ADD COLUMN start_date date DEFAULT CURRENT_DATE;
    END IF;
END $$;

ALTER TABLE public.labor_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own labor contracts" ON public.labor_contracts;
CREATE POLICY "Users can manage their own labor contracts" ON public.labor_contracts
    FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_labor_contracts_contractor ON public.labor_contracts(contractor_id);
