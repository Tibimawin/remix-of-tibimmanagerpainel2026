import React from 'react';
import { SportsTemplateProps } from './types';
import { Calendar, Clock, Tv } from 'lucide-react';

const TeamShield = ({ logo, name }: { logo: string; name: string }) => {
  if (logo) {
    return (
      <div className="w-[72px] h-[72px] flex items-center justify-center p-2 rounded-2xl bg-neutral-900 border border-neutral-700 shadow-sm overflow-hidden flex-shrink-0">
        <img src={logo} alt={name} className="w-full h-full object-contain" />
      </div>
    );
  }
  return (
    <div className="w-[72px] h-[72px] flex items-center justify-center rounded-2xl bg-neutral-800 border border-neutral-700 text-neutral-300 font-bold text-xl flex-shrink-0">
      {name ? name.charAt(0).toUpperCase() : '•'}
    </div>
  );
};

export const MinimalistCleanBanner: React.FC<SportsTemplateProps> = ({
  matches,
  date,
  logo,
  accentColor = '#3b82f6',
  logoSize,
  logoX,
  logoY,
  brandName = 'SPORTS HUB'
}) => {
  return (
    <div className="relative w-[1000px] min-h-[1200px] bg-[#0C0F17] overflow-hidden flex flex-col items-center py-12 px-10 font-sans text-white shadow-2xl rounded-none border border-neutral-800">
      {/* Header */}
      <div className="relative z-10 w-full flex justify-between items-center pb-8 border-b border-neutral-800">
        <div style={{ width: `${logoSize}px`, transform: `translate(${logoX}%, ${logoY}%)` }}>
          {logo ? (
            <img src={logo} alt="Brand" className="max-h-16 object-contain" />
          ) : (
            <span className="font-extrabold text-2xl tracking-tight text-white uppercase">{brandName}</span>
          )}
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-1">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span>{date}</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">
            Programação Esportiva
          </h2>
        </div>

        <div className="text-right text-xs text-neutral-500 font-medium">
          <span>AO VIVO EM HD</span>
        </div>
      </div>

      {/* Matches List */}
      <div className="relative z-10 w-full space-y-4 max-w-[880px] my-8 flex-1">
        {matches.map((match) => (
          <div key={match.id} className="w-full rounded-2xl bg-neutral-900/70 border border-neutral-800/80 p-5 flex items-center justify-between hover:border-neutral-700 transition-colors">
            {/* Left League Info */}
            <div className="w-[180px] flex flex-col">
              <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">{match.league}</span>
              <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-1">
                <Clock className="w-3 h-3" />
                <span>{match.time || '16:00'}</span>
              </div>
            </div>

            {/* Duel Middle */}
            <div className="flex-1 flex items-center justify-center gap-6 px-4">
              <span className="text-xl font-bold tracking-tight text-right flex-1 truncate">{match.teamHome}</span>
              <TeamShield logo={match.logoHome} name={match.teamHome} />
              <span className="text-xs font-black text-neutral-500 px-1">VS</span>
              <TeamShield logo={match.logoAway} name={match.teamAway} />
              <span className="text-xl font-bold tracking-tight text-left flex-1 truncate">{match.teamAway}</span>
            </div>

            {/* Right Channel Pill */}
            <div className="w-[160px] flex justify-end">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-xs font-bold text-white">
                <Tv className="w-3.5 h-3.5 text-blue-400" />
                <span>{match.channel || 'HD'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="relative z-10 w-full flex justify-between items-center pt-6 border-t border-neutral-800 text-xs text-neutral-400">
        <span>Transmissão em alta resolução para todos os dispositivos</span>
        <span className="font-semibold text-blue-400">Assista sem travamentos</span>
      </div>
    </div>
  );
};
