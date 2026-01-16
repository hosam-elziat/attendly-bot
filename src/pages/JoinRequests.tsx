import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  UserPlus, 
  CheckCircle, 
  XCircle, 
  Clock, 
  MessageCircle,
  Phone,
  Mail,
  User,
  Eye,
  Settings
} from 'lucide-react';
import { useJoinRequests, useApproveJoinRequest, useRejectJoinRequest, useCheckDeletedEmployee, useRestoreDeletedEmployee, JoinRequest } from '@/hooks/useJoinRequests';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import JoinRequestReviewersSettings from '@/components/join-requests/JoinRequestReviewersSettings';
import { useJoinRequestReviewers } from '@/hooks/useJoinRequestReviewers';
import { RotateCcw, AlertTriangle } from 'lucide-react';

const JoinRequests = () => {
  const { language } = useLanguage();
  const { data: requests = [], isLoading } = useJoinRequests();
  const { data: reviewers = [] } = useJoinRequestReviewers();
  const approveRequest = useApproveJoinRequest();
  const rejectRequest = useRejectJoinRequest();
  const checkDeletedEmployee = useCheckDeletedEmployee();
  const restoreEmployee = useRestoreDeletedEmployee();
  
  const [selectedRequest, setSelectedRequest] = useState<JoinRequest | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [deletedEmployeeData, setDeletedEmployeeData] = useState<any>(null);
  const [deletedEmployeesMap, setDeletedEmployeesMap] = useState<Record<string, any>>({});
  const [rejectionReason, setRejectionReason] = useState('');
  const [employeeData, setEmployeeData] = useState({
    department: '',
    base_salary: 0,
  });

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  // Check deleted employees for all pending requests
  useEffect(() => {
    const checkAllDeletedEmployees = async () => {
      if (pendingRequests.length === 0) return;
      
      const newMap: Record<string, any> = {};
      
      for (const request of pendingRequests) {
        try {
          const result = await checkDeletedEmployee.mutateAsync(request.telegram_chat_id);
          if (result) {
            newMap[request.id] = result;
          }
        } catch (error) {
          // Ignore errors
        }
      }
      
      setDeletedEmployeesMap(newMap);
    };
    
    checkAllDeletedEmployees();
  }, [requests]);
  
  // Check if a request has a deleted employee record
  const hasDeletedEmployee = (requestId: string) => {
    return !!deletedEmployeesMap[requestId];
  };
  
  const getDeletedEmployeeData = (requestId: string) => {
    return deletedEmployeesMap[requestId];
  };

  // Check for deleted employee when clicking approve
  const handleCheckAndApprove = async (request: JoinRequest) => {
    setSelectedRequest(request);
    
    // Check if we already have deleted employee data cached
    const cachedDeletedEmployee = deletedEmployeesMap[request.id];
    if (cachedDeletedEmployee) {
      setDeletedEmployeeData(cachedDeletedEmployee);
      setShowRestoreDialog(true);
      return;
    }
    
    // Double-check by making a fresh request
    checkDeletedEmployee.mutate(request.telegram_chat_id, {
      onSuccess: (deletedRecord) => {
        if (deletedRecord) {
          // Found deleted employee - show restore dialog
          setDeletedEmployeeData(deletedRecord);
          setShowRestoreDialog(true);
        } else {
          // No deleted employee - proceed with normal approval
          setShowApproveDialog(true);
        }
      },
      onError: () => {
        // If check fails, proceed with normal approval
        setShowApproveDialog(true);
      }
    });
  };

  const handleRestore = () => {
    if (!selectedRequest || !deletedEmployeeData) return;
    
    restoreEmployee.mutate({
      deletedRecordId: deletedEmployeeData.id,
      joinRequestId: selectedRequest.id,
      telegram_chat_id: selectedRequest.telegram_chat_id,
    }, {
      onSuccess: () => {
        setShowRestoreDialog(false);
        setSelectedRequest(null);
        setDeletedEmployeeData(null);
      }
    });
  };

  const handleApprove = () => {
    if (!selectedRequest) return;
    
    approveRequest.mutate({
      requestId: selectedRequest.id,
      employeeData: {
        full_name: selectedRequest.full_name,
        email: selectedRequest.email || `${selectedRequest.telegram_chat_id}@telegram.user`,
        phone: selectedRequest.phone || undefined,
        telegram_chat_id: selectedRequest.telegram_chat_id,
        national_id: selectedRequest.national_id || undefined,
        department: employeeData.department || undefined,
        base_salary: employeeData.base_salary || 0,
        work_start_time: selectedRequest.work_start_time,
        work_end_time: selectedRequest.work_end_time,
        weekend_days: selectedRequest.weekend_days,
      },
    }, {
      onSuccess: () => {
        setShowApproveDialog(false);
        setSelectedRequest(null);
        setEmployeeData({ department: '', base_salary: 0 });
      }
    });
  };

  const handleReject = () => {
    if (!selectedRequest) return;
    
    rejectRequest.mutate({
      requestId: selectedRequest.id,
      reason: rejectionReason,
      telegram_chat_id: selectedRequest.telegram_chat_id,
    }, {
      onSuccess: () => {
        setShowRejectDialog(false);
        setSelectedRequest(null);
        setRejectionReason('');
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />{language === 'ar' ? 'قيد الانتظار' : 'Pending'}</Badge>;
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />{language === 'ar' ? 'مقبول' : 'Approved'}</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />{language === 'ar' ? 'مرفوض' : 'Rejected'}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'PPp', { locale: language === 'ar' ? ar : enUS });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {language === 'ar' ? 'طلبات الانضمام' : 'Join Requests'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'إدارة طلبات انضمام الموظفين من تليجرام' : 'Manage employee join requests from Telegram'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettingsDialog(true)}
              className="flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              {language === 'ar' ? 'إعدادات المراجعين' : 'Reviewers Settings'}
              {reviewers.length > 0 && (
                <Badge variant="secondary" className="ms-1">
                  {reviewers.length}
                </Badge>
              )}
            </Button>
            <Badge variant="outline" className="text-lg px-4 py-2">
              <Clock className="w-4 h-4 mr-2" />
              {pendingRequests.length} {language === 'ar' ? 'طلب معلق' : 'pending'}
            </Badge>
          </div>
        </div>

        {/* Pending Requests */}
        <Card data-tour="join-requests">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              {language === 'ar' ? 'الطلبات المعلقة' : 'Pending Requests'}
            </CardTitle>
            <CardDescription>
              {language === 'ar' ? 'طلبات تحتاج للموافقة أو الرفض' : 'Requests awaiting your approval'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{language === 'ar' ? 'لا توجد طلبات معلقة' : 'No pending requests'}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'ar' ? 'الاسم' : 'Name'}</TableHead>
                    <TableHead>{language === 'ar' ? 'تليجرام' : 'Telegram'}</TableHead>
                    <TableHead>{language === 'ar' ? 'البريد/الهاتف' : 'Email/Phone'}</TableHead>
                    <TableHead>{language === 'ar' ? 'تاريخ الطلب' : 'Request Date'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.map((request) => (
                    <TableRow key={request.id} className={hasDeletedEmployee(request.id) ? 'bg-amber-500/10' : ''}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {request.full_name}
                          {hasDeletedEmployee(request.id) && (
                            <Badge variant="outline" className="bg-amber-500/20 text-amber-600 border-amber-500/30">
                              <RotateCcw className="w-3 h-3 mr-1" />
                              {language === 'ar' ? 'موظف سابق' : 'Previous Employee'}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {request.telegram_username ? `@${request.telegram_username}` : request.telegram_chat_id}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {request.email && <span className="flex items-center gap-1 text-sm"><Mail className="w-3 h-3" />{request.email}</span>}
                          {request.phone && <span className="flex items-center gap-1 text-sm"><Phone className="w-3 h-3" />{request.phone}</span>}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(request.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowViewDialog(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleCheckAndApprove(request)}
                            disabled={checkDeletedEmployee.isPending}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            {language === 'ar' ? 'قبول' : 'Approve'}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowRejectDialog(true);
                            }}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            {language === 'ar' ? 'رفض' : 'Reject'}
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

        {/* Processed Requests */}
        {processedRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'الطلبات السابقة' : 'Previous Requests'}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'ar' ? 'الاسم' : 'Name'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                    <TableHead>{language === 'ar' ? 'تاريخ المراجعة' : 'Review Date'}</TableHead>
                    <TableHead>{language === 'ar' ? 'السبب' : 'Reason'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedRequests.slice(0, 10).map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{request.full_name}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>{request.reviewed_at ? formatDate(request.reviewed_at) : '-'}</TableCell>
                      <TableCell>{request.rejection_reason || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* View Details Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === 'ar' ? 'تفاصيل الطلب' : 'Request Details'}</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">{language === 'ar' ? 'الاسم الكامل' : 'Full Name'}</Label>
                  <p className="font-medium flex items-center gap-2"><User className="w-4 h-4" />{selectedRequest.full_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{language === 'ar' ? 'تليجرام' : 'Telegram'}</Label>
                  <p className="font-medium flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    {selectedRequest.telegram_username ? `@${selectedRequest.telegram_username}` : selectedRequest.telegram_chat_id}
                  </p>
                </div>
                {selectedRequest.email && (
                  <div>
                    <Label className="text-muted-foreground">{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</Label>
                    <p className="font-medium flex items-center gap-2"><Mail className="w-4 h-4" />{selectedRequest.email}</p>
                  </div>
                )}
                {selectedRequest.phone && (
                  <div>
                    <Label className="text-muted-foreground">{language === 'ar' ? 'رقم الهاتف' : 'Phone'}</Label>
                    <p className="font-medium flex items-center gap-2"><Phone className="w-4 h-4" />{selectedRequest.phone}</p>
                  </div>
                )}
                {selectedRequest.national_id && (
                  <div>
                    <Label className="text-muted-foreground">{language === 'ar' ? 'رقم الهوية' : 'National ID'}</Label>
                    <p className="font-medium">{selectedRequest.national_id}</p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground">{language === 'ar' ? 'تاريخ الطلب' : 'Request Date'}</Label>
                  <p className="font-medium">{formatDate(selectedRequest.created_at)}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === 'ar' ? 'قبول الطلب' : 'Approve Request'}</DialogTitle>
            <DialogDescription>
              {language === 'ar' 
                ? `سيتم إضافة ${selectedRequest?.full_name} كموظف جديد` 
                : `${selectedRequest?.full_name} will be added as a new employee`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{language === 'ar' ? 'القسم (اختياري)' : 'Department (optional)'}</Label>
              <Input
                value={employeeData.department}
                onChange={(e) => setEmployeeData({ ...employeeData, department: e.target.value })}
                placeholder={language === 'ar' ? 'مثال: المبيعات' : 'e.g. Sales'}
              />
            </div>
            <div>
              <Label>{language === 'ar' ? 'الراتب الأساسي' : 'Base Salary'}</Label>
              <Input
                type="number"
                value={employeeData.base_salary}
                onChange={(e) => setEmployeeData({ ...employeeData, base_salary: Number(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={handleApprove}
              disabled={approveRequest.isPending}
            >
              {approveRequest.isPending 
                ? (language === 'ar' ? 'جاري القبول...' : 'Approving...') 
                : (language === 'ar' ? 'قبول وإضافة الموظف' : 'Approve & Add Employee')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === 'ar' ? 'رفض الطلب' : 'Reject Request'}</DialogTitle>
            <DialogDescription>
              {language === 'ar' 
                ? `هل أنت متأكد من رفض طلب ${selectedRequest?.full_name}؟` 
                : `Are you sure you want to reject ${selectedRequest?.full_name}'s request?`}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>{language === 'ar' ? 'سبب الرفض (اختياري)' : 'Rejection Reason (optional)'}</Label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder={language === 'ar' ? 'أدخل سبب الرفض...' : 'Enter rejection reason...'}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button 
              variant="destructive"
              onClick={handleReject}
              disabled={rejectRequest.isPending}
            >
              {rejectRequest.isPending 
                ? (language === 'ar' ? 'جاري الرفض...' : 'Rejecting...') 
                : (language === 'ar' ? 'رفض الطلب' : 'Reject Request')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reviewers Settings Dialog */}
      <JoinRequestReviewersSettings 
        open={showSettingsDialog} 
        onOpenChange={setShowSettingsDialog} 
      />

      {/* Restore Deleted Employee Dialog */}
      <Dialog open={showRestoreDialog} onOpenChange={(open) => {
        setShowRestoreDialog(open);
        if (!open) {
          setDeletedEmployeeData(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              {language === 'ar' ? 'موظف محذوف مسبقاً' : 'Previously Deleted Employee'}
            </DialogTitle>
            <DialogDescription>
              {language === 'ar' 
                ? 'تم العثور على سجل موظف محذوف بنفس معرف تليجرام. يمكنك استعادة بياناته السابقة أو إنشاء موظف جديد.' 
                : 'A deleted employee record with the same Telegram ID was found. You can restore their previous data or create a new employee.'}
            </DialogDescription>
          </DialogHeader>
          {deletedEmployeeData && (
            <div className="space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 space-y-2">
                <p className="font-medium flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" />
                  {language === 'ar' ? 'بيانات الموظف السابق:' : 'Previous Employee Data:'}
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">{language === 'ar' ? 'الاسم:' : 'Name:'}</span>
                    <span className="ms-1 font-medium">{(deletedEmployeeData.record_data as any)?.full_name}</span>
                  </div>
                  {(deletedEmployeeData.record_data as any)?.department && (
                    <div>
                      <span className="text-muted-foreground">{language === 'ar' ? 'القسم:' : 'Department:'}</span>
                      <span className="ms-1 font-medium">{(deletedEmployeeData.record_data as any)?.department}</span>
                    </div>
                  )}
                  {(deletedEmployeeData.record_data as any)?.base_salary && (
                    <div>
                      <span className="text-muted-foreground">{language === 'ar' ? 'الراتب:' : 'Salary:'}</span>
                      <span className="ms-1 font-medium">{(deletedEmployeeData.record_data as any)?.base_salary}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">{language === 'ar' ? 'تاريخ الحذف:' : 'Deleted:'}</span>
                    <span className="ms-1 font-medium">{formatDate(deletedEmployeeData.deleted_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowRestoreDialog(false);
                setShowApproveDialog(true);
              }}
            >
              {language === 'ar' ? 'إنشاء موظف جديد' : 'Create New Employee'}
            </Button>
            <Button 
              className="bg-amber-600 hover:bg-amber-700"
              onClick={handleRestore}
              disabled={restoreEmployee.isPending}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              {restoreEmployee.isPending 
                ? (language === 'ar' ? 'جاري الاستعادة...' : 'Restoring...') 
                : (language === 'ar' ? 'استعادة الموظف السابق' : 'Restore Previous Employee')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default JoinRequests;
