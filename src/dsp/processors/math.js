export function compileMathExpr(exprStr) {
    if (!exprStr || typeof exprStr !== 'string') return (a) => a;
    const trimmed = exprStr.trim();

    // 1. Fast path for legacy modes and common presets
    switch (trimmed.toUpperCase()) {
        case '-': case 'RAW': case 'THRU': case 'A': return (a) => a;
        case 'B': return (a, b) => b;
        case 'C': return (a, b, c) => c;
        case 'ADD': case 'A + B': case 'A+B': return (a, b) => a + b;
        case 'MULTI': case 'A * B': case 'A*B': return (a, b) => a * b;
        case 'DIFF': case 'A - B': case 'A-B': return (a, b) => a - b;
        case 'A * B + C': case 'A*B+C': return (a, b, c) => a * b + c;
        case 'MOD': case 'A % B': case 'A%B': return (a, b) => (b !== 0 ? (a - b * Math.floor(a / b)) : 0);
        case 'A^B': case 'A ^ B': return (a, b) => (a < 0 ? -Math.pow(Math.abs(a), b) : Math.pow(a, b));
        case 'ABS': case 'ABS(A)': return (a) => Math.abs(a);
        case 'FLOOR': case 'FLOOR(A)': return (a) => Math.floor(a);
        case 'CEIL': case 'CEIL(A)': return (a) => Math.ceil(a);
        case 'ROUND': case 'ROUND(A)': return (a) => Math.round(a);
        case 'INT': case 'INT(A)': return (a) => Math.trunc(a);
        case 'MIN': case 'MIN(A, B)': case 'MIN(A,B)': return (a, b) => Math.min(a, b);
        case 'MAX': case 'MAX(A, B)': case 'MAX(A,B)': return (a, b) => Math.max(a, b);
        case '<': case 'A < B': return (a, b) => (a < b ? 1.0 : 0.0);
        case '<=': case 'A <= B': return (a, b) => (a <= b ? 1.0 : 0.0);
        case '==': case 'A == B': return (a, b) => (Math.abs(a - b) < 1e-4 ? 1.0 : 0.0);
        case '>=': case 'A >= B': return (a, b) => (a >= b ? 1.0 : 0.0);
        case '>': case 'A > B': return (a, b) => (a > b ? 1.0 : 0.0);
    }

    // 2. Transform arbitrary expression
    let s = trimmed;
    s = s.replace(/\bclamp\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)/gi, 'Math.min(Math.max($1, $2), $3)');
    s = s.replace(/\babs\b/gi, 'Math.abs');
    s = s.replace(/\bfloor\b/gi, 'Math.floor');
    s = s.replace(/\bceil\b/gi, 'Math.ceil');
    s = s.replace(/\bround\b/gi, 'Math.round');
    s = s.replace(/\bint\b/gi, 'Math.trunc');
    s = s.replace(/\bmin\b/gi, 'Math.min');
    s = s.replace(/\bmax\b/gi, 'Math.max');
    s = s.replace(/\^/g, '**');
    s = s.replace(/\bA\b/g, 'a').replace(/\bB\b/g, 'b').replace(/\bC\b/g, 'c');

    // Handle comparison operators e.g. a > b -> ((a > b) ? 1.0 : 0.0)
    if (/^[a-zA-Z0-9_\s\.\(\)\+\-\*\/]+(==|>=|<=|>|<)[a-zA-Z0-9_\s\.\(\)\+\-\*\/]+$/.test(trimmed)) {
        s = `( (${s}) ? 1.0 : 0.0 )`;
    }

    try {
        const fn = new Function('a', 'b', 'c', 'Math', `
            try {
                let v = ${s};
                return isNaN(v) || !isFinite(v) ? 0 : Number(v);
            } catch(e) { return a; }
        `);
        fn(0, 0, 0, Math);
        return fn;
    } catch (e) {
        return (a) => a;
    }
}

export class MathProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.expr = 'A';
        this.valA = 0.0;
        this.valB = 1.0;
        this.valC = 0.0;
        this.hasA = false;
        this.hasB = false;
        this.hasC = false;
        this.fn = compileMathExpr('A');

        this.port.onmessage = (e) => {
            if (e.data.type === 'SET_PARAMS') {
                const expr = e.data.expr || e.data.mode;
                if (expr !== undefined && expr !== this.expr) {
                    this.expr = expr;
                    this.fn = compileMathExpr(this.expr);
                }
                if (e.data.valA !== undefined) this.valA = e.data.valA;
                if (e.data.valB !== undefined) this.valB = e.data.valB;
                if (e.data.valC !== undefined) this.valC = e.data.valC;
                if (e.data.hasA !== undefined) this.hasA = e.data.hasA;
                if (e.data.hasB !== undefined) this.hasB = e.data.hasB;
                if (e.data.hasC !== undefined) this.hasC = e.data.hasC;
            }
        };
    }

    process(ins, outs) {
        const out = outs[0]?.[0];
        if (!out) return true;
        const inA = ins[0]?.[0], inB = ins[1]?.[0], inC = ins[2]?.[0];
        const defA = this.valA, defB = this.valB, defC = this.valC;
        const hasA = this.hasA && inA, hasB = this.hasB && inB, hasC = this.hasC && inC;
        const fn = this.fn;

        for (let i = 0; i < out.length; i++) {
            const a = hasA ? inA[i] : defA;
            const b = hasB ? inB[i] : defB;
            const c = hasC ? inC[i] : defC;
            const v = fn(a, b, c, Math);
            out[i] = isNaN(v) || !isFinite(v) ? 0 : v;
        }
        return true;
    }
}

registerProcessor('math-processor', MathProcessor);

