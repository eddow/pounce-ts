# Reactivity in Pounce-TS

Pounce-TS uses the `mutts` reactivity engine to automatically track dependencies and update the DOM when state changes.

## Reactive State

### Creating Reactive Objects

Use `reactive()` to create reactive state:

```tsx
import { reactive } from 'mutts'

const state = reactive({
  count: 0,
  name: 'World',
  items: []
})
```

Any changes to these properties automatically trigger re-renders of components that depend on them.

### Updating Reactive State

Just mutate the properties directly:

```tsx
state.count++           // Triggers re-render
state.name = 'Alice'    // Triggers re-render
state.items.push(item)  // Triggers re-render
```

## Derived Values

### Creating Memoized Derivations

Use `memoize()` to create derived values:

```tsx
import { memoize } from 'mutts'

const state = reactive({
  firstName: 'John',
  lastName: 'Doe'
})

const fullName = memoize(() => `${state.firstName} ${state.lastName}`)

// Usage
<p>Hello, {fullName()}</p>
```

### Reactive Array Mapping

Map over arrays reactively with `mapped`:

```tsx
import { mapped } from 'mutts'

const todos = reactive([
  { id: 1, text: 'Task 1', done: false },
  { id: 2, text: 'Task 2', done: true }
])

<div>
  {mapped(todos, (todo) => (
    <div>
      <input type="checkbox" checked={todo.done} />
      <span>{todo.text}</span>
    </div>
  ))}
</div>
```

### Filtered Arrays

Filter arrays reactively:

```tsx
import { memoize, mapped } from 'mutts'

const activeTodos = memoize(() => todos.filter(t => !t.done))

<div>
  {mapped(activeTodos, (todo) => <div>{todo.text}</div>)}
</div>
```

## Effects

Use `effect()` to perform side effects when reactive values change:

```tsx
import { effect } from 'mutts'

effect(() => {
  console.log('Count changed to:', state.count)
  
  // Return cleanup function
  return () => {
    console.log('Effect cleaned up')
  }
})
```

### Debugging effects

For development-time tracing, see debug utilities; production code should use `effect()`.

## Watching Values

Use `watch()` to observe specific values:

```tsx
import { watch } from 'mutts'

watch(() => state.count, (newValue, oldValue) => {
  console.log(`Count changed from ${oldValue} to ${newValue}`)
})
```

## Effects in Components

Components can use effects for lifecycle and side effects:

```tsx
function Counter() {
  const state = reactive({ count: 0 })
  
  // Component mounted
  console.log('Counter mounted')
  
  effect(() => {
    // Runs when dependencies change
    return () => {
      // Cleanup on unmount
      console.log('Counter unmounted')
    }
  })
  
  // Track all reactive changes
  trackEffect((obj, evolution) => {
    console.log('State changed:', obj, evolution)
  })
  
  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={() => state.count++}>Increment</button>
    </div>
  )
}
```

## Reactive Utilities

### Array Utilities

Pounce-TS provides utility functions for reactive arrays:

```tsx
import { array } from '../lib/utils'

const items = reactive([1, 2, 3])

// Remove item
array.remove(items, 2)  // Removes first occurrence of 2

// Filter items
array.filter(items, item => item > 1)  // Keeps only items > 1

// Derived array
const doubled = memoize(() => items.map(x => x * 2))
```

### Defaulted Props

Use `defaulted()` to provide default values for props:

```tsx
import { defaulted } from '../lib/utils'

function Button(props: {
  label?: string
  onClick?: () => void
}) {
  const state = defaulted(props, {
    label: 'Click me'
  })
  
  return <button onClick={state.onClick}>{state.label}</button>
}
```

## Best Practices

1. **Keep state minimal**: Store only what's necessary
2. **Use computed for derived values**: Don't store redundant data
3. **Clean up effects**: Return cleanup functions to prevent memory leaks
4. **Group related state**: Keep related data together in reactive objects
5. **Use trackEffect for debugging**: Monitor all reactive changes during development

## Performance Considerations

- Computed values are cached and only recompute when dependencies change
- Effects run synchronously after state mutations
- The framework uses efficient dirty checking to minimize re-renders
- Use `computed.memo()` for expensive calculations


