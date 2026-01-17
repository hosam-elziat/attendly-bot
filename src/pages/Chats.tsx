import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ChatList } from '@/components/chat/ChatList';
import { ChatView } from '@/components/chat/ChatView';
import { EmployeeWithLastMessage } from '@/hooks/useTelegramMessages';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const Chats = () => {
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithLastMessage | null>(null);
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-4rem)] flex overflow-hidden rounded-lg border bg-card shadow-sm">
        {/* Chat List - Hidden on mobile when chat is selected */}
        <div className={cn(
          'w-full md:w-80 lg:w-96 shrink-0',
          selectedEmployee && 'hidden md:block'
        )}>
          <ChatList
            selectedEmployeeId={selectedEmployee?.id}
            onSelectEmployee={setSelectedEmployee}
          />
        </div>

        {/* Chat View */}
        <div className={cn(
          'flex-1',
          !selectedEmployee && 'hidden md:flex'
        )}>
          <ChatView
            employee={selectedEmployee}
            onBack={() => setSelectedEmployee(null)}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Chats;
