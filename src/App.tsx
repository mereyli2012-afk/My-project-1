import { useEffect, useMemo, useState } from 'react';

type MainPanel = 'library' | 'forge' | 'settings';
type LibraryTab = 'world' | 'characters' | 'plot';
type SettingsTab = 'profile' | 'forge' | 'palette';
type Palette = 'green' | 'sky' | 'sun' | 'ocean' | 'wine' | 'rose' | 'lilac' | 'violet';
type ForgeTone = 'soft' | 'balanced' | 'strict';
type Language = 'ru' | 'en' | 'kk';

type Draft = {
  id: number;
  title: string;
};

type Character = {
  id: number;
  name: string;
  age: string;
  appearance: string;
  personality: string;
  family: string;
  romance: string;
  relationships: string;
  childhood: string;
};

type PlotLine = {
  id: number;
  character: string;
  story: string;
};

type ChatMessage = {
  id: number;
  role: 'assistant' | 'author';
  text: string;
};

type ChatSession = {
  id: number;
  title: string;
  updatedAt: string;
};

type AuthorProfile = {
  penName: string;
  language: Language;
  favoriteGenres: string;
};

type ForgeBehavior = {
  tone: ForgeTone;
  wantsQuestions: boolean;
  wantsVariants: boolean;
  allowDirectCritique: boolean;
};

type SavedState = {
  mainPanel: MainPanel;
  libraryTab: LibraryTab;
  settingsTab: SettingsTab;
  palette: Palette;
  authorProfile: AuthorProfile;
  forgeBehavior: ForgeBehavior;
  drafts: Draft[];
  characters: Character[];
  plotLines: PlotLine[];
  worldText: string;
  messages: ChatMessage[];
  chatHistory: ChatSession[];
};

const storageKey = 'storyforge-state-v2';

const languageOptions: Array<{ id: Language; label: string }> = [
  { id: 'ru', label: 'Русский' },
  { id: 'en', label: 'English' },
  { id: 'kk', label: 'Қазақша' },
];

const translations = {
  ru: {
    appTitle: 'Мастерская для автора',
    drafts: 'Черновики',
    draftTitle: 'Название черновика',
    addDraft: '+ Добавить черновик',
    emptyTitle: 'Пока пусто',
    emptyDrafts: 'Черновик - это рабочая идея книги, серии или отдельного мира.',
    draftSubtitle: 'Рабочий черновик',
    draftHint: 'Заполни мир, персонажей и сюжет',
    libraryTabs: { world: 'Мир', characters: 'Персонажи', plot: 'Сюжет' },
    settingsTabs: { profile: 'Профиль автора', forge: 'Поведение AI Forge', palette: 'Палитра интерфейса' },
    worldEyebrow: 'Канон мира',
    worldTitle: 'Опиши правила, атмосферу и границы мира',
    worldPlaceholder: 'Например: в этом мире магия существует, но каждый заклинатель теряет воспоминание за сильное заклинание...',
    charactersEyebrow: 'Анкеты персонажей',
    charactersTitle: 'Добавляй столько персонажей, сколько нужно черновику',
    name: 'Имя',
    age: 'Возраст',
    appearance: 'Внешнее описание',
    personality: 'Характер',
    family: 'Семья',
    romance: 'Любовная линия',
    relationships: 'Отношения с другими персонажами: друзья, враги, союзники',
    childhood: 'Детство',
    addCharacter: '+ Добавить персонажа',
    noCharacters: 'Персонажей пока нет. Начни с главного героя.',
    years: 'лет',
    ageMissing: 'Возраст не указан',
    stillEmpty: 'Пока пусто',
    plotEyebrow: 'Сюжетные линии',
    character: 'Персонаж',
    plotStory: 'История / сюжет персонажа',
    add: '+ Добавить',
    history: 'История',
    noHistory: 'Здесь появятся прошлые разговоры с AI Forge.',
    greeting: 'Привет',
    todayQuestion: 'Чем займемся сегодня?',
    addContext: 'Добавить контекст',
    askPlaceholder: 'Спроси про персонажа, конфликт, мир или сюжетную линию...',
    send: 'Отправить',
    chatTitle: 'Советник по идеям',
    contextOn: 'Контекст подключён',
    contextNeeded: 'Нужен контекст',
    continueChat: 'Продолжи разговор...',
    settings: 'Настройки',
    settingsTitle: 'Авторская мастерская',
    penName: 'Имя или псевдоним',
    penNamePlaceholder: 'Например: Mereyli',
    language: 'Язык интерфейса / историй',
    favoriteGenres: 'Любимые жанры',
    genresPlaceholder: 'Фэнтези, романтика, детектив, хоррор...',
    adviceTone: 'Тон советов',
    softTone: 'Мягкий наставник',
    balancedTone: 'Баланс поддержки и критики',
    strictTone: 'Строгий редактор',
    moreQuestions: 'Задавать больше вопросов',
    severalVariants: 'Давать несколько вариантов',
    directCritique: 'Можно прямо указывать слабые места',
    palettes: {
      green: 'Зелёная',
      sky: 'Небесная',
      sun: 'Солнечная',
      ocean: 'Глубокая синяя',
      wine: 'Бордовая',
      rose: 'Розовая',
      lilac: 'Сиреневая',
      violet: 'Фиолетовая',
    },
    navLibrary: 'Моя библиотека',
    navForge: 'AI Forge',
    navSettings: 'Настройки',
    suggestions: [
      'Разобрать персонажа',
      'Проверить канон',
      'Связать сюжетные линии',
      'Усилить конфликт',
      'Найти слабое место',
      'Задать вопросы по миру',
    ],
    justNow: 'только что',
  },
  en: {
    appTitle: 'Author Workspace',
    drafts: 'Drafts',
    draftTitle: 'Draft title',
    addDraft: '+ Add draft',
    emptyTitle: 'Nothing here yet',
    emptyDrafts: 'A draft is a working idea for a book, series, or standalone world.',
    draftSubtitle: 'Working draft',
    draftHint: 'Add the world, characters, and plot',
    libraryTabs: { world: 'World', characters: 'Characters', plot: 'Plot' },
    settingsTabs: { profile: 'Author profile', forge: 'AI Forge behavior', palette: 'Interface palette' },
    worldEyebrow: 'World canon',
    worldTitle: 'Describe the rules, atmosphere, and limits of your world',
    worldPlaceholder: 'Example: magic exists in this world, but every spellcaster loses one memory after casting a powerful spell...',
    charactersEyebrow: 'Character sheets',
    charactersTitle: 'Add as many characters as your draft needs',
    name: 'Name',
    age: 'Age',
    appearance: 'Appearance',
    personality: 'Personality',
    family: 'Family',
    romance: 'Romance arc',
    relationships: 'Relationships with other characters: friends, enemies, allies',
    childhood: 'Childhood',
    addCharacter: '+ Add character',
    noCharacters: 'No characters yet. Start with your main character.',
    years: 'years old',
    ageMissing: 'Age not set',
    stillEmpty: 'Empty for now',
    plotEyebrow: 'Plot lines',
    character: 'Character',
    plotStory: 'Story / character plot',
    add: '+ Add',
    history: 'History',
    noHistory: 'Your previous AI Forge conversations will appear here.',
    greeting: 'Hello',
    todayQuestion: 'What shall we work on today?',
    addContext: 'Add context',
    askPlaceholder: 'Ask about a character, conflict, world, or plot line...',
    send: 'Send',
    chatTitle: 'Idea advisor',
    contextOn: 'Context connected',
    contextNeeded: 'Context needed',
    continueChat: 'Continue the conversation...',
    settings: 'Settings',
    settingsTitle: 'Author workspace',
    penName: 'Name or pen name',
    penNamePlaceholder: 'Example: Mereyli',
    language: 'Interface / story language',
    favoriteGenres: 'Favorite genres',
    genresPlaceholder: 'Fantasy, romance, mystery, horror...',
    adviceTone: 'Advice tone',
    softTone: 'Gentle mentor',
    balancedTone: 'Balanced support and critique',
    strictTone: 'Strict editor',
    moreQuestions: 'Ask more questions',
    severalVariants: 'Offer several options',
    directCritique: 'Directly point out weak spots',
    palettes: {
      green: 'Green',
      sky: 'Sky',
      sun: 'Sun',
      ocean: 'Deep blue',
      wine: 'Wine',
      rose: 'Rose',
      lilac: 'Lilac',
      violet: 'Violet',
    },
    navLibrary: 'My library',
    navForge: 'AI Forge',
    navSettings: 'Settings',
    suggestions: [
      'Analyze a character',
      'Check canon',
      'Connect plot lines',
      'Strengthen conflict',
      'Find a weak spot',
      'Ask worldbuilding questions',
    ],
    justNow: 'just now',
  },
  kk: {
    appTitle: 'Автор шеберханасы',
    drafts: 'Нобайлар',
    draftTitle: 'Нобай атауы',
    addDraft: '+ Нобай қосу',
    emptyTitle: 'Әзірге бос',
    emptyDrafts: 'Нобай - кітаптың, серияның немесе жеке әлемнің жұмыс идеясы.',
    draftSubtitle: 'Жұмыс нобайы',
    draftHint: 'Әлемді, кейіпкерлерді және сюжетті толтыр',
    libraryTabs: { world: 'Әлем', characters: 'Кейіпкерлер', plot: 'Сюжет' },
    settingsTabs: { profile: 'Автор профилі', forge: 'AI Forge мінезі', palette: 'Интерфейс палитрасы' },
    worldEyebrow: 'Әлем каноны',
    worldTitle: 'Әлемнің ережесін, атмосферасын және шекарасын сипатта',
    worldPlaceholder: 'Мысалы: бұл әлемде сиқыр бар, бірақ күшті сиқырдан кейін әр сиқыршы бір естелігін жоғалтады...',
    charactersEyebrow: 'Кейіпкер анкеталары',
    charactersTitle: 'Нобайға қанша кейіпкер керек болса, сонша қос',
    name: 'Аты',
    age: 'Жасы',
    appearance: 'Сыртқы сипаттама',
    personality: 'Мінезі',
    family: 'Отбасы',
    romance: 'Махаббат желісі',
    relationships: 'Басқа кейіпкерлермен қарым-қатынасы: достар, жаулар, одақтастар',
    childhood: 'Балалық шағы',
    addCharacter: '+ Кейіпкер қосу',
    noCharacters: 'Кейіпкерлер әлі жоқ. Басты кейіпкерден баста.',
    years: 'жаста',
    ageMissing: 'Жасы көрсетілмеген',
    stillEmpty: 'Әзірге бос',
    plotEyebrow: 'Сюжет желілері',
    character: 'Кейіпкер',
    plotStory: 'Кейіпкер тарихы / сюжеті',
    add: '+ Қосу',
    history: 'Тарих',
    noHistory: 'AI Forge-пен өткен әңгімелер осы жерде пайда болады.',
    greeting: 'Сәлем',
    todayQuestion: 'Бүгін немен айналысамыз?',
    addContext: 'Контекст қосу',
    askPlaceholder: 'Кейіпкер, конфликт, әлем немесе сюжет желісі туралы сұра...',
    send: 'Жіберу',
    chatTitle: 'Идея кеңесшісі',
    contextOn: 'Контекст қосылды',
    contextNeeded: 'Контекст керек',
    continueChat: 'Әңгімені жалғастыр...',
    settings: 'Баптаулар',
    settingsTitle: 'Автор шеберханасы',
    penName: 'Аты немесе лақап аты',
    penNamePlaceholder: 'Мысалы: Mereyli',
    language: 'Интерфейс / оқиға тілі',
    favoriteGenres: 'Ұнататын жанрлар',
    genresPlaceholder: 'Фэнтези, романтика, детектив, хоррор...',
    adviceTone: 'Кеңес тоны',
    softTone: 'Жұмсақ тәлімгер',
    balancedTone: 'Қолдау мен сынның балансы',
    strictTone: 'Қатаң редактор',
    moreQuestions: 'Көбірек сұрақ қою',
    severalVariants: 'Бірнеше нұсқа ұсыну',
    directCritique: 'Әлсіз жерлерді тура айтуға болады',
    palettes: {
      green: 'Жасыл',
      sky: 'Аспан',
      sun: 'Күн',
      ocean: 'Қою көк',
      wine: 'Бордо',
      rose: 'Қызғылт',
      lilac: 'Сирень',
      violet: 'Күлгін',
    },
    navLibrary: 'Менің кітапханам',
    navForge: 'AI Forge',
    navSettings: 'Баптаулар',
    suggestions: [
      'Кейіпкерді талдау',
      'Канонды тексеру',
      'Сюжет желілерін байланыстыру',
      'Конфликтті күшейту',
      'Әлсіз жерді табу',
      'Әлем туралы сұрақтар қою',
    ],
    justNow: 'жаңа ғана',
  },
};

const defaultProfile: AuthorProfile = {
  penName: '',
  language: 'ru',
  favoriteGenres: '',
};

const defaultForgeBehavior: ForgeBehavior = {
  tone: 'balanced',
  wantsQuestions: true,
  wantsVariants: true,
  allowDirectCritique: false,
};

const palettes: Palette[] = ['green', 'sky', 'sun', 'ocean', 'wine', 'rose', 'lilac', 'violet'];

function normalizeLanguage(value: unknown): Language {
  if (value === 'en' || value === 'English') return 'en';
  if (value === 'kk' || value === 'Қазақша') return 'kk';
  return 'ru';
}

function loadSavedState(): Partial<SavedState> {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return {};
    const saved = JSON.parse(raw) as Partial<SavedState>;
    return {
      ...saved,
      authorProfile: {
        ...defaultProfile,
        ...saved.authorProfile,
        language: normalizeLanguage(saved.authorProfile?.language),
      },
      forgeBehavior: {
        ...defaultForgeBehavior,
        ...saved.forgeBehavior,
      },
    };
  } catch {
    return {};
  }
}

export default function App() {
  const saved = useMemo(loadSavedState, []);
  const [mainPanel, setMainPanel] = useState<MainPanel>(saved.mainPanel ?? 'library');
  const [libraryTab, setLibraryTab] = useState<LibraryTab>(saved.libraryTab ?? 'world');
  const [settingsTab, setSettingsTab] = useState<SettingsTab>(saved.settingsTab ?? 'profile');
  const [palette, setPalette] = useState<Palette>(saved.palette ?? 'green');
  const [authorProfile, setAuthorProfile] = useState<AuthorProfile>(saved.authorProfile ?? defaultProfile);
  const [forgeBehavior, setForgeBehavior] = useState<ForgeBehavior>(saved.forgeBehavior ?? defaultForgeBehavior);
  const [drafts, setDrafts] = useState<Draft[]>(saved.drafts ?? []);
  const [characters, setCharacters] = useState<Character[]>(saved.characters ?? []);
  const [plotLines, setPlotLines] = useState<PlotLine[]>(saved.plotLines ?? []);
  const [worldText, setWorldText] = useState(saved.worldText ?? '');
  const [messages, setMessages] = useState<ChatMessage[]>(saved.messages ?? []);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>(saved.chatHistory ?? []);
  const [draftTitle, setDraftTitle] = useState('');
  const [characterName, setCharacterName] = useState('');
  const [characterAge, setCharacterAge] = useState('');
  const [characterAppearance, setCharacterAppearance] = useState('');
  const [characterPersonality, setCharacterPersonality] = useState('');
  const [characterFamily, setCharacterFamily] = useState('');
  const [characterRomance, setCharacterRomance] = useState('');
  const [characterRelationships, setCharacterRelationships] = useState('');
  const [characterChildhood, setCharacterChildhood] = useState('');
  const [plotCharacter, setPlotCharacter] = useState('');
  const [plotStory, setPlotStory] = useState('');
  const [prompt, setPrompt] = useState('');

  const t = translations[authorProfile.language];
  const libraryTabs: Array<{ id: LibraryTab; label: string }> = [
    { id: 'world', label: t.libraryTabs.world },
    { id: 'characters', label: t.libraryTabs.characters },
    { id: 'plot', label: t.libraryTabs.plot },
  ];
  const settingsTabs: Array<{ id: SettingsTab; label: string }> = [
    { id: 'profile', label: t.settingsTabs.profile },
    { id: 'forge', label: t.settingsTabs.forge },
    { id: 'palette', label: t.settingsTabs.palette },
  ];

  useEffect(() => {
    const state: SavedState = {
      mainPanel,
      libraryTab,
      settingsTab,
      palette,
      authorProfile,
      forgeBehavior,
      drafts,
      characters,
      plotLines,
      worldText,
      messages,
      chatHistory,
    };
    localStorage.setItem(storageKey, JSON.stringify(state));
  }, [mainPanel, libraryTab, settingsTab, palette, authorProfile, forgeBehavior, drafts, characters, plotLines, worldText, messages, chatHistory]);

  function addDraft() {
    const title = draftTitle.trim();
    if (!title) return;
    setDrafts((current) => [...current, { id: Date.now(), title }]);
    setDraftTitle('');
  }

  function addCharacter() {
    const name = characterName.trim();
    if (!name) return;
    setCharacters((current) => [
      ...current,
      {
        id: Date.now(),
        name,
        age: characterAge.trim(),
        appearance: characterAppearance.trim(),
        personality: characterPersonality.trim(),
        family: characterFamily.trim(),
        romance: characterRomance.trim(),
        relationships: characterRelationships.trim(),
        childhood: characterChildhood.trim(),
      },
    ]);
    setCharacterName('');
    setCharacterAge('');
    setCharacterAppearance('');
    setCharacterPersonality('');
    setCharacterFamily('');
    setCharacterRomance('');
    setCharacterRelationships('');
    setCharacterChildhood('');
  }

  function addPlotLine() {
    const character = plotCharacter.trim();
    const story = plotStory.trim();
    if (!character || !story) return;
    setPlotLines((current) => [...current, { id: Date.now(), character, story }]);
    setPlotCharacter('');
    setPlotStory('');
  }

  function makeAssistantReply() {
    const hasContext = drafts.length > 0 || worldText.trim() || characters.length > 0 || plotLines.length > 0;
    const authorName = authorProfile.penName.trim() || (authorProfile.language === 'en' ? 'author' : authorProfile.language === 'kk' ? 'автор' : 'автор');
    const genres = authorProfile.favoriteGenres.trim() || (authorProfile.language === 'en' ? 'genres are not set yet' : authorProfile.language === 'kk' ? 'жанрлар әлі көрсетілмеген' : 'жанры пока не указаны');

    if (authorProfile.language === 'en') {
      if (!hasContext) {
        return [
          "I do not have enough library memory yet, so I will not pretend that I know your world.",
          "Add a draft, character, or world rule, and I will answer as StoryForge, not as a generic chat.",
          `I am already using your profile: ${authorName}. Interface and story language: English.`,
          "First question: what emotion should the reader feel from this story?",
        ].join('\n');
      }
      return [
        `Author profile: ${authorName}. Genres: ${genres}.`,
        `Library context: ${drafts.map((draft) => draft.title).join(', ') || 'no draft selected yet'}.`,
        `Characters in memory: ${characters.map((character) => character.name).join(', ') || 'none yet'}.`,
        worldText.trim() ? `World canon: ${worldText.trim().slice(0, 180)}${worldText.trim().length > 180 ? '...' : ''}` : 'World canon is still almost empty.',
        `Plot lines:\n${plotLines.map((line) => `${line.character}: ${line.story}`).join('\n') || 'no plot lines yet'}`,
        '',
        "I will not write the book instead of you. I can help as an idea editor.",
        "A useful next step: choose whether we should work on character motivation, plot logic, relationships, or a weak spot in the worldbuilding.",
      ].join('\n');
    }

    if (authorProfile.language === 'kk') {
      if (!hasContext) {
        return [
          'Кітапханадағы дерек әлі аз, сондықтан мен сенің әлеміңді білемін деп көрсетпеймін.',
          'Нобай, кейіпкер немесе әлем ережесін қоссаң, StoryForge ретінде нақтырақ жауап беремін.',
          `Профильді ескеріп тұрмын: ${authorName}. Тіл: Қазақша.`,
          'Алғашқы сұрақ: оқырман бұл оқиғадан қандай эмоция сезінуі керек?',
        ].join('\n');
      }
      return [
        `Автор профилі: ${authorName}. Жанрлар: ${genres}.`,
        `Кітапхана контексті: ${drafts.map((draft) => draft.title).join(', ') || 'нобай әлі таңдалмаған'}.`,
        `Есте тұрған кейіпкерлер: ${characters.map((character) => character.name).join(', ') || 'әлі жоқ'}.`,
        worldText.trim() ? `Әлем каноны: ${worldText.trim().slice(0, 180)}${worldText.trim().length > 180 ? '...' : ''}` : 'Әлем каноны әзірге бос.',
        `Сюжет желілері:\n${plotLines.map((line) => `${line.character}: ${line.story}`).join('\n') || 'сюжет желілері әлі жоқ'}`,
        '',
        'Мен кітапты сенің орнына жазбаймын. Бірақ идея редакторы ретінде көмектесемін.',
        'Келесі қадам: кейіпкер мотивациясын, сюжет логикасын, қарым-қатынасты немесе әлемдегі әлсіз жерді таңдайық.',
      ].join('\n');
    }

    if (!hasContext) {
      return [
        'Мне пока не хватает памяти из библиотеки, поэтому я не буду притворяться, что знаю твой мир.',
        'Добавь хотя бы черновик, персонажа или правило мира, и я смогу отвечать уже как StoryForge, а не как обычный чат.',
        `Я уже учитываю профиль: ${authorName}. Язык: Русский.`,
        'Первый вопрос: какую эмоцию читатель должен почувствовать от этой истории?',
      ].join('\n');
    }

    return [
      `Профиль автора: ${authorName}. Жанры: ${genres}.`,
      `Контекст библиотеки: ${drafts.map((draft) => draft.title).join(', ') || 'черновик ещё не выбран'}.`,
      `Персонажи в памяти: ${characters.map((character) => character.name).join(', ') || 'персонажи ещё не добавлены'}.`,
      worldText.trim() ? `Канон мира: ${worldText.trim().slice(0, 180)}${worldText.trim().length > 180 ? '...' : ''}` : 'Канон мира пока почти пустой.',
      `Сюжетные линии:\n${plotLines.map((line) => `${line.character}: ${line.story}`).join('\n') || 'сюжетные линии ещё не добавлены'}`,
      '',
      'Я не буду писать книгу вместо тебя. Лучше помогу как редактор идеи.',
      'Полезный следующий шаг: выбрать, что разобрать - мотивацию персонажа, логику сюжета, отношения или слабое место в мире.',
    ].join('\n');
  }

  function sendMessage() {
    const text = prompt.trim();
    if (!text) return;
    const now = Date.now();

    setMessages((current) => [
      ...current,
      { id: now, role: 'author', text },
      { id: now + 1, role: 'assistant', text: makeAssistantReply() },
    ]);
    setChatHistory((current) => [
      {
        id: now,
        title: text.length > 34 ? `${text.slice(0, 34)}...` : text,
        updatedAt: t.justNow,
      },
      ...current,
    ]);
    setPrompt('');
  }

  function startNewChat() {
    setMessages([]);
    setPrompt('');
  }

  return (
    <main className={`app-shell theme-${palette}`}>
      <header className="topbar">
        <div>
          <p className="eyebrow">StoryForge</p>
          <h1>{t.appTitle}</h1>
        </div>
      </header>

      {mainPanel === 'library' && (
        <section className="workspace" aria-label={t.navLibrary}>
          <aside className="project-rail">
            <div className="section-heading">
              <span>{t.drafts}</span>
              <strong>{drafts.length}</strong>
            </div>

            <div className="add-box">
              <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} placeholder={t.draftTitle} />
              <button className="add-button" onClick={addDraft} type="button">
                {t.addDraft}
              </button>
            </div>

            {drafts.length === 0 ? (
              <div className="empty-state">
                <strong>{t.emptyTitle}</strong>
                <p>{t.emptyDrafts}</p>
              </div>
            ) : (
              <div className="project-list">
                {drafts.map((draft) => (
                  <article className="project-card" key={draft.id}>
                    <h2>{draft.title}</h2>
                    <p>{t.draftSubtitle}</p>
                    <span>{t.draftHint}</span>
                  </article>
                ))}
              </div>
            )}
          </aside>

          <section className="library-panel">
            <div className="tabs" role="tablist" aria-label={t.navLibrary}>
              {libraryTabs.map((tab) => (
                <button className={libraryTab === tab.id ? 'tab active' : 'tab'} key={tab.id} onClick={() => setLibraryTab(tab.id)} role="tab" type="button">
                  {tab.label}
                </button>
              ))}
            </div>

            <article className="canvas-panel">
              {libraryTab === 'world' && (
                <>
                  <p className="eyebrow">{t.worldEyebrow}</p>
                  <h2>{t.worldTitle}</h2>
                  <textarea value={worldText} onChange={(event) => setWorldText(event.target.value)} placeholder={t.worldPlaceholder} />
                </>
              )}

              {libraryTab === 'characters' && (
                <>
                  <p className="eyebrow">{t.charactersEyebrow}</p>
                  <h2>{t.charactersTitle}</h2>
                  <div className="character-form">
                    <div className="two-column">
                      <input value={characterName} onChange={(event) => setCharacterName(event.target.value)} placeholder={t.name} />
                      <input value={characterAge} onChange={(event) => setCharacterAge(event.target.value)} placeholder={t.age} />
                    </div>
                    <textarea value={characterAppearance} onChange={(event) => setCharacterAppearance(event.target.value)} placeholder={t.appearance} />
                    <textarea value={characterPersonality} onChange={(event) => setCharacterPersonality(event.target.value)} placeholder={t.personality} />
                    <div className="two-column">
                      <textarea value={characterFamily} onChange={(event) => setCharacterFamily(event.target.value)} placeholder={t.family} />
                      <textarea value={characterRomance} onChange={(event) => setCharacterRomance(event.target.value)} placeholder={t.romance} />
                    </div>
                    <textarea value={characterRelationships} onChange={(event) => setCharacterRelationships(event.target.value)} placeholder={t.relationships} />
                    <textarea value={characterChildhood} onChange={(event) => setCharacterChildhood(event.target.value)} placeholder={t.childhood} />
                    <button className="add-button" onClick={addCharacter} type="button">
                      {t.addCharacter}
                    </button>
                  </div>

                  <div className="mini-list">
                    {characters.length === 0 ? (
                      <p className="muted-text">{t.noCharacters}</p>
                    ) : (
                      characters.map((character) => (
                        <article className="mini-card character-card" key={character.id}>
                          <div>
                            <strong>{character.name}</strong>
                            <span>{character.age ? `${character.age} ${t.years}` : t.ageMissing}</span>
                          </div>
                          <dl className="character-details">
                            <div><dt>{t.appearance}</dt><dd>{character.appearance || t.stillEmpty}</dd></div>
                            <div><dt>{t.personality}</dt><dd>{character.personality || t.stillEmpty}</dd></div>
                            <div><dt>{t.family}</dt><dd>{character.family || t.stillEmpty}</dd></div>
                            <div><dt>{t.romance}</dt><dd>{character.romance || t.stillEmpty}</dd></div>
                            <div><dt>{t.relationships}</dt><dd>{character.relationships || t.stillEmpty}</dd></div>
                            <div><dt>{t.childhood}</dt><dd>{character.childhood || t.stillEmpty}</dd></div>
                          </dl>
                        </article>
                      ))
                    )}
                  </div>
                </>
              )}

              {libraryTab === 'plot' && (
                <>
                  <p className="eyebrow">{t.plotEyebrow}</p>
                  <div className="plot-form">
                    <input value={plotCharacter} onChange={(event) => setPlotCharacter(event.target.value)} placeholder={t.character} />
                    <textarea value={plotStory} onChange={(event) => setPlotStory(event.target.value)} placeholder={t.plotStory} />
                    <button className="add-button" onClick={addPlotLine} type="button">
                      {t.add}
                    </button>
                  </div>
                  <div className="mini-list">
                    {plotLines.map((line) => (
                      <article className="mini-card plot-card" key={line.id}>
                        <strong>{line.character}</strong>
                        <span>{line.story}</span>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </article>
          </section>
        </section>
      )}

      {mainPanel === 'forge' && (
        <section className="forge-layout" aria-label="AI Forge">
          <aside className="history-panel">
            <div className="section-heading">
              <span>{t.history}</span>
              <button className="history-new" onClick={startNewChat} type="button">+</button>
            </div>
            {chatHistory.length === 0 ? (
              <p className="muted-text">{t.noHistory}</p>
            ) : (
              <div className="history-list">
                {chatHistory.map((session) => (
                  <button className="history-item" key={session.id} type="button">
                    <strong>{session.title}</strong>
                    <span>{session.updatedAt}</span>
                  </button>
                ))}
              </div>
            )}
          </aside>

          <section className={messages.length === 0 ? 'chat-shell empty-chat' : 'chat-shell'} aria-label="AI Forge">
            {messages.length === 0 ? (
              <>
                <div className="forge-hero">
                  <p className="eyebrow">AI Forge</p>
                  <h2>{t.greeting}{authorProfile.penName.trim() ? `, ${authorProfile.penName.trim()}` : ''}! {t.todayQuestion}</h2>
                </div>

                <div className="hero-composer">
                  <button className="composer-plus" type="button" aria-label={t.addContext}>+</button>
                  <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={t.askPlaceholder} />
                  <button className="send-orb" onClick={sendMessage} type="button" aria-label={t.send}>
                    ↑
                  </button>
                </div>

                <div className="suggestion-row">
                  {t.suggestions.map((suggestion) => (
                    <button key={suggestion} onClick={() => setPrompt(suggestion)} type="button">
                      {suggestion}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="chat-header">
                  <div>
                    <p className="eyebrow">AI Forge</p>
                    <h2>{t.chatTitle}</h2>
                  </div>
                  <span>{drafts.length + characters.length + plotLines.length > 0 ? t.contextOn : t.contextNeeded}</span>
                </div>

                <div className="chat-messages">
                  {messages.map((message) => (
                    <article className={`chat-message ${message.role}`} key={message.id}>
                      <p>{message.text}</p>
                    </article>
                  ))}
                </div>

                <div className="chat-composer">
                  <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={t.continueChat} />
                  <button className="send-button" onClick={sendMessage} type="button">
                    {t.send}
                  </button>
                </div>
              </>
            )}
          </section>
        </section>
      )}

      {mainPanel === 'settings' && (
        <section className="settings-panel" aria-label={t.settings}>
          <p className="eyebrow">{t.settings}</p>
          <h2>{t.settingsTitle}</h2>

          <div className="tabs settings-tabs" role="tablist" aria-label={t.settings}>
            {settingsTabs.map((tab) => (
              <button className={settingsTab === tab.id ? 'tab active' : 'tab'} key={tab.id} onClick={() => setSettingsTab(tab.id)} role="tab" type="button">
                {tab.label}
              </button>
            ))}
          </div>

          {settingsTab === 'profile' && (
            <div className="settings-form">
              <label>
                <span>{t.penName}</span>
                <input value={authorProfile.penName} onChange={(event) => setAuthorProfile((current) => ({ ...current, penName: event.target.value }))} placeholder={t.penNamePlaceholder} />
              </label>
              <label>
                <span>{t.language}</span>
                <select value={authorProfile.language} onChange={(event) => setAuthorProfile((current) => ({ ...current, language: event.target.value as Language }))}>
                  {languageOptions.map((language) => (
                    <option key={language.id} value={language.id}>{language.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>{t.favoriteGenres}</span>
                <input value={authorProfile.favoriteGenres} onChange={(event) => setAuthorProfile((current) => ({ ...current, favoriteGenres: event.target.value }))} placeholder={t.genresPlaceholder} />
              </label>
            </div>
          )}

          {settingsTab === 'forge' && (
            <div className="settings-form">
              <label>
                <span>{t.adviceTone}</span>
                <select value={forgeBehavior.tone} onChange={(event) => setForgeBehavior((current) => ({ ...current, tone: event.target.value as ForgeTone }))}>
                  <option value="soft">{t.softTone}</option>
                  <option value="balanced">{t.balancedTone}</option>
                  <option value="strict">{t.strictTone}</option>
                </select>
              </label>
              <div className="toggle-list">
                <label>
                  <input checked={forgeBehavior.wantsQuestions} onChange={(event) => setForgeBehavior((current) => ({ ...current, wantsQuestions: event.target.checked }))} type="checkbox" />
                  <span>{t.moreQuestions}</span>
                </label>
                <label>
                  <input checked={forgeBehavior.wantsVariants} onChange={(event) => setForgeBehavior((current) => ({ ...current, wantsVariants: event.target.checked }))} type="checkbox" />
                  <span>{t.severalVariants}</span>
                </label>
                <label>
                  <input checked={forgeBehavior.allowDirectCritique} onChange={(event) => setForgeBehavior((current) => ({ ...current, allowDirectCritique: event.target.checked }))} type="checkbox" />
                  <span>{t.directCritique}</span>
                </label>
              </div>
            </div>
          )}

          {settingsTab === 'palette' && (
            <div className="palette-grid">
              {palettes.map((item) => (
                <button className={palette === item ? `palette-card ${item} active` : `palette-card ${item}`} key={item} onClick={() => setPalette(item)} type="button">
                  <span>{t.palettes[item]}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      <nav className="bottom-nav" aria-label="Navigation">
        <button className={mainPanel === 'library' ? 'nav-item active' : 'nav-item'} onClick={() => setMainPanel('library')} type="button">
          {t.navLibrary}
        </button>
        <button className={mainPanel === 'forge' ? 'nav-item active' : 'nav-item'} onClick={() => setMainPanel('forge')} type="button">
          {t.navForge}
        </button>
        <button className={mainPanel === 'settings' ? 'nav-item active' : 'nav-item'} onClick={() => setMainPanel('settings')} type="button">
          {t.navSettings}
        </button>
      </nav>
    </main>
  );
}
