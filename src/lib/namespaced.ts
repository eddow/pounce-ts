import { cleanedBy, effect, reactive, touched1 } from 'mutts/src'

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

	const target = reactive(Object.create(null))
	const discoveredKeys = new Set<PropertyKey>()

	const discovery = effect(function restructurePropsDiscoveryEffect() {
		const keys = Reflect.ownKeys(props)
		for (const key of keys) {
			if (discoveredKeys.has(key)) continue
			discoveredKeys.add(key)

			if (typeof key !== 'string') {
				Object.defineProperty(target, key, {
					get: () => props[key as any],
					set: (v) => {
						props[key as any] = v
					},
					enumerable: true,
					configurable: true,
				})
				touched1(target, { type: 'set', prop: key }, key)
				continue
			}

			const match = key.match(/^([^:]+):(.+)$/)
			if (match) {
				const [, namespace, subKey] = match
				if (!Object.hasOwn(target, namespace)) {
					target[namespace] = reactive(Object.create(null))
				}
				const nsTarget = target[namespace]
				Object.defineProperty(nsTarget, subKey, {
					get: () => props[key as any],
					set: (v) => {
						props[key as any] = v
					},
					enumerable: true,
					configurable: true,
				})
				touched1(nsTarget, { type: 'set', prop: subKey }, subKey)
			} else {
				Object.defineProperty(target, key, {
					get: () => props[key as any],
					set: (v) => {
						props[key as any] = v
					},
					enumerable: true,
					configurable: true,
				})
				touched1(target, { type: 'set', prop: key }, key)
			}
		}
	})

	cleanedBy(target, discovery)
	return target
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
