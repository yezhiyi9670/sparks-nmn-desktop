import ace from "ace-builds/src-noconflict/ace"
import { getCommandDef } from "../../parser/commands";

ace.define("ace/mode/sparksnmn_highlight_rules", ["require", "exports", "module", "ace/lib/oop", "ace/mode/text_highlight_rules"], function (ace_require, exports, module) {
	var oop = ace_require("../lib/oop");
	var TextHighlightRules = ace_require("./text_highlight_rules").TextHighlightRules;
	var SparksnmnHighlightRules = function () {		
		var stringEscape = "\\\\(x[0-9A-Fa-f]{2}|[0-7]{3}|[\\\\rntx'\"]|u[0-9A-Fa-f]{4})";

		let moreModes = {}
		function addMode(modeName, obj) {
			if(!(modeName in moreModes)) {
				moreModes[modeName] = obj
			}
		}
		function commentMode(modeName, isInvalid) {
			addMode('comment', [
				{
					token: isInvalid ? 'comment' : "text",
					regex: "\\\\$",
					next: 'comment'
				},
				{
					token: 'comment',
					regex: /$/,
					next: 'start'
				},
				{
					defaultToken: 'comment'
				}
			])
			return [
				{
					token: "comment",
					regex: /\/\//,
					next: 'comment'
				}
			]
		}
		function stringMode(modeName, isInvalid) {
			addMode('string_' + modeName, [
				{
					token: isInvalid ? 'comment' : "constant.language.escape",
					regex: stringEscape
				},
				{
					token: isInvalid ? 'comment' : "text",
					regex: "\\\\$",
					next: 'string_' + modeName
				},
				{
					token: isInvalid ? 'comment' : "string",
					regex: /"$/,
					next: 'start'
				},
				{
					token: isInvalid ? 'comment' : "string",
					regex: /"/,
					next: modeName
				},
				{
					token: isInvalid ? 'comment' : "string",
					regex: /$/,
					next: 'start'
				},
				{
					defaultToken: isInvalid ? 'comment' : 'string'
				}
			])
			return [
				{
					token: isInvalid ? 'comment' : 'string',
					regex: /"/,
					next: 'string_' + modeName,
				}
			]
		}
		function commonMode(modeName, isInvalid) {
			return [
				...commentMode(modeName, isInvalid),
				...stringMode(modeName, isInvalid),
				{
					defaultToken: isInvalid ? 'comment': 'text'
				}
			]
		}
		function continueOrRestart(modeName) {
			return [
				{
					token: 'text',
					regex: "\\\\$",
					next: modeName
				},
				{
					token: 'string',
					regex: /"|$/,
					next: 'start'
				},
			]
		}
		function matchHeads(matcher, mode, textProps) {
			matcher = matcher.concat(matcher.map((head) => {
				const def = getCommandDef(head)
				return def.headFull
			}))
			let ret = []
			matcher.forEach((head) => {
				let propsType = textProps ? 'string' : 'variable'
				if(getCommandDef(head).hasProps == 'none') {
					propsType = 'invalid'
				}
				ret.push({
					token: ['keyword', 'bracket', propsType, 'bracket', 'operator'],
					regex: "^(\\s*" + head + "\\b\\s*)(\\[)(.*?)(\\])(\\s*:\\s*)$",
					next: 'start'
				})
				ret.push({
					token: ['keyword', 'comment', 'operator'],
					regex: "^(\\s*" + head + "\\b)([^:]*?)(:\\s*)$",
					next: 'start'
				})
				ret.push({
					token: ['keyword', 'bracket', propsType, 'bracket', 'operator'],
					regex: "^(\\s*" + head + "\\b\\s*)(\\[)(.*?)(\\])(\\s*:\\s*)",
					next: mode
				})
				ret.push({
					token: ['keyword', 'comment', 'operator'],
					regex: "^(\\s*" + head + "\\b)(.*?)(:\\s*)",
					next: mode
				})
			})
			return ret
		}
		function lineStringMode(matcher) {
			const mode = 'line_string'
			addMode(mode, [
				...commentMode(mode, false),
				...continueOrRestart(mode),
				{
					defaultToken: 'string'
				}
			])
			return matchHeads(matcher, mode, true)
		}
		function lineNoneMode(matcher) {
			const mode = 'line_none'
			addMode(mode, [
				...commentMode(mode, false),
				...continueOrRestart(mode),
				{
					defaultToken: 'invalid'
				}
			])
			return matchHeads(matcher, mode, true)
		}
		function lineGeneral(matcher) {
			const mode = 'line_general'
			addMode(mode, [
				...commonMode(mode, false),
				...continueOrRestart(mode),
				{
					token: 'constant.numeric',
					regex: /,/
				},
				{
					token: 'operator',
					regex: /[\(\)\[\]\{\}]/
				},
				{
					defaultToken: 'text'
				}
			])
			return matchHeads(matcher, mode, true)
		}
		function lineNotes(matcher) {
			const mode = 'line_notes'
			addMode(mode + '_bracket', [
				...commonMode(mode + '_bracket', false),
				...continueOrRestart(mode + '_bracket'),
				{
					token: 'constant.numeric',
					regex: /\]$/,
					next: 'start'
				},
				{
					token: 'constant.numeric',
					regex: /\]/,
					next: mode
				},
				{
					defaultToken: 'constant.numeric'
				}
			])
			addMode(mode + '_brace', [
				...commonMode(mode + '_brace', false),
				...continueOrRestart(mode + '_brace'),
				{
					token: 'keyword',
					regex: /\}$/,
					next: 'start'
				},
				{
					token: 'keyword',
					regex: /\}/,
					next: mode
				},
				{
					defaultToken: 'keyword'
				}
			])
			addMode(mode, [
				...commonMode(mode, false),
				...continueOrRestart(mode),
				{
					token: 'comment',
					regex: /[\(\)]/
				},
				{
					token: 'operator',
					regex: /[\|\/:]/
				},
				{
					token: 'constant.numeric',
					regex: /\[/,
					next: mode + '_bracket'
				},
				{
					token: 'keyword',
					regex: /\{/,
					next: mode + '_brace'
				},
				{
					defaultToken: 'variable'
				}
			])
			return matchHeads(matcher, mode, false)
		}
		function lineAutoLyrics(matcher) {
			const mode = 'line_auto_lyrics'
			addMode(mode + '_bracket', [
				...commonMode(mode + '_bracket', false),
				...continueOrRestart(mode + '_bracket'),
				{
					token: 'constant.numeric',
					regex: /\]\]$/,
					next: 'start'
				},
				{
					token: 'constant.numeric',
					regex: /\]\]/,
					next: mode
				},
				{
					defaultToken: 'constant.numeric'
				}
			])
			addMode(mode + '_brace', [
				...commonMode(mode + '_brace', false),
				...continueOrRestart(mode + '_brace'),
				{
					token: 'keyword',
					regex: /\}$/,
					next: 'start'
				},
				{
					token: 'keyword',
					regex: /\}/,
					next: mode
				},
				{
					defaultToken: 'keyword'
				}
			])
			addMode(mode, [
				...commonMode(mode, false),
				...continueOrRestart(mode),
				{
					token: 'comment',
					regex: /[\(\)]/
				},
				{
					token: 'constant.numeric',
					regex: /\[\[/,
					next: mode + '_bracket'
				},
				{
					token: 'text',
					regex: /[\[\]]/
				},
				{
					token: 'keyword',
					regex: /[%_]/
				},
				{
					token: 'keyword',
					regex: /\{/,
					next: mode + '_brace'
				},
				{
					defaultToken: 'text'
				}
			])
			return matchHeads(matcher, mode, false)
		}
		function lineLyrics(matcher) {
			const mode = 'line_lyrics'
			addMode(mode + '_bracket', [
				...commonMode(mode + '_bracket', false),
				...continueOrRestart(mode + '_bracket'),
				{
					token: 'constant.numeric',
					regex: /\]\]/,
					next: mode
				},
				{
					defaultToken: 'constant.numeric'
				}
			])
			addMode(mode, [
				...commonMode(mode, false),
				...continueOrRestart(mode),
				{
					token: 'constant.comment',
					regex: /\//
				},
				{
					token: 'constant.keyword',
					regex: /[#@_]/
				},
				{
					token: 'constant.numeric',
					regex: /\[\[/,
					next: mode + '_bracket'
				},
				{
					token: 'operator',
					regex: /[\(\)\[\]\{\}]/
				},
				{
					defaultToken: 'text'
				}
			])
			return matchHeads(matcher, mode, false)
		}

		this.$rules = {
			"start": [
				...commonMode('start', true),
				...lineStringMode(['Dt', 'Df', 'Dv', 'Dp', 'Ds', 'Da', 'P', 'Pi', 'Sp', 'Frp', 'Rp', 'Srp', 'T', 'S']),
				...lineNoneMode(['B']),
				...lineGeneral(['J']),
				...lineNotes(['N', 'Na', 'Ns', 'F', 'C', 'A', 'La']),
				...lineAutoLyrics(['Lc', 'Lw']),
				...lineLyrics(['L']),
				{
					token: ['invalid', 'comment', 'operator'],
					regex: "^(\\s*\\w+\\b)(.*?)(:\\s*)",
					next: 'line_string'
				},
				{
					token: 'operator',
					regex: /^\s*(\-+|=+)\s*$/,
				},
				{
					defaultToken: 'text'
				}
			],

		};
		this.$rules = {
			...this.$rules,
			...moreModes
		}
		this.normalizeRules();
	};

	oop.inherits(SparksnmnHighlightRules, TextHighlightRules);
	exports.SparksnmnHighlightRules = SparksnmnHighlightRules;
});

ace.define("ace/mode/sparksnmn", function (acequire, exports, module) {
	const oop = acequire("../lib/oop");
	const TextMode = acequire("./text").Mode;
	const SparksnmnHighlightRules = acequire("./sparksnmn_highlight_rules").SparksnmnHighlightRules;

	const SparksnmnMode = function () {
		this.lineCommentStart = '//'
		this.HighlightRules = SparksnmnHighlightRules;
		this.$behaviour = this.$defaultBehaviour;
	};
	oop.inherits(SparksnmnMode, TextMode);
	exports.Mode = SparksnmnMode;
});
