# Proposal: a "Market Forces" game mode (realistic transit and L2 pricing)

A handoff note for whoever implements this. It records an analysis made on 2026-11-23 against a level-13 Tier 1
save (year 54). Read `CLAUDE.md`, `docs/ARCHITECTURE.md` and the `edit-the-game`, `gameplay-rules`, `write-tests`,
`add-strings` and `performance` skills first.

## The problem

On the late-game save, business revenue was 196.3M a month:

| | Customers | Gbps | Revenue / month | Share |
|---|---|---|---|---|
| IP transit / DIA types | 324 | ~1,198,600 | 20.9M | 11% |
| L2 circuits (incl. `l3vpn`) | 271 | ~1,092,300 | 166.2M | 85% |
| Fiber / wave leases | 2,516 | 2,516 waves | 9.2M | 5% |

Transit carries nearly all the IP traffic, at an average of about 17 per Gbps. A real transit-heavy Tier 1 earns about
99% of its revenue from transit and access (Cogent 2025), and about 4% from waves.

## Causes found in the code

1. **The base prices are inverted.** The L2 price per Gbps is `(150 + km × 0.08) × T.km`. It is written inline in
   `src/game/88-days/10-day-tick.js` (twice, in `spawnOffer`), `src/game/80-simulation/70-customers-and-events.js` (the
   mega offers, about lines 71 and 75) and `src/game/60-features/89-fedplay-hyper.js:101`. Transit-type rates come from
   `BIZ_T` in `src/game/40-progress/10-businesses.js` (`isp` 15, `metav` 35, `host` 60, `dia` 600…). Both date from
   1.0.0 (`1685a045`), so no commit records why.
2. **Selling erodes but buying doesn't.** `mkt()` / `mktBase()` (`src/game/80-simulation/75-customer-lifecycle.js:10-13`:
   flat for 180 days, then −10% a year, floor `MK_FLOOR` 0.3) prices every offer (`mktPrice()`, called after
   `spawnOffer()`) and every renewal (`clFair()`). It was added in #178 (`8841fdac`). Buying transit, through
   `transitMo()` (`src/game/80-simulation/40-billing.js:12`) and `transitPerG()` (`src/game/70-rules/20-exchanges.js:17`),
   uses each network's fixed `price` (Cogentle 3, Not That Telecom 8, Level Tree 9) with no `mkt()`. A late-game player
   sells ISP transit at 15 × 0.3 = 4.5 per Gbps, but would pay 8–9 to buy it.
3. **Only one direction of peering and transit is modelled.** The player's own reach is modelled accurately in `compute()`
   (`src/game/80-simulation/30-compute.js` about lines 52–67):
   - a transit exit reaches every network;
   - a PNI reaches `CONE_S[net]` (the peer plus its whole customer cone, built in `src/game/30-networks/40-traffic-shares.js:14-17`);
   - an exchange session reaches the session networks plus their cones.

   Nothing reaches a peer's upstreams or its other peers, which is why `isTier1()` (`src/game/70-rules/80-hot-ports-and-rank.js:23`)
   needs PNIs with every needed Tier 1. Nothing models what *other* networks get from the player, so the game's
   networks never buy transit from the player. On the customer side they appear only as competitors (`clComp()` /
   `sellsAt()`), and every transit buyer is a generated customer (`isp`, `provedor`…).
4. **The player's peering policy is a pure penalty.** `S.ppol` (`open`/`selective`/`closed`) is handled in
   `src/game/70-rules/40-peering-desk.js`. Selective and closed decline inbound session requests and turn off route
   servers (`ixSessions()` in `20-exchanges.js:40`), and closed also multiplies customer offers by 0.6
   (`10-day-tick.js:101`). There is no upside.

How customers arrive today: once a day, if there are fewer than 5 open offers, the chance is
`(0.05 + 0.01 × level) × (closed ? 0.6 : 1) × …`. `spawnOffer()` draws a type from a weighted list that grows with
level, cities, dark fiber and fabrics. Offers expire after 40 days. Contracts renew, grow, haggle or leave in
`clDay()`.

## Real-world reference prices (USD per Gbps per month, 2025–26)

| Product | Real | Game list (before `mkt()`) |
|---|---|---|
| Wholesale 100G IP transit, US/EU hubs | $50–80 ($0.05–0.08/Mbps, TeleGeography) | buy 3–9, sell `isp` 15 |
| Enterprise DIA 1G / 10G | $900–1,500 / $400–750 | `dia` 600 |
| 100G wave, Frankfurt–London | ~$11.50 ($1,150/month) | `l2vpn` ~200 |
| 100G wave, London–New York (subsea) | ~$55 (derived; subsea ~3.8× terrestrial) | `l2vpn` ~600 |
| Managed waves (`mwave`, capacity market) | as above | ~13–52 |

Erosion: transit −12–13% a year, waves −11% a year (Asia ~4%). The game's −10% a year is fine. The game's volumes are
inflated (one network carries 1.28 Pbps), so aim for **realistic ratios** between products, not realistic absolute
prices. In real life wholesale transit costs more per Gbps than a terrestrial wave, and DIA costs about 10–20 times
wholesale transit.

## Design decision: a locked game mode, not sliders

This is one toggle chosen at the start and locked for the whole game. The factors are fixed constants for that mode,
not player-tunable. The reasons:

- Free sliders can produce combinations that can't be won or are trivial, and they can't be balance-tested.
- Classic (today) stays untouched, so the gameplay-rules tests, scenarios and the tuned defaults keep working.

**Implement it as a `GAME_MODS` entry** (`src/game/40-progress/30-rules.js`), next to `autarky` and `outcast`:

- `GAME_MODS`, `GAME_MOD_ICON`, `GAME_MOD_NAME` and `MODE_OPTIONS` (title screen, `src/game/95-modals/40-title.js`,
  `modeOptionsHtml()`, the `<details>` "Challenge options" block, which is already the advanced section).
- It is stored in `S.rules.mods` by `makeRules()` and is already validated and locked. Check it with
  `modeOn('market')` (or whatever id you choose), which is only true in Normal mode.
- Multimode is already excluded for challenge modes (`fedEligible()` / `challengeModsOn()` in `86-fed-state.js`).
  Decide whether that is right here. Realistic pricing isn't really a "challenge", so it may deserve its own check
  rather than `challengeModsOn()`. Scenarios, weekly challenges and puzzles don't use mods.
- Make sure `ruleTag()` and the share card show the mode.
- Templates to copy: `tests/outcast-mode.test.js`, `tests/autarky-mode.test.js`, `tests/rules-locked.test.js`.

## Suggested pricing factors (a starting point, to be tuned)

Keep every factor in one constant block (for example `const MF={…}` in a new `src/game/40-progress/35-market-forces.js`
or similar) and apply it at the price sites, so tuning is one place.

| Lever | Classic | Market Forces | Why |
|---|---|---|---|
| `isp` rate | 15 | ×3 (45) | Wholesale transit should be about 1/12–1/20 of DIA (600) and above the 3–9 buy price |
| `provedor` rate | 20 | ×2.5 (50) | Same as above |
| `metav` / `cgame` rates | 35 / 45 | ×1.5 / ×1.3 | Big volume buyers, still discounted |
| `dia`, `scrub`, `host`, `stream`, `edu`, `gpu`, `game` | — | ×1 | Already plausible |
| L2 formula `(150 + km×0.08) × T.km` | ×1 | **×0.3** | A plain terrestrial circuit should cost less per Gbps than wholesale transit. Keep the distance shape (subsea is dearer, as in reality) |
| `REQS` bonuses for L2 (`diverse` .25, `sharks` .2, `metro` .2 …) | ×1 | **×2** | Keep "harder to deliver pays more". The premium moves from the L2 label onto diversity, latency and resilience, which is how real routes are priced |
| `latPay()` / `lowlat` / `hft` | — | keep | Low latency really is a large premium |
| Bought transit (`transitMo`) | fixed | **× its own market index**: flat 180 days, −8% a year, floor 0.4 | Selling never goes below the cost of buying. F2 (start build profitable in 3 months) is unaffected because of the 180-day flat period |
| Customer `mkt()` floor | 0.3 | 0.3 | Unchanged |

Effect on the same save (customers repriced, reqs bonuses doubled on L2): transit 20.9M → 26.9M, L2 166.2M → 63.0M,
business total 196.3M → 99.1M (transit 27%, L2 64%). Costs were 46.4M, so it stays profitable but much tighter. **Pricing alone doesn't
make transit dominant.** In reality the big transit revenue comes from *other networks* buying it, which is phase 2.

## Phase 2: other networks buy transit from the player

This would only apply in Market Forces mode. It is the real-world logic, using the cone data that already exists:

- **Peering with the player** gives a network the player's cone only. It still needs transit for everything else.
- **Buying transit from the player** gives it the full table. A Tier 1 reaches the full table through its own peering.

Each candidate network (not Tier 1, not content, sharing a city with the player) has two needs:

1. **Everything else:** it buys from an upstream, today its fixed `up` list. The player competes on price and reach
   (Tier 1 status counts most, plus cities in common). Peering doesn't replace this need.
2. **The player's cone:** the player's peering policy decides how this is met.
   - `open`: free over a session.
   - `selective` / `closed`: it must arrive paid, either as transit from the player or as a paid PNI (the mirror of the
     existing `pol: 'paid'` networks and `paidFee` in `pniMo()`). If the network instead buys from another Tier 1 that
     peers with the player, it still reaches the player's cone and that Tier 1 gets the money.

A restrictive policy therefore pays off only if the player's cone is valuable, and in this mode the 0.6× offer penalty
for `closed` should be reconsidered.

Mechanics to decide:

- **Billing:** per Gbps at the 95th percentile with a commit. Reuse `p95()` and the `t.hist` pattern from bought transit.
  It would be a new `BIZ_T` type carrying `net`, like `rpeer` in `src/game/60-features/37-remote-ports.js`, the template
  for "a customer that is a real network".
- **Traffic:** demand sized from the network's `share`.
- **Switching:** only at a renewal-like moment (reuse the `clDay()` terms).
- **Cone:** the buyer's cone joins the player's (reach and `isTier1()`, #85). Its existing PNI or session with the
  player then becomes a customer port.
- This touches `compute()`, the hot path, so run `npm run perf -- --base-ref origin/main` and check rule N3 in the
  `gameplay-rules` skill.

## Constraints to respect (from `CLAUDE.md`)

- **Saves are sacred.** Any new state gets a default in `newGame()` and a repair in `sanitize()`. A mod is already
  handled by `makeRules()`.
- **Every player-facing string is translated** (`src/i18n/en.js` plus `site/i18n/*.js` via `scripts/i18n-add.js`), and
  `node scripts/i18n-check.js` must stay clean.
- **Phones first.** The toggle and any new panel must work at 360 px.
- **Tests come with features.** Add a new `tests/market-forces.test.js`, seeded: the mod is off by default, Classic
  prices are unchanged, the factors are applied when it is on, bought transit erodes, and scenarios and Multimode ignore it.
- **Names are puns.** Use network names from the game in code and text.
- **Upstream etiquette.** `CHANGELOG.md` gets a bullet under `## [Unreleased]`. No version bumps. Perf numbers go in
  the PR.

## Suggested order

1. Add the mod and toggle, with no effect yet, plus tests for its default and locking.
2. Add the pricing factors (one constant block, applied at the price sites), with tests.
3. Make bought transit follow its own market index in the mode, with tests.
4. Play-test the early, mid and late game in the mode. Tune `MF`.
5. Phase 2: networks buy transit, which needs a separate design pass first.

**Status (2026-11-23):** steps 1 and 2 are done. The mod id is `forces` (`rule('market')` already exists), it is played
alone like the other challenge options, and the factors are `MF` in `src/game/40-progress/35-market-forces.js`, applied
through `bizRate()`, `l2Per()` and `reqBonus()`. Two calls made on the way: latency-priced circuits (`T.lat`: `hft`,
`lowlat`, `flex`, `mars`) are exempt from the L2 cut, and per-site prices (`sdwan`, `l3vpn`) are not cut; only the km
formula is.

**Status (step 3):** done. `mfBuy()` (in the same file, `MF.buy`) is the bought-transit index: 1 for 180 days, then
−8% a year, floor 0.4, and 1 without the `market` rule, like `mkt()`. It is applied inside `transitPerG()`, so the
bill (`transitMo()`), the city panel, the NOC intern's cheapest-transit pick and the Networks tab all agree. It moves
every port already bought, not only new ones, as `S.priceMul` does. 

Bought transit costs `regionMult()` more outside Europe and North America (2.5× in Asia), and wholesale buyers paid
no such uplift (only Australia's retail `AU_ARPU`), so in Singapore at the floors you sold at 13.5 and bought at up
to 22. In the mode the wholesale types (`MF.rate`: `isp`, `provedor`, `metav`, `cgame`) are now priced
`× regionMult(city)` too (`bizRate(t,c)` / `cityRate(t,c)`, which replaces `AU_ARPU` for them, never both). Retail
types keep Classic regional prices: they sell far above their transit anyway. A test checks every city where transit
is sold (424), every wholesale type, from day 0 to the floors.

Sources: TeleGeography IP transit and wavelength pricing posts (2025–26), Cogent FY2025 8-K, Meter and Lightyear DIA
pricing, Lumen DIA marketplace.
