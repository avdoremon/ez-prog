export default `function factorial(n) {                // @anchor INIT
  if (n <= 1) {
    return 1;                            // @anchor BASE
  }
  const smaller = factorial(n - 1);      // @anchor CALL
  const result = n * smaller;            // @anchor RETURN
  return result;                         // @anchor DONE
}`;
