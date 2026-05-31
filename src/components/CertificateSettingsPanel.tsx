import React, { useState, useEffect, useRef } from 'react';
import { Award, Save, RotateCcw, AlertCircle, CheckCircle, HelpCircle, Eye, Upload, Trash2, Sliders, Palette, Type, LayoutTemplate } from 'lucide-react';
import { CertificateSettings } from '../types';
import { localDB } from '../firebase';
import { INITIAL_CERTIFICATE_SETTINGS } from '../data';

const DEFAULT_LAYOUT_PRESETS = {
  customInstitutionTop: 14,
  customInstitutionSize: 1.2,
  customInstitutionColor: '#94a3b8',
  
  customTitleTop: 24,
  customTitleSize: 3.5,
  customTitleColor: '#ffffff',
  
  customRecipientTop: 40,
  customRecipientSize: 2.2,
  customRecipientColor: '#67e8f9',
  
  customTextTop: 52,
  customTextSize: 1.2,
  customTextColor: '#cbd5e1',
  
  customCourseTop: 62,
  customCourseSize: 2.5,
  customCourseColor: '#34d399',
  
  customMetaTop: 72,
  customMetaSize: 1.0,
  customMetaColor: '#64748b',
  
  customSignaturesTop: 84,
  customSignaturesSize: 1.1,
  customSignaturesColor: '#cbd5e1',
  
  customQrTop: 78,
  customQrLeft: 12,
  customQrSize: 10
};

export function CertificateSettingsPanel() {
  const [settings, setSettings] = useState<CertificateSettings>(() => {
    const s = localDB.getCertificateSettings();
    return {
      ...s
    };
  });
  const [activeTab, setActiveTab] = useState<'text' | 'art' | 'layout'>('text');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state if settings change in localDB
  useEffect(() => {
    const handleSync = () => {
      setSettings(localDB.getCertificateSettings());
    };
    const unsub = localDB.onChange('certificateSettings', handleSync);
    return () => unsub();
  }, []);

  const handleChange = (key: keyof CertificateSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMsg(null);

    try {
      await localDB.saveCertificateSettings(settings);
      setStatusMsg({ text: 'Configurações dos certificados salvas com sucesso!', type: 'success' });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ text: 'Falha ao salvar as configurações: ' + (err.message || err), type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Tem certeza de que deseja restaurar as configurações padrões originais do certificado?')) {
      setSettings({
        ...INITIAL_CERTIFICATE_SETTINGS,
        useCustomLayout: false,
        backgroundImageUrl: '',
        ...DEFAULT_LAYOUT_PRESETS
      });
      setActiveTab('text');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1.5 * 1024 * 1024) {
      alert("A imagem selecionada é muito grande! Por favor, certifique-se de fazer upload de um PNG ou JPG com no máximo 1.5MB para melhor desempenho.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setSettings(prev => ({
          ...prev,
          backgroundImageUrl: event.target!.result as string
        }));
        setStatusMsg({ text: 'Imagem do modelo de certificado carregada! Lembre-se de salvar suas alterações.', type: 'success' });
        setTimeout(() => setStatusMsg(null), 3000);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setSettings(prev => ({
      ...prev,
      backgroundImageUrl: ''
    }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const initLayoutDefaultsOrToggle = (val: boolean) => {
    setSettings(prev => {
      const updated = { ...prev, useCustomLayout: val };
      // Assign default coordinates if not already present
      Object.entries(DEFAULT_LAYOUT_PRESETS).forEach(([key, value]) => {
        if (updated[key as keyof CertificateSettings] === undefined) {
          (updated as any)[key] = value;
        }
      });
      return updated;
    });

    if (val) {
      setActiveTab('layout');
    } else {
      setActiveTab('text');
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Header */}
      <div>
        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Award className="text-emerald-400" size={20} />
          <span>Configuração & Customização de Certificados</span>
        </h3>
        <p className="text-xs text-slate-400">
          Personalize as informações, assinaturas digitais ou faça upload de um modelo PNG exclusivo de fundo posicionando os textos de forma totalmente dinâmica.
        </p>
      </div>

      {/* Messages */}
      {statusMsg && (
         <div 
           className={`p-4 rounded-xl flex items-center gap-2 border text-xs leading-normal animate-fade-in ${
             statusMsg.type === 'success' 
               ? 'bg-emerald-950/40 border-emerald-500/20 text-emerald-300' 
               : 'bg-red-950/40 border-red-500/20 text-red-300'
           }`}
         >
           {statusMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
           <span>{statusMsg.text}</span>
         </div>
      )}

      {/* Split view: Accordion Form & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Editor Form Columns */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
            
            {/* Horizontal Sub-tabs */}
            <div className="flex bg-slate-950/60 p-1 rounded-xl gap-1 mb-5 border border-slate-800/40">
              <button
                type="button"
                onClick={() => setActiveTab('text')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] uppercase font-mono tracking-wider font-extrabold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'text'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/50'
                }`}
              >
                <Type size={12} />
                <span>Textos</span>
              </button>
              
              <button
                type="button"
                onClick={() => setActiveTab('art')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] uppercase font-mono tracking-wider font-extrabold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'art'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/50'
                }`}
              >
                <LayoutTemplate size={12} />
                <span>Arte de Fundo</span>
              </button>
              
              <button
                type="button"
                disabled={!settings.useCustomLayout}
                onClick={() => setActiveTab('layout')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] uppercase font-mono tracking-wider font-extrabold rounded-lg transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                  activeTab === 'layout'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/50'
                }`}
                title={!settings.useCustomLayout ? 'Ative o Layout Customizado na aba "Arte de Fundo" para liberar os ajustes' : ''}
              >
                <Sliders size={12} />
                <span>Posições</span>
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              
              {/* Tab Content: TEXTOS */}
              {activeTab === 'text' && (
                <div className="space-y-4 animate-fade-in text-left">
                  <div className="border-b border-slate-800/80 pb-2 mb-2">
                    <h4 className="text-xs font-mono uppercase tracking-widest text-[#ccdcd3] font-bold">Conteúdo Escrito</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400 font-bold">
                        Nome da Instituição (Cabeçalho)
                      </label>
                      <input
                        type="text"
                        value={settings.institutionName}
                        onChange={(e) => handleChange('institutionName', e.target.value)}
                        className="w-full text-xs h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500/40 focus:outline-none text-slate-200 transition"
                        placeholder="Ex: ACADEMY OF WILDLIFE MEDICINE"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400 font-bold">
                        Título Principal do Certificado
                      </label>
                      <input
                        type="text"
                        value={settings.certificateTitle}
                        onChange={(e) => handleChange('certificateTitle', e.target.value)}
                        className="w-full text-xs h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500/40 focus:outline-none text-slate-200 transition"
                        placeholder="Ex: Certificado de Conclusão"
                        required
                      />
                    </div>
                  </div>

                  {/* Description Textarea */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400 font-bold flex items-center gap-1">
                      <span>Texto de Outorga / Descritivo Geral</span>
                      <span className="text-[9px] lowercase font-normal text-slate-500">(Anuncia o aluno e outorga)</span>
                    </label>
                    <textarea
                      value={settings.textDescription}
                      onChange={(e) => handleChange('textDescription', e.target.value)}
                      rows={3}
                      className="w-full text-xs p-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500/40 focus:outline-none text-slate-200 transition resize-none leading-relaxed"
                      placeholder="Ex: por ter concluído integral e satisfatoriamente todas as aulas..."
                      required
                    />
                  </div>

                  {/* Metadata Textarea */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400 font-bold flex items-center gap-1">
                      <span>Texto Complementar / Carga Pedagógica</span>
                      <span className="text-[9px] lowercase font-normal text-slate-500">(Aceita tags dinâmicas)</span>
                    </label>
                    <textarea
                      value={settings.detailedMetadata}
                      onChange={(e) => handleChange('detailedMetadata', e.target.value)}
                      rows={3}
                      className="w-full text-xs p-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500/40 focus:outline-none text-slate-200 transition resize-none leading-relaxed font-sans"
                      placeholder="Insira o detalhamento de horas..."
                      required
                    />
                    <div className="text-[9px] font-mono text-slate-500 leading-normal bg-slate-950/50 p-2 border border-slate-850 rounded-lg flex items-start gap-1">
                      <HelpCircle size={10} className="shrink-0 mt-0.5 text-emerald-500/50" />
                      <span>
                        Tags: <code>{`{duration}`}</code> para carga horária e <code>{`{xpReward}`}</code> para XP.
                      </span>
                    </div>
                  </div>

                  {/* Signatures and Authority designations */}
                  <div className="border-t border-slate-800/60 pt-3">
                    <h5 className="text-[10px] font-mono uppercase tracking-widest text-[#ccdcd3] font-bold mb-2">Assinaturas e Autoridades</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400 font-bold">
                          Diretor Geral (Assinante Esquerdo)
                        </label>
                        <input
                          type="text"
                          value={settings.directorName}
                          onChange={(e) => handleChange('directorName', e.target.value)}
                          className="w-full text-xs h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500/40 focus:outline-none text-slate-200 transition"
                          placeholder="Ex: Dr. Alexandre Savana"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400 font-bold">
                          Docente Padrão (Assinante Direito)
                        </label>
                        <input
                          type="text"
                          value={settings.chiefInstructorName}
                          onChange={(e) => handleChange('chiefInstructorName', e.target.value)}
                          className="w-full text-xs h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500/40 focus:outline-none text-slate-200 transition"
                          placeholder="Ex: Coordenador Pedagógico"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Content: ARTE DE FUNDO */}
              {activeTab === 'art' && (
                <div className="space-y-4 animate-fade-in text-left">
                  <div className="border-b border-slate-800/80 pb-2">
                    <h4 className="text-xs font-mono uppercase tracking-widest text-[#ccdcd3] font-bold">Imagem de Fundo & Template PNG</h4>
                  </div>

                  <div className="p-3.5 rounded-xl border border-blue-500/10 bg-blue-500/5 text-slate-300 text-xs space-y-2 leading-relaxed">
                    <p className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <HelpCircle size={14} className="text-blue-400" />
                      Como funciona a personalização por PNG?
                    </p>
                    <ul className="list-disc pl-4 space-y-1.5 text-slate-400 text-[11px]">
                      <li>Faça o upload da arte completa do seu certificado estruturado em um arquivo de imagem <strong>PNG</strong> ou <strong>JPG</strong> (Tamanho recomendado de 1414x1000).</li>
                      <li>Ative o modo <strong>"Layout Customizado"</strong> abaixo para remover os adornos de medalha, borda verde e cores automáticas da plataforma.</li>
                      <li>Utilize a aba <strong>"Posições"</strong> para arrastar/ajustar a altura de cada campo de texto dinâmico para que eles fiquem alinhados perfeitamente acima da sua arte!</li>
                    </ul>
                  </div>

                  {/* File Upload Box */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400 font-bold">
                      Upload da Arte do Certificado (.png / .jpg)
                    </label>
                    
                    <div className="flex items-center gap-3">
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImageUpload} 
                        accept="image/png, image/jpeg" 
                        className="hidden" 
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 h-10 bg-slate-950 hover:bg-slate-850 border border-slate-850 hover:border-slate-800 text-slate-300 rounded-xl transition text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload size={14} />
                        <span>Escolher Arquivo</span>
                      </button>

                      {settings.backgroundImageUrl ? (
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="px-3 h-10 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl transition text-xs font-semibold flex items-center gap-1.5 cursor-pointer ml-auto"
                          title="Remover arte carregada"
                        >
                          <Trash2 size={14} />
                          <span>Remover Arte</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic block">Selecione uma imagem de no máximo 1.5MB</span>
                      )}
                    </div>

                    {settings.backgroundImageUrl && (
                      <div className="mt-2 text-[10px] text-emerald-400 font-mono leading-none flex items-center gap-1">
                        <CheckCircle size={12} />
                        <span>Imagem personalizada ativa! (Codificação em Base64 salva de forma direta).</span>
                      </div>
                    )}
                  </div>

                  {/* Toggle Custom Layout Mode */}
                  <div className="border-t border-slate-800/60 pt-4 mt-2">
                    <div className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-850 rounded-xl">
                      <div className="text-left max-w-[75%]">
                        <span className="block text-xs font-black text-slate-200">Ativar Layout Customizado</span>
                        <span className="block text-[10px] text-slate-500 font-mono leading-relaxed mt-0.5">
                          Substitui a borda padrão e radial da plataforma, aplicando sua arte PNG de fundo com posicionamentos específicos.
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => initLayoutDefaultsOrToggle(!settings.useCustomLayout)}
                        className={`w-14 h-7 rounded-full transition-colors relative focus:outline-none cursor-pointer p-0.5 ${
                          settings.useCustomLayout ? 'bg-emerald-500' : 'bg-slate-800'
                        }`}
                      >
                        <span 
                          className={`block h-6 w-6 rounded-full bg-slate-950 transition-all ${
                            settings.useCustomLayout ? 'translate-x-7 shadow shadow-slate-950/40' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                </div>
              )}

              {/* Tab Content: LAYOUT / POSIÇÕES */}
              {activeTab === 'layout' && (
                <div className="space-y-4 animate-fade-in text-left">
                  <div className="border-b border-slate-800/80 pb-2 mb-2 flex items-center justify-between">
                    <h4 className="text-xs font-mono uppercase tracking-widest text-[#ccdcd3] font-bold">Ajustes de Altura e Estilização</h4>
                    <span className="text-[9px] font-mono text-slate-500 lowercase bg-slate-950 px-2 py-0.5 rounded border border-slate-850">Unidades: % de altura & cqw</span>
                  </div>

                  {/* Presets and helpers */}
                  <p className="text-[10px] text-slate-400 font-mono italic leading-normal">
                    Arraste os sliders para posicionar as linhas horizontais de texto em relação ao seu template de arte PNG de fundo.
                  </p>

                  <div className="h-[360px] overflow-y-auto pr-2 space-y-4 text-xs">
                    
                    {/* Element 1: Instituição de Ensino */}
                    <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                        <span className="font-mono text-[9px] font-black uppercase text-emerald-400">1. Nome da Instituição (Cabeçalho)</span>
                        <input 
                          type="color" 
                          value={settings.customInstitutionColor || '#94a3b8'} 
                          onChange={(e) => handleChange('customInstitutionColor', e.target.value)}
                          className="w-5 h-5 bg-transparent border-0 cursor-pointer rounded overflow-hidden shadow"
                          title="Escolher Cor do Texto"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] text-slate-500 uppercase font-mono">
                            <span>Posição Top</span>
                            <span>{settings.customInstitutionTop ?? 14}%</span>
                          </div>
                          <input 
                            type="range" min="0" max="100" 
                            value={settings.customInstitutionTop ?? 14} 
                            onChange={(e) => handleChange('customInstitutionTop', parseInt(e.target.value))}
                            className="w-full accent-emerald-500 h-1.5 bg-slate-900 rounded-lg cursor-pointer"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] text-slate-500 uppercase font-mono">
                            <span>Tamanho Fonte</span>
                            <span>{settings.customInstitutionSize ?? 1.2}cqw</span>
                          </div>
                          <input 
                            type="range" min="0.5" max="5.0" step="0.1"
                            value={settings.customInstitutionSize ?? 1.2} 
                            onChange={(e) => handleChange('customInstitutionSize', parseFloat(e.target.value))}
                            className="w-full accent-emerald-500 h-1.5 bg-slate-900 rounded-lg cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Element 2: Título Principal */}
                    <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                        <span className="font-mono text-[9px] font-black uppercase text-emerald-400">2. Título Principal (Certificado...)</span>
                        <input 
                          type="color" 
                          value={settings.customTitleColor || '#ffffff'} 
                          onChange={(e) => handleChange('customTitleColor', e.target.value)}
                          className="w-5 h-5 bg-transparent border-0 cursor-pointer rounded overflow-hidden shadow"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] text-slate-500 uppercase font-mono">
                            <span>Posição Top</span>
                            <span>{settings.customTitleTop ?? 24}%</span>
                          </div>
                          <input 
                            type="range" min="0" max="100" 
                            value={settings.customTitleTop ?? 24} 
                            onChange={(e) => handleChange('customTitleTop', parseInt(e.target.value))}
                            className="w-full accent-emerald-500 h-1.5 bg-slate-900 rounded-lg cursor-pointer"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] text-slate-500 uppercase font-mono">
                            <span>Tamanho Fonte</span>
                            <span>{settings.customTitleSize ?? 3.5}cqw</span>
                          </div>
                          <input 
                            type="range" min="1.0" max="8.0" step="0.1"
                            value={settings.customTitleSize ?? 3.5} 
                            onChange={(e) => handleChange('customTitleSize', parseFloat(e.target.value))}
                            className="w-full accent-emerald-500 h-1.5 bg-slate-900 rounded-lg cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Element 3: Nome do Recipiente / Aluno */}
                    <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                        <span className="font-mono text-[9px] font-black uppercase text-emerald-400">3. Nome do Aluno</span>
                        <input 
                          type="color" 
                          value={settings.customRecipientColor || '#67e8f9'} 
                          onChange={(e) => handleChange('customRecipientColor', e.target.value)}
                          className="w-5 h-5 bg-transparent border-0 cursor-pointer rounded overflow-hidden shadow"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] text-slate-500 uppercase font-mono">
                            <span>Posição Top</span>
                            <span>{settings.customRecipientTop ?? 40}%</span>
                          </div>
                          <input 
                            type="range" min="0" max="100" 
                            value={settings.customRecipientTop ?? 40} 
                            onChange={(e) => handleChange('customRecipientTop', parseInt(e.target.value))}
                            className="w-full accent-emerald-500 h-1.5 bg-slate-900 rounded-lg cursor-pointer"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] text-slate-500 uppercase font-mono">
                            <span>Tamanho Nome</span>
                            <span>{settings.customRecipientSize ?? 2.2}cqw</span>
                          </div>
                          <input 
                            type="range" min="1.0" max="7.0" step="0.1"
                            value={settings.customRecipientSize ?? 2.2} 
                            onChange={(e) => handleChange('customRecipientSize', parseFloat(e.target.value))}
                            className="w-full accent-emerald-500 h-1.5 bg-slate-900 rounded-lg cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Element 4: Texto Descritivo */}
                    <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                        <span className="font-mono text-[9px] font-black uppercase text-emerald-400">4. Descritivo Geral / Outorga</span>
                        <input 
                          type="color" 
                          value={settings.customTextColor || '#cbd5e1'} 
                          onChange={(e) => handleChange('customTextColor', e.target.value)}
                          className="w-5 h-5 bg-transparent border-0 cursor-pointer rounded overflow-hidden shadow"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] text-slate-500 uppercase font-mono">
                            <span>Posição Top</span>
                            <span>{settings.customTextTop ?? 52}%</span>
                          </div>
                          <input 
                            type="range" min="0" max="100" 
                            value={settings.customTextTop ?? 52} 
                            onChange={(e) => handleChange('customTextTop', parseInt(e.target.value))}
                            className="w-full accent-emerald-500 h-1.5 bg-slate-900 rounded-lg cursor-pointer"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] text-slate-500 uppercase font-mono">
                            <span>Tamanho Fonte</span>
                            <span>{settings.customTextSize ?? 1.2}cqw</span>
                          </div>
                          <input 
                            type="range" min="0.5" max="4.0" step="0.1"
                            value={settings.customTextSize ?? 1.2} 
                            onChange={(e) => handleChange('customTextSize', parseFloat(e.target.value))}
                            className="w-full accent-emerald-500 h-1.5 bg-slate-900 rounded-lg cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Element 5: Nome do Curso */}
                    <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                        <span className="font-mono text-[9px] font-black uppercase text-emerald-400">5. Título do Curso Concluído</span>
                        <input 
                          type="color" 
                          value={settings.customCourseColor || '#34d399'} 
                          onChange={(e) => handleChange('customCourseColor', e.target.value)}
                          className="w-5 h-5 bg-transparent border-0 cursor-pointer rounded overflow-hidden shadow"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] text-slate-500 uppercase font-mono">
                            <span>Posição Top</span>
                            <span>{settings.customCourseTop ?? 62}%</span>
                          </div>
                          <input 
                            type="range" min="0" max="100" 
                            value={settings.customCourseTop ?? 62} 
                            onChange={(e) => handleChange('customCourseTop', parseInt(e.target.value))}
                            className="w-full accent-emerald-500 h-1.5 bg-slate-900 rounded-lg cursor-pointer"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] text-slate-500 uppercase font-mono">
                            <span>Tamanho Fonte</span>
                            <span>{settings.customCourseSize ?? 2.5}cqw</span>
                          </div>
                          <input 
                            type="range" min="1.0" max="6.0" step="0.1"
                            value={settings.customCourseSize ?? 2.5} 
                            onChange={(e) => handleChange('customCourseSize', parseFloat(e.target.value))}
                            className="w-full accent-emerald-500 h-1.5 bg-slate-900 rounded-lg cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Element 6: Metadata de Horas */}
                    <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                        <span className="font-mono text-[9px] font-black uppercase text-emerald-400">6. Carga Horária & Metadados</span>
                        <input 
                          type="color" 
                          value={settings.customMetaColor || '#64748b'} 
                          onChange={(e) => handleChange('customMetaColor', e.target.value)}
                          className="w-5 h-5 bg-transparent border-0 cursor-pointer rounded overflow-hidden shadow"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] text-slate-500 uppercase font-mono">
                            <span>Posição Top</span>
                            <span>{settings.customMetaTop ?? 72}%</span>
                          </div>
                          <input 
                            type="range" min="0" max="100" 
                            value={settings.customMetaTop ?? 72} 
                            onChange={(e) => handleChange('customMetaTop', parseInt(e.target.value))}
                            className="w-full accent-emerald-500 h-1.5 bg-slate-900 rounded-lg cursor-pointer"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] text-slate-500 uppercase font-mono">
                            <span>Tamanho Fonte</span>
                            <span>{settings.customMetaSize ?? 1.0}cqw</span>
                          </div>
                          <input 
                            type="range" min="0.5" max="4.0" step="0.1"
                            value={settings.customMetaSize ?? 1.0} 
                            onChange={(e) => handleChange('customMetaSize', parseFloat(e.target.value))}
                            className="w-full accent-emerald-500 h-1.5 bg-slate-900 rounded-lg cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Element 7: Assinaturas Bloco */}
                    <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                        <span className="font-mono text-[9px] font-black uppercase text-emerald-400">7. Bloco das Assinaturas</span>
                        <input 
                          type="color" 
                          value={settings.customSignaturesColor || '#cbd5e1'} 
                          onChange={(e) => handleChange('customSignaturesColor', e.target.value)}
                          className="w-5 h-5 bg-transparent border-0 cursor-pointer rounded overflow-hidden shadow"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] text-slate-500 uppercase font-mono">
                            <span>Posição Top</span>
                            <span>{settings.customSignaturesTop ?? 84}%</span>
                          </div>
                          <input 
                            type="range" min="0" max="100" 
                            value={settings.customSignaturesTop ?? 84} 
                            onChange={(e) => handleChange('customSignaturesTop', parseInt(e.target.value))}
                            className="w-full accent-emerald-500 h-1.5 bg-slate-900 rounded-lg cursor-pointer"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] text-slate-500 uppercase font-mono">
                            <span>Tamanho Fonte</span>
                            <span>{settings.customSignaturesSize ?? 1.1}cqw</span>
                          </div>
                          <input 
                            type="range" min="0.5" max="4.0" step="0.1"
                            value={settings.customSignaturesSize ?? 1.1} 
                            onChange={(e) => handleChange('customSignaturesSize', parseFloat(e.target.value))}
                            className="w-full accent-emerald-500 h-1.5 bg-slate-900 rounded-lg cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Element 8: QR Code da Plataforma */}
                    <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl space-y-2.5">
                      <div className="border-b border-slate-900 pb-1.5">
                        <span className="font-mono text-[9px] font-black uppercase text-emerald-400">8. Código QR de Validação</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[8px] text-slate-500 uppercase font-mono">
                            <span>Top</span>
                            <span>{settings.customQrTop ?? 78}%</span>
                          </div>
                          <input 
                            type="range" min="0" max="100" 
                            value={settings.customQrTop ?? 78} 
                            onChange={(e) => handleChange('customQrTop', parseInt(e.target.value))}
                            className="w-full accent-emerald-500 h-1 bg-slate-900 rounded-lg cursor-pointer"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[8px] text-slate-500 uppercase font-mono">
                            <span>Left</span>
                            <span>{settings.customQrLeft ?? 12}%</span>
                          </div>
                          <input 
                            type="range" min="0" max="100" 
                            value={settings.customQrLeft ?? 12} 
                            onChange={(e) => handleChange('customQrLeft', parseInt(e.target.value))}
                            className="w-full accent-emerald-500 h-1 bg-slate-900 rounded-lg cursor-pointer"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[8px] text-slate-500 uppercase font-mono">
                            <span>Lado/Tamanho</span>
                            <span>{settings.customQrSize ?? 10}cqw</span>
                          </div>
                          <input 
                            type="range" min="3" max="25" step="1"
                            value={settings.customQrSize ?? 10} 
                            onChange={(e) => handleChange('customQrSize', parseInt(e.target.value))}
                            className="w-full accent-emerald-500 h-1 bg-slate-900 rounded-lg cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="border-t border-slate-800/80 pt-4 flex items-center justify-between gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 h-10 rounded-xl text-xs font-semibold bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-850 hover:border-slate-800 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>Restaurar Valores Padrões</span>
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 h-10 bg-emerald-500 hover:bg-emerald-450 disabled:bg-emerald-650 text-slate-950 text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-md shadow-emerald-500/10"
                >
                  <Save size={14} className={isSaving ? "animate-spin" : ""} />
                  <span>{isSaving ? 'Salvando...' : 'Salvar Personalização'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>

        {/* Real-time Certificate Scaling Preview Pane */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-mono uppercase tracking-widest text-[#ccdcd3] font-bold flex items-center gap-1">
              <Eye size={12} className="text-emerald-400" />
              <span>Visualização Prévia Real-time</span>
            </h4>
            <span className="text-[9px] font-mono text-slate-500 lowercase bg-slate-950 px-2 py-0.5 rounded-full border border-slate-850">Corte Landscape A4</span>
          </div>

          <div className="bg-slate-950/80 border border-slate-850 p-3 sm:p-5 rounded-2xl flex flex-col items-center justify-center relative shadow-inner overflow-hidden min-h-[380px]">
            
            {/* Aspect container with Container Query enabled */}
            <div 
              className="w-full relative rounded-xl overflow-hidden aspect-[1.414/1] bg-slate-950 select-none scale-[0.98] transition-transform duration-300 border border-slate-850"
              style={{
                containerType: 'inline-size' as any,
                backgroundImage: settings.backgroundImageUrl ? `url(${settings.backgroundImageUrl})` : 'none',
                backgroundSize: '100% 100%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            >
              {settings.useCustomLayout ? (
                // CUSTOM EXPERT RENDER OVER CUSTOM TEMPLATE IMAGE
                <div className="absolute inset-0 w-full h-full text-center font-sans">
                  
                  {/* Institution */}
                  <div 
                    className="absolute left-0 w-full font-mono uppercase tracking-widest font-extrabold px-3 truncate"
                    style={{
                      top: `${settings.customInstitutionTop ?? 14}%`,
                      fontSize: `${settings.customInstitutionSize ?? 1.2}cqw`,
                      color: settings.customInstitutionColor ?? '#94a3b8'
                    }}
                  >
                    {settings.institutionName || 'NOME DA INSTITUIÇÃO'}
                  </div>

                  {/* Title */}
                  <div 
                    className="absolute left-0 w-full font-display font-black tracking-tight uppercase px-3 truncate"
                    style={{
                      top: `${settings.customTitleTop ?? 24}%`,
                      fontSize: `${settings.customTitleSize ?? 3.5}cqw`,
                      color: settings.customTitleColor ?? '#ffffff'
                    }}
                  >
                    {settings.certificateTitle || 'Título do Certificado'}
                  </div>

                  {/* Recipient Text Block */}
                  <div 
                    className="absolute left-0 w-full space-y-0.5 px-3"
                    style={{
                      top: `${settings.customRecipientTop ?? 40}%`,
                    }}
                  >
                    <p 
                      className="font-mono uppercase tracking-wide opacity-80"
                      style={{ fontSize: `${(settings.customRecipientSize ?? 2.2) * 0.4}cqw`, color: settings.customRecipientColor ?? '#67e8f9' }}
                    >
                      Este certificado honorário é outorgado a
                    </p>
                    <h3 
                      className="font-display font-bold font-serif leading-none italic truncate"
                      style={{ fontSize: `${settings.customRecipientSize ?? 2.2}cqw`, color: settings.customRecipientColor ?? '#67e8f9' }}
                    >
                      [Nome Completo do Aluno]
                    </h3>
                  </div>

                  {/* Description Text */}
                  <p 
                    className="absolute left-1/2 -translate-x-1/2 w-[85%] leading-relaxed"
                    style={{
                      top: `${settings.customTextTop ?? 52}%`,
                      fontSize: `${settings.customTextSize ?? 1.2}cqw`,
                      color: settings.customTextColor ?? '#cbd5e1'
                    }}
                  >
                    {settings.textDescription}
                  </p>

                  {/* Course Title Badge */}
                  <div 
                    className="absolute left-1/2 -translate-x-1/2 px-4 py-1.5 bg-slate-950/40 border border-slate-800/40 rounded-xl"
                    style={{
                      top: `${settings.customCourseTop ?? 62}%`,
                    }}
                  >
                    <span 
                      className="font-display font-bold tracking-wide truncate block"
                      style={{
                        fontSize: `${settings.customCourseSize ?? 2.5}cqw`,
                        color: settings.customCourseColor ?? '#34d399'
                      }}
                    >
                      [Nome do Curso Selecionado]
                    </span>
                  </div>

                  {/* Detailed Metadata hours */}
                  <p 
                    className="absolute left-1/2 -translate-x-1/2 w-[80%] leading-normal opacity-90"
                    style={{
                      top: `${settings.customMetaTop ?? 72}%`,
                      fontSize: `${settings.customMetaSize ?? 1.0}cqw`,
                      color: settings.customMetaColor ?? '#64748b'
                    }}
                  >
                    {settings.detailedMetadata
                      .replace('{duration}', '40 horas')
                      .replace('{xpReward}', '500')}
                  </p>

                  {/* QR code validation */}
                  <div 
                    className="absolute p-0.5 bg-white rounded flex items-center justify-center border border-slate-350"
                    style={{
                      top: `${settings.customQrTop ?? 78}%`,
                      left: `${settings.customQrLeft ?? 12}%`,
                      width: `${settings.customQrSize ?? 10}cqw`,
                      height: `${settings.customQrSize ?? 10}cqw`,
                    }}
                  >
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=example`}
                      alt="QR Code"
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Signatures Row */}
                  <div 
                    className="absolute w-[80%] left-1/2 -translate-x-1/2 grid grid-cols-2 gap-8 items-end"
                    style={{
                      top: `${settings.customSignaturesTop ?? 84}%`,
                      color: settings.customSignaturesColor ?? '#cbd5e1'
                    }}
                  >
                    {/* Signature 1 */}
                    <div className="flex flex-col items-center">
                      <span className="font-serif italic leading-none truncate block max-w-full mb-0.5" style={{ fontSize: `${(settings.customSignaturesSize ?? 1.1) * 0.9}cqw` }}>
                        {settings.directorName.replace(/^Dr\.\s+/i, '')}
                      </span>
                      <div className="h-[0.5px] w-full bg-slate-800/80" />
                      <span className="truncate max-w-full font-bold uppercase mt-1 leading-none font-mono" style={{ fontSize: `${(settings.customSignaturesSize ?? 1.1) * 0.7}cqw` }}>
                        {settings.directorName}
                      </span>
                      <span className="text-slate-600 uppercase font-mono mt-0.5" style={{ fontSize: `${(settings.customSignaturesSize ?? 1.1) * 0.5}cqw` }}>diretor(a) geral</span>
                    </div>

                    {/* Signature 2 */}
                    <div className="flex flex-col items-center">
                      <span className="font-serif italic leading-none truncate block max-w-full mb-0.5 text-emerald-450" style={{ fontSize: `${(settings.customSignaturesSize ?? 1.1) * 0.9}cqw` }}>
                        {settings.chiefInstructorName}
                      </span>
                      <div className="h-[0.5px] w-full bg-slate-800/80" />
                      <span className="truncate max-w-full font-bold uppercase mt-1 leading-none font-mono" style={{ fontSize: `${(settings.customSignaturesSize ?? 1.1) * 0.7}cqw` }}>
                        {settings.chiefInstructorName}
                      </span>
                      <span className="text-slate-600 uppercase font-mono mt-0.5" style={{ fontSize: `${(settings.customSignaturesSize ?? 1.1) * 0.5}cqw` }}>médico(a) veterinário(a) - palestrante</span>
                    </div>
                  </div>

                </div>
              ) : (
                // STANDARD ROYAL ACADEMY COATED DESIGN
                <div className="absolute inset-0 border-[5px] border-double border-teal-500/20 p-4 rounded-xl flex flex-col justify-between items-center text-center space-y-1 bg-slate-950 font-sans">
                  
                  {/* Decorative elements */}
                  <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(52,211,153,0.01)_0%,transparent_70%)] pointer-events-none" />
                  
                  {/* Crown badge */}
                  <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mt-1 scale-90 shrink-0">
                    <Award size={12} />
                  </div>

                  {/* Header */}
                  <div className="space-y-0.5 shrink-0">
                    <h6 className="font-mono text-[7px] uppercase tracking-widest text-[#ccdcd3] font-black">
                      {settings.institutionName || 'INSTITUTION'}
                    </h6>
                    <h1 className="font-display text-[10px] font-black tracking-tight text-white uppercase border-b border-emerald-500/10 pb-0.5 w-fit mx-auto">
                      {settings.certificateTitle || 'Certificate Title'}
                    </h1>
                  </div>

                  {/* Recipient */}
                  <div className="space-y-0.5 shrink-0">
                    <p className="font-mono text-[6px] text-slate-500 uppercase tracking-widest">
                      Este certificado honorário é outorgado a
                    </p>
                    <h3 className="font-display font-bold text-[11px] text-emerald-300 font-serif leading-none italic">
                      [Nome Completo do Aluno]
                    </h3>
                  </div>

                  {/* Description text */}
                  <p className="text-[7px] text-slate-400 leading-normal line-clamp-3 select-none px-2 shrink-0">
                    {settings.textDescription}
                  </p>

                  {/* Subject */}
                  <div className="bg-emerald-950/20 border border-slate-850 px-2 py-0.5 rounded shrink-0 w-fit mx-auto">
                    <span className="font-display text-[8px] font-bold text-white tracking-wide">
                      [Nome do Curso Selecionado]
                    </span>
                  </div>

                  {/* Metadata */}
                  <p className="text-[6px] text-slate-500 max-w-xs mx-auto leading-normal shrink-0">
                    {settings.detailedMetadata
                      .replace('{duration}', '40 horas')
                      .replace('{xpReward}', '500')}
                  </p>

                  {/* Signatures */}
                  <div className="w-full grid grid-cols-2 gap-4 pb-1 pt-1.5 border-t border-slate-900 items-end shrink-0">
                    <div className="flex flex-col items-center">
                      <span className="font-serif italic text-[7px] text-slate-400 leading-none mb-0.5">
                        {settings.directorName.replace(/^Dr\.\s+/i, '')}
                      </span>
                      <div className="h-[0.5px] w-12 bg-slate-800" />
                      <span className="text-[5px] font-mono text-slate-500 tracking-wider truncate max-w-full font-bold">
                        {settings.directorName}
                      </span>
                      <span className="text-[4px] text-slate-650 font-mono">Diretor(a) Geral</span>
                    </div>

                    <div className="flex flex-col items-center">
                      <span className="font-serif italic text-[7px] text-emerald-450 leading-none mb-0.5">
                        {settings.chiefInstructorName}
                      </span>
                      <div className="h-[0.5px] w-12 bg-slate-800" />
                      <span className="text-[5px] font-mono text-slate-500 tracking-wider truncate max-w-full font-bold">
                        {settings.chiefInstructorName}
                      </span>
                      <span className="text-[4px] text-slate-650 font-mono">Médico(a) Veterinário(a) - Palestrante</span>
                    </div>
                  </div>

                </div>
              )}

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
