/**
 * Deterministic, safe mathematical expression evaluator.
 * Does not use eval() or new Function(), complying with strict CSP environments.
 * Supports +, -, *, /, parentheses, unary minus/plus, and operator precedence.
 */
export function safeEvaluateMath(expr: string): number {
  const tokens: string[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if ("+-*/()".includes(ch)) {
      tokens.push(ch);
      i++;
    } else if (/[0-9.]/.test(ch)) {
      let numStr = "";
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        numStr += expr[i];
        i++;
      }
      tokens.push(numStr);
    } else {
      i++;
    }
  }

  let tokenIdx = 0;
  const peek = () => tokens[tokenIdx];
  const consume = () => tokens[tokenIdx++];

  function parseExpression(): number {
    let result = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const op = consume();
      const right = parseTerm();
      result = op === "+" ? result + right : result - right;
    }
    return result;
  }

  function parseTerm(): number {
    let result = parseFactor();
    while (peek() === "*" || peek() === "/") {
      const op = consume();
      const right = parseFactor();
      result = op === "*" ? result * right : (right !== 0 ? result / right : 0);
    }
    return result;
  }

  function parseFactor(): number {
    if (peek() === "-") {
      consume();
      return -parseFactor();
    }
    if (peek() === "+") {
      consume();
      return parseFactor();
    }
    if (peek() === "(") {
      consume();
      const val = parseExpression();
      if (peek() === ")") consume();
      return val;
    }
    const token = consume();
    const val = parseFloat(token);
    return isNaN(val) ? 0 : val;
  }

  const res = parseExpression();
  return isFinite(res) ? res : 0;
}
