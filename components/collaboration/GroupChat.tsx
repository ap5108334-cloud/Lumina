"use client";

import { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Code, User, Sparkles, Pin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import ReactMarkdown from 'react-markdown';

interface GroupChatProps {
  socket: Socket | null;
}

export default function GroupChat({ socket }: GroupChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isCode, setIsCode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('init', (state) => {
      setMessages(state.messages);
    });

    socket.on('message', (msg) => {
      setMessages((prev) => [...prev, msg].slice(-100));
    });

    return () => {
      socket.off('init');
      socket.off('message');
    };
  }, [socket]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || !socket) return;

    const msg = {
      id: Math.random().toString(36).slice(2),
      sender: user?.name || 'Anonymous',
      content: isCode ? `\`\`\`\n${input}\n\`\`\`` : input,
      type: isCode ? 'code' : 'text',
      timestamp: new Date().toISOString()
    };

    socket.emit('message', msg);
    setInput('');
    setIsCode(false);
  };

  return (
    <Card className="flex flex-col h-full overflow-hidden border-border/50 bg-card/30 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-background/40">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Pin className="w-3.5 h-3.5 text-lumina-purple" />
          Persistent Chat
          <span className="text-[10px] text-muted-foreground font-normal ml-2">Live Collab</span>
        </h3>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex flex-col gap-1.5 animate-fadeIn",
                msg.sender === user?.name ? "items-end" : "items-start"
              )}
            >
              <div className="flex items-center gap-2 px-1">
                 <span className="text-[10px] font-bold text-muted-foreground">{msg.sender}</span>
                 <span className="text-[9px] text-muted-foreground/50">{format(new Date(msg.timestamp), 'h:mm a')}</span>
              </div>
              
              <div
                className={cn(
                  "max-w-[90%] rounded-2xl px-4 py-2.5 shadow-sm",
                  msg.sender === user?.name
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-secondary/50 text-foreground rounded-tl-sm"
                )}
              >
                {msg.type === 'code' ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border/50 bg-background/20">
        <div className="relative flex flex-col gap-2">
          <Textarea
            placeholder={isCode ? "Paste your code snippet here..." : "Type a message..."}
            className="min-h-[44px] max-h-32 resize-none text-xs bg-background/50"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsCode(!isCode)}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] transition-all",
                isCode ? "bg-lumina-cyan/20 text-lumina-cyan" : "text-muted-foreground hover:bg-secondary"
              )}
            >
              <Code className="w-3.5 h-3.5" />
              Snippet Mode: {isCode ? "ON" : "OFF"}
            </button>
            <Button onClick={sendMessage} size="sm" className="h-8 gap-1.5 px-3">
              <Send className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
