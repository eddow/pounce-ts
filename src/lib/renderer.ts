import {
	atomic,
	biDi,
	cleanedBy,
	effect,
	isFunction,
	isNonReactive,
	isNumber,
	isObject,
	isString,
	isSymbol,
	memoize,
	project,
	reactive,
	reduced,
	untracked,
	unwrap,
} from 'mutts/src'
import { namedEffect, testing } from './debug'
import { restructureProps } from './namespaced'
import { ClassInput, classNames, StyleInput, styles } from './styles'
import { extend, isElement, propsInto } from './utils'

export type Scope = Record<PropertyKey, any>
export const rootScope: Scope = reactive(Object.create(null))

function listen(
	target: EventTarget,
	type: string,
	listener: EventListenerOrEventListenerObject,
	options?: boolean | AddEventListenerOptions
) {
	testing.renderingEvent?.('add event listener', target, type, listener, options)
	target.addEventListener(type, listener, options)
	return () => {
		testing.renderingEvent?.('remove event listener', target, type, listener, options)
		target.removeEventListener(type, listener, options)
	}
}

function valuedAttributeGetter(to: any) {
	if (to === true) return () => undefined
	if (isFunction(to)) return memoize(to as (...args: any[]) => unknown)
	if (isObject(to) && 'get' in to) return memoize((to as { get: () => unknown }).get)
	return () => to
}

function forward(tag: string, children: readonly JSX.Element[], scope: Scope) {
	return { tag, render: () => processChildren(children, scope) }
}

/**
 * Custom h() function for JSX rendering - returns a mount function
 */
export const h = (tag: any, props: Record<string, any> = {}, ...children: Child[]): JSX.Element => {
	const categories: Record<PropertyKey, any> = {}
	const node: Record<string, any> = {}

	for (const [key, value] of Object.entries(props || {})) {
		if (typeof key !== 'string') continue
		switch (key) {
			case 'this': {
				const setComponent = value?.set
				if (!isFunction(setComponent)) throw new Error('`this` attribute must be an L-value')
				const mountEntry = (v: any) => {
					setComponent(v)
				}
				categories.mount = [mountEntry, ...(categories.mount || [])]
				break
			}
			case 'else': {
				if (value !== true) throw new Error('`else` attribute must not specify a value')
				categories.else = true
				break
			}
			case 'if': {
				categories.condition = valuedAttributeGetter(value)
				break
			}
			case 'use': {
				const mountEntry = valuedAttributeGetter(value)()
				if (mountEntry !== undefined) {
					categories.mount = [mountEntry, ...(categories.mount || [])]
				}
				break
			}
			default: {
				const match = key.match(/^([^:]+):(.+)$/)
				if (match && match.length === 3 && ['use', 'if', 'when'].includes(match[1])) {
					const [, category, name] = match
					categories[category] ??= {}
					categories[category][name] = valuedAttributeGetter(value)
				} else {
					node[key] = value
				}
			}
		}
	}

	const regularProps = node
	const collectedCategories = categories
	let mountObject: any
	const resolvedTag = isString(tag) ? intrinsicComponentAliases[tag] : tag
	const componentCtor = typeof resolvedTag === 'function' && resolvedTag
	// If we were given a component function directly, render it
	if (componentCtor) {
		// Effect for styles - only updates style container
		mountObject = {
			tag,
			render(scope: Scope = rootScope) {
				// Set scope on the component instance
				const childScope = extend(scope)
				const rendered = project.array([null], () => {
					testing.renderingEvent?.('render component', componentCtor.name)
					const givenProps = reactive(propsInto(regularProps, { children }))
					return untracked(() => componentCtor(restructureProps(givenProps), childScope))
				})
				return processChildren(rendered, childScope)
			},
		}
	} else {
		const element = document.createElement(tag)
		testing.renderingEvent?.('create element', tag, element)
		if (tag === 'input') {
			props.type ??= 'text'
			if (!isString(props.type)) console.warn('input type must be a constant string', props.type)
		}
		function setHtmlProperty(key: string, value: any) {
			const normalizedKey = key.toLowerCase()
			try {
				if (normalizedKey in element) {
					const current = (element as any)[normalizedKey]
					if (typeof current === 'boolean') (element as any)[normalizedKey] = Boolean(value)
					else (element as any)[normalizedKey] = value ?? ''
					return
				}
				if (key in element) {
					const current = (element as any)[key]
					if (typeof current === 'boolean') (element as any)[key] = Boolean(value)
					else (element as any)[key] = value ?? ''
					return
				}
			} catch {
				// Fallback to attribute assignment below
			}
			if (value === undefined || value === false) {
				testing.renderingEvent?.('remove attribute', element, normalizedKey)
				element.removeAttribute(normalizedKey)
				return
			}
			const stringValue = value === true ? '' : String(value)
			testing.renderingEvent?.('set attribute', element, normalizedKey, stringValue)
			element.setAttribute(normalizedKey, stringValue)
		}
		function applyStyleProperties(computedStyles: Record<string, any>) {
			element.removeAttribute('style')
			testing.renderingEvent?.('assign style', element, computedStyles)
			Object.assign(element.style, computedStyles)
		}
		for (const [key, value] of Object.entries(regularProps)) {
			if (key === 'children') continue
			const runCleanup: (() => void)[] = []

			if (typeof key !== 'string') continue

			if (/^on[A-Z]/.test(key)) {
				const eventType = key.slice(2).toLowerCase()
				const stop = namedEffect(`event:${key}`, () => {
					const handlerCandidate = value.get ? value.get() : value()
					if (handlerCandidate === undefined) return
					const registeredEvent = atomic(handlerCandidate)
					return listen(element, eventType, registeredEvent)
				})
				cleanedBy(element, stop)
				continue
			}
			if (key === 'class') {
				const getter = valuedAttributeGetter(value)
				const stop = effect(function classNameEffect() {
					const nextClassName = classNames(getter() as ClassInput)
					testing.renderingEvent?.('set className', element, nextClassName)
					element.className = nextClassName
				})
				cleanedBy(element, stop)
				continue
			}
			if (key === 'style') {
				const getter = valuedAttributeGetter(value)
				const stop = effect(function styleEffect() {
					const computedStyles = styles(getter() as StyleInput)
					applyStyleProperties(computedStyles)
				})
				cleanedBy(element, stop)
				continue
			}
			if (isObject(value) && value !== null && 'get' in value && 'set' in value) {
				const binding = value as {
					get: () => unknown
					set: (v: unknown) => void
				}
				const provide = biDi((v) => setHtmlProperty(key, v), binding)
				if (tag === 'input') {
					switch (element.type) {
						case 'checkbox':
							if (key === 'checked')
								runCleanup.push(listen(element, 'input', () => provide(element.checked)))
							break
						case 'number':
						case 'range':
							if (key === 'value')
								runCleanup.push(listen(element, 'input', () => provide(Number(element.value))))
							break
						default:
							if (key === 'value')
								runCleanup.push(listen(element, 'input', () => provide(element.value)))
							break
					}
				}
				cleanedBy(element, () => {
					setHtmlProperty(key, undefined)
					for (const stop of runCleanup) stop()
				})
				continue
			}
			if (isFunction(value)) {
				const stop = namedEffect(`prop:${key}`, () => {
					setHtmlProperty(key, value())
				})
				cleanedBy(element, stop)
				continue
			}
			if (key === 'innerHTML') {
				if (value !== undefined) {
					const htmlValue = String(value)
					testing.renderingEvent?.('set innerHTML', element, htmlValue)
					element.innerHTML = htmlValue
				}
				cleanedBy(element, () => {
					element.innerHTML = ''
				})
				continue
			}
			setHtmlProperty(key, value)
			cleanedBy(element, () => {
				setHtmlProperty(key, undefined)
			})
		}

		// Create plain HTML element - also return mount object for consistency
		mountObject = {
			tag,
			render(scope: Scope = rootScope) {
				// Render children
				if (children && children.length > 0 && !regularProps?.innerHTML) {
					// Process new children
					const processedChildren = processChildren(children, scope)
					bindChildren(element, processedChildren)
				}

				return element
			},
		}
	}
	return Object.defineProperties(mountObject, Object.getOwnPropertyDescriptors(collectedCategories))
}

const intrinsicComponentAliases = extend(null, {
	scope(props: { children?: any; [key: string]: any }, scope: Scope) {
		effect(function scopeEffect() {
			for (const [key, value] of Object.entries(props)) if (key !== 'children') scope[key] = value
		})
		return props.children
	},
	dynamic(
		props: { tag: string; children?: JSX.Children } & Record<string, any>,
		_scope: Record<PropertyKey, any>
	) {
		const { tag, children, ...rest } = props
		const childArray: Child[] = Array.isArray(children)
			? (children as unknown as Child[])
			: children === undefined
				? []
				: [children as unknown as Child]
		return h(tag, rest, ...childArray)
	},

	for<T>(
		props: {
			each: readonly T[]
			children: (item: T, oldItem?: JSX.Element) => JSX.Element
		},
		scope: Scope
	) {
		const body = Array.isArray(props.children) ? props.children[0] : props.children
		const cb = body() as (item: T, oldItem?: JSX.Element) => JSX.Element
		const memoized = memoize(cb as (item: T & object) => JSX.Element)
		const eachGetter = memoize(() => (props as any).each as readonly T[] | undefined)
		const compute = memoize(() => {
			const each = eachGetter()
			if (!each) return [] as readonly JSX.Element[]
			return isNonReactive(each)
				? (each.map((item) => cb(item)) as readonly JSX.Element[])
				: (project(each, ({ value: item, old }) => {
						return isObject(item) || isSymbol(item) || isFunction(item)
							? memoized(item as T & object)
							: cb(item, old as JSX.Element | undefined)
					}) as readonly JSX.Element[])
		})
		return forward('for', [compute as any] as any, scope)
	},
})
export const Fragment = (props: { children: JSX.Element[] }, scope: Scope) =>
	forward('fragment', props.children, scope)
export function bindChildren(parent: Node, newChildren: Node | readonly Node[] | undefined) {
	return effect(function redraw() {
		let added = 0
		let removed = 0
		// Replace children
		let newIndex = 0
		if (!newChildren) newChildren = []
		if (!Array.isArray(newChildren)) newChildren = [newChildren] as readonly Node[]

		// Iterate through newChildren and sync with live DOM
		while (newIndex < newChildren.length) {
			const newChild = unwrap(newChildren[newIndex])
			const oldChild = parent.childNodes[newIndex]

			if (oldChild === newChild) {
				// Node is already in the correct place → skip
				newIndex++
			} else {
				// Check if newChild exists later in the DOM
				let found = false
				for (let i = newIndex + 1; i < parent.childNodes.length; i++) {
					if (parent.childNodes[i] === newChild) {
						// Move the node to the correct position
						added++
						parent.insertBefore(newChild, oldChild)
						found = true
						break
					}
				}

				if (!found) {
					// Insert new node (or move from outside)
					added++
					parent.insertBefore(newChild, oldChild)
				}
				newIndex++
			}
		}

		// Remove extra old nodes (now safe because we're using live childNodes)
		while (parent.childNodes.length > newChildren.length) {
			removed++
			parent.removeChild(parent.lastChild!)
		}
		testing.renderingEvent?.(`reconcileChildren (+${added} -${removed})`, parent, newChildren)
	})
}

/**
 * Node descriptor - what a function can return
 */
export type NodeDesc = Node | string | number

/**
 * A child can be:
 * - A DOM node
 * - A reactive function that returns intermediate values
 * - An array of children (from .map() operations)
 */
export type Child = NodeDesc | (() => Intermediates) | JSX.Element | Child[]

/**
 * Intermediate values - what functions return before final processing
 */
export type Intermediates = NodeDesc | NodeDesc[]

const render = memoize((renderer: JSX.Element, scope: Scope) => {
	const partial = renderer.render(scope)
	if (renderer.mount)
		for (const mount of renderer.mount)
			untracked(() => mount(partial))
	if (renderer.use)
		for (const [key, value] of Object.entries(renderer.use) as [string, any])
			effect(() => {
				if (!isFunction(scope[key])) throw new Error(`${key} in scope is not a function`)
				return scope[key](partial, value, scope)
			})
	return partial
})

/**
 * Process children arrays, handling various child types including:
 * - Direct nodes
 * - Reactive functions
 * - Arrays of children
 * - Variable arrays from .map() operations
 *
 * Returns a flat array of DOM nodes suitable for replaceChildren()
 */
export function processChildren(children: readonly Child[], scope: Scope): readonly Node[] {
	const renderers = project(children, ({ get }) => {
		const child = get()
		return isFunction(child) ? (child as () => Intermediates)() : child
	})
	const conditioned = reduced(renderers, (child, previous: { had?: true }) => {
		if (
			isElement(child) &&
			('condition' in child || 'if' in child || 'when' in child || 'else' in child)
		) {
			if (child.else && previous.had) return []
			if ('condition' in child && !child.condition) return []
			if (child.if)
				for (const [key, value] of Object.entries(child.if) as [string, any])
					if (scope[key] !== value) return []
			if (child.when)
				for (const [key, value] of Object.entries(child.when) as [string, any])
					if (!scope[key](value)) return []
			previous.had = true
		}
		return [child]
	})

	const rendered = project(
		conditioned,
		({ value: partial }): Node | readonly Node[] | false | undefined => {
			const nodes = isElement(partial) ? render(partial, scope) : partial
			if (!nodes && !isNumber(nodes)) return
			if (Array.isArray(nodes)) return processChildren(nodes, scope)
			else if (nodes instanceof Node) return unwrap(nodes)
			else if (isString(nodes) || isNumber(nodes)) {
				const textNodeValue = String(nodes)
				testing.renderingEvent?.('create text node', textNodeValue)
				return document.createTextNode(textNodeValue)
			}
		}
	)
	// Second loop: Flatten the temporary results into final Node[]
	return reduced(
		rendered,
		(item) =>
			(Array.isArray(item)
				? (item.filter(Boolean) as Node[])
				: item
					? [item]
					: []) as readonly Node[]
	)
}
