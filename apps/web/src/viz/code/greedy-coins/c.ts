export default `int greedy_coins(int *coins, int n, int amount) {
    sort_desc(coins, n);                  // @anchor INIT
    int remaining = amount, used = 0;
    for (int i = 0; i < n; i++) {
        if (coins[i] > remaining) continue;   // @anchor SKIP
        while (coins[i] <= remaining) {       // @anchor CONSIDER
            remaining -= coins[i];            // @anchor TAKE
            used++;
        }
    }
    return remaining == 0 ? used : -1;    // @anchor DONE
}`;
