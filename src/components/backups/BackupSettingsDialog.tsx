import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, 
  Plus, 
  Trash2, 
  Key,
  Settings,
  Check,
  X
} from 'lucide-react';
import { 
  useBackupEmailRecipients, 
  useAddBackupEmailRecipient, 
  useUpdateBackupEmailRecipient, 
  useDeleteBackupEmailRecipient 
} from '@/hooks/useBackupEmailRecipients';
import { toast } from 'sonner';

interface BackupSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BackupSettingsDialog = ({ open, onOpenChange }: BackupSettingsDialogProps) => {
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editName, setEditName] = useState('');

  const { data: recipients, isLoading } = useBackupEmailRecipients();
  const addRecipient = useAddBackupEmailRecipient();
  const updateRecipient = useUpdateBackupEmailRecipient();
  const deleteRecipient = useDeleteBackupEmailRecipient();

  const handleAddRecipient = async () => {
    if (!newEmail.trim()) {
      toast.error('يرجى إدخال الإيميل');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast.error('صيغة الإيميل غير صحيحة');
      return;
    }

    await addRecipient.mutateAsync({ email: newEmail.trim(), name: newName.trim() || undefined });
    setNewEmail('');
    setNewName('');
  };

  const handleStartEdit = (recipient: { id: string; email: string; name: string | null }) => {
    setEditingId(recipient.id);
    setEditEmail(recipient.email);
    setEditName(recipient.name || '');
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editEmail)) {
      toast.error('صيغة الإيميل غير صحيحة');
      return;
    }

    await updateRecipient.mutateAsync({ 
      id: editingId, 
      email: editEmail.trim(), 
      name: editName.trim() || undefined 
    });
    setEditingId(null);
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    await updateRecipient.mutateAsync({ id, is_active: !currentStatus });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            إعدادات النسخ الاحتياطي
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            إدارة إعدادات API والإيميلات المستقبلة للنسخ الاحتياطية
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* API Key Info */}
          <div className="p-4 rounded-lg bg-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <Key className="w-5 h-5" />
              <h3 className="font-semibold">Resend API Key</h3>
            </div>
            <p className="text-sm text-slate-400">
              يتم تخزين API Key بشكل آمن في الـ secrets. لتعديله، يرجى التواصل مع مدير النظام.
            </p>
            <Badge className="bg-green-500/20 text-green-400">
              <Check className="w-3 h-3 ml-1" />
              تم التكوين
            </Badge>
          </div>

          {/* Email Recipients */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-400" />
              <h3 className="font-semibold">الإيميلات المستقبلة للنسخ الاحتياطية</h3>
            </div>

            {/* Add New Recipient */}
            <div className="p-4 rounded-lg bg-slate-800 space-y-3">
              <Label>إضافة إيميل جديد</Label>
              <div className="flex gap-2 flex-wrap">
                <Input
                  type="text"
                  placeholder="الاسم (اختياري)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="bg-slate-700 border-slate-600 flex-1 min-w-[150px]"
                />
                <Input
                  type="email"
                  placeholder="البريد الإلكتروني"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="bg-slate-700 border-slate-600 flex-1 min-w-[200px]"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddRecipient()}
                />
                <Button
                  onClick={handleAddRecipient}
                  disabled={addRecipient.isPending || !newEmail.trim()}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4 ml-1" />
                  إضافة
                </Button>
              </div>
            </div>

            {/* Recipients List */}
            <div className="space-y-2">
              {isLoading ? (
                <div className="text-center py-4 text-slate-400">جاري التحميل...</div>
              ) : recipients?.length === 0 ? (
                <div className="text-center py-4 text-slate-400">
                  <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>لم يتم إضافة أي إيميلات بعد</p>
                  <p className="text-sm">سيتم استخدام الإيميل الافتراضي (SUPER_ADMIN_EMAIL)</p>
                </div>
              ) : (
                recipients?.map((recipient) => (
                  <div 
                    key={recipient.id} 
                    className={`p-3 rounded-lg flex items-center justify-between gap-3 ${
                      recipient.is_active ? 'bg-slate-800' : 'bg-slate-800/50 opacity-60'
                    }`}
                  >
                    {editingId === recipient.id ? (
                      <div className="flex-1 flex gap-2 flex-wrap">
                        <Input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="الاسم"
                          className="bg-slate-700 border-slate-600 flex-1 min-w-[120px]"
                        />
                        <Input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="bg-slate-700 border-slate-600 flex-1 min-w-[180px]"
                        />
                        <div className="flex gap-1">
                          <Button size="sm" onClick={handleSaveEdit} className="bg-green-600 hover:bg-green-700">
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0" onClick={() => handleStartEdit(recipient)} role="button" tabIndex={0}>
                          <p className="font-medium truncate cursor-pointer hover:text-primary transition-colors">
                            {recipient.name || recipient.email}
                          </p>
                          {recipient.name && (
                            <p className="text-sm text-slate-400 truncate">{recipient.email}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <Switch
                            checked={recipient.is_active}
                            onCheckedChange={() => handleToggleActive(recipient.id, recipient.is_active)}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteRecipient.mutateAsync(recipient.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BackupSettingsDialog;
