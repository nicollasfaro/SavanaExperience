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
  const [activeTab, setActiveTab] = useState<'front' | 'back'>('front');

  const certSettings = localDB.getCertificateSettings();

  useEffect(() => {
    if (!isOpen) return;

    const checkAndIssue = async () => {
      // Check if certificate has already been issued
      const existing = await localDB.getCertificateByUserAndCourse(userId, courseId);

      if (existing) {
        if (existing.userName !== studentName) {
          const updatedCert = { ...existing, userName: studentName };
          await localDB.saveIssuedCertificate(updatedCert);
          setCert(updatedCert);
        } else {
          setCert(existing);
        }
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

        await localDB.saveIssuedCertificate(newCert);
        setCert(newCert);
      }
    };

    checkAndIssue();
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
  const instructorAssigned = (instructorName && instructorName !== "Coordenador Docente")
    ? instructorName 
    : (cert.instructorName && cert.instructorName !== "Coordenador Docente")
      ? cert.instructorName
      : certSettings.chiefInstructorName;

  // Retrieve course modules for the syllabus backpage
  const courseModules = localDB.getModules().filter(m => m.courseId === courseId);
  const sortedModules = [...courseModules].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <div id="certificate-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Print custom override stylesheet */}
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 0;
          }
          html, body {
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
            overflow: visible !important;
          }
          body {
            min-height: 0 !important;
            display: block !important;
          }
          body * {
            visibility: hidden !important;
          }
          /* Print only the certificate container block */
          #print-container, #print-container * {
            visibility: visible !important;
          }
          
          /* Reset parent overlay, root wrapper and all ancestors to clean layouts to prevent extra offsets */
          #root, #root > * {
            margin: 0 !important;
            padding: 0 !important;
            position: static !important;
            display: block !important;
            width: auto !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            transform: none !important;
          }
          #certificate-modal-overlay {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
            overflow: visible !important;
            background: transparent !important;
            z-index: 9999999 !important;
            box-shadow: none !important;
            visibility: visible !important;
          }
          #certificate-modal-wrapper {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: none !important;
            height: auto !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
            overflow: visible !important;
            border: none !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            visibility: visible !important;
          }

          #print-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
            background: transparent !important;
            visibility: visible !important;
          }
          #certificate-front, #certificate-back {
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            box-sizing: border-box !important;
            width: 100vw !important;
            height: 100vh !important;
            max-width: none !important;
            max-height: none !important;
            margin: 0 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            container-type: inline-size !important;
            position: relative !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            visibility: visible !important;
          }
          #certificate-front {
            padding: ${certSettings.useCustomLayout ? '0' : '3.5rem'} !important;
            page-break-after: always !important;
            break-after: page !important;
            background-color: ${certSettings.useCustomLayout ? 'transparent' : '#020617'} !important;
            border: none !important;

            /* Override container query units with viewport widths (vw) on print so printing engines scale text perfectly */
            --inst-size: ${(certSettings.customInstitutionSize ?? 1.2) * 0.95}vw !important;
            --title-size: ${(certSettings.customTitleSize ?? 3.5) * 0.95}vw !important;
            --recipient-size: ${(certSettings.customRecipientSize ?? 2.2) * 0.9}vw !important;
            --recipient-sub-size: ${(certSettings.customRecipientSize ?? 2.2) * 0.4}vw !important;
            --desc-size: ${(certSettings.customTextSize ?? 1.2) * 0.8}vw !important;
            --course-size: ${(certSettings.customCourseSize ?? 2.5) * 0.82}vw !important;
            --meta-size: ${(certSettings.customMetaSize ?? 1.0) * 0.85}vw !important;
            --signatures-size: ${certSettings.customSignaturesSize ?? 1.1}vw !important;
            --qr-size: ${certSettings.customQrSize ?? 10}vw !important;
            --sig-init-size: ${(certSettings.customSignaturesSize ?? 1.1) * 0.9}vw !important;
            --sig-name-size: ${(certSettings.customSignaturesSize ?? 1.1) * 0.7}vw !important;
            --sig-title-size: ${(certSettings.customSignaturesSize ?? 1.1) * 0.5}vw !important;
            --footnote-size: 0.45vw !important;
          }
          #certificate-front * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #certificate-back {
            padding: 3.5rem !important;
            background-color: transparent !important;
            color: #090d16 !important;
            border: 12px double rgba(9, 13, 22, 0.4) !important;
          }
          #certificate-back * {
            color: #090d16 !important;
            border-color: rgba(9, 13, 22, 0.2) !important;
            background-color: transparent !important;
          }
          #certificate-back .text-emerald-400,
          #certificate-back .text-emerald-700,
          #certificate-back .text-emerald-600 {
            color: #047857 !important;
          }
          #certificate-back .bg-emerald-500\/10 {
            background-color: rgba(4, 120, 87, 0.08) !important;
          }
          #certificate-back .bg-slate-900\/40, 
          #certificate-back .bg-slate-50 {
            background-color: rgba(0, 0, 0, 0.02) !important;
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
      <div id="certificate-modal-wrapper" className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl relative z-10 shadow-2xl p-6 sm:p-8 animate-fade-in my-8 max-h-[92vh] overflow-y-auto">
        
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
        <div className="mb-4 space-y-1 no-print bg-slate-900 text-left">
          <div className="flex items-center gap-2 text-amber-400">
            <Sparkles size={16} />
            <span className="text-[10px] tracking-widest font-mono uppercase font-bold">Certificação Exclusiva</span>
          </div>
          <h3 className="font-display text-lg sm:text-xl font-bold text-slate-100">Seu Certificado está pronto!</h3>
          <p className="text-xs text-slate-400">Trabalho completo! Use as abas abaixo para visualizar as duas faces do documento antes de imprimi-lo.</p>
        </div>

        {/* Tab Controls for Front vs Back (no-print) */}
        <div className="flex items-center gap-1.5 mb-5 p-1 bg-slate-950 rounded-xl w-fit border border-slate-800/60 no-print">
          <button
            onClick={() => setActiveTab('front')}
            className={`px-4 py-1.5 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              activeTab === 'front'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            Frente (Diploma)
          </button>
          <button
            onClick={() => setActiveTab('back')}
            className={`px-4 py-1.5 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              activeTab === 'back'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            Verso (Grade Curricular)
          </button>
        </div>

        {/* Certificate Display Screen Container */}
        <div id="print-container" className="w-full flex flex-col items-center">
          
          {/* FRONT PAGE */}
          <div 
            id="certificate-front"
            className={`${activeTab === 'front' ? 'block' : 'hidden'} print:block ${
              certSettings.useCustomLayout 
                ? "w-full relative rounded-2xl overflow-hidden aspect-[1.414/1] bg-slate-950 border border-slate-800 shadow-inner select-none text-center"
                : "bg-slate-950 border-8 border-double border-teal-500/30 p-8 sm:p-12 md:p-16 rounded-2xl relative overflow-hidden flex flex-col justify-between items-center text-center shadow-inner select-none w-full text-center aspect-[1.414/1]"
            }`}
            style={{
              ...(certSettings.useCustomLayout ? {
                backgroundImage: certSettings.backgroundImageUrl ? `url(${certSettings.backgroundImageUrl})` : 'none',
                backgroundSize: '100% 100%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              } : {
                aspectRatio: '1.414/1',
              }),
              containerType: 'inline-size' as any,
              '--inst-size': `${(certSettings.customInstitutionSize ?? 1.2) * 0.95}cqw`,
              '--title-size': `${(certSettings.customTitleSize ?? 3.5) * 0.95}cqw`,
              '--recipient-size': `${(certSettings.customRecipientSize ?? 2.2) * 0.9}cqw`,
              '--recipient-sub-size': `${(certSettings.customRecipientSize ?? 2.2) * 0.4}cqw`,
              '--desc-size': `${(certSettings.customTextSize ?? 1.2) * 0.8}cqw`,
              '--course-size': `${(certSettings.customCourseSize ?? 2.5) * 0.82}cqw`,
              '--meta-size': `${(certSettings.customMetaSize ?? 1.0) * 0.85}cqw`,
              '--signatures-size': `${certSettings.customSignaturesSize ?? 1.1}cqw`,
              '--qr-size': `${certSettings.customQrSize ?? 10}cqw`,
              '--sig-init-size': `${(certSettings.customSignaturesSize ?? 1.1) * 0.9}cqw`,
              '--sig-name-size': `${(certSettings.customSignaturesSize ?? 1.1) * 0.7}cqw`,
              '--sig-title-size': `${(certSettings.customSignaturesSize ?? 1.1) * 0.5}cqw`,
              '--footnote-size': '0.45cqw',
            } as any}
          >
          {certSettings.useCustomLayout ? (
            // CUSTOM PNG BACKDROP OVERLAY RENDER FOR RECIPIENT
            <div className="absolute inset-0 w-full h-full font-sans">
              
              {/* Institution */}
              <div 
                className="absolute left-0 w-full font-mono uppercase tracking-widest font-extrabold px-4 truncate"
                style={{
                  top: `${certSettings.customInstitutionTop ?? 14}%`,
                  fontSize: `var(--inst-size, ${certSettings.customInstitutionSize ?? 1.2}cqw)`,
                  color: certSettings.customInstitutionColor ?? '#94a3b8'
                }}
              >
                {certSettings.institutionName}
              </div>

              {/* Title */}
              <div 
                className="absolute left-0 w-full font-display font-black tracking-tight uppercase px-4 truncate"
                style={{
                  top: `${certSettings.customTitleTop ?? 24}%`,
                  fontSize: `var(--title-size, ${certSettings.customTitleSize ?? 3.5}cqw)`,
                  color: certSettings.customTitleColor ?? '#ffffff'
                }}
              >
                {certSettings.certificateTitle}
              </div>

              {/* Recipient dynamic block */}
              <div 
                className="absolute left-0 w-full space-y-1 px-4"
                style={{
                  top: `${certSettings.customRecipientTop ?? 40}%`,
                }}
              >
                <p 
                  className="font-mono uppercase tracking-wide opacity-80"
                  style={{ fontSize: `var(--recipient-sub-size, ${(certSettings.customRecipientSize ?? 2.2) * 0.4}cqw)`, color: certSettings.customRecipientColor ?? '#67e8f9' }}
                >
                  Este certificado honorário é orgulhosamente outorgado a
                </p>
                <h2 
                  className="font-display font-bold font-serif leading-none italic truncate"
                  style={{ fontSize: `var(--recipient-size, ${certSettings.customRecipientSize ?? 2.2}cqw)`, color: certSettings.customRecipientColor ?? '#67e8f9' }}
                >
                  {studentName}
                </h2>
              </div>

              {/* Description */}
              <p 
                className="absolute left-1/2 -translate-x-1/2 w-[85%] leading-relaxed"
                style={{
                  top: `${certSettings.customTextTop ?? 52}%`,
                  fontSize: `var(--desc-size, ${certSettings.customTextSize ?? 1.2}cqw)`,
                  color: certSettings.customTextColor ?? '#cbd5e1'
                }}
              >
                {certSettings.textDescription}
              </p>

              {/* Course Title Badge overlay */}
              <div 
                className="absolute left-1/2 -translate-x-1/2 px-4 py-1.5 bg-slate-950/40 border border-slate-800/40 rounded-xl"
                style={{
                  top: `${certSettings.customCourseTop ?? 62}%`,
                }}
              >
                <span 
                  className="font-display font-bold tracking-wide truncate block"
                  style={{
                    fontSize: `var(--course-size, ${certSettings.customCourseSize ?? 2.5}cqw)`,
                    color: certSettings.customCourseColor ?? '#34d399'
                  }}
                >
                  {courseTitle}
                </span>
              </div>

              {/* Detailed Metadata hours */}
              <p 
                className="absolute left-1/2 -translate-x-1/2 w-[80%] leading-normal opacity-90"
                style={{
                  top: `${certSettings.customMetaTop ?? 72}%`,
                  fontSize: `var(--meta-size, ${certSettings.customMetaSize ?? 1.0}cqw)`,
                  color: certSettings.customMetaColor ?? '#64748b'
                }}
              >
                {detailText}
              </p>

              {/* QR validation */}
              <div 
                className="absolute p-0.5 bg-white rounded flex items-center justify-center border border-slate-350"
                style={{
                  top: `${certSettings.customQrTop ?? 78}%`,
                  left: `${certSettings.customQrLeft ?? 12}%`,
                  width: `var(--qr-size, ${certSettings.customQrSize ?? 10}cqw)`,
                  height: `var(--qr-size, ${certSettings.customQrSize ?? 10}cqw)`,
                }}
              >
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`${window.location.origin}?validate=${certificateId}`)}`}
                  alt="QR Code"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Signatures */}
              <div 
                className="absolute w-[80%] left-1/2 -translate-x-1/2 grid grid-cols-2 gap-8 items-end"
                style={{
                  top: `${certSettings.customSignaturesTop ?? 84}%`,
                  color: certSettings.customSignaturesColor ?? '#cbd5e1'
                }}
              >
                {/* Signature 1 */}
                <div className="flex flex-col items-center">
                  <span className="font-serif italic leading-none truncate block max-w-full mb-0.5" style={{ fontSize: `var(--sig-init-size, ${(certSettings.customSignaturesSize ?? 1.1) * 0.9}cqw)` }}>
                    {directorSignInitial}
                  </span>
                  <div className="h-[0.5px] w-full bg-slate-800/80" />
                  <span className="truncate max-w-full font-bold uppercase mt-1 leading-none font-mono" style={{ fontSize: `var(--sig-name-size, ${(certSettings.customSignaturesSize ?? 1.1) * 0.7}cqw)` }}>
                    {certSettings.directorName}
                  </span>
                  <span className="text-slate-600 uppercase font-mono mt-0.5" style={{ fontSize: `var(--sig-title-size, ${(certSettings.customSignaturesSize ?? 1.1) * 0.5}cqw)` }}>diretor(a) geral</span>
                </div>

                {/* Signature 2 */}
                <div className="flex flex-col items-center">
                  <span className="font-serif italic leading-none truncate block max-w-full mb-0.5 text-emerald-300" style={{ fontSize: `var(--sig-init-size, ${(certSettings.customSignaturesSize ?? 1.1) * 0.9}cqw)` }}>
                    {instructorAssigned}
                  </span>
                  <div className="h-[0.5px] w-full bg-slate-800/80" />
                  <span className="truncate max-w-full font-bold uppercase mt-1 leading-none font-mono" style={{ fontSize: `var(--sig-name-size, ${(certSettings.customSignaturesSize ?? 1.1) * 0.7}cqw)` }}>
                    {instructorAssigned}
                  </span>
                  <span className="text-slate-600 uppercase font-mono mt-0.5" style={{ fontSize: `var(--sig-title-size, ${(certSettings.customSignaturesSize ?? 1.1) * 0.5}cqw)` }}>médico(a) veterinário(a) - palestrante</span>
                </div>
              </div>

              {/* Footnote authenticity overlay */}
              <div 
                className="absolute bottom-2 left-0 w-full flex justify-between px-6 text-[0.45rem] font-mono text-slate-500 tracking-tighter"
                style={{
                  fontSize: 'var(--footnote-size, 0.45cqw)'
                }}
              >
                <span>Chave única: {certificateId}</span>
                <span>Emitido e outorgado em {formattedDate}</span>
                <span>Autenticação Digital Ativa</span>
              </div>

            </div>
          ) : (
            // STANDARD platform visual layout
            <>
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
                  <span className="text-[8px] text-slate-550">
                    Diretor(a) Geral
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
                  <span className="text-[8px] text-slate-550">
                    Médico(a) Veterinário(a) - Palestrante
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
            </>
          )}
          </div>

          {/* BACK PAGE (VERSO) - GRADE CURRICULAR */}
          <div 
            id="certificate-back"
            className={`${activeTab === 'back' ? 'flex' : 'hidden'} print:flex bg-white border-8 border-double border-slate-300 p-6 sm:p-10 md:p-14 rounded-2xl relative overflow-hidden flex-col justify-between items-center text-center shadow-inner select-none w-full text-slate-800`}
            style={{
              aspectRatio: '1.414/1',
              containerType: 'inline-size' as any,
            }}
          >
            {/* Ambient watermarks */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.03)_0%,transparent_70%)] pointer-events-none" />
            <div className="absolute -top-32 -right-32 w-64 h-64 border border-emerald-500/5 rounded-full pointer-events-none" />
            <div className="absolute -bottom-32 -left-32 w-64 h-64 border border-emerald-500/5 rounded-full pointer-events-none" />

            {/* Verso Header */}
            <div className="w-full flex justify-between items-start border-b border-slate-200 pb-4 relative z-10 text-left">
              <div>
                <h4 className="font-mono text-[9px] sm:text-[11px] uppercase tracking-widest text-emerald-700 font-bold leading-none">
                  Syllabus Oficial & Validação de Carga Horária
                </h4>
                <h2 className="font-display font-black text-slate-900 text-base sm:text-lg md:text-xl mt-1.5 uppercase tracking-tight">
                  Grade Curricular Completa
                </h2>
                <p className="text-[10px] text-slate-500 mt-1">
                  Curso: <strong className="text-slate-800">{courseTitle}</strong>
                </p>
              </div>
              
              <div className="text-right">
                <span className="font-mono text-[8px] text-slate-400 block">ID DO CERTIFICADO</span>
                <span className="font-mono text-[10px] sm:text-xs font-bold text-slate-700 mr-1">{certificateId}</span>
              </div>
            </div>

            {/* Verso Body - Course Syllabus Grid */}
            <div className="w-full my-4 relative z-10 grow flex flex-col justify-center">
              {sortedModules.length > 0 ? (
                <div className={`grid gap-3 w-full text-left ${
                  sortedModules.length <= 3 
                    ? 'grid-cols-1 max-w-xl mx-auto' 
                    : sortedModules.length <= 6 
                      ? 'grid-cols-2' 
                      : 'grid-cols-3'
                }`}>
                  {sortedModules.map((mod, idx) => (
                    <div key={mod.id} className="bg-slate-50 border border-slate-200/80 p-2.5 sm:p-3 rounded-xl flex flex-col justify-between hover:border-slate-300 transition-colors">
                      <div>
                        {/* Header */}
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[8px] sm:text-[9px] font-mono text-emerald-700 font-bold uppercase">MÓDULO {String(idx + 1).padStart(2, '0')}</span>
                          <span className="text-[8px] font-mono text-slate-500">{mod.lessons?.length || 0} aulas</span>
                        </div>
                        {/* Title */}
                        <h4 className="font-display font-bold text-slate-800 text-[10px] sm:text-xs mb-1">{mod.title}</h4>
                        {/* Description */}
                        <p className="text-[8px] sm:text-[10px] text-slate-500 mb-2 leading-relaxed">{mod.description || 'Conteúdo programático de especialidade teórica e prática.'}</p>
                      </div>
                      
                      {/* Lesson Bullets if space allows */}
                      {mod.lessons && mod.lessons.length > 0 && (
                        <div className="border-t border-slate-200 pt-1.5 mt-1 sm:mt-2">
                          <ul className="space-y-0.5">
                            {mod.lessons.slice(0, 2).map((les, lidx) => (
                              <li key={les.id} className="text-[8px] sm:text-[9px] text-slate-600 truncate flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-emerald-600/30 inline-block shrink-0" />
                                <span className="truncate">{les.title}</span>
                              </li>
                            ))}
                            {mod.lessons.length > 2 && (
                              <li className="text-[7px] sm:text-[8px] font-mono text-slate-400 italic pl-2">
                                + {mod.lessons.length - 2} tópicos adicionais
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl max-w-md mx-auto">
                  <Award size={24} className="text-slate-400 mx-auto mb-2 opacity-60" />
                  <p className="text-xs text-slate-600 font-mono">Estrutura curricular unificada.</p>
                  <p className="text-[10px] text-slate-500 mt-1">Este programa cumpre integralmente os requisitos educacionais estabelecidos pela instituição de ensino.</p>
                </div>
              )}
            </div>

            {/* Verso Footer / Signature & QR Authentic Seal */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4 items-center border-t border-slate-200 pt-4 relative z-10 text-left">
              
              {/* QR validation block */}
              <div className="flex items-center gap-3">
                <div className="p-1 bg-white rounded-lg border border-slate-200 shrink-0 shadow-sm">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(`${window.location.origin}?validate=${certificateId}`)}`}
                    alt="QR Code Autenticidade"
                    className="w-12 h-12"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <span className="text-[7px] font-bold text-emerald-700 font-mono block tracking-wider uppercase">AUTENTICAÇÃO DIGITAL</span>
                  <p className="text-[8px] text-slate-500 mt-0.5 leading-normal">
                    Aponte a câmera do celular para este QR Code para verificar a validade do diploma online.
                  </p>
                </div>
              </div>

              {/* Central informational text */}
              <div className="text-center flex flex-col justify-center">
                <span className="font-mono text-[8px] text-slate-400 uppercase tracking-widest block font-bold">ALUNO(A) REGISTRADO(A)</span>
                <span className="font-serif text-sm font-bold text-slate-800 mt-1 truncate block">{studentName}</span>
                <span className="text-[8px] text-slate-400 mt-0.5">CPF e registro de curso validados digitalmente</span>
              </div>

              {/* Institution Stamp Seal */}
              <div className="flex flex-col items-center sm:items-end justify-center">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600">
                    <ShieldCheck size={12} />
                  </div>
                  <span className="text-[8px] font-mono text-slate-700 font-bold uppercase tracking-wider">{certSettings.institutionName}</span>
                </div>
                <span className="text-[7px] font-mono text-slate-400 mt-1 block">Acreditação Autiva • {formattedDate}</span>
              </div>

            </div>

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
