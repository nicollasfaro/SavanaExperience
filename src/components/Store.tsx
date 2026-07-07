import React, { useState, useEffect } from 'react';
import { Reward, Redemption } from '../types';
import { localDB } from '../firebase';
import { Gift, Award, CheckCircle2, AlertCircle, X, Copy, Check } from 'lucide-react';

interface StoreProps {
  currentUserId: string;
  rewards: Reward[];
  userXp: number;
  onRedeem: () => void;
}

export function Store({ currentUserId, rewards, userXp, onRedeem }: StoreProps) {
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [rewardToRedeem, setRewardToRedeem] = useState<Reward | null>(null);
  const [userRedemptions, setUserRedemptions] = useState<Redemption[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const loadRedemptions = () => {
    const all = localDB.getRedemptions();
    const mine = all.filter(r => r.userId === currentUserId);
    mine.sort((a, b) => new Date(b.redeemedAt).getTime() - new Date(a.redeemedAt).getTime());
    setUserRedemptions(mine);
  };

  useEffect(() => {
    loadRedemptions();
  }, [currentUserId]);

  const handleRedeemClick = (reward: Reward) => {
    if (userXp < reward.xpCost) {
      alert("Você não tem saldo de XP suficiente para resgatar este prêmio.");
      return;
    }
    setRewardToRedeem(reward);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleRedeemConfirm = async () => {
    if (!rewardToRedeem) return;
    const reward = rewardToRedeem;
    setRewardToRedeem(null);
    setRedeemingId(reward.id);
    
    try {
      let couponCode: string | undefined = undefined;
      if (reward.isCoupon) {
        const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
        couponCode = `SAVANA-${reward.discountPercentage || 10}OFF-${randomStr}`;
      }

      const newRedemption: Redemption = {
        id: `red-${Date.now()}`,
        userId: currentUserId,
        rewardId: reward.id,
        redeemedAt: new Date().toISOString(),
        status: reward.isCoupon ? 'delivered' : 'pending',
        couponCode,
        discountPercentage: reward.isCoupon ? reward.discountPercentage : undefined
      };
      
      await localDB.saveRedemption(newRedemption);
      
      // deduct XP
      await localDB.updateLeaderboardXP(currentUserId, -reward.xpCost);
      
      if (reward.isCoupon && couponCode) {
        setSuccessMsg(`Cupom de ${reward.discountPercentage}% OFF resgatado com sucesso! Código: ${couponCode}`);
      } else {
        setSuccessMsg(`"${reward.title}" resgatado com sucesso! Entraremos em contato.`);
      }
      
      onRedeem(); // refresh external states if needed
      loadRedemptions(); // refresh our local redemptions history
      
    } catch (err) {
      console.error(err);
      alert("Erro ao realizar o resgate.");
    } finally {
      setRedeemingId(null);
      setTimeout(() => setSuccessMsg(null), 8000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-3xl gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-100 flex items-center gap-2">
            <Gift className="text-emerald-400" />
            Loja XP Savana
          </h2>
          <p className="text-slate-400 mt-1 max-w-xl">
            Troque seus pontos de experiência arduamente conquistados por brindes exclusivos, materiais impressos ou vouchers de cursos.
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl flex flex-col items-center shrink-0">
          <span className="text-[10px] uppercase font-mono text-slate-500 mb-1">Seu Saldo Atual</span>
          <span className="text-2xl font-black text-emerald-400">{userXp} <span className="text-sm font-bold text-slate-400">XP</span></span>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-4 rounded-2xl flex items-start sm:items-center gap-3 shadow-lg shadow-emerald-500/5 animate-fade-in">
          <CheckCircle2 size={18} className="shrink-0 mt-0.5 sm:mt-0 text-emerald-400" />
          <div className="flex-1 text-xs sm:text-sm font-semibold">
            {successMsg}
          </div>
        </div>
      )}

      {rewards.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/50 border border-slate-800 rounded-3xl">
          <Award size={48} className="mx-auto text-slate-600 mb-4" />
          <h3 className="text-xl font-bold text-slate-200">A loja está sendo abastecida</h3>
          <p className="text-slate-500 mt-2">Em breve teremos brindes incríveis disponíveis para você.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {rewards.map(reward => {
            const hasEnoughXp = userXp >= reward.xpCost;
            return (
              <div key={reward.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col relative overflow-hidden group">
                {/* Image */}
                <div className="w-full aspect-video rounded-xl bg-slate-950 mb-4 overflow-hidden relative">
                  <img src={reward.imageUrl} alt={reward.title} className="w-full h-full object-cover transition duration-300 group-hover:scale-110" />
                  <div className="absolute top-2 right-2 bg-slate-900/90 backdrop-blur border border-slate-700/50 px-2 py-1 rounded-md flex items-center gap-1 font-mono text-[10px] font-bold text-emerald-400">
                    <Award size={10} />
                    {reward.xpCost} XP
                  </div>
                  {reward.isCoupon && (
                    <div className="absolute bottom-2 left-2 bg-amber-550 border border-amber-400/30 text-amber-950 px-2.5 py-0.5 rounded-full font-sans text-[10px] font-bold shadow-lg">
                      CUPOM {reward.discountPercentage}% OFF
                    </div>
                  )}
                </div>
                
                <h3 className="text-lg font-bold text-slate-200 mb-2">{reward.title}</h3>
                <p className="text-xs text-slate-400 mb-6 flex-1 line-clamp-3 leading-relaxed">
                  {reward.description}
                </p>
                
                <button
                  disabled={!hasEnoughXp || redeemingId === reward.id}
                  onClick={() => handleRedeemClick(reward)}
                  className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 ${
                    !hasEnoughXp
                      ? 'bg-slate-950 border border-slate-850 text-slate-600 cursor-not-allowed'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
                  }`}
                >
                  {redeemingId === reward.id ? 'Processando...' : (hasEnoughXp ? 'Resgatar Brinde' : 'XP Insuficiente')}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* User Redemptions History */}
      {userRedemptions.length > 0 && (
        <div className="mt-12 space-y-4 pt-8 border-t border-slate-800">
          <h3 className="text-lg font-display font-bold text-slate-200 flex items-center gap-2">
            <Gift size={18} className="text-amber-455" />
            Meus Resgates & Cupons
          </h3>
          <p className="text-xs text-slate-400">
            Abaixo estão os cupons que você já resgatou. Você pode copiar o código do cupom a qualquer momento para usar no checkout.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userRedemptions.map(red => {
              const reward = rewards.find(r => r.id === red.rewardId);
              const formattedDate = new Date(red.redeemedAt).toLocaleDateString('pt-BR', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div key={red.id} className="bg-slate-900 border border-slate-800/80 p-4 rounded-2xl flex items-center gap-4 hover:border-slate-700/80 transition shadow-md">
                  {/* Thumbnail / Icon */}
                  <div className="w-12 h-12 rounded-xl bg-slate-950 overflow-hidden shrink-0 border border-slate-800 flex items-center justify-center">
                    {reward ? (
                      <img src={reward.imageUrl} alt={reward.title} className="w-full h-full object-cover" />
                    ) : (
                      <Gift size={20} className="text-slate-600" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-200 truncate">
                      {reward ? reward.title : 'Prêmio Excluído'}
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Resgatado em: {formattedDate}
                    </span>

                    {/* Status or Coupon Code display */}
                    {red.couponCode ? (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg flex items-center justify-between gap-2 max-w-[220px] w-full">
                          <span className="font-mono text-[11px] text-amber-400 font-bold tracking-wider truncate">
                            {red.couponCode}
                          </span>
                          <button
                            onClick={() => handleCopyCode(red.couponCode!)}
                            className="text-slate-400 hover:text-slate-200 transition shrink-0 p-1 rounded hover:bg-slate-900"
                            title="Copiar código"
                          >
                            {copiedCode === red.couponCode ? (
                              <Check size={12} className="text-emerald-400" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                        {copiedCode === red.couponCode && (
                          <span className="text-[9px] font-semibold text-emerald-400 animate-fade-in">Copiado!</span>
                        )}
                      </div>
                    ) : (
                      <div className="mt-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                          red.status === 'delivered' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          <span className="w-1 h-1 rounded-full bg-current" />
                          {red.status === 'delivered' ? 'Entregue' : 'Pendente'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Resgate na Loja */}
      {rewardToRedeem && (
        <div id="reward-redemption-confirmation-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in animate-duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2 text-emerald-400">
                <Gift size={20} className="text-emerald-400" />
                <h3 className="font-display font-bold text-slate-100 text-base">Confirmar Resgate</h3>
              </div>
              <button 
                onClick={() => setRewardToRedeem(null)}
                className="p-1 hover:bg-slate-800 rounded-full text-slate-400 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto border-2 border-emerald-500/20 bg-slate-950">
                <img 
                  src={rewardToRedeem.imageUrl} 
                  alt={rewardToRedeem.title} 
                  className="w-full h-full object-cover" 
                />
              </div>
              
              <div className="space-y-1">
                <h4 className="text-slate-100 font-bold text-base">{rewardToRedeem.title}</h4>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-mono font-bold">
                  <Award size={14} />
                  -{rewardToRedeem.xpCost} XP
                </div>
              </div>

              {rewardToRedeem.isCoupon ? (
                <p className="text-xs text-slate-350 leading-relaxed max-w-xs mx-auto">
                  Deseja resgatar este <strong className="text-amber-400">Cupom de Desconto de {rewardToRedeem.discountPercentage}%</strong>? Um código promocional exclusivo será gerado instantaneamente para você!
                </p>
              ) : (
                <p className="text-xs text-slate-350 leading-relaxed max-w-xs mx-auto">
                  Confirmar o resgate de <strong className="text-slate-200">"{rewardToRedeem.title}"</strong>? Esta pontuação de XP será deduzida da sua carteira.
                </p>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-950/50">
              <button
                type="button"
                onClick={() => setRewardToRedeem(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 transition cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleRedeemConfirm}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-455 text-slate-950 transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-500/10"
              >
                Confirmar Resgate
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
