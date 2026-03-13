export interface DuelRound {
  expressionA: string;
  expressionB: string;
  isEquivalent: boolean;
  rule: string;
}

interface ExpressionTemplate {
  formA: string;
  formB: string;
  rule: string;
  evalA: (a: boolean, b: boolean) => boolean;
  evalB: (a: boolean, b: boolean) => boolean;
}

const EASY_TEMPLATES: ExpressionTemplate[] = [
  {
    formA: "NOT(A AND B)",
    formB: "NOT A OR NOT B",
    rule: "De Morgan's Law",
    evalA: (a, b) => !(a && b),
    evalB: (a, b) => !a || !b,
  },
  {
    formA: "NOT(A OR B)",
    formB: "NOT A AND NOT B",
    rule: "De Morgan's Law",
    evalA: (a, b) => !(a || b),
    evalB: (a, b) => !a && !b,
  },
  {
    formA: "NOT(NOT A)",
    formB: "A",
    rule: "Double Negation",
    evalA: (a) => !!a,
    evalB: (a) => a,
  },
  {
    formA: "A AND TRUE",
    formB: "A",
    rule: "Identity Law",
    evalA: (a) => a && true,
    evalB: (a) => a,
  },
  {
    formA: "A OR FALSE",
    formB: "A",
    rule: "Identity Law",
    evalA: (a) => a || false,
    evalB: (a) => a,
  },
];

const MEDIUM_TEMPLATES: ExpressionTemplate[] = [
  {
    formA: "A AND (B OR A)",
    formB: "A",
    rule: "Absorption Law",
    evalA: (a, b) => a && (b || a),
    evalB: (a) => a,
  },
  {
    formA: "A OR (B AND A)",
    formB: "A",
    rule: "Absorption Law",
    evalA: (a, b) => a || (b && a),
    evalB: (a) => a,
  },
  {
    formA: "A AND (A OR B)",
    formB: "A",
    rule: "Absorption Law",
    evalA: (a, b) => a && (a || b),
    evalB: (a) => a,
  },
  {
    formA: "A OR NOT A",
    formB: "TRUE",
    rule: "Complement Law",
    evalA: (a) => a || !a,
    evalB: () => true,
  },
  {
    formA: "A AND NOT A",
    formB: "FALSE",
    rule: "Complement Law",
    evalA: (a) => a && !a,
    evalB: () => false,
  },
  {
    formA: "A AND (B OR C)",
    formB: "(A AND B) OR (A AND C)",
    rule: "Distribution Law",
    evalA: (a, b) => a && (b || !a), // using C = NOT A for 2-var
    evalB: (a, b) => (a && b) || (a && !a),
  },
];

const HARD_TEMPLATES: ExpressionTemplate[] = [
  {
    formA: "NOT(A AND B) OR B",
    formB: "NOT A OR B",
    rule: "De Morgan's + Simplification",
    evalA: (a, b) => !(a && b) || b,
    evalB: (a, b) => !a || b,
  },
  {
    formA: "NOT(NOT A AND NOT B)",
    formB: "A OR B",
    rule: "De Morgan's Law (double)",
    evalA: (a, b) => !(!a && !b),
    evalB: (a, b) => a || b,
  },
  {
    formA: "NOT(NOT A OR NOT B)",
    formB: "A AND B",
    rule: "De Morgan's Law (double)",
    evalA: (a, b) => !(!a || !b),
    evalB: (a, b) => a && b,
  },
  {
    formA: "(A OR B) AND (A OR NOT B)",
    formB: "A",
    rule: "Consensus + Complement",
    evalA: (a, b) => (a || b) && (a || !b),
    evalB: (a) => a,
  },
  {
    formA: "A XOR B",
    formB: "(A OR B) AND NOT(A AND B)",
    rule: "XOR Definition",
    evalA: (a, b) => (a && !b) || (!a && b),
    evalB: (a, b) => (a || b) && !(a && b),
  },
];

function areEquivalent(
  evalA: (a: boolean, b: boolean) => boolean,
  evalB: (a: boolean, b: boolean) => boolean,
): boolean {
  const vals = [false, true];
  for (const a of vals) {
    for (const b of vals) {
      if (evalA(a, b) !== evalB(a, b)) return false;
    }
  }
  return true;
}

function getTemplatePool(score: number, offset: number): ExpressionTemplate[] {
  const adjusted = score + offset;
  if (adjusted < 4) return EASY_TEMPLATES;
  if (adjusted < 8) return [...EASY_TEMPLATES, ...MEDIUM_TEMPLATES];
  return [...EASY_TEMPLATES, ...MEDIUM_TEMPLATES, ...HARD_TEMPLATES];
}

export function generateDuelRound(score: number, offset: number): DuelRound {
  const pool = getTemplatePool(score, offset);

  // 60% chance equivalent, 40% not equivalent
  const makeEquivalent = Math.random() < 0.6;

  if (makeEquivalent) {
    const template = pool[Math.floor(Math.random() * pool.length)];
    // Randomly swap which is shown as A vs B
    if (Math.random() < 0.5) {
      return {
        expressionA: template.formA,
        expressionB: template.formB,
        isEquivalent: true,
        rule: template.rule,
      };
    }
    return {
      expressionA: template.formB,
      expressionB: template.formA,
      isEquivalent: true,
      rule: template.rule,
    };
  } else {
    // Pick two different templates and cross their forms
    const idxA = Math.floor(Math.random() * pool.length);
    let idxB = Math.floor(Math.random() * pool.length);
    // Make sure we pick different templates
    if (pool.length > 1) {
      while (idxB === idxA) idxB = Math.floor(Math.random() * pool.length);
    }

    const tA = pool[idxA];
    const tB = pool[idxB];

    // Take formA from one and formB from another
    const equivalent = areEquivalent(tA.evalA, tB.evalB);

    if (!equivalent) {
      return {
        expressionA: tA.formA,
        expressionB: tB.formB,
        isEquivalent: false,
        rule: "These expressions are not equivalent",
      };
    }

    // If they happen to be equivalent, try the reverse
    const equivalentReverse = areEquivalent(tA.evalB, tB.evalA);
    if (!equivalentReverse) {
      return {
        expressionA: tA.formB,
        expressionB: tB.formA,
        isEquivalent: false,
        rule: "These expressions are not equivalent",
      };
    }

    // Fallback: use same template but change one operand
    return {
      expressionA: tA.formA,
      expressionB: tA.formA.includes("OR")
        ? tA.formA.replace("OR", "AND")
        : tA.formA.replace("AND", "OR"),
      isEquivalent: false,
      rule: "These expressions are not equivalent",
    };
  }
}
