import { useState } from 'react';
import { Bot, FileText, X, Loader2, Send, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

type Message = { role: 'user' | 'assistant'; content: string };

const AISummaryButton = () => {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'chat'>('summary');
  
  // Summary state
  const [summary, setSummary] = useState<string>('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoadingChat, setIsLoadingChat] = useState(false);

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
          className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 p-0"
        >
          <Bot className="h-6 w-6" />
        </Button>
      </motion.div>

      {/* Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              {language === 'ar' ? 'المساعد الذكي' : 'AI Assistant'}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => {
            setActiveTab(v as 'summary' | 'chat');
            if (v === 'summary' && !summary) {
              fetchSummary();
            }
          }}>
            <TabsList className="w-full rounded-none border-b">
              <TabsTrigger value="summary" className="flex-1 gap-2">
                <FileText className="h-4 w-4" />
                {language === 'ar' ? 'ملخص اليوم' : 'Daily Summary'}
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex-1 gap-2">
                <MessageCircle className="h-4 w-4" />
                {language === 'ar' ? 'المحادثة' : 'Chat'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="m-0">
              <ScrollArea className="h-[400px] p-4">
                {isLoadingSummary ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground text-sm">
                      {language === 'ar' ? 'جاري تحليل البيانات...' : 'Analyzing data...'}
                    </p>
                  </div>
                ) : summary ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {summary}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">
                      {language === 'ar' ? 'لا توجد بيانات' : 'No data available'}
                    </p>
                  </div>
                )}
              </ScrollArea>
              <div className="p-3 border-t">
                <Button 
                  onClick={fetchSummary} 
                  disabled={isLoadingSummary}
                  className="w-full"
                  variant="outline"
                >
                  {isLoadingSummary ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    language === 'ar' ? 'تحديث الملخص' : 'Refresh Summary'
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="chat" className="m-0 flex flex-col">
              <ScrollArea className="h-[350px] p-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center gap-2">
                    <Bot className="h-12 w-12 text-muted-foreground/50" />
                    <p className="text-muted-foreground text-sm">
                      {language === 'ar' 
                        ? 'اسألني أي شيء عن الحضور والموظفين!'
                        : 'Ask me anything about attendance and employees!'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                            msg.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                    {isLoadingChat && messages[messages.length - 1]?.role === 'user' && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-lg px-3 py-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
              <div className="p-3 border-t flex gap-2">
                <Input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={language === 'ar' ? 'اكتب رسالتك...' : 'Type your message...'}
                  disabled={isLoadingChat}
                  className="flex-1"
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={!inputText.trim() || isLoadingChat}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AISummaryButton;
