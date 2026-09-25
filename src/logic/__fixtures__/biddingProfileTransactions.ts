import type { Transaction } from '../../api/types';

function waiver(overrides: Partial<Transaction> & Pick<Transaction, 'transaction_id'>): Transaction {
  return {
    type: 'waiver',
    status: 'complete',
    roster_ids: [1],
    adds: { playerA: 1 },
    drops: null,
    settings: { waiver_bid: 100 },
    metadata: { notes: 'Your waiver claim was processed successfully!' },
    waiver_budget: null,
    leg: 1,
    created: 1_000,
    status_updated: 5_000,
    ...overrides,
  };
}

export const biddingProfileTransactionFixture = new Map<number, Transaction[]>([
  [1, [
    waiver({ transaction_id: 'winner-player-a' }),
    waiver({
      transaction_id: 'legitimate-loss-player-a',
      status: 'failed',
      roster_ids: [2],
      adds: { playerA: 2 },
      settings: { waiver_bid: 90, seq: 1 },
      metadata: { notes: 'This player was claimed by another owner.' },
      created: 900,
    }),
    waiver({
      transaction_id: 'duplicate-drop-path-player-a',
      status: 'failed',
      roster_ids: [2],
      adds: { playerA: 2 },
      drops: { benchB: 2 },
      settings: { waiver_bid: 90, seq: 2 },
      metadata: { notes: 'This player was claimed by another owner.' },
      created: 950,
    }),
    waiver({
      transaction_id: 'invalid-roster-failure',
      status: 'failed',
      roster_ids: [3],
      adds: { playerA: 3 },
      settings: { waiver_bid: 80 },
      metadata: { notes: 'Unfortunately, your roster will have too many players after this transaction.' },
    }),
    waiver({
      transaction_id: 'unmatched-failure',
      status: 'failed',
      roster_ids: [4],
      adds: { playerZ: 4 },
      settings: { waiver_bid: 70 },
      metadata: { notes: 'This player was claimed by another owner.' },
    }),
    {
      type: 'trade',
      status: 'complete',
      transaction_id: 'faab-transfer',
      roster_ids: [1, 2],
      adds: null,
      drops: null,
      settings: null,
      waiver_budget: [{ sender: 1, receiver: 2, amount: 50 }],
      leg: 1,
      created: 5_500,
      status_updated: 5_500,
    },
    waiver({
      transaction_id: 'second-win-after-spend-transfer',
      roster_ids: [1],
      adds: { playerB: 1 },
      settings: { waiver_bid: 850 },
      created: 6_000,
      status_updated: 7_000,
    }),
  ]],
]);
