/* @vitest-environment jsdom */
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';

vi.mock('./pages/ScoresPage', () => ({ ScoresPage: () => <h1>Scores route</h1> }));

import App from './App';

describe('Scores route and navigation', () => {
  beforeEach(() => window.history.pushState({}, '', '/'));

  it('keeps Scores in the requested middle navigation order', () => {
    render(<MemoryRouter initialEntries={['/scores']}><BottomNav /></MemoryRouter>);
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(nav).getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Hub', 'Waivers', 'Scores', 'League', 'Teams',
    ]);
    expect(screen.getByRole('link', { name: /Scores/ }).getAttribute('href')).toBe('/scores');
  });

  it('registers the permanent /scores route', async () => {
    window.history.pushState({}, '', '/scores');
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Scores route' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeTruthy();
  });
});
