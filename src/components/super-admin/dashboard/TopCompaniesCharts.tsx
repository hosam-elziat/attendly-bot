import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy,
  TrendingUp,
  TrendingDown,
  Activity,
  Building2
} from 'lucide-react';

interface TopCompaniesChartsProps {
  topCompanies: {
    byCompliance: Array<{ id: string; name: string; rate: number }>;
    byAbsence: Array<{ id: string; name: string; count: number }>;
    byUsage: Array<{ id: string; name: string; activity: number }>;
  };
  loading: boolean;
}

export const TopCompaniesCharts = ({ topCompanies, loading }: TopCompaniesChartsProps) => {
  const getRankIcon = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Top by Compliance */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Trophy className="w-5 h-5 text-green-400" />
            الأكثر التزامًا
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-12 bg-slate-800 rounded-lg" />
              ))}
            </div>
          ) : topCompanies.byCompliance.length === 0 ? (
            <p className="text-slate-400 text-center py-4">لا توجد بيانات</p>
          ) : (
            topCompanies.byCompliance.map((company, index) => (
              <div 
                key={company.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50"
              >
                <span className="text-lg w-8 text-center">{getRankIcon(index)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{company.name}</p>
                  <Progress value={company.rate} className="h-1.5 mt-1" />
                </div>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  {company.rate}%
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Top by Absence */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <TrendingDown className="w-5 h-5 text-red-400" />
            الأكثر غيابًا
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-12 bg-slate-800 rounded-lg" />
              ))}
            </div>
          ) : topCompanies.byAbsence.length === 0 ? (
            <p className="text-slate-400 text-center py-4">لا توجد بيانات</p>
          ) : (
            topCompanies.byAbsence.map((company, index) => (
              <div 
                key={company.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50"
              >
                <span className="text-lg w-8 text-center">{index + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{company.name}</p>
                </div>
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                  {company.count} غائب
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Top by Usage */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Activity className="w-5 h-5 text-blue-400" />
            الأكثر استخدامًا
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-12 bg-slate-800 rounded-lg" />
              ))}
            </div>
          ) : topCompanies.byUsage.length === 0 ? (
            <p className="text-slate-400 text-center py-4">لا توجد بيانات</p>
          ) : (
            topCompanies.byUsage.map((company, index) => (
              <div 
                key={company.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50"
              >
                <span className="text-lg w-8 text-center">{getRankIcon(index)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <p className="text-white text-sm font-medium truncate">{company.name}</p>
                  </div>
                </div>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  نشط
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};
