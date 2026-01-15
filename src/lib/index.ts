import { effect, ScopedCallback } from 'mutts'
import { testing } from './debug'
import { bindChildren, Fragment, h, rootScope, type Scope } from './renderer'

function isFunction(value: any): value is Function {
	return typeof value === 'function'
}

function isString(value: any): value is string {
	return typeof value === 'string'
}

export { bindChildren, Fragment, h, type Scope }
export * from './utils'

const applicationRoots = new WeakMap<HTMLElement, ScopedCallback>()

export function bindApp(
	app: JSX.Element,
	container: string | HTMLElement | (() => HTMLElement) = '#app',
	scope: Scope = rootScope
) {
	function actuallyBind() {
		const appElement = isString(container)
			? (document.querySelector(container) as HTMLElement)
			: isFunction(container)
				? container()
				: container
		if (!appElement) {
			console.error('App container not found')
			return
		}
		testing.renderingEvent?.('bind app root', appElement)
		applicationRoots.set(
			appElement,
			effect(() => bindChildren(appElement, app.render(scope)))
		)
	}
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', actuallyBind)
	} else {
		actuallyBind()
	}
}

Object.assign(globalThis, { h, Fragment })
