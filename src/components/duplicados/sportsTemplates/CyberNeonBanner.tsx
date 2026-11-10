import React from 'react';
import { SportsTemplateProps } from './types';
import { Zap, Radio, Tv, Flame } from 'lucide-react';

const TeamShield = ({ logo, name, side }: { logo: string; name: string; side: 'home' | 'away' }) => {
  const borderColor = side === 'home' ? 'border-cyan-400' : 'border-rose-500';
  const shadowColor = side === 'home' ? 'shadow-[0_0_20px_rgba(6,182,212,0.5)]' : 'shadow-[0_0_20px_rgba(244,63,94,0.5)]';

  if (logo) {
    return (
      <div className={`w-20 h-20 flex items-center justify-center p-1.5 rounded-xl bg-black/80 border-2 ${borderColor} ${shadowColor} overflow-hidden flex-shrink-0`}>
        <img src={logo} alt={name} className="w-full h-full object-contain" />
      </div>
    );
  }
  return (
    <div className={`w-20 h-20 flex items-center justify-center rounded-xl bg-black/80 border-2 ${borderColor} ${shadowColor} text-white font-black text-2xl flex-shrink-0`}>
      {name ? name.charAt(0).toUpperCase() : '⚡'}
    </div>
  );
};

export const CyberNeonBanner: React.FC<SportsTemplateProps> = ({
  matches,
  date,
  logo,
  accentColor = '#06b6d4',
  logoSize,
  logoX,
  logoY,
  brandName = 'CYBER SPORTS'
}) => {
  return (
    <div 
      className="relative w-[1000px] min-h-[1250px] bg-[#06070B] overflow-hidden flex flex-col items-center py-10 px-8 font-sans text-white shadow-2xl rounded-none border border-cyan-500/30"
      style={{
        backgroundImage: 'radial-gradient(circle at 50% 10%, #0e1e38 0%, #06070B 65%)'
      }}
    >
      {/* Laser Neon Light Flares */}
      <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-rose-500/20 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 w-full flex justify-between items-center pb-6 border-b border-white/10">
        <div style={{ width: `${logoSize}px`, transform: `translate(${logoX}%, ${logoY}%)` }}>
          {logo ? (
            <img src={logo} alt="Brand" className="max-h-20 object-contain drop-shadow-[0_0_15px_rgba(6,182,212,0.6)]" />
          ) : (
            <div className="flex items-center gap-2">
              <Zap className="w-8 h-8 text-cyan-400 animate-pulse drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
              <span className="font-black text-3xl tracking-tighter uppercase italic text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-rose-400">
                {brandName}
              </span>
            </div>
          )}
        </div>

        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)] mb-2">
            <Radio className="w-3 h-3 text-rose-500 animate-ping" />
            <span>TRANSMISSÃO 4K • 60 FPS • ZERO DELAY</span>
          </div>
          <h2 className="text-4xl font-black uppercase tracking-tight text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] italic">
            CARDÁPIO DE JOGOS
          </h2>
          <p className="text-xl font-bold uppercase mt-1 tracking-wider text-rose-400 drop-shadow-[0_0_10px_rgba(244,63,94,0.6)]">
            {date}
          </p>
        </div>

        <div style={{ width: `${logoSize}px`, transform: `translate(${-logoX}%, ${logoY}%)` }} className="flex justify-end">
          {logo ? (
            <img src={logo} alt="Brand" className="max-h-20 object-contain drop-shadow-[0_0_15px_rgba(244,63,94,0.6)]" />
          ) : (
            <div className="w-20" />
          )}
        </div>
      </div>

      {/* Matches List */}
      <div className="relative z-10 w-full space-y-5 max-w-[880px] my-8 flex-1">
        {matches.map((match) => (
          <div key={match.id} className="relative rounded-xl overflow-hidden bg-[#0A0D14]/90 border border-white/10 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex items-center justify-between">
            {/* Cyber Corner Marks */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-cyan-400" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-rose-500" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-cyan-400" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-rose-500" />

            {/* Top League Badge */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-black/90 px-8 py-0.5 rounded-b-md text-[10px] font-black uppercase tracking-widest text-cyan-300 border-x border-b border-cyan-500/40 flex items-center gap-2">
              <span>{match.league}</span>
              {match.time && <span className="text-rose-400 font-bold">• {match.time}</span>}
            </div>

            {/* Team Home */}
            <div className="flex items-center gap-5 flex-1 justify-end pt-3">
              <span className="text-2xl font-black tracking-tight text-right uppercase text-white drop-shadow leading-tight max-w-[200px]">
                {match.teamHome}
              </span>
              <TeamShield logo={match.logoHome} name={match.teamHome} side="home" />
            </div>

            {/* VS Cyber Emblem */}
            <div className="flex flex-col items-center mx-8 pt-3">
              <div className="w-14 h-14 rounded-lg bg-black border border-white/20 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                <span className="text-2xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-rose-400">
                  VS
                </span>
              </div>
            </div>

            {/* Team Away */}
            <div className="flex items-center gap-5 flex-1 justify-start pt-3">
              <TeamShield logo={match.logoAway} name={match.teamAway} side="away" />
              <span className="text-2xl font-black tracking-tight text-left uppercase text-white drop-shadow leading-tight max-w-[200px]">
                {match.teamAway}
              </span>
            </div>

            {/* Channel Pill */}
            <div className="absolute bottom-2.5 right-6 flex items-center gap-1.5 bg-black/90 px-3 py-1 rounded border border-rose-500/40 text-[10px] font-black shadow-[0_0_10px_rgba(244,63,94,0.3)]">
              <Tv className="w-3 h-3 text-rose-400" />
              <span className="text-white/70">CANAL:</span>
              <span className="text-cyan-300 uppercase">{match.channel || 'PREMIERE'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="relative z-10 w-full flex flex-col items-center pt-4 border-t border-white/10">
        <div className="flex items-center gap-2 px-8 py-2 rounded-lg bg-gradient-to-r from-cyan-950/80 via-black to-rose-950/80 border border-white/15 text-xs font-black uppercase tracking-widest text-white shadow-lg mb-4">
          <Flame className="w-4 h-4 text-rose-500 animate-bounce" />
          <span>GARANTA SEU ACESSO E NÃO PERCA NENHUM LANCE</span>
        </div>
      </div>
    </div>
  );
};
