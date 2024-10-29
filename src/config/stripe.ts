export const PLANS = [
  {
    name: "Free",
    slug: "free",
    price: {
      amount: 0,
      priceIds: {
        test: "",
        production: "",
      },
    },
  },
  {
    name: "PRO",
    slug: "pro",
    price: {
      amount: 15,
      priceIds: {
        test: "price_1P6zozJ9brh1H24bB3u3sCYH",
        production: "price_1P6zhBJ9brh1H24b7qPzVzbJ",
      },
    },
  },
];

export const CREDIT_AMOUNTS = {
  PACK_SIZE: 25,
  PACK_PRICE: 5,
} as const;

export const CREDIT_PACK_PRICES = {
  test: "price_1QF0zaJ9brh1H24beY3bFkJ2",
  production: "price_1QF0zaJ9brh1H24beY3bFkJ2",
} as const;

export const getPriceId = (type: "creditPack" | "subscription") => {
  const isProduction = process.env.NODE_ENV === "production";

  if (type === "creditPack") {
    return isProduction
      ? CREDIT_PACK_PRICES.production
      : CREDIT_PACK_PRICES.test;
  }

  return isProduction
    ? PLANS[0]?.price.priceIds.production
    : PLANS[0]?.price.priceIds.test;
};
