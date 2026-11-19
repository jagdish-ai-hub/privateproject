/**
 * Fixed home page content: calculator groups, guide picks, "which is better" links and the FAQ.
 * Every href points to a page that exists (scripts/check-site.mjs fails the build otherwise).
 */
import type { Faq } from '../lib/seo.ts';

/** A labelled link. */
export interface HomeLink { label: string; href: string }

/** Calculators shown on the home page, in groups. */
export const HOME_CALCULATORS: { group: string; links: HomeLink[] }[] = [
  {
    group: 'Mutual funds',
    links: [
      { label: 'SIP calculator', href: '/tools/sip-calculator/' },
      { label: 'Step-up SIP calculator', href: '/tools/step-up-sip-calculator/' },
      { label: 'Lumpsum calculator', href: '/tools/lumpsum-calculator/' },
      { label: 'Goal SIP calculator', href: '/tools/goal-sip-calculator/' },
      { label: 'SWP calculator', href: '/tools/swp-calculator/' },
      { label: 'XIRR calculator', href: '/tools/xirr-calculator/' },
      { label: 'CAGR calculator', href: '/tools/cagr-calculator/' },
    ],
  },
  {
    group: 'Government schemes',
    links: [
      { label: 'PPF calculator', href: '/schemes/ppf-calculator/' },
      { label: 'Sukanya Samriddhi calculator', href: '/schemes/sukanya-samriddhi-calculator/' },
      { label: 'NSC calculator', href: '/schemes/nsc-calculator/' },
      { label: 'KVP calculator', href: '/schemes/kvp-calculator/' },
      { label: 'SCSS calculator', href: '/schemes/scss-calculator/' },
      { label: 'Post Office MIS calculator', href: '/schemes/post-office-mis-calculator/' },
      { label: 'Post Office RD calculator', href: '/schemes/post-office-rd-calculator/' },
      { label: 'Post Office FD calculator', href: '/schemes/post-office-fd-calculator/' },
    ],
  },
  {
    group: 'Loans and deposits',
    links: [
      { label: 'EMI calculator', href: '/tools/emi-calculator/' },
      { label: 'Home loan EMI calculator', href: '/tools/home-loan-emi-calculator/' },
      { label: 'Home loan eligibility calculator', href: '/tools/home-loan-eligibility-calculator/' },
      { label: 'Car loan EMI calculator', href: '/tools/car-loan-emi-calculator/' },
      { label: 'Personal loan EMI calculator', href: '/tools/personal-loan-emi-calculator/' },
      { label: 'FD calculator', href: '/tools/fd-calculator/' },
      { label: 'Inflation calculator', href: '/tools/inflation-calculator/' },
    ],
  },
  {
    group: 'Gold, fuel and home',
    links: [
      { label: 'Gold jewellery price calculator', href: '/tools/gold-jewellery-price-calculator/' },
      { label: 'Gold SIP calculator', href: '/tools/gold-sip-calculator/' },
      { label: 'Gold and silver return calculator', href: '/tools/gold-silver-return-calculator/' },
      { label: 'Fuel cost calculator', href: '/tools/fuel-cost-calculator/' },
      { label: 'Mileage calculator', href: '/tools/mileage-calculator/' },
      { label: 'EV vs petrol cost calculator', href: '/tools/ev-vs-petrol-running-cost-calculator/' },
      { label: 'Rent vs buy calculator', href: '/tools/rent-vs-buy-calculator/' },
    ],
  },
];

/** "Which is better" links: comparison guides and calculators. */
export const VS_LINKS: HomeLink[] = [
  { label: 'SIP vs lumpsum', href: '/learn/sip-vs-lumpsum/' },
  { label: 'SIP vs FD', href: '/learn/sip-vs-fd/' },
  { label: 'SIP vs RD', href: '/learn/sip-vs-rd/' },
  { label: 'FD vs debt mutual funds', href: '/learn/fd-vs-debt-mutual-funds/' },
  { label: 'PPF vs mutual funds', href: '/learn/ppf-vs-mutual-funds/' },
  { label: 'Mutual funds vs post office schemes', href: '/learn/mutual-funds-vs-post-office-schemes/' },
  { label: 'Large vs mid vs small cap', href: '/learn/large-cap-vs-mid-cap-vs-small-cap/' },
  { label: 'Direct vs regular plans', href: '/learn/direct-vs-regular-mutual-funds/' },
  { label: 'Index funds vs ETFs vs active funds', href: '/learn/index-funds-vs-etfs-vs-active-funds/' },
  { label: 'Rent vs buy a house', href: '/tools/rent-vs-buy-calculator/' },
  { label: 'EV vs petrol car', href: '/tools/ev-vs-petrol-running-cost-calculator/' },
];

/** Guides picked for the home page. */
export const HOME_GUIDES: { slug: string; title: string; blurb: string }[] = [
  { slug: 'fd-vs-debt-mutual-funds', title: 'FD vs debt mutual funds', blurb: 'Returns, tax, safety and when each one fits' },
  { slug: 'hybrid-mutual-funds-explained', title: 'Hybrid mutual funds explained', blurb: 'Equity and debt in one fund: the seven types' },
  { slug: 'large-cap-vs-mid-cap-vs-small-cap', title: 'Large cap vs mid cap vs small cap', blurb: 'How much they rise, fall and swing' },
  { slug: 'sip-vs-fd', title: 'SIP vs FD', blurb: 'Monthly SIP in a fund or a fixed deposit' },
  { slug: 'sip-vs-rd', title: 'SIP vs RD', blurb: 'Monthly saving in a fund or a recurring deposit' },
  { slug: 'mutual-funds-vs-post-office-schemes', title: 'Mutual funds vs post office schemes', blurb: 'Guaranteed rates against market returns' },
  { slug: 'how-to-compare-mutual-funds', title: 'How to compare mutual funds', blurb: 'Returns, benchmark, risk, cost and overlap, step by step' },
  { slug: 'direct-vs-regular-mutual-funds', title: 'Direct vs regular mutual funds', blurb: 'The same fund at a lower cost' },
  { slug: 'mutual-fund-taxation-india', title: 'Mutual fund tax in India', blurb: 'Equity, debt and hybrid funds after the 2024 changes' },
];

/** Home page FAQ (also sent as FAQPage JSON-LD, so the visible text must match). */
export const HOME_FAQS: Faq[] = [
  {
    question: 'How do I compare two mutual funds?',
    answer: 'Pick funds from the same category, plan and option, so they follow the same rules. Then look at returns over several periods (1, 3 and 5 years), SIP returns, how much the fund fell in bad times (volatility and worst fall), the expense ratio and the fund size. Use "Pick funds side by side" to see up to four funds on one chart with plain-English notes. The guide "How to compare mutual funds" on this site goes through each step.',
  },
  {
    question: 'What does Direct plan, Growth option mean?',
    answer: 'Direct plan means you buy from the fund house without a distributor, so the yearly cost (expense ratio) is lower than the Regular plan of the same fund. Growth option means profits stay invested and show up in the NAV instead of being paid out as IDCW. The lists on this page use Direct Growth so every fund is measured the same way.',
  },
  {
    question: 'Are the funds with the highest returns the best funds to buy?',
    answer: 'Not necessarily. These lists show past returns, which can change quickly, and a fund at the top of a 1-month list is often there because its corner of the market had a good month. Check longer periods, how deep its falls were and its cost, and match the category to your goal and time horizon. This site gives information, not investment advice.',
  },
  {
    question: 'Which return period should I look at?',
    answer: 'For equity funds, 3-year and 5-year returns (a year) and rolling returns say more than 1-month or 3-month figures. Short-period returns are shown as absolute returns and swing a lot. For debt funds, 1-year and 3-year returns and the expense ratio matter most.',
  },
  {
    question: 'Where does the data come from and how often is it updated?',
    answer: 'NAVs, expense ratios and fund sizes are published by fund houses and AMFI. The site rebuilds every night after AMFI publishes the day\'s NAVs, and every return and risk figure is calculated from the NAV history.',
  },
];
