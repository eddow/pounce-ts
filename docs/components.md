# Components in Pounce-TS

Components are the building blocks of Pounce-TS applications. They are TypeScript functions that receive props and return JSX elements.

## Basic Component Syntax

A component is a function that returns JSX:

```tsx
function Greeting(props: { name: string }) {
  return <h1>Hello, {props.name}!</h1>
}
```

### Component Structure

Every component receives two parameters:

1. **`props`**: The component's properties
2. **`scope`**: The reactive scope for conditional rendering and mixins (similar to React/Svelte context)

```tsx
function MyComponent(
  props: { title: string; count: number },
  scope: Scope
) {
  return (
    <div>
      <h2>{props.title}</h2>
      <p>Count: {props.count}</p>
    </div>
  )
}
```

**Important:** The `scope` parameter uses prototype inheritance. When component A renders component B, B automatically receives A's scope. Any modifications A makes to `scope` are visible to B and all its descendants. This means if `<ComponentA><ComponentB /></ComponentA>` is written in `ComponentC`, ComponentB will still receive ComponentA's scope modifications.

See the [Advanced Features Guide](./advanced.md#scope-management) for more details on scope management.

Conditional rendering with scope
- `if={...}`: boolean condition
- `if:name={value}`: compares `value === scope.name`
- `when:name={arg}`: calls `scope[name](arg)` and checks the returned value
- `else` and `else if={...}`: use inside fragments to chain branches

## Default Props

Use the `defaulted()` utility to provide default values for props:

```tsx
import { defaulted } from '../lib/utils'

function Button(props: {
  label?: string
  onClick?: () => void
  disabled?: boolean
}) {
  const state = defaulted(props, {
    label: 'Click me',
    disabled: false
  })

  return (
    <button onClick={state.onClick} disabled={state.disabled}>
      {state.label}
    </button>
  )
}
```

## Dynamic Tags

When the wrapper tag needs to change at runtime, use the `<dynamic>` helper component. Pass the tag name (or component) via the `is` prop and forward any additional attributes/children:

```tsx
function Wrapper(props: { as?: JSX.HTMLElementTag }) {
  return (
    <dynamic tag={props.as ?? 'div'} class="wrapper">
      {props.children}
    </dynamic>
  )
}
```

`dynamic` forwards everything to the rendered target, so props such as `class`, `style`, `if`, and `use:` behave exactly as if you had written the tag directly.

## Props Types

### Static Props

Simple values passed directly:

```tsx
<Greeting name="Alice" />
```

### Reactive Props

Props can be reactive functions or two-way bindings:

```tsx
// One-way binding with memoized derivation
const doubled = memoize(() => state.counter * 2)
<Counter count={doubled} />

// Two-way binding
<Counter count={state.counter} />
```

### Event Handler Props

Pass callback functions for component events:

```tsx
function TodoList(props: {
  todos: Todo[]
  onTodoClick?: (todo: Todo) => void
  onTodoDelete?: (id: number) => void
}) {
  return (
    <div>
      {props.todos.map(todo => (
        <div key={todo.id}>
          <span onClick={() => props.onTodoClick?.(todo)}>
            {todo.text}
          </span>
          <button onClick={() => props.onTodoDelete?.(todo.id)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  )
}
```

## Component Lifecycle

Use `effect()` from `mutts` for lifecycle hooks:

```tsx
import { effect } from 'mutts'

function MyComponent() {
  // Component mounted
  console.log('Component mounted')
  
  effect(() => {
    // Setup code
    
    return () => {
      // Cleanup on unmount
      console.log('Component unmounted')
    }
  })

  return <div>My Component</div>
}
```

### Tracking Effects

Use `trackEffect()` to monitor reactive changes:

```tsx
import { trackEffect } from 'mutts'

function MyComponent() {
  trackEffect((obj, evolution) => {
    console.log('State changed:', obj, evolution)
  })

  return <div>My Component</div>
}
```

## Children

Components can accept children elements:

```tsx
function Container(props: { children: JSX.Element | JSX.Element[] }) {
  const children = Array.isArray(props.children) 
    ? props.children 
    : [props.children]

  return (
    <div class="container">
      {children}
    </div>
  )
}

// Usage
<Container>
  <h1>Title</h1>
  <p>Content</p>
</Container>
```

## Composing Components

Build complex UIs by composing simple components:

```tsx
function App() {
  const state = reactive({
    todos: [
      { id: 1, text: 'Learn Pounce', done: false },
      { id: 2, text: 'Build app', done: false }
    ]
  })

  function addTodo(text: string) {
    state.todos.push({ id: Date.now(), text, done: false })
  }

  return (
    <div>
      <Header title="My Todo App" />
      <TodoInput onAdd={addTodo} />
      <TodoList todos={state.todos} />
    </div>
  )
}

function Header(props: { title: string }) {
  return <h1>{props.title}</h1>
}

function TodoInput(props: { onAdd: (text: string) => void }) {
  const state = reactive({ text: '' })
  
  return (
    <div>
      <input value={state.text} />
      <button onClick={() => {
        props.onAdd(state.text)
        state.text = ''
      }}>
        Add Todo
      </button>
    </div>
  )
}

function TodoList(props: { todos: Todo[] }) {
  return (
    <ul>
      {props.todos.map(todo => (
        <li key={todo.id}>{todo.text}</li>
      ))}
    </ul>
  )
}
```

## Best Practices

1. **Keep components small**: Focus on single responsibility
2. **Use TypeScript types**: Define prop types for better IDE support
3. **Provide defaults**: Use `defaulted()` for optional props
4. **Handle events properly**: Use optional chaining for callbacks
5. **Clean up effects**: Return cleanup functions from `effect()`


## `use:` mixins (element/component directives)

The `use:` directive lets you attach behaviors ("mixins") implemented on the current `scope` to either DOM elements or component results.

- Define a mixin on the scope: `scope.myMixin(target, value, scope)`
- Use it in JSX: `use:myMixin={value}`

Signature

### `use={callback}` (mount hook)

Attach an inline mount callback without defining a mixin on `scope`.

- Signature: `use={(target, scope) => void}`
- `target`: `Node | Node[]` — the rendered target. Intrinsic elements receive a single `Node`. Components may yield a `Node` or `Node[]`.
- `scope`: the current reactive scope object.

Example:

```tsx
function Demo(props: {}, scope: Scope) {
  return (
    <>
      {/* DOM element target */}
      <div
        use={(target) => {
          if (target instanceof HTMLElement) target.dataset.mounted = 'yes'
        }}
      />

      {/* Component target */}
      <Counter
        use={(target) => {
          const first = Array.isArray(target) ? target[0] : target
          if (first instanceof HTMLElement) first.classList.add('mounted')
        }}
      />
    </>
  )
}
```

Notes:
- This is a convenience alternative to `use:name` when you don't need to reuse the behavior via `scope`.
- The callback is invoked once on mount and does not support reactive updates or cleanup return values. For reactive behavior or cleanup, prefer `use:name` implemented as a scoped mixin.
- `target`: `Node | Node[]` — the rendered node(s). For components, handle either a single node or an array.
- `value`: any | undefined — the value passed from `use:myMixin={...}`; bare `use:myMixin` yields `undefined`.
- `scope`: the current scope object.
- Return value: optional cleanup function `() => void` (called on dispose/re-run), or nothing.

Example: resize mixin with ResizeObserver

```tsx
function ResizeSandbox(_props: {}, scope: Scope) {
  const size = reactive({ width: 0, height: 0 })

  scope.resize = (target: Node | Node[], value: any, _scope: Record<PropertyKey, any>) => {
    const element = Array.isArray(target) ? target[0] : target
    if (!(element instanceof HTMLElement)) return
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect
      size.width = Math.round(rect.width)
      size.height = Math.round(rect.height)
      if (typeof value === 'function') value(size.width, size.height)
    })
    ro.observe(element)
    return () => ro.disconnect()
  }

  return (
    <div
      style="resize: both; overflow: auto; border: 1px solid #ccc; padding: 8px; min-width: 120px; min-height: 80px;"
      use:resize={(w: number, h: number) => { size.width = w; size.height = h }}
    >
      {size.width} × {size.height}
    </div>
  )
}
```

Notes
- Works for both intrinsic elements and components.
- Treat component targets as arrays (`Node[]`); pick the first node if needed.
- Mixins can be reactive (they’ll re-run when `value` changes) and should return a cleanup function to unhook observers/listeners.

## `this` meta (refs)

Use the `this` attribute to capture a reference to either:
- **A DOM element** (for intrinsic elements like `div`, `input`, ...), or
- **The rendered output of a component** (treat as `Node | Node[]`).

Behavior
- The value passed to `this` must be an L‑value (a ref sink). In the default renderer, this is anything that provides a callable value with a `.set(...)` method; on render, the renderer will call that setter with the rendered value.
- The value provided to your setter will be:
  - `HTMLElement` for regular DOM elements.
  - `Node | Node[]` for components, depending on their rendered output.
- The setter may be called more than once due to re-renders.

Examples

Capture a DOM element:

```tsx
const refs: Record<string, any> = {}

<input
  this={refs.input}
  value={state.sharedCount}
/>
```

Capture a component’s rendered nodes:

```tsx
const refs: Record<string, any> = {}

<CounterComponent
  this={refs.counter}
  count={state.sharedCount}
/>
```

Capture multiple component refs in a wrapper:

```tsx
const refs: Record<string, any> = {}

<WrapperComponent>
  <TodoComponent this={refs.todos} todos={todos} />
</WrapperComponent>
```

Notes
- Handle component refs as `Node | Node[]`. If you need a single node, pick the first when you receive an array.
- If your own ref abstraction differs, adapt your L‑value so that `this={...}` receives a setter that accepts `Node | Node[]`.


