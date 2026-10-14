/**
 * Gold and silver calculators. Pure functions: no DOM, no network, and no price feed. The price per
 * gram is always entered by the user, because it changes through the day and differs by city.
 *
 * Conventions (also shown on the calculator pages):
 * - The price you enter is for 24 carat gold (99.9% pure) or 999 fine silver. Other purities are priced
 *   in proportion: 22 carat is 22 ÷ 24 of the 24 carat price, 925 silver is 925 ÷ 999 of the 999 price.
 * - Jewellery price = metal value + making charges, then GST on the total. Making charges are either a
 *   percentage of the metal value or a rupee amount per gram.
 * - "Value if you sell back" is the metal value at the same rate, less any deduction the jeweller takes.
 *   Making charges and GST are not recovered.
 * - Return calculator: costs on buying and selling are percentages; the holding cost (locker, fund
 *   expenses) is a yearly percentage of the buying price, summed over the years.
 */

export type Metal = 'gold' | 'silver';

/** Purity options as a fraction of the price the user enters. */
export const PURITIES: Record<Metal, { label: string; fraction: number }[]> = {
  gold: [
    { label: '24 carat', fraction: 1 },
    { label: '22 carat', fraction: 22 / 24 },
    { label: '18 carat', fraction: 18 / 24 },
    { label: '14 carat', fraction: 14 / 24 },
  ],
  silver: [
    { label: '999 (fine)', fraction: 1 },
    { label: '925 (sterling)', fraction: 925 / 999 },
    { label: '800', fraction: 800 / 999 },
  ],
};

export interface JewelleryInput {
  /** Price per gram of 24 carat gold or 999 silver. */
  ratePerGram: number;
  weightGrams: number;
  /** Purity as a fraction of the entered rate (see PURITIES). */
  purity: number;
  makingType: 'percent' | 'perGram';
  /** A fraction of the metal value (0.12 = 12%) or rupees per gram, depending on `makingType`. */
  making: number;
  /** GST as a fraction of metal value plus making (0.03 = 3%). */
  gst: number;
  /** Fraction of the metal value a jeweller deducts when buying back (0.05 = 5%). */
  buybackDeduction: number;
}

export interface JewelleryPrice {
  metalValue: number;
  makingCharges: number;
  gst: number;
  total: number;
  /** What the same metal is worth at the entered rate, after the buy-back deduction. */
  sellBackValue: number;
  /** `total - sellBackValue`. */
  lostOnSelling: number;
  /** How much the price per gram must rise, as a fraction, for selling back to return the total paid. */
  breakEvenRise: number | null;
  /** Price paid above the metal value, as a fraction of the metal value. */
  premium: number | null;
}

/**
 * Price of a piece of gold or silver jewellery and what selling it back would return.
 *
 * @param p - Rate, weight, purity, making charges, GST and buy-back deduction.
 * @returns The amounts, and how much of the price is not recovered on selling.
 */
export function jewelleryPrice(p: JewelleryInput): JewelleryPrice {
  const metalValue = p.ratePerGram * p.weightGrams * p.purity;
  const makingCharges = p.makingType === 'percent' ? metalValue * p.making : p.making * p.weightGrams;
  const subtotal = metalValue + makingCharges;
  const gst = subtotal * p.gst;
  const total = subtotal + gst;
  const sellBackValue = metalValue * (1 - p.buybackDeduction);
  return {
    metalValue,
    makingCharges,
    gst,
    total,
    sellBackValue,
    lostOnSelling: total - sellBackValue,
    breakEvenRise: sellBackValue > 0 ? total / sellBackValue - 1 : null,
    premium: metalValue > 0 ? total / metalValue - 1 : null,
  };
}

export interface MetalReturnInput {
  /** Rupees to invest. */
  amount: number;
  /** Price per gram when buying. */
  buyPrice: number;
  /** Price per gram when selling. */
  sellPrice: number;
  years: number;
  /** Costs on buying as a fraction (making charges, GST, brokerage). */
  buyCost: number;
  /** Costs on selling as a fraction (buy-back deduction, brokerage). */
  sellCost: number;
  /** Yearly holding cost as a fraction of the buying price (locker, fund expenses). */
  holdingCostPerYear: number;
}

export interface MetalReturn {
  /** Grams bought after the buying cost. */
  grams: number;
  /** Sale proceeds after the selling cost. */
  proceeds: number;
  /** Total holding cost over the years. */
  holdingCost: number;
  /** Money in hand at the end: proceeds minus holding costs. */
  finalValue: number;
  /** `finalValue - amount`. */
  gain: number;
  /** Yearly return of the price alone, before any costs. */
  priceCagr: number | null;
  /** Yearly return you actually earn after all costs; null if the money is gone. */
  netCagr: number | null;
  /** Price per gram needed at the end to just get your money back. */
  breakEvenPrice: number | null;
}

/**
 * Return on buying and later selling gold or silver, after all costs.
 *
 * @param p - Amount, prices per gram, years and cost percentages.
 * @returns Grams bought, final value, yearly return and the break-even price.
 */
export function metalReturn(p: MetalReturnInput): MetalReturn {
  const grams = p.buyPrice > 0 ? (p.amount * (1 - p.buyCost)) / p.buyPrice : 0;
  const proceeds = grams * p.sellPrice * (1 - p.sellCost);
  const holdingCost = p.amount * (1 - p.buyCost) * p.holdingCostPerYear * p.years;
  const finalValue = proceeds - holdingCost;
  const cagr = (end: number, start: number): number | null => (start > 0 && end > 0 && p.years > 0 ? (end / start) ** (1 / p.years) - 1 : null);
  const denominator = grams * (1 - p.sellCost);
  return {
    grams,
    proceeds,
    holdingCost,
    finalValue,
    gain: finalValue - p.amount,
    priceCagr: cagr(p.sellPrice, p.buyPrice),
    netCagr: cagr(finalValue, p.amount),
    breakEvenPrice: denominator > 0 ? (p.amount + holdingCost) / denominator : null,
  };
}
