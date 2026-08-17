export type EvalOk = { ok: true; value: number; formatted: string };
export type EvalErr = { ok: false; error: string };
export type EvalResult = EvalOk | EvalErr;

type BinOp = '+' | '-' | '*' | '/' | '^';
type Expr =
  | { kind: 'num'; value: number }
  | { kind: 'unary'; op: '+' | '-'; arg: Expr }
  | { kind: 'percent'; arg: Expr }
  | { kind: 'bin'; op: BinOp; left: Expr; right: Expr };

type Tok =
  | { kind: 'num'; value: number }
  | { kind: 'op'; value: BinOp | '%' }
  | { kind: 'lparen' }
  | { kind: 'rparen' };

class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return 'Error';
  const rounded = Number(value.toPrecision(12));
  if (Object.is(rounded, -0)) return '0';
  const asString = String(rounded);
  if (asString.includes('e')) {
    return rounded.toFixed(10).replace(/\.?0+$/, '');
  }
  return asString;
}

export function groupDigits(raw: string): string {
  if (!raw || raw === 'Error' || /e/i.test(raw)) return raw;
  const neg = raw.startsWith('-');
  const body = neg ? raw.slice(1) : raw;
  const dot = body.indexOf('.');
  const intPart = dot === -1 ? body : body.slice(0, dot);
  const frac = dot === -1 ? undefined : body.slice(dot + 1);
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const withFrac = frac !== undefined ? `${grouped}.${frac}` : grouped;
  return neg ? `-${withFrac}` : withFrac;
}

export function groupExpression(text: string): string {
  return text.replace(/-?\d+(?:\.\d*)?/g, (n) => groupDigits(n));
}

function normalize(source: string): string {
  return source
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/[−–—]/g, '-')
    .replace(/\*\*/g, '^');
}

function tokenize(source: string): Tok[] {
  const tokens: Tok[] = [];
  let i = 0;
  const s = normalize(source);

  while (i < s.length) {
    const ch = s[i];
    if (!ch) break;
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (ch === '(') {
      tokens.push({ kind: 'lparen' });
      i += 1;
      continue;
    }
    if (ch === ')') {
      tokens.push({ kind: 'rparen' });
      i += 1;
      continue;
    }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '^' || ch === '%') {
      tokens.push({ kind: 'op', value: ch });
      i += 1;
      continue;
    }
    if (ch === '.' || (ch >= '0' && ch <= '9')) {
      const start = i;
      let sawDigit = false;
      let sawDot = false;
      while (i < s.length) {
        const next = s[i];
        if (!next) break;
        if (next >= '0' && next <= '9') {
          sawDigit = true;
          i += 1;
          continue;
        }
        if (next === ',' && sawDigit) {
          i += 1;
          continue;
        }
        if (next === '.' && !sawDot) {
          sawDot = true;
          i += 1;
          continue;
        }
        break;
      }
      const raw = s.slice(start, i).replace(/,/g, '');
      if (!sawDigit || raw === '.' || raw === '') {
        throw new ParseError('Invalid number');
      }
      const value = Number(raw);
      if (!Number.isFinite(value)) throw new ParseError('Invalid number');
      tokens.push({ kind: 'num', value });
      continue;
    }
    throw new ParseError(`Unexpected “${ch}”`);
  }

  return tokens;
}

function parseExpr(tokens: Tok[]): Expr {
  let i = 0;

  const peek = () => tokens[i];
  const take = () => tokens[i++];

  const isOp = (tok: Tok | undefined, value: string) =>
    tok?.kind === 'op' && tok.value === value;

  const parsePrimary = (): Expr => {
    const tok = peek();
    if (!tok) throw new ParseError('Unexpected end of expression');
    if (tok.kind === 'num') {
      take();
      return { kind: 'num', value: tok.value };
    }
    if (tok.kind === 'lparen') {
      take();
      const inner = parseAdd();
      if (peek()?.kind !== 'rparen') throw new ParseError('Missing “)”');
      take();
      return inner;
    }
    throw new ParseError('Expected a number or “(”');
  };

  const parsePostfix = (): Expr => {
    let node = parsePrimary();
    while (isOp(peek(), '%')) {
      take();
      node = { kind: 'percent', arg: node };
    }
    return node;
  };

  const parseImplicit = (): Expr => {
    let node = parsePostfix();
    while (true) {
      const next = peek();
      if (!next || (next.kind !== 'num' && next.kind !== 'lparen')) break;
      node = { kind: 'bin', op: '*', left: node, right: parsePostfix() };
    }
    return node;
  };

  const parseUnary = (): Expr => {
    if (isOp(peek(), '+') || isOp(peek(), '-')) {
      const tok = take();
      if (tok?.kind !== 'op' || (tok.value !== '+' && tok.value !== '-')) {
        throw new ParseError('Expected “+” or “−”');
      }
      return { kind: 'unary', op: tok.value, arg: parseUnary() };
    }
    return parseImplicit();
  };

  const parsePower = (): Expr => {
    const left = parseUnary();
    if (!isOp(peek(), '^')) return left;
    take();
    return { kind: 'bin', op: '^', left, right: parsePower() };
  };

  const parseMul = (): Expr => {
    let node = parsePower();
    while (isOp(peek(), '*') || isOp(peek(), '/')) {
      const tok = take();
      if (tok?.kind !== 'op' || (tok.value !== '*' && tok.value !== '/')) break;
      node = { kind: 'bin', op: tok.value, left: node, right: parsePower() };
    }
    return node;
  };

  const parseAdd = (): Expr => {
    let node = parseMul();
    while (isOp(peek(), '+') || isOp(peek(), '-')) {
      const tok = take();
      if (tok?.kind !== 'op' || (tok.value !== '+' && tok.value !== '-')) break;
      node = { kind: 'bin', op: tok.value, left: node, right: parseMul() };
    }
    return node;
  };

  if (tokens.length === 0) throw new ParseError('Enter an expression');
  const ast = parseAdd();
  if (i < tokens.length) throw new ParseError('Unexpected extra characters');
  return ast;
}

function evalExpr(node: Expr): number {
  switch (node.kind) {
    case 'num':
      return node.value;
    case 'unary': {
      const value = evalExpr(node.arg);
      return node.op === '-' ? -value : value;
    }
    case 'percent':
      return evalExpr(node.arg) / 100;
    case 'bin': {
      const left = evalExpr(node.left);
      const right = evalExpr(node.right);
      switch (node.op) {
        case '+':
          return left + right;
        case '-':
          return left - right;
        case '*':
          return left * right;
        case '/':
          if (right === 0) throw new ParseError('Cannot divide by zero');
          return left / right;
        case '^':
          return left ** right;
      }
    }
  }
}

export function evaluateExpression(source: string): EvalResult {
  const trimmed = source.trim();
  if (!trimmed) return { ok: false, error: 'Enter an expression' };
  try {
    const ast = parseExpr(tokenize(trimmed));
    const value = evalExpr(ast);
    if (!Number.isFinite(value)) return { ok: false, error: 'Result is not a finite number' };
    const raw = formatNumber(value);
    if (raw === 'Error') return { ok: false, error: 'Result is not a finite number' };
    return { ok: true, value, formatted: groupDigits(raw) };
  } catch (error) {
    const message = error instanceof ParseError ? error.message : 'Invalid expression';
    return { ok: false, error: message };
  }
}
