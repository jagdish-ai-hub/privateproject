import type { Tool } from './tools.ts';

/** The guide to read alongside each calculator: its file name in src/content/learn, and its title in both languages. */
export const TOOL_GUIDES: Record<Tool['kind'], { slug: string; title: string; titleHi: string }> = {
  sip: { slug: 'what-is-sip', title: 'What is a SIP? How a systematic investment plan works', titleHi: 'SIP क्या है? सिस्टमैटिक इन्वेस्टमेंट प्लान कैसे काम करता है' },
  stepup: { slug: 'what-is-sip', title: 'What is a SIP? How a systematic investment plan works', titleHi: 'SIP क्या है? सिस्टमैटिक इन्वेस्टमेंट प्लान कैसे काम करता है' },
  goal: { slug: 'what-is-sip', title: 'What is a SIP? How a systematic investment plan works', titleHi: 'SIP क्या है? सिस्टमैटिक इन्वेस्टमेंट प्लान कैसे काम करता है' },
  lumpsum: { slug: 'sip-vs-lumpsum', title: 'SIP vs lumpsum: which is better for mutual funds?', titleHi: 'SIP बनाम लंपसम: म्यूचुअल फंड के लिए कौन-सा बेहतर?' },
  swp: { slug: 'growth-vs-idcw-mutual-funds', title: 'Growth vs IDCW (dividend) option in mutual funds', titleHi: 'म्यूचुअल फंड में ग्रोथ बनाम IDCW (डिविडेंड) विकल्प' },
  cagr: { slug: 'cagr-xirr-absolute-return', title: 'CAGR vs XIRR vs absolute return: which one to use?', titleHi: 'CAGR बनाम XIRR बनाम कुल रिटर्न: कौन-सा इस्तेमाल करें?' },
  rentbuy: { slug: 'rent-vs-buy-house-india', title: 'Rent vs buy a house in India: how to decide', titleHi: 'भारत में घर ख़रीदें या किराये पर रहें: कैसे तय करें' },
  car: { slug: 'ev-vs-petrol-running-cost-india', title: 'EV vs petrol car in India: running cost, payback and what to check', titleHi: 'भारत में EV बनाम पेट्रोल कार: चलाने का खर्च, वसूली और क्या जाँचें' },
  evpetrol: { slug: 'ev-vs-petrol-running-cost-india', title: 'EV vs petrol car in India: running cost, payback and what to check', titleHi: 'भारत में EV बनाम पेट्रोल कार: चलाने का खर्च, वसूली और क्या जाँचें' },
  jewellery: { slug: 'gold-and-silver-jewellery-coins-or-funds', title: 'Buying gold and silver: jewellery, coins, funds and what each costs', titleHi: 'सोना-चाँदी ख़रीदना: गहने, सिक्के, फंड और हर एक का खर्च' },
  homeloan: { slug: 'how-emi-works-home-car-personal-loans', title: 'How an EMI works: home, car and personal loans, flat vs reducing rate', titleHi: 'EMI कैसे काम करती है: होम, कार और पर्सनल लोन, फ़्लैट बनाम घटता बैलेंस' },
  carloan: { slug: 'how-emi-works-home-car-personal-loans', title: 'How an EMI works: home, car and personal loans, flat vs reducing rate', titleHi: 'EMI कैसे काम करती है: होम, कार और पर्सनल लोन, फ़्लैट बनाम घटता बैलेंस' },
  personalloan: { slug: 'how-emi-works-home-car-personal-loans', title: 'How an EMI works: home, car and personal loans, flat vs reducing rate', titleHi: 'EMI कैसे काम करती है: होम, कार और पर्सनल लोन, फ़्लैट बनाम घटता बैलेंस' },
  fd: { slug: 'fixed-deposit-returns-after-tax-and-inflation', title: 'Fixed deposit returns after tax and inflation: what you really earn', titleHi: 'फ़िक्स्ड डिपॉज़िट का रिटर्न टैक्स और महँगाई के बाद: असल कमाई' },
  inflation: { slug: 'fixed-deposit-returns-after-tax-and-inflation', title: 'Fixed deposit returns after tax and inflation: what you really earn', titleHi: 'फ़िक्स्ड डिपॉज़िट का रिटर्न टैक्स और महँगाई के बाद: असल कमाई' },
  metalreturn: { slug: 'gold-and-silver-jewellery-coins-or-funds', title: 'Buying gold and silver: jewellery, coins, funds and what each costs', titleHi: 'सोना-चाँदी ख़रीदना: गहने, सिक्के, फंड और हर एक का खर्च' },
};
