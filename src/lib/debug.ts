import { effect, getActiveEffect, reactiveOptions } from 'mutts/src'

export function nf<T extends Function>(name: string, fn: T): T {
	Object.defineProperty(fn, 'name', { value: name })
	return fn
}
export function namedEffect(name: string, fn: () => void): () => void {
	if (!getActiveEffect()) {
		console.warn(`TL;DR: Define reactive behaviors in components, not in the root code.
Reactive behavior should only occur within effects.`)
	}
	return effect(nf(name, fn))
}
export class AssertionError extends Error {
	constructor(message: string) {
		super(`Assertion failure: ${message}`)
		this.name = 'AssertionError'
	}
}
export function assert(condition: any, message: string): asserts condition {
	if (!condition) throw new AssertionError(message)
}
export function defined<T>(value: T | undefined, message = 'Value is defined'): T {
	assert(value !== undefined, message)
	return value
}

export const traces: Record<string, typeof console | undefined> = {}
const counters: number[] = []
const debugMutts = false
if (debugMutts) {
	Object.assign(reactiveOptions, {
		garbageCollected(fn: Function) {
			console.log('garbageCollected:', fn.name || fn.toString())
		},
		chain(targets: Function[], caller?: Function) {
			console.groupCollapsed(
				caller
					? `${caller.name} -> ${targets.map((t) => t.name || t.toString()).join(', ')}`
					: `-> ${targets.map((t) => t.name || t.toString()).join(', ')}`
			)
			if (caller) console.log('caller:', caller)
			console.log('targets:', targets)
			console.groupEnd()
			counters[0]++
		},
		beginChain(targets: Function[]) {
			console.groupCollapsed('begin', targets)
			counters.unshift(0)
		},
		endChain() {
			console.groupEnd()
			console.log('Effects:', counters.shift())
		} /*
		touched(obj: any, evolution: Evolution, props?: any[], deps?: Set<ScopedCallback>) {
			console.groupCollapsed('touched', obj, evolution)
			console.log('props:', props)
			console.log('deps:', deps)
			console.groupEnd()
		},
		enter(fn: Function) {
			console.group('enter', fn.name || fn.toString())
			console.log('effect:', fn)
		},
		leave() {
			console.groupEnd()
		},*/,
	})
}

reactiveOptions.maxEffectChain = 5000
reactiveOptions.maxEffectReaction = 'debug'
reactiveOptions.instanceMembers = false

export const testing: {
	renderingEvent?: (evt: string, ...args: any[]) => void
} = {}
/*
testing.renderingEvent = (evt: string, ...args: any[]) => {
	console.log('%c renderingEvent', 'color: blue;', evt, args)
}*/
