const SUBJECT_KEYWORDS = [
  {
    subject: "Physics",
    keywords: ["force", "motion", "energy", "electric", "magnet", "wave", "atom", "gravity"],
  },
  {
    subject: "Chemistry",
    keywords: ["chemical", "reaction", "acid", "base", "molecule", "element", "compound"],
  },
  {
    subject: "Biology",
    keywords: ["cell", "organism", "plant", "animal", "gene", "ecosystem", "photosynthesis"],
  },
  {
    subject: "Mathematics",
    keywords: ["equation", "algebra", "geometry", "probability", "calculus", "number"],
  },
  {
    subject: "Economics",
    keywords: ["market", "inflation", "demand", "supply", "trade", "economy", "finance"],
  },
  {
    subject: "History",
    keywords: ["war", "empire", "revolution", "civilization", "history", "independence"],
  },
  {
    subject: "Geography",
    keywords: ["climate", "river", "mountain", "population", "map", "monsoon", "geography"],
  },
  {
    subject: "Political Science",
    keywords: ["government", "democracy", "constitution", "election", "policy", "rights"],
  },
  {
    subject: "Environmental Science",
    keywords: ["pollution", "environment", "climate change", "sustainability", "conservation"],
  },
  {
    subject: "CS",
    keywords: ["algorithm", "computer", "program", "code", "network", "database", "ai"],
  },
];

function detectSubject(question) {
  const normalizedQuestion = question.toLowerCase();
  const match = SUBJECT_KEYWORDS.find(({ keywords }) =>
    keywords.some((keyword) => normalizedQuestion.includes(keyword))
  );
  return match?.subject ?? "General";
}

function buildSearchUrl(baseUrl, question) {
  return `${baseUrl}${encodeURIComponent(question)}`;
}

function buildQuiz(question, partLabel) {
  return [
    {
      question: `What is the most useful first step in the ${partLabel.toLowerCase()} study of ${question}?`,
      options: [
        "Identify the main idea and key terms",
        "Memorize random facts without context",
        "Skip directly to difficult details",
        "Ignore examples and applications",
      ],
      correctIndex: 0,
      explanation:
        "Starting with the main idea gives the rest of the lesson a clear structure.",
    },
    {
      question: `Which habit best improves understanding of ${question} during ${partLabel.toLowerCase()}?`,
      options: [
        "Checking how ideas connect to examples",
        "Reading once without asking questions",
        "Avoiding summaries and notes",
        "Focusing only on isolated definitions",
      ],
      correctIndex: 0,
      explanation:
        "Understanding grows when you connect concepts, examples, and your own explanation.",
    },
  ];
}

export function buildFallbackLesson(question, language, level) {
  const safeQuestion = question.trim();
  const subject = detectSubject(safeQuestion);
  const encyclopediaUrl = buildSearchUrl(
    "https://en.wikipedia.org/wiki/Special:Search?search=",
    safeQuestion
  );
  const britannicaUrl = buildSearchUrl(
    "https://www.britannica.com/search?query=",
    safeQuestion
  );
  const khanAcademyUrl = buildSearchUrl(
    "https://www.khanacademy.org/search?page_search_query=",
    safeQuestion
  );
  const googleNewsUrl = buildSearchUrl("https://news.google.com/search?q=", safeQuestion);

  return {
    question: safeQuestion,
    topic: safeQuestion,
    subject,
    language,
    level,
    parts: [
      {
        partNumber: 1,
        title: "Foundation",
        subject,
        content: `> RealLearn generated a backup lesson because the AI service was temporarily unavailable.\n\n## Start with the core idea\nWrite one clear sentence that explains **${safeQuestion}** in your own words. Then list the most important terms, symbols, or facts that appear in textbook definitions.\n\n## Build a simple mental model\nAsk yourself:\n- What is the main concept?\n- Why does it matter in this subject?\n- What basic example helps make it concrete?\n\n## Study move\nCreate a short summary and one everyday example so you can explain the topic without copying the textbook.`,
        sources: [encyclopediaUrl, britannicaUrl],
        quiz: buildQuiz(safeQuestion, "Foundation"),
      },
      {
        partNumber: 2,
        title: "Mechanism",
        subject,
        content: `> Use this section to understand how **${safeQuestion}** works step by step.\n\n## Trace the logic\nBreak the topic into inputs, process, and result. If there is a formula, diagram, or sequence, explain what each part does and why it matters.\n\n## Ask deeper questions\n- What changes from one step to the next?\n- What causes the final result?\n- Which mistakes lead to confusion?\n\n## Study move\nDraw a flowchart or numbered explanation from memory, then compare it with a trusted source.`,
        sources: [khanAcademyUrl, encyclopediaUrl],
        quiz: buildQuiz(safeQuestion, "Mechanism"),
      },
      {
        partNumber: 3,
        title: "Real-world connection",
        subject,
        content: `> Connect **${safeQuestion}** to current events, technology, society, or nature.\n\n## Look for evidence in the world\nSearch for a recent article, case study, or news item where this topic matters. Focus on what problem is being solved, what decisions are being made, and what evidence supports them.\n\n## Reflection prompts\n- Where do people use this idea today?\n- Why does it matter outside exams?\n- What would happen if people misunderstood it?\n\n## Study move\nWrite two sentences linking the topic to a recent real-world example and explain the connection clearly.`,
        sources: [googleNewsUrl, britannicaUrl],
        quiz: buildQuiz(safeQuestion, "Real-world connection"),
      },
    ],
    keyTakeaways: [
      `Start ${safeQuestion} by defining the core idea in simple language.`,
      `Understand ${safeQuestion} best by tracing each step and checking how the pieces connect.`,
      `Link ${safeQuestion} to a current example so the concept feels useful and memorable.`,
    ],
  };
}
