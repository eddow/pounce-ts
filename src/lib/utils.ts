import { effect, isFunction, isObject, memoize, reactive, touched1, unwrap } from 'mutts/src'

type AllOptional<T> = {
	[K in keyof T as undefined extends T[K] ? K : never]-?: T[K]
}

type Defaulted<T, D extends Partial<AllOptional<T>>> = Omit<T, keyof D> & Required<D>

export function extend<
	A extends Record<PropertyKey, any>,
	B extends Record<PropertyKey, any> | null,
>(base: B, added?: A): A & B {
	return reactive(Object.create(base, Object.getOwnPropertyDescriptors(added || {})))
}

export function defaulted<T, D extends Partial<AllOptional<T>>>(
	base: T,
	defaults: D
): Defaulted<T, D> {
	return Object.setPrototypeOf(base, defaults)
}

type PropsDesc<P extends Record<string, any>> = {
	[K in keyof P]:
		| P[K]
		| (() => P[K])
		| {
				get: () => P[K]
				set: (value: P[K]) => void
		  }
}

export function copyObject(into: Record<string, any>, from: Record<string, any>) {
	for (const key of Object.keys(into)) if (!(key in from)) delete into[key]
	return Object.assign(into, from)
}

export function propsInto<P extends Record<string, any>, S extends Record<string, any>>(
	props: PropsDesc<P>,
	into: S = {} as S
): S & P {
	for (const [key, value] of Object.entries(props || {})) {
		// Check for 2-way binding object {get:, set:}
		// Properties must be configurable as the proxy might return a reactive version of it
		if (isObject(value) && value !== null && 'get' in value && 'set' in value) {
			const binding = value as {
				get: () => P[typeof key]
				set: (value: P[typeof key]) => void
			}
			Object.defineProperty(into, key, {
				get: memoize(binding.get),
				set: (newValue) => binding.set(newValue),
				enumerable: true,
				configurable: true,
			})
		} else if (isFunction(value)) {
			// One-way binding
			Object.defineProperty(into, key, {
				get: memoize(value),
				enumerable: true,
				configurable: true,
			})
		} else {
			// Static value
			Object.defineProperty(into, key, {
				value: value,
				enumerable: true,
				writable: false,
				configurable: true,
			})
		}
	}
	return into as S & P
}

export const array = {
	remove<T>(array: T[], item: T) {
		const index = array.indexOf(item)
		if (index !== -1) array.splice(index, 1)
		return true
	},
	filter<T>(array: T[], filter: (item: T) => boolean) {
		for (let i = 0; i < array.length; ) {
			if (!filter(array[i])) {
				array.splice(i, 1)
			} else {
				++i
			}
		}
		return false
	},
}

export function isElement(value: any): value is JSX.Element {
	return value && isObject(value) && 'render' in value
}
// No way to have it recursive and working
type ComposeArgument = Record<string, any> | ((from: any) => Record<string, any>)
export interface Compose {
	<A extends object>(a: A | (() => A)): A
	<A extends object, B extends object>(a: A | (() => A), b: B | ((x: A) => B)): A & B
	<A extends object, B extends object, C extends object>(
		a: A | (() => A),
		b: B | ((x: A) => B),
		c: C | ((x: A & B) => C)
	): A & B & C
	<A extends object, B extends object, C extends object, D extends object>(
		a: A | (() => A),
		b: B | ((x: A) => B),
		c: C | ((x: A & B) => C),
		d: D | ((x: A & B & C) => D)
	): A & B & C & D
	<A extends object, B extends object, C extends object, D extends object, E extends object>(
		a: A | (() => A),
		b: B | ((x: A) => B),
		c: C | ((x: A & B) => C),
		d: D | ((x: A & B & C) => E)
	): A & B & C & D & E
	<A extends object, B extends object, C extends object, D extends object, E extends object, F extends object>(
		a: A | (() => A),
		b: B | ((x: A) => B),
		c: C | ((x: A & B) => C),
		d: D | ((x: A & B & C) => E),
		e: E | ((x: A & B & C & D) => F)
	): A & B & C & D & E & F
	(...args: readonly ComposeArgument[]): Record<string, any>
}

export const compose: Compose = (...args: readonly ComposeArgument[]): Record<string, any> => {
	const result = reactive(Object.create(null))
	const discoveredKeys = new Set<PropertyKey>()

	effect(function composeDiscoveryEffect() {
		for (let i = 0; i < args.length; i++) {
			const arg = args[i]
			if (isObject(arg)) {
				const keys = Reflect.ownKeys(arg)
				for (const key of keys) {
					if (discoveredKeys.has(key)) continue
					discoveredKeys.add(key)

					Object.defineProperty(result, key, {
						get: () => {
							for (let j = args.length - 1; j >= 0; j--) {
								const source = args[j]
								if (isObject(source) && key in source) {
									return (source as Record<string, any>)[key as any]
								}
							}
						},
						set: (v) => {
							for (let j = args.length - 1; j >= 0; j--) {
								const source = args[j]
								if (isObject(source) && key in source) {
									;(source as Record<string, any>)[key as any] = v
									return
								}
							}
						},
						enumerable: true,
						configurable: true,
					})
					touched1(result, { type: 'set', prop: key }, key)
				}
			} else if (isFunction(arg)) {
				const item = (arg as Function)(result)
				if (isObject(item)) {
					const keys = Reflect.ownKeys(item)
					for (const key of keys) {
						if (discoveredKeys.has(key)) continue
						discoveredKeys.add(key)
						Object.defineProperty(result, key, {
							get: () => (item as Record<string, any>)[key as any],
							set: (v) => {
								;(item as Record<string, any>)[key as any] = v
							},
							enumerable: true,
							configurable: true,
						})
						touched1(result, { type: 'set', prop: key }, key)
					}
				}
			}
		}
	})

	return result
}
