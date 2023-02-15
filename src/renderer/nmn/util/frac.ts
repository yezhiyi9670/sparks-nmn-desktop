// 来点愉快的
// 这个分数不计算大数，所以不搞 BigInt 了

/**
 * 分数数据
 */
export interface Fraction {
	x: number
	y: number
}

function gcd(x: number, y: number): number {
	if(x < 0) {
		x = -x
	}
	if(y < 0) {
		y = -y
	}
	if(y == 0) {
		return x
	}
	return gcd(y, x % y)
}

class FracClass {
	/**
	 * 创建
	 */
	create(x: number, y?: number): Fraction {
		if(y === undefined) {
			y = 1
		}
		return Frac.normalize({ x, y })
	}
	/**
	 * 复制
	 */
	copy(a: Fraction) {
		return Object.assign({}, a)
	}
	/**
	 * 是否无穷大，以及无穷大的符号
	 */
	isInfinity(a: Fraction): -1 | 0 | 1 {
		if(a.y == 0) {
			if(a.x > 0) return 1
			if(a.x < 0) return -1
		}
		return 0
	}
	/**
	 * 是否未确定
	 */
	isIndeterminate(a: Fraction) {
		return a.x == 0 && a.y == 0
	}
	/**
	 * 就地约分运算
	 */
	inormalize(a: Fraction) {
		let c = gcd(a.x, a.y)
		if(c != 0) {
			a.x = Math.floor(a.x / c)
			a.y = Math.floor(a.y / c)
		}
		if(a.y < 0) {
			a.x = -a.x
			a.y = -a.y
		}
	}
	/**
	 * 约分
	 */
	normalize(a: Fraction) {
		const cpy = Frac.copy(a)
		Frac.inormalize(cpy)
		return cpy
	}
	/**
	 * 字符串表示
	 */
	repr(a: Fraction) {
		if(Frac.isIndeterminate(a)) {
			return 'Indeterminate'
		}
		if(Frac.isInfinity(a) > 0) {
			return '+Infinity'
		}
		if(Frac.isInfinity(a) < 0) {
			return '-Infinity'
		}
		if(a.y == 1) {
			return a.x.toString()
		}
		return a.x.toString() + '/' + a.y.toString()
	}
	/**
	 * 取负数
	 */
	neg(a: Fraction): Fraction {
		return { x: -a.x, y: a.y }
	}
	/**
	 * 取倒数
	 */
	inv(a: Fraction): Fraction {
		return Frac.normalize({ x: a.y, y: a.x })
	}
	/**
	 * 加法
	 */
	add(a: Fraction, b: Fraction): Fraction {
		if(Frac.isIndeterminate(a) || Frac.isIndeterminate(b)) {
			return { x: 0, y: 0 }
		}
		if(Frac.isInfinity(a) || Frac.isInfinity(b)) {
			return { x: Frac.isInfinity(a) + Frac.isInfinity(b), y: 0 }
		}
		const c = gcd(a.y, b.y)
		const a1 = Math.floor(b.y / c)
		const a2 = Math.floor(a.y / c)
		return Frac.normalize({
			x: a1 * a.x + a2 * b.x,
			y: a1 * a.y
		})
	}
	/**
	 * 求和
	 */
	sum(...other: Fraction[]): Fraction {
		if(other.length == 0) {
			return Frac.create(0, 1)
		}
		return this.__sum(other[0], ...other.slice(1))
	}
	__sum(a: Fraction, ...other: Fraction[]): Fraction {
		if(other.length == 0) {
			return Frac.copy(a)
		}
		return this.__sum(this.add(a, other[0]), ...other.slice(1))
	}
	/**
	 * 减法
	 */
	sub(a: Fraction, b: Fraction): Fraction {
		return this.add(a, this.neg(b))
	}
	/**
	 * 乘法
	 */
	mul(a: Fraction, b: Fraction): Fraction {
		return Frac.normalize({
			x: a.x * b.x,
			y: a.y * b.y
		})
	}
	/**
	 * 求积
	 */
	prod(a: Fraction, ...other: Fraction[]): Fraction {
		if(other.length == 0) {
			return Frac.copy(a)
		}
		return this.prod(this.mul(a, other[0]), ...other.slice(1))
	}
	/**
	 * 除法
	 */
	div(a: Fraction, b: Fraction): Fraction {
		return this.mul(a, this.inv(b))
	}
	/**
	 * 到浮点数
	 */
	toFloat(a: Fraction) {
		return a.x / a.y
	}
	/**
	 * 比较
	 */
	compare(a: Fraction, b: Fraction) {
		const diff = this.sub(a, b)
		if(diff.x > 0) {
			return 1
		}
		if(diff.x < 0) {
			return -1
		}
		return 0
	}
	/**
	 * 相等
	 */
	equals(a: Fraction, b: Fraction) {
		return Frac.compare(a, b) == 0
	}
	/**
	 * 取最大值
	 */
	max(...lst: Fraction[]) {
		let ret = Frac.create(-1, 0)
		for(let frac of lst) {
			if(Frac.compare(frac, ret) > 0) {
				ret = Frac.copy(frac)
			}
		}
		return ret
	}
	/**
	 * 取最小值
	 */
	min(...lst: Fraction[]) {
		let ret = Frac.create(1, 0)
		for(let frac of lst) {
			if(Frac.compare(frac, ret) < 0) {
				ret = Frac.copy(frac)
			}
		}
		return ret
	}
}

/**
 * 分数操作
 */
export const Frac = new FracClass()
