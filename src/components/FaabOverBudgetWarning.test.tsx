import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  FAAB_OVER_BUDGET_MESSAGE,
  FaabOverBudgetWarning,
} from './FaabOverBudgetWarning';

describe('FaabOverBudgetWarning', () => {
  it('exposes the over-budget explanation to hover and keyboard-focus users', () => {
    render(<FaabOverBudgetWarning />);

    const warning = screen.getByRole('img', { name: FAAB_OVER_BUDGET_MESSAGE });
    expect(warning.getAttribute('tabindex')).toBe('0');
    expect(warning.getAttribute('title')).toBe(FAAB_OVER_BUDGET_MESSAGE);
    expect(screen.getByRole('tooltip').textContent).toBe(FAAB_OVER_BUDGET_MESSAGE);
  });
});
