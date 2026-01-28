import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Gift, Loader2, Check, X, Clock, CheckCircle2, XCircle, Package } from 'lucide-react';
import { useMarketplaceOrders, useReviewOrder, useConsumeOrder, type MarketplaceOrder } from '@/hooks/useMarketplace';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const MarketplaceOrdersTab = () => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  
  const [statusFilter, setStatusFilter] = useState('pending');
  const { data: orders, isLoading } = useMarketplaceOrders(statusFilter === 'all' ? undefined : statusFilter);
  const reviewOrder = useReviewOrder();
  const consumeOrder = useConsumeOrder();
  
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<MarketplaceOrder | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApprove = async (order: MarketplaceOrder) => {
    await reviewOrder.mutateAsync({
      orderId: order.id,
      status: 'approved',
    });
  };

  const handleReject = (order: MarketplaceOrder) => {
    setSelectedOrder(order);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const confirmReject = async () => {
    if (!selectedOrder) return;
    
    await reviewOrder.mutateAsync({
      orderId: selectedOrder.id,
      status: 'rejected',
      rejectionReason,
    });
    
    setRejectDialogOpen(false);
    setSelectedOrder(null);
  };

  const handleConsume = async (order: MarketplaceOrder) => {
    await consumeOrder.mutateAsync(order.id);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="w-3 h-3" />
            {isArabic ? 'معلق' : 'Pending'}
          </Badge>
        );
      case 'approved':
        return (
          <Badge className="gap-1 bg-green-500">
            <CheckCircle2 className="w-3 h-3" />
            {isArabic ? 'موافق عليه' : 'Approved'}
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="w-3 h-3" />
            {isArabic ? 'مرفوض' : 'Rejected'}
          </Badge>
        );
      case 'consumed':
        return (
          <Badge variant="outline" className="gap-1">
            <Package className="w-3 h-3" />
            {isArabic ? 'مستهلك' : 'Consumed'}
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            {isArabic ? 'طلبات الشراء' : 'Purchase Orders'}
          </CardTitle>
          <CardDescription>
            {isArabic 
              ? 'مراجعة وإدارة طلبات شراء العناصر' 
              : 'Review and manage item purchase orders'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="space-y-4">
            <TabsList>
              <TabsTrigger value="pending" className="gap-2">
                <Clock className="w-4 h-4" />
                {isArabic ? 'معلق' : 'Pending'}
              </TabsTrigger>
              <TabsTrigger value="approved" className="gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {isArabic ? 'موافق' : 'Approved'}
              </TabsTrigger>
              <TabsTrigger value="rejected" className="gap-2">
                <XCircle className="w-4 h-4" />
                {isArabic ? 'مرفوض' : 'Rejected'}
              </TabsTrigger>
              <TabsTrigger value="all" className="gap-2">
                {isArabic ? 'الكل' : 'All'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value={statusFilter}>
              {orders && orders.length > 0 ? (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium truncate">
                              {order.employee?.full_name || 'Unknown'}
                            </p>
                            {getStatusBadge(order.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {isArabic 
                              ? order.item?.name_ar || order.item?.name 
                              : order.item?.name}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>
                              {order.points_spent.toLocaleString()} ⭐
                            </span>
                            <span>
                              {format(new Date(order.created_at), 'PPp', { 
                                locale: isArabic ? ar : undefined 
                              })}
                            </span>
                          </div>
                          {order.rejection_reason && (
                            <p className="text-sm text-destructive mt-2">
                              {isArabic ? 'سبب الرفض' : 'Reason'}: {order.rejection_reason}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {order.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApprove(order)}
                                disabled={reviewOrder.isPending}
                                className="gap-1"
                              >
                                <Check className="w-4 h-4" />
                                {isArabic ? 'موافقة' : 'Approve'}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleReject(order)}
                                disabled={reviewOrder.isPending}
                                className="gap-1"
                              >
                                <X className="w-4 h-4" />
                                {isArabic ? 'رفض' : 'Reject'}
                              </Button>
                            </>
                          )}
                          {order.status === 'approved' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleConsume(order)}
                              disabled={consumeOrder.isPending}
                              className="gap-1"
                            >
                              <Package className="w-4 h-4" />
                              {isArabic ? 'تم الاستخدام' : 'Mark Used'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{isArabic ? 'لا توجد طلبات' : 'No orders found'}</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isArabic ? 'رفض الطلب' : 'Reject Order'}
            </DialogTitle>
            <DialogDescription>
              {isArabic 
                ? 'سيتم استرجاع النقاط للموظف تلقائياً' 
                : 'Points will be automatically refunded to the employee'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{isArabic ? 'سبب الرفض' : 'Rejection Reason'}</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={isArabic ? 'اكتب سبب الرفض...' : 'Enter rejection reason...'}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              {isArabic ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmReject} 
              disabled={reviewOrder.isPending}
            >
              {reviewOrder.isPending && <Loader2 className="w-4 h-4 animate-spin me-2" />}
              {isArabic ? 'تأكيد الرفض' : 'Confirm Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MarketplaceOrdersTab;
