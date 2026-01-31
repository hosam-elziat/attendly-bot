import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Users
} from 'lucide-react';

interface AttendanceOverviewProps {
  attendance: {
    todayPresent: number;
    todayAbsent: number;
    todayLate: number;
    averageComplianceRate: number;
  };
  employeesTotal: number;
  loading: boolean;
}

export const AttendanceOverview = ({ attendance, employeesTotal, loading }: AttendanceOverviewProps) => {
  const stats = [
    {
      icon: CheckCircle,
      label: 'حاضرون اليوم',
      value: attendance.todayPresent,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      icon: AlertTriangle,
      label: 'متأخرون',
      value: attendance.todayLate,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    {
      icon: XCircle,
      label: 'غائبون',
      value: attendance.todayAbsent,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
    },
  ];

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          حضور اليوم
          <span className="text-slate-400 text-sm font-normal">
            ({new Date().toLocaleDateString('ar-SA')})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {stats.map((stat) => (
            <div 
              key={stat.label}
              className={`text-center p-4 rounded-xl ${stat.bgColor}`}
            >
              <stat.icon className={`w-8 h-8 ${stat.color} mx-auto mb-2`} />
              <p className="text-3xl font-bold text-white">
                {loading ? '...' : stat.value}
              </p>
              <p className="text-slate-400 text-sm mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
        
        {/* Compliance Rate Bar */}
        <div className="mt-6 p-4 rounded-xl bg-slate-800/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-300 text-sm">معدل الالتزام العام</span>
            <span className="text-white font-bold text-lg">
              {loading ? '...' : `${attendance.averageComplianceRate}%`}
            </span>
          </div>
          <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${attendance.averageComplianceRate}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {employeesTotal} موظف
            </span>
            <span>
              {attendance.todayPresent} من {attendance.todayPresent + attendance.todayAbsent}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
