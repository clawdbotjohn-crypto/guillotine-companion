/* @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { useAppStore } from '../store';
import { HomePage } from './HomePage';

function renderHome() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter><HomePage /></MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  useAppStore.getState().reset();
});

describe('HomePage accessibility', () => {
  it('associates visible form controls with stable accessible labels', () => {
    renderHome();
    expect(screen.getByLabelText('Sleeper username').tagName).toBe('INPUT');
    fireEvent.click(screen.getByRole('button', { name: /Paste a league ID directly/i }));
    expect(screen.getByLabelText('Sleeper league ID').tagName).toBe('INPUT');
  });
});
