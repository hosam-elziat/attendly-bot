import { useState } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Gift, 
  Trophy, 
  Star, 
  ShoppingBag, 
  Settings2, 
  Users,
  TrendingUp,
  Loader2,
  Crown,
  Medal,
  Sparkles,
  Power
} from 'lucide-react';
import { useRewardsStats, useRewardsLeaderboard } from '@/hooks/useMarketplace';
import { useRewardRules, useInitializeRewardRules } from '@/hooks/useRewards';
import { useCompany, useToggleRewardsSystem } from '@/hooks/useCompany';
import RewardsRulesTab from '@/components/rewards/RewardsRulesTab';
import RewardsLevelsTab from '@/components/rewards/RewardsLevelsTab';
import RewardsBadgesTab from '@/components/rewards/RewardsBadgesTab';
import MarketplaceItemsTab from '@/components/rewards/MarketplaceItemsTab';
import MarketplaceOrdersTab from '@/components/rewards/MarketplaceOrdersTab';
import EmployeeWalletsTab from '@/components/rewards/EmployeeWalletsTab';

const Rewards = () => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');
  
  const { data: company, isLoading: companyLoading } = useCompany();
  const { data: stats, isLoading: statsLoading } = useRewardsStats();
  const { data: leaderboard, isLoading: leaderboardLoading } = useRewardsLeaderboard('monthly', 5);
  const { data: rules, isLoading: rulesLoading } = useRewardRules();
  const initializeRules = useInitializeRewardRules();
  const toggleRewards = useToggleRewardsSystem();

  const isArabic = language === 'ar';
  const isRewardsEnabled = company?.rewards_enabled ?? false;

  // Check if rules need initialization
  const needsInit = !rulesLoading && (!rules || rules.length === 0);

  if (statsLoading || rulesLoading || companyLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-4"
        >
          {/* System Toggle Card */}
          <Card className={`border-2 transition-colors ${isRewardsEnabled ? 'border-green-500/50 bg-green-500/5' : 'border-muted'}`}>
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${isRewardsEnabled ? 'bg-green-500/20' : 'bg-muted'}`}>
                    <Power className={`w-5 h-5 ${isRewardsEnabled ? 'text-green-500' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <h2 className="font-semibold flex items-center gap-2">
                      <Gift className="w-5 h-5 text-primary" />
                      {isArabic ? 'نظام المكافآت' : 'Rewards System'}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {isArabic 
                        ? (isRewardsEnabled ? 'النظام مفعّل - يتم منح النقاط تلقائياً' : 'النظام متوقف - لن يتم منح أي نقاط')
                        : (isRewardsEnabled ? 'System active - Points are awarded automatically' : 'System inactive - No points will be awarded')
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Label htmlFor="rewards-toggle" className="text-sm font-medium">
                    {isArabic ? (isRewardsEnabled ? 'مفعّل' : 'متوقف') : (isRewardsEnabled ? 'Enabled' : 'Disabled')}
                  </Label>
                  <Switch
                    id="rewards-toggle"
                    checked={isRewardsEnabled}
                    onCheckedChange={(checked) => toggleRewards.mutate(checked)}
                    disabled={toggleRewards.isPending}
                    className="data-[state=checked]:bg-green-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Title and Initialize Button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-muted-foreground">
                {isArabic ? 'إدارة النقاط والمكافآت والسوق الداخلي' : 'Manage points, rewards, and internal marketplace'}
              </p>
            </div>
            
            {needsInit && (
              <Button onClick={() => initializeRules.mutate()} disabled={initializeRules.isPending}>
                {initializeRules.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin me-2" />
                ) : (
                  <Sparkles className="w-4 h-4 me-2" />
                )}
                {isArabic ? 'تهيئة النظام' : 'Initialize System'}
              </Button>
            )}
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {isArabic ? 'إجمالي النقاط' : 'Total Points'}
                  </p>
                  <p className="text-2xl font-bold text-amber-600">
                    {stats?.totalPointsIssued?.toLocaleString() || 0}
                  </p>
                </div>
                <Star className="w-8 h-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {isArabic ? 'المحافظ النشطة' : 'Active Wallets'}
                  </p>
                  <p className="text-2xl font-bold text-purple-600">
                    {stats?.activeWallets || 0}
                  </p>
                </div>
                <Users className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {isArabic ? 'إجمالي الطلبات' : 'Total Orders'}
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {stats?.totalOrders || 0}
                  </p>
                </div>
                <ShoppingBag className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500/10 to-rose-500/10 border-red-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {isArabic ? 'طلبات معلقة' : 'Pending Orders'}
                  </p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats?.pendingOrders || 0}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="flex flex-wrap h-auto gap-1 p-1 bg-muted/50">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                <span className="hidden sm:inline">{isArabic ? 'نظرة عامة' : 'Overview'}</span>
              </TabsTrigger>
              <TabsTrigger value="rules" className="flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                <span className="hidden sm:inline">{isArabic ? 'قواعد النقاط' : 'Rules'}</span>
              </TabsTrigger>
              <TabsTrigger value="levels" className="flex items-center gap-2">
                <Crown className="w-4 h-4" />
                <span className="hidden sm:inline">{isArabic ? 'المستويات' : 'Levels'}</span>
              </TabsTrigger>
              <TabsTrigger value="badges" className="flex items-center gap-2">
                <Medal className="w-4 h-4" />
                <span className="hidden sm:inline">{isArabic ? 'الشارات' : 'Badges'}</span>
              </TabsTrigger>
              <TabsTrigger value="marketplace" className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                <span className="hidden sm:inline">{isArabic ? 'السوق' : 'Marketplace'}</span>
              </TabsTrigger>
              <TabsTrigger value="orders" className="flex items-center gap-2 relative">
                <Gift className="w-4 h-4" />
                <span className="hidden sm:inline">{isArabic ? 'الطلبات' : 'Orders'}</span>
                {(stats?.pendingOrders || 0) > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                    {stats?.pendingOrders}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="wallets" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">{isArabic ? 'المحافظ' : 'Wallets'}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid lg:grid-cols-2 gap-4">
                {/* Leaderboard */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-amber-500" />
                      {isArabic ? 'المتصدرون هذا الشهر' : 'Monthly Leaderboard'}
                    </CardTitle>
                    <CardDescription>
                      {isArabic ? 'أعلى 5 موظفين في النقاط' : 'Top 5 employees by points'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {leaderboardLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    ) : leaderboard && leaderboard.length > 0 ? (
                      <div className="space-y-3">
                        {leaderboard.map((entry: any, index: number) => (
                          <div 
                            key={entry.id}
                            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                          >
                            <div className={`
                              w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                              ${index === 0 ? 'bg-amber-500 text-white' : 
                                index === 1 ? 'bg-gray-400 text-white' : 
                                index === 2 ? 'bg-amber-700 text-white' : 
                                'bg-muted text-muted-foreground'}
                            `}>
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {entry.employee?.full_name || 'Unknown'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {entry.current_level?.name || (isArabic ? 'بدون مستوى' : 'No level')}
                              </p>
                            </div>
                            <div className="text-end">
                              <p className="font-bold text-primary">
                                {entry.total_points?.toLocaleString()}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {isArabic ? 'نقطة' : 'pts'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        {isArabic ? 'لا توجد بيانات بعد' : 'No data yet'}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-primary" />
                      {isArabic ? 'إحصائيات سريعة' : 'Quick Stats'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-muted/50 text-center">
                        <p className="text-3xl font-bold text-primary">
                          {rules?.filter(r => r.is_enabled).length || 0}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {isArabic ? 'قواعد نشطة' : 'Active Rules'}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50 text-center">
                        <p className="text-3xl font-bold text-green-600">
                          {rules?.filter(r => r.points_value > 0).length || 0}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {isArabic ? 'مكافآت' : 'Rewards'}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50 text-center">
                        <p className="text-3xl font-bold text-red-600">
                          {rules?.filter(r => r.points_value < 0).length || 0}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {isArabic ? 'خصومات' : 'Deductions'}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50 text-center">
                        <p className="text-3xl font-bold text-amber-600">
                          {stats?.pendingOrders || 0}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {isArabic ? 'بانتظار الموافقة' : 'Pending'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="rules">
              <RewardsRulesTab />
            </TabsContent>

            <TabsContent value="levels">
              <RewardsLevelsTab />
            </TabsContent>

            <TabsContent value="badges">
              <RewardsBadgesTab />
            </TabsContent>

            <TabsContent value="marketplace">
              <MarketplaceItemsTab />
            </TabsContent>

            <TabsContent value="orders">
              <MarketplaceOrdersTab />
            </TabsContent>

            <TabsContent value="wallets">
              <EmployeeWalletsTab />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Rewards;
