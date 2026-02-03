import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Broadcast {
  id: string;
  created_at: string;
  created_by: string | null;
  message_text: string;
  image_url: string | null;
  audio_url: string | null;
  target_type: string;
  target_filter: { plans?: string[]; company_ids?: string[]; employee_ids?: string[] } | null;
  status: string;
  sent_at: string | null;
  total_recipients: number;
  successful_sends: number;
  failed_sends: number;
  notes: string | null;
}

interface BroadcastDelivery {
  id: string;
  broadcast_id: string;
  company_id: string;
  employee_id: string | null;
  telegram_chat_id: string | null;
  status: string;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
  company?: {
    name: string;
  };
}

interface CreateBroadcastInput {
  message_text: string;
  image_url?: string;
  audio_url?: string;
  target_type: 'all' | 'subscription' | 'custom' | 'all_employees' | 'company_employees' | 'specific_employees';
  target_filter?: { plans?: string[]; company_ids?: string[]; employee_ids?: string[] };
  notes?: string;
}

export const useBroadcasts = () => {
  const queryClient = useQueryClient();

  const { data: broadcasts, isLoading } = useQuery({
    queryKey: ['admin-broadcasts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_broadcasts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Broadcast[];
    },
  });

  const createBroadcast = useMutation({
    mutationFn: async (input: CreateBroadcastInput) => {
      const { data, error } = await supabase
        .from('admin_broadcasts')
        .insert({
          message_text: input.message_text,
          image_url: input.image_url || null,
          audio_url: input.audio_url || null,
          target_type: input.target_type,
          target_filter: input.target_filter || null,
          notes: input.notes || null,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;
      return data as Broadcast;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-broadcasts'] });
      toast.success('تم إنشاء الرسالة بنجاح');
    },
    onError: (error) => {
      console.error('Error creating broadcast:', error);
      toast.error('فشل في إنشاء الرسالة');
    },
  });

  const sendBroadcast = useMutation({
    mutationFn: async (broadcastId: string) => {
      const response = await supabase.functions.invoke('send-broadcast', {
        body: { broadcast_id: broadcastId },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-broadcasts'] });
      toast.success(`تم إرسال الرسالة إلى ${data.sent} شركة`);
    },
    onError: (error) => {
      console.error('Error sending broadcast:', error);
      toast.error('فشل في إرسال الرسالة');
    },
  });

  const deleteBroadcast = useMutation({
    mutationFn: async (broadcastId: string) => {
      const { error } = await supabase
        .from('admin_broadcasts')
        .delete()
        .eq('id', broadcastId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-broadcasts'] });
      toast.success('تم حذف الرسالة');
    },
    onError: (error) => {
      console.error('Error deleting broadcast:', error);
      toast.error('فشل في حذف الرسالة');
    },
  });

  return {
    broadcasts,
    isLoading,
    createBroadcast,
    sendBroadcast,
    deleteBroadcast,
  };
};

export const useBroadcastDeliveries = (broadcastId: string) => {
  return useQuery({
    queryKey: ['broadcast-deliveries', broadcastId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('broadcast_deliveries')
        .select(`
          *,
          company:companies(name)
        `)
        .eq('broadcast_id', broadcastId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as BroadcastDelivery[];
    },
    enabled: !!broadcastId,
  });
};

export const useUploadBroadcastMedia = () => {
  const [uploading, setUploading] = useState(false);

  const uploadImage = async (file: File): Promise<string> => {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('broadcast-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('broadcast-media')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } finally {
      setUploading(false);
    }
  };

  const uploadAudio = async (file: File): Promise<string> => {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `audio/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('broadcast-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('broadcast-media')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } finally {
      setUploading(false);
    }
  };

  return { uploadImage, uploadAudio, uploading };
};
