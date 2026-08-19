// Waivers page placeholder — Phase 2+
import { ShoppingCart } from 'lucide-react';
import { Card } from '../components/ui';

export function WaiversPage() {
  return (
    <div className="px-6 py-8 pb-24 max-w-lg mx-auto">
      <h1 className="font-['Orbitron'] text-lg font-bold uppercase tracking-wider text-[#f0f0ff] mb-6">
        Waivers
      </h1>
      <Card hover={false} className="p-8 text-center">
        <ShoppingCart className="w-10 h-10 text-[#2a2e55] mx-auto mb-4" />
        <p className="text-[#6b6e99] text-sm mb-2">Waiver recommendations coming soon</p>
        <p className="text-[#4a4d77] text-xs">
          Strategy-based bid suggestions, predicted winning bids, and position scarcity analysis.
        </p>
      </Card>
    </div>
  );
}
