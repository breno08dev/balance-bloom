import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Wallet, 
  TrendingDown, 
  PiggyBank, 
  Target,
  Plus,
  DollarSign
} from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Category {
  id: string;
  name: string;
  color: string;
  budget: number;
}

interface Expense {
  id: string;
  amount: number;
  category_id: string | null;
  expense_date: string;
}

interface Payment {
  id: string;
  amount: number;
}

interface ChallengeProgress {
  current: number;
  target: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [income, setIncome] = useState<number>(0);
  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [challengeProgress, setChallengeProgress] = useState<ChallengeProgress>({ current: 0, target: 40000 });
  const [newIncome, setNewIncome] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch payment/income
      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (payments && payments.length > 0) {
        setIncome(Number(payments[0].amount));
      }

      // Fetch categories
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user!.id);

      if (categoriesData) {
        setCategories(categoriesData);
      }

      // Fetch expenses for current month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: expensesData } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user!.id)
        .gte('expense_date', startOfMonth.toISOString().split('T')[0]);

      if (expensesData) {
        setExpenses(expensesData);
        const total = expensesData.reduce((sum, exp) => sum + Number(exp.amount), 0);
        setTotalExpenses(total);
      }

      // Fetch challenge progress
      const { data: challenge } = await supabase
        .from('challenge_40k')
        .select('id, target_value')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (challenge) {
        const { data: deposits } = await supabase
          .from('challenge_deposits')
          .select('deposit_value')
          .eq('challenge_id', challenge.id)
          .eq('status', 'completed');

        const current = deposits?.reduce((sum, d) => sum + Number(d.deposit_value), 0) || 0;
        setChallengeProgress({ current, target: Number(challenge.target_value) });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveIncome = async () => {
    const amount = parseFloat(newIncome);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Informe um valor válido');
      return;
    }

    try {
      const { error } = await supabase
        .from('payments')
        .insert({ user_id: user!.id, amount });

      if (error) throw error;

      setIncome(amount);
      setNewIncome('');
      setIsDialogOpen(false);
      toast.success('Renda mensal atualizada!');
    } catch (error) {
      toast.error('Erro ao salvar renda');
    }
  };

  const balance = income - totalExpenses;
  const balancePercent = income > 0 ? (balance / income) * 100 : 0;

  // Prepare pie chart data
  const pieData = categories.map(cat => {
    const catExpenses = expenses
      .filter(exp => exp.category_id === cat.id)
      .reduce((sum, exp) => sum + Number(exp.amount), 0);
    return {
      name: cat.name,
      value: catExpenses,
      color: cat.color,
    };
  }).filter(item => item.value > 0);

  // Prepare bar chart data (last 6 months mock)
  const barData = [
    { month: 'Jul', value: totalExpenses * 0.8 },
    { month: 'Ago', value: totalExpenses * 0.9 },
    { month: 'Set', value: totalExpenses * 1.1 },
    { month: 'Out', value: totalExpenses * 0.95 },
    { month: 'Nov', value: totalExpenses * 1.05 },
    { month: 'Dez', value: totalExpenses },
  ];

  const challengePercent = challengeProgress.target > 0 
    ? (challengeProgress.current / challengeProgress.target) * 100 
    : 0;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Visão geral das suas finanças</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Definir Renda
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Renda Mensal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="0,00"
                    value={newIncome}
                    onChange={(e) => setNewIncome(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleSaveIncome} className="w-full">
                  Salvar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Renda Mensal</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(income)}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Despesas</p>
                  <p className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenses)}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-destructive/20 flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br ${balance >= 0 ? 'from-success/10 to-success/5 border-success/20' : 'from-destructive/10 to-destructive/5 border-destructive/20'}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Saldo</p>
                  <p className={`text-2xl font-bold ${balance >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {formatCurrency(balance)}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${balance >= 0 ? 'bg-primary/20' : 'bg-destructive/20'} flex items-center justify-center`}>
                  <PiggyBank className={`w-6 h-6 ${balance >= 0 ? 'text-primary' : 'text-destructive'}`} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Desafio 40K</p>
                  <p className="text-2xl font-bold text-accent">{formatPercent(challengePercent)}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                  <Target className="w-6 h-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Despesas por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-3 mt-4">
                    {pieData.map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm text-muted-foreground">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Nenhuma despesa registrada
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Comparação Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <XAxis 
                      dataKey="month" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      tickFormatter={(value) => `R$${value / 1000}k`}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar 
                      dataKey="value" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Challenge Progress */}
        <Card className="bg-gradient-to-r from-accent/5 via-transparent to-primary/5">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Progresso do Desafio 40K</h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  <span>Atual: <strong className="text-primary">{formatCurrency(challengeProgress.current)}</strong></span>
                  <span>Meta: <strong>{formatCurrency(challengeProgress.target)}</strong></span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full gradient-gold rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min(challengePercent, 100)}%` }}
                  />
                </div>
              </div>
              <div className="text-center sm:text-right">
                <p className="text-4xl font-bold gradient-text">{formatPercent(challengePercent)}</p>
                <p className="text-sm text-muted-foreground">Concluído</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
