/* @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { BiddingTeamStatus } from '../logic';
import { BiddingTeamIdentity } from './BiddingTeamIdentity';

function renderIdentity(status: BiddingTeamStatus) {
  render(<BiddingTeamIdentity name="Synthetic Manager" status={status} />);
  return {
    name: screen.getByText('Synthetic Manager'),
    label: screen.getByText(status.label),
  };
}

describe('BiddingTeamIdentity', () => {
  it.each([
    [{ kind: 'eliminated', label: 'Eliminated' }, 'line-through', 'text-[#d1d5db]'],
    [{ kind: 'safe', label: 'Safe' }, '', 'text-[#6ee7b7]'],
    [{ kind: 'warning', label: 'Warning' }, '', 'text-[#fbbf24]'],
    [{ kind: 'danger', label: 'Danger' }, '', 'text-[#fb7185]'],
    [{ kind: 'unavailable', label: 'Active · projection unavailable' }, '', 'text-[#9ca3c7]'],
  ] as const)('renders %s with a visible text label and truthful styling', (status, nameClass, labelClass) => {
    const identity = renderIdentity(status);
    if (nameClass) expect(identity.name.className).toContain(nameClass);
    expect(identity.label.className).toContain(labelClass);
    if (status.kind !== 'eliminated') expect(identity.name.className).not.toContain('line-through');
  });

  it('keeps Eliminated neutral grey and struck while Danger remains rose and unstruck', () => {
    const { rerender } = render(<BiddingTeamIdentity name="Eliminated Manager" status={{ kind: 'eliminated', label: 'Eliminated' }} />);
    const eliminatedName = screen.getByText('Eliminated Manager');
    const eliminatedLabel = screen.getByText('Eliminated');
    expect(eliminatedName.className).toContain('text-[#9ca3af]');
    expect(eliminatedName.className).toContain('line-through');
    expect(eliminatedName.className).not.toMatch(/f87171|fb7185|f43f5e|fca5a5|881337|7f1d1d/);
    expect(eliminatedLabel.className).toContain('text-[#d1d5db]');
    expect(eliminatedLabel.className).not.toMatch(/f87171|fb7185|f43f5e|fca5a5|881337|7f1d1d/);

    rerender(<BiddingTeamIdentity name="Danger Manager" status={{ kind: 'danger', label: 'Danger' }} />);
    const dangerName = screen.getByText('Danger Manager');
    const dangerLabel = screen.getByText('Danger');
    expect(dangerName.className).toContain('text-[#fb7185]');
    expect(dangerName.className).not.toContain('line-through');
    expect(dangerLabel.className).toContain('text-[#fb7185]');
  });
});
