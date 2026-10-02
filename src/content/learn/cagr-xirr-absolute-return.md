---
title: "CAGR vs XIRR vs absolute return: which one to use?"
description: "Absolute return, CAGR and XIRR measure mutual fund returns in different ways. Learn what each means, with worked examples, and when to use which."
group: "Returns and risk"
order: 8
datePublished: "2026-10-02"
dateModified: "2026-10-02"
related: ["rolling-returns-explained", "what-is-sip", "mutual-fund-risk-measures"]
faqs:
  - question: "What is the difference between CAGR and absolute return?"
    answer: "Absolute return is the total percentage change over the whole period. CAGR (compound annual growth rate) converts that into a steady yearly rate, so periods of different lengths can be compared."
  - question: "When is XIRR used?"
    answer: "XIRR is used when money goes in or out on different dates, such as a monthly SIP. It finds the single yearly rate that would produce the same final value from those dated cash flows."
  - question: "Why does this site show CAGR for 1 year and above but absolute return below that?"
    answer: "Annualising a return of less than a year exaggerates it. A 3% gain in one month is not a 42% yearly rate. For periods under 12 months the site shows the plain percentage change, and from 12 months upward it shows CAGR, which is also how fund houses report returns in factsheets."
  - question: "Can a fund show a positive CAGR but a loss for me?"
    answer: "Yes. CAGR describes a lump sum held for the full period. If you invested at other times, or through a SIP, your own return can be different. That is why SIP returns are shown separately."
---
Three terms appear on almost every fund page. They measure return in different ways, and using the wrong one gives a misleading picture.

## Absolute return

The total change over a period, ignoring how long it took.

**Absolute return = (end NAV ÷ start NAV) − 1**

If a NAV goes from ₹100 to ₹121, the absolute return is 21%. That is true whether it took two years or ten, which is why it cannot compare funds held for different periods.

## CAGR

The compound annual growth rate is the steady yearly rate that would take you from the start NAV to the end NAV.

**CAGR = (end NAV ÷ start NAV)^(365 ÷ days) − 1**

For ₹100 growing to ₹121 in two years (730 days), CAGR is 10% a year. Over ten years the same ₹21 gain would be only about 1.9% a year. CAGR is the standard way to quote a fund's 1, 3, 5 and 10-year returns. Try it in the [CAGR calculator](/tools/cagr-calculator/).

This site uses the actual number of days between the two NAV dates, takes the last available NAV on or before the start date (so weekends and holidays do not distort it), and shows no number at all if the fund is younger than the period.

## XIRR

CAGR assumes one investment at the start. A SIP puts money in every month, and each instalment is invested for a different time. **XIRR** (extended internal rate of return) handles this. It finds the yearly rate at which all the instalments, each on its own date, would grow to exactly the final value.

Example: ₹100 invested now, worth ₹110 a year later, has an XIRR of 10%. With many dated instalments there is no simple formula, so spreadsheets and this site's pipeline solve it numerically. The screener's "SIP 1Y/3Y/5Y" columns are XIRRs of a monthly SIP. See [what is a SIP](/learn/what-is-sip/).

## Which to use

| Situation | Use |
| --- | --- |
| Compare funds over the same period | CAGR |
| Period under 1 year | Absolute return |
| Regular investments such as a SIP | XIRR |
| Total change, no matter how long | Absolute return |

## Things to remember

- A return is only meaningful with its period. A "20% return" without dates tells you little.
- Point-to-point returns depend heavily on the start and end dates. [Rolling returns](/learn/rolling-returns-explained/) show how stable a fund's returns were across many dates.
- Past returns do not predict future returns.
