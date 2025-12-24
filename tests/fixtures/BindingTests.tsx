import { reactive } from 'mutts'

const state = reactive({
	value: 'initial',
})

const fixtureControls = {
	setValue(newValue: string) {
		state.value = newValue
	},
	getValue() {
		return state.value
	},
	reset() {
		state.value = 'initial'
	},
}

declare global {
	interface Window {
		__bindingFixture?: typeof fixtureControls
	}
}

window.__bindingFixture = fixtureControls

const BindingFixtureApp = () => (
	<main>
		<h1>2-Way Binding Fixture</h1>
		<p>Test 2-way binding with inputs and display</p>

		<section class="controls">
			<button data-action="reset" onClick={() => fixtureControls.reset()}>
				Reset
			</button>
		</section>

		<section class="output">
			<div data-testid="binding-display" style="margin: 20px 0; padding: 10px; border: 1px solid #ccc;">
				Current value: <strong>{state.value}</strong>
			</div>

			<div data-testid="binding-inputs" style="display: flex; gap: 20px; flex-direction: column;">
				<div>
					<label>Input 1:</label>
					<input type="text" data-testid="input1" value={state.value} style="margin-left: 10px; padding: 5px;" />
				</div>
				<div>
					<label>Input 2:</label>
					<input type="text" data-testid="input2" value={state.value} style="margin-left: 10px; padding: 5px;" />
				</div>
			</div>
		</section>
	</main>
)

export default BindingFixtureApp
