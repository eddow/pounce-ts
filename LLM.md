# Pounce-TS Documentation

## Overview
Pounce is a **Component-Oriented UI Framework** that *looks* like React but works very differently. It uses **fine-grained reactivity** (via `mutts`) and direct DOM manipulation, avoiding the overhead of a Virtual DOM diffing engine.

## Core Architecture

### 1. Rendering Model
*   **No VDOM**: `h()` returns a "Mountable" object with a `render(scope)` method, not a virtual node description.
*   **Direct Updates**: Components render once. Updates happen via reactive effects attached to DOM elements.
*   **Scope**: Components receive a `scope` object (in addition to props) which allows dependency injection down the tree.

### 2. Reactivity & Bindings
The `babel-plugin-jsx-reactive` transforms JSX to enable fine-grained updates:

> [!NOTE]
> **Implicit Binding**: Member expressions like `checked={state.value}` are transformed into binding objects `{ get, set }`. Pounce ensures these bindings are propagated through `props` and correctly handled by native elements (like `<input>`) even when spread via `compose`, enabling implicit two-way binding without boilerplate. This works for `type="checkbox"` and `type="radio"` inputs.

*   **Expressions**: `attr={value}` is transformed to `attr={() => value}` (wrapped in a getter).
*   **Two-Way Binding**:
    *   **Member Expressions**: `attr={obj.prop}` -> transformed to `{ get: () => obj.prop, set: (v) => obj.prop = v }`.
    *   **Element Binding**: `this={expr}` -> transformed to `{ set: (v) => expr = v }` (pure setter, no getter).
    *   **Explicit Update**: `update:attr={(v) => ...}` combined with `attr={...}` creates the get/set pair.

### 3. Components & Props
*   **Props are Reactive Proxies**: The `props` object passed to a component is a reactive proxy.
    *   **Reading**: Accessing `props.value` reads the underlying value (calls the getter).
    *   **Writing**: Assigning `props.value = x` calls the underlying setter (updates the source state). props are NOT read-only!
    *   **Implication**: When passing props to custom components, the binding object is passed through. If the custom component uses `compose` and spreads state to an underlying native element (e.g., `<input {...state} />`), the binding is propagated, enabling implicit two-way binding without manual event handlers.
*   **Destructuring Hazard**: `const { value } = props` will read the property immediately. If done outside a tracking context (like an effect), it breaks reactivity for that variable. *Always access props usage-side or keep them in the props object.*

### 4. Directives (`use`)
*   **`use={handler}`**: The `handler` is called during the **render phase** (untracked) with the mounted element/component instance.
*   **`use:name={value}`**: Calls `scope.name(instance, value, scope)`. This allows dependency injection of directives from the scope.

### 5. Best Practices & Anti-Patterns
> [!IMPORTANT]
> **Component Interaction Anti-Pattern**
> DO NOT override internal component logic with event handlers to manually force state changes.
> *   **Bad**: `<RadioButton el={{ onClick: () => mode.val = '' }} />`
> *   **Good**: `<RadioButton group={mode} value="" />` (Let the component handle the update).

> [!IMPORTANT]
> **Conditional Rendering: Use JSX `if` Directives for Reactivity**
> In component functions, plain JavaScript `if` statements are NOT reactive:
> *   **Bad**: `if (state.loading) return <div>Loading...</div>` (evaluated once, never updates)
> *   **Good**: `<div if={state.loading}>Loading...</div>` (reactive, updates when state changes)
> 
> The JSX `if` directive wraps the condition in a getter and re-evaluates it whenever dependencies change.

> [!NOTE]
> **Array Mutations & Reactivity**
> *   `array.push()`, `array.splice()`, `array.shift()` etc. properly trigger reactivity.
> *   `array.length = 0` may not trigger all reactivity effects. Prefer `array.splice(0)` to clear arrays.



