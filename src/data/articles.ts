import { Article, NoteItem } from '../types.ts';

export const ARTICLES: Article[] = [
  {
    id: 'art-1',
    slug: 'the-dignity-of-white-space',
    title: 'The Dignity of White Space',
    date: '2026.09.18',
    category: 'Design',
    readTime: '4 min',
    summary: 'Why negative space is not the absence of content, but the acoustic chamber that allows form to resonate.',
    tags: ['Minimalism', 'Composition', 'Space'],
    content: [
      {
        type: 'paragraph',
        text: 'In contemporary digital environments, space is treated as an economic deficit. Every square pixel unburdened by advertising, promotional banners, or floating chips is regarded by the algorithm as lost real estate. Yet in traditional architecture and typography, empty space is where breath occurs.'
      },
      {
        type: 'quote',
        text: 'White space is to reading what silence is to music. Without deliberate pauses, sound collapses into noise.',
        author: 'Yves'
      },
      {
        type: 'heading',
        text: 'The Architecture of Reduction'
      },
      {
        type: 'paragraph',
        text: 'When Max Miedinger and Eduard Hoffmann drew the letterforms of Neue Haas Grotesk in 1957, they were not striving to invent an ornament. They were carving away every idiosyncratic gesture until what remained was purely neutral—an instrument that could convey meaning without imposing its own vanity upon the text.'
      },
      {
        type: 'paragraph',
        text: 'To design with white space requires discipline. It forces the author to confront whether their thoughts are robust enough to stand unsupported by visual trickery. If an argument collapses without colorful badges and animated cards, the argument was likely hollow to begin with.'
      },
      {
        type: 'heading',
        text: 'Living with Less Visual Noise'
      },
      {
        type: 'list',
        items: [
          'Eliminate redundant borders: let the spatial interval define the separation.',
          'Rely on one or two typographic weights rather than ten arbitrary color tokens.',
          'Respect the edge of the page: margin is not waste, it is protective frame.',
          'Allow an idea to finish cleanly before thrusting the next interaction into view.'
        ]
      },
      {
        type: 'paragraph',
        text: 'When we give text room to settle, the reader decelerates. The heart rate stabilizes. Reading shifts from frantic scanning back into contemplation.'
      }
    ]
  },
  {
    id: 'art-2',
    slug: 'on-helvetica-and-neutral-form',
    title: 'On Helvetica and Neutral Form',
    date: '2026.08.04',
    category: 'Typography',
    readTime: '6 min',
    summary: 'A reconsideration of the 1957 Haas typeface: neutrality as a radical artistic stance rather than an absence of personality.',
    tags: ['Typography', 'Haas', 'Swiss Style'],
    content: [
      {
        type: 'paragraph',
        text: 'It has become fashionable among certain graphic design circles to dismiss Helvetica as corporate, generic, or overused. This critique confuses ubiquity with defect. To look at Helvetica through the lens of late-capitalist logo dilution is to miss its founding radicalism.'
      },
      {
        type: 'heading',
        text: 'The Radical Precision of 1957'
      },
      {
        type: 'paragraph',
        text: 'In Münchenstein, Switzerland, Hoffmann and Miedinger set out to answer Akzidenz-Grotesk. They introduced horizontal stroke terminals, uniform stroke weight modulation, and closed apertures that create extraordinary rectangular cohesion on the baseline.'
      },
      {
        type: 'paragraph',
        text: 'Consider the lowercase "a"—the droplet counter-form and vertical right stem lock together with mathematical clarity. Or the uppercase "R" with its decisive curved leg. These letters do not beg for your admiration; they perform their duty with stoic elegance.'
      },
      {
        type: 'quote',
        text: 'The typeface should be like a transparent goblet, holding wine without coloring the vintage.',
        author: 'Beatrice Warde'
      },
      {
        type: 'heading',
        text: 'Why We Return to Black on White'
      },
      {
        type: 'paragraph',
        text: 'When you strip away gradients, drop shadows, and neon flourishes, you are left with pure black ink on an unyielding white plane. Every kerning inconsistency is exposed. Every proportion must hold its weight. Helvetica thrives under this unforgiving sunlight because its internal geometry is structural, not superficial.'
      }
    ]
  },
  {
    id: 'art-3',
    slug: 'analog-routines-in-a-digital-century',
    title: 'Analog Routines in a Digital Century',
    date: '2025.10.14',
    category: 'Essay',
    readTime: '5 min',
    summary: 'Notes on paper notebooks, fountain pens, mechanical watches, and preserving undivided attention.',
    tags: ['Rituals', 'Attention', 'Simplicity'],
    content: [
      {
        type: 'paragraph',
        text: 'My morning starts without a screen. A pot of sencha tea, a Rhodia grid pad, and an old Lamy 2000 with matte black Makrolon. For forty minutes, there is no backspace key. To write on paper is to accept imperfection—you cannot erase without leaving a scar.'
      },
      {
        type: 'heading',
        text: 'Friction as a Creative Filter'
      },
      {
        type: 'paragraph',
        text: 'Digital tools have made synthesis too effortless. We copy, paste, rephrase, and auto-complete at the speed of thoughtlessness. When you must write by hand, the physical friction of metal nib against cellulose acts as a filter. If an idea is not worth the kinetic labor of handwriting, it is usually not worth remembering.'
      },
      {
        type: 'quote',
        text: 'The hand is the visible part of the brain.',
        author: 'Immanuel Kant'
      },
      {
        type: 'paragraph',
        text: 'By keeping my thinking analog and my publishing minimal, the boundary between interior reflection and exterior noise remains intact. The internet is wonderful as an archive, but toxic as a live subconscious.'
      }
    ]
  },
  {
    id: 'art-4',
    slug: 'architectural-silence-in-kyoto',
    title: 'Architectural Silence in Kyoto',
    date: '2025.04.12',
    category: 'Architecture',
    readTime: '7 min',
    summary: 'Reflections from the veranda of Ryōan-ji: fifteen stones, raked gravel, and the mathematics of contemplation.',
    tags: ['Architecture', 'Japan', 'Kyoto'],
    content: [
      {
        type: 'paragraph',
        text: 'At Ryōan-ji in northern Kyoto, fifteen stones rest within an ocean of raked white granite gravel. From any vantage point along the timber veranda, at least one stone remains hidden from view. You must physically move or accept that completeness is an illusion.'
      },
      {
        type: 'heading',
        text: 'The Earthen Wall as Background'
      },
      {
        type: 'paragraph',
        text: 'Behind the stones stands an earthen wall stained with boiled oil and centuries of rain. The wall does not demand your gaze; it simply bounds the space. It prevents the lush mountain pines beyond from overwhelming the restraint of the gravel.'
      },
      {
        type: 'paragraph',
        text: 'In modern software design, we rarely build earthen walls. We constantly puncture our boundaries with alerts, recommendation badges, and related content tickers. We are terrified of letting the observer simply sit with what is in front of them.'
      },
      {
        type: 'quote',
        text: 'True simplicity does not mean an empty room; it means a room where everything has earned its right to exist.',
        author: 'Yves'
      }
    ]
  },
  {
    id: 'art-5',
    slug: 'building-things-for-twenty-years',
    title: 'Building Things for Twenty Years',
    date: '2026.02.15',
    category: 'Essay',
    readTime: '5 min',
    summary: 'Resisting the churn of framework hype and aesthetic disposable fads in favor of durable craft.',
    tags: ['Craft', 'Longevity', 'Code'],
    content: [
      {
        type: 'paragraph',
        text: 'Most software built today will not run in five years. The dependencies will rot, the APIs will deprecate, and the visual styling will look as quaint as a beveled 1999 glossy plastic button. Yet a book printed in Basel in 1962 using lead type and coated paper remains as legible and startling as the day it left the press.'
      },
      {
        type: 'heading',
        text: 'The Plain Text Imperative'
      },
      {
        type: 'paragraph',
        text: 'Plain text is the most resilient cultural artifact in computing history. ASCII outlived punch cards, magnetic tapes, and proprietary document formats. When we write in simple markdown and render it with timeless typographic rules, we are wagering on longevity rather than novelty.'
      },
      {
        type: 'paragraph',
        text: 'Ask yourself: if the internet servers shut down tomorrow and your website were saved as an offline document, would it still hold dignity? If the answer is yes, you have built something real.'
      }
    ]
  },
  {
    id: 'art-6',
    slug: 'colophon-and-studio-inventory',
    title: 'Colophon and Studio Inventory',
    date: '2026.01.02',
    category: 'Note',
    readTime: '3 min',
    summary: 'The physical objects, typography specifications, and deliberate constraints that shape this space.',
    tags: ['Colophon', 'Tools', 'Inventory'],
    content: [
      {
        type: 'paragraph',
        text: 'This website is typeset exclusively in Helvetica (Neue Haas Grotesk). It uses no decorative colors, no drop shadows, and no ornamental iconography. The background is `#FFFFFF`, the ink is `#000000`.'
      },
      {
        type: 'heading',
        text: 'Studio Tools'
      },
      {
        type: 'list',
        items: [
          'Desk: 180cm untreated solid birch table, custom steel hairpin trestles.',
          'Chair: Eames Aluminum Group EA 108 in black hopsak.',
          'Notebook: Midori MD Notebook Cotton (Blank) with 0.5mm 2B graphite pencil.',
          'Watch: 1968 Omega Seamaster, mechanical hand-wound, 34mm.',
          'Audio: Braun SK 55 "Snow White\'s Coffin" turntable designed by Dieter Rams.'
        ]
      },
      {
        type: 'paragraph',
        text: 'Everything in the room serves a function or quietens the mind. There are no spare objects.'
      }
    ]
  }
];

export const SHORT_NOTES: NoteItem[] = [
  {
    id: 'note-1',
    date: '2026.10.02',
    text: 'A quiet morning rain against the studio glass. The sound of graphite moving across cotton paper.',
    location: 'Basel'
  },
  {
    id: 'note-2',
    date: '2026.09.21',
    text: 'To write clearly, you must first be comfortable sitting in an empty room with nothing to say.',
    location: 'Zurich'
  },
  {
    id: 'note-3',
    date: '2026.09.05',
    text: 'Re-reading Josef Müller-Brockmann\'s Grid Systems in Graphic Design. The grid is an attitude, not a prison.',
    location: 'Geneva'
  },
  {
    id: 'note-4',
    date: '2025.11.19',
    text: 'Walking at dusk through the Old Town. The shadows of neoclassical facades cast long diagonals across the limestone.',
    location: 'Bern'
  },
  {
    id: 'note-5',
    date: '2025.07.11',
    text: 'Making sencha. 70 degrees water, three minutes. No screens before midday.',
    location: 'Zurich'
  },
  {
    id: 'note-6',
    date: '2024.12.03',
    text: 'A conversation with a stonemason in St. Gallen about lime mortar and buildings designed to last 200 years.',
    location: 'St. Gallen'
  }
];
