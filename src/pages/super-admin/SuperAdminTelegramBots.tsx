import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin } from '@/contexts/SuperAdminContext';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Bot, 
  Plus,
  Edit,
  Trash2,
  Search,
  Building2,
  Loader2
} from 'lucide-react';

interface TelegramBot {
  id: string;
  bot_token: string;
  bot_username: string;
  bot_name: string | null;
  is_available: boolean;
  assigned_company_id: string | null;
  assigned_at: string | null;
  created_at: string;
  company_name?: string;
}

const SuperAdminTelegramBots = () => {
  const { isSuperAdmin } = useSuperAdmin();
  const [bots, setBots] = useState<TelegramBot[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingBot, setEditingBot] = useState<TelegramBot | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [newBot, setNewBot] = useState({
    bot_token: '',
    bot_username: '',
    bot_name: '',
  });

  const fetchBots = async () => {
    try {
      const [botsRes, companiesRes] = await Promise.all([
        supabase
          .from('telegram_bots')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('companies')
          .select('id, name'),
      ]);

      if (botsRes.error) throw botsRes.error;
      if (companiesRes.error) throw companiesRes.error;

      const enrichedBots = (botsRes.data || []).map(bot => ({
        ...bot,
        company_name: bot.assigned_company_id
          ? (companiesRes.data || []).find(c => c.id === bot.assigned_company_id)?.name || 'غير معروف'
          : null,
      }));

      setBots(enrichedBots);
    } catch (error) {
      console.error('Error fetching bots:', error);
      toast.error('فشل في تحميل البوتات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBots();
  }, []);

  const handleAddBot = async () => {
    if (!isSuperAdmin) {
      toast.error('ليس لديك صلاحية لإضافة بوتات');
      return;
    }

    if (!newBot.bot_token || !newBot.bot_username) {
      toast.error('الرجاء ملء Token و Username');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('telegram_bots')
        .insert({
          bot_token: newBot.bot_token,
          bot_username: newBot.bot_username.replace('@', ''),
          bot_name: newBot.bot_name || null,
          is_available: true,
        });

      if (error) throw error;

      toast.success('تم إضافة البوت بنجاح');
      setAddDialogOpen(false);
      setNewBot({ bot_token: '', bot_username: '', bot_name: '' });
      fetchBots();
    } catch (error: any) {
      console.error('Error adding bot:', error);
      toast.error(error.message || 'فشل في إضافة البوت');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateBot = async () => {
    if (!isSuperAdmin || !editingBot) return;

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('telegram_bots')
        .update({
          bot_token: editingBot.bot_token,
          bot_username: editingBot.bot_username.replace('@', ''),
          bot_name: editingBot.bot_name,
        })
        .eq('id', editingBot.id);

      if (error) throw error;

      toast.success('تم تحديث البوت بنجاح');
      setEditDialogOpen(false);
      setEditingBot(null);
      fetchBots();
    } catch (error) {
      console.error('Error updating bot:', error);
      toast.error('فشل في تحديث البوت');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBot = async (botId: string) => {
    if (!isSuperAdmin) return;

    if (!confirm('هل أنت متأكد من حذف هذا البوت؟')) return;

    try {
      const { error } = await supabase
        .from('telegram_bots')
        .delete()
        .eq('id', botId);

      if (error) throw error;

      toast.success('تم حذف البوت');
      fetchBots();
    } catch (error) {
      console.error('Error deleting bot:', error);
      toast.error('فشل في حذف البوت');
    }
  };

  const handleUnassignBot = async (botId: string) => {
    if (!isSuperAdmin) return;

    try {
      const { error } = await supabase
        .from('telegram_bots')
        .update({
          is_available: true,
          assigned_company_id: null,
          assigned_at: null,
        })
        .eq('id', botId);

      if (error) throw error;

      // Update company's telegram_bot_connected status
      const bot = bots.find(b => b.id === botId);
      if (bot?.assigned_company_id) {
        await supabase
          .from('companies')
          .update({
            telegram_bot_connected: false,
            telegram_bot_username: null,
          })
          .eq('id', bot.assigned_company_id);
      }

      toast.success('تم إلغاء تعيين البوت');
      fetchBots();
    } catch (error) {
      console.error('Error unassigning bot:', error);
      toast.error('فشل في إلغاء التعيين');
    }
  };

  const filteredBots = bots.filter(bot => {
    const matchesSearch = 
      bot.bot_username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (bot.bot_name && bot.bot_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (bot.company_name && bot.company_name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'available' && bot.is_available) ||
      (statusFilter === 'assigned' && !bot.is_available);
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: bots.length,
    available: bots.filter(b => b.is_available).length,
    assigned: bots.filter(b => !b.is_available).length,
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">بوتات التيليجرام</h1>
            <p className="text-slate-400 mt-1">إدارة بوتات التيليجرام المتاحة للشركات</p>
          </div>
          {isSuperAdmin && (
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  إضافة بوت
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-800 text-white">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Bot className="w-5 h-5" />
                    إضافة بوت جديد
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Bot Token</Label>
                    <Input
                      value={newBot.bot_token}
                      onChange={(e) => setNewBot({ ...newBot, bot_token: e.target.value })}
                      placeholder="123456789:ABCdefGHI..."
                      className="bg-slate-800 border-slate-700"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input
                      value={newBot.bot_username}
                      onChange={(e) => setNewBot({ ...newBot, bot_username: e.target.value })}
                      placeholder="@my_bot"
                      className="bg-slate-800 border-slate-700"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>اسم البوت (اختياري)</Label>
                    <Input
                      value={newBot.bot_name}
                      onChange={(e) => setNewBot({ ...newBot, bot_name: e.target.value })}
                      placeholder="بوت الحضور"
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                  <Button onClick={handleAddBot} disabled={submitting} className="w-full">
                    {submitting && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                    إضافة البوت
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-slate-400 text-sm">الإجمالي</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-400">{stats.available}</p>
              <p className="text-slate-400 text-sm">متاح</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-400">{stats.assigned}</p>
              <p className="text-slate-400 text-sm">مستخدم</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="البحث عن بوت..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 bg-slate-900 border-slate-700 text-white"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 bg-slate-900 border-slate-700 text-white">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              <SelectItem value="all" className="text-white">الكل</SelectItem>
              <SelectItem value="available" className="text-white">متاح</SelectItem>
              <SelectItem value="assigned" className="text-white">مستخدم</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-slate-800/50">
                  <TableHead className="text-slate-400">البوت</TableHead>
                  <TableHead className="text-slate-400">Username</TableHead>
                  <TableHead className="text-slate-400">الحالة</TableHead>
                  <TableHead className="text-slate-400">الشركة</TableHead>
                  <TableHead className="text-slate-400">تاريخ الإضافة</TableHead>
                  {isSuperAdmin && <TableHead className="text-slate-400">الإجراءات</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                      جاري التحميل...
                    </TableCell>
                  </TableRow>
                ) : filteredBots.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                      لا توجد بوتات
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBots.map((bot) => (
                    <TableRow key={bot.id} className="border-slate-800 hover:bg-slate-800/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                            <Bot className="w-5 h-5 text-primary" />
                          </div>
                          <span className="text-white font-medium">{bot.bot_name || 'بدون اسم'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300" dir="ltr">@{bot.bot_username}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            bot.is_available
                              ? 'bg-green-500/20 text-green-400 border-green-500/30'
                              : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                          }
                        >
                          {bot.is_available ? 'متاح' : 'مستخدم'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {bot.company_name ? (
                          <div className="flex items-center gap-2 text-slate-300">
                            <Building2 className="w-4 h-4" />
                            {bot.company_name}
                          </div>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {new Date(bot.created_at).toLocaleDateString('ar-SA')}
                      </TableCell>
                      {isSuperAdmin && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingBot(bot);
                                setEditDialogOpen(true);
                              }}
                              className="text-slate-300 hover:text-white"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {!bot.is_available && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUnassignBot(bot.id)}
                                className="text-amber-400 hover:text-amber-300"
                              >
                                إلغاء التعيين
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteBot(bot.id)}
                              className="text-red-400 hover:text-red-300"
                              disabled={!bot.is_available}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="bg-slate-900 border-slate-800 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                تعديل البوت
              </DialogTitle>
            </DialogHeader>
            {editingBot && (
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Bot Token</Label>
                  <Input
                    value={editingBot.bot_token}
                    onChange={(e) => setEditingBot({ ...editingBot, bot_token: e.target.value })}
                    className="bg-slate-800 border-slate-700"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input
                    value={editingBot.bot_username}
                    onChange={(e) => setEditingBot({ ...editingBot, bot_username: e.target.value })}
                    className="bg-slate-800 border-slate-700"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label>اسم البوت</Label>
                  <Input
                    value={editingBot.bot_name || ''}
                    onChange={(e) => setEditingBot({ ...editingBot, bot_name: e.target.value })}
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
                <Button onClick={handleUpdateBot} disabled={submitting} className="w-full">
                  {submitting && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                  حفظ التغييرات
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminTelegramBots;
