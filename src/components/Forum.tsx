/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ForumThread, ForumReply } from '../types';
import { MessageSquare, Heart, Send, Plus, Filter, User, Shield } from 'lucide-react';
import { localDB } from '../firebase';

interface ForumProps {
  currentUserId: string;
  currentUserName: string;
  currentUserRole: 'student' | 'instructor' | 'monitor';
  courseIdFilter?: string; // Optional filter by course context
}

export function Forum({ currentUserId, currentUserName, currentUserRole, courseIdFilter }: ForumProps) {
  const [threads, setThreads] = useState<ForumThread[]>(() => localDB.getForumThreads());
  const [selectedThread, setSelectedThread] = useState<ForumThread | null>(null);

  useEffect(() => {
    return localDB.onChange('threads', () => {
      const allThreads = localDB.getForumThreads();
      setThreads(allThreads);
      if (selectedThread) {
        const matching = allThreads.find(t => t.id === selectedThread.id);
        if (matching) {
          setSelectedThread(matching);
        }
      }
    });
  }, [selectedThread]);
  
  // Create Topic Form
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Geral');
  const [newContent, setNewContent] = useState('');

  // Reply Form
  const [replyText, setReplyText] = useState('');

  // Selected Category filter
  const [activeCategory, setActiveCategory] = useState<string>('Todos');

  const categories = ['Todos', 'Geral', 'Casos Clínicos', 'Manejo e Nutrição', 'Cirurgia e Anestesia', 'Farmacologia', 'Exames e Diagnóstico'];

  const filteredThreads = threads.filter(t => {
    // Exclude social network posts from academic forums
    if (t.category === 'social') {
      return false;
    }
    // If courseIdFilter is active, filter only for that course, or general
    if (courseIdFilter && t.courseId !== 'general' && t.courseId !== courseIdFilter) {
      return false;
    }
    if (activeCategory === 'Todos') return true;
    return t.category.toLowerCase() === activeCategory.toLowerCase();
  });

  const handleCreateThread = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const newThread: ForumThread = {
      id: `thread-${Date.now()}`,
      courseId: courseIdFilter || 'general',
      title: newTitle,
      content: newContent,
      authorId: currentUserId,
      authorName: currentUserName,
      authorRole: currentUserRole,
      createdAt: new Date().toISOString(),
      category: newCategory,
      likes: 0,
      replies: []
    };

    localDB.saveForumThread(newThread);
    setThreads(localDB.getForumThreads());
    
    // Clear forms
    setNewTitle('');
    setNewContent('');
    setShowCreateModal(false);
  };

  const handleLike = (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = threads.map(t => {
      if (t.id === threadId) {
        const item = { ...t, likes: t.likes + 1 };
        localDB.saveForumThread(item);
        return item;
      }
      return t;
    });
    setThreads(updated);
    if (selectedThread?.id === threadId) {
      setSelectedThread({ ...selectedThread, likes: selectedThread.likes + 1 });
    }
  };

  const handleAddReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThread || !replyText.trim()) return;

    const newReply: ForumReply = {
      id: `reply-${Date.now()}`,
      threadId: selectedThread.id,
      content: replyText,
      authorId: currentUserId,
      authorName: currentUserName,
      authorRole: currentUserRole,
      createdAt: new Date().toISOString()
    };

    const updatedThread = {
      ...selectedThread,
      replies: [...selectedThread.replies, newReply]
    };

    localDB.saveForumThread(updatedThread);
    setThreads(localDB.getForumThreads());
    setSelectedThread(updatedThread);
    setReplyText('');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      
      {/* Dynamic Background Flare */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {selectedThread ? (
        /* THREAD DETAILED VIEW */
        <div>
          <button 
            onClick={() => setSelectedThread(null)}
            className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 mb-5"
          >
            ← Voltar para lista de discussões
          </button>

          <div className="border-b border-slate-800 pb-5">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="px-2.5 py-0.5 text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
                {selectedThread.category}
              </span>
              <span className="text-xs text-slate-500">
                Postado em {new Date(selectedThread.createdAt).toLocaleDateString('pt-BR')}
              </span>
            </div>

            <h3 className="font-display text-xl font-bold text-slate-100">
              {selectedThread.title}
            </h3>

            <div className="flex items-center gap-2 mt-4">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-emerald-400 font-bold text-sm">
                {selectedThread.authorName.charAt(0)}
              </div>
              <div>
                <span className="text-sm font-semibold text-slate-200 block">
                  {selectedThread.authorName}
                </span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                  selectedThread.authorRole === 'instructor'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : selectedThread.authorRole === 'monitor'
                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                    : 'bg-slate-800 text-slate-400 border border-slate-750'
                }`}>
                  {selectedThread.authorRole === 'instructor' ? 'Professor / Tutor' : selectedThread.authorRole === 'monitor' ? (
                    <>
                      <Shield size={10} className="fill-purple-500/10" /> Monitor
                    </>
                  ) : 'Estudante'}
                </span>
              </div>
            </div>

            <p className="text-slate-300 text-sm mt-5 leading-relaxed bg-slate-950/40 p-4 rounded-xl border border-slate-800/60 whitespace-pre-wrap">
              {selectedThread.content}
            </p>

            <div className="flex items-center gap-4 mt-4">
              <button 
                onClick={(e) => handleLike(selectedThread.id, e)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 transition"
              >
                <Heart size={14} className="fill-slate-900 stroke-current text-slate-400 hover:fill-rose-400 hover:text-rose-400" />
                {selectedThread.likes} curtidas
              </button>
              <span className="text-xs text-slate-500">
                {selectedThread.replies.length} respostas
              </span>
            </div>
          </div>

          {/* REPLIES LOOP */}
          <div className="mt-6 space-y-4">
            <h4 className="text-sm font-semibold text-slate-200 mb-2">Comentários e Respostas</h4>

            {selectedThread.replies.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 italic">
                Ninguém comentou ainda. Seja o primeiro a responder esta dúvida!
              </p>
            ) : (
              selectedThread.replies.map(reply => (
                <div key={reply.id} className="bg-slate-950/20 border border-slate-850 p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs text-slate-300">
                        {reply.authorName.charAt(0)}
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-200">
                          {reply.authorName}
                        </span>
                        <span className={`text-[8px] ml-2 uppercase font-mono px-1.5 py-0.5 rounded inline-flex items-center gap-0.5 ${
                          reply.authorRole === 'instructor' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : reply.authorRole === 'monitor' 
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                            : 'bg-slate-800 text-slate-400 border border-slate-750'
                        }`}>
                          {reply.authorRole === 'instructor' ? 'TUTOR' : reply.authorRole === 'monitor' ? (
                            <>
                              <Shield size={8} className="fill-purple-500/10" /> MONITOR
                            </>
                          ) : 'ALUNO'}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {new Date(reply.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
                    {reply.content}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* ADD REPLY FORM */}
          <form onSubmit={handleAddReply} className="mt-6 pt-5 border-t border-slate-800">
            <div className="flex gap-3">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Escreva sua resposta ou contribuição..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
              />
              <button 
                type="submit"
                className="px-4 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold rounded-xl flex items-center gap-1.5"
              >
                <Send size={12} />
                Enviar
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* LIST THREADS VIEW */
        <div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="font-display text-xl font-bold text-slate-100">Fórum de Discussões</h3>
              <p className="text-xs text-slate-400">Tire suas dúvidas técnicas, de design e compartilhe seu progresso.</p>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="self-start md:self-auto flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/10 transition"
            >
              <Plus size={14} strokeWidth={3} />
              Criar Tópico
            </button>
          </div>

          {/* Filtering Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-4 border-b border-slate-800/80 mb-6 scrollbar-thin">
            <Filter size={13} className="text-slate-500 shrink-0" />
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition shrink-0 ${
                  activeCategory === cat 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-slate-950 text-slate-400 border border-slate-900 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Thread List */}
          <div className="space-y-3">
            {filteredThreads.length === 0 ? (
              <div className="text-center py-10 bg-slate-950/20 border border-slate-800/40 rounded-xl">
                <p className="text-xs text-slate-500">Nenhum tópico encontrado nesta categoria.</p>
              </div>
            ) : (
              filteredThreads.map(thread => (
                <div 
                  key={thread.id} 
                  onClick={() => setSelectedThread(thread)}
                  className="bg-slate-950/30 hover:bg-slate-950/60 border border-slate-800/60 hover:border-emerald-500/30 p-5 rounded-xl cursor-pointer transition-all duration-200 group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2.5 mb-2.5">
                        <span className="px-2 py-0.5 text-[9px] uppercase font-bold text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 rounded">
                          {thread.category}
                        </span>
                        <span className="text-[11px] text-slate-500 inline-flex items-center gap-1">
                          Por {thread.authorName}
                          {thread.authorRole === 'monitor' && (
                            <span className="inline-flex items-center gap-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/25 px-1 py-0.5 rounded text-[8px] font-bold uppercase font-mono tracking-wider">
                              <Shield size={8} className="fill-purple-500/10" /> Monitor
                            </span>
                          )}
                          • {new Date(thread.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      
                      <h4 className="font-display font-semibold text-sm text-slate-200 group-hover:text-emerald-400 transition-colors">
                        {thread.title}
                      </h4>
                      
                      <p className="text-xs text-slate-400 mt-2 line-clamp-1">
                        {thread.content}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <button 
                        onClick={(e) => handleLike(thread.id, e)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-slate-400 hover:text-rose-400 hover:border-rose-500/10"
                      >
                        <Heart size={11} className="stroke-current" />
                        {thread.likes}
                      </button>

                      <span className="flex items-center gap-1 text-xs text-slate-400 px-2 py-1 bg-slate-900 border border-slate-800 rounded">
                        <MessageSquare size={11} />
                        {thread.replies.length}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* CREATE DISCUSSION MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <h3 className="font-display text-lg font-bold text-slate-100 mb-1">Novo Tópico de Discussão</h3>
            <p className="text-xs text-slate-400 mb-5">Compartilhe sua dúvida ou tutorial técnica com a turma.</p>
            
            <form onSubmit={handleCreateThread} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-mono text-slate-400 mb-1">Título da Discussão</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Como configurar rotas do Express no contêiner?"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-mono text-slate-400 mb-1">Categoria</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                >
                  <option value="Geral">Geral</option>
                  <option value="Casos Clínicos">Casos Clínicos</option>
                  <option value="Manejo e Nutrição">Manejo e Nutrição</option>
                  <option value="Cirurgia e Anestesia">Cirurgia e Anestesia</option>
                  <option value="Farmacologia">Farmacologia</option>
                  <option value="Exames e Diagnóstico">Exames e Diagnóstico</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-mono text-slate-400 mb-1">Conteúdo da Mensagem</label>
                <textarea
                  required
                  rows={4}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Escreva detalhadamente sua observação, cole códigos se necessário..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                >
                  Publicar Tópico
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
