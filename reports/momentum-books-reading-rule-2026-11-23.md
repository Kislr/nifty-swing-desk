# The twenty-one paper books — the rule for the reading, written before the books exist (23 Nov 2026, A21)

Written and committed before `paperBooks` existed in `momentum.js` and before any book but the first had been computed. Book 1 is the paper book the digest has carried since 13 Nov 2026; its figures have been sent every evening and are known. Nothing is known about books 2 to 21: five of their start days have already passed (16–20 Nov) and today's close will be the sixth; their replays have not been run. The thresholds below come from bars the desk had already written down — the two points of 12 Nov, the 14-of-21 count of 21 Nov, the 13 Nov decision rule — not from a look at the books.

**Status: confirmed by the owner on 23 Nov 2026, the same day, before any figure of books 2 to 21 had been looked at — see "The owner's decisions" at the end.** As first written: proposed by the session, for the owner to confirm with the merge. A21 said the rule is to be written first; it did not fix the numbers. Three of them are a choice and are marked *(owner)* below. Changing any of them is free until the first reading of the twenty-one results, and not after.

## Why twenty-one books

`reports/momentum-phases-2026-11-21-adjusted-members.md`: the engine rebalances every 21 bars counted from its first day, and over ten years the same rules started on the 21 consecutive days of one cycle made 12.7% to 21.6% a year — median 18.4%, standard deviation 2.6 points — ahead of NIFTY500 MOMENTUM 50 from 14 starts and ahead by the required two points from 5. One book is one draw. The six-month reading the 13 Nov decision asked for would have been made on one draw; the owner's decision of 21 Nov is to make it on all twenty-one.

## What the books are

- **Book 1** is today's paper book, unchanged: the engine's rules with both switches on (`momentum.DEFAULTS`, reinvested), a fresh ₹5,00,000 bought at the close of **13 Nov 2026**, that day's NIFTY 500 members.
- **Books 2 to 21** are the same rules, the same ₹5,00,000 each, started at the close of each of the next twenty sessions on file — one a day. If 24 Nov is the only market holiday in between, as NSE's calendar says, book 21 starts on **14 Dec 2026**. The code takes the days from the bars, not from this sentence.
- Each book is a replay on the stored bars (`M.paperBook`, the function that has produced book 1 since 13 Nov). A start day already past is replayed; one not yet reached starts by itself. Nothing depends on when the code was written or when the job ran.
- **The start days are frozen once all twenty-one exist.** The books are defined by counting bars, so a session loaded later between 13 Nov and mid-December (as the ten weekend sessions were on 21 Nov) would move every later start. When book 21 has started, its twenty-one dates go into `config.json` → `paper.starts` and are read from there from then on; a reminder is set for it.

## What is measured

For each book *k*, on the reading day's close:

- **r(k)** — the book's return since its own first close: marked value ÷ ₹5,00,000 − 1. Costs are in (30 bps a round trip, half on each side); dividends are not (the bars are adjusted for bonuses and splits only).
- **f(k)** — NIFTY500 MOMENTUM 50's return over the same days: its close on the reading day ÷ its close on the book's first day − 1. The **price** index, from `data/benchmarks/live.json` — like for like, since neither side counts dividends. A fund's expense ratio and tracking error are not charged to it; that favours the fund by a few tenths of a point over half a year and is accepted.
- **gap(k) = r(k) − f(k)**, in percentage points, not annualised.
- **dd(k)** and **fdd(k)** — the largest peak-to-trough fall on daily closes, of the book and of the index, over the same days. **ddgap(k) = fdd(k) − dd(k)**: positive when the book fell less.

From the twenty-one:

- **G** — the median gap. **A** — the number of books with gap(k) > 0.
- **D** — the median ddgap. **L** — the number of books with ddgap(k) > 0.

## The reading day

The first session on or after **six calendar months from book 21's first day** — 14 Jun 2027 if book 21 starts on 14 Dec 2026. Every book is read on that one close, from its own start: book 21 has had six months, book 1 seven. The 5 May 2027 reading of book 1 alone, set on 13 Nov, is replaced by this one; its reminder moves to the new date. *(owner: the alternative is to read each book at its own 126th bar — equal lengths, twenty-one different end days. One common close is simpler, is what the digest line shows every evening, and cannot be chosen after the fact.)*

The three-month reading of 5 Feb 2027 stays what it was — a look, no decision — and now also quotes the twenty-one books' line.

## The rule

**Return.**

- **Ahead** — G ≥ **+1.0 point** and A ≥ **14 of 21**. *(owner: both numbers.)*
- **Behind** — G < 0. (Then at most ten books are ahead.)
- **Level** — everything else.

Where the numbers come from: the desk's bar since 12 Nov 2026 has been two points a year over NIFTY500 MOMENTUM 50 — "an index fund is the alternative, and a desk has to pay for itself" — and half a year of that is one point. Fourteen of twenty-one is two books in three, and is the count the same rules reached over ten years on 21 Nov; a median that clears the bar while a third of the books or more are behind the fund is a spread, not a lead.

**Drawdown** — read only to complete the 13 Nov sentence ("behind on return and not clearly better on drawdown").

- **Clearly better** — D ≥ **2.0 points** and L ≥ **14 of 21**. *(owner: the 2.0.)* Anything less is not clearly better. Over half a year the index moves a point or more on an ordinary day; a difference under two points between two drawdowns is a day, not a property of the rules.

**What follows.**

| return | drawdown | reading |
|---|---|---|
| Ahead | either | **Ahead.** The owner's call on real money, as written on 13 Nov — with the size of the claim beside it (next section). |
| Level or behind | not clearly better | **Monitor.** The desk stays a monitor and the fund stays the holding (the 13 Nov rule, word for word). |
| Level or behind | clearly better | **Monitor — loses less, earns no more.** The fund stays the holding. Recorded as a finding; it is what the volatility test of 18 Nov found on ten years and closed. No real money on it. |

Nothing in `momentum.js` changes on any of the three. The books keep running after the reading; no second decision is scheduled here.

## What this reading can and cannot say

Written on 21 Nov and repeated so it is beside the rule: twenty-one books started on consecutive days in one market hold overlapping names. Averaging them removes the luck of the start day; it does not make twenty-one independent tests. Six or seven months is about six rebalances per book, in one regime. An "ahead" says the rules were ahead of the fund in this half year from most start days — it cannot settle a one-point edge, and A ≥ 14 is a description, not a significance level. A "behind" from one bad half year is equally one half year. The ten-year record (`reports/momentum-phases-2026-11-21-adjusted-members.md`) remains the larger body of evidence either way.

## What is expected

Over ten years the median start made 18.4% a year against the fund's 17.3–17.9% — under a point a year, so under half a point in six months. The honest prior is **Level**, with G somewhere between −3 and +3 points and the books several points apart from best to worst; "Ahead" and "Behind" are each possible from the half year's weather alone. How often the rule would have said each, on the ten years before 13 Nov, is measured after this file is committed and added below as an addendum; the thresholds are not changed by what it shows.

## What must be true of the data before the reading is made

The reading is one command on the committed data — `node scripts/paper-books.mjs --to <reading day>` — and its report is committed. Before it:

1. All twenty-one books exist and their start days are the frozen ones in `config.json`.
2. NIFTY500 MOMENTUM 50 has a close in `data/benchmarks/live.json` on every book's first day and on the reading day. A missing close is filled from NSE's index history first (as 13–17 Nov were on 18 Nov); a book is never dropped or measured from a later day because the index had a hole.
3. The NIFTY 500 review that takes effect at the end of March 2027 falls inside the window: the index-review top-up (`BACKFILL.md`) has been run, so no book carries a name with no bar, and the books have been replayed on the real bars.
4. `npm run corporate-actions` has been run from home since the last bonus or split in any holding, so no provisional entry is in the table.
5. No session inside the window is missing from the history (the digest's DATA NOTICES have been clear, or the gaps have been loaded).

If a condition cannot be met on the day, the reading waits for it; the day does not move back.

## What would count against a reading even if the rule passes

- **One name.** If removing the single largest contributor to the median book's profit turns "ahead" into "level", that is said in the same sentence as the verdict. Fifteen names at equal weight should not hang on one.
- **A gate that never opened or never closed.** If the gate was closed for most of the window the books held cash against an index that was fully invested, and the reading is of the gate, not of the ranking. The share of days with the gate closed is reported beside G.
- **Book 1 against the rest.** Book 1 started with a ranking that changed by one name when the weekend sessions were loaded (ATHERENERG → CARTRADE, 21 Nov). It is one book in twenty-one and is not treated differently; if it is the best or the worst of them, that is noted and nothing more.

## Not in this rule

The Discretionary book and the momentum-pullback paper trades are read at the same sitting, as the 13 Nov and 18 Nov notes say — each a record, neither a reason to change a rule. The final audit still waits for everything above it in the README to be ticked.

---

## Addendum, same day — the rule tried on the ten years before the books

Run after the rule above was committed (`git log`: the rule is the commit before the build). No threshold was changed by it.

`node scripts/paper-books.mjs --history` → `reports/momentum-books-history-2026-11-23.md`. The live design moved back in time: an anchor every 21 bars from June 2017, twenty-one books on the twenty-one sessions from it, all read on the first session six calendar months after the last one starts. 105 readings, the last on 6 Nov 2026; no day of the live books is in any of them. The fund is the total-return file — the only daily series on file for those years — which counts dividends the books do not get, and so leans against the books by about a third of a point a reading.

**What this file expected was wrong.** "Level" was the forecast. It is the rarest answer.

| | ahead | level | behind |
|---|---|---|---|
| all 105 readings (windows overlap) | 38 (36%) | 9 (9%) | 58 (55%) |
| the 15 that do not overlap | 6 | 1 | 8 |

- **The median gap G ran from −31.5 to +26.5 points**; the middle half of the readings from −6.8 to +5.0; mean −0.2, median −1.1. Twenty-seven readings had G at +5 or more and thirty-one at −5 or less. A one-point bar is small beside that: it decides almost nothing that the sign of G does not.
- **The mean of −0.2 is the ten-year record again** — the rules about level with the fund — so the readings are not biased. They are loud.
- **Inside one reading the best book beat the worst by 13.2 points at the median, 48.1 at the most.** That is the start-day luck the twenty-one books exist to average out, and it is larger over half a year than the ten-year table suggested.
- **A reading said nothing about the half year after it.** After an "ahead" the next reading's median G was −4.5 points and it was above zero in 12 of 38; the next reading was "ahead" again in 10 of 38 — 26%, under the 36% base rate. After a "behind": +0.7, above zero in 28 of 51.
- **Drawdown:** clearly better in 43 readings (41%); in 21 of those the return was not ahead.

**What follows for June 2027.** Rules with no edge over the fund read "ahead" in more than a third of the past half years and "behind" in more than half. The reading will most likely say one or the other, and either will be mostly the half year's weather. The rule stands as committed — twenty-one books are still the right way not to read one lucky or unlucky start — but an "ahead" by it is a four-in-ten event for rules that are level, and by this table it is no reason to expect the following half year to be ahead.

**Owner's call, before the first reading is looked at** (nothing is built for any of these; the rule's table above is (i)):

- (i) As written: an "ahead" opens the owner's call on real money, read with this table beside it.
- (ii) Two in a row: real money is not considered before a second reading, six months after the first, is also "ahead". In the history both of two consecutive readings were ahead in 10 of 98 pairs.
- (iii) A record only: the June reading is written down and the fund stays the holding whatever it says, until the live books have a record long enough to be read against the ten-year one.

The session's reading of its own table: (i) asks more of one half year than the table says a half year can give.

---

## The owner's decisions (23 Nov 2026, same day)

Taken with the addendum above on the table, and before any figure of books 2 to 21 had been looked at.

1. **The numbers stand as proposed:** ahead = G ≥ +1.0 point and A ≥ 14 of 21; clearly better on drawdown = D ≥ 2.0 points and L ≥ 14 of 21; read on one common close, the first session six calendar months after book 21 starts. The *(owner)* marks above are settled.
2. **What an "ahead" may decide — (i), with a condition, in the owner's words:** "we can make a call on real money if the gain margin stood to be gained is tangible with the kind of paper investments we're already looking at, and treating them as the actual investment at that point."

How that is applied at the reading, so that it is mechanical up to the point where it is a judgement:

- The books are read **as if they had been the actual investment**: ₹5,00,000 a book, in rupees. The reading's report states, beside G and A, what the median book made and what the same ₹5,00,000 made in the fund over the same days, and the difference in rupees (`scripts/paper-books.mjs` prints the line; G × ₹5,00,000 at the median, with the range across the books).
- An "ahead" by the rule opens the call; **whether that rupee margin is tangible is the owner's judgement on the day.** No rupee figure was fixed on 23 Nov. If one is wanted in advance it can be added to this file at any time before the reading — after it, not.
- The history table stays beside the reading: an "ahead" came up in 36% of past half years on rules that are level with the fund. The owner has seen it and kept (i).
- A "level" or "behind" needs no judgement: the fund stays the holding.
