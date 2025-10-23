const defaultWeights = {
  eqeqeq: 1,
  var: 1,
  console: 1,
  tsIgnore: 2,
  any: 2,
  emptyDeps: 2,
};

const skillIssue = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Humorous meta-rule that scores a file for common rookie mistakes (‘skill issue’ meter).',
      recommended: false,
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          weights: {
            type: 'object',
            additionalProperties: { type: 'number' },
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      eqeqeq: 'Skill issue: use {{better}} instead of {{bad}}.',
      var: "Skill issue: avoid 'var'; use 'let' or 'const'.",
      console: 'Skill issue: stray console. Consider removing or gating with env.',
      tsIgnore: "Skill issue: '@ts-ignore' found. Prefer proper typing.",
      any: "Skill issue: 'any' type detected. Be explicit.",
      emptyDeps: 'Skill issue: useEffect has empty deps []. Are you sure? Add deps or justify.',
      aggregate: 'Skill issue score: {{score}} — {{rank}} {{emoji}}',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    const opts = context.options?.[0] ?? {};
    const weights = { ...defaultWeights, ...(opts.weights ?? {}) };

    let total = 0;
    let offRanges = []; // [{start, end}]

    function buildOffRanges() {
      const comments = sourceCode.getAllComments().sort((a, b) => a.range[0] - b.range[0]);
      let open = null;
      for (const c of comments) {
        const txt = c.value;
        if (/skill-issue:\s*off/i.test(txt)) {
          open = c.range[1]; // start after this comment
        } else if (/skill-issue:\s*on/i.test(txt)) {
          if (open != null) {
            offRanges.push({ start: open, end: c.range[0] });
            open = null;
          }
        }
      }
      if (open != null) {
        offRanges.push({ start: open, end: Infinity });
      }
    }

    function inOffRange(node) {
      const pos = node.range?.[0] ?? 0;
      return offRanges.some((r) => pos >= r.start && pos < r.end);
    }

    function hasNextLineIgnore(node) {
      const before = sourceCode.getCommentsBefore(node);
      if (!before.length) return false;
      const prev = before[before.length - 1];
      const prevLine = prev.loc?.end?.line;
      const nodeLine = node.loc?.start?.line;
      if (prevLine != null && nodeLine != null && prevLine === nodeLine - 1) {
        return /skill-issue-ignore-next-line/i.test(prev.value);
      }
      return false;
    }

    function isIgnored(node) {
      return hasNextLineIgnore(node) || inOffRange(node);
    }

    function bump(node, key, report) {
      if (isIgnored(node)) return;
      total += weights[key] ?? 1;
      context.report(report);
    }

    function fixOperatorToStrict(node, better) {
      // Replace only the operator token between left and right
      const opToken = sourceCode.getTokenAfter(node.left, (t) => t.value === node.operator);
      if (!opToken) return null;
      return (fixer) => fixer.replaceText(opToken, better);
    }

    // == / !=
    function onBinaryExpression(node) {
      if (node.operator === '==' || node.operator === '!=') {
        const better = node.operator === '==' ? '===' : '!==';
        bump(node, 'eqeqeq', {
          node,
          messageId: 'eqeqeq',
          data: { bad: node.operator, better },
          fix: fixOperatorToStrict(node, better),
        });
      }
    }

    // var -> let
    function onVariableDeclaration(node) {
      if (node.kind === 'var') {
        const first = sourceCode.getFirstToken(node);
        bump(node, 'var', {
          node,
          messageId: 'var',
          fix: (fixer) => (first ? fixer.replaceText(first, 'let') : null),
        });
      }
    }

    // console.log/debug and useEffect empty deps
    function onCallExpression(node) {
      // console.log/debug
      if (
        node.callee?.type === 'MemberExpression' &&
        node.callee.object?.type === 'Identifier' &&
        node.callee.object.name === 'console' &&
        node.callee.property?.type === 'Identifier' &&
        /^(log|debug)$/.test(node.callee.property.name)
      ) {
        bump(node, 'console', { node, messageId: 'console' });
      }

      // useEffect(..., [])
      const isUseEffect =
        (node.callee?.type === 'Identifier' && node.callee.name === 'useEffect') ||
        (node.callee?.type === 'MemberExpression' &&
          node.callee.property?.type === 'Identifier' &&
          node.callee.property.name === 'useEffect');

      if (isUseEffect && node.arguments?.length >= 2) {
        const deps = node.arguments[1];
        if (deps && deps.type === 'ArrayExpression' && deps.elements.length === 0) {
          bump(node, 'emptyDeps', { node, messageId: 'emptyDeps' });
        }
      }
    }

    // Count @ts-ignore comments
    function countTsIgnoreComments() {
      for (const c of sourceCode.getAllComments()) {
        if (/@ts-ignore/i.test(c.value)) {
          if (!isIgnored(c)) {
            total += weights.tsIgnore ?? 1;
            context.report({ node: c, messageId: 'tsIgnore' });
          }
        }
      }
    }

    // TS any keyword (only if using @typescript-eslint/parser)
    function onTSAnyKeyword(node) {
      bump(node, 'any', { node, messageId: 'any' });
    }

    return {
      Program() {
        total = 0;
        offRanges = [];
        buildOffRanges();
      },

      BinaryExpression: onBinaryExpression,
      VariableDeclaration: onVariableDeclaration,
      CallExpression: onCallExpression,

      // TypeScript “any” nodes (parser must be @typescript-eslint/parser)
      TSAnyKeyword: onTSAnyKeyword,

      'Program:exit'(node) {
        // Scan @ts-ignore after traversal so we have offRanges ready
        countTsIgnoreComments();

        if (total > 0) {
          let rank = 'Bronze Rookie';
          let emoji = '🥉';
          if (total >= 5 && total <= 8) {
            rank = 'Silver Rookie';
            emoji = '🥈';
          }
          if (total > 8) {
            rank = 'Gold Rookie';
            emoji = '🥇';
          }
          context.report({
            node,
            loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 1 } },
            messageId: 'aggregate',
            data: { score: String(total), rank, emoji },
          });
        }
      },
    };
  },
};

export const plugin = { rules: { 'skill-issue': skillIssue } };
