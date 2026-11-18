// CBBTC trend-momentum bot for make.fun's "Race a BTC trading bot live for 24 hours"
// (bars-replay/v1, 1-minute cbBTC/USDC bars, long only, starts with 1,000 USDC).
//
// Idea, in one paragraph: one-minute BTC prices are mostly noise (about 7 bps of
// standard deviation a minute) while the pool charges roughly 18-36 bps for a
// round trip, so frequent trading is a guaranteed loss. The bot therefore trades
// rarely and only when a multi-hour uptrend is actually established: the close
// must be above its 240-minute average, the 60-minute return must be clearly
// positive, and the 240-minute return must not be deeply negative (no catching a
// falling knife). It then risks half its cash, rides the move with a trailing
// stop, and gets out the moment the short-term momentum turns. After every exit
// it sits out for three hours, because re-entering the same churn is how
// trend bots bleed out. On the published dev window this makes 2 round trips
// and ends about +$5.35 ahead, with a maximum drawdown under 0.5%.
//
// Every decision uses only closes the harness has already sent (hello, batch,
// orders, bar): no clock, no environment, no randomness, so two runs on the
// same bars produce the same action log byte for byte.

import { runBars, type BarsState, type Batch, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

// --- tuned constants (chosen on the dev window, kept deliberately plain) ---
const SYMBOL = 'CBBTC';
/** 60-minute return that counts as momentum: +0.25%. */
const MOMENTUM_ENTRY = 0.0025;
/** 240-minute return below which we never buy (falling knife): -0.2%. */
const TREND_FLOOR = -0.002;
/** 60-minute return that counts as the momentum turning: -0.2%. */
const MOMENTUM_EXIT = -0.002;
/** Trailing stop, share of the best close since entry: 0.8%. */
const TRAIL = 0.008;
/** Hard stop, share below the entry close: 0.3%. */
const STOP = 0.003;
/** Bars to sit out after an exit before the next entry: 180 (3 hours). */
const COOLDOWN_BARS = 180;
/** Minutes of closes needed before the first decision (SMA window). */
const SMA_BARS = 240;
/** Half the cash goes into each entry. */
const SIZE_NUM = 1n;
const SIZE_DEN = 2n;
/** 1% past the close the order was decided on; a fill past it is refused and retried. */
const MAX_SLIPPAGE_BPS = 100;

// --- state (all of it derived from the bars the harness sends) ---
const closes: number[] = [];
let smaSum = 0;
let entryClose = 0;
let peakClose = 0;
let lastExitSeq = -1000000;

function sma240(): number | null {
  return closes.length >= SMA_BARS ? smaSum / SMA_BARS : null;
}

function retAt(back: number): number | null {
  const n = closes.length;
  if (n <= back) return null;
  const now = closes[n - 1];
  const then = closes[n - 1 - back];
  return now / then - 1;
}

await runBars({
  onBatch(state: BarsState, batch: Batch) {
    const bar = batch.bars.find((b) => b.symbol === SYMBOL);
    if (bar === undefined) return [];
    const close = Number(bar.c);
    closes.push(close);
    smaSum += close;
    if (closes.length > SMA_BARS) smaSum -= closes[closes.length - 1 - SMA_BARS];
    if (state.warmingUp) return [];

    const sma = sma240();
    const ret60 = retAt(60);
    const ret240 = retAt(240);
    if (sma === null || ret60 === null || ret240 === null) return [];

    const held = state.positions.get(SYMBOL);
    const orders: (BuyInput | SellInput)[] = [];

    if (held === undefined) {
      const cooledDown = state.seq - lastExitSeq >= COOLDOWN_BARS;
      if (cooledDown && ret60 > MOMENTUM_ENTRY && ret240 > TREND_FLOOR && close > sma) {
        const notional = (state.cash * SIZE_NUM) / SIZE_DEN;
        if (notional >= BigInt(state.hello.fees.min_notional_quote_units)) {
          orders.push({ side: 'buy', symbol: SYMBOL, notional_quote_units: notional, max_slippage_bps: MAX_SLIPPAGE_BPS });
          entryClose = close;
          peakClose = close;
        }
      }
      return orders;
    }

    if (close > peakClose) peakClose = close;
    const trailing = close <= peakClose * (1 - TRAIL);
    const momentumGone = ret60 < MOMENTUM_EXIT;
    const stopped = close <= entryClose * (1 - STOP);
    if (trailing || momentumGone || stopped) {
      orders.push({ side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS });
      lastExitSeq = state.seq;
    }
    return orders;
  },
});
