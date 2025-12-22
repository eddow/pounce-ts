import { isFunction, isObject, memoize, reactive } from 'mutts/src'

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
	return new Proxy(Object.create(null), {
		get(_, prop, receiver) {
			for (let i = args.length - 1; i >= 0; i--) {
				const arg = args[i]
				const source = isFunction(arg) ? arg(receiver) : arg
				if (isObject(source) && prop in source) {
					return (source as any)[prop]
				}
			}
			return undefined
		},
		set(_, prop, value, receiver) {
			for (let i = args.length - 1; i >= 0; i--) {
				const arg = args[i]
				const source = isFunction(arg) ? arg(receiver) : arg
				if (isObject(source) && prop in source) {
					;(source as any)[prop] = value
					return true
				}
			}
			return false
		},
		has(_, prop) {
			for (let i = args.length - 1; i >= 0; i--) {
				const arg = args[i]
				const source = isFunction(arg) ? arg({}) : arg
				if (isObject(source) && prop in source) return true
			}
			return false
		},
		ownKeys() {
			const keys = new Set<string | symbol>()
			for (const arg of args) {
				const source = isFunction(arg) ? arg({}) : arg
				if (isObject(source)) {
					for (const key of Reflect.ownKeys(source)) {
						if (typeof key === 'string' || typeof key === 'symbol') {
							keys.add(key)
						}
					}
				}
			}
			return Array.from(keys)
		},
		getOwnPropertyDescriptor(_, prop) {
			for (let i = args.length - 1; i >= 0; i--) {
				const arg = args[i]
				const source = isFunction(arg) ? arg({}) : arg
				if (isObject(source) && prop in source) {
					const desc = Reflect.getOwnPropertyDescriptor(source, prop)
					if (desc) {
						return {
							enumerable: desc.enumerable,
							configurable: true,
							get: () => (source as any)[prop],
							set: (v: any) => ((source as any)[prop] = v),
						}
					}
				}
			}
			return undefined
		},
	})
}
