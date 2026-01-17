import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEmployeesWithMessages, EmployeeWithLastMessage } from '@/hooks/useTelegramMessages';
import { Search, MessageCircle } from 'lucide-react';
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

  const truncateMessage = (text: string, maxLength = 40) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  return (
    <div className="flex flex-col h-full bg-background border-e">
      {/* Header */}
      <div className="p-4 border-b bg-card">
        <h2 className="text-lg font-semibold mb-3">
          {isRTL ? 'المحادثات' : 'Chats'}
        </h2>
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={isRTL ? 'بحث...' : 'Search...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-9"
          />
        </div>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground">
            {isRTL ? 'جاري التحميل...' : 'Loading...'}
          </div>
        ) : filteredEmployees?.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>{isRTL ? 'لا توجد محادثات' : 'No chats yet'}</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredEmployees?.map((employee) => (
              <button
                key={employee.id}
                onClick={() => onSelectEmployee(employee)}
                className={cn(
                  'w-full p-3 flex items-center gap-3 hover:bg-accent/50 transition-colors text-start',
                  selectedEmployeeId === employee.id && 'bg-accent'
                )}
              >
                <Avatar className="h-12 w-12 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {getInitials(employee.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{employee.full_name}</span>
                    {employee.last_message && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatMessageTime(employee.last_message.created_at)}
                      </span>
                    )}
                  </div>
                  {employee.last_message ? (
                    <p className="text-sm text-muted-foreground truncate">
                      {employee.last_message.direction === 'outgoing' && (
                        <span className="text-primary">✓ </span>
                      )}
                      {truncateMessage(employee.last_message.message_text)}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      {isRTL ? 'لا توجد رسائل' : 'No messages'}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
