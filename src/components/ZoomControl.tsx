import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useZoom } from '@/contexts/ZoomContext';

export const ZoomControl: React.FC = () => {
  const { zoom, zoomIn, zoomOut, resetZoom, canZoomIn, canZoomOut, isDefaultZoom } = useZoom();

  return (
    <div className="hidden md:flex items-center space-x-1 bg-card/50 backdrop-blur-sm rounded-xl px-2 py-1.5 border border-border/40">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={zoomOut}
            disabled={!canZoomOut}
            className="h-7 w-7 rounded-lg transition-all duration-200 hover:bg-accent/50 hover:scale-105 disabled:opacity-40"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Diminuir zoom</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetZoom}
            disabled={isDefaultZoom}
            className="h-7 min-w-[3rem] px-2 rounded-lg text-xs font-medium transition-all duration-200 hover:bg-accent/50 disabled:opacity-60"
          >
            {zoom}%
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Clique para resetar (100%)</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={zoomIn}
            disabled={!canZoomIn}
            className="h-7 w-7 rounded-lg transition-all duration-200 hover:bg-accent/50 hover:scale-105 disabled:opacity-40"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Aumentar zoom</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};
