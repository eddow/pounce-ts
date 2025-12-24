import {} from 'mutts'

const NAME_SPACED_SYMBOL = Symbol.for('pounceTS.nameSpaced')
// TODO: check and fix the given prop with namespaced parts - which comes first, how it ends up
type UnionToIntersection<U> = (U extends unknown ? (arg: U) => void : never) extends (
	arg: infer R
) => void
	? R
	: never

type NamespacedEntries<
	Props extends Record<string, any>,
	Key extends keyof Props & string,
> = Key extends 'children'
	? {}
	: undefined extends Props[Key]
		? {} extends Props[Key]
			? NonNullable<Props[Key]> extends readonly any[]
				? {}
				: NonNullable<Props[Key]> extends (...args: any[]) => any
					? {}
					: NonNullable<Props[Key]> extends Record<string, any>
						? {
								[SubKey in keyof NonNullable<Props[Key]> &
									string as `${Key}:${SubKey}`]?: NonNullable<Props[Key]>[SubKey]
							}
						: {}
			: {}
		: {}

type EmptyObjectIfNever<T> = [T] extends [never] ? {} : T

export type NameSpacedProps<Props extends Record<string, any>> = Props &
	EmptyObjectIfNever<
		UnionToIntersection<
			{
				[K in keyof Props & string]: NamespacedEntries<Props, K>
			}[keyof Props & string]
		>
	>

export type NameSpacedComponent<Component extends (...args: any[]) => any> = Component extends (
	props: infer Props,
	...rest: infer Rest
) => infer Return
	? (
			props: Props extends Record<string, any> ? NameSpacedProps<Props> : Props,
			...rest: Rest
		) => Return
	: Component

/**
 * Utility to restructure namespaced properties into nested objects.
 * For example: {'user:name': 'John', 'user:age': 30} becomes {user: {name: 'John', age: 30}}
 * This is used for components that want to receive namespaced props.
 */
export function restructureProps<Props extends Record<string, any> | undefined>(props: Props) {
	if (!props || typeof props !== 'object') return props

	const source = props
	const namespaces = new Map<string, any>()

	function getNamespace(ns: string) {
		let proxy = namespaces.get(ns)
		if (!proxy) {
			proxy = new Proxy(source, {
				get(target, prop, receiver) {
					if (typeof prop === 'string') {
						const fullname = `${ns}:${prop}`
						return Reflect.get(target, fullname, receiver)
					}
					return Reflect.get(target, prop, receiver)
				},
				set(target, prop, value, receiver) {
					if (typeof prop === 'string') {
						const fullname = `${ns}:${prop}`
						return Reflect.set(target, fullname, value, receiver)
					}
					return Reflect.set(target, prop, value, receiver)
				},
				has(target, prop) {
					if (typeof prop === 'string') {
						const fullname = `${ns}:${prop}`
						return Reflect.has(target, fullname)
					}
					return Reflect.has(target, prop)
				},
				ownKeys(target) {
					const prefix = `${ns}:`
					return Reflect.ownKeys(target)
						.filter((k) => typeof k === 'string' && k.startsWith(prefix))
						.map((k) => (k as string).slice(prefix.length))
				},
				getOwnPropertyDescriptor(target, prop) {
					if (typeof prop === 'string') {
						const fullname = `${ns}:${prop}`
						const desc = Reflect.getOwnPropertyDescriptor(target, fullname)
						if (desc) return desc
					}
					return Reflect.getOwnPropertyDescriptor(target, prop)
				},
			})
			namespaces.set(ns, proxy)
		}
		return proxy
	}

	return new Proxy(source, {
		get(target, prop, receiver) {
			// Direct access (including symbols)
			if (Reflect.has(target, prop)) {
				return Reflect.get(target, prop, receiver)
			}

			// Namespace access
			if (typeof prop === 'string') {
				const prefix = `${prop}:`
				const keys = Reflect.ownKeys(target)
				if (keys.some((k) => typeof k === 'string' && k.startsWith(prefix))) {
					return getNamespace(prop)
				}
			}

			return Reflect.get(target, prop, receiver)
		},
		has(target, prop) {
			if (Reflect.has(target, prop)) return true
			if (typeof prop === 'string') {
				const prefix = `${prop}:`
				return Reflect.ownKeys(target).some((k) => typeof k === 'string' && k.startsWith(prefix))
			}
			return false
		},
		ownKeys(target) {
			const keys = new Set(Reflect.ownKeys(target))
			for (const key of keys) {
				if (typeof key === 'string') {
					const match = key.match(/^([^:]+):(.+)$/)
					if (match) {
						keys.delete(key)
						keys.add(match[1])
					}
				}
			}
			return Array.from(keys) as (string | symbol)[]
		},
		getOwnPropertyDescriptor(target, prop) {
			const desc = Reflect.getOwnPropertyDescriptor(target, prop)
			if (desc) return desc

			if (typeof prop === 'string') {
				const prefix = `${prop}:`
				const keys = Reflect.ownKeys(target)
				if (keys.some((k) => typeof k === 'string' && k.startsWith(prefix))) {
					return {
						enumerable: true,
						configurable: true,
						value: getNamespace(prop),
					}
				}
			}
			return undefined
		},
	})
}

export function isNameSpacedComponent(component: unknown): boolean {
	return Boolean(
		component && typeof component === 'function' && (component as any)[NAME_SPACED_SYMBOL]
	)
}

export function nameSpaced<Component extends (...args: any[]) => any>(
	component: Component
): NameSpacedComponent<Component> {
	if (typeof component !== 'function') return component as NameSpacedComponent<Component>
	if (isNameSpacedComponent(component)) return component as NameSpacedComponent<Component>

	const wrapped = ((props: any, ...rest: any[]) => {
		const normalized = restructureProps(props)
		return component(normalized, ...rest)
	}) as NameSpacedComponent<Component>

	Object.defineProperty(wrapped, NAME_SPACED_SYMBOL, {
		value: true,
		enumerable: false,
		configurable: false,
	})
	Object.defineProperty(wrapped, '__original', {
		value: component,
		enumerable: false,
		configurable: false,
	})
	Object.assign(wrapped, component)
	Object.setPrototypeOf(wrapped, Object.getPrototypeOf(component))

	return wrapped
}

export function ensureNameSpaced<Component extends (...args: any[]) => any>(
	component: Component
): NameSpacedComponent<Component> {
	return nameSpaced(component)
}
