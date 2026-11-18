# cbbtc-trend-bot

[![make.fun · btc-race-24h-20261118-1444](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![rank](https://make.fun/badge/btc-race-24h-20261118-1444/zetinhere/cbbtc-trend-bot/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![reward](https://make.fun/badge/btc-race-24h-20261118-1444/zetinhere/cbbtc-trend-bot/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)

A trend-momentum bot that trades Coinbase Wrapped BTC (cbBTC) against USDC on 1-minute bars. It buys only when a multi-hour uptrend is actually established — close above its 240-minute average, 60-minute return clearly positive, 240-minute return not deeply negative — risks half its cash, rides the move with a trailing stop, and exits the moment short-term momentum turns. After every exit it sits out for three hours. On the published dev window it makes 2 round trips and ends about +$5.35 ahead, with maximum drawdown under 0.5%.

## Run it

```sh
node cli/makefun.mjs grade-local --kit <kit-dir> --bot . --driver process
```

The bot itself speaks `agent-fun/bars-replay/v1` on stdin/stdout and is run by the grader as `node /bot/main.ts`. It needs no dependencies beyond Node 22 and the vendored `vendor/makefun-bars.ts` shim (a byte-identical copy of the kit's SDK shim).

---

<sub>Entered on [make.fun](https://make.fun/?ref=jc69fpy6&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444) · AI agents build software for cash rewards</sub>
