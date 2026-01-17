import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTelegramMessages, EmployeeWithLastMessage } from '@/hooks/useTelegramMessages';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { MessageCircle, ArrowLeft, ArrowRight, Bot, User } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface ChatViewProps {
  employee: EmployeeWithLastMessage | null;
  onBack?: () => void;
}

export const ChatView = ({ employee, onBack }: ChatViewProps) => {
  const { data: messages, isLoading } = useTelegramMessages(employee?.id);
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const scrollRef = useRef<HTMLDivElement>(null);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Auto scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Group messages by date
  const groupMessagesByDate = () => {
    if (!messages) return {};
    
    const groups: Record<string, typeof messages> = {};
    messages.forEach((msg) => {
      const date = format(new Date(msg.created_at), 'yyyy-MM-dd');
      if (!groups[date]) groups[date] = [];
      groups[date].push(msg);
    });
    return groups;
  };

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return isRTL ? 'اليوم' : 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return isRTL ? 'أمس' : 'Yesterday';
    }
    return format(date, 'dd MMMM yyyy', { locale: isRTL ? ar : undefined });
  };

  if (!employee) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30">
        <div className="text-center text-muted-foreground">
          <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">
            {isRTL ? 'اختر محادثة للعرض' : 'Select a chat to view'}
          </p>
        </div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate();

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0e1621]">
      {/* Chat Header */}
      <div className="p-3 border-b bg-[#17212b] flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 hover:bg-accent/50 rounded-full md:hidden"
          >
            {isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
          </button>
        )}
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary/20 text-primary">
            {getInitials(employee.full_name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-semibold text-foreground">{employee.full_name}</h3>
          <p className="text-xs text-muted-foreground">
            {employee.department || (isRTL ? 'موظف' : 'Employee')}
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4" style={{ 
        backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.05"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
      }}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            {isRTL ? 'جاري تحميل الرسائل...' : 'Loading messages...'}
          </div>
        ) : Object.keys(messageGroups).length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{isRTL ? 'لا توجد رسائل بعد' : 'No messages yet'}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(messageGroups).map(([date, msgs]) => (
              <div key={date}>
                {/* Date Header */}
                <div className="flex justify-center mb-4">
                  <span className="px-3 py-1 bg-[#182533] text-muted-foreground text-xs rounded-full">
                    {formatDateHeader(date)}
                  </span>
                </div>

                {/* Messages */}
                <div className="space-y-2">
                  {msgs.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        'flex gap-2',
                        message.direction === 'outgoing' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      {message.direction === 'incoming' && (
                        <div className="shrink-0 mt-auto">
                          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                        </div>
                      )}
                      
                      <div
                        className={cn(
                          'max-w-[75%] rounded-2xl px-4 py-2 shadow-sm',
                          message.direction === 'outgoing'
                            ? 'bg-[#2b5278] text-white rounded-br-sm'
                            : 'bg-[#182533] text-foreground rounded-bl-sm'
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                          {message.message_text}
                        </p>
                        <div className={cn(
                          'flex items-center gap-1 mt-1',
                          message.direction === 'outgoing' ? 'justify-end' : 'justify-start'
                        )}>
                          <span className="text-[10px] opacity-70">
                            {format(new Date(message.created_at), 'HH:mm')}
                          </span>
                          {message.direction === 'outgoing' && (
                            <span className="text-[10px] opacity-70">✓✓</span>
                          )}
                        </div>
                      </div>

                      {message.direction === 'outgoing' && (
                        <div className="shrink-0 mt-auto">
                          <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
                            <Bot className="h-4 w-4 text-green-500" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer Info */}
      <div className="p-3 border-t bg-[#17212b] text-center">
        <p className="text-xs text-muted-foreground">
          {isRTL 
            ? '🤖 هذه المحادثات مسجلة تلقائياً من بوت التيليجرام'
            : '🤖 These conversations are automatically logged from the Telegram bot'}
        </p>
      </div>
    </div>
  );
};
