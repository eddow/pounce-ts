import { reactive } from 'mutts'
import { bindApp } from '../../src/lib/index.ts'
import { testing } from '../../src/lib/debug'

declare global {
	interface Window {
		__pounceEvents?: {
			renderingEvents: Array<{ event: string; args: any[]; timestamp: number }>
			reset(): void
		}
		__fixturesList?: string[]
	}
}

// Capture rendering events for test assertions
const renderingEventLog: Array<{ event: string; args: any[]; timestamp: number }> = []
window.__pounceEvents = {
	renderingEvents: renderingEventLog,
	reset() {
		renderingEventLog.length = 0
	},
}

// Override the testing.renderingEvent to capture events
const originalRenderingEvent = testing.renderingEvent
testing.renderingEvent = (event: string, ...args: any[]) => {
	renderingEventLog.push({ event, args, timestamp: Date.now() })
	if (originalRenderingEvent) {
		originalRenderingEvent(event, ...args)
	}
}

// Router based on URL hash
const getHash = () => window.location.hash.slice(1) // Remove leading #

const state = reactive({
	component: null as JSX.Element | null,
	error: null as string | null,
	loading: false,
})

async function loadFixtureFixture() {
	const hash = getHash()
	if (!hash) {
		state.component = <div>No test selected. Use #&lt;testname&gt; in URL</div>
		state.error = null
		return
	}

	state.loading = true
	state.error = null

	try {
		// Dynamically import the fixture component via Vite glob for reliability
		const fixtures = import.meta.glob('./*Tests.tsx') as Record<string, () => Promise<{ default: any }>>
		const loader = fixtures[`./${hash}Tests.tsx`]
		window.__fixturesList = Object.keys(fixtures)
		if (!loader) {
			state.component = <div>Fixture {hash} not found</div>
			state.error = `No fixture loader for ./${hash}Tests.tsx`
			state.loading = false
			return
		}
		const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('fixture load timeout')), 15000))
		const fixtureModule = await Promise.race([loader(), timeout])
		const FixtureComponent = fixtureModule.default

		if (!FixtureComponent) {
			state.component = <div>Fixture {hash} has no default export</div>
			state.error = `No default export in ${hash}Tests.tsx`
			state.loading = false
			return
		}

		// Render with For and Scope available in global scope
		state.component = <FixtureComponent />
		state.error = null
	} catch (error) {
		console.error(`Failed to load fixture for ${hash}:`, error)
		state.component = (
			<div>
				<p>Failed to load fixture: {hash}</p>
				<p>{String(error)}</p>
			</div>
		)
		state.error = String(error)
	} finally {
		state.loading = false
	}
}

const TestRouter = () => {
	if (state.loading) {
		return <div>Loading fixture...</div>
	}

	if (state.error) {
		return (
			<div>
				<p>Error: {state.error}</p>
			</div>
		)
	}

	return state.component || <div>Initializing...</div>
}

// Load fixture when hash changes
window.addEventListener('hashchange', loadFixtureFixture)
loadFixtureFixture()

bindApp(<TestRouter />, '#tests')

