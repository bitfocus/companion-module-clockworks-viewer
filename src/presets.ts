import type { ModuleSchema } from './main.js'
import type ModuleInstance from './main.js'
import { FADERS } from './main.js'
import { AMBER, BLACK, GREEN, RED, WHITE } from './feedbacks.js'
import type {
	CompanionButtonStyleProps,
	CompanionPresetDefinitions,
	CompanionPresetSection,
	CompanionSimplePresetDefinition,
} from '@companion-module/base'

type Preset = CompanionSimplePresetDefinition<ModuleSchema>

const DARK = 0x202020

export function UpdatePresets(self: ModuleInstance): void {
	const v = (name: string) => `$(${self.label}:${name})`
	const style = (text: string, size: CompanionButtonStyleProps['size'] = 'auto'): CompanionButtonStyleProps => ({
		text,
		size,
		color: WHITE,
		bgcolor: DARK,
		show_topbar: false,
	})

	const presets: CompanionPresetDefinitions<ModuleSchema> = {}
	const add = (id: string, preset: Preset): string => {
		presets[id] = preset
		return id
	}

	const liveDeck: string[] = []
	const deckB: string[] = []
	const cues: string[] = []
	const setlist: string[] = []
	const monitor: string[] = []

	for (const deck of self.decks) {
		liveDeck.push(
			add(`select_deck_${deck}`, {
				type: 'simple',
				name: `Select deck ${deck} as live`,
				style: style(`DECK ${deck}\n${v(`deck_${deck}_title`)}`, '14'),
				steps: [{ down: [{ actionId: 'select_deck', options: { deck } }], up: [] }],
				feedbacks: [{ feedbackId: 'deck_live', options: { deck }, style: { bgcolor: RED, color: WHITE } }],
			}),
		)
		deckB.push(
			add(`select_deck_b_${deck}`, {
				type: 'simple',
				name: `Select deck ${deck} for Timecode B`,
				style: style(`TC B\nDECK ${deck}`),
				steps: [{ down: [{ actionId: 'select_deck_b', options: { deck } }], up: [] }],
				feedbacks: [{ feedbackId: 'deck_b', options: { deck }, style: { bgcolor: AMBER, color: BLACK } }],
			}),
		)
		cues.push(
			add(`record_cue_${deck}`, {
				type: 'simple',
				name: `Record a cue on deck ${deck}`,
				style: style(`REC CUE\nDECK ${deck}`),
				steps: [{ down: [{ actionId: 'record_cue', options: { deck } }], up: [] }],
				feedbacks: [{ feedbackId: 'deck_loaded', options: { deck }, style: { bgcolor: combineDim(GREEN) } }],
			}),
		)
		setlist.push(
			add(`add_to_setlist_${deck}`, {
				type: 'simple',
				name: `Add deck ${deck}'s track to the setlist`,
				style: style(`SETLIST\n+ DECK ${deck}`),
				steps: [{ down: [{ actionId: 'add_to_setlist', options: { deck } }], up: [] }],
				feedbacks: [{ feedbackId: 'deck_loaded', options: { deck }, style: { bgcolor: combineDim(GREEN) } }],
			}),
		)
		monitor.push(
			add(`deck_info_${deck}`, {
				type: 'simple',
				name: `Deck ${deck} track and fader`,
				style: style(`${deck}: ${v(`deck_${deck}_title`)}\n${v(`deck_${deck}_artist`)}\n${v(`fader_${deck}`)}%`, '7'),
				steps: [],
				feedbacks: [
					{
						feedbackId: 'fader_above',
						options: { fader: FADERS[deck - 1], threshold: 50 },
						style: { bgcolor: combineDim(GREEN) },
					},
				],
			}),
		)
	}

	liveDeck.push(
		add('select_deck_none', {
			type: 'simple',
			name: 'Clear the live deck',
			style: style('NO\nLIVE DECK'),
			steps: [{ down: [{ actionId: 'select_deck', options: { deck: 0 } }], up: [] }],
			feedbacks: [{ feedbackId: 'deck_live', options: { deck: 0 }, style: { bgcolor: RED, color: WHITE } }],
		}),
	)
	deckB.push(
		add('select_deck_b_off', {
			type: 'simple',
			name: 'Turn Timecode B off',
			style: style('TC B\nOFF'),
			steps: [{ down: [{ actionId: 'select_deck_b', options: { deck: 0 } }], up: [] }],
			feedbacks: [{ feedbackId: 'deck_b', options: { deck: 0 }, style: { bgcolor: AMBER, color: BLACK } }],
		}),
	)

	const live = [
		add('live_toggle', {
			type: 'simple',
			name: 'Toggle Live',
			style: style('LIVE', '18'),
			steps: [{ down: [{ actionId: 'live', options: { mode: 'toggle' } }], up: [] }],
			feedbacks: [{ feedbackId: 'live', options: {}, style: { bgcolor: RED, color: WHITE } }],
		}),
		add('live_on', {
			type: 'simple',
			name: 'Live on',
			style: style('LIVE\nON'),
			steps: [{ down: [{ actionId: 'live', options: { mode: 'on' } }], up: [] }],
			feedbacks: [{ feedbackId: 'live', options: {}, style: { bgcolor: RED, color: WHITE } }],
		}),
		add('live_off', {
			type: 'simple',
			name: 'Live off',
			style: style('LIVE\nOFF'),
			steps: [{ down: [{ actionId: 'live', options: { mode: 'off' } }], up: [] }],
			feedbacks: [{ feedbackId: 'live', options: {}, style: { bgcolor: DARK, color: WHITE }, isInverted: true }],
		}),
	]

	monitor.unshift(
		add('live_track', {
			type: 'simple',
			name: 'Live deck and track',
			style: style(`LIVE ${v('live_deck')}\n${v('live_title')}\n${v('live_artist')}`, '7'),
			steps: [],
			feedbacks: [{ feedbackId: 'live', options: {}, style: { bgcolor: combineDim(RED) } }],
		}),
		add('bpm_beat', {
			type: 'simple',
			name: 'BPM, flashing on beat 1',
			style: style(`${v('bpm')}\nBPM\nbeat ${v('beat')}`, '14'),
			steps: [],
			feedbacks: [{ feedbackId: 'beat', options: { beat: 1 }, style: { bgcolor: RED, color: WHITE } }],
		}),
		add('crossfader', {
			type: 'simple',
			name: 'Crossfader level',
			style: style(`XFADER\n${v('crossfader')}%`),
			steps: [],
			feedbacks: [],
		}),
	)

	const structure: CompanionPresetSection<ModuleSchema>[] = [
		{
			id: 'decks',
			name: 'Deck select',
			definitions: [
				{
					id: 'live_deck',
					type: 'simple',
					name: 'Live deck',
					description: "The deck Viewer's main timecode follows",
					presets: liveDeck,
				},
				{
					id: 'timecode_b',
					type: 'simple',
					name: 'Timecode B',
					description: "The deck Viewer's second timecode stream follows",
					presets: deckB,
				},
			],
		},
		{
			id: 'live',
			name: 'Live',
			definitions: [{ id: 'live', type: 'simple', name: 'Live', presets: live }],
		},
		{
			id: 'tracks',
			name: 'Cues & setlist',
			definitions: [
				{
					id: 'record_cue',
					type: 'simple',
					name: 'Record cue',
					description: "Adds a cue at the deck's position; green when the deck has a track",
					presets: cues,
				},
				{ id: 'setlist', type: 'simple', name: 'Add to setlist', presets: setlist },
			],
		},
		{
			id: 'monitor',
			name: 'Monitor',
			description: 'Needs "Receive feedback from Viewer" on and Viewer sending OSC to this Companion',
			definitions: [{ id: 'monitor', type: 'simple', name: 'Track, beat and faders', presets: monitor }],
		},
	]

	self.setPresetDefinitions(structure, presets)
}

/** A darker shade of a colour, for "on but not active" backgrounds. */
function combineDim(rgb: number): number {
	const r = (rgb >> 16) & 0xff
	const g = (rgb >> 8) & 0xff
	const b = rgb & 0xff
	return (((r * 0.45) | 0) << 16) | (((g * 0.45) | 0) << 8) | ((b * 0.45) | 0)
}
