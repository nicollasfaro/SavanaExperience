import React, { useState, useEffect } from 'react';
import { Award, ShieldCheck, ShieldAlert, Search, X, Calendar, User, Clock, CheckCircle2, Sparkles, HelpCircle } from 'lucide-react';
import { localDB } from '../firebase';
import { IssuedCertificate } from '../types';

interface CertificateValidatorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CertificateValidator({ isOpen, onClose }: CertificateValidatorProps) {
  const [certCode, setCertCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<{
    status: 'idle' | 'valid' | 'invalid';
    certificate?: IssuedCertificate;
  }>({ status: 'idle' });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const validateId = params.get('validate');
    if (validateId) {
      setCertCode(validateId);
      setIsValidating(true);
      setResult({ status: 'idle' });

      const timer = setTimeout(async () => {
        try {
          const certificate = await localDB.validateCertificate(validateId);
          if (certificate) {
            setResult({ status: 'valid', certificate });
          } else {
            setResult({ status: 'invalid' });
          }
        } catch (err) {
          console.error(err);
          setResult({ status: 'invalid' });
        } finally {
          setIsValidating(false);
        }
      }, 900);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!isOpen) return null;

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certCode.trim()) return;

    setIsValidating(true);
    setResult({ status: 'idle' });

    // Wait 900ms for simulated blockchain/registrar ledger check
    setTimeout(async () => {
      try {
        const certificate = await localDB.validateCertificate(certCode);
        if (certificate) {
          setResult({ status: 'valid', certificate });
        } else {
          setResult({ status: 'invalid' });
        }
      } catch (err) {
        console.error(err);
        setResult({ status: 'invalid' });
      } finally {
        setIsValidating(false);
      }
    }, 900);
  };

  const handleClear = () => {
    setCertCode('');
    setResult({ status: 'idle' });
  };

  return (
    <div id="cert-validator-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      
      {/* Main Dialog Box */}
      <div 
        id="cert-validator-modal"
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[85vh] animate-scale-up"
      >
        
        {/* Subtle decorative background gradient */}
        <div className="absolute top-0 inset-x-0 h-40 bg-[linear-gradient(to_bottom,rgba(16,185,129,0.06),transparent)] pointer-events-none" />

        {/* Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Award size={18} />
            </div>
            <div>
              <h3 className="font-display font-bold text-slate-100 flex items-center gap-1.5 leading-tight">
                <span>Validador de Certificados</span>
                <Sparkles size={13} className="text-emerald-400 animate-pulse" />
              </h3>
              <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mt-0.5">
                Verificador de Originalidade com Assinatura Digital
              </p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 bg-slate-950/40 hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 relative z-10 flex-1">
          
          <p className="text-xs text-slate-350 leading-relaxed max-w-lg">
            Insira o código de autenticação único localizado no rodapé do documento para atestar a autenticidade pedagógica, carga horária e validade legal do certificado emitido.
          </p>

          {/* Validation Form */}
          <form onSubmit={handleValidate} className="flex gap-2.5">
            <div className="relative flex-1">
              <input
                type="text"
                value={certCode}
                onChange={(e) => setCertCode(e.target.value)}
                placeholder="Ex: SV-2605-ALU-CUR-7482"
                className="w-full text-xs h-12 pl-11 pr-4 bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-xl focus:outline-none text-slate-200 uppercase font-mono tracking-wider transition"
                required
              />
              <Search className="absolute left-4 top-3.5 text-slate-500" size={16} />
              {certCode && !isValidating && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300"
                >
                  Limpar
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isValidating || !certCode.trim()}
              className="px-6 h-12 bg-emerald-500 hover:bg-emerald-450 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer shrink-0 shadow-md shadow-emerald-500/10 flex items-center justify-center gap-2 font-mono"
            >
              {isValidating ? (
                <>
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Validando...</span>
                </>
              ) : (
                <span>Validar</span>
              )}
            </button>
          </form>

          {/* Verification Results Pane */}
          <div className="space-y-4">
            
            {/* IDLE / HOW TO USE */}
            {result.status === 'idle' && !isValidating && (
              <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl flex items-start gap-3">
                <HelpCircle size={18} className="text-emerald-400/70 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-300">Como funciona a autenticação?</span>
                  <p className="text-[11px] text-slate-450 leading-relaxed">
                    Cada certificado gerado na Savana XP recebe uma hash criptográfica gerada por nossa infraestrutura de ensino veterinário, atrelando de forma indelével o nome do aluno completo, a data exata e o professor outorgante. Certificações não registradas ou alteradas falharão na validação.
                  </p>
                </div>
              </div>
            )}

            {/* VALID STATUS / Holographic Success Card */}
            {result.status === 'valid' && result.certificate && (
              <div className="border border-emerald-500/30 bg-emerald-[950]/15 rounded-3xl p-5 sm:p-6 space-y-5 animate-scale-up relative overflow-hidden shadow-lg shadow-emerald-950/10">
                {/* Visual Accent watermark */}
                <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                
                {/* Verification result title */}
                <div className="flex items-center gap-3 border-b border-emerald-500/10 pb-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <ShieldCheck size={22} className="fill-emerald-400/5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono tracking-widest text-emerald-400 font-extrabold uppercase block leading-none">Status</span>
                    <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 mt-1 leading-none">
                      Certificado de Conclusão Autêntico & Ativo
                    </h4>
                  </div>
                </div>

                {/* Details layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  
                  <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-850 text-xs">
                    <span className="block text-[9px] font-mono uppercase text-slate-500 font-bold">Aluno Certificado</span>
                    <div className="flex items-center gap-1.5 mt-1 text-slate-200">
                      <User size={13} className="text-emerald-400" />
                      <span className="font-bold">{result.certificate.userName}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-850 text-xs">
                    <span className="block text-[9px] font-mono uppercase text-slate-500 font-bold">Curso Realizado</span>
                    <div className="flex items-center gap-1.5 mt-1 text-slate-200">
                      <Award size={13} className="text-emerald-400" />
                      <span className="font-bold">{result.certificate.courseTitle}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-850 text-xs">
                    <span className="block text-[9px] font-mono uppercase text-slate-500 font-bold">Carga Horária & XP</span>
                    <div className="flex items-center gap-1.5 mt-1 text-slate-200">
                      <Clock size={13} className="text-slate-400" />
                      <span>{result.certificate.duration} • </span>
                      <span className="text-emerald-400 font-bold">+{result.certificate.xpReward} XP</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-850 text-xs">
                    <span className="block text-[9px] font-mono uppercase text-slate-500 font-bold">Data de Emissão</span>
                    <div className="flex items-center gap-1.5 mt-1 text-slate-200">
                      <Calendar size={13} className="text-slate-400" />
                      <span>
                        {new Date(result.certificate.issuedAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>

                </div>

                {/* Authority bottom stamp */}
                <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center text-[10px] font-mono text-slate-500 gap-2">
                  <span className="flex items-center gap-1 text-emerald-500/80">
                    <CheckCircle2 size={12} />
                    <span>Ledger ID: {result.certificate.id}</span>
                  </span>
                  <span>Chancela: {result.certificate.instructorName}</span>
                </div>

              </div>
            )}

            {/* INVALID STATUS / Error Alert Card */}
            {result.status === 'invalid' && (
              <div className="border border-red-500/30 bg-red-950/15 rounded-3xl p-5 sm:p-6 space-y-4 animate-scale-up relative">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                    <ShieldAlert size={22} className="fill-red-400/5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono tracking-widest text-red-400 font-extrabold uppercase block leading-none">Validação Falhou</span>
                    <h4 className="text-sm font-bold text-slate-100 mt-1 leading-none">
                      Certificado Não Encontrado
                    </h4>
                  </div>
                </div>

                <div className="text-xs text-red-300 leading-relaxed space-y-2">
                  <p>
                    A chave inserida <code className="bg-red-950 p-1 rounded border border-red-900/50 text-white font-mono uppercase">{certCode}</code> não foi localizada nos registros ativos da Savana XP.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Por favor, verifique se o código possui digitação incorreta (letras maiúsculas e traços são importantes) ou entre em contato com a equipe pedagógica de suporte.
                  </p>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-850 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 h-9 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition"
          >
            Fechar Validador
          </button>
        </div>

      </div>
    </div>
  );
}
