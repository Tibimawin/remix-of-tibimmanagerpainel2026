
import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { colorOptions } from '@/contexts/CustomColorContext';

interface ColorPickerProps {
  selectedHue: number;
  onSelectColor: (hue: number) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ selectedHue, onSelectColor }) => {
  return (
    <div className="grid grid-cols-4 gap-3">
      {colorOptions.map((color) => (
        <button
          key={color.name}
          onClick={() => onSelectColor(color.hue)}
          className={cn(
            "relative group flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-300",
            "hover:scale-105 hover:shadow-lg",
            selectedHue === color.hue 
              ? "ring-2 ring-primary ring-offset-2 ring-offset-background" 
              : "hover:ring-1 hover:ring-border"
          )}
        >
          <div 
            className={cn(
              "w-12 h-12 rounded-full bg-gradient-to-br shadow-md transition-transform",
              color.preview,
              "group-hover:shadow-xl"
            )}
          >
            {selectedHue === color.hue && (
              <div className="w-full h-full flex items-center justify-center">
                <Check className="w-6 h-6 text-white drop-shadow-md" />
              </div>
            )}
          </div>
          <span className={cn(
            "text-xs font-medium transition-colors",
            selectedHue === color.hue ? "text-primary" : "text-muted-foreground"
          )}>
            {color.name}
          </span>
        </button>
      ))}
    </div>
  );
};

// Re-export for backwards compatibility
export { useCustomColor, colorOptions } from '@/contexts/CustomColorContext';

