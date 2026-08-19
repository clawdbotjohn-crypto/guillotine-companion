import { NavLink } from 'react-router-dom';
import { Crosshair, ShoppingCart, Trophy, Users } from 'lucide-react';

const tabs = [
  { to: '/hub', label: 'Hub', icon: Crosshair },
  { to: '/waivers', label: 'Waivers', icon: ShoppingCart },
  { to: '/league', label: 'League', icon: Trophy },
  { to: '/teams', label: 'Teams', icon: Users },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0d1a] border-t border-[#2a2e55] safe-area-bottom">
      <div className="max-w-lg mx-auto flex">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2.5 text-[10px] font-semibold uppercase tracking-wider
               transition-colors duration-200
               ${isActive ? 'text-[#6366f1]' : 'text-[#4a4d77] hover:text-[#6b6e99]'}`
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <tab.icon className="w-5 h-5 mb-1" />
                  {isActive && (
                    <div
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full
                        bg-gradient-to-r from-[#6366f1] to-[#8b5cf6]
                        shadow-[0_0_8px_rgba(99,102,241,0.4)]"
                    />
                  )}
                </div>
                <span className="mt-1">{tab.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
