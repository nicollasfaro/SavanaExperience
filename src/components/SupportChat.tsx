/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../types';
import { Send, MessageCircle, X, HelpCircle } from 'lucide-react';
import { localDB } from '../firebase';

interface SupportChatProps {
  currentUserId: string;
  currentUserName: string;
  currentUserRole: 'student' | 'instructor';
}

export function SupportChat({ currentUserId, currentUserName, currentUserRole }: SupportChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => localDB.getChatMessages('general-support'));
  const [text, setText] = useState('');

  useEffect(() => {
    return localDB.onChange('chat_messages', () => {
      setMessages(localDB.getChatMessages('general-support'));
    });
  }, []);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new messages come in or when chat is opened
  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: currentUserId,
      senderName: currentUserName,
      senderRole: currentUserRole,
      message: text,
      createdAt: new Date().toISOString()
    };

    localDB.saveChatMessage('general-support', newMsg);
    setMessages(localDB.getChatMessages('general-support'));
    setText('');

    // Simulate tutor automated response after 1.5 seconds to make it interactive if desired
    if (currentUserRole === 'student') {
      setTimeout(() => {
        const tutorReply: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          senderId: 'course-1-teacher',
          senderName: 'Dr. Gabriel (Tutor)',
          senderRole: 'instructor',
          message: `Obrigado pelo seu contato médico! Analisei sua questão clínica sobre "${text.slice(0, 30)}...". Nossos clínicos plantonistas darão um parecer completo no suporte em instantes. Enquanto isso, verifique os novos casos no Fórum!`,
          createdAt: new Date().toISOString()
        };
        localDB.saveChatMessage('general-support', tutorReply);
        setMessages(localDB.getChatMessages('general-support'));
      }, 1500);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 font-sans">
      
      {/* 1. Closed State Bubble */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="relative flex items-center justify-center w-14 h-14 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-full shadow-2xl shadow-emerald-500/30 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 group"
        >
          <MessageCircle size={24} className="stroke-[2.5]" />
          <span className="absolute top-0 right-0 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-slate-950 border-2 border-emerald-500"></span>
          </span>
        </button>
      )}

      {/* 2. Open Chat Drawer */}
      {isOpen && (
        <div className="w-80 sm:w-96 h-[480px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
          
          {/* Header */}
          <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <HelpCircle size={16} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-100 block">Atendimento Savana Experience</span>
                <span className="text-[9px] uppercase font-mono tracking-widest text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
  Tutor Disponível
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-100 p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages Logs Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/20">
            {messages.map((msg) => {
              const myMsg = msg.senderId === currentUserId;

              return (
                <div 
                  key={msg.id} 
                  className={`flex flex-col max-w-[85%] ${myMsg ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                >
                  <span className="text-[9px] text-slate-500 mb-0.5 px-1 font-mono">
                    {msg.senderName} • {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  <div className={`p-3 rounded-2xl text-[11px] leading-relaxed shadow-md ${
                    myMsg 
                      ? 'bg-emerald-500 text-slate-950 font-medium rounded-tr-none' 
                      : 'bg-slate-850 text-slate-205 rounded-tl-none border border-slate-800/60'
                  }`}>
                    {msg.message}
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Form input */}
          <form onSubmit={handleSendMessage} className="p-3 bg-slate-950 border-t border-slate-800">
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Qual sua dúvida médica de silvestres?"
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="p-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold transition flex items-center justify-center shrink-0"
              >
                <Send size={14} />
              </button>
            </div>
          </form>

        </div>
      )}

    </div>
  );
}
