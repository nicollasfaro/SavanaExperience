import React, { useState, useEffect } from 'react';
import { Award, Save, RotateCcw, AlertCircle, CheckCircle, HelpCircle, Eye } from 'lucide-react';
import { CertificateSettings } from '../types';
import { localDB } from '../firebase';
import { INITIAL_CERTIFICATE_SETTINGS } from '../data';

export function CertificateSettingsPanel() {
  const [settings, setSettings] = useState<CertificateSettings>(() => localDB.getCertificateSettings());
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Sync state if settings change in localDB
  useEffect(() => {
    const handleSync = () => {
      setSettings(localDB.getCertificateSettings());
    };
    const unsub = localDB.onChange('certificateSettings', handleSync);
    return () => unsub();
  }, []);

  const handleChange = (key: keyof CertificateSettings, value: string) => {
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
    if (window.confirm('Tem certeza de que deseja restaurar os textos padrões originais do certificado?')) {
      setSettings({ ...INITIAL_CERTIFICATE_SETTINGS });
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Header */}
      <div>
        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Award className="text-emerald-400" size={20} />
          <span>Personalização de Certificados</span>
        </h3>
        <p className="text-xs text-slate-400">
          Personalize as assinaturas digitais, textos institucionais e o layout padrão dos certificados outorgados aos concluintes da plataforma.
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

      {/* Split view: Form & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Editor Form Columns */}
        <form onSubmit={handleSave} className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl">
          
          <div className="border-b border-slate-800/80 pb-3">
            <h4 className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold">Campos do Documento</h4>
          </div>

          <div className="space-y-4">
            {/* Institution and Title side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400 font-bold">
                  Nome da Instituição (Cabeçalho)
                </label>
                <input
                  type="text"
                  value={settings.institutionName}
                  onChange={(e) => handleChange('institutionName', e.target.value)}
                  className="w-full text-xs h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500/40 focus:outline-none text-slate-200 transition"
                  placeholder="Ex: SAVANA XP • ACADEMY OF WILDLIFE MEDICINE"
                  required
                />
              </div>

              <div className="space-y-1.5 text-left">
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
            <div className="space-y-1.5 text-left">
              <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400 font-bold flex items-center gap-1">
                <span>Texto de Outorga / Descritivo Geral</span>
                <span className="text-[9px] lowercase font-normal text-slate-500">(Antes do título do curso)</span>
              </label>
              <textarea
                value={settings.textDescription}
                onChange={(e) => handleChange('textDescription', e.target.value)}
                rows={3}
                className="w-full text-xs p-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500/40 focus:outline-none text-slate-200 transition resize-none leading-relaxed"
                placeholder="Insira o texto geral..."
                required
              />
            </div>

            {/* Metadata Textarea */}
            <div className="space-y-1.5 text-left">
              <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400 font-bold flex items-center gap-1">
                <span>Texto Complementar / Carga Pedagógica</span>
                <span className="text-[9px] lowercase font-normal text-slate-500">(Aceita tags dinâmicas)</span>
              </label>
              <textarea
                value={settings.detailedMetadata}
                onChange={(e) => handleChange('detailedMetadata', e.target.value)}
                rows={4}
                className="w-full text-xs p-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500/40 focus:outline-none text-slate-200 transition resize-none leading-relaxed font-sans"
                placeholder="Insira o detalhamento..."
                required
              />
              <div className="text-[9px] font-mono text-slate-500 leading-normal bg-slate-950/50 p-2.5 border border-slate-850 rounded-lg flex items-start gap-1">
                <HelpCircle size={10} className="shrink-0 mt-0.5 text-emerald-500/50" />
                <span>
                  <strong>Tags Disponíveis:</strong> Use <code>{`{duration}`}</code> para carga horária e <code>{`{xpReward}`}</code> para recompensa do curso. Eles serão substituídos pelas propriedades do curso correspondente no ato de emissão.
                </span>
              </div>
            </div>

            {/* Signatures and Authority designations */}
            <div className="border-t border-slate-800/60 pt-4 mt-2">
              <h5 className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold mb-3">Assinaturas e Chancelas</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 text-left">
                  <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400 font-bold">
                    Diretor de Ensino (Assinante Esquerdo)
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

                <div className="space-y-1.5 text-left">
                  <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400 font-bold">
                    Instrutor Chefe Padrão (Assinante Direito)
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

          {/* Form Actions */}
          <div className="border-t border-slate-800/80 pt-4 flex items-center justify-between gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 h-10 rounded-xl text-xs font-semibold bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-850 hover:border-slate-800 transition flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Restaurar Padrão</span>
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 h-10 bg-emerald-500 hover:bg-emerald-450 disabled:bg-emerald-650 text-slate-950 text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-md shadow-emerald-500/10"
            >
              <Save size={14} className={isSaving ? "animate-spin" : ""} />
              <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>

        </form>

        {/* Real-time Certificate Scaling Preview Pane */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold flex items-center gap-1">
              <Eye size={12} className="text-emerald-400" />
              <span>Visualização Prévia Real-time</span>
            </h4>
            <span className="text-[9px] font-mono text-slate-500 lowercase bg-slate-950 px-2 py-0.5 rounded-full border border-slate-850">Lado do Estudante</span>
          </div>

          <div className="bg-slate-950/80 border border-slate-850 p-4 sm:p-6 rounded-2xl flex flex-col items-center justify-center relative shadow-inner overflow-hidden min-h-[360px]">
            {/* Watermark decors */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(52,211,153,0.02)_0%,transparent_70%)] pointer-events-none" />
            <div className="absolute top-2 left-2 w-8 h-8 border border-emerald-500/10 rounded-full" />
            <div className="absolute bottom-2 right-2 w-8 h-8 border border-emerald-500/10 rounded-full" />

            {/* Cert Template Scale wrapper */}
            <div className="w-full bg-slate-950 border-[3px] border-emerald-500/20 p-5 rounded-xl border-dashed relative flex flex-col justify-between items-center text-center space-y-4 select-none scale-[0.98] transition-transform duration-300">
              
              {/* Crown badge */}
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Award size={16} />
              </div>

              {/* Header */}
              <div className="space-y-1">
                <h6 className="font-mono text-[7px] uppercase tracking-widest text-slate-400 font-extrabold">
                  {settings.institutionName || 'INSTITUTION TITLE'}
                </h6>
                <h1 className="font-display text-sm font-black tracking-tight text-white uppercase border-b border-emerald-500/20 pb-1 w-fit mx-auto">
                  {settings.certificateTitle || 'Certificate Title'}
                </h1>
              </div>

              {/* Recipient */}
              <div className="space-y-1.5 max-w-xs mx-auto">
                <p className="font-mono text-[7px] text-slate-500 uppercase">
                  Este certificado honorário é outorgado a
                </p>
                <h3 className="font-display font-bold text-xs text-emerald-300 font-serif leading-none italic">
                  [Nome Completo do Aluno]
                </h3>
              </div>

              {/* Main text description */}
              <p className="text-[8px] text-slate-400 line-clamp-3 leading-relaxed max-w-xs mx-auto">
                {settings.textDescription}
              </p>

              {/* Subject placeholder */}
              <div className="bg-emerald-950/20 border border-slate-850 px-3 py-1.5 rounded-lg w-fit mx-auto">
                <span className="font-display text-[9px] font-bold text-white tracking-wide">
                  [Nome do Curso Selecionado]
                </span>
              </div>

              {/* Detailed custom Metadata */}
              <p className="text-[7px] text-slate-500 max-w-xs mx-auto leading-normal">
                {settings.detailedMetadata
                  .replace('{duration}', '40 horas')
                  .replace('{xpReward}', '500')}
              </p>

              {/* Signatures Row */}
              <div className="w-full grid grid-cols-2 gap-4 pt-3 border-t border-slate-900/40 items-end">
                <div className="flex flex-col items-center">
                  <span className="font-serif italic text-[8px] text-slate-400 leading-none mb-0.5">
                    {settings.directorName.replace(/^Dr\.\s+/i, '')}
                  </span>
                  <div className="h-[0.5px] w-16 bg-slate-800" />
                  <span className="text-[6px] font-mono text-slate-500 tracking-wider truncate max-w-full font-bold">
                    {settings.directorName}
                  </span>
                  <span className="text-[5px] text-slate-600 font-mono">diretor de ensino</span>
                </div>

                <div className="flex flex-col items-center">
                  <span className="font-serif italic text-[8px] text-emerald-450 leading-none mb-0.5">
                    {settings.chiefInstructorName}
                  </span>
                  <div className="h-[0.5px] w-16 bg-slate-800" />
                  <span className="text-[6px] font-mono text-slate-500 tracking-wider truncate max-w-full font-bold">
                    {settings.chiefInstructorName}
                  </span>
                  <span className="text-[5px] text-slate-600 font-mono">instrutor chefe</span>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
