export default `function runStack(ops) {
  const stack = [];                     // @anchor INIT
  for (const op of ops) {
    if (op !== null) {
      stack.push(op);                   // @anchor PUSH
    } else if (stack.length === 0) {
      continue;                         // @anchor EMPTY
    } else {
      stack.pop();                      // @anchor POP
    }
  }
  return stack;                         // @anchor DONE
}`;
