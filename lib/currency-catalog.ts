export const currencyCodes=["THB","USD","UAH","EUR","GBP","RUB","CNY","JPY","KRW","SGD","MYR","AUD","CAD","CHF","INR","VND","IDR","HKD"] as const;export type Currency=typeof currencyCodes[number];
