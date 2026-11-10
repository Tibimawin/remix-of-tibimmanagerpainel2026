import React from 'react';
import { SportsTemplateProps } from './types';
import { Flame, Tv, AlertCircle, Trophy } from 'lucide-react';

const TeamShield = ({ logo, name }: { logo: string; name: string }) => {
  if (logo) {
    return (
      <div className="w-20 h-20 flex items-center justify-center p-1.5 rounded-full bg-white shadow-[0_0_20px_rgba(249,115,22,0.5)] border-2 border-orange-500 overflow-hidden flex-shrink-0">
        <img src={logo} alt={name} className="w-full h-full object-contain" />
      </div>
    );
  }
  return (
    <div className="w-20 h-20 flex items-center justify-center rounded-full bg-neutral-900 border-2 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.5)] text-orange-400 font-black text-2xl flex-shrink-0">
      {name ? name.charAt(0).toUpperCase() : '🔥'}
    </div>
  );
};

export const FireStadiumBanner: React.FC<SportsTemplateProps> = ({
  matches,
  date,
  logo,
  accentColor = '#f97316',
  logoSize,
  logoX,
  logoY,
  brandName = 'FOGO NO JOGO'
}) => {
  return (
    <div 
      className="relative w-[1000px] min-h-[1250px] bg-[#0A0503] overflow-hidden flex flex-col items-center py-10 px-8 font-sans text-white shadow-2xl rounded-none border border-orange-950"
      style={{
        backgroundImage: 'radial-gradient(ellipse at 50% 15%, #381206 0%, #0A0503 70%)'
      }}
    >
      {/* Embers Flare */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-600/15 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-red-600/15 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 w-full flex justify-between items-center pb-6 border-b border-orange-500/20">
        <div style={{ width: `${logoSize}px`, transform: `translate(${logoX}%, ${logoY}%)` }}>
          {logo ? (
            <img src={logo} alt="Brand" className="max-h-20 object-contain drop-shadow-[0_0_15px_rgba(249,115,22,0.6)]" />
          ) : (
            <div className="flex items-center gap-2">
              <Flame className="w-8 h-8 text-orange-500 animate-pulse" />
              <span className="font-black text-3xl tracking-tighter uppercase italic text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
                {brandName}
              </span>
            </div>
          )}
        </div>

        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-[0_0_20px_rgba(249,115,22,0.6)] mb-2">
            <Flame className="w-4 h-4 fill-amber-300 text-amber-300 animate-bounce" />
            <span>CLIMA DE DECISÃO • AO VIVO</span>
          </div>
          <h2 className="text-4xl font-black uppercase tracking-tight text-white drop-shadow-md italic">
            RODADA EM CHAMAS
          </h2>
          <p className="text-xl font-bold uppercase mt-1 tracking-wider text-orange-400 drop-shadow">
            {date}
          </p>
        </div>

        <div style={{ width: `${logoSize}px`, transform: `translate(${-logoX}%, ${logoY}%)` }} className="flex justify-end">
          {logo ? (
            <img src={logo} alt="Brand" className="max-h-20 object-contain drop-shadow-[0_0_15px_rgba(249,115,22,0.6)]" />
          ) : (
            <div className="w-20" />
          )}
        </div>
      </div>

      {/* Matches List */}
      <div className="relative z-10 w-full space-y-5 max-w-[880px] my-8 flex-1">
        {matches.map((match) => (
          <div key={match.id} className="relative rounded-xl overflow-hidden bg-gradient-to-r from-[#170B06] via-[#1F0E08] to-[#170B06] border border-orange-500/30 p-5 shadow-[0_10px_35px_rgba(0,0,0,0.9)] flex items-center justify-between">
            {/* Top Chamfer League Banner */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-red-600 via-orange-500 to-red-600 px-8 py-0.5 rounded-b-md text-[10px] font-black uppercase tracking-widest text-white shadow-md flex items-center gap-2">
              <span>{match.league}</span>
              {match.time && <span className="bg-black/60 px-2 py-0.2 rounded font-bold">{match.time}</span>}
            </div>

            {/* Team Home */}
            <div className="flex items-center gap-5 flex-1 justify-end pt-3">
              <span className="text-2xl font-black tracking-tight text-right uppercase text-white drop-shadow leading-tight max-w-[200px]">
                {match.teamHome}
              </span>
              <TeamShield logo={match.logoHome} name={match.teamHome} />
            </div>

            {/* Center VS in Flame Circle */}
            <div className="flex flex-col items-center mx-8 pt-3">
              <div className="w-14 h-14 rounded-full bg-gradient-to-b from-orange-500 to-red-700 flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.6)] border border-amber-300">
                <span className="text-xl font-black italic text-white drop-shadow">VS</span>
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
            <div className="absolute bottom-2.5 right-6 flex items-center gap-1.5 bg-black/80 px-3.5 py-1 rounded-full border border-orange-500/40 text-[10px] font-bold">
              <Tv className="w-3 h-3 text-orange-400" />
              <span className="text-white/60">CANAL:</span>
              <span className="text-orange-300 font-black uppercase">{match.channel || 'PREMIERE'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="relative z-10 w-full flex flex-col items-center pt-4 border-t border-orange-500/20">
        <div className="px-8 py-2 rounded-full bg-orange-600/20 border border-orange-500/40 text-xs font-black uppercase tracking-widest text-orange-300 shadow-md mb-2">
          🔥 TRANSMISSÃO ESTÁVEL E COMPLETA • TODOS OS JOGOS AO VIVO
        </div>
      </div>
    </div>
  );
};
