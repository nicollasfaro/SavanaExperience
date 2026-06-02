import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Check, AlertTriangle, ShieldCheck } from 'lucide-react';
import { isPushSubscribed, subscribeToPushNotifications } from '../lib/pushService';

interface PushNotificationToggleProps {
  currentUserId: string;
}

export function PushNotificationToggle({ currentUserId }: PushNotificationToggleProps) {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [permissionState, setPermissionState] = useState<string>('');

  useEffect(() => {
    const isPushSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setSupported(isPushSupported);
    
    if (isPushSupported) {
      setPermissionState(window.Notification.permission);
      if (currentUserId) {
        isPushSubscribed().then(setSubscribed);
      }
    }
  }, [currentUserId]);

  const handleToggle = async () => {
    if (!currentUserId || loading) return;
    setLoading(true);

    try {
      const success = await subscribeToPushNotifications(currentUserId);
      setSubscribed(success);
      if ('Notification' in window) {
        setPermissionState(window.Notification.permission);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!supported) return null;

  return (
    <div className="mb-3 p-2.5 bg-slate-950 rounded-xl border border-slate-850/70 text-[10px] animate-fadeIn">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {subscribed ? (
            <ShieldCheck className="text-emerald-400 shrink-0" size={13} />
          ) : (
            <BellOff className="text-slate-500 shrink-0" size={13} />
          )}
          <div className="text-left">
            <p className="font-semibold text-slate-200">
              {subscribed ? 'Avisos Push Ativados!' : 'Alertas Push (Segundo Plano)'}
            </p>
            <p className="text-[9px] text-slate-500 leading-tight mt-0.5">
              {subscribed 
                ? 'Você receberá avisos sobre novas aulas mesmo fora da plataforma.'
                : 'Seja avisado sobre novas aulas ao vivo imediatamente fora da aba.'}
            </p>
          </div>
        </div>

        {subscribed ? (
          <span className="flex h-5 items-center gap-0.5 px-2 text-[8px] font-mono font-bold bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20 select-none">
            <Check size={9} /> ATIVO
          </span>
        ) : permissionState === 'denied' ? (
          <span className="flex h-5 items-center gap-0.5 px-2 text-[8px] font-mono font-bold bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/20 select-none" title="Bloqueado nas configurações do navegador">
            <AlertTriangle size={9} /> BLOQUEADO
          </span>
        ) : (
          <button
            type="button"
            onClick={handleToggle}
            disabled={loading}
            className="h-6 px-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 hover:shadow-sm font-bold rounded-lg transition-all text-[9.5px] cursor-pointer shrink-0 disabled:opacity-50"
          >
            {loading ? 'Ativando...' : 'Ativar'}
          </button>
        )}
      </div>
    </div>
  );
}
