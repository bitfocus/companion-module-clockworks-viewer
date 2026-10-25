## Clockworks Viewer

Controls [Clockworks Viewer](https://clockworks.tech) over OSC: pick the live deck and the Timecode B deck, turn Live on and off, record cues and add tracks to the setlist. It also shows the track on each deck, the mixer faders and the beat, from the OSC Viewer sends.

### Setting up Viewer

In Viewer's settings, turn **OSC** on, then:

- **OSC listen address / port**: the interface and port Viewer receives commands on (default port 8000). If Companion runs on another machine, pick that machine's network interface here, not 127.0.0.1.
- **OSC send address / port**: where Viewer sends its feedback. Set it to the Companion machine's IP and the **Feedback port** in this connection (default 9000).

Viewer only sends and receives OSC while OSC is on.

### Configuration

- **Viewer IP** and **Viewer OSC listen port**: where commands go.
- **Receive feedback from Viewer** and **Feedback port**: the UDP port this connection listens on for Viewer's OSC.
- **Decks**: how many decks Viewer uses (1–6). Sets the deck choices, variables and presets.

### Actions

| Action               | OSC sent                      | Notes                                        |
| -------------------- | ----------------------------- | -------------------------------------------- |
| Select live deck     | `/deck/select <deck>`         | 0 clears the live deck                       |
| Select Timecode B    | `/deck/select_b <deck>`       | 0 turns Timecode B off                       |
| Live on/off          | `/live <1\|0>`                | Toggle flips what Companion last sent        |
| Record cue           | `/deck/record_cue <deck>`     | Adds a cue at the deck's current position    |
| Add track to setlist | `/deck/add_to_setlist <deck>` | Adds the deck's current track to the setlist |

### Variables

- `deck_N_title`, `deck_N_artist`, `deck_N_album`: the track on each deck
- `live_title`, `live_artist`: the track on the live deck
- `fader_N`, `crossfader`: mixer levels, 0–100
- `beat`, `bpm`: the live deck's beat and tempo
- `live_deck`, `timecode_b_deck`, `live`: as last set from Companion

### Feedbacks

- **Deck has a track loaded**, **Fader is above a level**, **Beat**: from what Viewer sends.
- **Deck is the live deck**, **Deck is the Timecode B deck**, **Live is on**: Viewer does not report these over OSC, so they show what Companion last sent. If they are changed in Viewer itself (or from MIDI, DMX or fader follow), these feedbacks will not follow.
