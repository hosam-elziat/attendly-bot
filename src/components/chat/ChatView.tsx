import { ScrollArea } from '@/components/ui/scroll-area';
import { useTelegramMessages, EmployeeWithLastMessage, TelegramMessage } from '@/hooks/useTelegramMessages';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { MessageCircle, ArrowLeft, ArrowRight, Send, CheckCheck } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface ChatViewProps {
  employee: EmployeeWithLastMessage | null;
  onBack?: () => void;
}

// Telegram-style inline button
const TelegramInlineButton = ({ text }: { text: string }) => (
  <div className="bg-[#3390ec]/20 hover:bg-[#3390ec]/30 transition-colors rounded-lg py-2 px-3 text-[13px] text-[#3390ec] font-medium text-center cursor-default border border-[#3390ec]/30">
    {text}
  </div>
);

// Parse keyboard from metadata
const parseKeyboard = (message: TelegramMessage): any[][] | null => {
  const metadata = message.metadata as any;
  if (metadata?.keyboard?.inline_keyboard) {
    return metadata.keyboard.inline_keyboard;
  }
  return null;
};

// Message bubble component
const MessageBubble = ({ message, isRTL }: { message: TelegramMessage; isRTL: boolean }) => {
  const isOutgoing = message.direction === 'outgoing';
  const keyboard = parseKeyboard(message);
  
  // Clean message text (remove HTML tags for display)
  const cleanText = message.message_text;

  return (
    <div className={cn(
      'flex flex-col gap-1 max-w-[85%]',
      isOutgoing ? 'ms-auto items-end' : 'items-start'
    )}>
      {/* Message Bubble */}
      <div className={cn(
        "rounded-2xl px-3 py-2 shadow-sm",
        isOutgoing
          ? "bg-[#effdde] dark:bg-[#2b5278] rounded-tr-sm"
          : "bg-white dark:bg-[#182533] rounded-tl-sm"
      )}>
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
          {cleanText}
        </p>
        
        {/* Time and read status */}
        <div className={cn(
          'flex items-center gap-1 mt-1',
          isOutgoing ? 'justify-end' : 'justify-start'
        )}>
          <span className="text-[10px] text-muted-foreground/70">
            {format(new Date(message.created_at), 'HH:mm')}
          </span>
          {isOutgoing && (
            <CheckCheck className="w-3.5 h-3.5 text-[#4fc3f7]" />
          )}
        </div>
      </div>
      
      {/* Inline Keyboard Buttons */}
      {keyboard && keyboard.length > 0 && (
        <div className={cn(
          "w-full space-y-1 mt-1",
          isOutgoing ? "pe-0" : "ps-0"
        )} style={{ maxWidth: '100%' }}>
          {keyboard.map((row: any[], rowIndex: number) => (
            <div key={rowIndex} className="flex gap-1">
              {row.map((btn: any, btnIndex: number) => (
                <div key={btnIndex} className="flex-1 min-w-0">
                  <TelegramInlineButton text={btn.text} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

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
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
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
      <div className="flex-1 flex items-center justify-center bg-[#0e1621]">
        <div className="text-center text-white/60">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-[#1a1a2e] flex items-center justify-center">
            <MessageCircle className="h-12 w-12 opacity-50" />
          </div>
          <p className="text-lg font-medium">
            {isRTL ? 'اختر محادثة للعرض' : 'Select a chat to view'}
          </p>
          <p className="text-sm text-white/40 mt-1">
            {isRTL ? 'اختر موظف من القائمة لعرض المحادثة' : 'Choose an employee from the list'}
          </p>
        </div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate();

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Telegram-style Chat Header */}
      <div className="px-4 py-3 bg-[#17212b] border-b border-white/10 flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-full md:hidden transition-colors"
          >
            {isRTL ? <ArrowRight className="h-5 w-5 text-white" /> : <ArrowLeft className="h-5 w-5 text-white" />}
          </button>
        )}
        
        <div className="w-10 h-10 rounded-full bg-[#0088cc] flex items-center justify-center">
          <span className="text-white font-medium text-sm">
            {getInitials(employee.full_name)}
          </span>
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold text-white">{employee.full_name}</h3>
          <p className="text-xs text-white/60">
            {employee.department || (isRTL ? 'موظف' : 'Employee')}
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        className="flex-1 overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #0e1621 0%, #17212b 100%)'
        }}
      >
        <ScrollArea ref={scrollRef} className="h-full">
          <div className="p-4 min-h-full">
            {isLoading ? (
              <div className="flex items-center justify-center h-64 text-white/60">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-[#0088cc] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  {isRTL ? 'جاري تحميل الرسائل...' : 'Loading messages...'}
                </div>
              </div>
            ) : Object.keys(messageGroups).length === 0 ? (
              <div className="flex items-center justify-center h-64 text-white/60">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-[#1a1a2e] flex items-center justify-center mx-auto mb-3">
                    <MessageCircle className="h-8 w-8 opacity-50" />
                  </div>
                  <p className="font-medium">{isRTL ? 'لا توجد رسائل بعد' : 'No messages yet'}</p>
                  <p className="text-sm mt-1 text-white/40">
                    {isRTL ? 'ستظهر الرسائل هنا عند التفاعل مع البوت' : 'Messages will appear here'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(messageGroups).map(([date, msgs]) => (
                  <div key={date}>
                    {/* Date Header */}
                    <div className="flex justify-center mb-4">
                      <span className="px-3 py-1 bg-[#182533]/80 text-white/70 text-xs rounded-full font-medium shadow-sm">
                        {formatDateHeader(date)}
                      </span>
                    </div>

                    {/* Messages */}
                    <div className="space-y-3">
                      {msgs.map((message) => (
                        <MessageBubble 
                          key={message.id} 
                          message={message} 
                          isRTL={isRTL}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-[#17212b] border-t border-white/10">
        <div className="flex items-center justify-center gap-2 text-white/50 text-xs">
          <Send className="w-3 h-3" />
          <span>
            {isRTL 
              ? 'هذه المحادثات مسجلة تلقائياً من بوت التيليجرام'
              : 'These conversations are logged from the Telegram bot'}
          </span>
        </div>
      </div>
    </div>
  );
};
