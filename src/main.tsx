/**
 * Main entry point for Pounce-TS application
 */

import { reactive } from 'mutts'
import CounterComponent from './components/Counter'
import TodoComponent from './components/Todo'
import WrapperComponent from './components/Wrapper'
import { bindApp } from './lib'

// Create a reactive state for 2-way binding demo
const state = reactive({
	sharedCount: 5,
	parentMessage: 'Parent controls this counter',
})

// biome-ignore lint/style/useConst: set in the props
let todos = reactive([])
// Build the app virtual tree and render to a DocumentFragment
/*const refs = {
	input: undefined as HTMLInputElement | undefined,
	counter: undefined as Node | readonly Node[] | undefined,
	todos: undefined as Node | readonly Node[] | undefined,
}*/
const refs: Record<string, Node | Node[]> = {}
console.log('refs', refs)
const App = () => (
	<>
		<div>
			<div style="text-align: center; margin-bottom: 30px;">
				<p style="color: #666; font-size: 18px;">
					Simple web components built with TypeScript, Vite, and custom elements using JSX.
				</p>
				<p style="color: #888; font-size: 14px;">
					The components below use inline JSX templating with our custom h() function - now with
					2-way binding support!
				</p>
				<div style="background: #f0f8ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
					<h3 style="margin: 0 0 10px 0; color: #333;">🎯 Features:</h3>
					<ul style="margin: 0; padding-left: 20px; color: #555;">
						<li>TypeScript support with full type safety</li>
						<li>Inline JSX syntax with custom h() function</li>
						<li>Shadow DOM for component isolation</li>
						<li>Custom elements with lifecycle hooks</li>
						<li>Clean, simple component architecture</li>
						<li>
							<strong>2-way binding with auto-detection!</strong>
						</li>
					</ul>
				</div>
				<div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
					<h3 style="margin: 0 0 10px 0; color: #333;">🔄 2-Way Binding Demo:</h3>
					<p style="margin: 0; color: #555;">
						The counter below uses 2-way binding: <code>count={state.sharedCount}</code>
					</p>
					<p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">
						Parent count: <strong>{state.sharedCount}</strong> | {state.parentMessage}
					</p>
				</div>
			</div>
		</div>
		<div>
			<div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
				<h3>Regular DOM Element 2-Way Binding Test</h3>
				<p>This input is bound to the same state as the counter:</p>
				<input
					type="number"
					this={refs.input as HTMLInputElement}
					value={state.sharedCount}
					style="padding: 8px; margin: 5px; border: 1px solid #ccc; border-radius: 4px;"
				/>
				<p style="margin: 5px 0; color: #666;">
					Input value: <strong>{state.sharedCount}</strong>
				</p>
			</div>
			<CounterComponent
				this={refs.counter}
				count={state.sharedCount}
				onCountChanged={(newCount: number, oldCount: number) => {
					console.log(`Counter changed from ${oldCount} to ${newCount}`)
					state.parentMessage = `Parent updated: ${newCount}`
				}}
				onCountIncremented={(newCount: number) => {
					console.log(`Counter incremented to ${newCount}`)
				}}
				onCountDecremented={(newCount: number) => {
					console.log(`Counter decremented to ${newCount}`)
				}}
				onCountReset={() => {
					console.log('Counter was reset')
				}}
			/>
			<WrapperComponent>
				<TodoComponent this={refs.todos} todos={todos} />
			</WrapperComponent>
		</div>
	</>
)

// Initialize the app using the automated bindApp helper
bindApp(<App />, '#app')
