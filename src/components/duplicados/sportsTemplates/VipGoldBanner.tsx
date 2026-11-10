import React from 'react';
import { SportsTemplateProps } from './types';
import { Crown, Tv, Star, ShieldCheck } from 'lucide-react';

const TeamShield = ({ logo, name }: { logo: string; name: string }) => {
  if (logo) {
    return (
      <div className="w-20 h-20 flex items-center justify-center p-1.5 rounded-full bg-black border-2 border-amber-400 shadow-[0_0_20px_rgba(212,175,55,0.4)] overflow-hidden flex-shrink-0">
        <img src={logo} alt={name} className="w-full h-full object-contain" />
      </div>
    );
  }
  return (
    <div className="w-20 h-20 flex items-center justify-center rounded-full bg-gradient-to-br from-amber-900 to-black border-2 border-amber-400 shadow-[0_0_20px_rgba(212,175,55,0.4)] text-amber-300 font-black text-2xl flex-shrink-0">
      {name ? name.charAt(0).toUpperCase() : '★'}
    </div>
  );
};

export const VipGoldBanner: React.FC<SportsTemplateProps> = ({
  matches,
  date,
  logo,
  accentColor = '#D4AF37',
  logoSize,
  logoX,
  logoY,
  brandName = 'VIP SPORTS'
}) => {
  return (
    <div 
      className="relative w-[1000px] min-h-[1250px] bg-[#0A0907] overflow-hidden flex flex-col items-center py-10 px-8 font-sans text-white shadow-2xl rounded-none border-2 border-amber-500/40"
      style={{
        backgroundImage: 'radial-gradient(circle at 50% 15%, #251e0d 0%, #0A0907 70%)'
      }}
    >
      {/* Top Header */}
      <div className="relative z-10 w-full flex justify-between items-center pb-6 border-b border-amber-500/30">
        <div style={{ width: `${logoSize}px`, transform: `translate(${logoX}%, ${logoY}%)` }}>
          {logo ? (
            <img src={logo} alt="Brand" className="max-h-20 object-contain drop-shadow-[0_0_15px_rgba(212,175,55,0.5)]" />
          ) : (
            <div className="flex items-center gap-2">
              <Crown className="w-8 h-8 text-amber-400" />
              <span className="font-black text-2xl tracking-widest uppercase italic text-amber-300">{brandName}</span>
            </div>
          )}
        </div>

        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-amber-500/20 via-amber-400/30 to-amber-500/20 border border-amber-400/60 text-amber-300 shadow-[0_0_15px_rgba(212,175,55,0.3)] mb-2">
            <Crown className="w-3 h-3 text-amber-400" />
            <span>TRANSMISSÃO EXCLUSIVA VIP • 4K</span>
          </div>
          <h2 className="text-4xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 drop-shadow">
            GRADE DE JOGOS VIP
          </h2>
          <p className="text-xl font-bold uppercase mt-1 tracking-widest text-amber-200">
            {date}
          </p>
        </div>

        <div style={{ width: `${logoSize}px`, transform: `translate(${-logoX}%, ${logoY}%)` }} className="flex justify-end">
          {logo ? (
            <img src={logo} alt="Brand" className="max-h-20 object-contain drop-shadow-[0_0_15px_rgba(212,175,55,0.5)]" />
          ) : (
            <div className="w-20" />
          )}
        </div>
      </div>

      {/* Matches List */}
      <div className="relative z-10 w-full space-y-5 max-w-[880px] my-8 flex-1">
        {matches.map((match) => (
          <div key={match.id} className="relative rounded-xl overflow-hidden bg-gradient-to-r from-[#141108] via-[#1a160c] to-[#141108] border border-amber-400/40 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.9)] flex items-center justify-between">
            {/* Top League Ribbon */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 px-8 py-0.5 rounded-b-md text-[10px] font-black uppercase tracking-widest text-black shadow-md flex items-center gap-1.5">
              <span>{match.league}</span>
              {match.time && <span>• {match.time}</span>}
            </div>

            {/* Team Home */}
            <div className="flex items-center gap-5 flex-1 justify-end pt-3">
              <span className="text-2xl font-black tracking-tight text-right uppercase text-white drop-shadow leading-tight max-w-[200px]">
                {match.teamHome}
              </span>
              <TeamShield logo={match.logoHome} name={match.teamHome} />
            </div>

            {/* VS Gold Badge */}
            <div className="flex flex-col items-center mx-8 pt-3">
              <div className="w-14 h-14 rounded-full bg-gradient-to-b from-amber-400 to-yellow-600 flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.5)] border-2 border-white/40">
                <span className="text-xl font-black italic text-black">VS</span>
              </div>
            </div>

            {/* Team Away */}
            <div className="flex items-center gap-5 flex-1 justify-start pt-3">
              <TeamShield logo={match.logoAway} name={match.teamAway} />
              <span className="text-2xl font-black tracking-tight text-left uppercase text-white drop-shadow leading-tight max-w-[200px]">
                {match.teamAway}
              </span>
            </div>

            {/* Channel Badge */}
            <div className="absolute bottom-2.5 right-6 flex items-center gap-1.5 bg-black/90 px-3.5 py-1 rounded-full border border-amber-400/40 text-[10px] font-bold">
              <Tv className="w-3 h-3 text-amber-400" />
              <span className="text-white/60">CANAL:</span>
              <span className="text-amber-300 font-black uppercase">{match.channel || 'PPV HD'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="relative z-10 w-full flex flex-col items-center pt-4 border-t border-amber-500/30">
        <div className="flex items-center gap-2 px-8 py-2 rounded-full bg-gradient-to-r from-amber-500/10 via-amber-400/20 to-amber-500/10 border border-amber-400/40 text-xs font-black uppercase tracking-widest text-amber-300 shadow-md mb-2">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <span>SERVIDORES PRIVADOS VIP • QUALIDADE MÁXIMA 4K & SEM TRAVAS</span>
        </div>
      </div>
    </div>
  );
};
