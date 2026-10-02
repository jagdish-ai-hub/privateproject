"""Independent reference implementation used to generate tests/fixtures/expected.json.

Deliberately written separately from src/lib/calc (different language, datetime/bisect based,
bisection XIRR) so the two implementations can cross-check each other on real NAV history.
Run: python3 scripts/crosscheck_reference.py
"""
import bisect, calendar, json, math
from datetime import date, datetime

FUNDS = [125497, 122639, 120503]

def load(code):
    d = json.load(open(f"tests/fixtures/raw-{code}.json"))
    rows = {}
    for r in d["data"]:
        n = float(r["nav"])
        if n > 0:
            rows[datetime.strptime(r["date"], "%d-%m-%Y").date()] = n
    days = sorted(rows)
    return days, [rows[x] for x in days]

def shift(d, months):
    t = d.year * 12 + d.month - 1 + months
    y, m = divmod(t, 12)
    return date(y, m + 1, min(d.day, calendar.monthrange(y, m + 1)[1]))

def period_return(days, navs, months):
    end = days[-1]
    target = shift(end, -months)
    i = bisect.bisect_right(days, target) - 1
    if i < 0 or (target - days[i]).days > 7 or i >= len(days) - 1:
        return None
    n = (end - days[i]).days
    if months >= 12:
        return (navs[-1] / navs[i]) ** (365 / n) - 1
    return navs[-1] / navs[i] - 1

def xirr(flows):
    d0 = min(d for d, _ in flows)
    f = lambda r: sum(a / (1 + r) ** ((d - d0).days / 365) for d, a in flows)
    lo, hi = -0.99, 100.0
    for _ in range(300):
        mid = (lo + hi) / 2
        if f(lo) * f(mid) <= 0: hi = mid
        else: lo = mid
    return (lo + hi) / 2

def sip_xirr(days, navs, months, amount=10000):
    end = days[-1]
    flows, units = [], 0.0
    for k in range(months, 0, -1):
        sched = shift(end, -k)
        i = bisect.bisect_left(days, sched)
        if i >= len(days) or (days[i] - sched).days > 7 or sched < days[0]:
            return None
        flows.append((days[i], -amount)); units += amount / navs[i]
    flows.append((end, units * navs[-1]))
    return xirr(flows)

def risk(days, navs, months, rf=0.065):
    end = days[-1]
    i = bisect.bisect_right(days, shift(end, -months)) - 1
    if i < 0: return None
    w = navs[i:]
    r = [w[k] / w[k - 1] - 1 for k in range(1, len(w))]
    mean = sum(r) / len(r)
    sd = math.sqrt(sum((x - mean) ** 2 for x in r) / (len(r) - 1))
    vol = sd * math.sqrt(252)
    peak, dd = -1e18, 0.0
    for v in w:
        peak = max(peak, v); dd = min(dd, v / peak - 1)
    return {"volatility": vol, "sharpe": (mean - rf / 252) * 252 / vol, "maxDrawdown": dd}

out = {}
for c in FUNDS:
    days, navs = load(c)
    out[str(c)] = {
        "asOf": days[-1].isoformat(),
        "ret": {str(m): period_return(days, navs, m) for m in (1, 3, 6, 12, 36, 60, 120)},
        "sip": {str(m): sip_xirr(days, navs, m) for m in (12, 36, 60)},
        "risk36": risk(days, navs, 36),
    }
json.dump(out, open("tests/fixtures/expected.json", "w"), indent=1)
print(json.dumps(out["125497"], indent=1))
