import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Sparkles, 
  Loader2,
  Leaf
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface Message {
  role: 'user' | 'model';
  text: string;
}

export const WildlifeAI = ({ 
  showTrigger = true,
  open: controlledOpen,
  onOpenChange
}: { 
  showTrigger?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  
  const setIsOpen = (value: boolean) => {
    setInternalOpen(value);
    if (onOpenChange) onOpenChange(value);
  };
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Hoo-hoo! I am the Wise Forest Owl. Ask me anything about the woods and its creatures!' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [...messages, userMessage].map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        })),
        config: {
          systemInstruction: "You are the Wise Forest Owl, the forest's wisest inhabitant. You are friendly, scholarly but simple, and always start your first response with an owl sound ('Hoo-hoo' or 'Hoot'). Keep your answers very short (1-3 sentences). Protect the forest and teach nature lovers about its wonders.",
        }
      });

      const modelText = response.text || "Nature is full of mysteries, even for an owl like me!";
      setMessages(prev => [...prev, { role: 'model', text: modelText }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "The forest winds are too strong right now. Try hooting at me again in a moment!" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      {showTrigger && (
        <motion.div 
          className="fixed bottom-6 right-6 z-[60]"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button 
            onClick={() => setIsOpen(true)}
            className="w-14 h-14 rounded-full bg-brand-600 hover:bg-brand-700 shadow-2xl flex items-center justify-center p-0 border-4 border-white/20"
          >
            <Sparkles className="w-6 h-6 text-white" />
          </Button>
        </motion.div>
      )}

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-24 right-6 w-[90vw] md:w-[400px] h-[500px] z-[60] origin-bottom-right"
          >
            <Card className="flex flex-col h-full glass border-2 border-white/20 shadow-2xl overflow-hidden rounded-3xl">
              {/* Header */}
              <div className="p-4 bg-brand-600 flex items-center justify-between text-white">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-xl">
                    🦉
                  </div>
                  <div>
                    <h3 className="font-black text-sm uppercase tracking-wider">The Wise Forest Owl</h3>
                    <p className="text-[10px] text-white/70 italic leading-none">The forest's wisest owl</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setIsOpen(false)}
                  className="rounded-full hover:bg-white/10 text-white"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Messages Area */}
              <div 
                ref={scrollRef}
                className="flex-1 p-4 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-brand-200"
              >
                {messages.map((msg, i) => (
                  <div 
                    key={i} 
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
                  >
                    <div className={`max-w-[80%] p-4 rounded-2xl ${
                      msg.role === 'user' 
                        ? 'bg-brand-600 text-white rounded-tr-none' 
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 rounded-tl-none'
                    } shadow-sm text-sm italic font-medium`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start mb-4">
                    <div className="bg-stone-100 dark:bg-stone-800 p-4 rounded-2xl rounded-tl-none shadow-sm">
                      <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <form onSubmit={handleSend} className="p-4 bg-white/50 dark:bg-black/20 border-t border-white/20">
                <div className="flex space-x-2">
                  <Input 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about animals, plants..."
                    className="rounded-xl bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 font-medium italic"
                    disabled={isLoading}
                  />
                  <Button 
                    type="submit" 
                    disabled={isLoading || !input.trim()}
                    className="rounded-xl bg-brand-600 hover:bg-brand-700 h-10 w-10 p-0 shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
