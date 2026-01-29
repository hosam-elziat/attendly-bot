import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Target, 
  Plus, 
  Trophy, 
  Users, 
  Calendar,
  Gift,
  Megaphone,
  Edit,
  Trash2,
  Loader2,
  Crown,
  Clock
} from 'lucide-react';
import { useRewardGoals, useDeleteGoal, useAnnounceGoal, RewardGoal } from '@/hooks/useRewardGoals';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import GoalFormDialog from './GoalFormDialog';
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

const RewardsGoalsTab = () => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  
  const { data: goals, isLoading } = useRewardGoals();
  const deleteGoal = useDeleteGoal();
  const announceGoal = useAnnounceGoal();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingGoal, setEditingGoal] = useState<RewardGoal | null>(null);
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);

  const getDurationLabel = (duration: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      daily: { ar: 'يومي', en: 'Daily' },
      weekly: { ar: 'أسبوعي', en: 'Weekly' },
      monthly: { ar: 'شهري', en: 'Monthly' },
      custom: { ar: 'مخصص', en: 'Custom' },
    };
    return labels[duration]?.[isArabic ? 'ar' : 'en'] || duration;
  };

  const getGoalTypeLabel = (type: string) => {
    if (type === 'first_to_reach') {
      return isArabic ? 'أول من يحقق' : 'First to Reach';
    }
    return isArabic ? 'كل من يحقق' : 'Everyone who Reaches';
  };

  const getRewardLabel = (goal: RewardGoal) => {
    if (goal.reward_type === 'points') {
      return `${goal.reward_points?.toLocaleString() || 0} ${isArabic ? 'نقطة' : 'points'}`;
    }
    if (goal.reward_type === 'item' && goal.reward_item) {
      return isArabic ? goal.reward_item.name_ar || goal.reward_item.name : goal.reward_item.name;
    }
    return isArabic ? goal.reward_description_ar || goal.reward_description : goal.reward_description;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            {isArabic ? 'الأهداف والتحديات' : 'Goals & Challenges'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isArabic ? 'أنشئ تحديات لتحفيز الموظفين' : 'Create challenges to motivate employees'}
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 me-2" />
          {isArabic ? 'إضافة هدف' : 'Add Goal'}
        </Button>
      </div>

      {/* Goals Grid */}
      {goals && goals.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map((goal) => (
            <Card 
              key={goal.id} 
              className={`relative overflow-hidden ${
                goal.is_active 
                  ? 'border-primary/50 bg-primary/5' 
                  : 'opacity-60'
              }`}
            >
              {/* Status Badge */}
              <div className="absolute top-2 end-2 flex gap-1">
                <Badge variant={goal.is_active ? 'default' : 'secondary'}>
                  {goal.is_active 
                    ? (isArabic ? 'نشط' : 'Active') 
                    : (isArabic ? 'منتهي' : 'Ended')
                  }
                </Badge>
                {goal.is_announced && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-600">
                    <Megaphone className="w-3 h-3 me-1" />
                    {isArabic ? 'تم الإعلان' : 'Announced'}
                  </Badge>
                )}
              </div>

              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base pe-20">
                  {goal.goal_type === 'first_to_reach' ? (
                    <Crown className="w-5 h-5 text-amber-500" />
                  ) : (
                    <Users className="w-5 h-5 text-blue-500" />
                  )}
                  {isArabic ? goal.name_ar || goal.name : goal.name}
                </CardTitle>
                <CardDescription className="text-xs">
                  {isArabic ? goal.description_ar || goal.description : goal.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Goal Details */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Target className="w-4 h-4" />
                    <span>{goal.points_threshold.toLocaleString()} {isArabic ? 'نقطة' : 'pts'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{getDurationLabel(goal.duration_type)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span className="text-xs">{getGoalTypeLabel(goal.goal_type)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <Gift className="w-4 h-4" />
                    <span className="text-xs">{getRewardLabel(goal)}</span>
                  </div>
                </div>

                {/* Winner (for first_to_reach type) */}
                {goal.goal_type === 'first_to_reach' && goal.winner && (
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-medium text-amber-700">
                        {isArabic ? 'الفائز:' : 'Winner:'} {goal.winner.full_name}
                      </span>
                    </div>
                  </div>
                )}

                {/* Custom Duration Dates */}
                {goal.duration_type === 'custom' && goal.start_date && goal.end_date && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {format(new Date(goal.start_date), 'dd MMM', { locale: isArabic ? ar : undefined })}
                      {' - '}
                      {format(new Date(goal.end_date), 'dd MMM yyyy', { locale: isArabic ? ar : undefined })}
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  {goal.is_active && !goal.is_announced && (
                    <Button 
                      size="sm" 
                      onClick={() => announceGoal.mutate(goal.id)}
                      disabled={announceGoal.isPending}
                      className="flex-1"
                    >
                      {announceGoal.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin me-1" />
                      ) : (
                        <Megaphone className="w-3 h-3 me-1" />
                      )}
                      {isArabic ? 'أعلن للجميع' : 'Announce'}
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setEditingGoal(goal)}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => setDeletingGoalId(goal.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium text-lg mb-1">
              {isArabic ? 'لا توجد أهداف' : 'No Goals Yet'}
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              {isArabic 
                ? 'أنشئ تحديات لتحفيز الموظفين وزيادة التنافسية'
                : 'Create challenges to motivate employees and increase competition'
              }
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 me-2" />
              {isArabic ? 'إنشاء أول هدف' : 'Create First Goal'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <GoalFormDialog
        open={showCreateDialog || !!editingGoal}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setEditingGoal(null);
          }
        }}
        goal={editingGoal}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingGoalId} onOpenChange={() => setDeletingGoalId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isArabic ? 'حذف الهدف' : 'Delete Goal'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isArabic 
                ? 'هل أنت متأكد من حذف هذا الهدف؟ لا يمكن التراجع عن هذا الإجراء.'
                : 'Are you sure you want to delete this goal? This action cannot be undone.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {isArabic ? 'إلغاء' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingGoalId) {
                  deleteGoal.mutate(deletingGoalId);
                  setDeletingGoalId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isArabic ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RewardsGoalsTab;
