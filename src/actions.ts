import type { DropdownChoice } from '@companion-module/base'
import type ModuleInstance from './main.js'

export type ActionsSchema = {
	select_deck: { options: { deck: number } }
	select_deck_b: { options: { deck: number } }
	live: { options: { mode: 'on' | 'off' | 'toggle' } }
	record_cue: { options: { deck: number } }
	add_to_setlist: { options: { deck: number } }
}

export function deckChoices(self: ModuleInstance, zeroLabel?: string): DropdownChoice<number>[] {
	const choices = self.decks.map((deck) => ({ id: deck, label: `Deck ${deck}` }))
	return zeroLabel ? [{ id: 0, label: zeroLabel }, ...choices] : choices
}

/** The deck option as a whole number, or null if it's outside min..max (an expression can produce anything). */
function deckOption(self: ModuleInstance, value: unknown, min: number, action: string): number | null {
	const deck = Math.round(Number(value))
	const max = self.decks.length
	if (!Number.isFinite(deck) || deck < min || deck > max) {
		self.log('warn', `${action}: deck ${String(value)} is not between ${min} and ${max}`)
		return null
	}
	return deck
}

export function UpdateActions(self: ModuleInstance): void {
	self.setActionDefinitions({
		select_deck: {
			name: 'Select live deck',
			description: "Picks the deck Viewer's main timecode follows (/deck/select)",
			options: [
				{
					id: 'deck',
					type: 'dropdown',
					label: 'Deck',
					choices: deckChoices(self, 'None (clear the live deck)'),
					default: 1,
				},
			],
			callback: (event) => {
				const deck = deckOption(self, event.options.deck, 0, 'Select live deck')
				if (deck === null) return
				self.send('/deck/select', deck)
				self.state.liveDeck = deck
				self.publishState()
				self.checkFeedbacks('deck_live')
			},
		},
		select_deck_b: {
			name: 'Select Timecode B deck',
			description: "Picks the deck Viewer's second timecode stream follows (/deck/select_b)",
			options: [
				{
					id: 'deck',
					type: 'dropdown',
					label: 'Deck',
					choices: deckChoices(self, 'Off'),
					default: Math.min(2, self.decks.length),
				},
			],
			callback: (event) => {
				const deck = deckOption(self, event.options.deck, 0, 'Select Timecode B deck')
				if (deck === null) return
				self.send('/deck/select_b', deck)
				self.state.deckB = deck
				self.publishState()
				self.checkFeedbacks('deck_b')
			},
		},
		live: {
			name: 'Live on/off',
			description: "Viewer's Live control (/live)",
			options: [
				{
					id: 'mode',
					type: 'dropdown',
					label: 'Live',
					choices: [
						{ id: 'on', label: 'On' },
						{ id: 'off', label: 'Off' },
						{ id: 'toggle', label: 'Toggle' },
					],
					default: 'toggle',
				},
			],
			callback: (event) => {
				// Viewer doesn't report Live back, so toggle flips what Companion last sent.
				const on = event.options.mode === 'toggle' ? !self.state.live : event.options.mode === 'on'
				self.send('/live', on ? 1 : 0)
				self.state.live = on
				self.publishState()
				self.checkFeedbacks('live')
			},
		},
		record_cue: {
			name: 'Record cue',
			description: "Adds a cue at the deck's current position to its track's cue list (/deck/record_cue)",
			options: [
				{
					id: 'deck',
					type: 'dropdown',
					label: 'Deck',
					choices: deckChoices(self),
					default: 1,
				},
			],
			callback: (event) => {
				const deck = deckOption(self, event.options.deck, 1, 'Record cue')
				if (deck !== null) self.send('/deck/record_cue', deck)
			},
		},
		add_to_setlist: {
			name: 'Add track to setlist',
			description: "Adds the deck's current track to the setlist (/deck/add_to_setlist)",
			options: [
				{
					id: 'deck',
					type: 'dropdown',
					label: 'Deck',
					choices: deckChoices(self),
					default: 1,
				},
			],
			callback: (event) => {
				const deck = deckOption(self, event.options.deck, 1, 'Add track to setlist')
				if (deck !== null) self.send('/deck/add_to_setlist', deck)
			},
		},
	})
}
