export default `int factorial(int n) {                // @anchor INIT
    if (n <= 1) {
        return 1;                     // @anchor BASE
    }
    int smaller = factorial(n - 1);   // @anchor CALL
    int result = n * smaller;         // @anchor RETURN
    return result;                    // @anchor DONE
}`;
