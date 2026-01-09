import { useState, useRef, useEffect } from 'react';
import { Bot, FileText, Loader2, Send, MessageCircle, Sparkles, RefreshCw, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

type Message = { role: 'user' | 'assistant'; content: string };

// Markdown table renderer component
const MarkdownContent = ({ content }: { content: string }) => {
  return (
    <ReactMarkdown
      components={{
        table: ({ children }) => (
          <div className="overflow-x-auto my-2 rounded-lg border border-border">
            <table className="w-full text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-primary/10">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2 text-start font-semibold border-b border-border">{children}</th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 border-b border-border/50">{children}</td>
        ),
        tr: ({ children }) => (
          <tr className="hover:bg-muted/50 transition-colors">{children}</tr>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside space-y-1 my-2">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="text-sm">{children}</li>
        ),
        p: ({ children }) => (
          <p className="mb-2 last:mb-0">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-primary">{children}</strong>
        ),
        h1: ({ children }) => (
          <h1 className="text-lg font-bold mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-semibold mb-2 text-primary">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold mb-1">{children}</h3>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

const AISummaryButton = () => {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'chat'>('summary');
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Summary state
  const [summary, setSummary] = useState<string>('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoadingChat, setIsLoadingChat] = useState(false);

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
            language 
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
    ? ['ملخص الحضور اليوم', 'من غائب اليوم؟', 'إحصائيات الشهر']
    : ['Today\'s attendance', 'Who is absent?', 'Monthly stats'];

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
        <DialogContent className="max-w-lg max-h-[85vh] p-0 overflow-hidden gap-0">
          <DialogHeader className="p-4 pb-3 bg-gradient-to-r from-primary/10 to-primary/5 border-b">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 rounded-full bg-primary/20">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              {language === 'ar' ? 'المساعد الذكي' : 'AI Assistant'}
              <Sparkles className="h-4 w-4 text-primary/60 mr-auto" />
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => {
            setActiveTab(v as 'summary' | 'chat');
            if (v === 'summary' && !summary) {
              fetchSummary();
            }
          }} className="flex flex-col flex-1">
            <TabsList className="w-full rounded-none bg-muted/50 p-1 mx-0">
              <TabsTrigger value="summary" className="flex-1 gap-2 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <FileText className="h-4 w-4" />
                {language === 'ar' ? 'ملخص اليوم' : 'Daily Summary'}
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex-1 gap-2 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <MessageCircle className="h-4 w-4" />
                {language === 'ar' ? 'المحادثة' : 'Chat'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="m-0 flex-1 flex flex-col">
              <ScrollArea className="h-[380px] flex-1">
                <div className="p-4">
                  {isLoadingSummary ? (
                    <div className="flex flex-col items-center justify-center h-[300px] gap-4">
                      <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                        <div className="relative p-4 rounded-full bg-primary/10">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
                  ) : summary ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-br from-card to-muted/30 rounded-xl p-4 border shadow-sm"
                    >
                      <MarkdownContent content={summary} />
                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[300px] gap-3">
                      <div className="p-4 rounded-full bg-muted">
                        <FileText className="h-8 w-8 text-muted-foreground" />
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
                      {language === 'ar' ? 'تحديث الملخص' : 'Refresh Summary'}
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="chat" className="m-0 flex-1 flex flex-col">
              <ScrollArea className="h-[320px] flex-1" ref={scrollRef}>
                <div className="p-4">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[250px] text-center gap-4">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="p-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/5"
                      >
                        <Bot className="h-10 w-10 text-primary" />
                      </motion.div>
                      <div>
                        <p className="font-medium mb-1">
                          {language === 'ar' ? 'كيف أساعدك؟' : 'How can I help?'}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {language === 'ar' 
                            ? 'اسألني عن الحضور، الموظفين، أو أي شيء!'
                            : 'Ask me about attendance, employees, or anything!'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center mt-2">
                        {quickSuggestions.map((suggestion, i) => (
                          <Button
                            key={i}
                            variant="outline"
                            size="sm"
                            className="text-xs rounded-full"
                            onClick={() => {
                              setInputText(suggestion);
                            }}
                          >
                            {suggestion}
                          </Button>
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
                            className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            {msg.role === 'assistant' && (
                              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                                <Bot className="h-4 w-4 text-primary" />
                              </div>
                            )}
                            <div
                              className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                                msg.role === 'user'
                                  ? 'bg-primary text-primary-foreground rounded-br-md'
                                  : 'bg-muted/80 rounded-bl-md border'
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
                              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center">
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
                          className="flex gap-2 justify-start"
                        >
                          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                          <div className="bg-muted/80 rounded-2xl rounded-bl-md px-4 py-3 border">
                            <div className="flex gap-1">
                              <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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
                    placeholder={language === 'ar' ? 'اكتب رسالتك...' : 'Type your message...'}
                    disabled={isLoadingChat}
                    className="flex-1 rounded-full bg-background"
                  />
                  <Button 
                    onClick={sendMessage} 
                    disabled={!inputText.trim() || isLoadingChat}
                    size="icon"
                    className="rounded-full shrink-0"
                  >
                    <Send className="h-4 w-4" />
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
