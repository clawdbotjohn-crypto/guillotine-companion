# Custom value boards: Option 3 vs Hybrid

## Recommendation

**Choose the Hybrid: one final `Custom` strategy tab, followed by a persistent named-board selector and `+ New`.**

It preserves the app's existing strategy model while giving named boards durable identity. More importantly, it scales from one board to ten without turning the already-scrollable strategy rail into the primary board manager. The extra selector is a real cost—switching between two custom boards takes one more tap than Option 3—but the selected board name, formula, frozen ranking week, last-used behavior, and `4 / 10` status remain visible directly below the strategy rail.

Option 3 is a strong choice if the product expects almost everyone to keep only one to three custom boards. Its directness is excellent. At the stated ten-board maximum, however, the five current built-in strategies plus ten named custom tabs create a 15-item horizontal rail; identity is direct only for the small subset currently visible.

## Side-by-side

| Criterion | Option 3 — each board is a strategy tab | Hybrid — one Custom tab + board selector |
|---|---|---|
| **Discoverability** | Best with a small set. A named board is immediately legible as a peer to Max VORP, Safe, and Aggressive. `+ New` lives in the same rail. At higher counts, off-screen tabs and `+ New` require horizontal discovery. | The stable `Custom` tab is easy to relearn and auto-scrolls into view when selected. The selector, `+ New`, and management affordance are grouped immediately underneath. The additional hierarchy must be learned once. |
| **Mobile scaling** | Weakest point. Five built-ins plus up to ten custom tabs cannot coexist visibly at 390px. Horizontal scrolling is honest but makes far-away boards slower to find and compare. | Strong. The strategy rail adds only one item; the compact selector can represent all ten boards without changing vertical structure. The selected board remains visible even while the strategy rail is scrolled. |
| **Context switching** | Fastest for adjacent visible boards: one tap. Switching to an off-screen board requires horizontal search first. | Usually two taps: open selector, choose board. Last-used selection restores the working board on return, reducing repeat switching. |
| **Profile identity** | Excellent: the board name *is* the active strategy tab. A small diamond distinguishes custom from built-in. Long names must be truncated or widen the rail. | Good, not hidden: the selected name is visible in both the selector and identity strip, with formula/source/frozen week beneath it. Identity is repeated intentionally because the top-level tab says only `Custom`. |
| **Complexity** | Simpler initial model and fewer controls. Complexity reappears as rail overflow, reorder/rename behavior, and locating management at larger counts. | One more control and one more hierarchy level. In exchange, create/duplicate/delete/count/last-used behavior has a clear home and strategy navigation remains stable. |
| **Accessibility** | Named tabs need a horizontally scrollable `tablist`, roving focus, reliable active-tab reveal, and a non-drag management path. Ten custom tabs produce a long keyboard traversal. | Shorter strategy traversal. A labeled native-style board selector gives predictable keyboard and screen-reader behavior. `+ New` and management remain separate 44px targets. |
| **Future growth** | Constrained. Tags, sharing, archived boards, compare mode, or more than ten boards would overload the strategy rail. | Better foundation. The selector can evolve into search, grouping, pinning, or a board manager without changing the primary strategy taxonomy. |

## Shared interaction decisions

These decisions are the same in both alternatives and are intentionally visible in the prototype/screenshots:

1. **Custom value is its own concept.** Green `Your value` is visually and semantically separate from purple `Predicted winning bid`, neutral source-relative rank, completed/losing bid history, and Team Impact. Player/name remains the detail-popup target.
2. **Edit is explicit.** Browsing cards do not show text inputs or reorder controls. `Edit values` enters a mode with Save/Cancel, unsaved status, inline dollar editing, and a per-row committed-value check.
3. **Reordering preserves value slots.** Moving Jaylen Wright from RB7 to RB3 gives him RB3's previous `$58` value. The intervening players shift through the existing `$52 / $46 / $40` slots. Values do not travel with player identity.
4. **Drag is optional, not required.** Up/down buttons are the keyboard and mobile alternative. They are 44px-class targets in the intended product treatment.
5. **Creation is formula-first but concise.** Name, ranking source, base strategy, multiplier, adjustment, `$0` floor, and the preview `max($0, 3 × Max VORP − $30)` are visible before creation.
6. **Boards are frozen snapshots.** Identity includes the frozen ranking week; later source updates should offer an explicit rebase/refresh flow rather than silently changing the custom board.
7. **Destructive actions explain scope.** Delete confirmation states that custom values/order are removed while built-in rankings, predicted bids, bid history, and Team Impact are not affected.
8. **Ten is an explicit cap.** At `10 / 10`, `+ New` and duplication are disabled and the user is directed to manage/delete an existing board.

## Why Hybrid wins narrowly

The Waivers screen already asks the user to understand a ranking source, strategy, position filter, player details, predicted bidding, and team context. Option 3 minimizes hierarchy but spends scarce horizontal navigation space to do it. Hybrid adds one clear layer at the exact point where it pays for itself: durable named profiles with creation, duplication, deletion, last-used selection, and a ten-board ceiling.

The recommendation is therefore **Hybrid**, with two safeguards:

- Always show the selected board identity strip directly under the selector; never make the user infer which custom profile is active.
- When `Custom` becomes active, automatically reveal that strategy tab in the horizontal rail and restore the last-used board.
