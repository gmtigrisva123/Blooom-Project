---
version: alpha
name: Blooom
description: Cut paper for a study desk. Cream stock with a visible grain, card you can press, blue-black ink, and a week of study that grows as a garden.
colors:
  paper: 'oklch(97% 0.012 95)'
  paper-2: 'oklch(94.5% 0.018 95)'
  paper-3: 'oklch(91% 0.022 95)'
  card: 'oklch(98.8% 0.007 95)'
  ink: 'oklch(20% 0.014 255)'
  ink-2: 'oklch(29% 0.014 255)'
  muted: 'oklch(47% 0.014 255)'
  rule: 'oklch(87% 0.016 95)'
  edge: 'oklch(83% 0.04 88)'
  accent: 'oklch(87% 0.175 96)'
  accent-deep: 'oklch(72% 0.16 92)'
  accent-ink: 'oklch(20% 0.014 255)'
  accent-2: 'oklch(50% 0.17 250)'
  accent-3: 'oklch(70% 0.2 22)'
  mint: 'oklch(82% 0.15 152)'
  mint-deep: 'oklch(48% 0.12 155)'
  kraft: 'oklch(63% 0.085 62)'
  sand: 'oklch(77% 0.1 76)'
  sugar: 'oklch(89% 0.035 236)'
  night: 'oklch(20% 0.014 255)'
  night-ink: 'oklch(97% 0.012 95)'
  error: 'oklch(52% 0.19 27)'
typography:
  display:
    fontFamily: Quicksand Variable
    fontSize: 4.25rem
    fontWeight: 700
    lineHeight: 1.14
    letterSpacing: -0.03em
  section:
    fontFamily: Quicksand Variable
    fontSize: 3.5rem
    fontWeight: 700
    lineHeight: 1.14
    letterSpacing: -0.03em
  title:
    fontFamily: Quicksand Variable
    fontSize: 1.625rem
    fontWeight: 700
    lineHeight: 1.2
  lead:
    fontFamily: Quicksand Variable
    fontSize: 1.375rem
    fontWeight: 500
    lineHeight: 1.45
  body:
    fontFamily: Quicksand Variable
    fontSize: 1rem
    fontWeight: 500
    lineHeight: 1.55
  label:
    fontFamily: Quicksand Variable
    fontSize: 0.875rem
    fontWeight: 700
    lineHeight: 1.4
rounded:
  input: 14px
  stock: 16px
  card: 24px
  pill: 999px
spacing:
  3xs: 2px
  2xs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 40px
  2xl: 64px
  3xl: 96px
  4xl: 144px
components:
  button-primary:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.accent-ink}'
    rounded: '{rounded.stock}'
    height: 48px
    padding: 0 24px
  button-secondary:
    backgroundColor: '{colors.card}'
    textColor: '{colors.ink}'
    rounded: '{rounded.stock}'
    height: 48px
    padding: 0 24px
  chip-selected:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.paper}'
    rounded: '{rounded.pill}'
    height: 44px
  input:
    backgroundColor: '{colors.card}'
    textColor: '{colors.ink}'
    rounded: '{rounded.input}'
    height: 48px
  card:
    backgroundColor: '{colors.card}'
    textColor: '{colors.ink}'
    rounded: '{rounded.card}'
    padding: 24px
  band-ink:
    backgroundColor: '{colors.night}'
    textColor: '{colors.night-ink}'
  field-pear:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.accent-ink}'
  answer:
    backgroundColor: '{colors.mint}'
    textColor: '{colors.accent-ink}'
    rounded: '{rounded.stock}'
  page:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
  sidebar:
    backgroundColor: '{colors.paper-2}'
    textColor: '{colors.ink-2}'
  strip-track:
    backgroundColor: '{colors.paper-3}'
    rounded: '{rounded.pill}'
  strip:
    backgroundColor: '{colors.sand}'
    rounded: '{rounded.pill}'
  sticker:
    backgroundColor: '{colors.accent-3}'
    textColor: '{colors.accent-ink}'
    rounded: '{rounded.pill}'
  notice:
    backgroundColor: '{colors.sugar}'
    textColor: '{colors.ink}'
    rounded: '{rounded.stock}'
  link:
    textColor: '{colors.accent-2}'
  caption:
    textColor: '{colors.muted}'
  field-error:
    textColor: '{colors.error}'
  button-primary-edge:
    backgroundColor: '{colors.accent-deep}'
  button-secondary-edge:
    backgroundColor: '{colors.edge}'
  divider:
    backgroundColor: '{colors.rule}'
  garden-soil:
    backgroundColor: '{colors.kraft}'
  growth-line:
    backgroundColor: '{colors.mint-deep}'
---

## Overview

Blooom is a study tool for Vietnamese high-school and university students: a focus timer, flashcards that come back just before they are forgotten, study groups, a file shelf, and a view of progress. The interface is in Vietnamese, in plain words, with no term a first-time visitor would have to look up.

The visual world is **cut paper made by hand**. It was chosen because the Blooom wordmark is a crayon scribble on paper, and because the product's promise is growth by small daily repetition. Paper carries the first; a garden that grows with the week carries the second. The world is cheerful without turning childish: it is used by people revising for exams.

Two modes share the system. The landing and sign-in pages **persuade**: they commit fully to the material (torn edges, a pear field, a sheet of ink). Inside the app the surfaces **operate**: the paper and the card-stock controls stay, the decoration steps back, and the one thing that grows is the week's garden.

The source of truth for every value below is `src/styles/tokens.css`. No colour or font is written anywhere else.

## Colors

Paper is cream pulled toward pear (hue 95). Ink is blue-black (hue 255). No neutral is a pure grey and no surface is pure white or pure black.

Four accents, each with one job. They never blend into one another and never form a gradient.

- **Pear (`accent`)** is the action: the primary button, the one pear field on a page, today's bar in a chart, a highlighter band behind one key value.
- **Blue (`accent-2`)** is links and the focus ring.
- **Coral (`accent-3`)** is one loud moment: the die-cut sticker that carries the offer.
- **Mint (`mint`)** is growth: a remembered answer, an earned badge, a goal being met. `mint-deep` is the same idea where it must carry text or a thin line.

Grounds come from the paper drawer: `kraft` and `sand` for strips and bars, `sugar` (blue sugar paper) for a mat or a quiet notice, `night` for a sheet of ink. `night` and `night-ink` do not flip between light and dark, so ink on pear stays ink in both.

Each school subject owns one hue (`--subject-*`) and keeps it in every tag and chart.

There is no violet and no lavender anywhere in the page's own design. The wordmark keeps its own crayon colours.

Dark mode is a second rendering, not an inversion: paper drops to L 16, ink rises to L 94, accents lose a little chroma, and no hue moves.

## Typography

One family: **Quicksand**, self-hosted, variable. It stands in for the theme's original face, which has no Vietnamese glyphs. Its single-storey `a` and `g` give the page the look of an early reader's book.

- Display and headings: weight 700, tracking -0.03em, sentence case.
- Body: weight 500, 16px inside the app and 17 to 22px for a lead paragraph.
- Labels, tags, table heads and nav links are the same face one step smaller, sentence case, untracked. Never uppercase, never small caps, never monospace.
- Display leading is 1.14 rather than the usual 1.02: Vietnamese stacks two marks above a vowel (ể, ậ, ỗ) and tighter leading clips them.
- Figures that change (the timer, counts, hours) use tabular numerals.
- A heading is one weight and one colour. No word inside it is picked out.

## Layout

- Landing: a container capped at 1440px with 64px gutters, a 12-column grid with a 32px gap, and 144px between sections. One idea to a screen: the hero is exactly the first screen, and the sections that carry a picture are one screen tall on a laptop.
- App: a fixed 264px sidebar, a 72px top bar, and pages capped at 1120px. Below 1024px the sidebar gives way to a five-item tab bar.
- Spacing only comes from the `--space-*` scale. Left and right content edges are equal.
- A section is a head block and then its composition. About 80 words to a screen at most on the landing page.

## Elevation & Depth

Light falls from the top left. Cards carry a soft shadow with an offset and a blur; cut sheets carry a stacked drop shadow that falls down and to the right. There are no glows, no coloured halos and no glass.

Paper is generated, never a picture: a fine fractal grain and a long fibre, both SVG turbulence, sit under every paper, card and accent fill.

A torn edge is a `clip-path` polygon drawn from seeded noise, with a pale fibre twin a pixel and a half behind it. The same seed always tears the same way.

## Shapes

Round everywhere: 24px for surfaces, 16px for card stock, 14px for inputs, a full pill for chips and tags. There is no square corner. There is never a card inside a card: one layer of containment, then rules and space.

## Components

- **Buttons are card stock.** They sit on a solid edge (5px large, 4px regular, 3px small). Hover raises the edge and lifts the button 2px; pressing collapses the edge to 1px and drops it. The spring easing belongs to the primary button only.
- **One primary per view**, in pear. On the pear start sheet the primary inverts to ink, because pear on pear would vanish.
- **A chosen pill is ink with paper type.** This holds for chips, segmented controls, the active page in the sidebar and the active search result.
- **Inputs** are 48px tall with a constant 1px border. Focus is an instant 2px blue outline, never a border change.
- **Progress is a strip of kraft paper**, scaled with `transform`, never resized. The timer is a number and a strip, not a ring.
- **The garden** is growth set in type: one plot per day, a stem scaled to the minutes studied, and the letter `o` from the wordmark as the flower (an asterisk for a full hour). It is a chart of real data.
- **Dialogs** are a centred card on a laptop and a bottom sheet on a phone.
- **Toasts** are for failures and for effects nobody can see. Success is silent wherever the result is already on screen.
- **Icons** come from one library (Lucide), inline at text colour, never in a coloured coin.

## Motion

- Entering and leaving use a strong ease-out (`--ease-snap`); nothing in the UI uses ease-in. UI transitions are 120 to 220ms; sheets and toasts up to 420ms.
- Only `transform`, `translate`, `opacity`, `box-shadow` and colour are animated. Never `width`, `height`, `top` or `left`, and never `transition: all`.
- The landing page has two authored moments and no others: the hero arrives once on load, and the memory chart draws itself when it is reached. Nothing fades in because the page scrolled.
- Quick search opens with no animation, because it is opened all day.
- Everything rests under `prefers-reduced-motion`, and nothing is hidden when scripts fail.

## Do's and Don'ts

- Do show the real product: the live flashcard in the hero and real captures of the app in the switcher.
- Do say each fact once, in plain Vietnamese, with a verb on every button.
- Don't invent a metric, a testimonial, a logo wall or a review.
- Don't use an eyebrow above a heading, a label in capitals, a middle dot between meta items, an arrow glued to a link, or a decorative status dot.
- Don't use em dashes in interface copy.
- Don't use violet, a gradient between two accents, gradient text, a glow, or glass.
- Don't put a card inside a card, an icon in a coloured coin, or an emoji in place of an icon.
- Don't use a clean vector edge on a cut sheet, a square corner, or a shadow that falls up or left.
