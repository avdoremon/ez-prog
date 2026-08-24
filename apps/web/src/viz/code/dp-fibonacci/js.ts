export default `function fib(n) {                       // @anchor INIT
  const dp = new Array(n + 1);
  dp[0] = 0;                             // @anchor BASE
  if (n >= 1) dp[1] = 1;
  for (let i = 2; i <= n; i++) {
    const a = dp[i - 1];
    const b = dp[i - 2];                 // @anchor READ
    dp[i] = a + b;                       // @anchor FILL
  }
  return dp[n];                          // @anchor DONE
}`;
