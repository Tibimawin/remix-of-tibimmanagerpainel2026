import React from 'react';
import { SportsTemplateProps } from './types';
import { Flame, Tv, MessageCircle, Trophy } from 'lucide-react';

const TeamShield = ({ logo, name }: { logo: string; name: string }) => {
  if (logo) {
    return (
      <div className="w-16 h-16 flex items-center justify-center p-1 rounded-full bg-white shadow-md overflow-hidden flex-shrink-0 border-2 border-white/40">
        <img src={logo} alt={name} className="w-full h-full object-contain" />
      </div>
    );
  }
  return (
    <div className="w-16 h-16 flex items-center justify-center rounded-full bg-neutral-800 border-2 border-white/40 shadow-md text-white font-black text-xl flex-shrink-0">
      {name ? name.charAt(0).toUpperCase() : '⚽'}
    </div>
  );
};

export const StoriesMatchBanner: React.FC<SportsTemplateProps> = ({
  matches,
  date,
  logo,
  accentColor = '#e50914',
  logoSize,
  logoX,
  logoY,
  brandName = 'STREAM PLAY'
}) => {
  return (
    <div 
      className="relative w-[720px] min-h-[1280px] bg-[#0A0B10] overflow-hidden flex flex-col justify-between py-8 px-6 font-sans text-white shadow-2xl rounded-none border border-white/10"
      style={{
        backgroundImage: `radial-gradient(ellipse at 50% 0%, ${accentColor}35 0%, #0A0B10 70%)`
      }}
    >
      {/* Top Stories Progress Bar Simulation */}
      <div className="relative z-10 w-full flex gap-1 mb-4">
        <div className="h-1 flex-1 rounded-full bg-white" />
        <div className="h-1 flex-1 rounded-full bg-white/40" />
        <div className="h-1 flex-1 rounded-full bg-white/40" />
      </div>

      {/* Top Header */}
      <div className="relative z-10 w-full flex flex-col items-center text-center">
        <div style={{ width: `${logoSize}px`, transform: `translate(${logoX}%, ${logoY}%)` }} className="mb-3">
          {logo ? (
            <img src={logo} alt="Brand" className="max-h-16 object-contain mx-auto" />
          ) : (
            <div className="inline-flex items-center gap-2">
              <Trophy className="w-6 h-6" style={{ color: accentColor }} />
              <span className="font-black text-2xl tracking-tight uppercase italic">{brandName}</span>
            </div>
          )}
        </div>

        <div 
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border mb-1"
          style={{ backgroundColor: `${accentColor}25`, borderColor: `${accentColor}60`, color: '#FFFFFF' }}
        >
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>FUTEBOL AO VIVO HOJE</span>
        </div>
        <h2 className="text-3xl font-black uppercase tracking-tight italic">
          JOGOS DO DIA
        </h2>
        <p className="text-sm font-bold uppercase text-amber-400">
          {date}
        </p>
      </div>

      {/* Matches List (Optimized for Stories 9:16) */}
      <div className="relative z-10 w-full space-y-4 my-6 flex-1 flex flex-col justify-center">
        {matches.slice(0, 6).map((match) => (
          <div key={match.id} className="w-full bg-neutral-900/90 rounded-xl p-3.5 border border-white/10 shadow-xl flex flex-col gap-2 relative overflow-hidden">
            {/* League & Time Header */}
            <div className="flex justify-between items-center text-[10px] font-black uppercase border-b border-white/10 pb-1.5">
              <span className="text-white/80">{match.league}</span>
              <span className="px-2 py-0.5 rounded text-white font-bold" style={{ backgroundColor: accentColor }}>
                {match.time || 'AO VIVO'}
              </span>
            </div>

            {/* Duel Row */}
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3 flex-1 justify-end">
                <span className="text-base font-black tracking-tight text-right uppercase leading-tight line-clamp-1">
                  {match.teamHome}
                </span>
                <TeamShield logo={match.logoHome} name={match.teamHome} />
              </div>

              <div className="px-4 text-sm font-black italic text-amber-400">
                VS
              </div>

              <div className="flex items-center gap-3 flex-1 justify-start">
                <TeamShield logo={match.logoAway} name={match.teamAway} />
                <span className="text-base font-black tracking-tight text-left uppercase leading-tight line-clamp-1">
                  {match.teamAway}
                </span>
              </div>
            </div>

            {/* Channel Footer */}
            <div className="flex justify-between items-center text-[9px] pt-1 border-t border-white/5 text-white/60">
              <span>CANAL DE TRANSMISSÃO:</span>
              <span className="font-black text-amber-400 uppercase">{match.channel || 'PREMIERE HD'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Stories Bottom Call to Action */}
      <div className="relative z-10 w-full flex flex-col items-center">
        <div 
          className="w-full py-3 px-4 rounded-xl font-black text-sm uppercase tracking-wider text-center shadow-xl flex items-center justify-center gap-2"
          style={{ backgroundColor: accentColor, color: '#FFFFFF' }}
        >
          <MessageCircle className="w-4 h-4 fill-white" />
          <span>CHAME NO WHATSAPP E PEÇA SEU TESTE GRÁTIS</span>
        </div>
        <span className="text-[10px] text-white/50 uppercase tracking-widest mt-2">
          ACESSE AGORA PELO LINK NA BIO
        </span>
      </div>
    </div>
  );
};
