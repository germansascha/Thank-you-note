# 🎴 Pass & Play UNO Night

An UNO-style card game for one phone and a table full of kids. The phone goes
round the table; your cards only appear once **you** hold the reveal button,
and everybody can always see how many cards everyone else is holding.

Built as a single `index.html` — no build step, no server, no dependencies.

## How it plays

1. **Set up** — pick 2–6 players. Tap a face to change the animal, type a name.
2. **Hand-off** — the screen says *"Pass the phone to 🦊 Mia"*. The hand is not
   just hidden, it isn't in the page at all until Mia presses and **holds** the
   button for half a second. A quick accidental tap while the phone is in mid-air
   won't expose anything.
3. **Your turn** — cards you're allowed to play glow and wobble; the rest are
   greyed out and can't be tapped, so there is no such thing as an illegal move.
   Tap a card, or take one from the deck.
4. **Everyone's card count** is pinned to the top of the screen at all times —
   on every screen, including the hand-off — as a number plus a little stack of
   card edges to count. A player down to one card flashes gold.

### Kid-friendly choices

Deliberately not the tournament rulebook:

- **No UNO penalty.** Reaching one card shouts "UNO!" automatically with a
  banner and a jingle. Nobody gets punished for forgetting to say it.
- **No Draw Four challenge** — too much lawyering for a five-year-old.
- **The first card is always a plain number**, so the opening turn has no
  surprise rules.
- **Cards are sorted** by colour then number every time a hand is shown, so
  cards don't jump around between turns.
- **6 and 9 are underlined** and corner numbers are never printed upside-down,
  because an upside-down 9 reads as a 6.
- Playing to two players makes **Reverse act as a Skip**, per the real rules.

## Playing it on an iPhone

Open the page in Safari, then **Share → Add to Home Screen**. It launches
full-screen with its own icon, no Safari chrome, and works offline once loaded.

The layout is portrait-first: it uses `dvh` units and `env(safe-area-inset-*)`
so the notch and home-bar don't clip anything, and it re-fits the hand whenever
Safari's toolbars slide in or out. Card sizes are chosen at render time so a
whole hand fits on screen without scrolling, however many cards you're holding.

## Running it locally

```sh
npm run serve     # then open http://localhost:8000
```

Or just double-click `index.html` — it works straight off the filesystem.

## Development

```sh
npm install
npm test          # drives the game in a headless iPhone-sized browser
npm run icon      # regenerates icon-180.png
```

`test.mjs` does two things: it fuzzes 40 complete games through the rules engine
checking that all 108 cards are always accounted for and that every game
terminates, then it walks the real UI and asserts the things that matter —
that no hand is in the DOM during a hand-off, that the scoreboard paints above
the hand-off overlay, and that nothing overflows the viewport.

## Files

| File                    | What it is                                  |
| ----------------------- | ------------------------------------------- |
| `index.html`            | The entire game: markup, styles and rules   |
| `manifest.webmanifest`  | Add-to-Home-Screen metadata                 |
| `icon-180.png`          | App icon (generated)                        |
| `make_icon.py`          | Draws the icon; pure stdlib, no Pillow      |
| `test.mjs`              | Rules fuzzing + UI checks via Playwright    |

---

Not affiliated with or endorsed by Mattel. UNO is their trademark; this is a
homemade family game that plays by similar rules.
