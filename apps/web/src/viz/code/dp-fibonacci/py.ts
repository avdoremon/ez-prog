export default `def fib(n):                            # @anchor INIT
    dp = [None] * (n + 1)
    dp[0] = 0                          # @anchor BASE
    if n >= 1:
        dp[1] = 1
    for i in range(2, n + 1):
        a = dp[i - 1]
        b = dp[i - 2]                  # @anchor READ
        dp[i] = a + b                  # @anchor FILL
    return dp[n]                       # @anchor DONE`;
