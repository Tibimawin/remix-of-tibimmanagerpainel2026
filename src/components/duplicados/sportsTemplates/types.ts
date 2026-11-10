export interface Match {
  id: string;
  league: string;
  time: string;
  teamHome: string;
  teamAway: string;
  logoHome: string;
  logoAway: string;
  channel: string;
}

export interface SportsTemplateProps {
  matches: Match[];
  date: string;
  logo: string | null;
  accentColor: string;
  logoSize: number;
  logoX: number;
  logoY: number;
  overlayOpacity: number;
  brandName?: string;
}
