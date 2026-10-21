/**
 * CalculatorEngine: Pure mathematical and state logic.
 * Decoupled from the DOM for testability.
 */
class CalculatorEngine {
    constructor(onUpdate) {
        this.onUpdate = onUpdate; // Callback for UI updates
        this.state = {
            displayValue: "0",
            memoryValue: 0,
            history: [],
            isError: false,
            shouldResetDisplay: false,
        };
    }

    /**
     * Notifies the UI of state changes.
     */
    _notify() {
        if (this.onUpdate) {
            this.onUpdate(this.state);
        }
    }

    /**
     * Resets the calculator state.
     */
    reset() {
        this.state.displayValue = "0";
        this.state.isError = false;
        this.state.shouldResetDisplay = false;
        this._notify();
    }

    /**
     * Adds a value to the current display.
     * @param {string} value 
     */
    addValue(value) {
        if (this.state.isError) {
            this.reset();
        }

        const operators = ['+', '-', '*', '/', '^'];

        if (this.state.shouldResetDisplay) {
            if (operators.includes(value)) {
                // If an operator is clicked after a calculation, append it to the result
                // so the user can continue the expression (e.g., "2 + ...")
                this.state.displayValue += value;
                this.state.shouldResetDisplay = false;
            } else {
                // If a number is clicked, replace the display
                this.state.displayValue = value;
                this.state.shouldResetDisplay = false;
            }
        } else {
            // Prevent consecutive operators (e.g., "++", "+-")
            if (operators.includes(value) && operators.includes(this.state.displayValue.slice(-1))) {
                return;
            }

            // Prevent multiple decimal points in the same number
            if (value === '.') {
                const parts = this.state.displayValue.split(/[+\-*/^]/);
                const lastPart = parts[parts.length - 1];
                if (lastPart.includes('.')) {
                    return;
                }
            }

            if (this.state.displayValue === "0" && value !== ".") {
                this.state.displayValue = value;
            } else {
                this.state.displayValue += value;
            }
        }
        this._notify();
    }

    /**
     * Helper to get the numerical value of the current display, 
     * evaluating expressions if necessary.
     */
    _getDisplayAsNumber() {
        const expression = this.state.displayValue;
        if (expression === "0" || expression === "" || expression === "-" || this.state.isError) {
            return 0;
        }

        try {
            let preparedExpression = expression.replace(/\^/g, '**');
            const result = Function('"use strict"; return (' + preparedExpression + ')')();
            if (isNaN(result) || !isFinite(result)) return 0;
            return parseFloat(result.toPrecision(12));
        } catch {
            return 0;
        }
    }

    /**
     * Handles scientific operations.
     * @param {string} type 
     */
    scientific(type) {
        if (this.state.isError) this.reset();

        const current = this._getDisplayAsNumber();

        switch (type) {
            case 'sqrt':
                if (current < 0) {
                    this.state.displayValue = "Error";
                    this.state.isError = true;
                } else {
                    this.state.displayValue = Math.sqrt(current).toString();
                }
                break;
            case 'sqr':
                this.state.displayValue = Math.pow(current, 2).toString();
                break;
            case 'percent':
                this.state.displayValue = (current / 100).toString();
                break;
            case 'toggleSign':
                this.state.displayValue = (current * -1).toString();
                break;
            default:
                break;
        }
        this._notify();
    }

    /**
     * Handles memory operations.
     * @param {string} type 
     */
    memory(type) {
        const current = this._getDisplayAsNumber();

        switch (type) {
            case 'MC':
                this.state.memoryValue = 0;
                break;
            case 'MR':
                this.state.displayValue = this.state.memoryValue.toString();
                this.state.shouldResetDisplay = true;
                break;
            case 'M+':
                this.state.memoryValue += current;
                this.state.shouldResetDisplay = true;
                break;
            case 'M-':
                this.state.memoryValue -= current;
                this.state.shouldResetDisplay = true;
                break;
        }
        this._notify();
    }

    /**
     * Removes the last character from the display.
     */
    backspace() {
        if (this.state.isError) {
            this.reset();
        } else {
            this.state.displayValue = this.state.displayValue.slice(0, -1) || "0";
        }
        this._notify();
    }

    /**
     * Performs the calculation.
     */
    calculate() {
        if (this.state.isError) return;

        const expression = this.state.displayValue;
        if (!expression || expression === "0" || expression === "-" || expression === "+") return;

        try {
            // Prepare expression: replace ^ with ** for JS compatibility
            let preparedExpression = expression.replace(/\^/g, '**');

            // Check for division by zero
            if (/\/0(?!\.)/.test(preparedExpression)) {
                throw new Error("DivisionByZero");
            }

            const result = Function('"use strict"; return (' + preparedExpression + ')')();

            if (result === Infinity || result === -Infinity) {
                throw new Error("DivisionByZero");
            }

            if (isNaN(result)) {
                throw new Error("InvalidResult");
            }

            // Fix floating point precision (e.g., 0.1 + 0.2)
            const fixedResult = parseFloat(result.toPrecision(12));

            // Add to history
            this._addToHistory(expression, fixedResult);

            this.state.displayValue = fixedResult.toString();
            this.state.shouldResetDisplay = true;

        } catch (e) {
            if (e.message === "DivisionByZero") {
                this.state.displayValue = "Cannot divide by 0";
            } else {
                this.state.displayValue = "Error";
            }
            this.state.isError = true;
        }
        this._notify();
    }

    _addToHistory(exp, res) {
        // Format the expression for display (replace * with × and / with ÷)
        const formattedExp = exp.replace(/\*/g, '×').replace(/\//g, '÷').replace(/\*\*/g, '^');
        
        const entry = {
            id: Date.now() + Math.random(), // Ensure uniqueness
            expression: formattedExp,
            result: res
        };

        this.state.history.unshift(entry);
        if (this.state.history.length > 50) {
            this.state.history.pop();
        }
    }

    clearHistory() {
        this.state.history = [];
        this._notify();
    }

    loadResult(value) {
        this.state.displayValue = value.toString();
        this.state.shouldResetDisplay = true;
        this.state.isError = false;
        this._notify();
    }

    getState() {
        return this.state;
    }
}

// --- DOM Integration ---

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CalculatorEngine;
} else {
    document.addEventListener("DOMContentLoaded", () => {
        const display = document.getElementById("display");
        const historyList = document.getElementById("history-list");
        const themeToggle = document.getElementById("themeToggle");
        const clearHistoryBtn = document.getElementById("clearHistory");
        const buttonLayout = document.querySelector(".buttons");

        /**
         * UI Sync: Updates the DOM based on the engine's state.
         */
        const updateUI = (state) => {
            // Update Display
            display.value = state.displayValue;

            // Update History
            if (state.history.length === 0) {
                historyList.innerHTML = '<p class="empty-msg">No history yet</p>';
            } else {
                historyList.innerHTML = state.history.map(item => `
                    <div class="history-item" data-id="${item.id}">
                        <span class="exp">${item.expression} =</span>
                        <span class="res">${item.result}</span>
                    </div>
                `).join('');
            }
        };

        const engine = new CalculatorEngine(updateUI);

        // Event Delegation for buttons
        buttonLayout.addEventListener("click", (e) => {
            const btn = e.target.closest("button");
            if (!btn) return;

            const action = btn.dataset.action;
            const value = btn.dataset.value;

            switch (action) {
                case "number":
                case "operator":
                    engine.addValue(value);
                    break;
                case "scientific":
                    engine.scientific(value);
                    break;
                case "memory":
                    engine.memory(value);
                    break;
                case "clear":
                    engine.reset();
                    break;
                case "equals":
                    engine.calculate();
                    break;
            }
        });

        // History item clicks
        historyList.addEventListener("click", (e) => {
            const item = e.target.closest(".history-item");
            if (!item) return;

            const id = parseFloat(item.getAttribute('data-id'));
            const entry = engine.getState().history.find(h => h.id === id);
            if (entry) {
                engine.loadResult(entry.result);
            }
        });

        // Clear history button
        clearHistoryBtn.addEventListener("click", () => engine.clearHistory());

        // Theme Toggle
        themeToggle.addEventListener("click", () => {
            document.body.classList.toggle("dark-mode");
            themeToggle.textContent = document.body.classList.contains("dark-mode") 
                ? "Switch to Light Mode" 
                : "Switch to Dark Mode";
        });

        // Physical Keyboard
        document.addEventListener("keydown", (event) => {
            const key = event.key;
            
            if (engine.getState().isError && key !== "Escape") {
                engine.reset();
            }

            if ("0123456789+-*/.^%.".includes(key)) {
                engine.addValue(key);
            } else if (key === "Enter" || key === "=") {
                event.preventDefault();
                engine.calculate();
            } else if (key === "Escape") {
                engine.reset();
            } else if (key === "Backspace") {
                engine.backspace();
            }
        });
    });
}
