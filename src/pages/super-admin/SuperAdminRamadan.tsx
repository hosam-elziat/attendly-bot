import { useState, useEffect, useMemo } from 'react';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2, Send, RefreshCw, Search, Moon, Clock } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface QuizQuestion {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  category: string | null;
  created_at: string;
}

const SuperAdminRamadan = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editQuestion, setEditQuestion] = useState<QuizQuestion | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_option: 'a',
    category: 'دينية',
  });
  const [bulkLoading, setBulkLoading] = useState<string | null>(null);

  // Fetch questions
  const { data: questions = [], isLoading: loadingQuestions } = useQuery({
    queryKey: ['ramadan-quiz-questions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ramadan_quiz_questions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as QuizQuestion[];
    },
  });

  // Fetch companies
  const { data: companies = [] } = useQuery({
    queryKey: ['sa-companies-ramadan'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, prayer_reminders_enabled, ramadan_quiz_enabled, country_code')
        .eq('is_deleted', false)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const filteredQuestions = useMemo(() => {
    if (!search.trim()) return questions;
    return questions.filter(q => q.question_text.includes(search));
  }, [questions, search]);

  // Delete question
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ramadan_quiz_questions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ramadan-quiz-questions'] });
      toast.success('تم حذف السؤال');
    },
    onError: (e: any) => toast.error('فشل الحذف: ' + e.message),
  });

  // Save question (add/edit)
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase.from('ramadan_quiz_questions').update({
          question_text: data.question_text,
          option_a: data.option_a,
          option_b: data.option_b,
          option_c: data.option_c,
          option_d: data.option_d,
          correct_option: data.correct_option,
          category: data.category,
        }).eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ramadan_quiz_questions').insert({
          question_text: data.question_text,
          option_a: data.option_a,
          option_b: data.option_b,
          option_c: data.option_c,
          option_d: data.option_d,
          correct_option: data.correct_option,
          category: data.category,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ramadan-quiz-questions'] });
      toast.success(editQuestion ? 'تم تعديل السؤال' : 'تمت إضافة السؤال');
      setShowAddDialog(false);
      setEditQuestion(null);
      resetForm();
    },
    onError: (e: any) => toast.error('فشل الحفظ: ' + e.message),
  });

  const resetForm = () => {
    setFormData({ question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'a', category: 'دينية' });
  };

  const openEdit = (q: QuizQuestion) => {
    setEditQuestion(q);
    setFormData({
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_option: q.correct_option,
      category: q.category || 'دينية',
    });
    setShowAddDialog(true);
  };

  const openAdd = () => {
    setEditQuestion(null);
    resetForm();
    setShowAddDialog(true);
  };

  // Bulk enable prayer reminders
  const bulkEnablePrayer = async () => {
    setBulkLoading('prayer');
    try {
      const { error } = await supabase
        .from('companies')
        .update({ prayer_reminders_enabled: true } as any)
        .eq('is_deleted', false);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['sa-companies-ramadan'] });
      toast.success('تم تفعيل تذكير الصلاة لجميع الشركات');
    } catch (e: any) {
      toast.error('فشل: ' + e.message);
    } finally {
      setBulkLoading(null);
    }
  };

  // Bulk enable quiz
  const bulkEnableQuiz = async () => {
    setBulkLoading('quiz');
    try {
      const { error } = await supabase
        .from('companies')
        .update({ ramadan_quiz_enabled: true } as any)
        .eq('is_deleted', false);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['sa-companies-ramadan'] });
      toast.success('تم تفعيل مسابقة رمضان لجميع الشركات');
    } catch (e: any) {
      toast.error('فشل: ' + e.message);
    } finally {
      setBulkLoading(null);
    }
  };

  // Send test quiz
  const sendTestQuiz = async () => {
    setBulkLoading('test');
    try {
      const { data, error } = await supabase.functions.invoke('ramadan-quiz');
      if (error) throw error;
      toast.success(`تم إرسال سؤال تجريبي - ${data?.quizzesSent || 0} شركة`);
    } catch (e: any) {
      toast.error('فشل الإرسال: ' + e.message);
    } finally {
      setBulkLoading(null);
    }
  };

  // Regenerate questions
  const regenerateQuestions = async () => {
    setBulkLoading('regen');
    try {
      // Delete all existing questions
      const { error: delError } = await supabase.from('ramadan_quiz_questions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (delError) throw delError;

      // Insert 100 new questions
      const newQuestions = generateQuestions();
      const { error: insError } = await supabase.from('ramadan_quiz_questions').insert(newQuestions);
      if (insError) throw insError;

      queryClient.invalidateQueries({ queryKey: ['ramadan-quiz-questions'] });
      toast.success('تم إعادة إنشاء 100 سؤال جديد');
    } catch (e: any) {
      toast.error('فشل: ' + e.message);
    } finally {
      setBulkLoading(null);
    }
  };

  // Test prayer reminders
  const testPrayer = async () => {
    setBulkLoading('prayer-test');
    try {
      const { data, error } = await supabase.functions.invoke('prayer-reminders');
      if (error) throw error;
      toast.success(`تم اختبار تذكير الصلاة - ${data?.remindersSent || 0} تذكير`);
    } catch (e: any) {
      toast.error('فشل: ' + e.message);
    } finally {
      setBulkLoading(null);
    }
  };

  const prayerEnabledCount = companies.filter((c: any) => c.prayer_reminders_enabled).length;
  const quizEnabledCount = companies.filter((c: any) => c.ramadan_quiz_enabled).length;

  return (
    <SuperAdminLayout>
      <div className="space-y-6" dir="rtl">
        <div>
          <h1 className="text-2xl font-bold text-white">🌙 إدارة رمضان</h1>
          <p className="text-slate-400">مسابقة رمضان وتذكير مواقيت الصلاة</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{questions.length}</p>
                <p className="text-slate-400 text-sm">إجمالي الأسئلة</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-400">{quizEnabledCount}</p>
                <p className="text-slate-400 text-sm">شركات المسابقة مفعلة</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-400">{prayerEnabledCount}</p>
                <p className="text-slate-400 text-sm">شركات الصلاة مفعلة</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{companies.length}</p>
                <p className="text-slate-400 text-sm">إجمالي الشركات</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bulk Actions */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">⚡ إجراءات جماعية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Button onClick={bulkEnablePrayer} disabled={!!bulkLoading} className="gap-2">
                {bulkLoading === 'prayer' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                تفعيل تذكير الصلاة للكل
              </Button>
              <Button onClick={bulkEnableQuiz} disabled={!!bulkLoading} className="gap-2">
                {bulkLoading === 'quiz' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Moon className="w-4 h-4" />}
                تفعيل المسابقة للكل
              </Button>
              <Button onClick={sendTestQuiz} disabled={!!bulkLoading} variant="secondary" className="gap-2">
                {bulkLoading === 'test' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                إرسال سؤال تجريبي
              </Button>
              <Button onClick={testPrayer} disabled={!!bulkLoading} variant="secondary" className="gap-2">
                {bulkLoading === 'prayer-test' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                اختبار تذكير الصلاة
              </Button>
              <Button onClick={regenerateQuestions} disabled={!!bulkLoading} variant="destructive" className="gap-2">
                {bulkLoading === 'regen' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                إعادة إنشاء الأسئلة
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="questions" className="w-full">
          <TabsList className="bg-slate-900 border border-slate-800">
            <TabsTrigger value="questions">📝 الأسئلة ({questions.length})</TabsTrigger>
            <TabsTrigger value="companies">🏢 حالة الشركات</TabsTrigger>
          </TabsList>

          <TabsContent value="questions" className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="بحث في الأسئلة..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-10 bg-slate-900 border-slate-700 text-white"
                />
              </div>
              <Button onClick={openAdd} className="gap-2">
                <Plus className="w-4 h-4" /> إضافة سؤال
              </Button>
            </div>

            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-0">
                {loadingQuestions ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-800">
                          <TableHead className="text-slate-300">#</TableHead>
                          <TableHead className="text-slate-300">السؤال</TableHead>
                          <TableHead className="text-slate-300">الإجابة</TableHead>
                          <TableHead className="text-slate-300">التصنيف</TableHead>
                          <TableHead className="text-slate-300">إجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredQuestions.map((q, i) => (
                          <TableRow key={q.id} className="border-slate-800">
                            <TableCell className="text-slate-400">{i + 1}</TableCell>
                            <TableCell className="text-white max-w-xs truncate">{q.question_text}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                                {q.correct_option === 'a' ? q.option_a :
                                 q.correct_option === 'b' ? q.option_b :
                                 q.correct_option === 'c' ? q.option_c : q.option_d}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-slate-400">{q.category || '-'}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button size="icon" variant="ghost" onClick={() => openEdit(q)} className="text-blue-400 hover:text-blue-300">
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(q.id)} className="text-red-400 hover:text-red-300">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="companies">
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800">
                        <TableHead className="text-slate-300">الشركة</TableHead>
                        <TableHead className="text-slate-300">الدولة</TableHead>
                        <TableHead className="text-slate-300">تذكير الصلاة</TableHead>
                        <TableHead className="text-slate-300">مسابقة رمضان</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {companies.map((c: any) => (
                        <TableRow key={c.id} className="border-slate-800">
                          <TableCell className="text-white">{c.name}</TableCell>
                          <TableCell className="text-slate-400">{c.country_code || '-'}</TableCell>
                          <TableCell>
                            <Badge className={c.prayer_reminders_enabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                              {c.prayer_reminders_enabled ? 'مفعل' : 'معطل'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={c.ramadan_quiz_enabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                              {c.ramadan_quiz_enabled ? 'مفعل' : 'معطل'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add/Edit Dialog */}
        <Dialog open={showAddDialog} onOpenChange={(o) => { if (!o) { setShowAddDialog(false); setEditQuestion(null); } }}>
          <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editQuestion ? 'تعديل السؤال' : 'إضافة سؤال جديد'}</DialogTitle>
              <DialogDescription className="text-slate-400">
                {editQuestion ? 'عدّل بيانات السؤال' : 'أضف سؤال جديد لمسابقة رمضان'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>السؤال</Label>
                <Textarea value={formData.question_text} onChange={(e) => setFormData(p => ({ ...p, question_text: e.target.value }))} className="bg-slate-800 border-slate-700" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>أ)</Label>
                  <Input value={formData.option_a} onChange={(e) => setFormData(p => ({ ...p, option_a: e.target.value }))} className="bg-slate-800 border-slate-700" />
                </div>
                <div>
                  <Label>ب)</Label>
                  <Input value={formData.option_b} onChange={(e) => setFormData(p => ({ ...p, option_b: e.target.value }))} className="bg-slate-800 border-slate-700" />
                </div>
                <div>
                  <Label>ج)</Label>
                  <Input value={formData.option_c} onChange={(e) => setFormData(p => ({ ...p, option_c: e.target.value }))} className="bg-slate-800 border-slate-700" />
                </div>
                <div>
                  <Label>د)</Label>
                  <Input value={formData.option_d} onChange={(e) => setFormData(p => ({ ...p, option_d: e.target.value }))} className="bg-slate-800 border-slate-700" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>الإجابة الصحيحة</Label>
                  <Select value={formData.correct_option} onValueChange={(v) => setFormData(p => ({ ...p, correct_option: v }))}>
                    <SelectTrigger className="bg-slate-800 border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a">أ</SelectItem>
                      <SelectItem value="b">ب</SelectItem>
                      <SelectItem value="c">ج</SelectItem>
                      <SelectItem value="d">د</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>التصنيف</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData(p => ({ ...p, category: v }))}>
                    <SelectTrigger className="bg-slate-800 border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="دينية">دينية</SelectItem>
                      <SelectItem value="ثقافية">ثقافية</SelectItem>
                      <SelectItem value="قرآنية">قرآنية</SelectItem>
                      <SelectItem value="سيرة">سيرة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => { setShowAddDialog(false); setEditQuestion(null); }}>إلغاء</Button>
              <Button
                onClick={() => saveMutation.mutate({ ...formData, id: editQuestion?.id })}
                disabled={saveMutation.isPending || !formData.question_text}
              >
                {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin me-2" />}
                {editQuestion ? 'تعديل' : 'إضافة'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SuperAdminLayout>
  );
};

// Generate 100 diverse questions
function generateQuestions() {
  const questions = [
    { question_text: 'ما هو أول ركن من أركان الإسلام؟', option_a: 'الشهادتان', option_b: 'الصلاة', option_c: 'الزكاة', option_d: 'الصوم', correct_option: 'a', category: 'دينية' },
    { question_text: 'كم عدد ركعات صلاة الفجر؟', option_a: '4', option_b: '2', option_c: '3', option_d: '1', correct_option: 'b', category: 'دينية' },
    { question_text: 'في أي شهر هجري يكون شهر رمضان؟', option_a: 'السابع', option_b: 'الثامن', option_c: 'التاسع', option_d: 'العاشر', correct_option: 'c', category: 'دينية' },
    { question_text: 'ما هي أطول سورة في القرآن الكريم؟', option_a: 'آل عمران', option_b: 'البقرة', option_c: 'النساء', option_d: 'المائدة', correct_option: 'b', category: 'قرآنية' },
    { question_text: 'كم عدد أجزاء القرآن الكريم؟', option_a: '20', option_b: '25', option_c: '30', option_d: '35', correct_option: 'c', category: 'قرآنية' },
    { question_text: 'ما هي السورة التي تسمى قلب القرآن؟', option_a: 'الرحمن', option_b: 'يس', option_c: 'الملك', option_d: 'الكهف', correct_option: 'b', category: 'قرآنية' },
    { question_text: 'من هو خاتم الأنبياء والمرسلين؟', option_a: 'عيسى عليه السلام', option_b: 'موسى عليه السلام', option_c: 'محمد ﷺ', option_d: 'إبراهيم عليه السلام', correct_option: 'c', category: 'دينية' },
    { question_text: 'ما هي ليلة القدر؟', option_a: 'ليلة في شعبان', option_b: 'ليلة في رمضان خير من ألف شهر', option_c: 'أول ليلة من رمضان', option_d: 'ليلة العيد', correct_option: 'b', category: 'دينية' },
    { question_text: 'كم مرة ذُكر اسم محمد ﷺ في القرآن؟', option_a: '3', option_b: '4', option_c: '5', option_d: '6', correct_option: 'b', category: 'قرآنية' },
    { question_text: 'ما هو الركن الثالث من أركان الإسلام؟', option_a: 'الصلاة', option_b: 'الصوم', option_c: 'الزكاة', option_d: 'الحج', correct_option: 'c', category: 'دينية' },
    { question_text: 'أين ولد النبي محمد ﷺ؟', option_a: 'المدينة', option_b: 'مكة', option_c: 'الطائف', option_d: 'اليمن', correct_option: 'b', category: 'سيرة' },
    { question_text: 'كم عدد سور القرآن الكريم؟', option_a: '112', option_b: '113', option_c: '114', option_d: '115', correct_option: 'c', category: 'قرآنية' },
    { question_text: 'ما أول ما نزل من القرآن؟', option_a: 'سورة الفاتحة', option_b: 'اقرأ', option_c: 'سورة البقرة', option_d: 'بسم الله', correct_option: 'b', category: 'قرآنية' },
    { question_text: 'كم سنة استمرت الدعوة السرية؟', option_a: '2 سنة', option_b: '3 سنوات', option_c: '4 سنوات', option_d: '5 سنوات', correct_option: 'b', category: 'سيرة' },
    { question_text: 'ما هو اسم أم النبي محمد ﷺ؟', option_a: 'خديجة', option_b: 'آمنة', option_c: 'فاطمة', option_d: 'عائشة', correct_option: 'b', category: 'سيرة' },
    { question_text: 'في أي غزوة انتصر المسلمون رغم قلة عددهم؟', option_a: 'أحد', option_b: 'بدر', option_c: 'الخندق', option_d: 'حنين', correct_option: 'b', category: 'سيرة' },
    { question_text: 'ما هو عدد أركان الإيمان؟', option_a: '5', option_b: '6', option_c: '7', option_d: '4', correct_option: 'b', category: 'دينية' },
    { question_text: 'ما اسم الصلاة التي تؤدى في رمضان بعد العشاء؟', option_a: 'الضحى', option_b: 'التراويح', option_c: 'الوتر', option_d: 'الاستسقاء', correct_option: 'b', category: 'دينية' },
    { question_text: 'ما هي الكعبة المشرفة؟', option_a: 'مسجد في المدينة', option_b: 'أول بيت وضع للناس', option_c: 'جبل في مكة', option_d: 'مقام إبراهيم', correct_option: 'b', category: 'دينية' },
    { question_text: 'كم عدد الصلوات المفروضة في اليوم؟', option_a: '3', option_b: '4', option_c: '5', option_d: '6', correct_option: 'c', category: 'دينية' },
    { question_text: 'ما هي السورة التي تُقرأ في كل ركعة؟', option_a: 'الإخلاص', option_b: 'الفاتحة', option_c: 'الناس', option_d: 'الفلق', correct_option: 'b', category: 'قرآنية' },
    { question_text: 'من هو أول مؤذن في الإسلام؟', option_a: 'عمر بن الخطاب', option_b: 'بلال بن رباح', option_c: 'أبو بكر', option_d: 'علي بن أبي طالب', correct_option: 'b', category: 'سيرة' },
    { question_text: 'ما هي زكاة الفطر؟', option_a: 'زكاة المال', option_b: 'صدقة تُخرج قبل عيد الفطر', option_c: 'صدقة في رمضان', option_d: 'زكاة الذهب', correct_option: 'b', category: 'دينية' },
    { question_text: 'ما هي أقصر سورة في القرآن؟', option_a: 'الإخلاص', option_b: 'الفلق', option_c: 'الكوثر', option_d: 'الناس', correct_option: 'c', category: 'قرآنية' },
    { question_text: 'ما اسم زوجة النبي ﷺ الأولى؟', option_a: 'عائشة', option_b: 'حفصة', option_c: 'خديجة', option_d: 'سودة', correct_option: 'c', category: 'سيرة' },
    { question_text: 'في أي سنة هجرية فُرض الصيام؟', option_a: 'الأولى', option_b: 'الثانية', option_c: 'الثالثة', option_d: 'الرابعة', correct_option: 'b', category: 'دينية' },
    { question_text: 'ما هو الحديث القدسي؟', option_a: 'كلام النبي', option_b: 'كلام الله بلفظ النبي', option_c: 'آية قرآنية', option_d: 'كلام الصحابة', correct_option: 'b', category: 'دينية' },
    { question_text: 'كم عدد أبواب الجنة؟', option_a: '6', option_b: '7', option_c: '8', option_d: '9', correct_option: 'c', category: 'دينية' },
    { question_text: 'ما اسم الجبل الذي رست عليه سفينة نوح؟', option_a: 'عرفات', option_b: 'الجودي', option_c: 'أحد', option_d: 'الصفا', correct_option: 'b', category: 'قرآنية' },
    { question_text: 'من هو النبي الذي ابتلعه الحوت؟', option_a: 'نوح', option_b: 'يونس', option_c: 'موسى', option_d: 'إلياس', correct_option: 'b', category: 'قرآنية' },
    { question_text: 'ما هي السورة التي تُعرف بعروس القرآن؟', option_a: 'يس', option_b: 'الرحمن', option_c: 'الملك', option_d: 'الواقعة', correct_option: 'b', category: 'قرآنية' },
    { question_text: 'كم عدد آيات سورة الفاتحة؟', option_a: '5', option_b: '6', option_c: '7', option_d: '8', correct_option: 'c', category: 'قرآنية' },
    { question_text: 'ما هو الإسراء والمعراج؟', option_a: 'هجرة النبي', option_b: 'رحلة ليلية من مكة إلى المسجد الأقصى ثم السماء', option_c: 'فتح مكة', option_d: 'غزوة بدر', correct_option: 'b', category: 'سيرة' },
    { question_text: 'ما أول مسجد بني في الإسلام؟', option_a: 'المسجد الحرام', option_b: 'مسجد قباء', option_c: 'المسجد النبوي', option_d: 'المسجد الأقصى', correct_option: 'b', category: 'سيرة' },
    { question_text: 'ما هي كفارة اليمين؟', option_a: 'صيام 3 أيام', option_b: 'إطعام 10 مساكين أو كسوتهم', option_c: 'صدقة', option_d: 'صلاة ركعتين', correct_option: 'b', category: 'دينية' },
    { question_text: 'من هو الصحابي الملقب بأمين الأمة؟', option_a: 'أبو بكر', option_b: 'أبو عبيدة بن الجراح', option_c: 'عثمان', option_d: 'خالد بن الوليد', correct_option: 'b', category: 'سيرة' },
    { question_text: 'ما هي صلاة الكسوف؟', option_a: 'صلاة العيد', option_b: 'صلاة عند كسوف الشمس', option_c: 'صلاة الجمعة', option_d: 'صلاة الاستخارة', correct_option: 'b', category: 'دينية' },
    { question_text: 'كم يوماً صام النبي ﷺ من شعبان؟', option_a: 'لم يصم', option_b: 'أكثره', option_c: '10 أيام', option_d: '5 أيام', correct_option: 'b', category: 'دينية' },
    { question_text: 'ما هي السورة التي بدأت بـ "الحمد لله"؟', option_a: 'البقرة', option_b: 'الفاتحة', option_c: 'الإخلاص', option_d: 'الكوثر', correct_option: 'b', category: 'قرآنية' },
    { question_text: 'من بنى الكعبة أول مرة؟', option_a: 'النبي محمد ﷺ', option_b: 'إبراهيم وإسماعيل', option_c: 'آدم عليه السلام', option_d: 'نوح', correct_option: 'b', category: 'دينية' },
    { question_text: 'ما هي ثمرات الصيام الصحية؟', option_a: 'تنقية الجسم من السموم', option_b: 'كل ما سبق', option_c: 'تعزيز المناعة', option_d: 'تحسين الهضم', correct_option: 'b', category: 'ثقافية' },
    { question_text: 'أي دولة بها أكبر عدد مسلمين؟', option_a: 'السعودية', option_b: 'إندونيسيا', option_c: 'مصر', option_d: 'باكستان', correct_option: 'b', category: 'ثقافية' },
    { question_text: 'ما هو الإفطار التقليدي في رمضان؟', option_a: 'الماء فقط', option_b: 'التمر والماء', option_c: 'الحليب', option_d: 'العصير', correct_option: 'b', category: 'ثقافية' },
    { question_text: 'ما هو وقت السحور؟', option_a: 'بعد الإفطار', option_b: 'قبل أذان الفجر', option_c: 'عند الظهر', option_d: 'بعد العشاء', correct_option: 'b', category: 'دينية' },
    { question_text: 'ما هي الصدقة الجارية؟', option_a: 'صدقة لمرة واحدة', option_b: 'صدقة يستمر أجرها', option_c: 'زكاة المال', option_d: 'الهدية', correct_option: 'b', category: 'دينية' },
    { question_text: 'من هو خليل الله؟', option_a: 'محمد ﷺ', option_b: 'إبراهيم عليه السلام', option_c: 'موسى عليه السلام', option_d: 'عيسى عليه السلام', correct_option: 'b', category: 'دينية' },
    { question_text: 'ما هي السورة المسماة بالمنجية؟', option_a: 'البقرة', option_b: 'الملك', option_c: 'يس', option_d: 'الكهف', correct_option: 'b', category: 'قرآنية' },
    { question_text: 'كم عمر النبي ﷺ عندما نزل عليه الوحي؟', option_a: '35', option_b: '40', option_c: '45', option_d: '50', correct_option: 'b', category: 'سيرة' },
    { question_text: 'ما هي فاكهة ذُكرت في القرآن؟', option_a: 'التفاح', option_b: 'التين', option_c: 'البرتقال', option_d: 'الموز', correct_option: 'b', category: 'قرآنية' },
    { question_text: 'ما هو حكم صيام يوم العيد؟', option_a: 'مستحب', option_b: 'محرّم', option_c: 'مكروه', option_d: 'واجب', correct_option: 'b', category: 'دينية' },
    { question_text: 'كم عدد الملائكة المذكورين بالاسم في القرآن؟', option_a: '2', option_b: '4', option_c: '6', option_d: '8', correct_option: 'a', category: 'قرآنية' },
    { question_text: 'ما هو الذكر المستحب بعد الأذان؟', option_a: 'الاستغفار', option_b: 'الصلاة على النبي والدعاء', option_c: 'قراءة الفاتحة', option_d: 'التسبيح', correct_option: 'b', category: 'دينية' },
    { question_text: 'ما هي مكانة شهر رمضان بين الأشهر الهجرية؟', option_a: 'الشهر السابع', option_b: 'الشهر التاسع', option_c: 'الشهر العاشر', option_d: 'الشهر الثامن', correct_option: 'b', category: 'ثقافية' },
    { question_text: 'ما هو عيد الفطر؟', option_a: 'عيد بعد الحج', option_b: 'عيد بعد رمضان', option_c: 'عيد في رجب', option_d: 'عيد في شعبان', correct_option: 'b', category: 'ثقافية' },
    { question_text: 'ما حكم من أفطر ناسياً في رمضان؟', option_a: 'يقضي اليوم', option_b: 'يكمل صيامه ولا شيء عليه', option_c: 'يدفع كفارة', option_d: 'يصوم يومين', correct_option: 'b', category: 'دينية' },
    { question_text: 'كم عدد أسماء الله الحسنى؟', option_a: '77', option_b: '99', option_c: '100', option_d: '88', correct_option: 'b', category: 'دينية' },
    { question_text: 'ما هو حق الجار في الإسلام؟', option_a: 'لا حق له', option_b: 'الإحسان إليه وعدم إيذائه', option_c: 'السلام فقط', option_d: 'الزيارة فقط', correct_option: 'b', category: 'دينية' },
    { question_text: 'ما هي صلاة الوتر؟', option_a: 'صلاة فرض', option_b: 'صلاة سنة مؤكدة بعد العشاء', option_c: 'صلاة العيد', option_d: 'صلاة الجمعة', correct_option: 'b', category: 'دينية' },
    { question_text: 'كم سنة عاش النبي ﷺ في المدينة؟', option_a: '8', option_b: '10', option_c: '12', option_d: '13', correct_option: 'b', category: 'سيرة' },
    { question_text: 'ما هو يوم عرفة؟', option_a: 'يوم العيد', option_b: 'اليوم التاسع من ذي الحجة', option_c: 'أول رمضان', option_d: 'آخر رمضان', correct_option: 'b', category: 'دينية' },
    { question_text: 'من هو كليم الله؟', option_a: 'إبراهيم', option_b: 'موسى عليه السلام', option_c: 'عيسى', option_d: 'محمد ﷺ', correct_option: 'b', category: 'دينية' },
    { question_text: 'ما معنى كلمة "رمضان"؟', option_a: 'البرد', option_b: 'الحرّ الشديد', option_c: 'الخير', option_d: 'النور', correct_option: 'b', category: 'ثقافية' },
    { question_text: 'ما هي العمرة؟', option_a: 'زيارة المدينة', option_b: 'زيارة البيت الحرام للطواف والسعي', option_c: 'صلاة في مكة', option_d: 'صيام يوم', correct_option: 'b', category: 'دينية' },
    { question_text: 'كم عدد الخلفاء الراشدين؟', option_a: '3', option_b: '4', option_c: '5', option_d: '6', correct_option: 'b', category: 'سيرة' },
    { question_text: 'ما هي البسملة؟', option_a: 'الحمد لله', option_b: 'بسم الله الرحمن الرحيم', option_c: 'لا إله إلا الله', option_d: 'الله أكبر', correct_option: 'b', category: 'دينية' },
    { question_text: 'أين يوجد المسجد الأقصى؟', option_a: 'مكة', option_b: 'القدس', option_c: 'المدينة', option_d: 'دمشق', correct_option: 'b', category: 'ثقافية' },
    { question_text: 'ما هي الهجرة النبوية؟', option_a: 'سفر إلى الطائف', option_b: 'انتقال النبي من مكة إلى المدينة', option_c: 'غزوة بدر', option_d: 'فتح مكة', correct_option: 'b', category: 'سيرة' },
    { question_text: 'ما هو التقويم الهجري؟', option_a: 'تقويم شمسي', option_b: 'تقويم قمري يبدأ من هجرة النبي', option_c: 'تقويم ميلادي', option_d: 'تقويم فارسي', correct_option: 'b', category: 'ثقافية' },
    { question_text: 'كم ركعة في صلاة التراويح عند الجمهور؟', option_a: '8', option_b: '20', option_c: '12', option_d: '10', correct_option: 'b', category: 'دينية' },
    { question_text: 'ما هي سورة الإخلاص؟', option_a: 'قل أعوذ برب الناس', option_b: 'قل هو الله أحد', option_c: 'قل أعوذ برب الفلق', option_d: 'إنا أعطيناك الكوثر', correct_option: 'b', category: 'قرآنية' },
    { question_text: 'من هو الصحابي الملقب بسيف الله المسلول؟', option_a: 'عمر بن الخطاب', option_b: 'خالد بن الوليد', option_c: 'علي بن أبي طالب', option_d: 'سعد بن أبي وقاص', correct_option: 'b', category: 'سيرة' },
    { question_text: 'ما هي أول صلاة فرضت على المسلمين؟', option_a: 'الفجر', option_b: 'الظهر', option_c: 'العشاء', option_d: 'المغرب', correct_option: 'b', category: 'دينية' },
    { question_text: 'ما اسم ناقة النبي ﷺ؟', option_a: 'العضباء', option_b: 'القصواء', option_c: 'الجدعاء', option_d: 'البراق', correct_option: 'b', category: 'سيرة' },
    { question_text: 'ما هو الاعتكاف؟', option_a: 'صيام متواصل', option_b: 'لزوم المسجد للعبادة', option_c: 'قراءة القرآن', option_d: 'صلاة الليل', correct_option: 'b', category: 'دينية' },
    { question_text: 'كم مرة ذُكرت كلمة "رمضان" في القرآن؟', option_a: 'مرة واحدة', option_b: 'مرتين', option_c: 'ثلاث مرات', option_d: 'أربع مرات', correct_option: 'a', category: 'قرآنية' },
    { question_text: 'ما هو الدعاء المأثور عند الإفطار؟', option_a: 'بسم الله', option_b: 'ذهب الظمأ وابتلت العروق', option_c: 'الحمد لله', option_d: 'لا إله إلا الله', correct_option: 'b', category: 'دينية' },
    { question_text: 'من الذي لقب بأبي المسلمين؟', option_a: 'عمر', option_b: 'إبراهيم عليه السلام', option_c: 'محمد ﷺ', option_d: 'نوح', correct_option: 'b', category: 'دينية' },
    { question_text: 'ما هو حكم تعجيل الفطر؟', option_a: 'مكروه', option_b: 'سنة مستحبة', option_c: 'واجب', option_d: 'مباح', correct_option: 'b', category: 'دينية' },
    { question_text: 'كم عدد أبواب النار؟', option_a: '5', option_b: '7', option_c: '8', option_d: '9', correct_option: 'b', category: 'دينية' },
    { question_text: 'ما هو الركوع؟', option_a: 'السجود', option_b: 'الانحناء في الصلاة', option_c: 'القيام', option_d: 'الجلوس', correct_option: 'b', category: 'دينية' },
    { question_text: 'ما هي سورة الكهف؟', option_a: 'السورة 17', option_b: 'السورة 18', option_c: 'السورة 19', option_d: 'السورة 20', correct_option: 'b', category: 'قرآنية' },
    { question_text: 'من هو الصديق؟', option_a: 'عمر بن الخطاب', option_b: 'أبو بكر الصديق', option_c: 'عثمان بن عفان', option_d: 'علي بن أبي طالب', correct_option: 'b', category: 'سيرة' },
    { question_text: 'ما هي صلاة الجنازة؟', option_a: 'صلاة ركعتين', option_b: 'صلاة على الميت بأربع تكبيرات', option_c: 'صلاة في المقبرة', option_d: 'دعاء فقط', correct_option: 'b', category: 'دينية' },
    { question_text: 'ما هو أجر قراءة حرف من القرآن؟', option_a: 'حسنة', option_b: 'حسنة والحسنة بعشر أمثالها', option_c: 'خمس حسنات', option_d: 'ثلاث حسنات', correct_option: 'b', category: 'دينية' },
    { question_text: 'ما هي العشر الأواخر من رمضان؟', option_a: 'أول 10 أيام', option_b: 'آخر 10 أيام وفيها ليلة القدر', option_c: 'وسط رمضان', option_d: '10 أيام بعد رمضان', correct_option: 'b', category: 'دينية' },
    { question_text: 'من هو روح الله؟', option_a: 'موسى', option_b: 'عيسى عليه السلام', option_c: 'جبريل', option_d: 'محمد ﷺ', correct_option: 'b', category: 'دينية' },
    { question_text: 'ما أول عاصمة في الإسلام؟', option_a: 'مكة', option_b: 'المدينة المنورة', option_c: 'دمشق', option_d: 'بغداد', correct_option: 'b', category: 'ثقافية' },
    { question_text: 'ما هي فضيلة صيام 6 أيام من شوال؟', option_a: 'مثل صيام شهر', option_b: 'كصيام الدهر كله', option_c: 'مثل صيام أسبوع', option_d: 'لا فضل', correct_option: 'b', category: 'دينية' },
    { question_text: 'ما اسم غار حراء؟', option_a: 'غار في المدينة', option_b: 'غار في جبل النور بمكة', option_c: 'غار في الطائف', option_d: 'غار ثور', correct_option: 'b', category: 'سيرة' },
    { question_text: 'ما هو التيمم؟', option_a: 'الوضوء بالماء', option_b: 'الطهارة بالتراب عند فقد الماء', option_c: 'الاغتسال', option_d: 'غسل اليدين', correct_option: 'b', category: 'دينية' },
    { question_text: 'ما هي معجزة النبي ﷺ الخالدة؟', option_a: 'شق القمر', option_b: 'القرآن الكريم', option_c: 'الإسراء', option_d: 'نبع الماء', correct_option: 'b', category: 'دينية' },
    { question_text: 'ما هو شهر المحرم؟', option_a: 'آخر شهر هجري', option_b: 'أول شهر هجري', option_c: 'شهر رمضان', option_d: 'شهر شعبان', correct_option: 'b', category: 'ثقافية' },
    { question_text: 'ما هو حكم الإسراف في الطعام عند الإفطار؟', option_a: 'مباح', option_b: 'مكروه ومنهي عنه', option_c: 'حرام', option_d: 'مستحب', correct_option: 'b', category: 'دينية' },
    { question_text: 'كم يبلغ عدد الأنبياء المذكورين في القرآن؟', option_a: '20', option_b: '25', option_c: '28', option_d: '30', correct_option: 'b', category: 'قرآنية' },
    { question_text: 'ما هو يوم الجمعة في الإسلام؟', option_a: 'يوم عادي', option_b: 'سيد الأيام وفيه ساعة إجابة', option_c: 'يوم صيام', option_d: 'يوم عيد فقط', correct_option: 'b', category: 'دينية' },
    { question_text: 'من هو ذو النون؟', option_a: 'إبراهيم', option_b: 'يونس عليه السلام', option_c: 'نوح', option_d: 'يوسف', correct_option: 'b', category: 'قرآنية' },
    { question_text: 'ما هو فضل الصدقة في رمضان؟', option_a: 'عادية', option_b: 'مضاعفة الأجر', option_c: 'لا فرق', option_d: 'أقل أجراً', correct_option: 'b', category: 'دينية' },
    { question_text: 'ما هي قصة أصحاب الفيل؟', option_a: 'قصة في المدينة', option_b: 'محاولة أبرهة هدم الكعبة', option_c: 'غزوة', option_d: 'قصة نبي', correct_option: 'b', category: 'قرآنية' },
    { question_text: 'ما هو حكم صلاة الجماعة؟', option_a: 'مباح', option_b: 'سنة مؤكدة أو واجب', option_c: 'فرض كفاية', option_d: 'مكروه', correct_option: 'b', category: 'دينية' },
    { question_text: 'ما هو المسجد الذي أسس على التقوى؟', option_a: 'المسجد الحرام', option_b: 'مسجد قباء', option_c: 'المسجد الأقصى', option_d: 'المسجد النبوي', correct_option: 'b', category: 'سيرة' },
    { question_text: 'ما هو الوقف الإسلامي؟', option_a: 'بيع العقار', option_b: 'حبس أصل المال وتسبيل منفعته', option_c: 'قرض', option_d: 'هبة', correct_option: 'b', category: 'ثقافية' },
  ];
  return questions;
}

export default SuperAdminRamadan;
