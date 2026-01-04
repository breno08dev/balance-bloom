import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Target, 
  Trophy,
  CheckCircle2,
  Circle,
  SkipForward,
  Loader2,
  Sparkles
} from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Deposit {
  id: string;
  deposit_value: number;
  sequence_order: number;
  status: 'pending' | 'completed' | 'skipped';
}

export default function Challenge() {
  const { user } = useAuth();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [targetValue, setTargetValue] = useState(40000);
  const [loading, setLoading] = useState(true);
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [customTarget, setCustomTarget] = useState('40000');

  useEffect(() => {
    if (user) {
      fetchChallenge();
    }
  }, [user]);

  const fetchChallenge = async () => {
    try {
      const { data: challenge } = await supabase
        .from('challenge_40k')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (challenge) {
        setChallengeId(challenge.id);
        setTargetValue(Number(challenge.target_value));

        const { data: depositsData } = await supabase
          .from('challenge_deposits')
          .select('*')
          .eq('challenge_id', challenge.id)
          .order('sequence_order', { ascending: true });

        if (depositsData) {
          setDeposits(depositsData as Deposit[]);
        }
      } else {
        setSetupDialogOpen(true);
      }
    } catch (error) {
      console.error('Error fetching challenge:', error);
    } finally {
      setLoading(false);
    }
  };

  const createChallenge = async (target: number = 40000) => {
    try {
      setLoading(true);

      // Create challenge
      const { data: challenge, error: challengeError } = await supabase
        .from('challenge_40k')
        .insert({ 
          user_id: user!.id, 
          target_value: target 
        })
        .select()
        .single();

      if (challengeError) throw challengeError;

      // Generate deposits: 1-200, then 200-1
      const depositValues: number[] = [];
      for (let i = 1; i <= 200; i++) {
        depositValues.push(i);
      }
      for (let i = 200; i >= 1; i--) {
        depositValues.push(i);
      }

      // Adjust if target is exactly 40000 (total would be 40200)
      if (target === 40000) {
        // Remove the two 200s to get exactly 40000
        const idx = depositValues.indexOf(200);
        depositValues.splice(idx, 1);
      }

      const depositsToInsert = depositValues.map((value, index) => ({
        challenge_id: challenge.id,
        deposit_value: value,
        sequence_order: index + 1,
        status: 'pending' as const,
      }));

      const { error: depositsError } = await supabase
        .from('challenge_deposits')
        .insert(depositsToInsert);

      if (depositsError) throw depositsError;

      setChallengeId(challenge.id);
      setTargetValue(target);
      setDeposits(depositsToInsert.map((d, i) => ({ ...d, id: `temp-${i}` })));
      setSetupDialogOpen(false);

      // Refetch to get proper IDs
      fetchChallenge();
      toast.success('Desafio criado com sucesso!');
    } catch (error) {
      console.error('Error creating challenge:', error);
      toast.error('Erro ao criar desafio');
    } finally {
      setLoading(false);
    }
  };

  const updateDepositStatus = async (depositId: string, status: 'completed' | 'skipped') => {
    try {
      const { error } = await supabase
        .from('challenge_deposits')
        .update({ 
          status, 
          completed_at: status === 'completed' ? new Date().toISOString() : null 
        })
        .eq('id', depositId);

      if (error) throw error;

      setDeposits(prev => 
        prev.map(d => d.id === depositId ? { ...d, status } : d)
      );

      if (status === 'completed') {
        toast.success('Depósito marcado como concluído!');
      }
    } catch (error) {
      toast.error('Erro ao atualizar depósito');
    }
  };

  const completedValue = deposits
    .filter(d => d.status === 'completed')
    .reduce((sum, d) => sum + d.deposit_value, 0);

  const remainingValue = targetValue - completedValue;
  const progressPercent = targetValue > 0 ? (completedValue / targetValue) * 100 : 0;
  const completedCount = deposits.filter(d => d.status === 'completed').length;
  const skippedCount = deposits.filter(d => d.status === 'skipped').length;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Target className="w-8 h-8 text-accent" />
              Desafio 40K
            </h1>
            <p className="text-muted-foreground">Economize até {formatCurrency(targetValue)}</p>
          </div>
        </div>

        {/* Progress Card */}
        <Card className="overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-accent/5 via-transparent to-primary/5" />
          <CardContent className="pt-6 relative">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Acumulado</p>
                <p className="text-3xl font-bold text-primary">{formatCurrency(completedValue)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Faltam</p>
                <p className="text-3xl font-bold text-accent">{formatCurrency(remainingValue)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Progresso</p>
                <p className="text-3xl font-bold gradient-text">{formatPercent(progressPercent)}</p>
              </div>
            </div>

            <div className="mt-6">
              <div className="h-4 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full gradient-gold rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                  style={{ width: `${Math.min(progressPercent, 100)}%` }}
                >
                  <div className="absolute inset-0 shimmer" />
                </div>
              </div>
              <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                <span>{completedCount} depósitos feitos</span>
                <span>{skippedCount} pulados</span>
              </div>
            </div>

            {progressPercent >= 100 && (
              <div className="mt-6 flex items-center justify-center gap-2 text-accent">
                <Trophy className="w-6 h-6" />
                <span className="font-bold text-lg">Parabéns! Você completou o desafio!</span>
                <Sparkles className="w-6 h-6" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deposit Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Depósitos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
              {deposits.map((deposit) => (
                <button
                  key={deposit.id}
                  onClick={async () => {
                    if (deposit.status === 'pending') {
                      updateDepositStatus(deposit.id, 'completed');
                    } else if (deposit.status === 'completed') {
                      updateDepositStatus(deposit.id, 'skipped');
                    } else {
                      // Reset to pending
                      await supabase
                        .from('challenge_deposits')
                        .update({ status: 'pending', completed_at: null })
                        .eq('id', deposit.id);
                      setDeposits(prev => 
                        prev.map(d => d.id === deposit.id ? { ...d, status: 'pending' } : d)
                      );
                    }
                  }}
                  className={cn(
                    "relative aspect-square rounded-lg text-xs font-medium flex items-center justify-center transition-all duration-200 hover:scale-105",
                    deposit.status === 'completed' && "bg-primary text-primary-foreground shadow-glow",
                    deposit.status === 'skipped' && "bg-muted text-muted-foreground line-through opacity-50",
                    deposit.status === 'pending' && "bg-secondary hover:bg-accent/20 text-secondary-foreground border border-border"
                  )}
                >
                  {deposit.deposit_value}
                  {deposit.status === 'completed' && (
                    <CheckCircle2 className="absolute -top-1 -right-1 w-3 h-3 text-primary-foreground bg-primary rounded-full" />
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-center gap-6 mt-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-primary" />
                <span>Concluído</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-secondary border border-border" />
                <span>Pendente</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-muted opacity-50" />
                <span>Pulado</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Setup Dialog */}
        <Dialog open={setupDialogOpen} onOpenChange={setSetupDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-accent" />
                Iniciar Desafio 40K
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <p className="text-muted-foreground text-sm">
                O desafio consiste em depositar valores de R$1 a R$200 e depois de R$200 a R$1. 
                Escolha sua meta:
              </p>

              <div className="space-y-3">
                <Button 
                  onClick={() => createChallenge(40000)} 
                  className="w-full justify-start gap-3"
                  variant="outline"
                >
                  <Target className="w-5 h-5 text-accent" />
                  <div className="text-left">
                    <p className="font-medium">Meta de R$ 40.000</p>
                    <p className="text-xs text-muted-foreground">Ajustado para exatamente 40K</p>
                  </div>
                </Button>

                <Button 
                  onClick={() => createChallenge(40200)} 
                  className="w-full justify-start gap-3"
                  variant="outline"
                >
                  <Trophy className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">Desafio Completo R$ 40.200</p>
                    <p className="text-xs text-muted-foreground">Todos os depósitos de 1-200 e 200-1</p>
                  </div>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
