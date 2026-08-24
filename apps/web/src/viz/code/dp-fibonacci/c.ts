export default `int fib(int n, int *dp) {             // @anchor INIT
    dp[0] = 0;                        // @anchor BASE
    if (n >= 1) dp[1] = 1;
    for (int i = 2; i <= n; i++) {
        int a = dp[i - 1];
        int b = dp[i - 2];            // @anchor READ
        dp[i] = a + b;                // @anchor FILL
    }
    return dp[n];                     // @anchor DONE
}`;
