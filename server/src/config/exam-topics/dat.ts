// Canonical DAT topic tree. Sourced from ADA's published DAT content blueprint.
//
// Two exports:
//   DAT_TOPICS — hierarchical (section → subject → leaf). Use for tree UIs and
//                future migration to a richer topic model.
//   DAT_FLAT_TOPICS — flat string array suitable for the Exam.topics field,
//                in the existing platform shape "Section: Leaf".

export interface DatTopicNode {
  code: string
  label: string
  questionCount?: number
  children?: ReadonlyArray<DatTopicNode | string>
}

export const DAT_TOPICS: ReadonlyArray<DatTopicNode> = [
  {
    code: 'sns',
    label: 'Survey of Natural Sciences',
    questionCount: 100,
    children: [
      {
        code: 'sns-bio',
        label: 'Biology',
        questionCount: 40,
        children: [
          'Cell & Molecular Biology',
          'Diversity of Life',
          'Vertebrate Anatomy & Physiology',
          'Developmental Biology',
          'Genetics',
          'Evolution, Ecology & Behavior',
        ],
      },
      {
        code: 'sns-gc',
        label: 'General Chemistry',
        questionCount: 30,
        children: [
          'Stoichiometry & General Concepts',
          'Gases',
          'Liquids & Solids',
          'Solutions',
          'Acids & Bases',
          'Chemical Equilibria',
          'Thermodynamics & Thermochemistry',
          'Chemical Kinetics',
          'Redox Reactions',
          'Atomic & Molecular Structure',
          'Periodic Properties',
          'Nuclear Reactions',
          'Laboratory',
        ],
      },
      {
        code: 'sns-oc',
        label: 'Organic Chemistry',
        questionCount: 30,
        children: [
          'Mechanisms',
          'Chemical & Physical Properties',
          'Stereochemistry',
          'Nomenclature',
          'Reactions of Major Functional Groups',
          'Acid-Base Chemistry',
          'Aromatics & Bonding',
        ],
      },
    ],
  },
  {
    code: 'pat',
    label: 'Perceptual Ability Test',
    questionCount: 90,
    children: [
      'Apertures (Keyholes)',
      'View Recognition (Top-Front-End)',
      'Angle Discrimination',
      'Paper Folding',
      'Cube Counting',
      '3D Form Development (Pattern Folding)',
    ],
  },
  {
    code: 'rc',
    label: 'Reading Comprehension',
    questionCount: 50,
  },
  {
    code: 'qr',
    label: 'Quantitative Reasoning',
    questionCount: 40,
    children: [
      'Algebra',
      'Numerical Calculations',
      'Conversions',
      'Probability & Statistics',
      'Geometry',
      'Trigonometry',
      'Applied Mathematics (Word Problems)',
      'Data Analysis',
    ],
  },
]

function flatten(tree: ReadonlyArray<DatTopicNode>): string[] {
  const out: string[] = []
  for (const section of tree) {
    if (!section.children || section.children.length === 0) {
      // Section with no subtree (e.g. Reading Comprehension).
      out.push(section.label)
      continue
    }
    for (const child of section.children) {
      if (typeof child === 'string') {
        out.push(`${section.label}: ${child}`)
        continue
      }
      // Two-level subtree (e.g. SNS → Biology → leaves).
      if (!child.children || child.children.length === 0) {
        out.push(`${section.label}: ${child.label}`)
        continue
      }
      for (const leaf of child.children) {
        const leafLabel = typeof leaf === 'string' ? leaf : leaf.label
        out.push(`${child.label}: ${leafLabel}`)
      }
    }
  }
  return out
}

export const DAT_FLAT_TOPICS: ReadonlyArray<string> = flatten(DAT_TOPICS)
