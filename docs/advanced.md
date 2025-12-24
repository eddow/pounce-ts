# Advanced Features

This guide covers advanced features and patterns in Pounce-TS.

## Conditional Rendering

Pounce-TS supports several conditional rendering patterns using component-local conditions and scoped properties.

### `if={...}` boolean conditions

Use a plain `if={condition}` to render when the condition is truthy:

```tsx
function App() {
  const state = reactive({ isLoggedIn: false })
  
  return (
    <>
      <div>Always visible</div>
      <div if={state.isLoggedIn}>Only when logged in</div>
      <div if={!state.isLoggedIn}>Only when logged out</div>
    </>
  )
}
```

### `if:name={value}` strict scope comparison

Strict-compare a value against `scope.name`:

```tsx
<scope role="admin">
  <>
    <div if:role={"admin"}>Admin Dashboard</div>
    <div else>User Dashboard</div>
  </>
</scope>
```

### `when:name={arg}` calling a scope function

Use `when:` to call a function exposed on `scope` and render if it returns a truthy value:

```tsx
function Area(props: {}, scope: Scope) {
  scope.has = (perm: string) => scope.user?.permissions?.includes(perm)
  return (
    <>
      <div when:has={"write"}>You can write</div>
      <div else>You cannot write</div>
    </>
  )
}
```

### `else` and `else if` chains

`else` renders only if no previous sibling in the same fragment rendered due to an `if`/`when` condition. Chain with `if` for `else if`:

```tsx
<>
  <div if:status={"loading"}>Loading…</div>
  <div else if:status={"error"}>Error</div>
  <div else>Ready</div>
</>
```

## Scope Management

Scope in Pounce-TS is like React's context or Svelte's context - it provides a way to share data down the component tree through **prototype inheritance**.

### How Scope Works

When a component renders its children, it creates a new scope that inherits from the parent scope using JavaScript's prototype chain. This means:

1. **Scope flows down**: Children automatically receive the parent's scope
2. **Modifications are inherited**: If parent A modifies scope and renders child B, B sees A's modifications
3. **Siblings share scope**: Components at the same level share the same scope
4. **Scope changes propagate**: Changes to scope in a parent are immediately visible to all descendants

If you need to manually create a derived scope, call `extend(scope, additions)`—it returns a reactive object that prototypes the original scope while layering your overrides.

### The `<scope>` Component

The `<scope>` component is a special component that forwards its children but adds its props to the scope. It doesn't render any DOM elements itself - it just injects its attributes into the scope for its children to use.

**Usage example:**

```tsx
import { Scope } from '../lib/renderer'

function App() {
  return (
    <scope user="Alice" role="admin">
      <UserInfo />
      <AdminPanel />
    </scope>
  )
}

function UserInfo(props: any, scope: Scope) {
  return <p>User: {scope.user}</p>
}

function AdminPanel(props: any, scope: Scope) {
  return (
    <div if:role={'admin'}>
      <p>Admin Panel (visible to {scope.user})</p>
    </div>
  )
}
```

Since `<scope>` doesn't render any wrapper, this renders as flat DOM - just the children without any extra `<div>` or other container.

### Scope Inheritance Example

```tsx
function ComponentC() {
  return <ComponentA><ComponentB /></ComponentA>
}

function ComponentA(props: any, scope: Scope) {
  // Modify scope
  scope.theme = 'dark'
  
  // ComponentB will inherit scope.theme = 'dark'
  return <div>{props.children}</div>
}

function ComponentB(props: any, scope: Scope) {
  // This component receives scope from A, even though it was written in C
  return <div class={scope.theme}>Using dark theme</div>
}
```

### Using Scope for Conditional Rendering

Scope is particularly powerful for conditional rendering using `if`, `if:name`, `when:name`, and `else`:

```tsx
function App() {
  const state = reactive({ isLoggedIn: true, role: 'admin' })
  
  return (
    <scope isLoggedIn={state.isLoggedIn} role={state.role}>
      <Header />
      <MainContent />
    </scope>
  )
}

function Header(props: any, scope: Scope) {
  return (
    <div>
      <div if={scope.isLoggedIn}>Welcome!</div>
      <div else>Please log in</div>
    </div>
  )
}

function MainContent(props: any, scope: Scope) {
  return (
    <>
      <div if:role={'admin'}>Admin Dashboard</div>
      <div else>User Dashboard</div>
    </>
  )
}
```

## Control Flow Components

### for Loops

Use the `<for>` component for reactive iteration:

```tsx
function TodoList() {
  const todos = reactive([
    { id: 1, text: 'Task 1' },
    { id: 2, text: 'Task 2' }
  ])
  
  return (
    <div>
      <for each={todos}>
        {(todo) => (
          <div key={todo.id}>
            {todo.text}
          </div>
        )}
      </for>
    </div>
  )
}
```

### Fragments

Use JSX fragments for multiple root elements:

```tsx
function List() {
  return (
    <>
      <li>Item 1</li>
      <li>Item 2</li>
      <li>Item 3</li>
    </>
  )
}
```

## Styling

### Inline Styles

Use the `style` attribute for inline styles:

```tsx
<div style="color: red; font-size: 16px;">Styled text</div>

// Or with reactive style
<div style={`color: ${state.color};`}>Dynamic style</div>
```

### CSS Classes

Use the `class` attribute for CSS classes:

```tsx
// Simple class
<div class="container">Content</div>

// Multiple classes
<div class="container active">Content</div>

// Conditional classes
<div class={['container', { active: state.isActive }]}>Content</div>

// Reactive classes
<div class={state.isActive ? 'active' : 'inactive'}>Content</div>
```

For complex class logic, you can use conditional expressions or arrays:

```tsx
function Button(props: { active: boolean; disabled: boolean }) {
  return (
    <button class={`btn ${props.active ? 'active' : ''} ${props.disabled ? 'disabled' : ''}`}>
      Click me
    </button>
  )
}
```

Or with array syntax:

```tsx
function Button(props: { active: boolean; disabled: boolean }) {
  return (
    <button class={['btn', props.active && 'active', props.disabled && 'disabled'].filter(Boolean).join(' ')}>
      Click me
    </button>
  )
}
```

### CSS Modules / SCSS

Import stylesheets directly in your components:

```tsx
import './MyComponent.scss'

function MyComponent() {
  return <div class="my-component">Styled component</div>
}
```

## Debug Mode

Enable debug mode to see reactive changes:

```tsx
import { debug, trackEffect } from '../lib/debug'

function MyComponent() {
  trackEffect((obj, evolution) => {
    console.log('State changed:', obj, evolution)
  })
  
  return <div>My Component</div>
}
```

## Props Handling

### Namespaced Props

Pounce-TS automatically expands optional object props into _namespaced_ variants so you can target nested values directly in JSX attributes. This is handled by the custom `h()` runtime and the JSX types—no wrapper helpers required.

- **Automatic restructuring:** Component props are reorganized so attributes like `config:title="..."` land on `props.config.title`.
- **Optional only:** Namespaced attributes are generated when the original prop is optional _and_ the prop type accepts `undefined` and `{}`. Required props (e.g. `{ item: Item }`) do **not** receive namespaced keys.
- **Colon syntax:** Use `${propName}:${nestedKey}`. The nested keys mirror the original object keys and stay optional, so you can provide just the bits you need.
- **Intrinsic safety:** Namespaced attributes remain optional on components and never appear on intrinsic DOM elements unless you provide them yourself.
- **Type-aware:** The JSX namespace exposes the derived types, so TypeScript catches unsupported namespaces at compile time.

```tsx
type PanelProps = {
  // Optional object that tolerates an empty object and undefined
  config?: {
    title?: string
    count?: number
  }
}

function Panel(props: PanelProps) {
  return (
    <section>
      <h3>{props.config?.title ?? 'Untitled'}</h3>
      <p>{props.config?.count ?? 0} items</p>
    </section>
  )
}

// Namespaced usage: generates props.config.title/count automatically
<Panel config:title="Dashboard" config:count={state.items.length} />

// Optional keys stay optional – you can mix and match
<Panel config:title="Draft" />
```

If you need compile-time assurance around what namespaces exist, the JSX typing surface makes them available:

```tsx
type PanelPropsWithNamespace = JSX.LibraryManagedAttributes<
  typeof Panel,
  PanelProps
>

type HasTitleNamespace = Extract<
  keyof PanelPropsWithNamespace,
  'config:title'
> // "config:title"

type CountType = PanelPropsWithNamespace['config:count'] // number | undefined
```

Because required props never gain colon variants, the following will fail to type-check (as intended):

```tsx
function ListItem(props: { item: { id: number; label: string } }) {
  /* ... */
}

// ❌ Type error: 'item:label' is not generated for required props
<ListItem item:label="Alpha" />
```

### Props with Functions

Props can be functions or get/set objects:

```tsx
function Input(props: { 
  value: string | (() => string) | { get: () => string; set: (v: string) => void }
}) {
  return <input value={props.value} />
}

// Usage
const state = reactive({ text: 'Hello' })

// Computed value
const displayText = memoize(() => state.text.toUpperCase())
<Input value={displayText} />

// Two-way binding
<Input value={state.text} />
```

### Dynamic Props

Pass dynamic props to components:

```tsx
function DynamicComponent(props: Record<string, any>) {
  return (
    <div {...props}>
      Content
    </div>
  )
}
```

## Performance Optimization

### Memoization

Use `memoize` for expensive calculations:

```tsx
import { memoize } from 'mutts'

function ExpensiveList(props: { items: Item[] }) {
  const processed = memoize(() => props.items.map(expensiveProcess))
  
  return (
    <div>
      {processed().map(item => <div>{item.result}</div>)}
    </div>
  )
}
```

### Manual Re-rendering Control

Use `effect` for fine-grained control:

```tsx
import { effect, reactive } from 'mutts'

function ControlledComponent() {
  const shouldUpdate = reactive({ value: true })
  
  effect(() => {
    if (!shouldUpdate.value) return
    // Update logic
  })
  
  return <div>Component</div>
}
```

## Custom Hooks Pattern

Create reusable logic:

```tsx
function useCounter(initialValue: number = 0) {
  const state = reactive({ count: initialValue })
  
  function increment() { state.count++ }
  function decrement() { state.count-- }
  function reset() { state.count = initialValue }
  
  return { state, increment, decrement, reset }
}

function MyCounter() {
  const { state, increment, decrement, reset } = useCounter(10)
  
  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
      <button onClick={reset}>Reset</button>
    </div>
  )
}
```

## Event Handling

### Custom Events

Emit custom events from components:

```tsx
function MyComponent() {
  function handleClick() {
    // Emit custom event
    window.dispatchEvent(new CustomEvent('myevent', { 
      detail: { data: 'value' } 
    }))
  }
  
  return <button onClick={handleClick}>Click</button>
}

// Listen for event
window.addEventListener('myevent', (e) => {
  console.log(e.detail)
})
```

### Event Delegation

Use event delegation for dynamic lists:

```tsx
function DynamicList(props: { items: Item[] }) {
  function handleClick(e: MouseEvent) {
    const target = e.target as HTMLElement
    const itemId = target.dataset.id
    // Handle click
  }
  
  return (
    <div onClick={handleClick}>
      {props.items.map(item => (
        <div key={item.id} data-id={item.id}>
          {item.text}
        </div>
      ))}
    </div>
  )
}
```

## Type Safety

### Strict TypeScript

Use strict TypeScript settings:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

### Type Guards

Use type guards for runtime type checking:

```tsx
function isTodo(obj: any): obj is Todo {
  return obj && typeof obj.id === 'number' && typeof obj.text === 'string'
}

function processItem(item: any) {
  if (isTodo(item)) {
    // TypeScript knows item is Todo
    return item.text
  }
  return ''
}
```

## Best Practices

1. **Use Scope for context**: Share data without prop drilling
2. **Memoize expensive computations**: Use `memoize` for performance
3. **Keep components focused**: Single responsibility principle
4. **Use TypeScript strictly**: Enable strict mode for better type safety
5. **Handle edge cases**: Always validate props and state
6. **Clean up effects**: Return cleanup functions to prevent memory leaks
7. **Use debug mode during development**: Track reactive changes
8. **Optimize re-renders**: Only update what's necessary


