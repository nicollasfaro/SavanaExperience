import React, { useState, useEffect } from 'react';
import { Award, Download, Printer, X, Check, ShieldCheck, Sparkles, Loader2, FileDown } from 'lucide-react';
import JSZip from 'jszip';
import { localDB } from '../firebase';
import { IssuedCertificate, LeaderboardUser, Turma } from '../types';

interface BatchCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  turma: Turma;
  students: LeaderboardUser[];
  courseTitle: string;
  courseId: string;
  duration: string;
  xpReward: number;
  instructorName: string;
}

export function BatchCertificateModal({
  isOpen,
  onClose,
  turma,
  students,
  courseTitle,
  courseId,
  duration,
  xpReward,
  instructorName
}: BatchCertificateModalProps) {
  const [certs, setCerts] = useState<{ student: LeaderboardUser; cert: IssuedCertificate }[]>([]);
  const [loading, setLoading] = useState(true);
  const [zipping, setZipping] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const certSettings = localDB.getCertificateSettings();

  const [printCertId, setPrintCertId] = useState<string | null>(null);
  const [preparingPrint, setPreparingPrint] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || students.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const generatedList: { student: LeaderboardUser; cert: IssuedCertificate }[] = [];

    const generateAll = async () => {
      try {
        for (const student of students) {
          const existing = await localDB.getCertificateByUserAndCourse(student.userId, courseId);

          if (existing) {
            if (existing.userName !== student.name) {
              const updatedCert = { ...existing, userName: student.name };
              await localDB.saveIssuedCertificate(updatedCert);
              generatedList.push({ student, cert: updatedCert });
            } else {
              generatedList.push({ student, cert: existing });
            }
          } else {
            // Create a unique Certificate object
            const issueDate = new Date();
            const yearChar = issueDate.getFullYear().toString().slice(-2);
            const monthChar = (issueDate.getMonth() + 1).toString().padStart(2, '0');
            const studentPrefix = student.name.trim().replace(/\s+/g, '').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'STU';
            const coursePrefix = courseId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'CRS';
            const randomSuffix = Math.floor(1000 + Math.random() * 9000);
            const uniqueCertId = `SV-${yearChar}${monthChar}-${studentPrefix}-${coursePrefix}-${randomSuffix}`;

            const newCert: IssuedCertificate = {
              id: uniqueCertId,
              userId: student.userId,
              userName: student.name,
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
            generatedList.push({ student, cert: newCert });
          }
        }
        setCerts(generatedList);
      } catch (err) {
        console.error("Failed to batch generate certificates:", err);
      } finally {
        setLoading(false);
      }
    };

    generateAll();
  }, [isOpen, students, courseId, courseTitle, instructorName, duration, xpReward, certSettings.chiefInstructorName]);

  const handlePrintAll = () => {
    window.print();
  };

  const handleCopyCode = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
        <div className="text-center space-y-4">
          <Loader2 className="animate-spin text-emerald-400 mx-auto" size={44} />
          <h3 className="font-display text-lg font-bold text-slate-100">Processando Certificados...</h3>
          <p className="text-xs text-slate-400 font-mono">Gerando chaves de autenticação exclusivas para cada aluno.</p>
        </div>
      </div>
    );
  }

  // Retrieve course modules for back page
  const courseModules = localDB.getModules().filter(m => m.courseId === courseId);
  const sortedModules = [...courseModules].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const directorSignInitial = certSettings.directorName.replace(/^Dr\.\s+/i, '');
  const instructorAssigned = (instructorName && instructorName !== "Coordenador Docente")
    ? instructorName 
    : certSettings.chiefInstructorName;

  const getSingleCertificateHTML = (student: LeaderboardUser, cert: IssuedCertificate) => {
    const issueDateParsed = new Date(cert.issuedAt);
    const formattedDate = issueDateParsed.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    const certificateId = cert.id;
    const detailText = certSettings.detailedMetadata
      .replace('{duration}', cert.duration)
      .replace('{xpReward}', `+${cert.xpReward} XP`);

    let modulesHtml = '';
    if (sortedModules.length > 0) {
      const gridColsClass = sortedModules.length <= 3 
        ? 'grid-cols-1 max-w-xl mx-auto' 
        : sortedModules.length <= 6 
          ? 'grid-cols-2' 
          : 'grid-cols-3';

      let modulesCards = '';
      sortedModules.forEach((mod, idx) => {
        let lessonsListHtml = '';
        if (mod.lessons && mod.lessons.length > 0) {
          const slicedLessons = mod.lessons.slice(0, 2);
          let lessonsItems = '';
          slicedLessons.forEach((les) => {
            lessonsItems += `
              <li class="text-[8px] sm:text-[9px] text-slate-600 truncate flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-600/30 inline-block shrink-0"></span>
                <span class="truncate">${les.title}</span>
              </li>
            `;
          });

          let additionalText = '';
          if (mod.lessons.length > 2) {
            additionalText = `
              <li class="text-[7px] sm:text-[8px] font-mono text-slate-400 italic pl-2.5">
                + ${mod.lessons.length - 2} tópicos adicionais
              </li>
            `;
          }

          lessonsListHtml = `
            <div class="border-t border-slate-200 pt-1.5 mt-1 sm:mt-2">
              <ul class="space-y-0.5 text-left">
                ${lessonsItems}
                ${additionalText}
              </ul>
            </div>
          `;
        }

        modulesCards += `
          <div class="bg-slate-50 border border-slate-200/80 p-2.5 sm:p-3 rounded-xl flex flex-col justify-between hover:border-slate-300 transition-colors text-slate-800">
            <div class="text-left">
              <div class="flex justify-between items-center mb-1">
                <span class="text-[8px] sm:text-[9px] font-mono text-emerald-700 font-bold uppercase">MÓDULO ${(idx + 1).toString().padStart(2, '0')}</span>
                <span class="text-[8px] font-mono text-slate-500">${mod.lessons?.length || 0} aulas</span>
              </div>
              <h4 class="font-sans font-bold text-slate-900 text-[10px] sm:text-xs mb-1">${mod.title}</h4>
              <p class="text-[8px] sm:text-[10px] text-slate-500 mb-2 leading-relaxed">${mod.description || 'Conteúdo programático de especialidade teórica e prática.'}</p>
            </div>
            ${lessonsListHtml}
          </div>
        `;
      });

      modulesHtml = `
        <div class="grid gap-3 w-full text-left ${gridColsClass}">
          ${modulesCards}
        </div>
      `;
    } else {
      modulesHtml = `
        <div class="text-center py-8 border border-dashed border-slate-200 rounded-2xl max-w-md mx-auto">
          <svg class="text-slate-400 mx-auto mb-2 opacity-60" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
          <p class="text-xs text-slate-600 font-mono">Estrutura curricular unificada.</p>
          <p class="text-[10px] text-slate-500 mt-1">Este programa cumpre integralmente os requisitos educacionais estabelecidos pela instituição de ensino.</p>
        </div>
      `;
    }

    let frontHtml = '';
    if (certSettings.useCustomLayout) {
      frontHtml = `
        <div class="certificate-container flex flex-col justify-between items-center text-center p-0 rounded-2xl overflow-hidden aspect-[1.414/1] bg-slate-950 relative shadow-xl border border-slate-800" style="container-type: inline-size; background-image: url('${certSettings.backgroundImageUrl || ''}'); background-size: 100% 100%; background-position: center; background-repeat: no-repeat; --inst-size: ${certSettings.customInstitutionSize ?? 1.2}cqw; --title-size: ${certSettings.customTitleSize ?? 3.5}cqw; --recipient-size: ${certSettings.customRecipientSize ?? 2.2}cqw; --recipient-sub-size: ${(certSettings.customRecipientSize ?? 2.2) * 0.4}cqw; --desc-size: ${certSettings.customTextSize ?? 1.2}cqw; --course-size: ${certSettings.customCourseSize ?? 2.5}cqw; --meta-size: ${certSettings.customMetaSize ?? 1.0}cqw; --signatures-size: ${certSettings.customSignaturesSize ?? 1.1}cqw; --qr-size: ${certSettings.customQrSize ?? 10}cqw; --sig-init-size: ${(certSettings.customSignaturesSize ?? 1.1) * 0.9}cqw; --sig-name-size: ${(certSettings.customSignaturesSize ?? 1.1) * 0.7}cqw; --sig-title-size: ${(certSettings.customSignaturesSize ?? 1.1) * 0.5}cqw; --footnote-size: 0.45cqw;">
          <div class="absolute inset-0 w-full h-full font-sans">
            <div 
              class="absolute left-0 w-full font-mono uppercase tracking-widest font-extrabold px-4 truncate text-center"
              style="top: ${certSettings.customInstitutionTop ?? 14}%; font-size: var(--inst-size, ${certSettings.customInstitutionSize ?? 1.2}cqw); color: ${certSettings.customInstitutionColor ?? '#94a3b8'};"
            >
              ${certSettings.institutionName}
            </div>

            <div 
              class="absolute left-0 w-full font-display font-black tracking-tight uppercase px-4 truncate text-center"
              style="top: ${certSettings.customTitleTop ?? 24}%; font-size: var(--title-size, ${certSettings.customTitleSize ?? 3.5}cqw); color: ${certSettings.customTitleColor ?? '#ffffff'};"
            >
              ${certSettings.certificateTitle}
            </div>

            <div 
              class="absolute left-0 w-full space-y-1 px-4 text-center"
              style="top: ${certSettings.customRecipientTop ?? 40}%;"
            >
              <p 
                class="font-mono uppercase tracking-wide opacity-80"
                style="font-size: var(--recipient-sub-size, ${(certSettings.customRecipientSize ?? 2.2) * 0.4}cqw); color: ${certSettings.customRecipientColor ?? '#67e8f9'};"
              >
                Este certificado honorário é orgulhosamente outorgado a
              </p>
              <h2 
                class="font-display font-bold font-serif leading-none italic truncate"
                style="font-size: var(--recipient-size, ${certSettings.customRecipientSize ?? 2.2}cqw); color: ${certSettings.customRecipientColor ?? '#67e8f9'};"
              >
                ${student.name}
              </h2>
            </div>

            <p 
              class="absolute left-1/2 -translate-x-1/2 w-[85%] leading-relaxed text-center font-sans"
              style="top: ${certSettings.customTextTop ?? 52}%; font-size: var(--desc-size, ${certSettings.customTextSize ?? 1.2}cqw); color: ${certSettings.customTextColor ?? '#cbd5e1'};"
            >
              ${certSettings.textDescription}
            </p>

            <div 
              class="absolute left-1/2 -translate-x-1/2 px-4 py-1.5 bg-slate-950/40 border border-slate-800/40 rounded-xl text-center"
              style="top: ${certSettings.customCourseTop ?? 62}%;"
            >
              <span 
                class="font-display font-bold tracking-wide truncate block"
                style="font-size: var(--course-size, ${certSettings.customCourseSize ?? 2.5}cqw); color: ${certSettings.customCourseColor ?? '#34d399'};"
              >
                ${courseTitle}
              </span>
            </div>

            <p 
              class="absolute left-1/2 -translate-x-1/2 w-[80%] leading-normal opacity-90 text-center"
              style="top: ${certSettings.customMetaTop ?? 72}%; font-size: var(--meta-size, ${certSettings.customMetaSize ?? 1.0}cqw); color: ${certSettings.customMetaColor ?? '#64748b'};"
            >
              ${detailText}
            </p>

            <div 
              class="absolute p-0.5 bg-white rounded flex items-center justify-center border border-slate-350"
              style="top: ${certSettings.customQrTop ?? 78}%; left: ${certSettings.customQrLeft ?? 12}%; width: var(--qr-size, ${certSettings.customQrSize ?? 10}cqw); height: var(--qr-size, ${certSettings.customQrSize ?? 10}cqw);"
            >
              <img 
                src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`${window.location.origin}?validate=${certificateId}`)}"
                alt="QR Code"
                class="w-full h-full object-contain"
                referrerpolicy="no-referrer"
              />
            </div>

            <div 
              class="absolute w-[80%] left-1/2 -translate-x-1/2 grid grid-cols-2 gap-8 items-end"
              style="top: ${certSettings.customSignaturesTop ?? 84}%; color: ${certSettings.customSignaturesColor ?? '#cbd5e1'};"
            >
              <div class="flex flex-col items-center">
                <span class="font-serif italic leading-none truncate block max-w-full mb-0.5" style="font-size: var(--sig-init-size, ${(certSettings.customSignaturesSize ?? 1.1) * 0.9}cqw);">
                  ${directorSignInitial}
                </span>
                <div class="h-[0.5px] w-full bg-slate-800/80"></div>
                <span class="truncate max-w-full font-bold uppercase mt-1 leading-none font-mono" style="font-size: var(--sig-name-size, ${(certSettings.customSignaturesSize ?? 1.1) * 0.7}cqw);">
                  ${certSettings.directorName}
                </span>
                <span class="text-slate-600 uppercase font-mono mt-0.5" style="font-size: var(--sig-title-size, ${(certSettings.customSignaturesSize ?? 1.1) * 0.5}cqw);">diretor(a) geral</span>
              </div>

              <div class="flex flex-col items-center">
                <span class="font-serif italic leading-none truncate block max-w-full mb-0.5 text-emerald-300" style="font-size: var(--sig-init-size, ${(certSettings.customSignaturesSize ?? 1.1) * 0.9}cqw);">
                  ${instructorAssigned}
                </span>
                <div class="h-[0.5px] w-full bg-slate-800/80"></div>
                <span class="truncate max-w-full font-bold uppercase mt-1 leading-none font-mono" style="font-size: var(--sig-name-size, ${(certSettings.customSignaturesSize ?? 1.1) * 0.7}cqw);">
                  ${instructorAssigned}
                </span>
                <span class="text-slate-600 uppercase font-mono mt-0.5" style="font-size: var(--sig-title-size, ${(certSettings.customSignaturesSize ?? 1.1) * 0.5}cqw);">médico(a) veterinário(a) - palestrante</span>
              </div>
            </div>

            <div 
              class="absolute bottom-2 left-0 w-full flex justify-between px-6 text-[0.45rem] font-mono text-slate-500 tracking-tighter"
              style="font-size: var(--footnote-size, 0.45cqw);"
            >
              <span>Chave única: ${certificateId}</span>
              <span>Emitido e outorgado em ${formattedDate}</span>
              <span>Autenticação Digital Ativa</span>
            </div>
          </div>
        </div>
      `;
    } else {
      frontHtml = `
        <div class="certificate-container bg-slate-950 border-8 border-double border-teal-500/30 p-8 sm:p-12 md:p-16 rounded-2xl relative overflow-hidden flex flex-col justify-between items-center text-center shadow-xl">
          <div class="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(38,121,68,0.03)_0%,transparent_70%)] pointer-events-none"></div>
          <div class="absolute -top-32 -left-32 w-64 h-64 border border-teal-500/5 rounded-full pointer-events-none"></div>
          <div class="absolute -bottom-32 -right-32 w-64 h-64 border border-teal-500/5 rounded-full pointer-events-none"></div>
          
          <div class="space-y-4 relative z-10 w-full flex flex-col items-center text-center">
            <div class="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
            </div>
            
            <h4 class="font-mono text-[10px] sm:text-xs uppercase tracking-widest text-[#ccdcd3] font-extrabold pr-1">
              ${certSettings.institutionName}
            </h4>
            
            <h1 class="font-display text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white mt-1 border-b-2 border-emerald-500/20 pb-4 max-w-xl mx-auto uppercase">
              ${certSettings.certificateTitle}
            </h1>
          </div>

          <div class="my-8 sm:my-12 relative z-10 space-y-6 max-w-2xl mx-auto text-center">
            <p class="font-mono text-xs sm:text-sm text-slate-400 uppercase tracking-wide">
              Este certificado honorário é orgulhosamente outorgado a
            </p>
            
            <h2 class="font-display text-xl sm:text-3xl md:text-4xl font-extrabold tracking-normal text-emerald-300 py-1 font-serif underline decoration-emerald-500/30 underline-offset-8">
              ${student.name}
            </h2>
            
            <p class="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl mx-auto">
              ${certSettings.textDescription}
            </p>

            <h3 class="font-display text-lg sm:text-2xl font-bold text-white tracking-wide bg-emerald-900/10 border border-slate-850 py-3 px-5 rounded-xl max-w-lg mx-auto">
              ${courseTitle}
            </h3>

            <p class="text-[11px] sm:text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              ${detailText}
            </p>
          </div>

          <div class="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-end mt-4 pt-6 border-t border-slate-900/80 relative z-10">
            <div class="flex flex-col items-center text-center space-y-1">
              <span class="font-serif italic text-xs text-slate-400 border-none select-none">
                ${directorSignInitial}
              </span>
              <div class="h-[1px] w-32 bg-slate-800"></div>
              <span class="text-[9px] uppercase tracking-wider font-mono text-slate-500 font-bold">
                ${certSettings.directorName}
              </span>
              <span class="text-[8px] text-slate-550">
                Diretor(a) Geral
              </span>
            </div>

            <div class="flex flex-col items-center justify-center shrink-0">
              <div class="relative flex items-center justify-center w-16 h-16 rounded-full border border-emerald-500/20 bg-emerald-500/5 rotate-12">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3bac6b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 11 2 2 4-4"/></svg>
                <span class="absolute text-[6px] font-mono font-black text-emerald-400 tracking-tighter uppercase whitespace-nowrap">
                  SNC • VERIFICADO • SNC • VERIFICADO
                </span>
              </div>
              <span class="text-[8px] font-mono text-slate-500 mt-2 block tracking-widest leading-none">
                REGISTRO N° ${certificateId.slice(3, 11)}
              </span>
            </div>

            <div class="flex flex-col items-center justify-center space-y-1.5 border-none">
              <div class="p-1 px-[5px] bg-white rounded-lg shadow-md border border-slate-800 shrink-0">
                <img 
                  src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`${window.location.origin}?validate=${certificateId}`)}"
                  alt="QR Code"
                  class="w-16 h-16"
                  referrerpolicy="no-referrer"
                />
              </div>
              <span class="text-[7px] font-mono text-slate-500 uppercase tracking-widest font-black leading-none">
                Código QR de Validação
              </span>
            </div>

            <div class="flex flex-col items-center text-center space-y-1">
              <span class="font-serif italic text-xs text-emerald-200/80 border-none select-none">
                ${instructorAssigned}
              </span>
              <div class="h-[1px] w-32 bg-slate-800"></div>
              <span class="text-[9px] uppercase tracking-wider font-mono text-slate-500 font-bold">
                ${instructorAssigned}
              </span>
              <span class="text-[8px] text-slate-550">
                Médico(a) Veterinário(a) - Palestrante
              </span>
            </div>
          </div>

          <div class="mt-8 border-t border-slate-900/60 pt-4 w-full flex flex-col sm:flex-row justify-between items-center text-[9px] font-mono text-slate-500 gap-2">
            <span>Emitido e outorgado em ${formattedDate}</span>
            <span class="flex items-center gap-1">
              <span>Chave de Verificação:</span>
              <strong class="text-slate-400">${certificateId}</strong>
            </span>
            <span>Autenticação Digital Ativa</span>
          </div>
        </div>
      `;
    }

    const backHtml = `
      <div class="certificate-container bg-white text-[#090d16] border-[12px] border-double border-[rgba(9,13,22,0.4)] p-8 sm:p-12 md:p-16 rounded-2xl relative overflow-hidden flex flex-col justify-between items-center shadow-xl">
        <div class="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.03)_0%,transparent_70%)] pointer-events-none"></div>
        
        <div class="w-full flex justify-between items-start border-b border-slate-250 pb-4 relative z-10 text-left animate-none">
          <div>
            <h4 class="font-mono text-[9px] sm:text-[11px] uppercase tracking-widest text-emerald-700 font-bold leading-none">
              Syllabus Oficial & Validação de Carga Horária
            </h4>
            <h2 class="font-display font-black text-slate-900 text-base sm:text-lg md:text-xl mt-1.5 uppercase tracking-tight">
              Grade Curricular Completa
            </h2>
            <p class="text-[10px] text-slate-500 mt-1">
              Curso: <strong class="text-slate-800">${courseTitle}</strong>
            </p>
          </div>
          
          <div class="text-right">
            <span class="font-mono text-[8px] text-slate-400 block">ID DO CERTIFICADO</span>
            <span class="font-mono text-[10px] sm:text-xs font-bold text-slate-700 mr-1">${certificateId}</span>
          </div>
        </div>

        <div class="w-full my-6 relative z-10 grow flex flex-col justify-center">
          ${modulesHtml}
        </div>

        <div class="w-full grid grid-cols-1 sm:grid-cols-3 gap-4 items-center border-t border-slate-200 pt-4 relative z-10 text-left">
          <div class="flex items-center gap-3">
            <div class="p-1 bg-white rounded-lg border border-slate-200 shrink-0 shadow-sm">
              <img 
                src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(`${window.location.origin}?validate=${certificateId}`)}"
                alt="QR Code"
                class="w-12 h-12"
                referrerpolicy="no-referrer"
              />
            </div>
            <div>
              <span class="text-[7px] font-bold text-emerald-700 font-mono block tracking-wider uppercase">AUTENTICAÇÃO DIGITAL</span>
              <p class="text-[8px] text-slate-550 mt-0.5 leading-normal">
                Aponte a câmera do celular para este QR Code para verificar a validade do diploma online.
              </p>
            </div>
          </div>

          <div class="text-center flex flex-col justify-center">
            <span class="font-mono text-[8px] text-slate-400 uppercase tracking-widest block font-bold">ALUNO(A) REGISTRADO(A)</span>
            <span class="font-serif text-sm font-bold text-slate-800 mt-1 truncate block">${student.name}</span>
            <span class="text-[8px] text-slate-400 mt-0.5">CPF e registro de curso validados digitalmente</span>
          </div>

          <div class="flex flex-col items-center sm:items-end justify-center">
            <div class="flex items-center gap-1.5">
              <div class="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 11 2 2 4-4"/></svg>
              </div>
              <span class="text-[8px] font-mono text-slate-700 font-bold uppercase tracking-wider">${certSettings.institutionName}</span>
            </div>
            <span class="text-[7px] font-mono text-slate-400 mt-1 block">Acreditação Autiva • ${formattedDate}</span>
          </div>
        </div>
      </div>
    `;

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Certificado - ${student.name}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', 'sans-serif'],
            mono: ['JetBrains Mono', 'monospace'],
            serif: ['Playfair Display', 'serif'],
          },
          colors: {
            emerald: {
              450: '#10b981',
            }
          }
        }
      }
    }
  </script>
  <style>
    @page {
      size: landscape;
      margin: 0;
    }
    @media print {
      body {
        background-color: transparent !important;
        padding: 0 !important;
        margin: 0 !important;
        display: block !important;
      }
      .no-print {
        display: none !important;
      }
      .page-break-container {
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        box-sizing: border-box !important;
        width: 95vw !important;
        height: 94vh !important;
        max-width: calc(94vh * 1.414) !important;
        max-height: calc(95vw / 1.414) !important;
        margin: 3vh auto !important;
        padding: 0 !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .page-break-container-first {
        page-break-after: always !important;
        break-after: page !important;
      }
      .certificate-container {
        border-radius: 0 !important;
        box-shadow: none !important;
        margin: 0 !important;
        width: 100% !important;
        height: 100% !important;
        max-width: none !important;
        max-height: none !important;
        border: none !important;
      }
    }
    body {
      background-color: #0b0f19;
      color: #f1f5f9;
    }
    .certificate-container {
      aspect-ratio: 1.414 / 1;
      width: 100%;
      max-width: 1120px;
      margin: 0 auto;
      position: relative;
    }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  </style>
</head>
<body class="p-4 md:p-8 font-sans flex flex-col items-center justify-center min-h-screen gap-6">
  
  <div class="no-print w-full max-w-[1120px] bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-lg text-left">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
      </div>
      <div>
        <h1 class="text-sm font-bold text-slate-100">Certificado Oficial Digital</h1>
        <p class="text-xs text-slate-400">Aluno(a): <strong class="text-emerald-400 font-semibold">${student.name}</strong></p>
      </div>
    </div>
    <button onclick="window.print()" class="w-full sm:w-auto px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs font-mono tracking-wider rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-500/10">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
      IMPRIMIR / SALVAR COMO PDF
    </button>
  </div>

  <div class="page-break-container page-break-container-first w-full flex justify-center items-center py-4">
    ${frontHtml}
  </div>

  <div class="page-break-container w-full flex justify-center items-center py-4">
    ${backHtml}
  </div>

</body>
</html>`;
  };

  const handleDownloadSingleHtml = (student: LeaderboardUser, cert: IssuedCertificate) => {
    const fullHTML = getSingleCertificateHTML(student, cert);
    const studentNameSanitized = student.name.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
    const filename = `Certificado_${studentNameSanitized}_${cert.id}.html`;
    
    const blob = new Blob([fullHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrintSingle = (certId: string) => {
    setPreparingPrint(certId);
    setPrintCertId(certId);
    setTimeout(() => {
      window.print();
      setPreparingPrint(null);
      setPrintCertId(null);
    }, 450);
  };

  const handleDownloadZip = async () => {
    try {
      setZipping(true);
      const zip = new JSZip();

      certs.forEach(({ student, cert }) => {
        const studentNameSanitized = student.name.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
        const filename = `Certificado_${studentNameSanitized}_${cert.id}.html`;
        const fullHTML = getSingleCertificateHTML(student, cert);
        zip.file(filename, fullHTML);
      });

      const instructions = `========================================================================
INSTRUÇÕES DE IMPRESSÃO / SALVAMENTO EM LOTE - CERTIFICADOS INDIVIDUAIS
========================================================================

Parabéns! Você baixou os certificados individuais da turma "${turma.name}".
Eles foram gerados como arquivos HTML autônomos de qualidade vetorial impecável.

COMO SALVAR COMO PDF OU IMPRIMIR COM PERFEIÇÃO:

1. Extraia este arquivo ZIP em uma pasta do seu computador.
2. Dê um duplo-clique no arquivo HTML de qualquer aluno (por exemplo: "Certificado_Fulano_de_Tal.html")
   para abri-lo em seu navegador de preferência (Google Chrome, Microsoft Edge ou Safari recomendados).
3. Na página que se abrir, você verá uma visualização nítida das duas faces do certificado (Frente e Verso)
   e um botão no topo: "IMPRIMIR / SALVAR COMO PDF".
4. Clique nesse botão ou use o atalho padrão do sistema (Ctrl + P no Windows ou Cmd + P no macOS).
5. Na janela de opções de impressão, aplique as seguintes configurações vitais:
   
   - Destino: Selecione "Salvar como PDF" (para gerar o arquivo digital) ou escolha sua impressora física.
   - Orientação: PAISAGEM (Landscape). Isto é essencial para alinhar a folha deitada.
   - Tamanho do Papel: A4 ou Carta.
   - Margens: NENHUMA (None) ou Padrão (Default).
   - Opções de Plano de Fundo (Mais Definições):
     * MARQUE a caixa "Gráficos de plano de fundo" (Background graphics). Se não fizer isso, as cores e a imagem de fundo não aparecerão.
     * DESMARQUE a caixa "Cabeçalhos e rodapés" (Headers and footers) para remover as URLS e textos de data do navegador das bordas do papel.

6. Clique em "Salvar" ou "Imprimir".

Pronto! Você obterá um arquivo PDF de alta definição, com imagens nítidas, textos perfeitamente legíveis e QR Codes escaneáveis, ideal para impressão ou envio por e-mail para seus estudantes.
`;

      zip.file("COMO_IMPRIMIR_E_SALVAR_CERTIFICADOS.txt", instructions);

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Certificados_Separados_${turma.name.replace(/\s+/g, '_')}.zip`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erro ao gerar arquivo ZIP:", err);
    } finally {
      setZipping(false);
    }
  };

  return (
    <div id="batch-certificate-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
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
          #batch-certificate-modal-overlay {
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
          #batch-certificate-modal-wrapper {
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
          /* Print only the batch print container */
          #batch-print-container {
            visibility: visible !important;
          }
          #batch-print-container .batch-certificate-page {
            visibility: visible !important;
          }
          #batch-print-container .batch-certificate-page * {
            visibility: visible !important;
          }
          #batch-print-container {
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
          .batch-certificate-page {
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            box-sizing: border-box !important;
            width: 95vw !important;
            height: 94vh !important;
            max-width: calc(94vh * 1.414) !important;
            max-height: calc(95vw / 1.414) !important;
            margin: 3vh auto !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: always !important;
            break-after: page !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            container-type: inline-size !important;
            position: relative !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            visibility: visible !important;
          }
          ${printCertId ? `
          #batch-print-container .batch-certificate-page {
            display: none !important;
            visibility: hidden !important;
          }
          #batch-print-container .batch-certificate-page * {
            visibility: hidden !important;
          }
          #batch-print-container .cert-page-${printCertId} {
            display: flex !important;
            visibility: visible !important;
          }
          #batch-print-container .cert-page-${printCertId} * {
            visibility: visible !important;
          }
          ` : ''}
          /* specific front padding & layout styling */
          .batch-certificate-front {
            padding: ${certSettings.useCustomLayout ? '0' : '3.5rem'} !important;
            background-color: ${certSettings.useCustomLayout ? 'transparent' : '#020617'} !important;
            border: none !important;

            /* Override container query units with viewport widths (vw) on print so printing engines scale text perfectly */
            --inst-size: ${certSettings.customInstitutionSize ?? 1.2}vw !important;
            --title-size: ${certSettings.customTitleSize ?? 3.5}vw !important;
            --recipient-size: ${certSettings.customRecipientSize ?? 2.2}vw !important;
            --recipient-sub-size: ${(certSettings.customRecipientSize ?? 2.2) * 0.4}vw !important;
            --desc-size: ${certSettings.customTextSize ?? 1.2}vw !important;
            --course-size: ${certSettings.customCourseSize ?? 2.5}vw !important;
            --meta-size: ${certSettings.customMetaSize ?? 1.0}vw !important;
            --signatures-size: ${certSettings.customSignaturesSize ?? 1.1}vw !important;
            --qr-size: ${certSettings.customQrSize ?? 10}vw !important;
            --sig-init-size: ${(certSettings.customSignaturesSize ?? 1.1) * 0.9}vw !important;
            --sig-name-size: ${(certSettings.customSignaturesSize ?? 1.1) * 0.7}vw !important;
            --sig-title-size: ${(certSettings.customSignaturesSize ?? 1.1) * 0.5}vw !important;
            --footnote-size: 0.45vw !important;
          }
          .batch-certificate-front * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* specific back styling */
          .batch-certificate-back {
            padding: 3.5rem !important;
            background-color: white !important;
            color: #090d16 !important;
            border: 12px double rgba(9, 13, 22, 0.4) !important;
          }
          .batch-certificate-back * {
            color: #090d16 !important;
            border-color: rgba(9, 13, 22, 0.2) !important;
            background-color: transparent !important;
          }
          .batch-certificate-back .text-emerald-450,
          .batch-certificate-back .text-emerald-700,
          .batch-certificate-back .text-emerald-600 {
            color: #047857 !important;
          }
          .batch-certificate-back .bg-emerald-500\/10 {
            background-color: rgba(4, 120, 87, 0.08) !important;
          }
          .batch-certificate-back .bg-slate-900\/40, 
          .batch-certificate-back .bg-slate-50 {
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
      <div id="batch-certificate-modal-wrapper" className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl relative z-10 shadow-2xl p-6 sm:p-8 animate-fade-in my-8 max-h-[92vh] overflow-y-auto">
        
        {/* Modal close */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 p-2 hover:bg-slate-850 rounded-xl transition-all cursor-pointer no-print"
          title="Fechar"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="mb-6 space-y-1 no-print bg-slate-900 text-left border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <Sparkles size={16} />
            <span className="text-[10px] tracking-widest font-mono uppercase font-bold">Painel Docente / Lote de Emissão</span>
          </div>
          <h3 className="font-display text-lg sm:text-2xl font-bold text-slate-100">Geração de Certificados em Lote</h3>
          <p className="text-xs text-slate-400">
            Gerando de forma automática os diplomas oficiais (Frente e Verso) para todos os <strong className="text-slate-200">{students.length} alunos</strong> da turma <strong className="text-emerald-450 font-semibold">{turma.name}</strong>.
          </p>
        </div>

        {/* Guidance Alert */}
        <div className="mb-6 p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl flex items-start gap-3 text-left no-print">
          <Award className="text-emerald-400 shrink-0 mt-0.5" size={18} />
          <div className="text-xs space-y-1">
            <p className="font-semibold text-emerald-300">Como funciona o download em lote?</p>
            <p className="text-slate-400 leading-relaxed">
              O sistema gera chaves de autenticação criptográficas únicas para todos os alunos abaixo. Ao clicar em <strong>"Imprimir / Salvar Todos como PDF"</strong>, a janela de impressão do seu navegador será aberta. Selecione a opção de destino <strong>"Salvar como PDF"</strong> para baixar um único arquivo unificado contendo os certificados de todos os alunos (Frente e Verso organizados sequencialmente em páginas separadas).
            </p>
          </div>
        </div>

        {/* Student Table with generated certificates */}
        <div className="bg-slate-950/40 border border-slate-800 rounded-2xl overflow-hidden shadow-md no-print mb-6">
          <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/80 flex justify-between items-center">
            <h4 className="text-xs uppercase tracking-wider text-slate-300 font-semibold">Alunos Contemplados no Lote</h4>
            <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-slate-400">{certs.length} Alunos</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-955 text-slate-450 font-medium">
                  <th className="p-4">Estudante</th>
                  <th className="p-4">Chave Única de Autenticação</th>
                  <th className="p-4">Data de Emissão</th>
                  <th className="p-4 text-right">Ação Rápida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {certs.map(({ student, cert }) => {
                  const issueDateParsed = new Date(cert.issuedAt);
                  const formattedDateRow = issueDateParsed.toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  });
                  return (
                    <tr key={student.userId} className="hover:bg-slate-900/40 transition">
                      <td className="p-4 flex items-center gap-2.5">
                        <img src={student.avatar} alt="" referrerPolicy="no-referrer" className="w-6 h-6 rounded-full object-cover" />
                        <span className="font-bold text-slate-200">{student.name}</span>
                      </td>
                      <td className="p-4 font-mono text-[11px] text-emerald-400 font-semibold">
                        {cert.id}
                      </td>
                      <td className="p-4 text-slate-400 font-mono text-[11px]">
                        {formattedDateRow}
                      </td>
                      <td className="p-4 text-right flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleCopyCode(cert.id)}
                          className="px-2 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded text-[10px] text-slate-300 font-mono transition"
                          title="Copiar Chave de Autenticação"
                        >
                          {copied === cert.id ? 'Copiado!' : 'Copiar Chave'}
                        </button>
                        <button
                          onClick={() => handleDownloadSingleHtml(student, cert)}
                          className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-450 border border-emerald-500/20 rounded transition flex items-center gap-1 text-[10px] font-semibold"
                          title="Baixar Certificado HTML (Imprimir para PDF)"
                        >
                          <FileDown size={12} />
                          <span>Baixar HTML</span>
                        </button>
                        <button
                          onClick={() => handlePrintSingle(cert.id)}
                          disabled={preparingPrint !== null}
                          className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded transition flex items-center gap-1 text-[10px] font-semibold disabled:opacity-50"
                          title="Imprimir / Salvar PDF Direto"
                        >
                          {preparingPrint === cert.id ? (
                            <>
                              <Loader2 className="animate-spin" size={12} />
                              <span>Preparando...</span>
                            </>
                          ) : (
                            <>
                              <Printer size={12} />
                              <span>Imprimir PDF</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-slate-800 pt-5 no-print">
          <p className="text-[10px] sm:text-[11px] text-slate-500 leading-relaxed font-mono max-w-md text-center sm:text-left">
            Total de {certs.length} certificados prontos. Certifique-se de habilitar a opção "Gráficos de plano de fundo" (Background graphics) nas configurações de impressão do navegador para manter as cores e imagens de fundo.
          </p>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none uppercase font-mono font-bold tracking-wider text-[10px] h-10 px-5 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-xl transition border border-slate-800 cursor-pointer"
            >
              Cancelar
            </button>

            <button
              onClick={handleDownloadZip}
              disabled={zipping || certs.length === 0}
              className="flex-1 sm:flex-none uppercase font-mono font-bold tracking-wider text-[10px] h-10 px-6 bg-amber-500 hover:bg-amber-450 text-slate-950 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/10 font-black disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {zipping ? (
                <>
                  <Loader2 size={14} className="animate-spin shrink-0" />
                  <span>Gerando ZIP...</span>
                </>
              ) : (
                <>
                  <FileDown size={14} className="shrink-0" />
                  <span>Baixar Separados (ZIP)</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrintAll}
              className="flex-1 sm:flex-none uppercase font-mono font-bold tracking-wider text-[10px] h-10 px-6 bg-emerald-500 hover:bg-emerald-450 text-slate-950 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/10 font-black"
            >
              <Printer size={14} className="shrink-0" />
              <span>Imprimir / Salvar Todos como PDF</span>
            </button>
          </div>
        </div>

        {/* THE SECRET BATCH PRINT CONTAINER (rendered and styled only during window.print()) */}
        <div id="batch-print-container" className="hidden print:block w-full">
          {certs.map(({ student, cert }) => {
            const issueDateParsed = new Date(cert.issuedAt);
            const formattedDate = issueDateParsed.toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric'
            });
            const certificateId = cert.id;
            const detailText = certSettings.detailedMetadata
              .replace('{duration}', cert.duration)
              .replace('{xpReward}', `+${cert.xpReward} XP`);

            return (
              <React.Fragment key={student.userId}>
                {/* FRONT FACE */}
                <div 
                  className={`batch-certificate-page batch-certificate-front cert-page-${certificateId} ${
                    certSettings.useCustomLayout 
                      ? "w-full relative rounded-2xl overflow-hidden aspect-[1.414/1] bg-slate-950"
                      : "bg-slate-950 border-8 border-double border-teal-500/30 p-8 sm:p-12 md:p-16 rounded-2xl relative overflow-hidden flex flex-col justify-between items-center text-center w-full aspect-[1.414/1]"
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
                    '--inst-size': `${certSettings.customInstitutionSize ?? 1.2}cqw`,
                    '--title-size': `${certSettings.customTitleSize ?? 3.5}cqw`,
                    '--recipient-size': `${certSettings.customRecipientSize ?? 2.2}cqw`,
                    '--recipient-sub-size': `${(certSettings.customRecipientSize ?? 2.2) * 0.4}cqw`,
                    '--desc-size': `${certSettings.customTextSize ?? 1.2}cqw`,
                    '--course-size': `${certSettings.customCourseSize ?? 2.5}cqw`,
                    '--meta-size': `${certSettings.customMetaSize ?? 1.0}cqw`,
                    '--signatures-size': `${certSettings.customSignaturesSize ?? 1.1}cqw`,
                    '--qr-size': `${certSettings.customQrSize ?? 10}cqw`,
                    '--sig-init-size': `${(certSettings.customSignaturesSize ?? 1.1) * 0.9}cqw`,
                    '--sig-name-size': `${(certSettings.customSignaturesSize ?? 1.1) * 0.7}cqw`,
                    '--sig-title-size': `${(certSettings.customSignaturesSize ?? 1.1) * 0.5}cqw`,
                    '--footnote-size': '0.45cqw',
                  } as any}
                >
                  {certSettings.useCustomLayout ? (
                    <div className="absolute inset-0 w-full h-full font-sans">
                      <div 
                        className="absolute left-0 w-full font-mono uppercase tracking-widest font-extrabold px-4 truncate text-center"
                        style={{
                          top: `${certSettings.customInstitutionTop ?? 14}%`,
                          fontSize: `var(--inst-size, ${certSettings.customInstitutionSize ?? 1.2}cqw)`,
                          color: certSettings.customInstitutionColor ?? '#94a3b8'
                        }}
                      >
                        {certSettings.institutionName}
                      </div>

                      <div 
                        className="absolute left-0 w-full font-display font-black tracking-tight uppercase px-4 truncate text-center"
                        style={{
                          top: `${certSettings.customTitleTop ?? 24}%`,
                          fontSize: `var(--title-size, ${certSettings.customTitleSize ?? 3.5}cqw)`,
                          color: certSettings.customTitleColor ?? '#ffffff'
                        }}
                      >
                        {certSettings.certificateTitle}
                      </div>

                      <div 
                        className="absolute left-0 w-full space-y-1 px-4 text-center"
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
                          {student.name}
                        </h2>
                      </div>

                      <p 
                        className="absolute left-1/2 -translate-x-1/2 w-[85%] leading-relaxed text-center"
                        style={{
                          top: `${certSettings.customTextTop ?? 52}%`,
                          fontSize: `var(--desc-size, ${certSettings.customTextSize ?? 1.2}cqw)`,
                          color: certSettings.customTextColor ?? '#cbd5e1'
                        }}
                      >
                        {certSettings.textDescription}
                      </p>

                      <div 
                        className="absolute left-1/2 -translate-x-1/2 px-4 py-1.5 bg-slate-950/40 border border-slate-800/40 rounded-xl text-center"
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

                      <p 
                        className="absolute left-1/2 -translate-x-1/2 w-[80%] leading-normal opacity-90 text-center"
                        style={{
                          top: `${certSettings.customMetaTop ?? 72}%`,
                          fontSize: `var(--meta-size, ${certSettings.customMetaSize ?? 1.0}cqw)`,
                          color: certSettings.customMetaColor ?? '#64748b'
                        }}
                      >
                        {detailText}
                      </p>

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

                      <div 
                        className="absolute w-[80%] left-1/2 -translate-x-1/2 grid grid-cols-2 gap-8 items-end"
                        style={{
                          top: `${certSettings.customSignaturesTop ?? 84}%`,
                          color: certSettings.customSignaturesColor ?? '#cbd5e1'
                        }}
                      >
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

                      <div 
                        className="absolute bottom-2 left-0 w-full flex justify-between px-6 text-[0.45rem] font-mono text-slate-500 tracking-tighter"
                        style={{ fontSize: 'var(--footnote-size, 0.45cqw)' }}
                      >
                        <span>Chave única: {certificateId}</span>
                        <span>Emitido e outorgado em {formattedDate}</span>
                        <span>Autenticação Digital Ativa</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(38,121,68,0.03)_0%,transparent_70%)] pointer-events-none" />
                      <div className="absolute -top-32 -left-32 w-64 h-64 border border-teal-500/5 rounded-full pointer-events-none" />
                      <div className="absolute -bottom-32 -right-32 w-64 h-64 border border-teal-500/5 rounded-full pointer-events-none" />
                      
                      <div className="space-y-4 relative z-10 w-full flex flex-col items-center text-center">
                        <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg mb-2">
                          <Award size={28} />
                        </div>
                        
                        <h4 className="font-mono text-[10px] sm:text-xs uppercase tracking-widest text-[#ccdcd3] font-extrabold pr-1">
                          {certSettings.institutionName}
                        </h4>
                        
                        <h1 className="font-display text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white mt-1 border-b-2 border-emerald-500/20 pb-4 max-w-xl mx-auto uppercase">
                          {certSettings.certificateTitle}
                        </h1>
                      </div>

                      <div className="my-8 sm:my-12 relative z-10 space-y-6 max-w-2xl mx-auto text-center">
                        <p className="font-mono text-xs sm:text-sm text-slate-400 uppercase tracking-wide">
                          Este certificado honorário é orgulhosamente outorgado a
                        </p>
                        
                        <h2 className="font-display text-xl sm:text-3xl md:text-4xl font-extrabold tracking-normal text-emerald-300 py-1 font-serif underline decoration-emerald-500/30 underline-offset-8">
                          {student.name}
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

                      <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-end mt-4 pt-6 border-t border-slate-900/80 relative z-10">
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

                        <div className="flex flex-col items-center justify-center shrink-0">
                          <div className="relative flex items-center justify-center w-16 h-16 rounded-full border border-emerald-500/20 bg-emerald-500/5 rotate-12">
                            <ShieldCheck size={32} className="text-[#3bac6b] fill-[#3bac6b]/5" />
                            <span className="absolute text-[6px] font-mono font-black text-emerald-400 tracking-tighter uppercase whitespace-nowrap">
                              SNC • VERIFICADO • SNC • VERIFICADO
                            </span>
                          </div>
                          <span className="text-[8px] font-mono text-slate-500 mt-2 block tracking-widest leading-none">
                            REGISTRO N° {certificateId.slice(3, 11)}
                          </span>
                        </div>

                        <div className="flex flex-col items-center justify-center space-y-1.5 border-none">
                          <div className="p-1 px-[5px] bg-white rounded-lg shadow-md border border-slate-800 shrink-0">
                            <img 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`${window.location.origin}?validate=${certificateId}`)}`}
                              alt="QR Code"
                              className="w-16 h-16"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <span className="text-[7px] font-mono text-slate-500 uppercase tracking-widest font-black leading-none">
                            Código QR de Validação
                          </span>
                        </div>

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

                {/* BACK FACE (VERSO) */}
                <div 
                  className={`batch-certificate-page batch-certificate-back cert-page-${certificateId}`}
                  style={{
                    aspectRatio: '1.414/1',
                    containerType: 'inline-size' as any,
                  }}
                >
                  <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.03)_0%,transparent_70%)] pointer-events-none" />
                  
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
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[8px] sm:text-[9px] font-mono text-emerald-700 font-bold uppercase">MÓDULO {String(idx + 1).padStart(2, '0')}</span>
                                <span className="text-[8px] font-mono text-slate-500">{mod.lessons?.length || 0} aulas</span>
                              </div>
                              <h4 className="font-display font-bold text-slate-800 text-[10px] sm:text-xs mb-1">{mod.title}</h4>
                              <p className="text-[8px] sm:text-[10px] text-slate-500 mb-2 leading-relaxed">{mod.description || 'Conteúdo programático de especialidade teórica e prática.'}</p>
                            </div>
                            
                            {mod.lessons && mod.lessons.length > 0 && (
                              <div className="border-t border-slate-200 pt-1.5 mt-1 sm:mt-2">
                                <ul className="space-y-0.5">
                                  {mod.lessons.slice(0, 2).map((les) => (
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

                  <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4 items-center border-t border-slate-200 pt-4 relative z-10 text-left">
                    <div className="flex items-center gap-3">
                      <div className="p-1 bg-white rounded-lg border border-slate-200 shrink-0 shadow-sm">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(`${window.location.origin}?validate=${certificateId}`)}`}
                          alt="QR Code"
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

                    <div className="text-center flex flex-col justify-center">
                      <span className="font-mono text-[8px] text-slate-400 uppercase tracking-widest block font-bold">ALUNO(A) REGISTRADO(A)</span>
                      <span className="font-serif text-sm font-bold text-slate-800 mt-1 truncate block">{student.name}</span>
                      <span className="text-[8px] text-slate-400 mt-0.5">CPF e registro de curso validados digitalmente</span>
                    </div>

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
              </React.Fragment>
            );
          })}
        </div>

      </div>
    </div>
  );
}
