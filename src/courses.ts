/** Subjects + common study topics for each one. */
export const SUBJECT_TOPICS: Record<string, string[]> = {
  "Calc 1": [
    "Limits",
    "Continuity",
    "Derivatives",
    "Product / Quotient Rule",
    "Chain Rule",
    "Related Rates",
    "Optimization",
    "Implicit Differentiation",
    "Mean Value Theorem",
    "Exam 1 review",
    "Exam 2 review",
    "Final exam review",
  ],
  "Calc 2": [
    "Integration by parts",
    "U-substitution",
    "Trig sub",
    "Partial fractions",
    "Improper integrals",
    "Sequences",
    "Series",
    "Taylor series",
    "Polar coordinates",
    "Parametric equations",
    "Vectors and applications",
    "System of equations",
    "Exam 1 review",
    "Exam 2 review",
    "Final exam review",
  ],
  "Calc 3": [
    "Vectors in 3D",
    "Partial derivatives",
    "Gradients",
    "Multiple integrals",
    "Line integrals",
    "Green's Theorem",
    "Stokes' Theorem",
    "Exam review",
    "Final exam review",
  ],
  "Linear Algebra": [
    "Matrices",
    "Row reduction",
    "Determinants",
    "Eigenvalues / eigenvectors",
    "Vector spaces",
    "Linear transformations",
    "Orthogonality",
    "Exam review",
    "Final exam review",
  ],
  "Discrete Math": [
    "Logic & proofs",
    "Sets",
    "Functions & relations",
    "Combinatorics",
    "Graph theory",
    "Induction",
    "Recurrence relations",
    "Exam review",
    "Final exam review",
  ],
  "Differential Equations": [
    "Separable ODEs",
    "First-order linear",
    "Second-order ODEs",
    "Laplace transforms",
    "Systems of ODEs",
    "Exam review",
    "Final exam review",
  ],
  "Physics 1": [
    "Kinematics",
    "Newton's laws",
    "Forces & free-body diagrams",
    "Energy & work",
    "Momentum",
    "Rotation",
    "Oscillations",
    "Exam review",
    "Final exam review",
  ],
  "Physics 2": [
    "Electric fields",
    "Gauss's law",
    "Circuits",
    "Magnetism",
    "Induction",
    "Waves & optics",
    "Exam review",
    "Final exam review",
  ],
  "Chemistry 1": [
    "Stoichiometry",
    "Atomic structure",
    "Periodic trends",
    "Bonding",
    "Thermochemistry",
    "Gases",
    "Exam review",
    "Final exam review",
  ],
  "Chemistry 2": [
    "Equilibrium",
    "Acids & bases",
    "Kinetics",
    "Electrochemistry",
    "Thermodynamics",
    "Exam review",
    "Final exam review",
  ],
  "Biology 1": [
    "Cell structure",
    "Macromolecules",
    "Metabolism",
    "Genetics basics",
    "Exam review",
    "Final exam review",
  ],
  "Intro to Programming": [
    "Variables & types",
    "Conditionals",
    "Loops",
    "Functions",
    "Arrays / lists",
    "File I/O",
    "Debugging",
    "Project help",
    "Exam review",
  ],
  "Data Structures": [
    "Arrays & lists",
    "Stacks & queues",
    "Linked lists",
    "Trees",
    "Heaps",
    "Hash tables",
    "Graphs",
    "Sorting",
    "Big-O analysis",
    "Exam review",
    "Final exam review",
  ],
  "Algorithms": [
    "Divide & conquer",
    "Dynamic programming",
    "Greedy algorithms",
    "Graph algorithms",
    "Complexity",
    "Exam review",
    "Final exam review",
  ],
  "Computer Organization": [
    "Binary & numbering",
    "Assembly basics",
    "CPU pipeline",
    "Memory hierarchy",
    "Caches",
    "Exam review",
    "Final exam review",
  ],
  "Software Engineering": [
    "Requirements",
    "UML / design",
    "Agile / Scrum",
    "Testing",
    "Git workflows",
    "Design patterns",
    "Project milestone help",
    "Exam review",
  ],
  "Databases": [
    "ER diagrams",
    "SQL selects",
    "Joins",
    "Normalization",
    "Transactions",
    "Exam review",
    "Final exam review",
  ],
  "Statistics": [
    "Descriptive stats",
    "Probability",
    "Distributions",
    "Hypothesis testing",
    "Confidence intervals",
    "Regression",
    "Exam review",
    "Final exam review",
  ],
  "Economics": [
    "Supply & demand",
    "Elasticity",
    "Market structures",
    "GDP & inflation",
    "Exam review",
    "Final exam review",
  ],
  "Psychology": [
    "Research methods",
    "Memory & learning",
    "Development",
    "Social psychology",
    "Exam review",
    "Final exam review",
  ],
  "English Comp": [
    "Thesis statements",
    "Essay structure",
    "Citations / MLA / APA",
    "Peer review",
    "Rhetorical analysis",
    "Research paper help",
  ],
  "Public Speaking": [
    "Speech outline",
    "Persuasive speech",
    "Informative speech",
    "Delivery practice",
    "Visual aids",
  ],
};

export const COURSES = Object.keys(SUBJECT_TOPICS);

export const LOCATIONS = [
  "Student Center",
  "Library",
  "Library 2nd floor",
  "Science hall",
  "Math building",
  "Engineering building",
  "Chemistry building",
  "CS lab",
  "Writing center",
  "Online (Zoom)",
  "Online (Teams)",
  "Coffee shop near campus",
];

/** Partner = 1:1 (2 people). Small = 3–7. Big = 8+. */
export const GROUP_KINDS = [
  { id: "partner", label: "Partner (1:1)", min: 2, max: 2, defaultSize: 2 },
  { id: "small", label: "Small group (3–7)", min: 3, max: 7, defaultSize: 5 },
  { id: "big", label: "Big group (8+)", min: 8, max: 20, defaultSize: 12 },
] as const;

export type GroupKindId = (typeof GROUP_KINDS)[number]["id"];

export const MEETUP_STYLES = [
  "Practice problems",
  "Lecture / teach-back",
  "Exam review",
  "Homework help",
  "Concept review",
  "Lab prep",
  "Discussion",
  "Mixed",
] as const;

export function topicsFor(subject: string) {
  return SUBJECT_TOPICS[subject] ?? [];
}

export function groupKindById(id: string) {
  return GROUP_KINDS.find((k) => k.id === id);
}

export function groupKindLabel(id: string) {
  return groupKindById(id)?.label ?? "Small group (3–7)";
}

export function groupKindFromMaxSize(maxSize: number): GroupKindId {
  if (maxSize <= 2) return "partner";
  if (maxSize <= 7) return "small";
  return "big";
}
