export default `function maxWindowSum(arr, k) {
  let sum = 0;                              // @anchor INIT
  for (let i = 0; i < k; i++) sum += arr[i];  // @anchor ADD
  let best = sum, bestStart = 0;
  for (let i = k; i < arr.length; i++) {
    sum += arr[i] - arr[i - k];             // @anchor SLIDE
    if (sum > best) {                       // @anchor BEST
      best = sum;
      bestStart = i - k + 1;
    }
  }
  return { best, bestStart };               // @anchor DONE
}`;
