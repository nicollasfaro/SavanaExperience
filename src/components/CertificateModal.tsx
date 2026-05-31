import React, { useState, useEffect } from 'react';
import { Award, Download, Printer, Share2, X, Check, ShieldCheck, Sparkles, Loader2 } from 'lucide-react';
import { localDB } from '../firebase';
import { IssuedCertificate } from '../types';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  studentName: string;
  courseTitle: string;
  instructorName: string;
  courseId: string;
  duration: string;
  xpReward: number;
}

export function CertificateModal({
  isOpen,
  onClose,
  userId,
  studentName,
  courseTitle,
  instructorName,
  courseId,
  duration,
  xpReward
}: CertificateModalProps) {
  const [copied, setCopied] = useState(false);
  const [cert, setCert] = useState<IssuedCertificate | null>(null);

  const certSettings = localDB.getCertificateSettings();

  useEffect(() => {
    if (!isOpen) return;

    // Check if certificate has already been issued
    const list = localDB.getIssuedCertificates(userId);
    const existing = list.find((c: IssuedCertificate) => c.courseId === courseId);

    if (existing) {
      setCert(existing);
    } else {
      // Create a unique, once-and-for-all Certificate object
      const issueDate = new Date();
      
      const yearChar = issueDate.getFullYear().toString().slice(-2);
      const monthChar = (issueDate.getMonth() + 1).toString().padStart(2, '0');
      const studentPrefix = studentName.trim().replace(/\s+/g, '').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'STU';
      const coursePrefix = courseId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'CRS';
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const uniqueCertId = `SV-${yearChar}${monthChar}-${studentPrefix}-${coursePrefix}-${randomSuffix}`;

      const newCert: IssuedCertificate = {
        id: uniqueCertId,
        userId,
        userName: studentName,
        courseId,
        courseTitle,
        instructorName: instructorName && instructorName !== "Coordenador Docente" 
          ? instructorName 
          : certSettings.chiefInstructorName,
        duration: duration || "40 horas",
        xpReward: xpReward || 500,
        issuedAt: issueDate.toISOString()
      };

      localDB.saveIssuedCertificate(newCert);
      setCert(newCert);
    }
  }, [isOpen, userId, courseId, studentName, courseTitle, instructorName, duration, xpReward, certSettings.chiefInstructorName]);

  if (!isOpen) return null;
  if (!cert) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <div className="text-center space-y-3">
          <Loader2 className="animate-spin text-emerald-400 mx-auto" size={36} />
          <p className="text-xs text-slate-400 font-mono">Gerando seu Certificado Único...</p>
        </div>
      </div>
    );
  }

  // Use the loaded static certification parameters
  const issueDateParsed = new Date(cert.issuedAt);
  const formattedDate = issueDateParsed.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const certificateId = cert.id;

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    const shareText = `Orgulho em compartilhar meu Certificado de Conclusão do curso "${cert.courseTitle}" pela Savana XP! 🎓 Autenticação/Validar ID: ${certificateId}`;
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const detailText = certSettings.detailedMetadata
    .replace('{duration}', cert.duration)
    .replace('{xpReward}', `+${cert.xpReward} XP`);

  // Signatures mapping
  const directorSignInitial = certSettings.directorName.replace(/^Dr\.\s+/i, '');
  const instructorAssigned = cert.instructorName;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Print custom override stylesheet */}
      <style>{`
        @media print {
          /* General resets */
          body * {
            visibility: hidden !important;
          }
          /* Make ONLY the certificate printable */
          #printable-certificate, #printable-certificate * {
            visibility: visible !important;
          }
          #printable-certificate {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            margin: 0 !important;
            padding: 40px !important;
            box-sizing: border-box !important;
            background: white !important;
            color: #060c09 !important;
            box-shadow: none !important;
            border: 12px double #88aa57 !important;
            border-radius: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            align-items: center !important;
            text-align: center !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/90 backdrop-blur-md transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Card wrapper */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl relative z-10 shadow-2xl p-6 sm:p-8 animate-fade-in my-8 max-h-[95vh] overflow-y-auto">
        
        {/* Modal close */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 p-2 hover:bg-slate-850 rounded-xl transition-all cursor-pointer no-print"
          id="btn-close-certificate"
          title="Fechar"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="mb-6 space-y-1 no-print">
          <div className="flex items-center gap-2 text-amber-400">
            <Sparkles size={16} />
            <span className="text-[10px] tracking-widest font-mono uppercase font-bold">Certificação Exclusiva</span>
          </div>
          <h3 className="font-display text-lg sm:text-xl font-bold text-slate-100">Seu Certificado está pronto!</h3>
          <p className="text-xs text-slate-400">Você concluiu com maestria 100% da grade curricular do curso.</p>
        </div>

        {/* Certificate Display Screen */}
        <div 
          id="printable-certificate"
          className="bg-slate-950 border-8 border-double border-teal-500/30 p-8 sm:p-12 md:p-16 rounded-2xl relative overflow-hidden flex flex-col justify-between items-center text-center shadow-inner select-none"
        >
          {/* Certificate watermarks and radial decoration */}
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(38,121,68,0.03)_0%,transparent_70%)] pointer-events-none" />
          
          <div className="absolute -top-32 -left-32 w-64 h-64 border border-teal-500/5 rounded-full pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-64 h-64 border border-teal-500/5 rounded-full pointer-events-none" />
          
          {/* Certificate Header logo & title */}
          <div className="space-y-4 relative z-10 w-full flex flex-col items-center">
            {/* Crown icon badge style */}
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg mb-2">
              <Award size={28} className="animate-pulse" />
            </div>
            
            <h4 className="font-mono text-[10px] sm:text-xs uppercase tracking-widest text-[#ccdcd3] font-extrabold pr-1">
              {certSettings.institutionName}
            </h4>
            
            <h1 className="font-display text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white mt-1 border-b-2 border-emerald-500/20 pb-4 max-w-xl mx-auto uppercase">
              {certSettings.certificateTitle}
            </h1>
          </div>

          {/* Certificate Recipient & core text */}
          <div className="my-8 sm:my-12 relative z-10 space-y-6 max-w-2xl mx-auto">
            <p className="font-mono text-xs sm:text-sm text-slate-400 uppercase tracking-wide">
              Este certificado honorário é orgulhosamente outorgado a
            </p>
            
            <h2 className="font-display text-xl sm:text-3xl md:text-4xl font-extrabold tracking-normal text-emerald-300 py-1 font-serif underline decoration-emerald-500/30 underline-offset-8">
              {studentName}
            </h2>
            
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl mx-auto">
              {certSettings.textDescription}
            </p>

            <h3 className="font-display text-lg sm:text-2xl font-bold text-white tracking-wide bg-emerald-900/10 border border-slate-850 py-3 px-5 rounded-xl max-w-lg mx-auto">
              {courseTitle}
            </h3>

            <p className="text-[11px] sm:text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              {detailText}
            </p>
          </div>

          {/* Certificate Footer Stamp & Signatures */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-end mt-4 pt-6 border-t border-slate-900/80 relative z-10">
            
            {/* Signature 1 */}
            <div className="flex flex-col items-center text-center space-y-1">
              <span className="font-serif italic text-xs text-slate-400 border-none select-none">
                {directorSignInitial}
              </span>
              <div className="h-[1px] w-32 bg-slate-800" />
              <span className="text-[9px] uppercase tracking-wider font-mono text-slate-500 font-bold">
                {certSettings.directorName}
              </span>
              <span className="text-[8px] text-slate-550 lowercase">
                diretor de ensino
              </span>
            </div>

            {/* Verification Stamp badge */}
            <div className="flex flex-col items-center justify-center shrink-0">
              <div className="relative flex items-center justify-center w-16 h-16 rounded-full border border-emerald-500/20 bg-emerald-500/5 rotate-12">
                <ShieldCheck size={32} className="text-[#3bac6b] fill-[#3bac6b]/5" />
                <span className="absolute text-[6px] font-mono font-black text-emerald-400 tracking-tighter uppercase whitespace-nowrap animate-spin-slow">
                  SNC • VERIFICADO • SNC • VERIFICADO
                </span>
              </div>
              <span className="text-[8px] font-mono text-slate-500 mt-2 block tracking-widest leading-none">
                REGISTRO N° {certificateId.slice(3, 11)}
              </span>
            </div>

            {/* Validation QR Code */}
            <div className="flex flex-col items-center justify-center space-y-1.5 border-none">
              <div className="p-1 px-[5px] bg-white rounded-lg shadow-md border border-slate-800 shrink-0">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`${window.location.origin}?validate=${certificateId}`)}`}
                  alt="QR Code de Autenticidade"
                  className="w-16 h-16 sm:w-16 sm:h-16"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="text-[7px] font-mono text-slate-500 uppercase tracking-widest font-black leading-none">
                Código QR de Validação
              </span>
            </div>

            {/* Signature 2 */}
            <div className="flex flex-col items-center text-center space-y-1">
              <span className="font-serif italic text-xs text-emerald-200/80 border-none select-none">
                {instructorAssigned}
              </span>
              <div className="h-[1px] w-32 bg-slate-800" />
              <span className="text-[9px] uppercase tracking-wider font-mono text-slate-500 font-bold">
                {instructorAssigned}
              </span>
              <span className="text-[8px] text-slate-550 lowercase">
                instrutor chefe
              </span>
            </div>

          </div>

          {/* Verification Code Footer Metadata */}
          <div className="mt-8 border-t border-slate-900/60 pt-4 w-full flex flex-col sm:flex-row justify-between items-center text-[9px] font-mono text-slate-500 gap-2">
            <span>Emitido e outorgado em {formattedDate}</span>
            <span className="flex items-center gap-1">
              <span>Chave de Verificação:</span>
              <strong className="text-slate-400">{certificateId}</strong>
            </span>
            <span>Autenticação Digital Ativa</span>
          </div>

        </div>

        {/* Action Controls for Modal */}
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-slate-800 pt-5 no-print">
          
          <p className="text-[11px] text-slate-450 leading-relaxed font-mono max-w-sm text-center sm:text-left">
            A autenticidade deste documento digital pode ser confirmada permanentemente na rede utilizando a chave estudantil única informada no rodapé.
          </p>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Share certificate link */}
            <button
              onClick={handleShare}
              className="flex-1 sm:flex-none uppercase font-mono font-bold tracking-wider text-[10px] h-10 px-4 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-800 hover:text-slate-100"
              title="Copiar link de validação para compartilhar"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Share2 size={12} />}
              <span>{copied ? 'Copiado!' : 'Compartilhar'}</span>
            </button>

            {/* Print action (safest download option in SPA environments) */}
            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-none uppercase font-mono font-bold tracking-wider text-[10px] h-10 px-5 bg-emerald-500 hover:bg-emerald-450 text-slate-950 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/10 font-black"
            >
              <Printer size={13} className="shrink-0" />
              <span>Imprimir / PDF</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
