---
title: "Rolling returns explained: a better way to judge mutual funds"
description: "Rolling returns show how a fund performed across every possible start date, not just one lucky or unlucky period. Learn how to read them."
group: "Returns and risk"
order: 9
datePublished: "2026-10-02"
dateModified: "2026-11-19"
related: ["cagr-xirr-absolute-return", "mutual-fund-risk-measures", "what-is-sip"]
faqs:
  - question: "What are rolling returns?"
    answer: "Rolling returns are returns over a fixed-length window, such as 3 years, calculated for every possible start date and then summarised, for example by the average, the worst and the best."
  - question: "Why are rolling returns better than point-to-point returns?"
    answer: "A point-to-point return depends entirely on the two dates chosen. A fund can look excellent from one start date and poor from another. Rolling returns show the whole range of outcomes an investor could have had."
  - question: "What does '% positive windows' mean?"
    answer: "It is the share of all the rolling windows in which the fund ended with a positive return. A higher share means investors lost money less often over that holding period."
  - question: "What is the difference between trailing returns and rolling returns?"
    answer: "A trailing return is one window ending today, such as the last 3 years. Rolling returns look at every 3-year window in the fund’s history and show the average, the worst and how often it was positive, so they depend much less on one start date."
---
A fund's 5-year return is a single number from one start date to one end date. If the start date happened to be right before a crash, the number looks bad; if it was right after, it looks great. **Rolling returns** remove that luck.

## How they work

Pick a holding period, for example 1 year. Take every trading day as a start date, compute the return from that day to one year later, and move forward one day at a time. You end up with thousands of overlapping 1-year returns. Summarise them with:

- **Average**: the typical outcome.
- **Worst (minimum)**: the worst result an investor with that holding period actually got.
- **Positive windows**: the share of windows that ended in a gain.

Each fund page on this site shows these for 1-year windows, and the 3-year average and worst. For windows of 12 months or more the return is shown as CAGR. See [CAGR vs XIRR vs absolute return](/learn/cagr-xirr-absolute-return/).

## Reading them

Two funds can have the same 5-year return and very different rolling returns. One may have delivered 12% almost every time; another may have swung between −10% and +30%. The steadier fund gave investors fewer unpleasant surprises, which matters if you may need to sell at an unlucky moment.

A high average with a very poor worst case tells you the fund can fall hard. A modest average with a high share of positive windows tells you it was consistent. Neither is better in itself; they suit different tolerance for risk. Combine them with the [risk measures](/learn/mutual-fund-risk-measures/).

## Trailing returns vs rolling returns

The returns most sites show, such as "3-year return: 14%", are **trailing returns**: one window that ends today. Rolling returns use every window of the same length in the fund’s history.

| | Trailing return | Rolling return |
| --- | --- | --- |
| Windows used | One, ending on the latest date | Every window of that length, one day apart |
| What it answers | How did the fund do over exactly the last N years? | How did the fund usually do over any N years, and how bad was the worst? |
| Effect of the start date | Large: a crash or a rally near the start changes it a lot | Small: one lucky or unlucky date is one window among thousands |
| Best used for | A quick, current snapshot | Judging how consistent a fund has been |

Use both: the trailing return tells you where the fund stands now, and the rolling return tells you whether that is typical. To work out a trailing return from two NAVs, use the [CAGR calculator](/tools/cagr-calculator/); for your own SIP or irregular investments, use the [XIRR calculator](/tools/xirr-calculator/).

## Limits

- Windows overlap heavily, so they are not independent observations. Ten years of data does not give thousands of separate results.
- A fund with a short history has few windows, so its figures are less reliable. Funds younger than the window show no figure at all.
- They describe the past. A fund can change manager, size or strategy.

Compare rolling returns only between funds in the same category over the same window, and look at them alongside returns, risk and cost.
