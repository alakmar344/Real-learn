/**
 * Special-day greetings: fixed-date observances that swap the ordinary
 * time-of-day greeting for something worth the moment. Kept here so the
 * homepage hero, the EasterEggs toasts, and the verify script share one
 * source of truth.
 */

export interface SpecialDay {
  /** Unique marker key for the once-per-day toast guard. */
  id: string;
  /** 1-12. */
  month: number;
  /** 1-31. */
  day: number;
  /** Short display name, e.g. "Children's Day". */
  name: string;
  /** Toast sentence shown once that day. */
  greeting: string;
  /** Optional homepage hero line (no trailing punctuation — the name is
   *  appended before the final "!" when signed in). Omit for days that are
   *  worth a toast but not a full hero moment. */
  hero?: string;
  /** Fire a confetti burst with the toast. Reserved for the big ones. */
  confetti?: boolean;
}

export const SPECIAL_DAYS: SpecialDay[] = [
  // ── Major celebrations ──
  { id: "newyear", month: 1, day: 1, name: "New Year", hero: "Happy New Year", confetti: true, greeting: "Happy New Year! A whole year of curiosity awaits." },
  { id: "republicday", month: 1, day: 26, name: "Republic Day", hero: "Happy Republic Day", confetti: true, greeting: "Happy Republic Day! Here's to a nation that never stops asking why." },
  { id: "piday", month: 3, day: 14, name: "Pi Day", hero: "Happy Pi Day", confetti: true, greeting: "Happy Pi Day — 3.14159… the day math throws a party." },
  { id: "youthday", month: 8, day: 12, name: "International Youth Day", hero: "Happy International Youth Day", confetti: true, greeting: "International Youth Day — your generation asks the best questions." },
  { id: "independenceday", month: 8, day: 15, name: "Independence Day", hero: "Happy Independence Day", confetti: true, greeting: "Happy Independence Day! Stay free — and keep asking why." },
  { id: "christmas", month: 12, day: 25, name: "Christmas", hero: "Merry Christmas", confetti: true, greeting: "Merry Christmas! The best gift is a curious mind." },

  // ── January ──
  { id: "brailleday", month: 1, day: 4, name: "World Braille Day", greeting: "World Braille Day — every mind deserves its own way to read." },
  { id: "nationalyouthday", month: 1, day: 12, name: "National Youth Day", hero: "Happy National Youth Day", greeting: "National Youth Day — you're the energy that keeps learning alive." },
  { id: "makarsankranti", month: 1, day: 14, name: "Makar Sankranti", hero: "Happy Makar Sankranti", greeting: "Happy Makar Sankranti! Let your questions soar like kites." },
  { id: "educationday", month: 1, day: 24, name: "International Day of Education", greeting: "International Day of Education — the whole world is our classroom today." },

  // ── February ──
  { id: "cancerday", month: 2, day: 4, name: "World Cancer Day", greeting: "World Cancer Day — knowing our bodies starts with gentle, curious questions." },
  { id: "girlsinscience", month: 2, day: 11, name: "Women and Girls in Science", greeting: "Women and girls in science day — shoot for the stars; no orbit is too far." },
  { id: "radioday", month: 2, day: 13, name: "World Radio Day", greeting: "World Radio Day — ideas travel farthest when they're shared." },
  { id: "motherlanguageday", month: 2, day: 21, name: "International Mother Language Day", greeting: "Mother Language Day — all twelve of your languages are superpowers." },
  { id: "scienceday", month: 2, day: 28, name: "National Science Day", greeting: "National Science Day — C. V. Raman proved a curious mind can change the world." },

  // ── March ──
  { id: "wildlifeday", month: 3, day: 3, name: "World Wildlife Day", greeting: "World Wildlife Day — stay wild, stay curious." },
  { id: "womensday", month: 3, day: 8, name: "International Women's Day", hero: "Happy Women's Day", greeting: "Happy Women's Day — to every girl who asks 'but why?' Keep asking." },
  { id: "happinessday", month: 3, day: 20, name: "International Day of Happiness", greeting: "International Day of Happiness — staying curious shows." },
  { id: "poetryday", month: 3, day: 21, name: "World Poetry Day", greeting: "World Poetry Day — every question is a line waiting to rhyme." },

  // ── April ──
  { id: "autismawareness", month: 4, day: 2, name: "World Autism Awareness Day", greeting: "World Autism Awareness Day — every mind is a different world." },
  { id: "healthday", month: 4, day: 7, name: "World Health Day", greeting: "World Health Day — your body is a lab; run healthy experiments." },
  { id: "yurisnight", month: 4, day: 12, name: "Yuri's Night", greeting: "Yuri's Night — space is the final classroom." },
  { id: "ambedkarjayanti", month: 4, day: 14, name: "Ambedkar Jayanti", greeting: "Ambedkar Jayanti — education is the tool that levels every field." },
  { id: "earthday", month: 4, day: 22, name: "Earth Day", hero: "Happy Earth Day", greeting: "Earth Day — the one planet worth every curious question." },
  { id: "bookday", month: 4, day: 23, name: "World Book Day", hero: "Happy World Book Day", greeting: "World Book Day — a good question beats a whole shelf of answers." },
  { id: "danceday", month: 4, day: 29, name: "International Dance Day", greeting: "International Dance Day — learn the steps, then make your own." },

  // ── May ──
  { id: "labourday", month: 5, day: 1, name: "Labour Day", greeting: "Labour Day — every worker's story is worth understanding." },
  { id: "starwarsday", month: 5, day: 4, name: "Star Wars Day", hero: "Happy Star Wars Day", greeting: "May the fourth be with you — and with your curiosity." },
  { id: "technologyday", month: 5, day: 11, name: "National Technology Day", greeting: "National Technology Day — keep building the future with your questions." },
  { id: "telecomday", month: 5, day: 17, name: "World Telecommunication Day", greeting: "World Telecommunication Day — ideas connected are ideas multiplied." },
  { id: "diversityday", month: 5, day: 21, name: "World Day for Cultural Diversity", greeting: "Cultural Diversity Day — every culture is a new lens on the world." },
  { id: "towelday", month: 5, day: 25, name: "Towel Day", hero: "Happy Towel Day", greeting: "Towel Day — always know where your towel is, and never stop asking questions." },

  // ── June ──
  { id: "environmentday", month: 6, day: 5, name: "World Environment Day", greeting: "Environment Day — every green question plants a better future." },
  { id: "oceansday", month: 6, day: 8, name: "World Oceans Day", greeting: "World Oceans Day — dive deep; that's where the best answers live." },
  { id: "yogaday", month: 6, day: 21, name: "International Yoga Day", greeting: "International Yoga Day — breathe in, think big, stay calm." },

  // ── July ──
  { id: "chocolateday", month: 7, day: 7, name: "World Chocolate Day", hero: "Happy Chocolate Day", greeting: "World Chocolate Day — sweet answers for sweet questions." },
  { id: "malaladay", month: 7, day: 12, name: "Malala Day", greeting: "Malala Day — one girl's questions moved the world." },
  { id: "kargilvijay", month: 7, day: 26, name: "Kargil Vijay Diwas", greeting: "Kargil Vijay Diwas — honour the brave, and stay sharp for the curious." },
  { id: "friendshipday", month: 7, day: 30, name: "International Friendship Day", hero: "Happy Friendship Day", greeting: "Friendship Day — learning sticks better when shared with friends." },

  // ── August ──
  { id: "photographyday", month: 8, day: 19, name: "World Photography Day", greeting: "World Photography Day — every picture is a question about light." },
  { id: "sportsday", month: 8, day: 29, name: "National Sports Day", greeting: "National Sports Day — every game is a live science lesson." },

  // ── September ──
  { id: "teachersday", month: 9, day: 5, name: "Teachers' Day", hero: "Happy Teachers' Day", greeting: "Happy Teachers' Day — today, the world is your teacher." },
  { id: "literacyday", month: 9, day: 8, name: "International Literacy Day", greeting: "Literacy Day — words are your superpower." },
  { id: "hindidiwas", month: 9, day: 14, name: "Hindi Diwas", greeting: "Hindi Diwas — every language is a window into a world." },
  { id: "peaceday", month: 9, day: 21, name: "International Day of Peace", greeting: "Day of Peace — curiosity builds bridges, never walls." },
  { id: "tourismday", month: 9, day: 27, name: "World Tourism Day", greeting: "World Tourism Day — the world is the biggest classroom." },

  // ── October ──
  { id: "worldteachersday", month: 10, day: 5, name: "World Teachers' Day", hero: "Happy World Teachers' Day", greeting: "World Teachers' Day — thank every teacher, starting with curiosity." },
  { id: "mentalhealthday", month: 10, day: 10, name: "World Mental Health Day", greeting: "Mental Health Day — your mind matters; rest is productive." },
  { id: "foodday", month: 10, day: 16, name: "World Food Day", greeting: "World Food Day — knowing where food comes from feeds smarter choices." },
  { id: "unday", month: 10, day: 24, name: "United Nations Day", greeting: "United Nations Day — big problems shrink when minds work together." },

  // ── November ──
  { id: "worldscienceday", month: 11, day: 10, name: "World Science Day", greeting: "World Science Day — question everything, gently." },
  { id: "childrensday", month: 11, day: 14, name: "Children's Day", hero: "Happy Children's Day", greeting: "Happy Children's Day! Stay curious forever." },
  { id: "helloday", month: 11, day: 21, name: "World Hello Day", hero: "Happy World Hello Day", greeting: "World Hello Day — say hello to someone new; ideas follow." },
];

const DAY_INDEX = new Map(SPECIAL_DAYS.map((d) => [`${d.month}-${d.day}`, d]));

/** Look up a special day by its calendar date. Returns undefined on ordinary days. */
export function specialDayFor(month: number, day: number): SpecialDay | undefined {
  return DAY_INDEX.get(`${month}-${day}`);
}
