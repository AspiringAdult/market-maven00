import { useState, useEffect } from "react";

export function useLivePrices(symbols = []) {

  const [prices, setPrices] = useState({});

  useEffect(() => {

    if (!symbols?.length) return;

    const fakePrices = {};

    symbols.forEach(sym => {
      fakePrices[sym] = {
        price: 0,
        change: 0
      };
    });

    setPrices(fakePrices);

  }, [symbols.join(",")]);  
  return { prices };

}