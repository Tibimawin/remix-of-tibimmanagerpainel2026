import React from 'react';
import { SportsTemplateProps } from './types';
import { Calendar, Tv, Trophy, Layers } from 'lucide-react';

const TeamShield = ({ logo, name }: { logo: string; name: string }) => {
  if (logo) {
    return (
      <div className="w-12 h-12 flex items-center justify-center p-1 rounded-full bg-white shadow-sm overflow-hidden flex-shrink-0 border border-white/30">
        <img src={logo} alt={name} className="w-full h-full object-contain" />
      </div>
    );
  }
  return (
    <div className="w-12 h-12 flex items-center justify-center rounded-full bg-neutral-800 border border-white/20 text-white font-bold text-sm flex-shrink-0">
      {name ? name.charAt(0).toUpperCase() : '⚽'}
    </div>
  );
};

export const GridMultiJogosBanner: React.FC<SportsTemplateProps> = ({
  matches,
  date,
  logo,
  accentColor = '#2563eb',
  logoSize,
  logoX,
  logoY,
  brandName = 'GUIA DA RODADA'
}) => {
  return (
    <div 
      className="relative w-[1000px] min-h-[1250px] bg-[#0A0D14] overflow-hidden flex flex-col justify-between p-8 font-sans text-white shadow-2xl rounded-none border border-neutral-800"
      style={{
        backgroundImage: `radial-gradient(circle at 50% 10%, ${accentColor}30 0%, #0A0D14 65%)`
      }}
    >
      {/* Header */}
      <div className="relative z-10 w-full flex justify-between items-center pb-5 border-b border-white/10">
        <div style={{ width: `${logoSize}px`, transform: `translate(${logoX}%, ${logoY}%)` }}>
          {logo ? (
            <img src={logo} alt="Brand" className="max-h-16 object-contain" />
          ) : (
            <div className="flex items-center gap-2">
              <Trophy className="w-7 h-7 text-blue-400" />
              <span className="font-black text-2xl tracking-tighter uppercase italic">{brandName}</span>
            </div>
          )}
        </div>

        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/40 mb-1">
            <Layers className="w-3.5 h-3.5" />
            <span>GRADE COMPLETA DE TRANSMISSÕES</span>
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tight text-white italic">
            TODOS OS JOGOS DA RODADA
          </h2>
          <p className="text-sm font-bold uppercase text-amber-400">
            {date}
          </p>
        </div>

        <div style={{ width: `${logoSize}px`, transform: `translate(${-logoX}%, ${logoY}%)` }} className="flex justify-end">
          {logo ? <img src={logo} alt="Brand" className="max-h-16 object-contain" /> : <div className="w-16" />}
        </div>
      </div>

      {/* 2-Column Match Grid */}
      <div className="relative z-10 w-full grid grid-cols-2 gap-4 my-6 flex-1">
        {matches.map((match) => (
          <div key={match.id} className="bg-neutral-900/90 rounded-xl p-3.5 border border-white/10 shadow-md flex flex-col justify-between relative overflow-hidden">
            {/* Top Subhead */}
            <div className="flex justify-between items-center text-[10px] font-bold pb-2 border-b border-white/10 text-white/70">
              <span className="truncate max-w-[180px] text-amber-400 uppercase font-black">{match.league}</span>
              <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-black text-[9px]">{match.time || '16:00'}</span>
            </div>

            {/* Teams Row */}
            <div className="flex items-center justify-between my-2.5 px-1">
              <div className="flex items-center gap-2 flex-1 justify-end">
                <span className="text-sm font-black tracking-tight text-right uppercase truncate max-w-[120px]">{match.teamHome}</span>
                <TeamShield logo={match.logoHome} name={match.teamHome} />
              </div>

              <div className="px-3 text-xs font-black italic text-white/50">
                VS
              </div>

              <div className="flex items-center gap-2 flex-1 justify-start">
                <TeamShield logo={match.logoAway} name={match.teamAway} />
                <span className="text-sm font-black tracking-tight text-left uppercase truncate max-w-[120px]">{match.teamAway}</span>
              </div>
            </div>

            {/* Bottom Channel */}
            <div className="flex justify-between items-center text-[10px] pt-1.5 border-t border-white/5 text-white/60">
              <span>CANAL:</span>
              <div className="flex items-center gap-1 font-black text-blue-300 uppercase">
                <Tv className="w-3 h-3 text-blue-400" />
                <span>{match.channel || 'PREMIERE'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="relative z-10 w-full flex justify-between items-center pt-4 border-t border-white/10 text-xs text-white/70 font-bold">
        <span>Transmissão simultânea de todos os canais ao vivo</span>
        <span className="text-blue-400 font-black">SOLICITE SEU TESTE AGORA</span>
      </div>
    </div>
  );
};
