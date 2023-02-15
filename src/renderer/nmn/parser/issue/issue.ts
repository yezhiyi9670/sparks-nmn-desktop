/***
 * Issue 指的是代码式内容解析时出现的问题，一般需要反馈给用户。
 * 在 tag-parser (选项式标签) 和 spark-nmn (简谱速记符) 中会出现。
 ***/

import { CodeToken, TokenType } from "../tokenizer/tokenizer"

export type Severity = "notice" | "unstd" | "warning" | "error" | "fatal"

export interface Issue {
	index: number
	severity: Severity
	key: string
	defaultTranslation: string
	args?: string[]
}

export function createIssue(index: number, severity: Severity, key: string, defaultTranslation: string, ...args: string[]): Issue {
	return { index, severity, key, defaultTranslation, args }
}
