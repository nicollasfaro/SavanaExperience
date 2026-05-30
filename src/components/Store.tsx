import React, { useState } from 'react';
import { Reward, Redemption } from '../types';
import { localDB } from '../firebase';
import { Gift, Award, CheckCircle2 } from 'lucide-react';

interface StoreProps {
  currentUserId: string;
  rewards: Reward[];
  userXp: number;
  onRedeem: () => void;
}

export function Store({ currentUserId, rewards, userXp, onRedeem }: StoreProps) {
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleRedeem = async (reward: Reward) => {
    if (userXp < reward.xpCost) {
      alert("Você não tem saldo de XP suficiente para resgatar este prêmio.");
      return;
    }
    
    // confirm
    if (!confirm(`Confirmar o resgate de "${reward.title}" por ${reward.xpCost} XP?`)) return;

    setRedeemingId(reward.id);
    
    try {
      const newRedemption: Redemption = {
        id: `red-${Date.now()}`,
        userId: currentUserId,
        rewardId: reward.id,
        redeemedAt: new Date().toISOString(),
        status: 'pending'
      };
      
      await localDB.saveRedemption(newRedemption);
      
      // deduct XP
      await localDB.updateLeaderboardXP(currentUserId, -reward.xpCost);
      
      setSuccessMsg(`"${reward.title}" resgatado com sucesso! Entraremos em contato.`);
      onRedeem(); // refresh external states if needed
      
    } catch (err) {
      console.error(err);
      alert("Erro ao realizar o resgate.");
    } finally {
      setRedeemingId(null);
      setTimeout(() => setSuccessMsg(null), 4000);
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
        <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-4 py-3 rounded-xl flex items-center gap-2">
          <CheckCircle2 size={16} />
          {successMsg}
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
                </div>
                
                <h3 className="text-lg font-bold text-slate-200 mb-2">{reward.title}</h3>
                <p className="text-xs text-slate-400 mb-6 flex-1 line-clamp-3 leading-relaxed">
                  {reward.description}
                </p>
                
                <button
                  disabled={!hasEnoughXp || redeemingId === reward.id}
                  onClick={() => handleRedeem(reward)}
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
    </div>
  );
}
