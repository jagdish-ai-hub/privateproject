/**
 * Official sources behind each calculator and the Government scheme pages: where the rules, rates and
 * definitions come from. Links go to the organisation's own site; rates themselves are typed in by
 * the visitor (calculators) or come from the dated notice shown on the page (schemes).
 */
import type { Tool } from './tools.ts';

export interface Source {
  name: string;
  nameHi: string;
  url: string;
  /** What the source is used for. */
  what: string;
  whatHi: string;
}

const S = {
  amfi: { name: 'AMFI (Association of Mutual Funds in India)', nameHi: 'AMFI (एसोसिएशन ऑफ़ म्यूचुअल फंड्स इन इंडिया)', url: 'https://www.amfiindia.com/', what: 'Daily NAVs and fund data', whatHi: 'रोज़ के NAV और फंड का डेटा' },
  sebi: { name: 'SEBI (Securities and Exchange Board of India)', nameHi: 'SEBI (भारतीय प्रतिभूति और विनिमय बोर्ड)', url: 'https://www.sebi.gov.in/', what: 'Mutual fund rules and categories', whatHi: 'म्यूचुअल फंड के नियम और श्रेणियाँ' },
  rbi: { name: 'Reserve Bank of India', nameHi: 'भारतीय रिज़र्व बैंक', url: 'https://www.rbi.org.in/', what: 'Rules for loans, interest rates and deposits', whatHi: 'लोन, ब्याज दरों और जमा के नियम' },
  tax: { name: 'Income Tax Department', nameHi: 'आयकर विभाग', url: 'https://incometaxindia.gov.in/', what: 'Tax on interest and gains, and deductions', whatHi: 'ब्याज और मुनाफ़े पर टैक्स, और कटौतियाँ' },
  dea: { name: 'Ministry of Finance, Department of Economic Affairs', nameHi: 'वित्त मंत्रालय, आर्थिक कार्य विभाग', url: 'https://dea.gov.in/', what: 'Quarterly notice of small savings interest rates', whatHi: 'छोटी बचत योजनाओं की ब्याज दरों की तिमाही अधिसूचना' },
  indiapost: { name: 'India Post', nameHi: 'इंडिया पोस्ट', url: 'https://www.indiapost.gov.in/', what: 'Scheme rules and how to open an account', whatHi: 'योजनाओं के नियम और खाता खोलने का तरीक़ा' },
  nsi: { name: 'National Savings Institute', nameHi: 'राष्ट्रीय बचत संस्थान', url: 'https://www.nsiindia.gov.in/', what: 'Small savings scheme rules', whatHi: 'छोटी बचत योजनाओं के नियम' },
  dicgc: { name: 'DICGC (Deposit Insurance and Credit Guarantee Corporation)', nameHi: 'DICGC (निक्षेप बीमा और प्रत्यय गारंटी निगम)', url: 'https://www.dicgc.org.in/', what: 'Insurance of bank deposits', whatHi: 'बैंक जमा का बीमा' },
  mospi: { name: 'Ministry of Statistics (MoSPI)', nameHi: 'सांख्यिकी मंत्रालय (MoSPI)', url: 'https://www.mospi.gov.in/', what: 'Consumer price inflation (CPI)', whatHi: 'उपभोक्ता मूल्य महँगाई (CPI)' },
  ppac: { name: 'Petroleum Planning and Analysis Cell (PPAC)', nameHi: 'पेट्रोलियम योजना और विश्लेषण प्रकोष्ठ (PPAC)', url: 'https://ppac.gov.in/', what: 'Petrol, diesel and CNG prices', whatHi: 'पेट्रोल, डीज़ल और CNG के दाम' },
  bis: { name: 'Bureau of Indian Standards', nameHi: 'भारतीय मानक ब्यूरो', url: 'https://www.bis.gov.in/', what: 'Gold hallmarking and HUID', whatHi: 'सोने की हॉलमार्किंग और HUID' },
  gst: { name: 'CBIC GST', nameHi: 'CBIC GST', url: 'https://cbic-gst.gov.in/', what: 'GST rates', whatHi: 'GST की दरें' },
} satisfies Record<string, Source>;

/** Sources for each calculator kind. */
export const TOOL_SOURCES: Record<Tool['kind'], Source[]> = {
  sip: [S.amfi, S.sebi], stepup: [S.amfi, S.sebi], lumpsum: [S.amfi, S.sebi], goal: [S.amfi, S.sebi], swp: [S.amfi, S.sebi, S.tax], cagr: [S.amfi, S.sebi],
  rentbuy: [S.rbi, S.tax], homeloan: [S.rbi, S.tax], carloan: [S.rbi], personalloan: [S.rbi, S.tax],
  fd: [S.rbi, S.tax, S.dicgc], inflation: [S.mospi, S.rbi],
  car: [S.ppac], evpetrol: [S.ppac],
  jewellery: [S.bis, S.gst], metalreturn: [S.bis, S.gst, S.tax],
};

/** Sources for the Government savings scheme pages. */
export const SCHEME_SOURCES: Source[] = [S.dea, S.indiapost, S.nsi, S.tax];
