import { reactive } from 'mutts'

type ChildNode = {
	id: number
	label: string
}

const state = reactive({
	nodes: [
		{ id: 1, label: 'alpha' },
		{ id: 2, label: 'beta' },
		{ id: 3, label: 'gamma' },
	] satisfies ChildNode[],
	nextId: 4,
	log: [] as string[],
})

const fixtureControls = {
	addToStart(label?: string) {
		const id = state.nextId++
		state.nodes.unshift({ id, label: label ?? `node-${id}` })
		logEvent('add-start', id)
	},
	addToEnd(label?: string) {
		const id = state.nextId++
		state.nodes.push({ id, label: label ?? `node-${id}` })
		logEvent('add-end', id)
	},
	removeFirst() {
		const removed = state.nodes.shift()
		if (removed) logEvent('remove-first', removed.id)
	},
	removeLast() {
		const removed = state.nodes.pop()
		if (removed) logEvent('remove-last', removed.id)
	},
	removeById(id: number) {
		const index = state.nodes.findIndex((node) => node.id === id)
		if (index !== -1) {
			state.nodes.splice(index, 1)
			logEvent('remove-id', id)
		}
	},
	reset(nodes: ChildNode[]) {
		state.nextId = Math.max(0, ...nodes.map((node) => node.id)) + 1
		state.nodes.length = 0
		state.nodes.push(...nodes)
		this.resetEvents()
		logEvent('reset', nodes.length)
	},
	resetEvents() {
		state.log.length = 0
	},
	get events() {
		return state.log
	},
}

declare global {
	interface Window {
		__pounceFixture?: typeof fixtureControls
	}
}

function logEvent(name: string, payload?: number) {
	const message = payload === undefined ? name : `${name}:${payload}`
	state.log.push(message)
}

window.__pounceFixture = fixtureControls

const ChildList = () => (
	<ul data-testid="child-list" aria-live="polite">
		<for each={state.nodes}>{(node: ChildNode) => <li data-node-id={node.id}>{node.label}</li>}</for>
	</ul>
)

const Controls = () => (
	<div class="controls">
		<button data-action="add-start" onClick={() => fixtureControls.addToStart()}>Add to start</button>
		<button data-action="add-end" onClick={() => fixtureControls.addToEnd()}>Add to end</button>
		<button data-action="remove-first" onClick={() => fixtureControls.removeFirst()}>Remove first</button>
		<button data-action="remove-last" onClick={() => fixtureControls.removeLast()}>Remove last</button>
		<button data-action="reset" onClick={() => fixtureControls.reset(defaultNodes)}>Reset</button>
	</div>
)

const defaultNodes: ChildNode[] = [
	{ id: 1, label: 'alpha' },
	{ id: 2, label: 'beta' },
	{ id: 3, label: 'gamma' },
]

const ForFixtureApp = () => (
	<main>
		<h1>For Component Fixture</h1>
		<p>Use the controls to mutate the children array and validate reconciliation behaviour.</p>
		<Controls />
		<section class="output">
			<ChildList />
		</section>
		<section class="events">
			<h2>Events</h2>
			<ul data-testid="event-log">
				<for each={state.log}>{(entry: string) => <li data-event={entry}>{entry}</li>}</for>
			</ul>
		</section>
	</main>
)

fixtureControls.reset(defaultNodes)

export default ForFixtureApp
