import { type NodePath, type PluginObj, types as t } from '@babel/core'
import { type JSXElement } from '@babel/types'

interface BabelPluginOptions {
	types: typeof t
}

interface BabelPluginState {
	opts?: Record<string, any>
	file?: {
		opts: {
			filename?: string
			cwd?: string
		}
	}
}

function toPosixPath(filepath: string): string {
	return filepath.replace(/\\/g, '/')
}

function splitPathParts(filepath: string): string[] {
	return filepath.split('/').filter(Boolean)
}

function computeRelativeImport(fromFilename: string, targetFilename: string): string {
	const fromParts = splitPathParts(fromFilename)
	const targetParts = splitPathParts(targetFilename)
	// Drop the file segment from the source path
	fromParts.pop()
	let commonLength = 0
	while (
		commonLength < fromParts.length &&
		commonLength < targetParts.length &&
		fromParts[commonLength] === targetParts[commonLength]
	) {
		commonLength++
	}
	const upSegments = new Array(fromParts.length - commonLength).fill('..')
	const downSegments = targetParts.slice(commonLength)
	const relativeParts = [...upSegments, ...downSegments]
	const relativePath = relativeParts.join('/')
	if (!relativePath) return './'
	return relativePath.startsWith('.') ? relativePath : `./${relativePath}`
}

function resolveTargetPath(filename: string | undefined, cwd: string | undefined): string | null {
	if (!filename || !cwd) return null
	const normalizedFilename = toPosixPath(filename)
	const normalizedTarget = toPosixPath(`${cwd}/src/lib/utils`)
	return computeRelativeImport(normalizedFilename, normalizedTarget)
}

export function babelPluginJsxReactive({
	types: t,
}: BabelPluginOptions): PluginObj<BabelPluginState> {
	const EXTENDS_HELPERS = new Set(['_extends', '__assign'])

	function isAttributesMergeCall(path: NodePath<t.CallExpression>) {
		const parentPath = path.parentPath
		if (!parentPath || !parentPath.isCallExpression()) return false
		const parentCallee = parentPath.node.callee
		if (t.isIdentifier(parentCallee, { name: 'h' })) {
			return parentPath.node.arguments.includes(path.node)
		}
		return false
	}

	function ensureComposeImport(path: NodePath, state: BabelPluginState) {
		const programPath = path.findParent((p) => p.isProgram()) as NodePath<t.Program> | null
		if (!programPath) return
		if (programPath.scope.hasBinding('compose')) return
		const program = programPath.node
		const alreadyImported = program.body.some(
			(node: t.Statement) =>
				t.isImportDeclaration(node) &&
				node.specifiers.some(
					(specifier) => t.isImportSpecifier(specifier) && specifier.local.name === 'compose'
				)
		)
		if (alreadyImported) return
		const filename = state.file?.opts.filename
		const cwd = state.file?.opts?.cwd
		const composeSource = resolveTargetPath(filename, cwd) ?? 'src/lib/utils'
		const normalizedSource = composeSource === './' ? './utils' : composeSource
		const importDeclaration = t.importDeclaration(
			[t.importSpecifier(t.identifier('compose'), t.identifier('compose'))],
			t.stringLiteral(normalizedSource)
		)
		programPath.unshiftContainer('body', importDeclaration)
	}

	function isExpressionOrSpread(
		arg: t.CallExpression['arguments'][number]
	): arg is t.Expression | t.SpreadElement {
		return t.isSpreadElement(arg) || t.isExpression(arg)
	}

	function buildComposeCall(args: t.CallExpression['arguments']) {
		const filteredArgs = args.filter(isExpressionOrSpread)
		const composeArgs = filteredArgs.map((arg) => {
			if (t.isSpreadElement(arg)) {
				return t.arrowFunctionExpression(
					[],
					t.objectExpression([t.spreadElement(t.cloneNode(arg.argument))])
				)
			}
			return t.arrowFunctionExpression([], t.cloneNode(arg) as t.Expression)
		})
		return t.callExpression(
			t.identifier('compose'),
			composeArgs as (t.Expression | t.SpreadElement)[]
		)
	}

	return {
		name: 'jsx-reactive',
		visitor: {
			CallExpression(path, state) {
				if (!path.isCallExpression()) return
				const callee = path.node.callee
				let shouldTransform = false
				if (t.isIdentifier(callee) && EXTENDS_HELPERS.has(callee.name)) {
					shouldTransform = true
				} else if (
					t.isMemberExpression(callee) &&
					t.isIdentifier(callee.object, { name: 'Object' }) &&
					t.isIdentifier(callee.property, { name: 'assign' })
				) {
					shouldTransform = true
				}
				if (!shouldTransform) return
				if (!isAttributesMergeCall(path)) return
				if (!path.node.arguments.length) return
				ensureComposeImport(path, state)
				path.replaceWith(buildComposeCall(path.node.arguments))
			},
			JSXElement(path: NodePath<JSXElement>) {
				// Traverse all JSX children and attributes
				for (let index = 0; index < path.node.children.length; index++) {
					const child = path.node.children[index]
					if (t.isJSXExpressionContainer(child)) {
						const expression = child.expression
						// Check if the expression is a reactive reference (e.g., `this.counter`)
						if (!t.isJSXEmptyExpression(expression)) {
							// Rewrite `this.counter` into `() => this.counter`
							const arrowFunction = t.arrowFunctionExpression(
								[], // No args
								expression // Body is `this.counter`
							)
							path.node.children[index] = t.jsxExpressionContainer(arrowFunction)
						}
					}
				}

				// Also check props (e.g., `<Component prop={this.counter} />`)
				if (t.isJSXOpeningElement(path.node.openingElement)) {
					// Pass 1: support `update:attr` paired with base `attr`
					const attrs = path.node.openingElement.attributes
					for (let i = 0; i < attrs.length; i++) {
						const attr = attrs[i]
						if (t.isJSXAttribute(attr) && t.isJSXNamespacedName(attr.name)) {
							const ns = attr.name.namespace.name
							const local = attr.name.name.name
							if (ns === 'update') {
								const baseIndex = attrs.findIndex(
									(a) => t.isJSXAttribute(a) && t.isJSXIdentifier(a.name) && a.name.name === local
								)
								if (baseIndex !== -1) {
									const baseAttr = attrs[baseIndex] as t.JSXAttribute
									// getter from base
									let getterExpr: t.Expression | null = null
									if (baseAttr.value == null) {
										getterExpr = t.booleanLiteral(true)
									} else if (
										t.isStringLiteral(baseAttr.value) ||
										t.isNumericLiteral(baseAttr.value) ||
										t.isBooleanLiteral(baseAttr.value)
									) {
										getterExpr = baseAttr.value
									} else if (t.isJSXExpressionContainer(baseAttr.value)) {
										const exp = baseAttr.value.expression
										if (!t.isJSXEmptyExpression(exp)) getterExpr = exp
									}
									// setter from update:attr
									let setterExpr: t.Expression | null = null
									if (t.isJSXExpressionContainer(attr.value)) {
										const exp = attr.value.expression
										if (
											!t.isJSXEmptyExpression(exp) &&
											(t.isArrowFunctionExpression(exp) || t.isFunctionExpression(exp))
										) {
											setterExpr = exp
										}
									}
									if (getterExpr && setterExpr) {
										const getter = t.arrowFunctionExpression([], getterExpr)
										const bindingObject = t.objectExpression([
											t.objectProperty(t.identifier('get'), getter),
											t.objectProperty(t.identifier('set'), setterExpr),
										])
										baseAttr.value = t.jsxExpressionContainer(bindingObject)
										// remove update:attr
										attrs.splice(i, 1)
										i--
									}
								}
							}
						}
					}

					// Pass 2: existing reactive transforms
					for (const attr of path.node.openingElement.attributes) {
						if (t.isJSXAttribute(attr)) {
							// Transform onEvent syntax - no transformation needed as we're using onEvent directly
							// The h() function will handle both component events and DOM events

							// Handle reactive expressions in attributes
							if (t.isJSXExpressionContainer(attr.value)) {
								const expression = attr.value.expression
								if (!t.isJSXEmptyExpression(expression)) {
									// Skip if already a binding object (from update: pass)
									if (t.isObjectExpression(expression)) {
										const hasGet = expression.properties.some(
											(prop) =>
												t.isObjectProperty(prop) &&
												t.isIdentifier(prop.key) &&
												prop.key.name === 'get'
										)
										const hasSet = expression.properties.some(
											(prop) =>
												t.isObjectProperty(prop) &&
												t.isIdentifier(prop.key) &&
												prop.key.name === 'set'
										)
										if (hasGet && hasSet) {
											// Already a binding object, skip transformation
											continue
										}
									}
									// Check if this is a simple property access for 2-way binding
									// Handle type assertions: `xxx as Type` or `xxx.yyy as Type`
									let innerExpression = expression
									if (t.isTSAsExpression(expression)) {
										innerExpression = expression.expression
									}
									if (t.isMemberExpression(innerExpression)) {
										// Auto-detect 2-way binding: transform `{this.count}`, `{state.count}`, or `{state['count']}` to `{{get: () => this.count, set: (val) => this.count = val}}`
										// For type assertions, use the original expression in getter (with cast) but inner expression in setter (without cast)
										const getter = t.arrowFunctionExpression([], expression)
										const setter = t.arrowFunctionExpression(
											[t.identifier('val')],
											t.assignmentExpression('=', innerExpression, t.identifier('val'))
										)
										const bindingObject = t.objectExpression([
											t.objectProperty(t.identifier('get'), getter),
											t.objectProperty(t.identifier('set'), setter),
										])
										attr.value = t.jsxExpressionContainer(bindingObject)
									} else {
										// One-way binding: rewrite `prop={this.counter}` into `prop={() => this.counter}`
										const arrowFunction = t.arrowFunctionExpression([], expression)
										attr.value = t.jsxExpressionContainer(arrowFunction)
									}
								}
							}
						}
					}
				}
			},
		},
	}
}
