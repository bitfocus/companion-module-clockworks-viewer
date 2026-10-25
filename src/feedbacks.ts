import { combineRgb } from '@companion-module/base'
import type ModuleInstance from './main.js'
import { FADERS, type FaderId } from './main.js'
import { deckChoices } from './actions.js'

export type FeedbacksSchema = {
	deck_live: { type: 'boolean'; options: { deck: number } }
	deck_b: { type: 'boolean'; options: { deck: number } }
	live: { type: 'boolean'; options: Record<string, never> }
	deck_loaded: { type: 'boolean'; options: { deck: number } }
	fader_above: { type: 'boolean'; options: { fader: FaderId; threshold: number } }
	beat: { type: 'boolean'; options: { beat: number } }
}

export const RED = combineRgb(204, 0, 0)
export const AMBER = combineRgb(230, 140, 0)
export const GREEN = combineRgb(0, 153, 51)
export const WHITE = combineRgb(255, 255, 255)
export const BLACK = combineRgb(0, 0, 0)

export function UpdateFeedbacks(self: ModuleInstance): void {
	const faderChoices = [
		...self.decks.map((deck) => ({ id: FADERS[deck - 1], label: `Deck ${deck} upfader` })),
		{ id: 'x' as const, label: 'Crossfader' },
	]

	self.setFeedbackDefinitions({
		deck_live: {
			name: 'Deck is the live deck',
			description: 'As last set from Companion: Viewer does not report its live deck over OSC',
			type: 'boolean',
			defaultStyle: { bgcolor: RED, color: WHITE },
			options: [{ id: 'deck', type: 'dropdown', label: 'Deck', choices: deckChoices(self, 'None'), default: 1 }],
			callback: (feedback) => self.state.liveDeck === Number(feedback.options.deck),
		},
		deck_b: {
			name: 'Deck is the Timecode B deck',
			description: 'As last set from Companion: Viewer does not report this over OSC',
			type: 'boolean',
			defaultStyle: { bgcolor: AMBER, color: BLACK },
			options: [{ id: 'deck', type: 'dropdown', label: 'Deck', choices: deckChoices(self, 'Off'), default: 1 }],
			callback: (feedback) => self.state.deckB === Number(feedback.options.deck),
		},
		live: {
			name: 'Live is on',
			description: 'As last set from Companion: Viewer does not report Live over OSC',
			type: 'boolean',
			defaultStyle: { bgcolor: RED, color: WHITE },
			options: [],
			callback: () => self.state.live === true,
		},
		deck_loaded: {
			name: 'Deck has a track loaded',
			description: 'From the track names Viewer sends',
			type: 'boolean',
			defaultStyle: { bgcolor: GREEN, color: WHITE },
			options: [{ id: 'deck', type: 'dropdown', label: 'Deck', choices: deckChoices(self), default: 1 }],
			callback: (feedback) => {
				const i = Number(feedback.options.deck) - 1
				return (self.state.title[i] ?? '') !== ''
			},
		},
		fader_above: {
			name: 'Fader is above a level',
			description: 'From the mixer levels Viewer sends',
			type: 'boolean',
			defaultStyle: { bgcolor: GREEN, color: WHITE },
			options: [
				{ id: 'fader', type: 'dropdown', label: 'Fader', choices: faderChoices, default: 'a' },
				{
					id: 'threshold',
					type: 'number',
					label: 'Above (0–100)',
					default: 50,
					min: 0,
					max: 100,
					range: true,
				},
			],
			callback: (feedback) => {
				const level = self.state.faders[feedback.options.fader] ?? 0
				return level * 100 > Number(feedback.options.threshold)
			},
		},
		beat: {
			name: 'Beat',
			description: 'True on the given beat of the live deck, from the beats Viewer sends',
			type: 'boolean',
			defaultStyle: { bgcolor: RED, color: WHITE },
			options: [{ id: 'beat', type: 'number', label: 'Beat', default: 1, min: 1, max: 16 }],
			callback: (feedback) => self.state.beat === Number(feedback.options.beat),
		},
	})
}
