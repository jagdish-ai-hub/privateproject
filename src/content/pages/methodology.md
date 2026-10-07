---
title: "Methodology: how every number is calculated"
description: "How MF Screener gets its data and calculates returns, CAGR, SIP XIRR, volatility, Sharpe, drawdown and rolling returns, and how bad data is handled."
dateModified: "2026-10-02"
---
This page describes exactly what the site does with the data, so you can check any number. The same rules are implemented in one tested code module that is used both when the data is prepared and in your browser.

## 1. Data sources

- **AMFI** (Association of Mutual Funds in India) publishes the NAV of every scheme each day, together with its fund house and SEBI category. This is the official source.
- **[MFapi.in](https://www.mfapi.in)** provides each scheme's full NAV history and its full scheme name (including plan and option), built on AMFI data.

No other data source is used. Visitors' browsers never contact MFapi; the data is prepared in advance and served as static files.

## 2. Which schemes are listed

A scheme is listed if its latest NAV is at most 10 days older than the newest NAV in AMFI's file. This drops closed and merged schemes. NAVs dated in the future (a data error in the source) are excluded. The page shows the date most schemes report as "NAV as of".

## 3. Classification

- **Category**: taken from AMFI's category heading. AMFI uses both older and newer SEBI names for the same category (for example "Equity Schemes - Small Cap Fund" and "Equity Scheme - Small Cap Fund"); these are merged into one name.
- **Plan** (Direct / Regular): read from the scheme name and AMFI's plan column. If neither says and the scheme started before Direct plans existed (1 January 2013), it is Regular. If neither says and it is newer, the plan is shown as "not stated" and is excluded from Direct and Regular filters rather than guessed. ETFs have no plans.
- **Option** (Growth / IDCW / Bonus / other): read from the same sources. Any dividend, IDCW, payout or reinvestment wording means IDCW.

## 4. Cleaning NAV history

NAV dates are read as day-month-year (never month-first). Rows are sorted by date, duplicates removed (the last one wins), and rows with a missing or non-positive NAV are dropped.

Three kinds of problems in raw NAV data would otherwise produce wrong returns, so they are handled before any calculation:

1. **Unit splits and consolidations.** ETFs and some funds change the face value of a unit, so the NAV drops to a fraction (for example one tenth) overnight with no loss to investors. A one-day move below 0.70× or above 1.40× that is within 10% of a round factor (2, 3, 4, 5, 10, 20, 25, 50, 100, 500 or 1000) is treated as a split; all earlier NAVs are divided by exactly that factor, so the day's real market move is preserved. The latest NAV shown is never changed. Funds adjusted this way carry a note on their page.
2. **One-day glitches.** A NAV that jumps outside the ordinary range and returns to within 15% of its previous level on the very next day is a data error and is removed.
3. **Unexplained jumps.** A large one-day move that is not a split and does not reverse (for example a very large IDCW payout or a scheme change) cannot be bridged honestly. History before the last such jump is left out of every return and chart, and the fund page says so.

## 5. Returns

- The **end** is the latest NAV. The **start** is the end date minus the period in calendar months (29 February moves to 28 February).
- The start NAV is the last NAV **on or before** the start date, so weekends and holidays do not distort it. If that NAV is more than 7 days before the start date, no return is shown.
- A fund **younger than the period** shows no return (a dash). A partial-period figure is never shown.
- Periods **under 12 months** are absolute returns: end NAV ÷ start NAV − 1.
- Periods of **12 months or more** are CAGR: (end NAV ÷ start NAV)^(365 ÷ days) − 1, using the actual number of days between the two NAV dates. This is the convention used in fund factsheets.
- **Since launch** is CAGR from the first NAV if the fund is at least a year old, otherwise an absolute return.

See [CAGR vs XIRR vs absolute return](/learn/cagr-xirr-absolute-return/).

## 6. SIP returns (XIRR)

A SIP of equal monthly instalments is simulated over the last 1, 3 or 5 years: one instalment on the same calendar day each month, starting that many months before the latest NAV date and ending one month before it. Each instalment buys at the first NAV on or after its date (at most 7 days later, otherwise no figure is shown). All units are valued at the latest NAV. XIRR is the yearly rate that makes the dated cash flows add up to zero (day count over 365), solved numerically.

## 7. Risk measures (last 3 years)

Calculated from the daily percentage changes in NAV over the last three years. A fund must have at least three years of data.

- **Volatility** = standard deviation of daily returns × √252.
- **Sharpe ratio** = ((average daily return − risk-free ÷ 252) × 252) ÷ volatility, with a risk-free rate of 6.5% a year.
- **Sortino ratio** = the same numerator divided by downside deviation (root mean square of daily returns below the risk-free daily rate) × √252.
- **Maximum drawdown** = the largest fall from a peak NAV to a later low in the window.

## 8. Rolling returns

For every date that has a NAV one year (or three years) earlier, the return over that trailing window is computed (CAGR for windows of 12 months or more). The page shows the average, the worst, and for 1-year windows the share that were positive. See [rolling returns explained](/learn/rolling-returns-explained/).

## 9. Peer rank

The rank on a fund page compares the fund with others in the same category, plan and option, by return for the same period. Funds with no value for the period are not counted as peers. Equal returns share the better rank. A peer group of one shows no rank.

## 10. Charts

The chart uses the same cleaned NAV series as the tables. The most recent year is plotted daily; older history is thinned to keep pages fast, while always keeping the first and last points and the exact points used as the start of the standard return periods. The percentage change shown for a chart range is computed with the same function as the returns table, so they agree. On the compare page every fund is scaled to 100 on the first day of a common window, which ends on the earliest "latest NAV" among the funds; a window a fund is too young for is disabled.

## 11. Calculators

SIP, step-up SIP, goal SIP and SWP calculators use the market-standard convention of a monthly rate equal to the yearly rate ÷ 12, compounded monthly, with SIP instalments at the start of each month. This is why ₹10,000 a month for 10 years at 12% gives about ₹23.23 lakh, matching most other Indian SIP calculators. The lumpsum calculator compounds yearly. Results are projections from the rate you enter and are not forecasts.

## 12. Costs and size (expense ratio and AUM)

**Expense ratio (TER).** Each fund house discloses the total expense ratio of every scheme to AMFI, for the Regular and the Direct plan, and AMFI publishes it. We read the newest disclosure for each scheme and show the plan you are looking at. The disclosure also splits the TER into a base expense ratio, brokerage, transaction cost and statutory levies, which fund pages show. AMFI's file has no scheme code, so we match schemes by fund house, scheme name and category. Since April 2026 the total includes statutory levies (such as STT on derivative trades), which depend on how much a fund trades rather than on the fund house; arbitrage and quant funds therefore show high totals, and fund pages explain this when levies are a large part. Older sources, which list only the base expense ratio, will show lower figures for these funds. A scheme we cannot match with confidence shows a dash rather than a guess. A plan that does not exist (for example a Direct plan that was never launched) is never shown as 0%. ETFs have a single cost, which is shown for the ETF.

**AUM.** AUM is the average assets under management for the latest complete quarter that AMFI has published, in ₹ crore, matched by the AMFI scheme code. AMFI reports one figure per plan and option, so the fund size we show for a scheme is those figures added up across all its plans and options (Direct, Regular, Growth, IDCW), which is the number other sites call the fund's AUM; the fund page also shows the single plan's own AUM. For Parag Parikh Flexi Cap Fund the four plans and options add up to about ₹1.47 lakh crore, close to the ₹1.48 lakh crore other sites show, while its Direct Growth plan alone holds about ₹98,500 crore. The newest quarter is skipped while AMFI is still filling it in.

The "as of" date of the expense ratio and the quarter of the AUM are shown on the fund page. Both come from AMFI's own website, not from MFapi, and both are optional: if AMFI cannot be reached the previous values are kept and the page still builds.

## 13. What is not included

Exit load, portfolio holdings, fund manager, riskometer and benchmark returns are not in the data used here, so they are not shown, and a missing value is a dash, never an estimate. Returns are before tax and exit load. Returns on IDCW options are NAV price returns and exclude payouts.

## 14. Update schedule

The data is refreshed each night after AMFI publishes the day's NAVs. The "NAV as of" date on the screener tells you the data date.

## 14. How the calculations are checked

- Unit tests with hand-calculated cases cover holidays, leap days, young funds, stale data, splits, glitches and the SIP and XIRR maths.
- The calculations are cross-checked against a separately written implementation (in a different language) on the real NAV history of several funds, and agree to many decimal places.
- End-to-end tests confirm that the percentage shown by each chart range equals the returns table.

We have not reconciled every figure against fund house factsheets. Small differences from other sites can arise from different start-date conventions, NAV rounding and data cleaning.

## 15. Corrections

If you find a number that looks wrong, please tell us on the [contact page](/contact/), with the fund name and what you expected. A bug report is treated as a bug until shown otherwise.
