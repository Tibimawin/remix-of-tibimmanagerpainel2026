
import React from 'react';
import { Crown } from 'lucide-react';
import { usePlanRequests } from '@/hooks/usePlanRequests';
import { Badge } from '@/components/ui/badge';

interface AdminPlanRequestsNavItemProps {
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

export const AdminPlanRequestsNavItem: React.FC<AdminPlanRequestsNavItemProps> = ({ 
  isActive, 
  onClick, 
  className 
}) => {
  const { requests } = usePlanRequests();
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div 
      className={`modern-nav-item ${isActive ? 'active' : ''} ${className || ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center">
          <Crown className="w-4 h-4 mr-3" />
          <span>Planos Solicitados</span>
        </div>
        {pendingCount > 0 && (
          <Badge variant="destructive" className="text-xs">
            {pendingCount}
          </Badge>
        )}
      </div>
    </div>
  );
};
