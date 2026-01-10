import { useState, useRef, useEffect } from 'react';
import { Bot, Loader2, Send, MessageCircle, Sparkles, RefreshCw, User, Users, Clock, CalendarCheck, AlertCircle, TrendingUp, Coffee, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

type Message = { role: 'user' | 'assistant'; content: string };

interface SummaryStats {
  totalEmployees: number;
  present: number;
  absent: number;
  checkedIn: number;
  onBreak: number;
  checkedOut: number;
  pendingLeaves: number;
}

// Markdown table renderer component
const MarkdownContent = ({ content }: { content: string }) => {
  return (
    <ReactMarkdown
      components={{
        table: ({ children }) => (
          <div className="overflow-x-auto my-3 rounded-lg border border-border bg-card/50">
            <table className="w-full text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-primary/10">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2.5 text-start font-semibold border-b border-border text-primary">{children}</th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2.5 border-b border-border/50">{children}</td>
        ),
        tr: ({ children }) => (
          <tr className="hover:bg-muted/50 transition-colors">{children}</tr>
        ),
        ul: ({ children }) => (
          <ul className="list-none space-y-1.5 my-2">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside space-y-1 my-2">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="text-sm flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>{children}</span>
          </li>
        ),
        p: ({ children }) => (
          <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        h1: ({ children }) => (
          <h1 className="text-lg font-bold mb-3 flex items-center gap-2 text-primary">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-semibold mb-2 text-primary flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold mb-1 text-foreground">{children}</h3>
        ),
        code: ({ children }) => (
          <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

// Mini Dashboard Card Component
const StatMiniCard = ({ 
  icon: Icon, 
  label, 
  value, 
  color, 
  delay = 0 
}: { 
  icon: any; 
  label: string; 
  value: number | string; 
  color: string;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay, duration: 0.2 }}
  >
    <Card className={`border-l-4 ${color} hover:shadow-md transition-all`}>
      <CardContent className="p-3 flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-gradient-to-br ${color.replace('border-l-', 'from-').replace('-500', '-100')} ${color.replace('border-l-', 'to-').replace('-500', '-50')}`}>
          <Icon className={`h-4 w-4 ${color.replace('border-l-', 'text-')}`} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

const AISummaryButton = () => {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'chat'>('summary');
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Summary state
  const [summary, setSummary] = useState<string>('');
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoadingChat, setIsLoadingChat] = useState(false);

  // Get current date in local timezone
  const getCurrentDate = () => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  };

  // Auto scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchSummary = async () => {
    if (!profile?.company_id) {
      toast.error(language === 'ar' ? 'لم يتم العثور على الشركة' : 'Company not found');
      return;
    }

    setIsLoadingSummary(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-daily-summary`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            companyId: profile.company_id,
            language 
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch summary');
      }

      const data = await response.json();
      setSummary(data.summary);
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching summary:', error);
      toast.error(language === 'ar' ? 'حدث خطأ في جلب الملخص' : 'Error fetching summary');
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    if (activeTab === 'summary' && !summary) {
      fetchSummary();
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoadingChat) return;

    const userMessage: Message = { role: 'user', content: inputText };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoadingChat(true);

    let assistantContent = '';

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            messages: [...messages, userMessage],
            language,
            companyId: profile?.company_id,
            currentDate: getCurrentDate()
          }),
        }
      );

      if (!response.ok || !response.body) {
        throw new Error('Failed to start chat');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => 
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return [...prev, { role: 'assistant', content: assistantContent }];
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast.error(language === 'ar' ? 'حدث خطأ في المحادثة' : 'Chat error occurred');
    } finally {
      setIsLoadingChat(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickSuggestions = language === 'ar' 
    ? ['حضّر كل الموظفين', 'من غائب اليوم؟', 'أضف مكافأة 500 لأحمد', 'ملخص الأسبوع']
    : ['Mark all present', 'Who is absent?', 'Add 500 bonus to Ahmed', 'Weekly summary'];

  const formatDate = () => {
    const date = new Date();
    return language === 'ar' 
      ? date.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <>
      {/* Floating Button */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50"
      >
        <Button
          onClick={handleOpen}
          size="lg"
          className="h-14 w-14 rounded-full shadow-xl bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 p-0 relative overflow-hidden group"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          >
            <Bot className="h-6 w-6" />
          </motion.div>
          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Button>
      </motion.div>

      {/* Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] p-0 overflow-hidden gap-0">
          <DialogHeader className="p-4 pb-3 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b">
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg">
                <Bot className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <span className="text-lg font-semibold">
                  {language === 'ar' ? 'المساعد الذكي' : 'AI Assistant'}
                </span>
                <p className="text-xs text-muted-foreground font-normal mt-0.5">
                  {formatDate()}
                </p>
              </div>
              <Sparkles className="h-5 w-5 text-primary/60" />
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => {
            setActiveTab(v as 'summary' | 'chat');
            if (v === 'summary' && !summary) {
              fetchSummary();
            }
          }} className="flex flex-col flex-1">
            <TabsList className="w-full rounded-none bg-muted/50 p-1 mx-0 h-auto">
              <TabsTrigger value="summary" className="flex-1 gap-2 rounded-lg py-2.5 data-[state=active]:bg-background data-[state=active]:shadow">
                <TrendingUp className="h-4 w-4" />
                {language === 'ar' ? 'لوحة اليوم' : 'Today\'s Dashboard'}
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex-1 gap-2 rounded-lg py-2.5 data-[state=active]:bg-background data-[state=active]:shadow">
                <MessageCircle className="h-4 w-4" />
                {language === 'ar' ? 'المحادثة' : 'Chat'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="m-0 flex-1 flex flex-col">
              <ScrollArea className="h-[450px] flex-1">
                <div className="p-4 space-y-4">
                  {isLoadingSummary ? (
                    <div className="flex flex-col items-center justify-center h-[350px] gap-4">
                      <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                        <div className="relative p-5 rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
                          <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground font-medium">
                          {language === 'ar' ? 'جاري تحليل البيانات...' : 'Analyzing data...'}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          {language === 'ar' ? 'يتم إعداد ملخص شامل لليوم' : 'Preparing comprehensive daily summary'}
                        </p>
                      </div>
                    </div>
                  ) : stats ? (
                    <>
                      {/* Mini Dashboard Stats Grid */}
                      <div className="grid grid-cols-2 gap-3">
                        <StatMiniCard
                          icon={Users}
                          label={language === 'ar' ? 'إجمالي الموظفين' : 'Total Employees'}
                          value={stats.totalEmployees}
                          color="border-l-blue-500"
                          delay={0}
                        />
                        <StatMiniCard
                          icon={CalendarCheck}
                          label={language === 'ar' ? 'الحاضرين' : 'Present'}
                          value={stats.present}
                          color="border-l-green-500"
                          delay={0.1}
                        />
                        <StatMiniCard
                          icon={Clock}
                          label={language === 'ar' ? 'سجلوا دخول' : 'Checked In'}
                          value={stats.checkedIn}
                          color="border-l-emerald-500"
                          delay={0.2}
                        />
                        <StatMiniCard
                          icon={Coffee}
                          label={language === 'ar' ? 'في استراحة' : 'On Break'}
                          value={stats.onBreak}
                          color="border-l-amber-500"
                          delay={0.3}
                        />
                        <StatMiniCard
                          icon={LogOut}
                          label={language === 'ar' ? 'انصرفوا' : 'Checked Out'}
                          value={stats.checkedOut}
                          color="border-l-purple-500"
                          delay={0.4}
                        />
                        <StatMiniCard
                          icon={AlertCircle}
                          label={language === 'ar' ? 'طلبات إجازة' : 'Leave Requests'}
                          value={stats.pendingLeaves}
                          color="border-l-orange-500"
                          delay={0.5}
                        />
                      </div>

                      {/* AI Summary */}
                      {summary && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.6 }}
                          className="mt-4"
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <h3 className="font-semibold text-sm">
                              {language === 'ar' ? 'تحليل الذكاء الاصطناعي' : 'AI Analysis'}
                            </h3>
                          </div>
                          <Card className="bg-gradient-to-br from-card via-card to-muted/30 border-primary/10">
                            <CardContent className="p-4">
                              <MarkdownContent content={summary} />
                            </CardContent>
                          </Card>
                        </motion.div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[350px] gap-3">
                      <div className="p-5 rounded-full bg-muted">
                        <TrendingUp className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">
                        {language === 'ar' ? 'لا توجد بيانات' : 'No data available'}
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="p-3 border-t bg-muted/30">
                <Button 
                  onClick={fetchSummary} 
                  disabled={isLoadingSummary}
                  className="w-full gap-2"
                  variant="outline"
                >
                  {isLoadingSummary ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      {language === 'ar' ? 'تحديث البيانات' : 'Refresh Data'}
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="chat" className="m-0 flex-1 flex flex-col">
              <ScrollArea className="h-[380px] flex-1" ref={scrollRef}>
                <div className="p-4">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[320px] text-center gap-4">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="p-5 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5"
                      >
                        <Bot className="h-12 w-12 text-primary" />
                      </motion.div>
                      <div className="space-y-2">
                        <p className="font-semibold text-lg">
                          {language === 'ar' ? 'كيف أساعدك؟' : 'How can I help?'}
                        </p>
                        <p className="text-muted-foreground text-sm max-w-xs">
                          {language === 'ar' 
                            ? 'أستطيع تحضير الموظفين، إضافة مكافآت، والمزيد!'
                            : 'I can mark attendance, add bonuses, and more!'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center mt-4 max-w-sm">
                        {quickSuggestions.map((suggestion, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs rounded-full hover:bg-primary hover:text-primary-foreground transition-colors"
                              onClick={() => setInputText(suggestion)}
                            >
                              {suggestion}
                            </Button>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <AnimatePresence mode="popLayout">
                        {messages.map((msg, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            {msg.role === 'assistant' && (
                              <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
                                <Bot className="h-4 w-4 text-primary-foreground" />
                              </div>
                            )}
                            <div
                              className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                                msg.role === 'user'
                                  ? 'bg-primary text-primary-foreground rounded-br-md'
                                  : 'bg-card border rounded-bl-md'
                              }`}
                            >
                              {msg.role === 'assistant' ? (
                                <div className="text-sm">
                                  <MarkdownContent content={msg.content} />
                                </div>
                              ) : (
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                              )}
                            </div>
                            {msg.role === 'user' && (
                              <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-sm">
                                <User className="h-4 w-4 text-primary-foreground" />
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {isLoadingChat && messages[messages.length - 1]?.role === 'user' && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex gap-2.5 justify-start"
                        >
                          <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
                            <Bot className="h-4 w-4 text-primary-foreground" />
                          </div>
                          <div className="bg-card border rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                            <div className="flex gap-1.5">
                              <motion.div 
                                className="w-2 h-2 bg-primary/60 rounded-full"
                                animate={{ y: [0, -6, 0] }}
                                transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                              />
                              <motion.div 
                                className="w-2 h-2 bg-primary/60 rounded-full"
                                animate={{ y: [0, -6, 0] }}
                                transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                              />
                              <motion.div 
                                className="w-2 h-2 bg-primary/60 rounded-full"
                                animate={{ y: [0, -6, 0] }}
                                transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="p-3 border-t bg-muted/30">
                <div className="flex gap-2">
                  <Input
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={language === 'ar' ? 'اكتب أمراً أو سؤالاً...' : 'Type a command or question...'}
                    className="flex-1 rounded-full bg-background border-border/50 focus-visible:ring-primary/20"
                    disabled={isLoadingChat}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!inputText.trim() || isLoadingChat}
                    size="icon"
                    className="rounded-full shrink-0 bg-primary hover:bg-primary/90"
                  >
                    {isLoadingChat ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AISummaryButton;
