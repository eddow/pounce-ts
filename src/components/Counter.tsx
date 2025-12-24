/**
 * Counter Web Component using inline JSX templating (functional standard)
 */

import { effect, trackEffect, watch } from 'mutts'
import './Counter.scss'
import { compose, Scope } from '../lib'

export default function CounterWebComponent(
	props: {
		count: number
		onCountIncremented?: (newCount: number) => void
		onCountDecremented?: (newCount: number) => void
		onCountReset?: () => void
		onCountChanged?: (newCount: number, oldCount: number) => void
		maxValue?: number
		minValue?: number
		step?: number
		disabled?: boolean
		showSlider?: boolean
		showInput?: boolean
		label?: string
	},
	scope: Scope
) {
	trackEffect((obj, evolution) => {
		console.log(obj, evolution)
	})
	const state = compose(
		{
			maxValue: 100,
			minValue: 0,
			step: 1,
			disabled: false,
			showSlider: true,
			showInput: true,
			label: 'Counter Component (JSX)',
		},
		props
	)

	console.log('🎯 Counter component mounted!', {
		scope,
	})
	effect(() => {
		return () => {
			console.log('👋 Counter component unmounted!', { finalCount: state.count })
		}
	})
	watch(
		() => state.count,
		(v, o) => state.onCountChanged?.(v, o!)
	)

	function increment() {
		state.count = state.count + 1
		state.onCountIncremented?.(state.count)
	}

	function decrement() {
		state.count = state.count - 1
		state.onCountDecremented?.(state.count)
	}

	function reset() {
		state.count = 0
		state.onCountReset?.()
	}

	const counterTextStyle = () => {
		const normalized = Math.max(0, Math.min(100, state.count))
		const red = Math.round(255 * (1 - normalized / 100))
		const green = Math.round(255 * (normalized / 100))
		return `color: rgb(${red}, ${green}, 0); transition: color 0.3s ease;`
	}

	return (
		<>
			<h2>{state.label}</h2>
			<div class="count-display">
				Count:{' '}
				<span class="counter-text" style={counterTextStyle()}>
					{state.count}
				</span>
			</div>
			<div class="message">
				{state.count === 0 ? 'Click the button to increment!' : `Current count: ${state.count}`}
			</div>
			{state.showSlider && (
				<div class="slider-container">
					<label class="slider-label" htmlFor="count-slider">
						Set Count: {state.count}
					</label>
					<input
						type="range"
						id="count-slider"
						class="slider"
						min={state.minValue}
						max={state.maxValue}
						step={state.step}
						value={state.count}
						update:value={(v) => {
							state.count = Number(v)
						}}
						disabled={state.disabled || state.maxValue === state.minValue}
					/>
				</div>
			)}
			{state.showInput && (
				<div class="input-container">
					<label class="input-label" htmlFor="count-input">
						Direct Input:
					</label>
					<input
						type="number"
						id="count-input"
						class="count-input"
						min={state.minValue}
						max={state.maxValue}
						step={state.step}
						value={state.count}
						disabled={state.disabled || state.maxValue === state.minValue}
					/>
				</div>
			)}
			<div class="controls">
				<button
					class="decrement"
					disabled={state.disabled || state.count <= state.minValue}
					onClick={decrement}
				>
					-
				</button>
				<button
					class="reset"
					disabled={state.disabled || state.count === state.minValue}
					onClick={reset}
				>
					Reset
				</button>
				<button
					class="increment"
					disabled={state.disabled || state.count >= state.maxValue}
					onClick={increment}
				>
					+
				</button>
			</div>
		</>
	)
}
