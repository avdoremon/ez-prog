export default `function greedyCoins(coins, amount) {
  const sorted = [...coins].sort((a, b) => b - a);  // @anchor INIT
  let remaining = amount, used = 0;
  for (const coin of sorted) {
    if (coin > remaining) continue;      // @anchor SKIP
    while (coin <= remaining) {          // @anchor CONSIDER
      remaining -= coin;                 // @anchor TAKE
      used++;
    }
  }
  return remaining === 0 ? used : null;  // @anchor DONE
}`;
