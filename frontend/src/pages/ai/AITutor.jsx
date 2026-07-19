import { useState, useEffect, useRef } from 'react';
import { aiAPI } from '../../api/ai';
import { coursesAPI } from '../../api/courses';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '../../components/ui/select';
import { toast } from 'sonner';
import { Send, Bot, User, Sparkles, BookOpen } from 'lucide-react';

export default function AITutor() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadCourses() {
    try {
      const res = await coursesAPI.getMyCourses();
      setCourses(res.data.results || res.data);
    } catch {
      // Silent — optional
    }
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const res = await aiAPI.chat({
        message: userMsg,
        course_id: selectedCourse || null,
        history,
      });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.response }]);
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to get response';
      toast.error(errMsg);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/50 bg-background/70 backdrop-blur-xl px-4 sm:px-6 py-3 gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">AI Tutor</h1>
            <p className="text-xs text-muted-foreground">Ask me anything about your courses</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground hidden sm:block" />
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="All courses (general)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All courses (general)</SelectItem>
              {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-2">How can I help you?</h2>
            <p className="text-muted-foreground max-w-md mb-6 text-sm">I can explain concepts, help with homework, create practice questions, or review topics with you.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
              {[
                'Explain a concept',
                'Quiz me on a topic',
                'Help me study for an exam',
                'Break down a difficult problem',
              ].map(suggestion => (
                <Button key={suggestion} variant="outline" className="text-left h-auto py-3 btn-press hover:bg-accent/80" onClick={() => setInput(suggestion)}>
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}
            <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground rounded-br-md'
                : 'bg-muted/80 rounded-bl-md'
            }`}>
              <div className="whitespace-pre-wrap break-words">{msg.content}</div>
            </div>
            {msg.role === 'user' && (
              <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="bg-muted/80 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="animate-bounce [animation-delay:0ms] h-2 w-2 bg-muted-foreground/40 rounded-full" />
                <span className="animate-bounce [animation-delay:150ms] h-2 w-2 bg-muted-foreground/40 rounded-full" />
                <span className="animate-bounce [animation-delay:300ms] h-2 w-2 bg-muted-foreground/40 rounded-full" />
              </div>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border/50 bg-background/70 backdrop-blur-xl px-4 sm:px-6 py-4">
        <form onSubmit={sendMessage} className="flex gap-3">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask a question..."
            disabled={loading}
            className="flex-1 h-11 focus-visible:ring-primary/20 focus-visible:border-primary/40"
          />
          <Button type="submit" disabled={loading || !input.trim()} className="h-11 px-5 btn-press">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
