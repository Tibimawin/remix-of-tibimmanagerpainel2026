import React from 'react';
import { SportsTemplateProps } from './types';
import { Flame, Tv, Zap, Trophy } from 'lucide-react';

const BigTeamShield = ({ logo, name }: { logo: string; name: string }) => {
  if (logo) {
    return (
      <div className="w-28 h-28 flex items-center justify-center p-2 rounded-full bg-white/10 backdrop-blur-md border-4 border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.5)] overflow-hidden">
        <img src={logo} alt={name} className="w-full h-full object-contain" />
      </div>
    );
  }
  return (
    <div className="w-28 h-28 flex items-center justify-center rounded-full bg-neutral-900 border-4 border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.5)] text-amber-300 font-black text-4xl">
      {name ? name.charAt(0).toUpperCase() : '⚡'}
    </div>
  );
};

export const SuperClasicoBanner: React.FC<SportsTemplateProps> = ({
  matches,
  date,
  logo,
  accentColor = '#e50914',
  logoSize,
  logoX,
  logoY,
  brandName = 'CLÁSSICO TV'
}) => {
  const mainMatch = matches[0] || {
    id: '1',
    league: 'GRANDE CLÁSSICO',
    time: '16:00',
    teamHome: 'MANDANTE',
    teamAway: 'VISITANTE',
    logoHome: '',
    logoAway: '',
    channel: 'PREMIERE'
  };

  const otherMatches = matches.slice(1);

  return (
    <div 
      className="relative w-[1000px] min-h-[1250px] bg-[#070505] overflow-hidden flex flex-col items-center py-10 px-8 font-sans text-white shadow-2xl rounded-none border border-red-950"
      style={{
        backgroundImage: 'radial-gradient(circle at 50% 25%, #400808 0%, #070505 70%)'
      }}
    >
      {/* Fiery Light Streaks */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-red-600/20 blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 w-full flex justify-between items-center pb-6 border-b border-red-500/20">
        <div style={{ width: `${logoSize}px`, transform: `translate(${logoX}%, ${logoY}%)` }}>
          {logo ? (
            <img src={logo} alt="Brand" className="max-h-20 object-contain drop-shadow-[0_0_15px_rgba(229,9,20,0.6)]" />
          ) : (
            <div className="flex items-center gap-2">
              <Trophy className="w-8 h-8 text-amber-400" />
              <span className="font-black text-2xl tracking-tight uppercase italic">{brandName}</span>
            </div>
          )}
        </div>

        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)] mb-2">
            <Flame className="w-3.5 h-3.5 text-amber-300 animate-bounce" />
            <span>SUPER CLÁSSICO • AO VIVO</span>
          </div>
          <h2 className="text-4xl font-black uppercase tracking-tight text-white italic drop-shadow-lg">
            DUELO DE GIGANTES
          </h2>
          <p className="text-xl font-bold uppercase mt-1 tracking-wider text-amber-400">
            {date}
          </p>
        </div>

        <div style={{ width: `${logoSize}px`, transform: `translate(${-logoX}%, ${logoY}%)` }} className="flex justify-end">
          {logo ? (
            <img src={logo} alt="Brand" className="max-h-20 object-contain" />
          ) : (
            <div className="w-20" />
          )}
        </div>
      </div>

      {/* Hero Clash Spotlight (Main Match) */}
      <div className="relative z-10 w-full max-w-[880px] my-6 rounded-2xl bg-gradient-to-b from-red-950/70 via-black to-neutral-950/90 border-2 border-red-500/40 p-8 shadow-[0_15px_50px_rgba(200,0,0,0.4)] flex flex-col items-center">
        <div className="bg-amber-400 text-black px-6 py-1 rounded-full text-xs font-black uppercase tracking-widest shadow-md mb-6">
          {mainMatch.league} • {mainMatch.time || '16:00'}
        </div>

        <div className="w-full flex items-center justify-around">
          {/* Home Team */}
          <div className="flex flex-col items-center gap-4 flex-1">
            <BigTeamShield logo={mainMatch.logoHome} name={mainMatch.teamHome} />
            <span className="text-3xl font-black tracking-tighter uppercase text-center text-white drop-shadow-md">
              {mainMatch.teamHome}
            </span>
          </div>

          {/* VS In Fire */}
          <div className="flex flex-col items-center mx-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-b from-amber-500 to-red-600 flex items-center justify-center font-black italic text-3xl text-white shadow-[0_0_30px_rgba(239,68,68,0.8)] border-2 border-white">
              VS
            </div>
            <span className="text-[11px] font-black uppercase tracking-widest text-amber-300 mt-2">EM DECISÃO</span>
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center gap-4 flex-1">
            <BigTeamShield logo={mainMatch.logoAway} name={mainMatch.teamAway} />
            <span className="text-3xl font-black tracking-tighter uppercase text-center text-white drop-shadow-md">
              {mainMatch.teamAway}
            </span>
          </div>
        </div>

        {/* Hero Channel Ribbon */}
        <div className="mt-8 flex items-center gap-2 bg-black/80 px-6 py-2 rounded-full border border-amber-400/50 text-sm font-black text-amber-300">
          <Tv className="w-4 h-4 text-red-500" />
          <span>TRANSMISSÃO EXCLUSIVA:</span>
          <span className="text-white uppercase">{mainMatch.channel || 'PREMIERE / SPORTV'}</span>
        </div>
      </div>

      {/* Secondary Matches (if any) */}
      {otherMatches.length > 0 && (
        <div className="relative z-10 w-full max-w-[880px] space-y-3 my-2 flex-1">
          <div className="text-xs font-black uppercase tracking-wider text-white/60 pl-2">
            OUTROS JOGOS DA RODADA:
          </div>
          {otherMatches.slice(0, 3).map((match) => (
            <div key={match.id} className="w-full bg-neutral-900/90 rounded-xl px-6 py-3.5 border border-white/10 flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400">{match.time} • {match.league}</span>
              <div className="flex items-center gap-4 text-base font-black">
                <span>{match.teamHome}</span>
                <span className="text-xs text-white/50">VS</span>
                <span>{match.teamAway}</span>
              </div>
              <span className="text-[11px] bg-red-600/30 text-red-300 font-bold px-3 py-1 rounded">
                {match.channel}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="relative z-10 w-full flex flex-col items-center pt-4 border-t border-red-500/20">
        <div className="text-xs font-black uppercase tracking-widest text-white/80">
          🔥 NÃO TRAVA NA HORA DO GOL • SERVIDOR DEDICADO VIP
        </div>
      </div>
    </div>
  );
};
