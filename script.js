(() => {
  const expressionEl = document.getElementById('expression');
  const resultEl = document.getElementById('result');

  let expression = '';
  let lastResult = null;
  let justEvaluated = false;

  function updateDisplay() {
    expressionEl.textContent = formatExpression(expression);
    if (expression === '') {
      resultEl.textContent = lastResult !== null ? formatNumber(lastResult) : '0';
      resultEl.classList.remove('error');
    }
  }

  function formatExpression(expr) {
    return expr
      .replace(/\*/g, '\u00D7')
      .replace(/\//g, '\u00F7')
      .replace(/-/g, '\u2212')
      .replace(/Math\.sin\(/g, 'sin(')
      .replace(/Math\.cos\(/g, 'cos(')
      .replace(/Math\.tan\(/g, 'tan(')
      .replace(/Math\.log10\(/g, 'log(')
      .replace(/Math\.log\(/g, 'ln(')
      .replace(/Math\.sqrt\(/g, '\u221A(')
      .replace(/Math\.PI/g, '\u03C0')
      .replace(/Math\.E/g, 'e')
      .replace(/Math\.pow\(/g, 'pow(')
      .replace(/\*\*/g, '^');
  }

  function formatNumber(num) {
    if (typeof num !== 'number' || !isFinite(num)) return 'Error';
    if (Number.isInteger(num) && Math.abs(num) < 1e15) return num.toLocaleString();
    const str = num.toPrecision(10);
    const clean = parseFloat(str);
    if (Math.abs(clean) >= 1e10 || (Math.abs(clean) < 1e-6 && clean !== 0)) {
      return clean.toExponential(6);
    }
    return clean.toLocaleString(undefined, { maximumFractionDigits: 10 });
  }

  function countChar(str, ch) {
    let count = 0;
    for (const c of str) if (c === ch) count++;
    return count;
  }

  function getLastNumber(expr) {
    const match = expr.match(/(\d+\.?\d*|Math\.\w+)$/);
    return match ? match[0] : null;
  }

  function isOperator(ch) {
    return ['+', '-', '*', '/'].includes(ch);
  }

  function handleAction(action) {
    switch (action) {
      case '0': case '1': case '2': case '3': case '4':
      case '5': case '6': case '7': case '8': case '9':
        if (justEvaluated) {
          expression = '';
          lastResult = null;
          justEvaluated = false;
        }
        expression += action;
        break;

      case 'dot':
        if (justEvaluated) {
          expression = '0';
          lastResult = null;
          justEvaluated = false;
        }
        // Prevent double dots in current number
        const parts = expression.split(/[\+\-\*\/\(\)]/);
        const currentPart = parts[parts.length - 1];
        if (!currentPart.includes('.')) {
          if (currentPart === '' || expression === '') {
            expression += '0.';
          } else {
            expression += '.';
          }
        }
        break;

      case 'add':
        appendOperator('+');
        break;

      case 'subtract':
        appendOperator('-');
        break;

      case 'multiply':
        appendOperator('*');
        break;

      case 'divide':
        appendOperator('/');
        break;

      case 'clear':
        expression = '';
        lastResult = null;
        justEvaluated = false;
        resultEl.classList.remove('error');
        break;

      case 'delete':
        if (justEvaluated) {
          expression = '';
          justEvaluated = false;
        }
        // Remove function names as a unit
        const fnMatch = expression.match(/(Math\.\w+\()$/);
        if (fnMatch) {
          expression = expression.slice(0, -fnMatch[1].length);
        } else if (expression.endsWith('Math.PI')) {
          expression = expression.slice(0, -7);
        } else if (expression.endsWith('Math.E')) {
          expression = expression.slice(0, -6);
        } else if (expression.endsWith('**')) {
          expression = expression.slice(0, -2);
        } else {
          expression = expression.slice(0, -1);
        }
        break;

      case 'percent':
        if (expression !== '') {
          try {
            const val = evaluateExpression(expression);
            if (isFinite(val)) {
              expression = String(val / 100);
              lastResult = val / 100;
              justEvaluated = true;
            }
          } catch (e) { /* ignore */ }
        }
        break;

      case 'toggle':
        if (justEvaluated && lastResult !== null) {
          expression = String(-lastResult);
          lastResult = -lastResult;
          justEvaluated = true;
        } else if (expression !== '') {
          // Toggle sign of last number
          const toggleMatch = expression.match(/(-?\d+\.?\d*)$/);
          if (toggleMatch) {
            const num = toggleMatch[1];
            const prefix = expression.slice(0, expression.length - num.length);
            if (num.startsWith('-')) {
              expression = prefix + num.slice(1);
            } else {
              expression = prefix + '(-' + num + ')';
            }
          }
        }
        break;

      case 'sin':
        insertFunction('Math.sin(');
        break;

      case 'cos':
        insertFunction('Math.cos(');
        break;

      case 'tan':
        insertFunction('Math.tan(');
        break;

      case 'log':
        insertFunction('Math.log10(');
        break;

      case 'ln':
        insertFunction('Math.log(');
        break;

      case 'sqrt':
        insertFunction('Math.sqrt(');
        break;

      case 'power':
        if (expression !== '' || (justEvaluated && lastResult !== null)) {
          if (justEvaluated && lastResult !== null) {
            expression = String(lastResult);
            justEvaluated = false;
          }
          expression += '**';
        }
        break;

      case 'pi':
        if (justEvaluated) {
          expression = '';
          justEvaluated = false;
        }
        // Add multiplication if needed
        if (expression !== '' && !isOperator(expression.slice(-1)) && expression.slice(-1) !== '(') {
          expression += '*';
        }
        expression += 'Math.PI';
        break;

      case 'e':
        if (justEvaluated) {
          expression = '';
          justEvaluated = false;
        }
        if (expression !== '' && !isOperator(expression.slice(-1)) && expression.slice(-1) !== '(') {
          expression += '*';
        }
        expression += 'Math.E';
        break;

      case 'paren':
        if (justEvaluated) {
          expression = '';
          justEvaluated = false;
        }
        const open = countChar(expression, '(');
        const close = countChar(expression, ')');
        const lastCh = expression.slice(-1);
        if (open > close && lastCh !== '(' && !isOperator(lastCh)) {
          expression += ')';
        } else {
          // Auto-multiply: 5( -> 5*(
          if (expression !== '' && !isOperator(lastCh) && lastCh !== '(') {
            expression += '*';
          }
          expression += '(';
        }
        break;

      case 'equals':
        evaluate();
        return; // evaluate handles display
    }

    updateDisplay();
    livePreview();
  }

  function appendOperator(op) {
    if (justEvaluated && lastResult !== null) {
      expression = String(lastResult);
      justEvaluated = false;
    }
    if (expression === '' && op === '-') {
      expression = '-';
      return;
    }
    if (expression === '') return;
    const last = expression.slice(-1);
    if (isOperator(last)) {
      // Allow negative after operator: e.g. 5*-3
      if (op === '-' && last !== '-') {
        expression += op;
      } else {
        expression = expression.slice(0, -1) + op;
      }
    } else {
      expression += op;
    }
  }

  function insertFunction(fn) {
    if (justEvaluated) {
      expression = '';
      justEvaluated = false;
    }
    const last = expression.slice(-1);
    if (expression !== '' && !isOperator(last) && last !== '(') {
      expression += '*';
    }
    expression += fn;
  }

  function evaluateExpression(expr) {
    // Close unclosed parentheses
    let open = countChar(expr, '(');
    let close = countChar(expr, ')');
    while (open > close) {
      expr += ')';
      close++;
    }

    // Validate: only allow safe characters
    const safe = /^[\d\.\+\-\*\/\(\)\s]|Math\.(sin|cos|tan|log10|log|sqrt|pow|PI|E)/g;
    const cleaned = expr.replace(/Math\.(sin|cos|tan|log10|log|sqrt|pow|PI|E)/g, '');
    if (/[a-zA-Z]/.test(cleaned)) {
      throw new Error('Invalid expression');
    }

    // Convert ** to Math.pow for safety
    // Use Function constructor with only Math in scope
    const fn = new Function('Math', 'return (' + expr + ')');
    return fn(Math);
  }

  function evaluate() {
    if (expression === '') return;
    try {
      const result = evaluateExpression(expression);
      if (typeof result === 'number' && isFinite(result)) {
        expressionEl.textContent = formatExpression(expression) + ' =';
        resultEl.textContent = formatNumber(result);
        resultEl.classList.remove('error');
        lastResult = result;
        expression = '';
        justEvaluated = true;
      } else {
        resultEl.textContent = 'Error';
        resultEl.classList.add('error');
      }
    } catch (e) {
      resultEl.textContent = 'Error';
      resultEl.classList.add('error');
    }
  }

  function livePreview() {
    if (expression === '') return;
    try {
      const preview = evaluateExpression(expression);
      if (typeof preview === 'number' && isFinite(preview)) {
        resultEl.textContent = formatNumber(preview);
        resultEl.classList.remove('error');
      }
    } catch (e) {
      // Don't show errors during typing
    }
  }

  // Button click handlers
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', () => {
      handleAction(btn.dataset.action);
    });
  });

  // Keyboard support
  document.addEventListener('keydown', (e) => {
    const key = e.key;
    const map = {
      '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
      '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
      '.': 'dot', '+': 'add', '-': 'subtract',
      '*': 'multiply', '/': 'divide',
      'Enter': 'equals', '=': 'equals',
      'Backspace': 'delete', 'Delete': 'clear',
      'Escape': 'clear', '(': 'paren', ')': 'paren',
      '^': 'power', '%': 'percent',
      's': 'sin', 'c': 'cos', 't': 'tan',
      'l': 'log', 'n': 'ln', 'r': 'sqrt',
      'p': 'pi', 'e': 'e'
    };

    if (map[key]) {
      e.preventDefault();
      handleAction(map[key]);
    }
  });

  updateDisplay();
})();
