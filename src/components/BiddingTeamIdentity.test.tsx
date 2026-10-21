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
    [{ kind: 'eliminated', label: 'Eliminated' }, 'line-through', 'text-[#fca5a5]'],
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
});
