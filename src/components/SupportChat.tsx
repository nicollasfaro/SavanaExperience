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
  currentUserRole: 'student' | 'instructor' | 'monitor';
}

export function SupportChat({ currentUserId, currentUserName, currentUserRole }: SupportChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const chatId = `support-${currentUserId}`;
  const [messages, setMessages] = useState<ChatMessage[]>(() => localDB.getChatMessages(chatId));
  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    return localDB.onChange('chat_messages', () => {
      setMessages(localDB.getChatMessages(chatId));
    });
  }, [chatId]);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new messages come in or when chat is opened or when typing changes
  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, messages, isTyping]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const userMessage = text.trim();
    if (!userMessage) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: currentUserId,
      senderName: currentUserName,
      senderRole: currentUserRole,
      message: userMessage,
      createdAt: new Date().toISOString()
    };

    localDB.saveChatMessage(chatId, newMsg);
    const updatedMessages = localDB.getChatMessages(chatId);
    setMessages(updatedMessages);
    setText('');

    // Trigger AI support bot for all user messages to allow testing and use by both students and instructors
    if (newMsg.senderId !== 'tutor-support-system') {
      setIsTyping(true);
      try {
        const courses = localDB.getCourses();
        const modules = localDB.getModules();

        // Standardize the recent conversational history to pass back to server-side Gemini
        const chatHistory = updatedMessages
          .slice(-12)
          .map(msg => ({
            role: msg.senderId === currentUserId ? 'user' : 'model',
            text: msg.message
          }));

        const response = await fetch('/api/support/reply', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: userMessage,
            history: chatHistory.slice(0, -1), // skip current message from historical array to avoid doubling
            courses,
            modules
          })
        });

        if (!response.ok) {
          throw new Error('Support API response error');
        }

        const data = await response.json();

        const tutorReply: ChatMessage = {
          id: `msg-${Date.now()}`,
          senderId: 'tutor-support-system',
          senderName: 'Dr. Gabriel (Tutor IA)',
          senderRole: 'instructor',
          message: data.reply,
          createdAt: new Date().toISOString()
        };

        localDB.saveChatMessage(chatId, tutorReply);
        setMessages(localDB.getChatMessages(chatId));
      } catch (err) {
        console.error("Support API interactive reply failed:", err);
        // Clean elegant fallback dialogue if key or server has a transient glitch
        const tutorReply: ChatMessage = {
          id: `msg-${Date.now()}`,
          senderId: 'tutor-support-system',
          senderName: 'Dr. Gabriel (Tutor IA)',
          senderRole: 'instructor',
          message: `Olá! Devido a uma instabilidade temporária na minha rede veterinária de IA, não consegui processar sua consulta agora.
          
Mas lembre-se: temos excelentes cursos de especialização disponíveis na Savana Experience para você se aprofundar nos diagnósticos e casos reais! Tente enviar sua pergunta novamente em alguns instantes.`,
          createdAt: new Date().toISOString()
        };
        localDB.saveChatMessage(chatId, tutorReply);
        setMessages(localDB.getChatMessages(chatId));
      } finally {
        setIsTyping(false);
      }
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
                  Tutor IA Disponível
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

                  <div className={`p-3 rounded-2xl text-[11px] leading-relaxed shadow-md whitespace-pre-wrap ${
                    myMsg 
                      ? 'bg-emerald-500 text-slate-950 font-medium rounded-tr-none' 
                      : 'bg-slate-850 text-slate-205 rounded-tl-none border border-slate-800/60'
                  }`}>
                    {msg.message}
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex flex-col max-w-[85%] mr-auto items-start">
                <span className="text-[9px] text-emerald-400 mb-0.5 px-1 font-mono animate-pulse">
                  Dr. Gabriel (Tutor IA) está digitando...
                </span>
                <div className="bg-slate-850 text-slate-200 rounded-2xl rounded-tl-none border border-slate-800/60 p-3 shadow-md">
                  <div className="flex gap-1.5 items-center py-1 px-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Form input */}
          <form onSubmit={handleSendMessage} className="p-3 bg-slate-950 border-t border-slate-800">
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={text}
                disabled={isTyping}
                onChange={(e) => setText(e.target.value)}
                placeholder={isTyping ? "Aguardando resposta do tutor..." : "Qual sua dúvida médica de silvestres?"}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isTyping}
                className="p-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold transition flex items-center justify-center shrink-0 disabled:opacity-50"
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
