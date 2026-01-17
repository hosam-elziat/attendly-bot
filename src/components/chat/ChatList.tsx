import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEmployeesWithMessages, EmployeeWithLastMessage } from '@/hooks/useTelegramMessages';
import { Search, MessageCircle, Send } from 'lucide-react';
import { useState } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface ChatListProps {
  selectedEmployeeId?: string;
  onSelectEmployee: (employee: EmployeeWithLastMessage) => void;
}

export const ChatList = ({ selectedEmployeeId, onSelectEmployee }: ChatListProps) => {
  const { data: employees, isLoading } = useEmployeesWithMessages();
  const [searchQuery, setSearchQuery] = useState('');
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const filteredEmployees = employees?.filter((emp) =>
    emp.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    }
    if (isYesterday(date)) {
      return isRTL ? 'أمس' : 'Yesterday';
    }
    return format(date, 'dd/MM', { locale: isRTL ? ar : undefined });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const truncateMessage = (text: string, maxLength = 35) => {
    // Remove HTML tags
    const cleanText = text.replace(/<[^>]*>/g, '');
    if (cleanText.length <= maxLength) return cleanText;
    return cleanText.slice(0, maxLength) + '...';
  };

  // Generate consistent color from name
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-[#7289da]', 'bg-[#3ba55c]', 'bg-[#faa61a]', 
      'bg-[#f47b67]', 'bg-[#5865f2]', 'bg-[#eb459e]',
      'bg-[#0088cc]', 'bg-[#00a884]'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="flex flex-col h-full bg-[#17212b]">
      {/* Header - Telegram style */}
      <div className="p-4 bg-[#17212b] border-b border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#0088cc] flex items-center justify-center">
            <Send className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              {isRTL ? 'المحادثات' : 'Chats'}
            </h2>
            <p className="text-xs text-white/50">
              {filteredEmployees?.length || 0} {isRTL ? 'موظف' : 'employees'}
            </p>
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            placeholder={isRTL ? 'بحث...' : 'Search...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-9 bg-[#242f3d] border-0 text-white placeholder:text-white/40 focus-visible:ring-1 focus-visible:ring-[#0088cc]"
          />
        </div>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 text-center text-white/60">
            <div className="w-6 h-6 border-2 border-[#0088cc] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            {isRTL ? 'جاري التحميل...' : 'Loading...'}
          </div>
        ) : filteredEmployees?.length === 0 ? (
          <div className="p-8 text-center text-white/60">
            <div className="w-16 h-16 rounded-full bg-[#242f3d] flex items-center justify-center mx-auto mb-3">
              <MessageCircle className="h-8 w-8 opacity-50" />
            </div>
            <p className="font-medium">{isRTL ? 'لا توجد محادثات' : 'No chats yet'}</p>
            <p className="text-sm text-white/40 mt-1">
              {isRTL ? 'ستظهر المحادثات عند تفاعل الموظفين مع البوت' : 'Chats will appear when employees use the bot'}
            </p>
          </div>
        ) : (
          <div>
            {filteredEmployees?.map((employee) => (
              <button
                key={employee.id}
                onClick={() => onSelectEmployee(employee)}
                className={cn(
                  'w-full p-3 flex items-center gap-3 hover:bg-[#202b36] transition-colors text-start border-b border-white/5',
                  selectedEmployeeId === employee.id && 'bg-[#2b5278]'
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
                  getAvatarColor(employee.full_name)
                )}>
                  <span className="text-white font-medium">
                    {getInitials(employee.full_name)}
                  </span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-white truncate">
                      {employee.full_name}
                    </span>
                    {employee.last_message && (
                      <span className="text-xs text-white/40 shrink-0">
                        {formatMessageTime(employee.last_message.created_at)}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {employee.last_message ? (
                      <>
                        {employee.last_message.direction === 'outgoing' && (
                          <span className="text-[#4fc3f7] text-xs">✓✓ </span>
                        )}
                        <p className="text-sm text-white/50 truncate">
                          {truncateMessage(employee.last_message.message_text)}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-white/30 italic">
                        {isRTL ? 'لا توجد رسائل' : 'No messages'}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
