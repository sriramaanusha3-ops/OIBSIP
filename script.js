(function () {
  "use strict";

  // ---------- Theme ----------
  var THEME_KEY = "nova-theme";
  var root = document.documentElement;
  var themeToggle = document.getElementById("themeToggle");
  var themeIcon = document.getElementById("themeIcon");

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    themeIcon.textContent = theme === "dark" ? "☾" : "☀";
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
  }

  var savedTheme = null;
  try { savedTheme = localStorage.getItem(THEME_KEY); } catch (e) {}
  if (savedTheme !== "light" && savedTheme !== "dark") {
    savedTheme = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light" : "dark";
  }
  applyTheme(savedTheme);

  themeToggle.addEventListener("click", function () {
    applyTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
  });

  // ---------- State ----------
  var currentEl = document.getElementById("current");
  var exprEl = document.getElementById("expr");
  var displayEl = document.getElementById("display");

  var tokens = [];        // finalized tokens: numbers and operator strings
  var current = "0";      // current entry buffer
  var justEvaluated = false;
  var errored = false;

  var PRECEDENCE = { "+": 1, "−": 1, "×": 2, "÷": 2 };

  function formatNumber(n) {
    if (!isFinite(n)) return "Error";
    return Number(n.toPrecision(12)).toString();
  }

  function render() {
    currentEl.textContent = current;
    currentEl.classList.toggle("error", errored);
    exprEl.textContent = tokens
      .map(function (t) { return typeof t === "number" ? formatNumber(t) : " " + t + " "; })
      .join("");
  }

  function applyOp(a, b, op) {
    switch (op) {
      case "+": return a + b;
      case "−": return a - b;
      case "×": return a * b;
      case "÷":
        if (b === 0) throw new Error("Cannot divide by zero");
        return a / b;
    }
    return NaN;
  }

  // Shunting-yard style evaluation for [num, op, num, op, ...]
  function evaluate(list) {
    var values = [];
    var ops = [];
    function reduce() {
      var op = ops.pop();
      var b = values.pop();
      var a = values.pop();
      values.push(applyOp(a, b, op));
    }
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      if (typeof t === "number") {
        values.push(t);
      } else {
        while (ops.length && PRECEDENCE[ops[ops.length - 1]] >= PRECEDENCE[t]) reduce();
        ops.push(t);
      }
    }
    while (ops.length) reduce();
    return values[0];
  }

  // ---------- Actions ----------
  function clearAll() {
    tokens = [];
    current = "0";
    justEvaluated = false;
    errored = false;
    render();
  }

  function inputDigit(d) {
    if (errored) clearAll();
    if (justEvaluated) {
      tokens = [];
      current = d === "." ? "0." : d;
      justEvaluated = false;
      render();
      return;
    }
    if (d === ".") {
      if (current.indexOf(".") === -1) current += ".";
    } else {
      if (current === "0") current = d;
      else if (current.replace(/[-.]/g, "").length < 14) current += d;
    }
    render();
  }

  function inputOperator(op) {
    if (errored) return;
    justEvaluated = false;
    var last = tokens[tokens.length - 1];
    if (typeof last === "string") {
      // replace pending operator
      tokens[tokens.length - 1] = op;
    } else {
      var v = parseFloat(current);
      if (isNaN(v)) return;
      tokens.push(v);
      tokens.push(op);
    }
    current = "0";
    render();
  }

  function equals() {
    if (errored) return;
    try {
      var v = parseFloat(current);
      if (isNaN(v)) return;
      var list = tokens.slice();
      if (typeof list[list.length - 1] === "string") list.pop();
      list.push(v);
      var result = evaluate(list);
      current = formatNumber(result);
      tokens = [];
      justEvaluated = true;
      errored = current === "Error";
      render();
      displayEl.classList.add("flash");
      setTimeout(function () { displayEl.classList.remove("flash"); }, 220);
    } catch (e) {
      current = "Error";
      tokens = [];
      justEvaluated = true;
      errored = true;
      render();
    }
  }

  function backspace() {
    if (justEvaluated || errored) { clearAll(); return; }
    if (current.length <= 1 || (current.length === 2 && current.charAt(0) === "-")) {
      current = "0";
    } else {
      current = current.slice(0, -1);
    }
    render();
  }

  function toggleSign() {
    if (errored) return;
    if (current === "0") return;
    current = current.charAt(0) === "-" ? current.slice(1) : "-" + current;
    render();
  }

  function percent() {
    if (errored) return;
    var v = parseFloat(current);
    if (isNaN(v)) return;
    current = formatNumber(v / 100);
    render();
  }

  // ---------- Bind buttons (no inline onclick) ----------
  var keys = document.querySelectorAll(".key");
  for (var i = 0; i < keys.length; i++) {
    keys[i].addEventListener("click", function (e) {
      var btn = e.currentTarget;
      var digit = btn.getAttribute("data-digit");
      var op = btn.getAttribute("data-op");
      var action = btn.getAttribute("data-action");
      if (digit !== null) inputDigit(digit);
      else if (op !== null) inputOperator(op);
      else if (action === "clear") clearAll();
      else if (action === "sign") toggleSign();
      else if (action === "percent") percent();
      else if (action === "back") backspace();
      else if (action === "equals") equals();
    });
  }

  // ---------- Keyboard ----------
  window.addEventListener("keydown", function (e) {
    var k = e.key;
    if (/^[0-9]$/.test(k)) return inputDigit(k);
    if (k === ".") return inputDigit(".");
    if (k === "+") return inputOperator("+");
    if (k === "-") return inputOperator("−");
    if (k === "*") return inputOperator("×");
    if (k === "/") { e.preventDefault(); return inputOperator("÷"); }
    if (k === "Enter" || k === "=") { e.preventDefault(); return equals(); }
    if (k === "Backspace") return backspace();
    if (k === "Escape") return clearAll();
    if (k === "%") return percent();
  });

  render();
})();
