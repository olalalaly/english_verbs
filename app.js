const MASTERED_STREAK = 5;
const MAX_RATING = 7;

const PROGRESS_KEY = "verbs.progress.v2";
const GROUP_KEY = "verbs.active-group.v1";
const QUIZ_TOTAL_KEY = "verbs.quiz.total";
const QUIZ_CORRECT_KEY = "verbs.quiz.correct";

const clean = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ",")
    .trim();

const splitVariants = (value) => {
  const raw = String(value || "");
  const variants = new Set();
  const inParens = [...raw.matchAll(/\(([^)]+)\)/g)].map((match) => match[1]);
  const base = raw.replace(/\([^)]*\)/g, "");

  [base, ...inParens].forEach((part) => {
    part
      .split(/[,/]| or | или /gi)
      .map((item) => clean(item))
      .filter(Boolean)
      .forEach((item) => variants.add(item));
  });

  return variants;
};

const normalizeInputOptions = (input) => {
  const items = String(input || "")
    .split(/[,/]| or | или /gi)
    .map((item) => clean(item))
    .filter(Boolean);

  return items.length ? items : [clean(input)];
};

const isCorrectEnglish = (input, expectedRaw) => {
  const expected = splitVariants(expectedRaw);
  const answers = normalizeInputOptions(input);
  if (!answers.length || !answers[0]) return false;
  return answers.every((answer) => expected.has(answer));
};

const normalizeRu = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/[^а-яёa-z0-9\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const isCorrectRu = (input, expectedRaw) => {
  const answer = normalizeRu(input);
  if (!answer) return false;

  const expectedFull = normalizeRu(expectedRaw);
  if (expectedFull.includes(answer) || answer.includes(expectedFull)) return true;

  const variants = String(expectedRaw || "")
    .split(/[,/;]|\s+-\s+/)
    .map((item) => normalizeRu(item))
    .filter(Boolean);

  return variants.some((variant) => {
    return variant === answer || variant.includes(answer) || answer.includes(variant);
  });
};

const loadJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const defaultProgress = () => ({
  attempts: 0,
  correct: 0,
  wrong: 0,
  streak: 0,
  bestStreak: 0,
  mastered: false,
});

const pickVoice = () => {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  return (
    voices.find((voice) => /^en[-_]/i.test(voice.lang) && /female|samantha|victoria/i.test(voice.name)) ||
    voices.find((voice) => /^en[-_]/i.test(voice.lang)) ||
    null
  );
};

let activeVoice = null;

const initVoice = () => {
  activeVoice = pickVoice();
};

const speak = (text) => {
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(String(text || "").replace(/,/g, ", "));
  utterance.lang = "en-US";
  utterance.rate = 0.92;
  if (activeVoice) utterance.voice = activeVoice;
  window.speechSynthesis.speak(utterance);
};

const sourceVerbs =
  Array.isArray(window.VERBS)
    ? window.VERBS
    : (typeof VERBS !== "undefined" && Array.isArray(VERBS) ? VERBS : []);

const verbs = sourceVerbs.filter((verb) => verb.base);
const verbByBase = Object.fromEntries(verbs.map((verb) => [verb.base, verb]));

const buildGroups = () => {
  const groupSpecs = [
    {
      id: "1",
      title: "Формы не меняются",
      description: "Одинаковые формы или почти одинаковое написание во всех временах.",
      bases: ["broadcast", "cost", "cut", "fit", "hit", "hurt", "let", "put", "read", "set", "shut"],
    },
    {
      id: "2",
      title: "Короткие формы на -t / -d",
      description: "Глаголы с короткой 2-й и 3-й формой, которые удобно заучивать пачкой.",
      bases: ["build", "burn", "deal", "dream", "feed", "feel", "find", "learn", "leave", "lend", "light", "lose", "mean", "meet"],
    },
    {
      id: "3",
      title: "Частые короткие формы",
      description: "Очень частые глаголы с коротким сильным изменением: had, heard, told и похожие.",
      bases: ["have", "hear", "hold", "keep", "lay", "lead", "make", "pay", "say", "sell", "send", "tell", "stand", "understand"],
    },
    {
      id: "4",
      title: "Семья -ought / -aught",
      description: "Рифмующиеся формы типа bought, caught, taught, thought.",
      bases: ["bring", "buy", "catch", "fight", "seek", "teach", "think"],
    },
    {
      id: "5",
      title: "Чередование i-a-u",
      description: "Паттерн begin-began-begun, sing-sang-sung и похожие.",
      bases: ["begin", "drink", "ring", "sing", "swim", "run"],
    },
    {
      id: "6",
      title: "Формы на -ew / -own",
      description: "Похожая цепочка blew-blown, knew-known, grew-grown.",
      bases: ["blow", "draw", "fly", "grow", "know"],
    },
    {
      id: "7",
      title: "Формы на -oke / -oken",
      description: "Похожий рисунок: spoke-spoken, broke-broken, took-taken.",
      bases: ["break", "choose", "freeze", "speak", "steal", "wake", "shake", "take"],
    },
    {
      id: "8",
      title: "Сильные формы на -n",
      description: "Частые сильные глаголы с participle на -n: written, driven, seen.",
      bases: ["be", "do", "drive", "eat", "give", "go", "hide", "prove", "ride", "rise", "see", "show", "wear", "write"],
    },
    {
      id: "9",
      title: "Сильные и особые формы",
      description: "Остальные важные сильные глаголы: became, forgot, got, born и другие.",
      bases: ["bear", "beat", "become", "come", "dig", "fall", "forbid", "forget", "forgive", "get", "lie", "sew"],
    },
    {
      id: "10",
      title: "Бытовые и разговорные",
      description: "Частые слова с вариантами форм: slept, smelt, spoilt, shot, sat.",
      bases: ["shine", "shoot", "sit", "sleep", "smell", "spell", "spend", "spoil"],
    },
  ];

  return groupSpecs.map((group) => ({
    id: group.id,
    label: `Группа ${group.id} · ${group.title}`,
    description: group.description,
    verbs: group.bases.map((base) => verbByBase[base]).filter(Boolean),
  }));
};

const groups = buildGroups();

const els = {
  tabs: document.querySelectorAll(".tab"),
  panels: document.querySelectorAll(".mode"),

  groupSelect: document.getElementById("group-select"),
  groupSummary: document.getElementById("group-summary"),

  cardsDirButtons: document.querySelectorAll(".cards-dir"),
  cardsIndex: document.getElementById("cards-index"),
  cardsStatus: document.getElementById("cards-status"),
  cardsRating: document.getElementById("cards-rating"),
  cardsMain: document.getElementById("cards-main"),
  cardsHint: document.getElementById("cards-hint"),
  cardsModeNote: document.getElementById("cards-mode-note"),
  cardsGuessLabel: document.getElementById("cards-guess-label"),
  cardsBase: document.getElementById("cards-base"),
  cardsPast: document.getElementById("cards-past"),
  cardsParticiple: document.getElementById("cards-participle"),
  cardsRuRow: document.getElementById("cards-ru-row"),
  cardsRuAnswer: document.getElementById("cards-ru-answer"),
  cardsAnswers: document.getElementById("cards-answers"),
  cardsToggle: document.getElementById("cards-toggle"),
  cardsNext: document.getElementById("cards-next"),
  cardsSpeakWord: document.getElementById("cards-speak-word"),
  cardsSpeakForms: document.getElementById("cards-speak-forms"),
  cardsGuessForm: document.getElementById("cards-guess-form"),
  cardsGuessInput: document.getElementById("cards-guess-input"),
  cardsGuessResult: document.getElementById("cards-guess-result"),

  quizDirButtons: document.querySelectorAll(".quiz-dir"),
  quizScore: document.getElementById("quiz-score"),
  quizStatus: document.getElementById("quiz-status"),
  quizRating: document.getElementById("quiz-rating"),
  quizMain: document.getElementById("quiz-main"),
  quizSub: document.getElementById("quiz-sub"),
  quizForm: document.getElementById("quiz-form"),
  quizFieldBase: document.getElementById("quiz-field-base"),
  quizFieldPast: document.getElementById("quiz-field-past"),
  quizFieldParticiple: document.getElementById("quiz-field-participle"),
  quizFieldRu: document.getElementById("quiz-field-ru"),
  quizInputBase: document.getElementById("quiz-input-base"),
  quizInputPast: document.getElementById("quiz-input-past"),
  quizInputParticiple: document.getElementById("quiz-input-participle"),
  quizInputRu: document.getElementById("quiz-input-ru"),
  quizResult: document.getElementById("quiz-result"),
  quizNext: document.getElementById("quiz-next"),
  quizSpeakWord: document.getElementById("quiz-speak-word"),
  quizSpeakForms: document.getElementById("quiz-speak-forms"),

  listFilterButtons: document.querySelectorAll(".list-filter"),
  listSearch: document.getElementById("list-search"),
  listSummary: document.getElementById("list-summary"),
  listBody: document.getElementById("list-body"),
};

let progressStore = loadJson(PROGRESS_KEY, {});
let activeGroupId = localStorage.getItem(GROUP_KEY) || groups[0]?.id || "1";
let cardsPool = [];
let cardsCursor = 0;
let cardsShown = false;
let cardsDirection = "en-ru";
let quizDirection = "ru-all";
let listFilter = "all";
let quizCurrent = null;
let quizTotal = Number(localStorage.getItem(QUIZ_TOTAL_KEY) || 0);
let quizCorrect = Number(localStorage.getItem(QUIZ_CORRECT_KEY) || 0);

const saveScore = () => {
  localStorage.setItem(QUIZ_TOTAL_KEY, String(quizTotal));
  localStorage.setItem(QUIZ_CORRECT_KEY, String(quizCorrect));
};

const saveProgress = () => {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progressStore));
};

const saveActiveGroup = () => {
  localStorage.setItem(GROUP_KEY, activeGroupId);
};

const getProgress = (id) => {
  if (!progressStore[id]) {
    progressStore[id] = defaultProgress();
  }
  return progressStore[id];
};

const getProgressMeta = (id) => {
  const progress = getProgress(id);
  const ratingValue = Math.min(progress.bestStreak, MAX_RATING);
  const statusText = progress.mastered ? "Выучено" : "Не выучено";
  const statusClass = progress.mastered ? "mastered" : "learning";
  const hintText = progress.mastered
    ? `макс. серия ${progress.bestStreak}`
    : `до выучено еще ${Math.max(MASTERED_STREAK - progress.streak, 0)}`;

  return {
    statusText,
    statusClass,
    ratingText: `${ratingValue}/${MAX_RATING}`,
    hintText,
    mastered: progress.mastered,
  };
};

const recordAttempt = (id, success) => {
  const progress = getProgress(id);
  progress.attempts += 1;

  if (success) {
    progress.correct += 1;
    progress.streak += 1;
    progress.bestStreak = Math.max(progress.bestStreak, progress.streak);
    if (progress.streak >= MASTERED_STREAK) progress.mastered = true;
  } else {
    progress.wrong += 1;
    progress.streak = 0;
  }

  saveProgress();
};

const compareVerbsByProgress = (left, right) => {
  const leftProgress = getProgress(left.id);
  const rightProgress = getProgress(right.id);

  if (leftProgress.mastered !== rightProgress.mastered) {
    return Number(leftProgress.mastered) - Number(rightProgress.mastered);
  }

  if (!leftProgress.mastered && leftProgress.bestStreak !== rightProgress.bestStreak) {
    return leftProgress.bestStreak - rightProgress.bestStreak;
  }

  if (!leftProgress.mastered && leftProgress.wrong !== rightProgress.wrong) {
    return rightProgress.wrong - leftProgress.wrong;
  }

  return left.id - right.id;
};

const getActiveGroup = () => groups.find((group) => group.id === activeGroupId) || groups[0];

const getActiveGroupVerbs = () => getActiveGroup()?.verbs || [];

const getOrderedActiveVerbs = () => [...getActiveGroupVerbs()].sort(compareVerbsByProgress);

const randomItem = (items) => items[Math.floor(Math.random() * items.length)];

const randomVerb = () => {
  const ordered = getOrderedActiveVerbs();
  const learning = ordered.filter((verb) => !getProgress(verb.id).mastered);

  if (!ordered.length) return null;
  if (learning.length && Math.random() < 0.8) return randomItem(learning);
  return randomItem(ordered);
};

const syncCardsPool = () => {
  const currentId = cardsPool[cardsCursor]?.id;
  cardsPool = getOrderedActiveVerbs();

  if (!cardsPool.length) {
    cardsCursor = 0;
    return;
  }

  if (currentId == null) {
    if (cardsCursor >= cardsPool.length) cardsCursor = 0;
    return;
  }

  const nextIndex = cardsPool.findIndex((verb) => verb.id === currentId);
  cardsCursor = nextIndex >= 0 ? nextIndex : 0;
};

const currentCardVerb = () => {
  if (!cardsPool.length) syncCardsPool();
  return cardsPool[cardsCursor];
};

const setProgressPills = (statusEl, ratingEl, verb) => {
  if (!verb) return;

  const meta = getProgressMeta(verb.id);
  statusEl.textContent = meta.statusText;
  statusEl.className = `progress-pill ${meta.statusClass}`;
  ratingEl.textContent = `Рейтинг ${meta.ratingText}`;
  ratingEl.className = `progress-pill ${meta.statusClass}`;
};

const renderScore = () => {
  els.quizScore.textContent = `${quizCorrect} / ${quizTotal}`;
};

const renderGroupOptions = () => {
  els.groupSelect.innerHTML = groups
    .map((group) => `<option value="${group.id}">${group.label}</option>`)
    .join("");
  els.groupSelect.value = getActiveGroup().id;
};

const renderGroupSummary = () => {
  const group = getActiveGroup();
  const learned = group.verbs.filter((verb) => getProgress(verb.id).mastered).length;
  els.groupSummary.textContent =
    `${group.label}. ${group.description} В группе ${group.verbs.length} слов, выучено ${learned} из ${group.verbs.length}.`;
  els.groupSummary.className = "result";
};

const setNoData = () => {
  els.cardsIndex.textContent = "0 / 0";
  els.cardsMain.textContent = "Данные не загружены";
  els.cardsHint.textContent = "Проверьте файл verbs-data.js";
  els.quizMain.textContent = "Данные не загружены";
  els.quizSub.textContent = "Проверьте файл verbs-data.js";
  els.groupSummary.textContent = "";
  els.listSummary.textContent = "";
  els.listBody.innerHTML = "";
};

const renderCards = () => {
  syncCardsPool();
  const verb = currentCardVerb();
  if (!verb) return;

  setProgressPills(els.cardsStatus, els.cardsRating, verb);
  els.cardsIndex.textContent = `${cardsCursor + 1} / ${cardsPool.length}`;

  if (cardsDirection === "en-ru") {
    els.cardsMain.textContent = verb.base;
    els.cardsHint.textContent = "Напишите перевод на русский письменно.";
    els.cardsModeNote.textContent = `${getProgressMeta(verb.id).hintText}. Можно писать одно подходящее значение.`;
    els.cardsGuessLabel.textContent = "Введите перевод на русский";
    els.cardsGuessInput.placeholder = "Например: быть";
  } else {
    els.cardsMain.textContent = verb.ru;
    els.cardsHint.textContent = "Напишите 1-ю форму (base) на английском.";
    els.cardsModeNote.textContent = `${getProgressMeta(verb.id).hintText}.`;
    els.cardsGuessLabel.textContent = "Введите 1-ю форму (base) на английском";
    els.cardsGuessInput.placeholder = "Например: be";
  }

  els.cardsBase.textContent = verb.base;
  els.cardsPast.textContent = verb.past;
  els.cardsParticiple.textContent = verb.participle;
  els.cardsRuAnswer.textContent = verb.ru;
  els.cardsRuRow.hidden = false;
  els.cardsAnswers.hidden = !cardsShown;
  els.cardsToggle.textContent = cardsShown ? "Скрыть ответ" : "Показать ответ";
};

const nextCard = () => {
  syncCardsPool();
  if (!cardsPool.length) return;

  cardsCursor = (cardsCursor + 1) % cardsPool.length;
  cardsShown = false;
  els.cardsGuessInput.value = "";
  els.cardsGuessResult.textContent = " ";
  els.cardsGuessResult.className = "result";
  renderCards();
};

const renderQuizProgress = (verb) => {
  setProgressPills(els.quizStatus, els.quizRating, verb);
};

const applyQuizDirection = () => {
  const ruAll = quizDirection === "ru-all";
  els.quizFieldBase.hidden = !ruAll;
  els.quizFieldPast.hidden = !ruAll;
  els.quizFieldParticiple.hidden = !ruAll;
  els.quizFieldRu.hidden = ruAll;
};

const setQuizVerb = (verb) => {
  quizCurrent = verb;
  if (!verb) return;

  renderQuizProgress(verb);

  if (quizDirection === "ru-all") {
    els.quizMain.textContent = verb.ru;
    els.quizSub.textContent =
      "Заполните все 3 поля отдельно: 1-я форма в первое, 2-я во второе, 3-я в третье.";
  } else {
    els.quizMain.textContent = `${verb.base} — ${verb.past} — ${verb.participle}`;
    els.quizSub.textContent = "Напишите перевод на русский письменно.";
  }

  els.quizInputBase.value = "";
  els.quizInputPast.value = "";
  els.quizInputParticiple.value = "";
  els.quizInputRu.value = "";
  els.quizResult.textContent = " ";
  els.quizResult.className = "result";

  const focusTarget = quizDirection === "ru-all" ? els.quizInputBase : els.quizInputRu;
  focusTarget.focus();
};

const nextQuiz = () => {
  const verb = randomVerb();
  if (!verb) return;
  setQuizVerb(verb);
};

const renderList = (query = "") => {
  const group = getActiveGroup();
  const verbsInGroup = group.verbs;
  const learnedCount = verbsInGroup.filter((verb) => getProgress(verb.id).mastered).length;

  els.listSummary.textContent =
    `${group.label}: выучено ${learnedCount} из ${verbsInGroup.length}. Сначала показаны невыученные слова.`;
  els.listSummary.className = "result";

  const q = clean(query);
  const rows = getOrderedActiveVerbs().filter((verb) => {
    const progress = getProgress(verb.id);
    const matchesFilter =
      listFilter === "all" ||
      (listFilter === "learning" && !progress.mastered) ||
      (listFilter === "mastered" && progress.mastered);

    if (!matchesFilter) return false;
    if (!q) return true;

    return [verb.base, verb.past, verb.participle, verb.ru].some((item) => clean(item).includes(q));
  });

  if (!rows.length) {
    els.listBody.innerHTML = `
      <tr>
        <td colspan="7">Ничего не найдено.</td>
      </tr>
    `;
    return;
  }

  els.listBody.innerHTML = rows
    .map((verb) => {
      const meta = getProgressMeta(verb.id);
      return `
      <tr>
        <td>${verb.base}</td>
        <td>${verb.past}</td>
        <td>${verb.participle}</td>
        <td>${verb.ru}</td>
        <td><span class="progress-pill ${meta.statusClass}">${meta.statusText}</span></td>
        <td>${meta.ratingText}</td>
        <td><button class="mini list-speak" data-id="${verb.id}" type="button">Voice</button></td>
      </tr>`;
    })
    .join("");
};

const refreshViews = () => {
  renderGroupSummary();
  renderCards();
  if (quizCurrent) renderQuizProgress(quizCurrent);
  renderList(els.listSearch.value);
};

const setActiveGroup = (groupId) => {
  activeGroupId = groupId;
  saveActiveGroup();
  cardsPool = [];
  cardsCursor = 0;
  cardsShown = false;
  renderGroupSummary();
  renderCards();
  nextQuiz();
  renderList(els.listSearch.value);
};

const checkCardsGuess = (event) => {
  event.preventDefault();
  const verb = currentCardVerb();
  if (!verb) return;

  const value = els.cardsGuessInput.value;
  if (!clean(value)) {
    els.cardsGuessResult.textContent =
      cardsDirection === "en-ru" ? "Введите перевод на русский." : "Введите английский ответ.";
    els.cardsGuessResult.className = "result bad";
    return;
  }

  const ok =
    cardsDirection === "en-ru"
      ? isCorrectRu(value, verb.ru)
      : isCorrectEnglish(value, verb.base);

  recordAttempt(verb.id, ok);
  refreshViews();

  if (ok) {
    els.cardsGuessResult.textContent = "Верно";
    els.cardsGuessResult.className = "result ok";
  } else {
    els.cardsGuessResult.textContent =
      cardsDirection === "en-ru"
        ? `Неверно. Правильно: ${verb.ru}`
        : `Неверно. Правильно: ${verb.base}`;
    els.cardsGuessResult.className = "result bad";
  }
};

const checkQuiz = (event) => {
  event.preventDefault();
  if (!quizCurrent) return;

  let ok = false;
  let wrongText = "";

  if (quizDirection === "ru-all") {
    if (
      !clean(els.quizInputBase.value) ||
      !clean(els.quizInputPast.value) ||
      !clean(els.quizInputParticiple.value)
    ) {
      els.quizResult.textContent = "Заполните все 3 поля отдельно: Base, Past, Participle.";
      els.quizResult.className = "result bad";
      return;
    }

    const okBase = isCorrectEnglish(els.quizInputBase.value, quizCurrent.base);
    const okPast = isCorrectEnglish(els.quizInputPast.value, quizCurrent.past);
    const okParticiple = isCorrectEnglish(els.quizInputParticiple.value, quizCurrent.participle);
    ok = okBase && okPast && okParticiple;

    if (!ok) {
      wrongText = `Правильно: ${quizCurrent.base} / ${quizCurrent.past} / ${quizCurrent.participle}`;
    }
  } else {
    if (!clean(els.quizInputRu.value)) {
      els.quizResult.textContent = "Введите перевод на русский.";
      els.quizResult.className = "result bad";
      return;
    }

    ok = isCorrectRu(els.quizInputRu.value, quizCurrent.ru);
    if (!ok) wrongText = `Правильно: ${quizCurrent.ru}`;
  }

  recordAttempt(quizCurrent.id, ok);
  quizTotal += 1;
  if (ok) quizCorrect += 1;
  saveScore();
  renderScore();
  refreshViews();

  if (ok) {
    els.quizResult.textContent = "Верно";
    els.quizResult.className = "result ok";
  } else {
    els.quizResult.textContent = `Неверно. ${wrongText}`;
    els.quizResult.className = "result bad";
  }
};

const switchMode = (mode) => {
  els.tabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.mode === mode));
  els.panels.forEach((panel) => panel.classList.toggle("is-active", panel.dataset.panel === mode));
};

const bind = () => {
  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => switchMode(tab.dataset.mode));
  });

  els.groupSelect.addEventListener("change", (event) => {
    setActiveGroup(event.target.value);
  });

  els.cardsDirButtons.forEach((button) => {
    button.addEventListener("click", () => {
      cardsDirection = button.dataset.cardsDir;
      els.cardsDirButtons.forEach((item) => item.classList.toggle("is-active", item === button));
      cardsShown = false;
      els.cardsGuessInput.value = "";
      els.cardsGuessResult.textContent = " ";
      els.cardsGuessResult.className = "result";
      renderCards();
      els.cardsGuessInput.focus();
    });
  });

  els.cardsToggle.addEventListener("click", () => {
    cardsShown = !cardsShown;
    renderCards();
  });

  els.cardsNext.addEventListener("click", nextCard);
  els.cardsSpeakWord.addEventListener("click", () => speak(currentCardVerb()?.base));
  els.cardsSpeakForms.addEventListener("click", () => {
    const verb = currentCardVerb();
    if (!verb) return;
    speak(`${verb.base}, ${verb.past}, ${verb.participle}`);
  });
  els.cardsGuessForm.addEventListener("submit", checkCardsGuess);

  els.quizDirButtons.forEach((button) => {
    button.addEventListener("click", () => {
      quizDirection = button.dataset.quizDir;
      els.quizDirButtons.forEach((item) => item.classList.toggle("is-active", item === button));
      applyQuizDirection();
      nextQuiz();
    });
  });

  els.quizForm.addEventListener("submit", checkQuiz);
  els.quizNext.addEventListener("click", nextQuiz);
  els.quizSpeakWord.addEventListener("click", () => speak(quizCurrent?.base));
  els.quizSpeakForms.addEventListener("click", () => {
    if (!quizCurrent) return;
    speak(`${quizCurrent.base}, ${quizCurrent.past}, ${quizCurrent.participle}`);
  });

  els.listFilterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      listFilter = button.dataset.listFilter;
      els.listFilterButtons.forEach((item) => item.classList.toggle("is-active", item === button));
      renderList(els.listSearch.value);
    });
  });

  els.listSearch.addEventListener("input", (event) => renderList(event.target.value));
  els.listBody.addEventListener("click", (event) => {
    const button = event.target.closest(".list-speak");
    if (!button) return;

    const id = Number(button.dataset.id);
    const item = verbs.find((verb) => verb.id === id);
    if (item) speak(`${item.base}, ${item.past}, ${item.participle}`);
  });

  window.speechSynthesis?.addEventListener?.("voiceschanged", initVoice);
};

const start = () => {
  initVoice();
  bind();

  if (!verbs.length || !groups.length) {
    setNoData();
    return;
  }

  renderGroupOptions();
  renderGroupSummary();
  syncCardsPool();
  applyQuizDirection();
  renderCards();
  renderScore();
  nextQuiz();
  renderList("");
};

start();
