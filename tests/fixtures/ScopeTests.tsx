import { reactive } from 'mutts'

const state = reactive({
	visible: true,
	items: ['item1', 'item2', 'item3'],
	count: 0,
})

const fixtureControls = {
	toggleVisible() {
		state.visible = !state.visible
	},
	increment() {
		state.count++
	},
	reset() {
		state.visible = true
		state.count = 0
	},
}

declare global {
	interface Window {
		__scopeFixture?: typeof fixtureControls
	}
}

window.__scopeFixture = fixtureControls

const ScopeFixtureApp = () => (
	<main>
		<h1>Scope Component Fixture</h1>
		<p>Testing conditional rendering with Scope component.</p>

		<section class="controls">
			<button data-action="toggle" onClick={() => fixtureControls.toggleVisible()}>
				Toggle Visibility
			</button>
			<button data-action="increment" onClick={() => fixtureControls.increment()}>
				Increment Count
			</button>
			<button data-action="reset" onClick={() => fixtureControls.reset()}>
				Reset
			</button>
		</section>

		<section class="output">
			<div data-testid="visible-content">
				<p if={state.visible} class="visible">Content is visible (count: {state.count})</p>
				<p else class="hidden">Content is hidden</p>
			</div>

			<div data-testid="conditional-list">
				<div if={state.items.length > 0} class="has-items">
					<p>Items:</p>
					<ul>
						<for each={state.items}>{item => <li>{item}</li>}</for>
					</ul>
				</div>
				<div else class="no-items">
					<p>No items</p>
				</div>
			</div>

			<div data-testid="count-display">
				<p if={state.count >= 5} class="high">Count is high: {state.count}</p>
				<p else class="low">Count is low: {state.count}</p>
			</div>
		</section>
	</main>
)

export default ScopeFixtureApp
