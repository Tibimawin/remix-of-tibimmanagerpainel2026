import React from 'react';
import { SportsTemplateProps } from './types';

export const ClassicBroadcastBanner: React.FC<SportsTemplateProps> = ({
  matches,
  date,
  logo,
  accentColor,
  logoSize,
  logoX,
  logoY,
}) => {
  return (
    <div 
      className="relative w-[1000px] min-h-[1200px] bg-black overflow-hidden flex flex-col items-center py-10 px-6 font-sans text-white shadow-2xl rounded-none border border-neutral-800"
      style={{
        backgroundImage: 'radial-gradient(circle at center, #2a0000 0%, #000 100%)'
      }}
    >
      {/* Background Decoration */}
      <div 
        className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
        style={{ 
          backgroundImage: `linear-gradient(45deg, ${accentColor} 25%, transparent 25%), linear-gradient(-45deg, ${accentColor} 25%, transparent 25%)`,
          backgroundSize: '100px 100px',
          filter: 'blur(20px)'
        }} 
      />
      
      <div className="relative z-10 w-full flex flex-col items-center gap-8">
        {/* Header */}
        <div className="w-full flex justify-between items-center px-8">
          <div style={{ width: `${logoSize}px`, transform: `translate(${logoX}%, ${logoY}%)` }}>
            {logo && <img src={logo} alt="Brand" className="w-full object-contain" />}
          </div>
          <div className="text-center">
            <h3 className="text-4xl font-black uppercase tracking-tight leading-none italic text-white">TABELA DE JOGOS</h3>
            <p className="text-2xl font-bold uppercase mt-2 italic text-[#ffd700]">{date}</p>
          </div>
          <div style={{ width: `${logoSize}px`, transform: `translate(${-logoX}%, ${logoY}%)` }}>
            {logo && <img src={logo} alt="Brand" className="w-full object-contain" />}
          </div>
        </div>

        {/* Matches List */}
        <div className="w-full space-y-4 max-w-[850px]">
          {matches.map((match) => (
            <div key={match.id} className="flex flex-col items-center w-full">
              {/* League Header */}
              <div className="bg-white text-black px-12 py-1 rounded-sm text-sm font-black italic transform -skew-x-12 z-20 shadow-lg border-b-4 border-gray-300">
                {match.league}
              </div>
              
              {/* Match Card */}
              <div className="w-full bg-white mt-[-10px] rounded-sm py-4 px-10 flex items-center justify-between text-black relative shadow-xl overflow-hidden transform transition-transform duration-300">
                {/* Team Home */}
                <div className="flex items-center gap-6 flex-1 justify-end">
                  <div className="w-20 h-20 flex items-center justify-center p-1 border-2 border-gray-100 rounded-full bg-white shadow-sm overflow-hidden">
                    {match.logoHome ? (
                      <img src={match.logoHome} className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-600">
                        {match.teamHome?.charAt(0) || '⚽'}
                      </div>
                    )}
                  </div>
                  <span className="text-2xl font-black tracking-tighter text-right leading-tight max-w-[150px] text-black">{match.teamHome}</span>
                </div>

                {/* VS Divider */}
                <div className="flex flex-col items-center mx-8">
                  <span className="text-4xl font-black italic tracking-tighter text-black/80">VS</span>
                </div>

                {/* Team Away */}
                <div className="flex items-center gap-6 flex-1 justify-start">
                  <span className="text-2xl font-black tracking-tighter text-left leading-tight max-w-[150px] text-black">{match.teamAway}</span>
                  <div className="w-20 h-20 flex items-center justify-center p-1 border-2 border-gray-100 rounded-full bg-white shadow-sm overflow-hidden">
                    {match.logoAway ? (
                      <img src={match.logoAway} className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-600">
                        {match.teamAway?.charAt(0) || '⚽'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Channel / Watch Info */}
                <div className="absolute right-10 bottom-2 flex flex-col items-center">
                  <span className="text-[10px] font-bold uppercase text-gray-500 mb-0.5">ASSISTA EM:</span>
                  <div className="bg-gray-100 px-3 py-1 rounded border border-gray-200 min-w-[60px] flex items-center justify-center">
                    <span className="text-xs font-black text-green-700">{match.channel || 'PFC'}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Section */}
        <div className="w-full flex flex-col items-center mt-6">
          <div className="bg-black/40 backdrop-blur-md px-6 py-1 rounded-full border border-white/20 text-[10px] font-bold uppercase tracking-widest text-white/80 mb-6 italic">
            Assine já e acompanhe os principais campeonatos do futebol brasileiro e do mundo
          </div>
          
          <div className="flex flex-wrap justify-center gap-6 items-center px-4">
            {['BUNDESLIGA', 'PREMIER LEAGUE', 'LALIGA', 'CHAMPIONS LEAGUE', 'LIGUE 1', 'LIBERTADORES', 'COPA DO BRASIL', 'BRASILEIRÃO'].map(league => (
              <div key={league} className="bg-white/10 backdrop-blur-sm border border-white/10 rounded px-3 py-1.5 flex flex-col items-center opacity-70">
                <span className="text-[9px] font-black tracking-tighter text-white">{league}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
