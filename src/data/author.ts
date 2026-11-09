/**
 * Who writes and reviews the site, and when the calculators were last reviewed. Shown in bylines,
 * on the author page and in the JSON-LD. Update REVIEWED_ON when the calculators and scheme pages are
 * re-checked (tests, formulas, rates and rules), not on every build.
 */
export const AUTHOR = {
  name: 'Asish',
  org: 'JGRF Software',
  path: '/author/asish/',
  pathHi: '/hi/author/asish/',
  bio: [
    'Asish works at JGRF Software and builds Mutual Fund Compare. Asish has a long-standing interest in fintech and personal finance, and believes financial data should be available to everyone: free, without sign-ups, and explained in plain language that anyone can follow.',
    'Asish writes and reviews the calculators, scheme pages and guides on this site. Every formula is shown on its page and checked by automated tests against published figures, and every interest rate, limit and tax rule is taken from an official source such as the Ministry of Finance, India Post, RBI, SEBI, AMFI or the Income Tax Department. When a rule changes or a mistake is reported, the page is corrected and its review date updated.',
    'Asish is not a SEBI-registered investment adviser, and nothing on this site is advice for your situation. The aim is to help you understand the numbers well enough to make your own decisions, or to ask a registered adviser better questions.',
  ],
  bioHi: [
    'आशीष JGRF Software में काम करते हैं और Mutual Fund Compare बनाते हैं। फिनटेक और निजी वित्त में उनकी लंबे समय से रुचि है, और उनका मानना है कि वित्तीय जानकारी हर किसी को मिलनी चाहिए: मुफ़्त, बिना साइन-अप के, और ऐसी सरल भाषा में जिसे कोई भी समझ सके।',
    'इस साइट के कैलकुलेटर, योजनाओं के पेज और गाइड आशीष लिखते और जाँचते हैं। हर फ़ॉर्मूला उसके पेज पर दिखाया गया है और प्रकाशित आँकड़ों से स्वचालित टेस्ट द्वारा जाँचा जाता है, और हर ब्याज दर, सीमा और टैक्स नियम किसी आधिकारिक स्रोत से लिया जाता है, जैसे वित्त मंत्रालय, इंडिया पोस्ट, RBI, SEBI, AMFI या आयकर विभाग। जब कोई नियम बदलता है या कोई ग़लती बताई जाती है, तो पेज ठीक किया जाता है और उसकी समीक्षा की तारीख़ बदली जाती है।',
    'आशीष SEBI-पंजीकृत निवेश सलाहकार नहीं हैं, और इस साइट पर कुछ भी आपकी स्थिति के लिए सलाह नहीं है। मक़सद यह है कि आप आँकड़ों को इतना समझ सकें कि अपने फ़ैसले ख़ुद ले सकें, या किसी पंजीकृत सलाहकार से बेहतर सवाल पूछ सकें।',
  ],
  knowsAbout: ['Personal finance', 'Mutual funds', 'Government savings schemes', 'Fintech'],
} as const;

/** Date the calculators and Government scheme pages were last reviewed (ISO). */
export const REVIEWED_ON = '2026-11-09';
