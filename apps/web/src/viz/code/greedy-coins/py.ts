export default `def greedy_coins(coins, amount):
    ordered = sorted(coins, reverse=True)   # @anchor INIT
    remaining, used = amount, 0
    for coin in ordered:
        if coin > remaining:
            continue                        # @anchor SKIP
        while coin <= remaining:            # @anchor CONSIDER
            remaining -= coin               # @anchor TAKE
            used += 1
    return used if remaining == 0 else None # @anchor DONE`;
