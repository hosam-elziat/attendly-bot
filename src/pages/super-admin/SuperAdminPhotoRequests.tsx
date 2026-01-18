import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Check, X, ExternalLink, Loader2, ImageIcon, Clock, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { useSuperAdmin } from '@/contexts/SuperAdminContext';

interface PhotoRequest {
  id: string;
  company_id: string;
  bot_username: string;
  requested_by: string;
  requested_by_name: string | null;
  photo_url: string | null;
  status: string;
  admin_notes: string | null;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
  company_name?: string;
}

const SuperAdminPhotoRequests = () => {
  const { teamMember } = useSuperAdmin();
  const [requests, setRequests] = useState<PhotoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<PhotoRequest | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'complete' | 'reject'>('complete');
  const [adminNotes, setAdminNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'rejected'>('pending');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // Fetch requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('bot_photo_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      // Fetch company names
      const companyIds = [...new Set(requestsData?.map(r => r.company_id) || [])];
      const { data: companiesData } = await supabase
        .from('companies')
        .select('id, name')
        .in('id', companyIds);

      const companyMap = new Map(companiesData?.map(c => [c.id, c.name]) || []);

      const enrichedRequests = requestsData?.map(r => ({
        ...r,
        company_name: companyMap.get(r.company_id) || 'غير معروف',
      })) || [];

      setRequests(enrichedRequests);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('فشل في تحميل الطلبات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async () => {
    if (!selectedRequest || !teamMember) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('bot_photo_requests')
        .update({
          status: actionType === 'complete' ? 'completed' : 'rejected',
          admin_notes: adminNotes || null,
          completed_at: new Date().toISOString(),
          completed_by: teamMember.user_id,
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast.success(actionType === 'complete' ? 'تم إكمال الطلب بنجاح' : 'تم رفض الطلب');
      setActionDialogOpen(false);
      setSelectedRequest(null);
      setAdminNotes('');
      fetchRequests();
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('فشل في تحديث الطلب');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openActionDialog = (request: PhotoRequest, type: 'complete' | 'reject') => {
    setSelectedRequest(request);
    setActionType(type);
    setAdminNotes('');
    setActionDialogOpen(true);
  };

  const filteredRequests = requests.filter(r => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    completed: requests.filter(r => r.status === 'completed').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-warning/10 text-warning-foreground border-warning/30"><Clock className="w-3 h-3 me-1" /> قيد المراجعة</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-success/10 text-success border-success/30"><CheckCircle className="w-3 h-3 me-1" /> مكتمل</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30"><XCircle className="w-3 h-3 me-1" /> مرفوض</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">طلبات تغيير صور البوتات</h1>
          <p className="text-muted-foreground">إدارة طلبات تغيير صور البوتات من الشركات</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setFilter('all')}>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-sm text-muted-foreground">إجمالي الطلبات</p>
            </CardContent>
          </Card>
          <Card className={`cursor-pointer hover:border-primary transition-colors ${filter === 'pending' ? 'border-warning' : ''}`} onClick={() => setFilter('pending')}>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-warning">{stats.pending}</div>
              <p className="text-sm text-muted-foreground">قيد المراجعة</p>
            </CardContent>
          </Card>
          <Card className={`cursor-pointer hover:border-primary transition-colors ${filter === 'completed' ? 'border-success' : ''}`} onClick={() => setFilter('completed')}>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-success">{stats.completed}</div>
              <p className="text-sm text-muted-foreground">مكتمل</p>
            </CardContent>
          </Card>
          <Card className={`cursor-pointer hover:border-primary transition-colors ${filter === 'rejected' ? 'border-destructive' : ''}`} onClick={() => setFilter('rejected')}>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-destructive">{stats.rejected}</div>
              <p className="text-sm text-muted-foreground">مرفوض</p>
            </CardContent>
          </Card>
        </div>

        {/* Requests Table */}
        <Card>
          <CardHeader>
            <CardTitle>الطلبات {filter !== 'all' && `(${filter === 'pending' ? 'قيد المراجعة' : filter === 'completed' ? 'المكتملة' : 'المرفوضة'})`}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد طلبات</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الشركة</TableHead>
                    <TableHead>البوت</TableHead>
                    <TableHead>مقدم الطلب</TableHead>
                    <TableHead>الصورة</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{request.company_name}</TableCell>
                      <TableCell>
                        <a 
                          href={`https://t.me/${request.bot_username}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          @{request.bot_username}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </TableCell>
                      <TableCell>{request.requested_by_name || 'غير معروف'}</TableCell>
                      <TableCell>
                        {request.photo_url ? (
                          <a 
                            href={request.photo_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2"
                          >
                            <img 
                              src={request.photo_url} 
                              alt="Requested photo" 
                              className="w-10 h-10 rounded-full object-cover border"
                            />
                            <ExternalLink className="w-3 h-3 text-primary" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-sm">لا توجد صورة</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(request.created_at).toLocaleDateString('ar-EG', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </TableCell>
                      <TableCell>
                        {request.status === 'pending' ? (
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-success border-success/30 hover:bg-success/10"
                              onClick={() => openActionDialog(request, 'complete')}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={() => openActionDialog(request, 'reject')}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {request.admin_notes || '-'}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Action Dialog */}
        <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === 'complete' ? 'إكمال الطلب' : 'رفض الطلب'}
              </DialogTitle>
              <DialogDescription>
                {actionType === 'complete' 
                  ? 'تأكيد أنك قمت بتحديث صورة البوت عبر @BotFather'
                  : 'سبب رفض الطلب (اختياري)'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedRequest && (
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm"><strong>الشركة:</strong> {selectedRequest.company_name}</p>
                  <p className="text-sm"><strong>البوت:</strong> @{selectedRequest.bot_username}</p>
                  {selectedRequest.photo_url && (
                    <div className="mt-2">
                      <img 
                        src={selectedRequest.photo_url} 
                        alt="Requested photo" 
                        className="w-20 h-20 rounded-full object-cover border"
                      />
                    </div>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label>ملاحظات (اختياري)</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={actionType === 'complete' ? 'تم التحديث بنجاح...' : 'سبب الرفض...'}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
                إلغاء
              </Button>
              <Button 
                onClick={handleAction}
                disabled={isSubmitting}
                variant={actionType === 'complete' ? 'default' : 'destructive'}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 me-2 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  actionType === 'complete' ? 'تأكيد الإكمال' : 'رفض الطلب'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminPhotoRequests;
