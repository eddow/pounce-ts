# Examples

This page contains complete, working examples demonstrating various features of Pounce-TS.

## Counter Component

A simple counter with increment and decrement buttons:

```tsx
import { reactive } from 'mutts'
import { bindApp } from '../lib/renderer'

function Counter() {
  const state = reactive({ count: 0 })
  
  function increment() {
    state.count++
  }
  
  function decrement() {
    state.count--
  }
  
  return (
    <>
      <h2>Counter</h2>
      <p>Count: {state.count}</p>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
    </>
  )
}

bindApp(<Counter />)
```

## Todo List

A complete todo list with add, delete, and filter functionality:

```tsx
import { reactive, computed } from 'mutts'
import { bindApp } from '../lib/renderer'
import { array } from '../lib/utils'

interface Todo {
  id: number
  text: string
  completed: boolean
}

function TodoApp() {
  const state = reactive({
    todos: [] as Todo[],
    newTodo: '',
    filter: 'all' as 'all' | 'active' | 'completed'
  })
  
  function addTodo() {
    if (!state.newTodo.trim()) return
    
    state.todos.push({
      id: Date.now(),
      text: state.newTodo,
      completed: false
    })
    state.newTodo = ''
  }
  
  function toggleTodo(id: number) {
    const todo = state.todos.find(t => t.id === id)
    if (todo) todo.completed = !todo.completed
  }
  
  function deleteTodo(id: number) {
    array.remove(state.todos, state.todos.find(t => t.id === id)!)
  }
  
  const filteredTodos = computed(() => {
    switch (state.filter) {
      case 'active':
        return state.todos.filter(t => !t.completed)
      case 'completed':
        return state.todos.filter(t => t.completed)
      default:
        return state.todos
    }
  })
  
  const activeCount = computed(() => 
    state.todos.filter(t => !t.completed).length
  )
  
  return (
    <>
      <h1>Todo List</h1>
      
      {/* Add todo */}
      <div>
        <input 
          value={state.newTodo}
          placeholder="Add a todo..."
          onKeypress={(e) => e.key === 'Enter' && addTodo()}
        />
        <button onClick={addTodo}>Add</button>
      </div>
      
      {/* Filter buttons */}
      <div>
        <button 
          class={state.filter === 'all' ? 'active' : ''}
          onClick={() => state.filter = 'all'}
        >
          All
        </button>
        <button 
          class={state.filter === 'active' ? 'active' : ''}
          onClick={() => state.filter = 'active'}
        >
          Active ({activeCount()})
        </button>
        <button 
          class={state.filter === 'completed' ? 'active' : ''}
          onClick={() => state.filter = 'completed'}
        >
          Completed
        </button>
      </div>
      
      {/* Todo list */}
      <ul>
        {computed.map(filteredTodos, (todo) => (
          <li key={todo.id}>
            <input 
              type="checkbox" 
              checked={todo.completed}
              onClick={() => toggleTodo(todo.id)}
            />
            <span style={todo.completed ? 'text-decoration: line-through;' : ''}>
              {todo.text}
            </span>
            <button onClick={() => deleteTodo(todo.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </>
  )
}

bindApp(<TodoApp />)
```

## Form with Validation

A form with real-time validation:

```tsx
import { reactive, computed } from 'mutts'
import { bindApp } from '../lib/renderer'

function FormApp() {
  const state = reactive({
    form: {
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    },
    errors: {} as Record<string, string>
  })
  
  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }
  
  function validate() {
    state.errors = {}
    
    if (state.form.name.length < 3) {
      state.errors.name = 'Name must be at least 3 characters'
    }
    
    if (!validateEmail(state.form.email)) {
      state.errors.email = 'Invalid email address'
    }
    
    if (state.form.password.length < 6) {
      state.errors.password = 'Password must be at least 6 characters'
    }
    
    if (state.form.password !== state.form.confirmPassword) {
      state.errors.confirmPassword = 'Passwords do not match'
    }
  }
  
  const isValid = computed(() => Object.keys(state.errors).length === 0)
  
  function handleSubmit() {
    validate()
    if (isValid()) {
      alert('Form submitted successfully!')
    }
  }
  
  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      handleSubmit()
    }}>
      <h2>Registration Form</h2>
      
      <div>
        <label>Name:</label>
        <input 
          value={state.form.name}
          onInput={() => validate()}
          placeholder="Enter your name"
        />
        {state.errors.name && <span style="color: red">{state.errors.name}</span>}
      </div>
      
      <div>
        <label>Email:</label>
        <input 
          type="email"
          value={state.form.email}
          onInput={() => validate()}
          placeholder="Enter your email"
        />
        {state.errors.email && <span style="color: red">{state.errors.email}</span>}
      </div>
      
      <div>
        <label>Password:</label>
        <input 
          type="password"
          value={state.form.password}
          onInput={() => validate()}
          placeholder="Enter your password"
        />
        {state.errors.password && <span style="color: red">{state.errors.password}</span>}
      </div>
      
      <div>
        <label>Confirm Password:</label>
        <input 
          type="password"
          value={state.form.confirmPassword}
          onInput={() => validate()}
          placeholder="Confirm your password"
        />
        {state.errors.confirmPassword && <span style="color: red">{state.errors.confirmPassword}</span>}
      </div>
      
      <button type="submit" disabled={!isValid()}>
        Submit
      </button>
    </form>
  )
}

const app = <FormApp />.render()
bindApp(app)
```

## Search with Debounce

A search input with debounced results:

```tsx
import { reactive, computed, watch } from 'mutts'
import { bindApp } from '../lib/renderer'

function SearchApp() {
  const state = reactive({
    query: '',
    results: [] as string[],
    loading: false
  })
  
  const allItems = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry', 'Fig', 'Grape']
  
  let timeout: number
  
  watch(() => state.query, (query) => {
    state.loading = true
    clearTimeout(timeout)
    
    timeout = window.setTimeout(() => {
      state.results = allItems.filter(item => 
        item.toLowerCase().includes(query.toLowerCase())
      )
      state.loading = false
    }, 300)
  })
  
  return (
    <>
      <h2>Search</h2>
      
      <div>
        <input 
          value={state.query}
          placeholder="Search items..."
        />
        {state.loading && <span>Searching...</span>}
      </div>
      
      <ul>
        {computed.map(state.results, (item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      
      {state.results.length === 0 && state.query && !state.loading && (
        <p>No results found</p>
      )}
    </>
  )
}

const app = <SearchApp />.render()
bindApp(app)
```

## Shopping Cart

A shopping cart with quantity management:

```tsx
import { reactive, computed } from 'mutts'
import { bindApp } from '../lib/renderer'

interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
}

function ShoppingCart() {
  const state = reactive({
    items: [
      { id: 1, name: 'Product 1', price: 10, quantity: 1 },
      { id: 2, name: 'Product 2', price: 20, quantity: 2 },
      { id: 3, name: 'Product 3', price: 15, quantity: 1 }
    ] as CartItem[]
  })
  
  function updateQuantity(id: number, delta: number) {
    const item = state.items.find(i => i.id === id)
    if (item) {
      item.quantity = Math.max(0, item.quantity + delta)
    }
  }
  
  function removeItem(id: number) {
    const index = state.items.findIndex(i => i.id === id)
    if (index !== -1) {
      state.items.splice(index, 1)
    }
  }
  
  const total = computed(() => 
    state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  )
  
  const itemCount = computed(() =>
    state.items.reduce((sum, item) => sum + item.quantity, 0)
  )
  
  return (
    <>
      <h2>Shopping Cart ({itemCount()} items)</h2>
      
      <div>
        {computed.map(state.items, (item) => (
          <div key={item.id} style="border: 1px solid #ccc; padding: 10px; margin: 10px;">
            <h3>{item.name}</h3>
            <p>Price: ${item.price}</p>
            <div>
              <button onClick={() => updateQuantity(item.id, -1)}>-</button>
              <span>Quantity: {item.quantity}</span>
              <button onClick={() => updateQuantity(item.id, 1)}>+</button>
            </div>
            <p>Subtotal: ${item.price * item.quantity}</p>
            <button onClick={() => removeItem(item.id)}>Remove</button>
          </div>
        ))}
      </div>
      
      <div style="font-size: 24px; font-weight: bold;">
        Total: ${total()}
      </div>
    </>
  )
}

const app = <ShoppingCart />.render()
bindApp(app)
```

## Tabbed Interface

A tabbed interface with content switching:

```tsx
import { reactive } from 'mutts'
import { bindApp } from '../lib/renderer'

function TabbedInterface() {
  const state = reactive({
    activeTab: 'tab1'
  })
  
  const tabs = [
    { id: 'tab1', label: 'Tab 1', content: 'Content for Tab 1' },
    { id: 'tab2', label: 'Tab 2', content: 'Content for Tab 2' },
    { id: 'tab3', label: 'Tab 3', content: 'Content for Tab 3' }
  ]
  
  return (
    <>
      <h2>Tabbed Interface</h2>
      
      <div style="border-bottom: 1px solid #ccc;">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => state.activeTab = tab.id}
            style={state.activeTab === tab.id ? 'border-bottom: 2px solid blue;' : ''}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <div style="padding: 20px;">
        {tabs.find(t => t.id === state.activeTab)?.content}
      </div>
    </>
  )
}

const app = <TabbedInterface />.render()
bindApp(app)
```

## Real-World Example: Task Manager

A complete task management application combining multiple features:

```tsx
import { reactive, computed, effect } from 'mutts'
import { bindApp } from '../lib/renderer'
import { array } from '../lib/utils'

interface Task {
  id: number
  title: string
  description: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  dueDate?: string
}

function TaskManager() {
  const state = reactive({
    tasks: [] as Task[],
    newTask: {
      title: '',
      description: '',
      priority: 'medium' as Task['priority'],
      dueDate: ''
    },
    filter: 'all' as 'all' | 'active' | 'completed',
    sortBy: 'priority' as 'priority' | 'dueDate' | 'title'
  })
  
  function addTask() {
    if (!state.newTask.title.trim()) return
    
    state.tasks.push({
      id: Date.now(),
      ...state.newTask,
      completed: false
    })
    
    state.newTask = {
      title: '',
      description: '',
      priority: 'medium',
      dueDate: ''
    }
  }
  
  function toggleTask(id: number) {
    const task = state.tasks.find(t => t.id === id)
    if (task) task.completed = !task.completed
  }
  
  function deleteTask(id: number) {
    array.remove(state.tasks, state.tasks.find(t => t.id === id)!)
  }
  
  const filteredTasks = computed(() => {
    let result = state.tasks
    
    // Filter
    if (state.filter === 'active') {
      result = result.filter(t => !t.completed)
    } else if (state.filter === 'completed') {
      result = result.filter(t => t.completed)
    }
    
    // Sort
    result = [...result].sort((a, b) => {
      if (state.sortBy === 'priority') {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      }
      if (state.sortBy === 'dueDate' && a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      }
      return a.title.localeCompare(b.title)
    })
    
    return result
  })
  
  const stats = computed(() => ({
    total: state.tasks.length,
    completed: state.tasks.filter(t => t.completed).length,
    active: state.tasks.filter(t => !t.completed).length
  }))
  
  return (
    <>
      <h1>Task Manager</h1>
      
      {/* Stats */}
      <div style="display: flex; gap: 20px; margin-bottom: 20px;">
        <div>Total: {stats().total}</div>
        <div>Active: {stats().active}</div>
        <div>Completed: {stats().completed}</div>
      </div>
      
      {/* Add Task Form */}
      <div style="border: 1px solid #ccc; padding: 15px; margin-bottom: 20px;">
        <h3>Add New Task</h3>
        <input 
          value={state.newTask.title}
          placeholder="Task title"
          style="width: 100%; padding: 8px; margin-bottom: 10px;"
        />
        <textarea 
          value={state.newTask.description}
          placeholder="Task description"
          style="width: 100%; padding: 8px; margin-bottom: 10px;"
        />
        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
          <label>Priority:</label>
          <select value={state.newTask.priority}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          
          <label>Due Date:</label>
          <input type="date" value={state.newTask.dueDate} />
        </div>
        <button onClick={addTask}>Add Task</button>
      </div>
      
      {/* Filters */}
      <div style="margin-bottom: 20px;">
        <label>Filter: </label>
        <button onClick={() => state.filter = 'all'}>All</button>
        <button onClick={() => state.filter = 'active'}>Active</button>
        <button onClick={() => state.filter = 'completed'}>Completed</button>
        
        <label style="margin-left: 20px;">Sort by: </label>
        <button onClick={() => state.sortBy = 'priority'}>Priority</button>
        <button onClick={() => state.sortBy = 'dueDate'}>Due Date</button>
        <button onClick={() => state.sortBy = 'title'}>Title</button>
      </div>
      
      {/* Task List */}
      <div>
        {computed.map(filteredTasks, (task) => (
          <div 
            key={task.id}
            style={`
              border: 1px solid #ccc; 
              padding: 15px; 
              margin-bottom: 10px;
              background: ${task.completed ? '#f0f0f0' : 'white'};
            `}
          >
            <div style="display: flex; justify-content: space-between;">
              <div>
                <h3 style={task.completed ? 'text-decoration: line-through;' : ''}>
                  {task.title}
                </h3>
                <p>{task.description}</p>
                <div>
                  <span style={`
                    background: ${
                      task.priority === 'high' ? 'red' : 
                      task.priority === 'medium' ? 'orange' : 'green'
                    };
                    color: white;
                    padding: 3px 8px;
                    border-radius: 3px;
                    margin-right: 10px;
                  `}>
                    {task.priority}
                  </span>
                  {task.dueDate && (
                    <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
              <div>
                <input 
                  type="checkbox" 
                  checked={task.completed}
                  onClick={() => toggleTask(task.id)}
                />
                <button onClick={() => deleteTask(task.id)}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

const app = <TaskManager />.render()
bindApp(app)
```


