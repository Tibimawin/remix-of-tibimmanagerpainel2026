import React from 'react';
import { SportsTemplateProps } from './types';
import { Flame, Tv, Trophy } from 'lucide-react';

const TeamShield = ({ logo, name }: { logo: string; name: string }) => {
  if (logo) {
    return (
      <div className="w-16 h-16 flex items-center justify-center p-1 rounded-full bg-white shadow-md overflow-hidden flex-shrink-0 border-2 border-white/30">
        <img src={logo} alt={name} className="w-full h-full object-contain" />
      </div>
    );
  }
  return (
    <div className="w-16 h-16 flex items-center justify-center rounded-full bg-neutral-800 border-2 border-white/30 text-white font-black text-xl flex-shrink-0">
      {name ? name.charAt(0).toUpperCase() : '⚽'}
    </div>
  );
};

export const FeedSquareBanner: React.FC<SportsTemplateProps> = ({
  matches,
  date,
  logo,
  accentColor = '#10b981',
  logoSize,
  logoX,
  logoY,
  brandName = 'FUTEBOL VIP'
}) => {
  return (
    <div 
      className="relative w-[1000px] h-[1000px] bg-[#080B11] overflow-hidden flex flex-col justify-between p-8 font-sans text-white shadow-2xl rounded-none border border-neutral-800"
      style={{
        backgroundImage: `radial-gradient(circle at 50% 10%, ${accentColor}25 0%, #080B11 65%)`
      }}
    >
      {/* Header */}
      <div className="relative z-10 w-full flex justify-between items-center pb-4 border-b border-white/10">
        <div style={{ width: `${logoSize}px`, transform: `translate(${logoX}%, ${logoY}%)` }}>
          {logo ? (
            <img src={logo} alt="Brand" className="max-h-16 object-contain" />
          ) : (
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6" style={{ color: accentColor }} />
              <span className="font-black text-2xl tracking-tighter uppercase italic">{brandName}</span>
            </div>
          )}
        </div>

        <div className="text-center">
          <div 
            className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider mb-1"
            style={{ backgroundColor: `${accentColor}20`, color: accentColor, border: `1px solid ${accentColor}50` }}
          >
            <Flame className="w-3 h-3" />
            <span>FUTEBOL AO VIVO • FEED 1:1</span>
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tight text-white italic">
            JOGOS DE HOJE
          </h2>
          <p className="text-sm font-bold uppercase text-amber-400">
            {date}
          </p>
        </div>

        <div style={{ width: `${logoSize}px`, transform: `translate(${-logoX}%, ${logoY}%)` }} className="flex justify-end">
          {logo ? <img src={logo} alt="Brand" className="max-h-16 object-contain" /> : <div className="w-16" />}
        </div>
      </div>

      {/* Matches Grid (Up to 4 matches in 1:1 square) */}
      <div className="relative z-10 w-full space-y-3.5 my-auto flex flex-col justify-center">
        {matches.slice(0, 4).map((match) => (
          <div key={match.id} className="w-full bg-neutral-900/90 rounded-xl p-4 border border-white/10 shadow-lg flex items-center justify-between relative overflow-hidden">
            {/* Left League Info */}
            <div className="w-[180px] flex flex-col">
              <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider line-clamp-1">
                {match.league}
              </span>
              <span className="text-xs text-white/70 font-bold mt-0.5">{match.time || '16:00'}</span>
            </div>

            {/* Teams Duel */}
            <div className="flex-1 flex items-center justify-center gap-4 px-2">
              <span className="text-xl font-black tracking-tight text-right flex-1 truncate uppercase">{match.teamHome}</span>
              <TeamShield logo={match.logoHome} name={match.teamHome} />
              <span className="text-sm font-black italic px-2" style={{ color: accentColor }}>VS</span>
              <TeamShield logo={match.logoAway} name={match.teamAway} />
              <span className="text-xl font-black tracking-tight text-left flex-1 truncate uppercase">{match.teamAway}</span>
            </div>

            {/* Right Channel */}
            <div className="w-[150px] flex justify-end">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/80 border border-white/10 text-[11px] font-bold">
                <Tv className="w-3.5 h-3.5 text-red-500" />
                <span className="uppercase text-amber-300 font-black">{match.channel || 'HD'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="relative z-10 w-full flex justify-between items-center pt-3 border-t border-white/10 text-xs text-white/70 font-bold">
        <span>Transmissão em alta resolução sem travamentos</span>
        <span style={{ color: accentColor }}>Peça seu teste grátis agora</span>
      </div>
    </div>
  );
};
