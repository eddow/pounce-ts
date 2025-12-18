import { ScopedCallback } from 'mutts/src'
import { Scope } from 'src/lib'
import type { NameSpacedProps } from '../lib/namespaced'
import type { StyleInput } from '../lib/styles'

declare global {
	const h: (type: any, props?: any, ...children: any[]) => JSX.Element
	const Fragment: (props: { children: any }) => any
	type ComponentFunction = (props: any, scope: Scope) => JSX.Element | null | undefined
	namespace JSX {
		// biome-ignore lint/suspicious/noConfusingVoidType: Void ends up automatically
		type Child = Node | string | number | JSX.Element | void | false | null | undefined
		interface ChildrenCollection {
			readonly __pounce_children_collection: unique symbol
			readonly length?: never
			[n: number]: never
		}
		type Children = Child | readonly Children[] | ChildrenCollection

		// Base interface for common HTML attributes
		type BaseHTMLAttributes<N extends Node = HTMLElement> = JSX.IntrinsicThisAttributes<N> &
			GlobalHTMLAttributes &
			MouseReactiveHTMLAttributes & {
				children?: Children
				autoFocus?: boolean
				// Additional common non-mouse events
				onFocus?: (event: FocusEvent) => void
				onBlur?: (event: FocusEvent) => void
				onKeydown?: (event: KeyboardEvent) => void
				onKeyup?: (event: KeyboardEvent) => void
				onKeypress?: (event: KeyboardEvent) => void
			}
		// Specify the property name used for JSX children
		interface ElementChildrenAttribute {
			children: any
		}
		type Element = {
			render(scope?: Record<PropertyKey, any>): Node | readonly Node[]
			mount?: ((target: Node | readonly Node[]) => ScopedCallback)[]
			condition?: any
			else?: true
			// categories
			when?: Record<string, any> // when:condition
			if?: Record<string, any> // if:value
			use?: Record<string, any> // use:callback
		}
		interface ElementClass {
			template: any
		}
		type ElementType = string | ComponentFunction

		type WithNameSpacedProps<Props> = Props extends Record<string, any>
			? NameSpacedProps<Props>
			: Props

		type ExtractComponentProps<C, Props> = C extends { props: infer ExplicitProps }
			? ExplicitProps
			: C extends (props: infer InferredProps, ...args: any[]) => any
				? InferredProps
				: Props

		type LibraryManagedAttributes<Component, Props> = ComponentIntrinsicAttributes<Component> &
			(Props extends Record<string, any> ? NameSpacedProps<Props> : Props)

		type RenderOutput<T> = T extends JSX.Element ? ReturnType<T['render']> : T

		type ElementResult<T> = RenderOutput<T> extends infer R
			? R extends readonly Node[]
				? readonly Node[]
				: R extends Node
					? R
					: R extends null | undefined
						? undefined
						: Node | readonly Node[]
			: Node | readonly Node[]

		type ThisBinding<T> = ElementResult<T> | undefined

		type ComponentIntrinsicAttributes<C> = C extends (...args: any[]) => any
			? { this?: ThisBinding<ReturnType<C>> }
			: {}

		// Override the default JSX children handling
		// Allow any children type so components can accept function-as-children
		type IntrinsicThisAttributes<N extends Node | readonly Node[] | undefined> =
			| { children: Children }
			| ({
					children?: any
					// Meta: capture component reference on render
					this?: ThisBinding<N>
					if?: any
					use?: (target: N) => void
					else?: true
					when?: any
			  } & {
					[K in `use:${string}`]: any
			  } & {
					[K in `if:${string}`]?: any
			  } & {
					[K in `when:${string}`]?: any
			  })

		type ElementIntrinsicAttributes<N extends Node | readonly Node[] | undefined> =
			IntrinsicThisAttributes<N>

		type IntrinsicAttributes = IntrinsicThisAttributes<Node | readonly Node[] | undefined>

		// Custom class type for conditional classes
		type ClassValue = string | ClassValue[] | Record<string, boolean> | null | undefined

		type Booleanish = boolean | 'true' | 'false'

		type AriaAttributesBase = {
			'aria-activeDescendant'?: string
			'aria-atomic'?: Booleanish
			'aria-autoComplete'?: 'none' | 'inline' | 'list' | 'both'
			'aria-brailleLabel'?: string
			'aria-brailleRoleDescription'?: string
			'aria-busy'?: Booleanish
			'aria-checked'?: Booleanish | 'mixed'
			'aria-colCount'?: number
			'aria-colIndex'?: number
			'aria-colIndexText'?: string
			'aria-colSpan'?: number
			'aria-controls'?: string
			'aria-current'?: Booleanish | 'page' | 'step' | 'location' | 'date' | 'time'
			'aria-describedBy'?: string
			'aria-description'?: string
			'aria-details'?: string
			'aria-disabled'?: Booleanish
			'aria-dropEffect'?: 'none' | 'copy' | 'execute' | 'link' | 'move' | 'popup'
			'aria-errorMessage'?: string
			'aria-expanded'?: Booleanish
			'aria-flowTo'?: string
			'aria-grabbed'?: Booleanish
			'aria-hasPopup'?: Booleanish | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog'
			'aria-hidden'?: Booleanish
			'aria-invalid'?: Booleanish | 'grammar' | 'spelling'
			'aria-keyShortcuts'?: string
			'aria-label'?: string
			'aria-labelledBy'?: string
			'aria-level'?: number
			'aria-live'?: 'off' | 'assertive' | 'polite'
			'aria-modal'?: Booleanish
			'aria-multiLine'?: Booleanish
			'aria-multiSelectable'?: Booleanish
			'aria-orientation'?: 'horizontal' | 'vertical'
			'aria-owns'?: string
			'aria-placeholder'?: string
			'aria-posInSet'?: number
			'aria-pressed'?: Booleanish | 'mixed'
			'aria-readOnly'?: Booleanish
			'aria-relevant'?: 'additions' | 'additions text' | 'all' | 'removals' | 'text'
			'aria-required'?: Booleanish
			'aria-roleDescription'?: string
			'aria-rowCount'?: number
			'aria-rowIndex'?: number
			'aria-rowIndexText'?: string
			'aria-rowSpan'?: number
			'aria-selected'?: Booleanish
			'aria-setSize'?: number
			'aria-sort'?: 'none' | 'ascending' | 'descending' | 'other'
			'aria-valueMax'?: number
			'aria-valueMin'?: number
			'aria-valueNow'?: number
			'aria-valueText'?: string
		}

		type AriaAttributes = AriaAttributesBase & {
			[K in Exclude<`aria-${string}`, keyof AriaAttributesBase>]?:
				| string
				| number
				| boolean
				| undefined
		}

		type DataAttributes = {
			[K in `data-${string}`]?: string | number | boolean | null | undefined
		}

		// Common, reusable HTML attributes shared by most elements
		type GlobalHTMLAttributes = AriaAttributes &
			DataAttributes & {
				// Global attributes
				id?: string
				class?: ClassValue
				style?: string | StyleInput
				title?: string
				lang?: string
				dir?: 'ltr' | 'rtl' | 'auto'
				hidden?: boolean
				tabIndex?: number
				accessKey?: string
				contentEditable?: boolean | 'true' | 'false' | 'inherit'
				spellCheck?: boolean | 'true' | 'false'
				translate?: 'yes' | 'no'
				autoCapitalize?: 'off' | 'none' | 'on' | 'sentences' | 'words' | 'characters'
				autoCorrect?: 'on' | 'off'
				autoComplete?: string
				enterKeyHint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send'
				inputMode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search'
				is?: string
				itemId?: string
				itemProp?: string
				itemRef?: string
				itemScope?: boolean
				itemType?: string
				role?: string
			}

		// Reusable mouse event handlers for DOM elements
		type MouseReactiveHTMLAttributes = {
			onClick?: (event: MouseEvent) => void
			onMousedown?: (event: MouseEvent) => void
			onMouseup?: (event: MouseEvent) => void
			onMouseover?: (event: MouseEvent) => void
			onMouseout?: (event: MouseEvent) => void
			onMouseenter?: (event: MouseEvent) => void
			onMouseleave?: (event: MouseEvent) => void
			onMousemove?: (event: MouseEvent) => void
			onContextmenu?: (event: MouseEvent) => void
			onDblclick?: (event: MouseEvent) => void
		}

		interface InputNumber {
			type: 'number' | 'range'
			value?: number
			min?: number
			max?: number
			step?: number
			'update:value'?(value: number): void
		}
		interface InputString {
			type?:
				| 'text'
				| 'password'
				| 'email'
				| 'tel'
				| 'url'
				| 'search'
				| 'date'
				| 'time'
				| 'datetime-local'
				| 'month'
				| 'week'
				| 'color'
				| 'radio'
				| 'file'
				| 'hidden'
				| 'submit'
				| 'reset'
				| 'button'
			value?: string
			'update:value'?(value: string): void
		}
		interface InputBoolean {
			type: 'checkbox' | 'radio'
			checked?: boolean
			value?: string
			'update:checked'?(checked?: boolean): void
		}
		// Provide default element-specific attributes for all known HTML tags
		type HTMLTagElementsMap = {
			[K in keyof HTMLElementTagNameMap]?: BaseHTMLAttributes<HTMLElementTagNameMap[K]>
		}

		interface ForElementProps<T = any> {
			each: readonly T[]
			children: (item: T, oldItem?: JSX.Element) => JSX.Element | null | undefined | false
		}

		interface IntrinsicElements extends HTMLTagElementsMap {
			dynamic: BaseHTMLAttributes<HTMLElement> & {
				tag: HTMLElementTag | ComponentFunction
				children?: Children
				[key: string]: any
			}
			scope: ElementIntrinsicAttributes<Node | Node[]> & {
				children?: Children
				[key: string]: any
			}
			for: ElementIntrinsicAttributes<Node[]> & ForElementProps
			// Form Elements
			input: BaseHTMLAttributes<HTMLInputElement> &
				(InputNumber | InputString | InputBoolean) & {
					name?: string
					form?: string
					formAction?: string
					formEncType?: string
					formMethod?: 'get' | 'post' | 'dialog'
					formNoValidate?: boolean
					formTarget?: string
					placeholder?: string
					disabled?: boolean
					required?: boolean
					readOnly?: boolean
					min?: number | string
					max?: number | string
					step?: number | string
					size?: number
					multiple?: boolean
					accept?: string
					list?: string
					capture?: boolean | 'user' | 'environment'
					autoComplete?: string
					autoCorrect?: 'on' | 'off'
					autoCapitalize?: 'off' | 'none' | 'on' | 'sentences' | 'words' | 'characters'
					spellCheck?: boolean | 'true' | 'false'
					pattern?: string
					maxLength?: number
					minLength?: number
					dirName?: string
					// Events
					onInput?: (event: Event) => void
					onChange?: (event: Event) => void
					onSelect?: (event: Event) => void
					onInvalid?: (event: Event) => void
					onReset?: (event: Event) => void
					onSearch?: (event: Event) => void
				}

			textarea: BaseHTMLAttributes<HTMLTextAreaElement> & {
				value?: string
				placeholder?: string
				disabled?: boolean
				required?: boolean
				readOnly?: boolean
				name?: string
				form?: string
				rows?: number
				cols?: number
				maxLength?: number
				minLength?: number
				dirName?: string
				wrap?: 'soft' | 'hard' | 'off'
				autoComplete?: string
				autoCorrect?: 'on' | 'off'
				autoCapitalize?: 'off' | 'none' | 'on' | 'sentences' | 'words' | 'characters'
				spellCheck?: boolean | 'true' | 'false'
				// Events
				onInput?: (event: Event) => void
				onChange?: (event: Event) => void
				onSelect?: (event: Event) => void
				onInvalid?: (event: Event) => void
			}

			select: BaseHTMLAttributes<HTMLSelectElement> & {
				value?: any
				disabled?: boolean
				required?: boolean
				name?: string
				form?: string
				multiple?: boolean
				size?: number
				autoComplete?: string
				// Events
				onChange?: (event: Event) => void
				onSelect?: (event: Event) => void
				onInvalid?: (event: Event) => void
			}

			button: BaseHTMLAttributes<HTMLButtonElement> & {
				type?: 'button' | 'submit' | 'reset'
				disabled?: boolean
				autoFocus?: boolean
				form?: string
				formAction?: string
				formEnctype?: string
				formMethod?: string
				formNoValidate?: boolean
				formTarget?: string
				name?: string
				value?: string
			}

			form: BaseHTMLAttributes<HTMLFormElement> & {
				action?: string
				method?: 'get' | 'post' | 'put' | 'delete' | 'patch'
				enctype?: string
				autoComplete?: string
				noValidate?: boolean
				target?: string
				name?: string
				accept?: string
				acceptCharset?: string
				// Events
				onSubmit?: (event: SubmitEvent) => void
				onReset?: (event: Event) => void
				onInvalid?: (event: Event) => void
			}

			label: BaseHTMLAttributes<HTMLLabelElement> & {
				htmlFor?: string
				form?: string
			}

			fieldset: BaseHTMLAttributes<HTMLFieldSetElement> & {
				disabled?: boolean
				form?: string
				name?: string
			}

			legend: BaseHTMLAttributes<HTMLLegendElement> & {}

			// Media Elements
			img: BaseHTMLAttributes<HTMLImageElement> & {
				src?: string
				alt?: string
				width?: number | string
				height?: number | string
				crossOrigin?: 'anonymous' | 'use-credentials'
				useMap?: string
				isMap?: boolean
				loading?: 'lazy' | 'eager'
				decoding?: 'sync' | 'async' | 'auto'
				// Events
				onLoad?: (event: Event) => void
				onError?: (event: Event) => void
				onAbort?: (event: Event) => void
			}

			video: BaseHTMLAttributes<HTMLVideoElement> & {
				src?: string
				poster?: string
				preload?: 'none' | 'metadata' | 'auto'
				autoplay?: boolean
				loop?: boolean
				muted?: boolean
				controls?: boolean
				width?: number | string
				height?: number | string
				crossOrigin?: 'anonymous' | 'use-credentials'
				playsInline?: boolean
				// Events
				onLoadstart?: (event: Event) => void
				onLoadeddata?: (event: Event) => void
				onLoadedmetadata?: (event: Event) => void
				onCanplay?: (event: Event) => void
				onCanplaythrough?: (event: Event) => void
				onPlay?: (event: Event) => void
				onPlaying?: (event: Event) => void
				onPause?: (event: Event) => void
				onEnded?: (event: Event) => void
				onError?: (event: Event) => void
				onAbort?: (event: Event) => void
				onEmptied?: (event: Event) => void
				onStalled?: (event: Event) => void
				onSuspend?: (event: Event) => void
				onWaiting?: (event: Event) => void
				onDurationchange?: (event: Event) => void
				onTimeupdate?: (event: Event) => void
				onProgress?: (event: Event) => void
				onRatechange?: (event: Event) => void
				onVolumechange?: (event: Event) => void
				onSeeked?: (event: Event) => void
				onSeeking?: (event: Event) => void
			}

			audio: BaseHTMLAttributes<HTMLAudioElement> & {
				src?: string
				preload?: 'none' | 'metadata' | 'auto'
				autoplay?: boolean
				loop?: boolean
				muted?: boolean
				controls?: boolean
				crossOrigin?: 'anonymous' | 'use-credentials'
				// Events
				onLoadstart?: (event: Event) => void
				onLoadeddata?: (event: Event) => void
				onLoadedmetadata?: (event: Event) => void
				onCanplay?: (event: Event) => void
				onCanplaythrough?: (event: Event) => void
				onPlay?: (event: Event) => void
				onPlaying?: (event: Event) => void
				onPause?: (event: Event) => void
				onEnded?: (event: Event) => void
				onError?: (event: Event) => void
				onAbort?: (event: Event) => void
				onEmptied?: (event: Event) => void
				onStalled?: (event: Event) => void
				onSuspend?: (event: Event) => void
				onWaiting?: (event: Event) => void
				onDurationchange?: (event: Event) => void
				onTimeupdate?: (event: Event) => void
				onProgress?: (event: Event) => void
				onRatechange?: (event: Event) => void
				onVolumechange?: (event: Event) => void
				onSeeked?: (event: Event) => void
				onSeeking?: (event: Event) => void
			}

			// Interactive Elements
			a: BaseHTMLAttributes<HTMLAnchorElement> & {
				href?: string
				target?: '_blank' | '_self' | '_parent' | '_top' | string
				rel?: string
				download?: string
				hrefLang?: string
				type?: string
				referrerPolicy?: string
			}

			// Additional HTML elements with notable attributes
			dialog: BaseHTMLAttributes<HTMLDialogElement> & {
				open?: boolean
				onCancel?: (event: Event) => void
				onClose?: (event: Event) => void
			}

			details: BaseHTMLAttributes<HTMLDetailsElement> & {
				open?: boolean
				onToggle?: (event: Event) => void
			}

			track: BaseHTMLAttributes<HTMLTrackElement> & {
				default?: boolean
				kind?: 'subtitles' | 'captions' | 'descriptions' | 'chapters' | 'metadata'
				src?: string
				srclang?: string
				label?: string
			}

			script: BaseHTMLAttributes<HTMLScriptElement> & {
				src?: string
				type?: string
				async?: boolean
				defer?: boolean
				nomodule?: boolean
				crossOrigin?: 'anonymous' | 'use-credentials'
				integrity?: string
				referrerPolicy?: string
				onLoad?: (event: Event) => void
				onError?: (event: Event) => void
			}

			iframe: BaseHTMLAttributes<HTMLIFrameElement> & {
				src?: string
				srcDoc?: string
				name?: string
				width?: number | string
				height?: number | string
				allow?: string
				sandbox?: string
				loading?: 'eager' | 'lazy'
				referrerPolicy?: string
				allowFullScreen?: boolean
				onLoad?: (event: Event) => void
				onError?: (event: Event) => void
			}

			ol: BaseHTMLAttributes<HTMLOListElement> & {
				reversed?: boolean
				start?: number
				type?: '1' | 'a' | 'A' | 'i' | 'I'
			}

			option: BaseHTMLAttributes<HTMLOptionElement> & {
				disabled?: boolean
				selected?: boolean
				label?: string
				value?: string
			}

			optgroup: BaseHTMLAttributes<HTMLOptGroupElement> & {
				disabled?: boolean
				label?: string
			}

			progress: BaseHTMLAttributes<HTMLProgressElement> & {
				value?: number | string
				max?: number | string
			}

			meter: BaseHTMLAttributes<HTMLMeterElement> & {
				value?: number | string
				min?: number | string
				max?: number | string
				low?: number | string
				high?: number | string
				optimum?: number | string
			}

			link: BaseHTMLAttributes<HTMLLinkElement> & {
				rel?: string
				href?: string
				as?: string
				crossOrigin?: 'anonymous' | 'use-credentials'
				disabled?: boolean
				fetchPriority?: 'high' | 'low' | 'auto'
				imageSizes?: string
				imageSrcSet?: string
				media?: string
				referrerPolicy?: string
				integrity?: string
				type?: string
				sizes?: string
				onLoad?: (event: Event) => void
				onError?: (event: Event) => void
			}

			source: BaseHTMLAttributes<HTMLSourceElement> & {
				src?: string
				type?: string
				srcSet?: string
				sizes?: string
				media?: string
			}

			area: BaseHTMLAttributes<HTMLAreaElement> & {
				alt?: string
				coords?: string
				download?: string | boolean
				href?: string
				rel?: string
				shape?: 'rect' | 'circle' | 'poly' | 'default'
				target?: string
				referrerPolicy?: string
			}

			map: BaseHTMLAttributes<HTMLMapElement> & {
				name?: string
			}

			canvas: BaseHTMLAttributes<HTMLCanvasElement> & {
				width?: number | string
				height?: number | string
			}

			col: BaseHTMLAttributes<HTMLTableColElement> & { span?: number }
			colgroup: BaseHTMLAttributes<HTMLTableColElement> & { span?: number }
			/* thead/tbody/tfoot/tr omitted since they add no extra attributes */
			th: BaseHTMLAttributes<HTMLTableCellElement> & {
				abbr?: string
				colSpan?: number
				rowSpan?: number
				headers?: string
				scope?: 'row' | 'col' | 'rowgroup' | 'colgroup' | 'auto'
			}
			td: BaseHTMLAttributes<HTMLTableCellElement> & {
				colSpan?: number
				rowSpan?: number
				headers?: string
			}

			slot: BaseHTMLAttributes<HTMLSlotElement> & { name?: string }
		}
		type HTMLAttributes<tag extends keyof HTMLElementTagNameMap> = Omit<
			IntrinsicElements[tag],
			'children'
		>
		type HTMLElementTag = keyof HTMLElementTagNameMap
	}
}

export type { JSX }
