import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { 
  Tags, 
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  budget: number;
  spent?: number;
}

const COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

const ICONS = [
  'shopping-cart', 'home', 'car', 'utensils', 'heart',
  'film', 'book', 'plane', 'gift', 'coffee', 'briefcase', 'gamepad'
];

export default function Categories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [icon, setIcon] = useState(ICONS[0]);
  const [budget, setBudget] = useState('');

  useEffect(() => {
    if (user) {
      fetchCategories();
    }
  }, [user]);

  const fetchCategories = async () => {
    try {
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user!.id)
        .order('name');

      if (categoriesData) {
        // Get expenses for current month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data: expenses } = await supabase
          .from('expenses')
          .select('category_id, amount')
          .eq('user_id', user!.id)
          .gte('expense_date', startOfMonth.toISOString().split('T')[0]);

        const categoriesWithSpent = categoriesData.map(cat => {
          const spent = expenses
            ?.filter(e => e.category_id === cat.id)
            .reduce((sum, e) => sum + Number(e.amount), 0) || 0;
          return { ...cat, spent };
        });

        setCategories(categoriesWithSpent);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Informe o nome da categoria');
      return;
    }

    const budgetValue = parseFloat(budget) || 0;

    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update({ name, color, icon, budget: budgetValue })
          .eq('id', editingCategory.id);

        if (error) throw error;
        toast.success('Categoria atualizada!');
      } else {
        const { error } = await supabase
          .from('categories')
          .insert({ user_id: user!.id, name, color, icon, budget: budgetValue });

        if (error) throw error;
        toast.success('Categoria criada!');
      }

      resetForm();
      fetchCategories();
    } catch (error) {
      toast.error('Erro ao salvar categoria');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;
      toast.success('Categoria excluída!');
      setDeleteId(null);
      fetchCategories();
    } catch (error) {
      toast.error('Erro ao excluir categoria');
    }
  };

  const resetForm = () => {
    setName('');
    setColor(COLORS[0]);
    setIcon(ICONS[0]);
    setBudget('');
    setEditingCategory(null);
    setDialogOpen(false);
  };

  const openEdit = (category: Category) => {
    setEditingCategory(category);
    setName(category.name);
    setColor(category.color);
    setIcon(category.icon);
    setBudget(category.budget.toString());
    setDialogOpen(true);
  };

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
              <Tags className="w-8 h-8 text-primary" />
              Categorias
            </h1>
            <p className="text-muted-foreground">Organize seus gastos por categoria</p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            if (!open) resetForm();
            setDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Nova Categoria
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Alimentação"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cor</Label>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        className={cn(
                          "w-8 h-8 rounded-lg transition-transform",
                          color === c && "ring-2 ring-offset-2 ring-primary scale-110"
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Orçamento Mensal</Label>
                  <Input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="0,00"
                  />
                </div>

                <Button onClick={handleSubmit} className="w-full">
                  {editingCategory ? 'Salvar' : 'Criar'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Categories Grid */}
        {categories.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Tags className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Nenhuma categoria</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Crie categorias para organizar suas despesas
              </p>
              <Button onClick={() => setDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Criar Primeira Categoria
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => {
              const percent = category.budget > 0 
                ? ((category.spent || 0) / category.budget) * 100 
                : 0;
              const isOverBudget = percent > 100;

              return (
                <Card 
                  key={category.id} 
                  className={cn(
                    "relative overflow-hidden transition-all hover:shadow-soft",
                    isOverBudget && "border-destructive/50"
                  )}
                >
                  <div 
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: category.color }}
                  />
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                          style={{ backgroundColor: `${category.color}20`, color: category.color }}
                        >
                          {category.icon === 'shopping-cart' && '🛒'}
                          {category.icon === 'home' && '🏠'}
                          {category.icon === 'car' && '🚗'}
                          {category.icon === 'utensils' && '🍽️'}
                          {category.icon === 'heart' && '❤️'}
                          {category.icon === 'film' && '🎬'}
                          {category.icon === 'book' && '📚'}
                          {category.icon === 'plane' && '✈️'}
                          {category.icon === 'gift' && '🎁'}
                          {category.icon === 'coffee' && '☕'}
                          {category.icon === 'briefcase' && '💼'}
                          {category.icon === 'gamepad' && '🎮'}
                          {!ICONS.includes(category.icon) && '🏷️'}
                        </div>
                        <div>
                          <h3 className="font-semibold">{category.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(category.spent || 0)} / {formatCurrency(category.budget)}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => openEdit(category)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(category.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className={cn(
                          isOverBudget ? "text-destructive font-medium" : "text-muted-foreground"
                        )}>
                          {isOverBudget && <AlertTriangle className="w-4 h-4 inline mr-1" />}
                          {formatPercent(Math.min(percent, 100))} usado
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            isOverBudget ? "bg-destructive" : ""
                          )}
                          style={{ 
                            width: `${Math.min(percent, 100)}%`,
                            backgroundColor: isOverBudget ? undefined : category.color
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. As despesas associadas não serão excluídas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
