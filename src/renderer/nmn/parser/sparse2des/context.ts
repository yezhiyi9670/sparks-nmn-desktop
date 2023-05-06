import { RenderProps, renderPropsDefault } from "../../renderer/props"
import { MusicProps } from "./types"

/**
 * 乐谱上下文（包含音乐属性和渲染属性）
 */
export type ScoreContext = {
	musical: MusicProps
	render: RenderProps
}
/**
 * 默认乐谱上下文
 */
export const scoreContextDefault: ScoreContext = {
	musical: {
		beats: {
			value: { x: 0, y: 4 },
			component: [{ x: 0, y: 4 }],
			defaultReduction: 2,
			swing: false
		},
		qpm: {
			value: 120,
			symbol: 'qpm'
		},
		base: {
			value: NaN,
			baseValue: NaN,
			explicitOctave: false
		},
		transp: 0,
		extras: []
	},
	render: renderPropsDefault
}

export function addMusicProp(context: ScoreContext, prop?: MusicProps): ScoreContext {
	if(prop === undefined) {
		return context
	}
	let newProps = Object.assign({}, context.musical)
	for(let key in prop) {
		if((prop as any)[key] !== undefined) {
			(newProps as any)[key] = (prop as any)[key]
		}
	}
	return Object.assign({}, context, { musical: newProps })
}
export function addRenderProp(context: ScoreContext, prop?: RenderProps): ScoreContext {
	if(prop === undefined) {
		return context
	}
	let newProps = Object.assign({}, context.render)
	for(let key in prop) {
		if((prop as any)[key] !== undefined) {
			(newProps as any)[key] = (prop as any)[key]
		}
	}
	return Object.assign({}, context, { render: newProps })
}
export function copyContext(context: ScoreContext): ScoreContext {
	return {
		musical: Object.assign({}, context.musical),
		render: Object.assign({}, context.render)
	}
}
