export default `def factorial(n):                     # @anchor INIT
    if n <= 1:
        return 1                      # @anchor BASE
    smaller = factorial(n - 1)        # @anchor CALL
    result = n * smaller              # @anchor RETURN
    return result                     # @anchor DONE`;
