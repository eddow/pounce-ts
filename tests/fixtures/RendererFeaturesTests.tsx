import { reactive, effect } from 'mutts'
import { Scope } from '../../src'

type Role = 'guest' | 'member' | 'admin'

function FancyDynamicComponent(
	props: {
		class?: string
		children?: JSX.Children
		'data-testid'?: string
		'data-kind'?: string
		is?: string
	},
	_scope: Scope
) {
	const forwardedChildren = props.children as any
	return (
		<article
			class={props.class}
			data-testid={props['data-testid']}
			data-kind={props['data-kind']}
			is={props.is}
		>
			<div data-testid="dynamic-component-marker">Fancy component wrapper</div>
			<p data-testid="dynamic-forwarded-is">{props.is}</p>
			{forwardedChildren}
		</article>
	)
}

const state = reactive({
	dynamicElementTag: 'button' as 'button' | 'section',
	dynamicTag: 'button' as 'button' | 'section' | ComponentFunction,
	dynamicAsComponent: false,
	dynamicIs: 'fancy-control',
	role: 'guest' as Role,
	featureOn: true,
	variant: 'primary' as 'primary' | 'secondary' | 'danger',
	showUseTarget: true,
	useMounts: 0,
	mixinUpdates: 0,
	list: [
		{ id: 1, label: 'Alpha' },
		{ id: 2, label: 'Beta' },
	],
	nextListId: 3,
})

const VARIANTS = ['primary', 'secondary', 'danger'] as const

const controls = {
	toggleDynamicTag() {
		state.dynamicElementTag = state.dynamicElementTag === 'button' ? 'section' : 'button'
		if (!state.dynamicAsComponent) state.dynamicTag = state.dynamicElementTag
	},
	toggleDynamicMode() {
		state.dynamicAsComponent = !state.dynamicAsComponent
		state.dynamicTag = state.dynamicAsComponent ? FancyDynamicComponent : state.dynamicElementTag
	},
	toggleFeature() {
		state.featureOn = !state.featureOn
	},
	setRole(role: Role) {
		state.role = role
	},
	nextVariant() {
		const index = VARIANTS.indexOf(state.variant)
		state.variant = VARIANTS[(index + 1) % VARIANTS.length]
	},
	toggleUseTarget() {
		state.showUseTarget = !state.showUseTarget
	},
	updateFirstLabel() {
		if (state.list.length === 0) return
		state.list[0].label = `${state.list[0].label}!`
	},
	removeFirstItem() {
		if (state.list.length === 0) return
		state.list.shift()
	},
	addItem(label?: string) {
		const id = state.nextListId++
		state.list.push({ id, label: label ?? `Item ${id}` })
	},
}

declare global {
	interface Window {
		__rendererControls?: typeof controls
	}
}

window.__rendererControls = controls

let nextListInstance = 1

function DynamicDemo() {
	return (
		<section data-testid="dynamic-demo">
			<dynamic
				tag={state.dynamicAsComponent ? (state.dynamicTag as ComponentFunction) : state.dynamicElementTag}
				class="dynamic-root"
				data-testid="dynamic-root"
				data-kind={state.dynamicAsComponent ? 'component' : state.dynamicElementTag}
				is={state.dynamicIs}
			>
				<span data-testid="dynamic-label">
					{state.dynamicAsComponent ? 'component' : state.dynamicElementTag}
				</span>
			</dynamic>
			<p data-testid="dynamic-mode">{state.dynamicAsComponent ? 'component' : 'element'}</p>
			<p data-testid="dynamic-is-value">{state.dynamicIs}</p>
		</section>
	)
}

function IfDemo(_: any, scope: Scope) {
	effect(() => {
		scope.currentRole = state.role
	})
	scope.allows = (perm: string) => {
		if (perm === 'analytics') return state.role !== 'guest'
		if (perm === 'admin') return state.role === 'admin'
		return false
	}
	return (
		<section data-testid="if-demo">
			<>
				<div data-testid="feature-on" if={state.featureOn}>
					Feature On
				</div>
				<div data-testid="feature-off" else>
					Feature Off
				</div>
			</>
			<>
				<div data-testid="role-admin" if:currentRole="admin">
					Admin control
				</div>
				<div data-testid="role-member" else if:currentRole="member">
					Member area
				</div>
				<div data-testid="role-guest" else>
					Guest space
				</div>
			</>
			<>
				<div data-testid="perm-allowed" when:allows="analytics">
					Analytics enabled
				</div>
				<div data-testid="perm-denied" else>
					No analytics access
				</div>
			</>
		</section>
	)
}

function UseDemo(_: any, scope: Scope) {
	scope.marker = (target: Node | Node[], value: string) => {
		const node = Array.isArray(target) ? target[0] : target
		if (!(node instanceof HTMLElement)) return
		return effect(() => {
			node.dataset.marker = String(value)
			state.mixinUpdates++
			return () => {
				node.removeAttribute('data-marker')
			}
		})
	}
	return (
		<section data-testid="use-demo">
			<div if={state.showUseTarget}
				data-testid="use-target"
				use={(target: HTMLElement) => {
					if (target.dataset.mounted !== 'yes') {
						target.dataset.mounted = 'yes'
						state.useMounts++
					}
					target.dataset.mountCount = String(state.useMounts)
				}}
				use:marker={state.variant}
			>
				<span data-testid="use-marker-text">{state.variant}</span>
			</div>
			<p data-testid="use-mounts">{state.useMounts}</p>
			<p data-testid="mixin-updates">{state.mixinUpdates}</p>
		</section>
	)
}

function ListItem({ item }: { item: { id: number; label: string } }) {
	return (
		<li data-testid="list-item" use:trackListItem={item}>
			<span class="label">{item.label}</span>
		</li>
	)
}

function NamespacedOptionalDemo(props: { config?: { heading?: string; count?: number } }) {
	return (
		<section data-testid="namespaced-optional">
			<h3 data-testid="namespaced-heading">{props.config?.heading ?? 'No heading'}</h3>
			<p data-testid="namespaced-count">{props.config?.count ?? 0}</p>
		</section>
	)
}

function ForListDemo(_: any, scope: Scope) {
	scope.trackListItem = (target: Node | Node[], value: { id: number; label: string }) => {
		const node = Array.isArray(target) ? target[0] : target
		if (!(node instanceof HTMLElement)) return
		if (!node.dataset.instance) {
			const currentInstance = nextListInstance++
			node.dataset.instance = String(currentInstance)
		}
		node.dataset.id = String(value.id)
		node.dataset.label = value.label
		return () => { }
	}
	return (
		<section data-testid="for-demo">
			<ul data-testid="for-list">
				<for each={state.list}>{(item) => <ListItem item={item} />}</for>
			</ul>
		</section>
	)
}

const RendererFeaturesFixture = () => (
	<main>
		<h1>Renderer Features Fixture</h1>
		<section class="controls">
			<button data-action="toggle-dynamic" onClick={controls.toggleDynamicTag}>
				Toggle Dynamic Tag
			</button>
			<button data-action="toggle-dynamic-mode" onClick={controls.toggleDynamicMode}>
				Toggle Dynamic Mode
			</button>
			<button data-action="feature-toggle" onClick={controls.toggleFeature}>
				Toggle Feature
			</button>
			<button data-action="role-guest" onClick={() => controls.setRole('guest')}>
				Role: Guest
			</button>
			<button data-action="role-member" onClick={() => controls.setRole('member')}>
				Role: Member
			</button>
			<button data-action="role-admin" onClick={() => controls.setRole('admin')}>
				Role: Admin
			</button>
			<button data-action="variant-next" onClick={controls.nextVariant}>
				Next Variant
			</button>
			<button data-action="use-toggle-target" onClick={controls.toggleUseTarget}>
				Toggle Use Target
			</button>
			<button data-action="list-update" onClick={controls.updateFirstLabel}>
				Update First Label
			</button>
			<button data-action="list-remove" onClick={controls.removeFirstItem}>
				Remove First Item
			</button>
			<button data-action="list-add" onClick={() => controls.addItem()}>
				Add Item
			</button>
		</section>
		<section class="output">
			<DynamicDemo />
			<IfDemo />
			<UseDemo />
			<ForListDemo />
			<NamespacedOptionalDemo
				config:heading="Namespaced Optional Demo"
				config:count={state.list.length}
			/>
		</section>
	</main>
)

export default RendererFeaturesFixture

type OptionalNamespacedProps = JSX.LibraryManagedAttributes<
	typeof NamespacedOptionalDemo,
	{ config?: { heading?: string; count?: number } }
>
type AssertTrue<T extends true> = T

type RequiredNamespacedProps = JSX.LibraryManagedAttributes<
	typeof ListItem,
	{ item: { id: number; label: string } }
>
// biome-ignore lint/suspicious/noUnusedIdentifiers -- compile-time namespace type assertions
type _NamespacedTypeAssertions = [
	AssertTrue<Extract<keyof OptionalNamespacedProps, `config:${string}`> extends never ? false : true>,
	OptionalNamespacedProps['config:count'],
	AssertTrue<Extract<keyof RequiredNamespacedProps, `item:${string}`> extends never ? true : false>,
]
declare const _namespacedTypeAssertions: _NamespacedTypeAssertions


