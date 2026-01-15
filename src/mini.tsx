/**
 * Main entry point for Pounce-TS application
 */
import { effect, project, reactive, trackEffect } from 'mutts'
import { bindApp, compose, Scope } from './lib'

function isFunction(value: any): value is Function {
	return typeof value === 'function'
}

function ResizeSandbox(_props: {}, scope: Scope) {
	const size = reactive({ width: 0, height: 0 })

	// Define mixin on scope: resize(target, value, scope)
	scope.resize = (target: Node | Node[], value: any, _scope: Record<PropertyKey, any>) => {
		const element = Array.isArray(target) ? target[0] : target
		if (!(element instanceof HTMLElement)) return
		const observer = new ResizeObserver((entries) => {
			const rect = entries[0].contentRect
			const width = Math.round(rect.width)
			const height = Math.round(rect.height)
			if (isFunction(value)) {
				// Support two shapes:
				// - callback: (w, h) => void
				// - getter: () => { width, height }
				if (value.length >= 2) value(width, height)
				else {
					const next = value()
					if (next && typeof next === 'object') {
						next.width = width
						next.height = height
					}
				}
			} else if (value && typeof value === 'object') {
				value.width = width
				value.height = height
			}
		})
		observer.observe(element)
		return () => observer.disconnect()
	}

	return (
		<>
			<h3>Resize Sandbox</h3>
			<div
				style="resize: both; overflow: auto; border: 1px solid #ccc; padding: 8px; min-width: 120px; min-height: 80px;"
				use:resize={size}
			>
				Resize me
				<div style="margin-top: 8px; color: #555;">
					{size.width} × {size.height}
				</div>
			</div>
		</>
	)
}

function MiniCounter(
	props: { list?: string[]; addedText?: string },
	scope: Scope
) {
	trackEffect((obj, evolution) => {
		console.log(obj, evolution)
	})
	const state = compose({ list: [] as string[], addedText: Date.now().toString() }, props)
	console.log('🎯 Mini counter component mounted!', { scope: scope })
	effect(() => {
		return () => {
			console.log('🎯 Counter component unmounted!', { finalList: state.list.join(', ') })
		}
	})
	function add() {
		state.list.push(state.addedText)
		state.addedText = Date.now().toString()
	}
	function removeAll() {
		state.list.splice(0)
	}
	return (
		<>
			<div>
				{project(state.list, ({ get, key }) => (
					<button class="remove" onClick={() => state.list.splice(key, 1)}>
						{get()}
					</button>
				))}
			</div>
			<div>
				<input type="text" value={state.addedText} />
				<button class="add" onClick={add}>
					+
				</button>
			</div>
			<button if={state.list.length > 0} class="remove-all" onClick={removeAll}>
				Remove All
			</button>
		</>
	)
}

const state = reactive({
	list: [] as string[],
})
// Add components using PascalCase JSX with children
const App = () => (
	<>
		<div>
			List: <span>{state.list.join(', ')}</span>
		</div>
		<MiniCounter list={state.list} />
		<ResizeSandbox />
	</>
)
/*
const microState = reactive({count: 0})
const MicroApp = () => (
	<>
		<div>
			Count: <span>{microState.count}</span>
		</div>
		<button onClick={() => microState.count++}>Increment</button>
	</>
)*/

// Initialize the app using the automated bindApp helper
bindApp(<App />, '#mini')
