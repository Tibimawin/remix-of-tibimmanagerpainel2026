import React from 'react';
import { SportsTemplateProps } from './types';
import { Tv, Flame, Trophy } from 'lucide-react';

const TeamShield = ({ logo, name }: { logo: string; name: string }) => {
  if (logo) {
    return (
      <div className="w-20 h-20 flex items-center justify-center p-1.5 border-2 border-white/30 rounded-full bg-white shadow-lg overflow-hidden flex-shrink-0">
        <img src={logo} alt={name} className="w-full h-full object-contain" />
      </div>
    );
  }
  return (
    <div className="w-20 h-20 flex items-center justify-center border-2 border-white/30 rounded-full bg-gradient-to-br from-neutral-800 to-neutral-900 shadow-lg text-white font-black text-2xl flex-shrink-0">
      {name ? name.charAt(0).toUpperCase() : '⚽'}
    </div>
  );
};

export const PremierArenaBanner: React.FC<SportsTemplateProps> = ({
  matches,
  date,
  logo,
  accentColor,
  logoSize,
  logoX,
  logoY,
  brandName = 'STREAM SPORTS'
}) => {
  return (
    <div 
      className="relative w-[1000px] min-h-[1250px] bg-[#07090E] overflow-hidden flex flex-col items-center py-10 px-6 font-sans text-white shadow-2xl rounded-none border border-neutral-800"
      style={{
        backgroundImage: `radial-gradient(circle at 50% 20%, ${accentColor}40 0%, #07090E 75%)`
      }}
    >
      {/* Stadium Light & Grid Ambient */}
      <div 
        className="absolute inset-0 z-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(45deg, ${accentColor} 25%, transparent 25%), linear-gradient(-45deg, ${accentColor} 25%, transparent 25%)`,
          backgroundSize: '80px 80px',
          filter: 'blur(15px)'
        }}
      />
      
      {/* Header Bar */}
      <div className="relative z-10 w-full flex justify-between items-center px-6 pb-6 border-b border-white/10">
        <div style={{ width: `${logoSize}px`, transform: `translate(${logoX}%, ${logoY}%)` }}>
          {logo ? (
            <img src={logo} alt="Brand" className="max-h-20 object-contain" />
          ) : (
            <div className="flex items-center gap-2">
              <Trophy className="w-7 h-7" style={{ color: accentColor }} />
              <span className="font-black text-2xl tracking-tighter uppercase italic">{brandName}</span>
            </div>
          )}
        </div>

        <div className="text-center">
          <div 
            className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-md border mb-2"
            style={{ backgroundColor: `${accentColor}30`, borderColor: `${accentColor}80`, color: '#FFFFFF' }}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>TRANSMISSÃO AO VIVO</span>
          </div>
          <h2 className="text-4xl font-black uppercase tracking-tight leading-none italic text-white drop-shadow-lg">
            TABELA DE JOGOS
          </h2>
          <p className="text-xl font-bold uppercase mt-1.5 tracking-wide text-amber-400 drop-shadow">
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

      {/* Match Cards List */}
      <div className="relative z-10 w-full space-y-5 max-w-[880px] my-8 flex-1">
        {matches.map((match) => (
          <div key={match.id} className="flex flex-col items-center w-full group">
            {/* League Skew Badge */}
            <div 
              className="px-10 py-1.5 rounded-sm text-xs font-black italic transform -skew-x-12 z-20 shadow-xl border-b-2 flex items-center gap-2"
              style={{
                backgroundColor: '#FFFFFF',
                color: '#07090E',
                borderColor: accentColor
              }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }} />
              <span>{match.league}</span>
              {match.time && <span className="bg-neutral-900 text-white px-2 py-0.5 rounded text-[10px] not-italic">{match.time}</span>}
            </div>

            {/* Match Box */}
            <div className="w-full bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 mt-[-10px] rounded-lg py-5 px-8 flex items-center justify-between text-white relative shadow-2xl border border-white/10 overflow-hidden">
              {/* Accent Edge */}
              <div className="absolute left-0 top-0 bottom-0 w-2" style={{ backgroundColor: accentColor }} />
              <div className="absolute right-0 top-0 bottom-0 w-2" style={{ backgroundColor: accentColor }} />

              {/* Team Home */}
              <div className="flex items-center gap-5 flex-1 justify-end">
                <span className="text-2xl font-black tracking-tight text-right uppercase drop-shadow leading-tight max-w-[200px]">
                  {match.teamHome}
                </span>
                <TeamShield logo={match.logoHome} name={match.teamHome} />
              </div>

              {/* VS Divider */}
              <div className="flex flex-col items-center mx-8">
                <div 
                  className="w-14 h-14 rounded-full flex items-center justify-center font-black italic text-xl shadow-inner border border-white/20"
                  style={{ backgroundColor: `${accentColor}40`, color: '#FFFFFF' }}
                >
                  VS
                </div>
              </div>

              {/* Team Away */}
              <div className="flex items-center gap-5 flex-1 justify-start">
                <TeamShield logo={match.logoAway} name={match.teamAway} />
                <span className="text-2xl font-black tracking-tight text-left uppercase drop-shadow leading-tight max-w-[200px]">
                  {match.teamAway}
                </span>
              </div>

              {/* Channel Pill */}
              <div className="absolute right-6 bottom-2.5 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[10px] font-black">
                <Tv className="w-3 h-3 text-red-500" />
                <span className="text-white/70">ASSISTA EM:</span>
                <span className="text-amber-400 uppercase">{match.channel || 'CANAL HD'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Banner */}
      <div className="relative z-10 w-full flex flex-col items-center pt-4 border-t border-white/10">
        <div className="bg-black/60 backdrop-blur-md px-8 py-2 rounded-full border border-white/20 text-xs font-black uppercase tracking-widest text-white/90 mb-6 italic shadow-lg">
          ⚽ ACOMPANHE TODOS OS JOGOS EM ALTA DEFINIÇÃO E SEM TRAVAMENTOS
        </div>

        <div className="flex flex-wrap justify-center gap-4 items-center px-4 opacity-80">
          {['BRASILEIRÃO', 'CHAMPIONS LEAGUE', 'LIBERTADORES', 'PREMIER LEAGUE', 'LA LIGA', 'COPA DO BRASIL'].map((name) => (
            <div key={name} className="px-3.5 py-1 rounded bg-white/10 border border-white/10 text-[10px] font-black tracking-wider uppercase">
              {name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
