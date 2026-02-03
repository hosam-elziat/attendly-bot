import { useState } from 'react';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { useBroadcasts, useBroadcastDeliveries, useUploadBroadcastMedia } from '@/hooks/useBroadcasts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { toast } from 'sonner';
import {
  Send,
  Plus,
  Trash2,
  Image,
  Music,
  Eye,
  Loader2,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
} from 'lucide-react';
import CompanySelector from '@/components/super-admin/CompanySelector';

const SUBSCRIPTION_PLANS = [
  { id: 'trial', label: 'تجريبي' },
  { id: 'basic', label: 'أساسي' },
  { id: 'premium', label: 'متميز' },
  { id: 'enterprise', label: 'مؤسسي' },
];

const SuperAdminBroadcasts = () => {
  const { broadcasts, isLoading, createBroadcast, sendBroadcast, deleteBroadcast } = useBroadcasts();
  const { uploadImage, uploadAudio, uploading } = useUploadBroadcastMedia();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewDeliveriesId, setViewDeliveriesId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    message_text: '',
    target_type: 'all' as 'all' | 'subscription' | 'custom',
    selected_plans: [] as string[],
    selected_company_ids: [] as string[],
    notes: '',
  });
  const [imageUrl, setImageUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState('');

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadImage(file);
      setImageUrl(url);
      toast.success('تم رفع الصورة');
    } catch (error) {
      toast.error('فشل في رفع الصورة');
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadAudio(file);
      setAudioUrl(url);
      toast.success('تم رفع المقطع الصوتي');
    } catch (error) {
      toast.error('فشل في رفع المقطع الصوتي');
    }
  };

  const handleCreate = async () => {
    if (!formData.message_text.trim()) {
      toast.error('الرجاء إدخال نص الرسالة');
      return;
    }

    await createBroadcast.mutateAsync({
      message_text: formData.message_text,
      image_url: imageUrl || undefined,
      audio_url: audioUrl || undefined,
      target_type: formData.target_type,
      target_filter: formData.target_type === 'subscription' 
        ? { plans: formData.selected_plans }
        : formData.target_type === 'custom'
        ? { company_ids: formData.selected_company_ids }
        : undefined,
      notes: formData.notes || undefined,
    });

    setIsCreateOpen(false);
    setFormData({ message_text: '', target_type: 'all', selected_plans: [], selected_company_ids: [], notes: '' });
    setImageUrl('');
    setAudioUrl('');
  };

  const handleSend = async (broadcastId: string) => {
    await sendBroadcast.mutateAsync(broadcastId);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteBroadcast.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">مسودة</Badge>;
      case 'sending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">جاري الإرسال</Badge>;
      case 'sent':
        return <Badge className="bg-green-600">تم الإرسال</Badge>;
      case 'failed':
        return <Badge variant="destructive">فشل</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTargetLabel = (broadcast: any) => {
    if (broadcast.target_type === 'all') return 'جميع الشركات';
    if (broadcast.target_type === 'subscription') {
      const plans = broadcast.target_filter?.plans || [];
      return `اشتراكات: ${plans.join(', ')}`;
    }
    return 'مخصص';
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">رسائل البث</h1>
            <p className="text-slate-400 mt-1">
              إرسال رسائل وتحديثات عبر التيليجرام لأصحاب الشركات
            </p>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                رسالة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-white">إنشاء رسالة بث جديدة</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div>
                  <Label className="text-slate-300">نص الرسالة *</Label>
                  <Textarea
                    value={formData.message_text}
                    onChange={(e) => setFormData({ ...formData, message_text: e.target.value })}
                    placeholder="اكتب رسالتك هنا... يدعم تنسيق Markdown"
                    className="mt-1 min-h-[120px] bg-slate-800 border-slate-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-300">صورة (اختياري)</Label>
                    <div className="mt-1">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploading}
                        className="bg-slate-800 border-slate-600"
                      />
                      {imageUrl && (
                        <div className="mt-2 flex items-center gap-2 text-green-400">
                          <Image className="w-4 h-4" />
                          <span className="text-sm">تم رفع الصورة</span>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setImageUrl('')}
                            className="text-red-400 hover:text-red-300"
                          >
                            حذف
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="text-slate-300">مقطع صوتي (اختياري)</Label>
                    <div className="mt-1">
                      <Input
                        type="file"
                        accept="audio/*"
                        onChange={handleAudioUpload}
                        disabled={uploading}
                        className="bg-slate-800 border-slate-600"
                      />
                      {audioUrl && (
                        <div className="mt-2 flex items-center gap-2 text-green-400">
                          <Music className="w-4 h-4" />
                          <span className="text-sm">تم رفع المقطع</span>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setAudioUrl('')}
                            className="text-red-400 hover:text-red-300"
                          >
                            حذف
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-slate-300">المستهدفون</Label>
                  <div className="mt-2 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="target_type"
                        checked={formData.target_type === 'all'}
                        onChange={() => setFormData({ ...formData, target_type: 'all' })}
                        className="text-primary"
                      />
                      <span className="text-slate-300">جميع الشركات</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="target_type"
                        checked={formData.target_type === 'subscription'}
                        onChange={() => setFormData({ ...formData, target_type: 'subscription' })}
                        className="text-primary"
                      />
                      <span className="text-slate-300">حسب الاشتراك</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="target_type"
                        checked={formData.target_type === 'custom'}
                        onChange={() => setFormData({ ...formData, target_type: 'custom' })}
                        className="text-primary"
                      />
                      <span className="text-slate-300">شركات محددة</span>
                    </label>
                  </div>

                  {formData.target_type === 'subscription' && (
                    <div className="mt-3 p-3 bg-slate-800 rounded-lg space-y-2">
                      {SUBSCRIPTION_PLANS.map((plan) => (
                        <label key={plan.id} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={formData.selected_plans.includes(plan.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData({
                                  ...formData,
                                  selected_plans: [...formData.selected_plans, plan.id],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  selected_plans: formData.selected_plans.filter((p) => p !== plan.id),
                                });
                              }
                            }}
                          />
                          <span className="text-slate-300">{plan.label}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {formData.target_type === 'custom' && (
                    <div className="mt-3">
                      <CompanySelector
                        selectedCompanyIds={formData.selected_company_ids}
                        onSelectionChange={(ids) => setFormData({ ...formData, selected_company_ids: ids })}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-slate-300">ملاحظات داخلية (اختياري)</Label>
                  <Input
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="ملاحظات للفريق..."
                    className="mt-1 bg-slate-800 border-slate-600"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    إلغاء
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={createBroadcast.isPending || uploading}
                  >
                    {createBroadcast.isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                    إنشاء
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{broadcasts?.length || 0}</p>
                  <p className="text-slate-400 text-sm">إجمالي الرسائل</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-2xl font-bold text-white">
                    {broadcasts?.filter((b) => b.status === 'sent').length || 0}
                  </p>
                  <p className="text-slate-400 text-sm">تم إرسالها</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-purple-400" />
                <div>
                  <p className="text-2xl font-bold text-white">
                    {broadcasts?.reduce((acc, b) => acc + (b.successful_sends || 0), 0) || 0}
                  </p>
                  <p className="text-slate-400 text-sm">إجمالي المستلمين</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-yellow-400" />
                <div>
                  <p className="text-2xl font-bold text-white">
                    {broadcasts?.filter((b) => b.status === 'draft').length || 0}
                  </p>
                  <p className="text-slate-400 text-sm">مسودات</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Broadcasts Table */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">سجل الرسائل</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : broadcasts?.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                لا توجد رسائل بعد
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-400">الرسالة</TableHead>
                    <TableHead className="text-slate-400">المستهدفون</TableHead>
                    <TableHead className="text-slate-400">الحالة</TableHead>
                    <TableHead className="text-slate-400">الإحصائيات</TableHead>
                    <TableHead className="text-slate-400">التاريخ</TableHead>
                    <TableHead className="text-slate-400">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {broadcasts?.map((broadcast) => (
                    <TableRow key={broadcast.id} className="border-slate-700">
                      <TableCell className="text-white max-w-xs">
                        <div className="flex items-center gap-2">
                          {broadcast.image_url && <Image className="w-4 h-4 text-blue-400" />}
                          {broadcast.audio_url && <Music className="w-4 h-4 text-purple-400" />}
                          <span className="truncate">{broadcast.message_text.substring(0, 50)}...</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {getTargetLabel(broadcast)}
                      </TableCell>
                      <TableCell>{getStatusBadge(broadcast.status)}</TableCell>
                      <TableCell className="text-slate-300">
                        {broadcast.status === 'sent' && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-green-400">{broadcast.successful_sends}</span>
                            <span className="text-slate-500">/</span>
                            <span className="text-red-400">{broadcast.failed_sends}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm">
                        {new Date(broadcast.created_at).toLocaleDateString('ar-SA')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {broadcast.status === 'draft' && (
                            <Button
                              size="sm"
                              onClick={() => handleSend(broadcast.id)}
                              disabled={sendBroadcast.isPending}
                              className="gap-1"
                            >
                              <Send className="w-3 h-3" />
                              إرسال
                            </Button>
                          )}
                          {broadcast.status === 'sent' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setViewDeliveriesId(broadcast.id)}
                              className="gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              التفاصيل
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteId(broadcast.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent className="bg-slate-900 border-slate-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">حذف الرسالة؟</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                سيتم حذف هذه الرسالة نهائياً. لا يمكن التراجع عن هذا الإجراء.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-slate-800 text-white hover:bg-slate-700">
                إلغاء
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                حذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Deliveries Dialog */}
        {viewDeliveriesId && (
          <BroadcastDeliveriesDialog
            broadcastId={viewDeliveriesId}
            onClose={() => setViewDeliveriesId(null)}
          />
        )}
      </div>
    </SuperAdminLayout>
  );
};

const BroadcastDeliveriesDialog = ({
  broadcastId,
  onClose,
}: {
  broadcastId: string;
  onClose: () => void;
}) => {
  const { data: deliveries, isLoading } = useBroadcastDeliveries(broadcastId);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">تفاصيل الإرسال</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700">
                <TableHead className="text-slate-400">الشركة</TableHead>
                <TableHead className="text-slate-400">الحالة</TableHead>
                <TableHead className="text-slate-400">الوقت</TableHead>
                <TableHead className="text-slate-400">الخطأ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries?.map((delivery) => (
                <TableRow key={delivery.id} className="border-slate-700">
                  <TableCell className="text-white">
                    {delivery.company?.name || delivery.company_id}
                  </TableCell>
                  <TableCell>
                    {delivery.status === 'sent' ? (
                      <Badge className="bg-green-600">تم الإرسال</Badge>
                    ) : (
                      <Badge variant="destructive">فشل</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-400 text-sm">
                    {delivery.sent_at
                      ? new Date(delivery.sent_at).toLocaleString('ar-SA')
                      : '-'}
                  </TableCell>
                  <TableCell className="text-red-400 text-sm max-w-xs truncate">
                    {delivery.error_message || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SuperAdminBroadcasts;
