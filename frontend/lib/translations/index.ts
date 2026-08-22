// frontend/lib/translations/index.ts

export type TranslationKey =
  | "nav.home"
  | "nav.learn"
  | "nav.stats"
  | "sidebar.newLesson"
  | "sidebar.savedLessons"
  | "sidebar.searchPlaceholder"
  | "sidebar.emptyState"
  | "sidebar.noMatch"
  | "sidebar.lightMode"
  | "sidebar.darkMode"
  | "sidebar.settings"
  | "sidebar.removeTitle"
  | "sidebar.removeMessage"
  | "sidebar.removeConfirm"
  | "sidebar.removeCancel"
  | "hero.greeting.deeply"
  | "hero.greeting.clearly"
  | "hero.greeting.master"
  | "hero.greeting.explore"
  | "hero.greeting.understand"
  | "hero.greeting.curious"
  | "hero.askPlaceholder"
  | "hero.askLabel"
  | "hero.listening"
  | "hero.mode.fast"
  | "hero.mode.fastHint"
  | "hero.mode.explain"
  | "hero.mode.explainHint"
  | "hero.instantAnswer"
  | "hero.clear"
  | "hero.enter"
  | "hero.signInToEnter"
  | "hero.try"
  | "hero.resume"
  | "hero.pickUpWhereLeft"
  | "hero.step1"
  | "hero.step2"
  | "hero.step3"
  | "hero.badgeLevel"
  | "hero.badgePrivate"
  | "learn.readyToast"
  | "learn.completeToast"
  | "learn.emptyTitle"
  | "learn.emptySub"
  | "learn.goHome"
  | "learn.partTag"
  | "learn.copy"
  | "learn.copied"
  | "learn.listen"
  | "learn.stop"
  | "learn.alreadyKnow"
  | "learn.readThisTakeQuiz"
  | "learn.readThisContinue"
  | "learn.collapsePart"
  | "learn.partLocked"
  | "learn.passToUnlock"
  | "learn.intent1"
  | "learn.intent2"
  | "learn.intent3"
  | "quiz.quickCheck"
  | "quiz.subtitle"
  | "quiz.close"
  | "quiz.reread"
  | "quiz.revisitOne"
  | "quiz.revisitMulti"
  | "quiz.questionMeta"
  | "quiz.nextQuestion"
  | "quiz.unlockNextPart"
  | "quiz.retryMissed"
  | "flashcards.title"
  | "flashcards.sub"
  | "flashcards.deckDone"
  | "flashcards.flippedCount"
  | "flashcards.tapToFlip"
  | "flashcards.tapToFlipBack"
  | "flashcards.answer"
  | "summary.keyTakeaways"
  | "summary.copySummary"
  | "summary.cardIndex"
  | "completion.gotIt"
  | "completion.journeyComplete"
  | "completion.scored"
  | "completion.cleanRun"
  | "completion.solid"
  | "completion.tough"
  | "completion.whatConnectsNext"
  | "completion.retakeQuiz"
  | "completion.continueLearning"
  | "followup.label"
  | "followup.placeholder"
  | "followup.teachMeMore"
  | "followup.generating"
  | "progress.title"
  | "progress.sub"
  | "progress.level"
  | "progress.xpTotal"
  | "progress.xpToNext"
  | "progress.dayStreak"
  | "progress.longest"
  | "progress.freezes"
  | "progress.goalSafe"
  | "progress.goalExtend"
  | "progress.dailyGoal"
  | "progress.partsToday"
  | "progress.setTarget"
  | "progress.lifetimeStats"
  | "progress.journeys"
  | "progress.quizzesPassed"
  | "progress.perfectRuns"
  | "progress.languages"
  | "progress.subjects"
  | "progress.followUps"
  | "progress.activity"
  | "progress.achievements"
  | "progress.learnSomethingNew"
  | "settings.back"
  | "settings.title"
  | "settings.sub"
  | "settings.preferences"
  | "settings.prefSub"
  | "settings.theme"
  | "settings.answerMode"
  | "settings.language"
  | "settings.level"
  | "settings.perf"
  | "settings.learningPref"
  | "settings.learningPrefSub"
  | "settings.checklistLegend"
  | "settings.notesLabel"
  | "settings.notesPlaceholder"
  | "settings.account"
  | "settings.yourAccount"
  | "settings.accountHint"
  | "settings.privacy"
  | "settings.privacySub"
  | "settings.cookieAction"
  | "settings.data"
  | "settings.dataSub"
  | "settings.exportBtn"
  | "settings.exporting"
  | "settings.downloadJson"
  | "settings.deleteBtn"
  | "settings.deleting"
  | "settings.permanent"
  | "settings.legal"
  | "settings.legalSub"
  | "settings.privacyPolicy"
  | "settings.terms"
  | "settings.parentRequest"
  | "settings.emailGrievance"
  | "settings.deleteModalTitle"
  | "settings.deleteModalMsg"
  | "settings.deleteModalConfirm"
  | "settings.deleteModalCancel"
  | "footer.aiDisclaimer"
  | "footer.privacy"
  | "footer.terms"
  | "footer.legal"
  | "footer.support"
  | "footer.companionOne"
  | "footer.companionDays"
  | "footer.companionMilestone"
  | "common.close"
  | "common.cancel"
  | "common.save"
  | "common.retry"
  | "common.errorTitle"
  | "loading.generatingAnswer"
  | "loading.generatingLesson"
  | "loading.progressLabel"
  | "loading.stage.understand"
  | "loading.stage.research"
  | "loading.stage.ground"
  | "loading.stage.writeLesson"
  | "loading.stage.writeDirect"
  | "loading.stage.polish"
  | "loading.stage.craftQuizzes"
  | "loading.stage.craftQuiz"
  | "loading.stage.working"
  | "loading.part.foundation"
  | "loading.part.mechanism"
  | "loading.part.realWorld"
  | "loading.part.yourAnswer"
  | "loading.slow.title"
  | "loading.slow.resilient"
  | "loading.slow.factCheck"
  | "error.title"
  | "error.retry"
  | "error.goHome"
  | "audio.generating"
  | "audio.listenSection"
  | "audio.stopReading"
  | "audio.unsupported"
  | "mic.askVoice"
  | "mic.stopVoice"
  | "mic.unsupported"
  | "share.title"
  | "share.preparing"
  | "share.copyText"
  | "share.downloaded"
  | "share.copied"
  | "share.failed"
  | "share.copyFailed"
  | "flashcards.coreInsight"
  | "flashcards.hintGeneral"
  | "flashcards.hintPart"
  | "flashcards.shuffle"
  | "flashcards.prev"
  | "flashcards.next"
  | "completion.suggestConnect"
  | "completion.suggestApply"
  | "completion.suggestMisconception"
  | "feedback.modalTitle"
  | "feedback.modalSub"
  | "feedback.rateLabel"
  | "feedback.likeLabel"
  | "feedback.improveLabel"
  | "feedback.optional"
  | "feedback.likePlaceholder"
  | "feedback.improvePlaceholder"
  | "feedback.send"
  | "feedback.sending"
  | "feedback.askLater"
  | "feedback.noThanks"
  | "feedback.thankYou"
  | "feedback.snoozed"
  | "feedback.pickRating"
  | "cookie.title"
  | "cookie.body"
  | "cookie.policy"
  | "cookie.allow"
  | "cookie.decline"
  | "cookie.saving"
  | "shortcuts.title"
  | "shortcuts.submit"
  | "shortcuts.toggle"
  | "shortcuts.close"
  | "shortcuts.selectOption"
  | "shortcuts.nextQuestion"
  | "shortcuts.hint"
  | "achievements.title"
  | "achievements.unlockedCount"
  | "achievements.earnedDone"
  | "achievements.pctThere"
  | "achievements.tier.bronze"
  | "achievements.tier.silver"
  | "achievements.tier.gold"
  | "achievements.tier.legendary"
  | "learn.quizPassed"
  | "learn.partPassed"
  | "settings.analyticsAllowed"
  | "settings.analyticsOff"
  | "settings.analyticsNotSet"
  | "settings.dataDeleted"
  | "settings.exportDownloaded"
  | "settings.exportFailed"
  | "progress.levelTitle.finalBoss"
  | "progress.levelTitle.mainCharacter"
  | "progress.levelTitle.bigBrain"
  | "progress.levelTitle.lockedIn"
  | "progress.levelTitle.onTheGrind"
  | "progress.levelTitle.explorer"
  | "progress.levelTitle.freshSpawn"
  | "progress.heatmapLess"
  | "progress.heatmapMore"
  | "progress.heatmapAria"
  | "progress.heatmapCell"
  | "progress.dailyGoalAria";

export type Translations = Record<TranslationKey, string>;

export const en: Translations = {
  "nav.home": "Home",
  "nav.learn": "Learn",
  "nav.stats": "Stats",
  "sidebar.newLesson": "New lesson",
  "sidebar.savedLessons": "Saved lessons",
  "sidebar.searchPlaceholder": "Search saved lessons",
  "sidebar.emptyState": "Ask a question and your lesson will be saved here automatically. You can return anytime to continue where you left off.",
  "sidebar.noMatch": "No saved lessons match “{query}”.",
  "sidebar.lightMode": "Light mode",
  "sidebar.darkMode": "Dark mode",
  "sidebar.settings": "Settings",
  "sidebar.removeTitle": "Remove saved lesson?",
  "sidebar.removeMessage": "Remove “{title}” from your saved lessons?",
  "sidebar.removeConfirm": "Remove",
  "sidebar.removeCancel": "Keep it",
  "hero.greeting.deeply": "learn deeply",
  "hero.greeting.clearly": "think clearly",
  "hero.greeting.master": "master anything",
  "hero.greeting.explore": "explore concepts",
  "hero.greeting.understand": "understand faster",
  "hero.greeting.curious": "stay curious",
  "hero.askPlaceholder": "Ask anything you want to understand...",
  "hero.askLabel": "What do you want to understand today?",
  "hero.listening": "Listening — {text}",
  "hero.mode.fast": "Fast",
  "hero.mode.fastHint": "One direct answer, generated instantly",
  "hero.mode.explain": "Explain",
  "hero.mode.explainHint": "3-part deep learning journey with quizzes",
  "hero.instantAnswer": "Instant answer",
  "hero.clear": "Clear",
  "hero.enter": "Enter",
  "hero.signInToEnter": "Sign in",
  "hero.try": "Try:",
  "hero.resume": "resume →",
  "hero.pickUpWhereLeft": "pick up where you left off",
  "hero.step1": "Ask any question in 63 languages",
  "hero.step2": "Learn step-by-step with real-world facts",
  "hero.step3": "Lock in memory with instant quizzes",
  "hero.badgeLevel": "Class 6 to College Level",
  "hero.badgePrivate": "Zero Ads & Private",
  "learn.readyToast": "Your lesson is ready",
  "learn.completeToast": "Journey complete",
  "learn.emptyTitle": "No lesson loaded yet",
  "learn.emptySub": "Head back home and ask a question to start learning.",
  "learn.goHome": "Go Home →",
  "learn.partTag": "Part {num}",
  "learn.copy": "Copy",
  "learn.copied": "Copied",
  "learn.listen": "Listen",
  "learn.stop": "Stop",
  "learn.alreadyKnow": "I already know this → Take quiz",
  "learn.readThisTakeQuiz": "I've Read This → Take Quiz",
  "learn.readThisContinue": "I've Read This → Continue",
  "learn.collapsePart": "Collapse part",
  "learn.partLocked": "Part {num} locked",
  "learn.passToUnlock": "Pass the Part {prev} check to unlock",
  "learn.intent1": "Foundation — Core mental model & intuition built without jargon.",
  "learn.intent2": "Mechanism — How it works step-by-step & disarming common doubts.",
  "learn.intent3": "Application & Next — Real-world impact & what connects next.",
  "quiz.quickCheck": "Quick Check",
  "quiz.subtitle": "{count} question{s} about what you just read",
  "quiz.close": "Close quiz",
  "quiz.reread": "Re-read the section before retrying",
  "quiz.revisitOne": "Almost there — one question to revisit. Your correct answers are saved.",
  "quiz.revisitMulti": "Almost there — {count} questions to revisit. Your correct answers are saved.",
  "quiz.questionMeta": "Question {current} of {total}",
  "quiz.nextQuestion": "Next Question →",
  "quiz.unlockNextPart": "Unlock Next Part →",
  "quiz.retryMissed": "Retry the Missed Ones →",
  "flashcards.title": "Flashcards",
  "flashcards.sub": "Tap a card to flip it — recall the idea before peeking.",
  "flashcards.deckDone": "Deck done — nice recall",
  "flashcards.flippedCount": "{flipped}/{total} flipped",
  "flashcards.tapToFlip": "tap to flip",
  "flashcards.tapToFlipBack": "tap to flip back",
  "flashcards.answer": "answer",
  "summary.keyTakeaways": "Key Takeaways",
  "summary.copySummary": "Copy summary",
  "summary.cardIndex": "{current} of {total}",
  "completion.gotIt": "Got it.",
  "completion.journeyComplete": "Journey complete",
  "completion.scored": "You scored {score}/{max} on the first try — {msg}",
  "completion.cleanRun": "a clean run.",
  "completion.solid": "solid, and the retries sealed it.",
  "completion.tough": "a tough one. It'll feel easier next time.",
  "completion.whatConnectsNext": "What Connects Next · Go deeper",
  "completion.retakeQuiz": "Retake Quiz",
  "completion.continueLearning": "Continue Learning →",
  "followup.label": "Ask a follow-up and unlock a new 3-part journey.",
  "followup.placeholder": "Still curious? Pull the thread…",
  "followup.teachMeMore": "Teach Me More →",
  "followup.generating": "Generating…",
  "progress.title": "Progress",
  "progress.sub": "Every quiz you pass builds this — at your own pace.",
  "progress.level": "Level {level}",
  "progress.xpTotal": "{xp} XP total",
  "progress.xpToNext": "{into} / {forNext} XP to Level {next}",
  "progress.dayStreak": "day streak",
  "progress.longest": "Longest",
  "progress.freezes": "Freezes",
  "progress.goalSafe": "Today's goal is done — your streak is safe. See you tomorrow.",
  "progress.goalExtend": "Complete today's daily goal to extend your streak.",
  "progress.dailyGoal": "Daily goal",
  "progress.partsToday": "{count}/{goal} parts today",
  "progress.setTarget": "Set your target",
  "progress.lifetimeStats": "Lifetime stats",
  "progress.journeys": "Journeys",
  "progress.quizzesPassed": "Quizzes passed",
  "progress.perfectRuns": "Perfect runs",
  "progress.languages": "Languages",
  "progress.subjects": "Subjects",
  "progress.followUps": "Follow-ups",
  "progress.activity": "Activity",
  "progress.achievements": "Achievements",
  "progress.learnSomethingNew": "Learn something new →",
  "settings.back": "Back",
  "settings.title": "Settings",
  "settings.sub": "Manage your account, data, and preferences.",
  "settings.preferences": "Preferences",
  "settings.prefSub": "Appearance, language, and learning level are saved on this device.",
  "settings.theme": "Theme",
  "settings.answerMode": "Answer mode",
  "settings.language": "Language",
  "settings.level": "Learning level",
  "settings.perf": "Visual performance",
  "settings.learningPref": "Learning preferences",
  "settings.learningPrefSub": "Optional: tell us how you learn best. This is stored on this device and sent with each lesson request so explanations can be tailored to you.",
  "settings.checklistLegend": "Select any that apply",
  "settings.notesLabel": "Anything else you'd like us to know?",
  "settings.notesPlaceholder": "For example: I understand concepts better with pictures...",
  "settings.account": "Account",
  "settings.yourAccount": "Your account",
  "settings.accountHint": "Manage your profile, sign out, or delete your account via the menu above.",
  "settings.privacy": "Privacy",
  "settings.privacySub": "Change your cookie and analytics choice anytime — withdrawing consent is as easy as giving it.",
  "settings.cookieAction": "Cookie & analytics preferences",
  "settings.data": "Data",
  "settings.dataSub": "Export or permanently delete your data stored on RealLearn.",
  "settings.exportBtn": "Export my data",
  "settings.exporting": "Exporting…",
  "settings.downloadJson": "Download JSON",
  "settings.deleteBtn": "Delete my data",
  "settings.deleting": "Deleting…",
  "settings.permanent": "Permanent",
  "settings.legal": "Legal",
  "settings.legalSub": "Review our policies, exercise your privacy rights, or contact our grievance officer.",
  "settings.privacyPolicy": "Privacy Policy",
  "settings.terms": "Terms of Service",
  "settings.parentRequest": "Parent/guardian request",
  "settings.emailGrievance": "Email grievance officer",
  "settings.deleteModalTitle": "Delete everything?",
  "settings.deleteModalMsg": "This will permanently delete your account, erase your stored cookie-consent records, and clear all saved lessons on this device. This cannot be undone.",
  "settings.deleteModalConfirm": "Delete everything",
  "settings.deleteModalCancel": "Keep my data",
  "footer.aiDisclaimer": "AI-generated — verify with pros",
  "footer.privacy": "Privacy",
  "footer.terms": "Terms",
  "footer.legal": "Legal",
  "footer.support": "Support",
  "footer.companionOne": "Day 1 of learning together.",
  "footer.companionDays": "Learning together for {days} days.",
  "footer.companionMilestone": "{days} days of learning together — thank you for staying curious.",
  "common.close": "Close",
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.retry": "Try Again",
  "common.errorTitle": "Something went wrong",
  "loading.generatingAnswer": "Generating your answer",
  "loading.generatingLesson": "Generating your lesson",
  "loading.progressLabel": "Lesson generation progress",
  "loading.stage.understand": "Understanding your question",
  "loading.stage.research": "Researching real-world context",
  "loading.stage.ground": "Grounding it in today's world",
  "loading.stage.writeLesson": "Writing your lesson",
  "loading.stage.writeDirect": "Writing a direct answer",
  "loading.stage.polish": "Polishing the explanation",
  "loading.stage.craftQuizzes": "Crafting your quizzes",
  "loading.stage.craftQuiz": "Crafting your quiz",
  "loading.stage.working": "Working on it",
  "loading.part.foundation": "Foundation",
  "loading.part.mechanism": "Mechanism",
  "loading.part.realWorld": "Real World",
  "loading.part.yourAnswer": "Your Answer",
  "loading.slow.title": "Sorry, it's taking longer than expected.",
  "loading.slow.resilient": "We routed your lesson through our most resilient engine so it still lands — hang tight, it's on the way.",
  "loading.slow.factCheck": "We're taking extra care to fact-check this one instead of rushing it. Hang tight — it's on the way.",
  "error.title": "Let's try that once more",
  "error.retry": "Try Again",
  "error.goHome": "Go Home",
  "audio.generating": "Generating…",
  "audio.listenSection": "Listen to this section",
  "audio.stopReading": "Stop reading aloud",
  "audio.unsupported": "Read-aloud requires a modern browser",
  "mic.askVoice": "Ask with your voice",
  "mic.stopVoice": "Stop voice input",
  "mic.unsupported": "Voice input requires Chrome, Edge, or Safari",
  "share.title": "Share result",
  "share.preparing": "Preparing…",
  "share.copyText": "Copy text",
  "share.downloaded": "Result card downloaded",
  "share.copied": "Copied to clipboard",
  "share.failed": "Could not share right now.",
  "share.copyFailed": "Could not copy.",
  "flashcards.coreInsight": "Core Insight",
  "flashcards.hintGeneral": "Key idea · can you recall it?",
  "flashcards.hintPart": "Part {num} · what's the key idea?",
  "flashcards.shuffle": "Shuffle deck",
  "flashcards.prev": "Previous card",
  "flashcards.next": "Next card",
  "completion.suggestConnect": "What is the next key concept connected to {topic}?",
  "completion.suggestApply": "How does {topic} apply in real life?",
  "completion.suggestMisconception": "What is the most common misconception about this?",
  "feedback.modalTitle": "How was your first lesson?",
  "feedback.modalSub": "A quick, optional review — no account needed and nothing tied to you. Takes under a minute.",
  "feedback.rateLabel": "How would you rate RealLearn? (1–10 stars)",
  "feedback.likeLabel": "What did you like?",
  "feedback.improveLabel": "What should we improve?",
  "feedback.optional": "(optional)",
  "feedback.likePlaceholder": "The explanations, the quizzes, the vibe…",
  "feedback.improvePlaceholder": "Anything that felt slow, confusing, or missing…",
  "feedback.send": "Send feedback",
  "feedback.sending": "Sending…",
  "feedback.askLater": "Ask later",
  "feedback.noThanks": "No thanks",
  "feedback.thankYou": "Thanks for the feedback!",
  "feedback.snoozed": "We'll ask another time.",
  "feedback.pickRating": "Please pick a star rating (1–10), or tap “No thanks”.",
  "cookie.title": "A quick choice about analytics",
  "cookie.body": "We'd like to use Google Analytics to understand what helps people learn. Nothing loads until you say yes, and you can change your mind anytime in Settings.",
  "cookie.policy": "Cookie Policy",
  "cookie.allow": "Allow analytics",
  "cookie.decline": "No thanks",
  "cookie.saving": "Saving...",
  "shortcuts.title": "Keyboard Shortcuts",
  "shortcuts.submit": "Submit question / Start lesson",
  "shortcuts.toggle": "Show keyboard shortcuts",
  "shortcuts.close": "Close modal / quiz / sidebar",
  "shortcuts.selectOption": "Select quiz answer (when quiz is open)",
  "shortcuts.nextQuestion": "Next quiz question (after answering)",
  "shortcuts.hint": "Press ? to toggle this overlay",
  "achievements.title": "Achievements",
  "achievements.unlockedCount": "{unlocked}/{total} unlocked",
  "achievements.earnedDone": "Earned — beautifully done.",
  "achievements.pctThere": "{pct}% there",
  "achievements.tier.bronze": "Bronze",
  "achievements.tier.silver": "Silver",
  "achievements.tier.gold": "Gold",
  "achievements.tier.legendary": "Legendary",
  "learn.quizPassed": "Correct — well done.",
  "learn.partPassed": "Part completed.",
  "settings.analyticsAllowed": "Analytics allowed",
  "settings.analyticsOff": "Analytics off",
  "settings.analyticsNotSet": "Not set",
  "settings.dataDeleted": "Your data and account have been deleted.",
  "settings.exportDownloaded": "Data export downloaded",
  "settings.exportFailed": "Could not export data. Please try again.",
  "progress.levelTitle.finalBoss": "Final Boss",
  "progress.levelTitle.mainCharacter": "Main Character",
  "progress.levelTitle.bigBrain": "Big Brain",
  "progress.levelTitle.lockedIn": "Locked In",
  "progress.levelTitle.onTheGrind": "On the Grind",
  "progress.levelTitle.explorer": "Explorer",
  "progress.levelTitle.freshSpawn": "Fresh Spawn",
  "progress.heatmapLess": "Less",
  "progress.heatmapMore": "More",
  "progress.heatmapAria": "Study activity over the last {weeks} weeks: {activeDays} active days, {totalParts} parts completed.",
  "progress.heatmapCell": "{key}: {count} parts",
  "progress.dailyGoalAria": "{value} of {goal} daily parts completed",
};
