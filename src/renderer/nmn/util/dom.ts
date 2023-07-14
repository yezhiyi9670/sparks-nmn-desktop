import { randomToken } from "./random"

export module DomUtils {
	const scrollAllowDifference = 10
	
	function scroll(type: 'top' | 'left') {
		return {
			top: 'scrollTop',
			left: 'scrollLeft'
		}[type] as 'scrollTop' | 'scrollLeft'
	}
	function length(type: 'top' | 'left') {
		return {
			top: 'width',
			left: 'height'
		}[type] as 'width' | 'height'
	}
	function inverse(type: 'top' | 'left') {
		return {
			top: 'bottom',
			left: 'right'
		}[type] as 'bottom' | 'right'
	}
	function clientLength(type: 'top' | 'left') {
		return {
			top: 'clientHeight',
			left: 'clientWidth'
		}[type] as 'clientWidth' | 'clientHeight'
	}

	export function iterateOffset(outBox: HTMLElement, inBox: HTMLElement, type: 'top' | 'left') {
		let result = inBox.getBoundingClientRect()[type] - outBox.getBoundingClientRect()[type]
		let ptr: HTMLElement | null = inBox
		while(ptr != null && ptr != outBox) {
			let prev: HTMLElement | null = ptr.parentElement
			if(prev) {
				result += prev[scroll(type)]
			}
			ptr = prev
		}
		return result
	}

	export function iterateForClass(box: HTMLElement, className: string) {
		let ptr: HTMLElement | null = box
		while(ptr != null) {
			if(ptr.classList.contains(className)) {
				return ptr
			}
			ptr = ptr.parentElement
		}
		return null
	}

	export function findChildrenWithAttr(box: HTMLElement | undefined, name: string, val: number | string) {
		if(box === undefined) {
			return undefined
		}
		const children = box.children
		for(let i = 0; i < children.length; i++) {
			const element = children[i]
			if(element.getAttribute(name) == val) {
				return element as HTMLElement
			}
		}
	}

	export function smoothScrollFor(outBox: HTMLElement, inBox: HTMLElement, type: 'top' | 'left', ratio?: number) {
		const ease = (t: number) => 1 - (1 - t) ** 3
		
		let offset = iterateOffset(outBox, inBox, type) - outBox[clientLength(type)] * (ratio ?? (type == 'top' ? 0.2 : 0.4))
		const oldOffset = outBox[scroll(type)]
		outBox[scroll(type)] = 998244353
		const maxOffset = outBox[scroll(type)]
		outBox[scroll(type)] = oldOffset
		offset = Math.max(0, Math.min(maxOffset, offset))

		const token = randomToken(12)
		const startTime = +new Date()
		const duration = 200
		const attrKey = 'wcl-smooth-scroll-' + type
		outBox.setAttribute(attrKey, token)

		const executor = () => {
			if(outBox.getAttribute(attrKey) != token) {
				return
			}

			const ratio = Math.min(1, (+new Date() - startTime) / duration)
			const offsetRatio = ease(ratio)
			outBox[scroll(type)] = oldOffset + (offset - oldOffset) * offsetRatio
			if(ratio >= 1) {
				outBox.removeAttribute(attrKey)
				return
			}

			requestAnimationFrame(executor)
		}

		requestAnimationFrame(executor)
	}

	export function scrollToMakeVisible(outBox: HTMLElement, inBox: HTMLElement, type: 'top' | 'left', tolerance: number=scrollAllowDifference, ratio?: number) {
		const outTop = outBox.getBoundingClientRect()[type]
		const inTop = inBox.getBoundingClientRect()[type]
		const outBottom = outBox.getBoundingClientRect()[inverse(type)]
		const inBottom = inBox.getBoundingClientRect()[inverse(type)]

		if(outTop - inTop > tolerance || inBottom - outBottom > tolerance) {
			smoothScrollFor(outBox, inBox, type, ratio)
		}
	}
}
