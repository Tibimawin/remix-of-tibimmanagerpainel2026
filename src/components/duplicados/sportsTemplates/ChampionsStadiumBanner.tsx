import React from 'react';
import { SportsTemplateProps } from './types';
import { Trophy, Star, Tv, Sparkles } from 'lucide-react';

const TeamShield = ({ logo, name }: { logo: string; name: string }) => {
  if (logo) {
    return (
      <div className="w-20 h-20 flex items-center justify-center p-1.5 rounded-2xl bg-white/10 backdrop-blur-md border border-cyan-400/40 shadow-[0_0_20px_rgba(6,182,212,0.3)] overflow-hidden flex-shrink-0">
        <img src={logo} alt={name} className="w-full h-full object-contain" />
      </div>
    );
  }
  return (
    <div className="w-20 h-20 flex items-center justify-center rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-950 border border-cyan-400/40 shadow-[0_0_20px_rgba(6,182,212,0.3)] text-cyan-300 font-black text-2xl flex-shrink-0">
      {name ? name.charAt(0).toUpperCase() : '★'}
    </div>
  );
};

export const ChampionsStadiumBanner: React.FC<SportsTemplateProps> = ({
  matches,
  date,
  logo,
  accentColor = '#0055ff',
  logoSize,
  logoX,
  logoY,
  brandName = 'CHAMPIONS LIVE'
}) => {
  return (
    <div 
      className="relative w-[1000px] min-h-[1250px] bg-[#030712] overflow-hidden flex flex-col items-center py-10 px-8 font-sans text-white shadow-2xl rounded-none border border-cyan-900/40"
      style={{
        backgroundImage: 'radial-gradient(ellipse at 50% 15%, #0d2149 0%, #030712 70%)'
      }}
    >
      {/* Star Particles / Constellation Ambient */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
        <div className="absolute top-12 left-16 w-1.5 h-1.5 bg-cyan-300 rounded-full animate-ping" />
        <div className="absolute top-24 right-28 w-2 h-2 bg-blue-300 rounded-full" />
        <div className="absolute top-44 left-1/3 w-1 h-1 bg-white rounded-full opacity-80" />
        <div className="absolute top-1/2 right-12 w-1.5 h-1.5 bg-indigo-300 rounded-full" />
        <div className="absolute bottom-32 left-20 w-2 h-2 bg-cyan-400 rounded-full blur-[0.5px]" />
      </div>

      {/* Top Header */}
      <div className="relative z-10 w-full flex justify-between items-center pb-6 border-b border-cyan-500/20">
        <div style={{ width: `${logoSize}px`, transform: `translate(${logoX}%, ${logoY}%)` }}>
          {logo ? (
            <img src={logo} alt="Brand" className="max-h-20 object-contain drop-shadow-[0_0_15px_rgba(0,150,255,0.5)]" />
          ) : (
            <div className="flex items-center gap-2">
              <Trophy className="w-8 h-8 text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]" />
              <span className="font-black text-2xl tracking-wider text-white uppercase italic drop-shadow">{brandName}</span>
            </div>
          )}
        </div>

        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-[11px] font-black uppercase tracking-widest bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)] mb-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
            <span>SUPER RODADA DE FUTEBOL</span>
          </div>
          <h2 className="text-4xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-blue-300 drop-shadow-md">
            NOITE DE DECISÃO
          </h2>
          <p className="text-xl font-bold uppercase mt-1 tracking-widest text-amber-300 drop-shadow">
            {date}
          </p>
        </div>

        <div style={{ width: `${logoSize}px`, transform: `translate(${-logoX}%, ${logoY}%)` }} className="flex justify-end">
          {logo ? (
            <img src={logo} alt="Brand" className="max-h-20 object-contain drop-shadow-[0_0_15px_rgba(0,150,255,0.5)]" />
          ) : (
            <div className="w-20" />
          )}
        </div>
      </div>

      {/* Matches Grid */}
      <div className="relative z-10 w-full space-y-5 max-w-[880px] my-8 flex-1">
        {matches.map((match) => (
          <div key={match.id} className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#07132c]/90 via-[#0a183d]/90 to-[#07132c]/90 border border-cyan-500/30 p-5 shadow-[0_10px_30px_rgba(0,20,60,0.6)] flex items-center justify-between">
            {/* Top League Ribbon */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-700 via-cyan-600 to-blue-700 px-8 py-0.5 rounded-b-xl text-[11px] font-black uppercase tracking-widest text-white shadow-md border-b border-cyan-300/40 flex items-center gap-2">
              <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
              <span>{match.league}</span>
              {match.time && <span className="bg-black/50 px-2 py-0.2 rounded text-[10px]">{match.time}</span>}
              <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
            </div>

            {/* Team Home */}
            <div className="flex items-center gap-5 flex-1 justify-end pt-3">
              <span className="text-2xl font-black tracking-tight text-right uppercase text-white drop-shadow leading-tight max-w-[200px]">
                {match.teamHome}
              </span>
              <TeamShield logo={match.logoHome} name={match.teamHome} />
            </div>

            {/* Center VS Trophy */}
            <div className="flex flex-col items-center mx-8 pt-3">
              <div className="w-16 h-16 rounded-full bg-gradient-to-b from-cyan-500/20 to-blue-900/40 border border-cyan-400/50 flex flex-col items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                <span className="text-2xl font-black italic text-cyan-200">VS</span>
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
            <div className="absolute bottom-2.5 right-6 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3.5 py-1 rounded-full border border-cyan-400/30 text-[10px] font-bold">
              <Tv className="w-3 h-3 text-cyan-400" />
              <span className="text-white/60">AO VIVO:</span>
              <span className="text-cyan-300 font-black uppercase">{match.channel || 'ESPN / STAR+'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="relative z-10 w-full flex flex-col items-center pt-4 border-t border-cyan-500/20">
        <div className="px-8 py-2 rounded-full bg-gradient-to-r from-blue-950 via-cyan-950 to-blue-950 border border-cyan-400/30 text-xs font-black uppercase tracking-widest text-cyan-200 shadow-md mb-5">
          ⭐ TRANSMISSÃO EXCLUSIVA EM ULTRA HD COM ÁUDIO DE ESTÁDIO
        </div>
        <div className="text-[11px] text-white/50 tracking-wider font-semibold">
          DISPONÍVEL EM SMART TV, CELULAR, COMPUTADOR E TV BOX
        </div>
      </div>
    </div>
  );
};
