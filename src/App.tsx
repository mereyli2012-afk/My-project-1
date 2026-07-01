import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';

type MainPanel = 'library' | 'forge' | 'settings';
type LibraryTab = 'world' | 'characters' | 'plot';
type SettingsTab = 'profile' | 'forge' | 'palette';
type AuthMode = 'signin' | 'signup';
type Palette = 'green' | 'sky' | 'sun' | 'ocean' | 'wine' | 'rose' | 'lilac' | 'violet';
type ForgeTone = 'soft' | 'balanced' | 'strict';
type Language = 'ru' | 'en' | 'kk';
type ProjectStatus = 'idea' | 'writing' | 'editing' | 'finished';

type Project = {
  id: number;
  title: string;
  genre: string;
  status: ProjectStatus;
  updatedAt: string;
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
  projects: Project[];
  selectedProjectId: number | null;
  characters: Character[];
  plotLines: PlotLine[];
  worldText: string;
  messages: ChatMessage[];
  chatHistory: ChatSession[];
};

const storageKey = 'storyforge-state-v3';
const oldStorageKey = 'storyforge-state-v2';
const guestStorageKey = 'storyforge-guest-mode';

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

const defaultState: SavedState = {
  mainPanel: 'library',
  libraryTab: 'world',
  settingsTab: 'profile',
  palette: 'green',
  authorProfile: defaultProfile,
  forgeBehavior: defaultForgeBehavior,
  projects: [],
  selectedProjectId: null,
  characters: [],
  plotLines: [],
  worldText: '',
  messages: [],
  chatHistory: [],
};

const languageOptions: Array<{ id: Language; label: string }> = [
  { id: 'ru', label: 'Русский' },
  { id: 'en', label: 'English' },
  { id: 'kk', label: 'Қазақша' },
];

const palettes: Palette[] = ['green', 'sky', 'sun', 'ocean', 'wine', 'rose', 'lilac', 'violet'];

const statusLabels: Record<ProjectStatus, string> = {
  idea: 'Идея',
  writing: 'Пишу',
  editing: 'Редактирую',
  finished: 'Готово',
};

const paletteLabels: Record<Palette, string> = {
  green: 'Зелёная',
  sky: 'Небесная',
  sun: 'Солнечная',
  ocean: 'Глубокая синяя',
  wine: 'Бордовая',
  rose: 'Розовая',
  lilac: 'Сиреневая',
  violet: 'Фиолетовая',
};

function normalizeLanguage(value: unknown): Language {
  if (value === 'en' || value === 'English') return 'en';
  if (value === 'kk' || value === 'Қазақша') return 'kk';
  return 'ru';
}

function normalizeState(input: Partial<SavedState> & { drafts?: Array<{ id: number; title: string }> }): SavedState {
  const migratedProjects =
    input.projects ??
    input.drafts?.map((draft) => ({
      id: draft.id,
      title: draft.title,
      genre: '',
      status: 'idea' as ProjectStatus,
      updatedAt: 'сейчас',
    })) ??
    [];

  return {
    ...defaultState,
    ...input,
    authorProfile: {
      ...defaultProfile,
      ...input.authorProfile,
      language: normalizeLanguage(input.authorProfile?.language),
    },
    forgeBehavior: {
      ...defaultForgeBehavior,
      ...input.forgeBehavior,
    },
    projects: migratedProjects,
    selectedProjectId: input.selectedProjectId ?? migratedProjects[0]?.id ?? null,
    characters: input.characters ?? [],
    plotLines: input.plotLines ?? [],
    worldText: input.worldText ?? '',
    messages: input.messages ?? [],
    chatHistory: input.chatHistory ?? [],
  };
}

function loadSavedState(): SavedState {
  try {
    const raw = localStorage.getItem(storageKey) ?? localStorage.getItem(oldStorageKey);
    if (!raw) return defaultState;
    return normalizeState(JSON.parse(raw));
  } catch {
    return defaultState;
  }
}

function friendlyAuthError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) return 'Неверная почта или пароль.';
  if (lower.includes('email not confirmed')) return 'Почта ещё не подтверждена. Проверь письмо в Gmail.';
  if (lower.includes('user already registered')) return 'Такой аккаунт уже есть. Нажми “Войти”.';
  if (lower.includes('password')) return 'Пароль должен быть минимум 6 символов.';
  if (lower.includes('provider is not enabled')) return 'Google-вход ещё не включён в Supabase.';
  return message || 'Что-то пошло не так. Попробуй ещё раз.';
}

function todayLabel() {
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short' }).format(new Date());
}

export default function App() {
  const initialState = useMemo(loadSavedState, []);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [guestMode, setGuestMode] = useState(() => localStorage.getItem(guestStorageKey) === 'true');
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signup');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [syncStatus, setSyncStatus] = useState('Локально сохранено');
  const [stateReady, setStateReady] = useState(false);

  const [mainPanel, setMainPanel] = useState<MainPanel>(initialState.mainPanel);
  const [libraryTab, setLibraryTab] = useState<LibraryTab>(initialState.libraryTab);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>(initialState.settingsTab);
  const [palette, setPalette] = useState<Palette>(initialState.palette);
  const [authorProfile, setAuthorProfile] = useState<AuthorProfile>(initialState.authorProfile);
  const [forgeBehavior, setForgeBehavior] = useState<ForgeBehavior>(initialState.forgeBehavior);
  const [projects, setProjects] = useState<Project[]>(initialState.projects);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(initialState.selectedProjectId);
  const [characters, setCharacters] = useState<Character[]>(initialState.characters);
  const [plotLines, setPlotLines] = useState<PlotLine[]>(initialState.plotLines);
  const [worldText, setWorldText] = useState(initialState.worldText);
  const [messages, setMessages] = useState<ChatMessage[]>(initialState.messages);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>(initialState.chatHistory);

  const [projectTitle, setProjectTitle] = useState('');
  const [projectGenre, setProjectGenre] = useState('');
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>('idea');
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);

  const [editingCharacterId, setEditingCharacterId] = useState<number | null>(null);
  const [characterName, setCharacterName] = useState('');
  const [characterAge, setCharacterAge] = useState('');
  const [characterAppearance, setCharacterAppearance] = useState('');
  const [characterPersonality, setCharacterPersonality] = useState('');
  const [characterFamily, setCharacterFamily] = useState('');
  const [characterRomance, setCharacterRomance] = useState('');
  const [characterRelationships, setCharacterRelationships] = useState('');
  const [characterChildhood, setCharacterChildhood] = useState('');

  const [editingPlotId, setEditingPlotId] = useState<number | null>(null);
  const [plotCharacter, setPlotCharacter] = useState('');
  const [plotStory, setPlotStory] = useState('');
  const [prompt, setPrompt] = useState('');

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;

  const appState: SavedState = {
    mainPanel,
    libraryTab,
    settingsTab,
    palette,
    authorProfile,
    forgeBehavior,
    projects,
    selectedProjectId,
    characters,
    plotLines,
    worldText,
    messages,
    chatHistory,
  };

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) {
        setGuestMode(false);
        localStorage.removeItem(guestStorageKey);
      }
      setAuthLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        setGuestMode(false);
        localStorage.removeItem(guestStorageKey);
      }
      setAuthLoading(false);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    async function loadCloudState() {
      if (!session) {
        setStateReady(true);
        return;
      }

      setSyncStatus('Загружаем данные аккаунта...');
      const { data, error } = await supabase
        .from('storyforge_states')
        .select('state')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) {
        setSyncStatus('Сохраняем локально. Нужна миграция Supabase.');
        setStateReady(true);
        return;
      }

      if (data?.state) {
        const cloud = normalizeState(data.state as Partial<SavedState>);
        setMainPanel(cloud.mainPanel);
        setLibraryTab(cloud.libraryTab);
        setSettingsTab(cloud.settingsTab);
        setPalette(cloud.palette);
        setAuthorProfile(cloud.authorProfile);
        setForgeBehavior(cloud.forgeBehavior);
        setProjects(cloud.projects);
        setSelectedProjectId(cloud.selectedProjectId);
        setCharacters(cloud.characters);
        setPlotLines(cloud.plotLines);
        setWorldText(cloud.worldText);
        setMessages(cloud.messages);
        setChatHistory(cloud.chatHistory);
        setSyncStatus('Данные аккаунта загружены');
      } else {
        setSyncStatus('Аккаунт готов к сохранению');
      }
      setStateReady(true);
    }

    loadCloudState();
  }, [session]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(appState));

    if (!stateReady || !session || guestMode) {
      setSyncStatus('Локально сохранено');
      return;
    }

    setSyncStatus('Сохраняем в аккаунт...');
    const handle = window.setTimeout(async () => {
      const { error } = await supabase.from('storyforge_states').upsert({
        user_id: session.user.id,
        state: appState,
      });
      setSyncStatus(error ? 'Не сохранилось в Supabase. Проверь миграцию.' : 'Сохранено в аккаунт');
    }, 700);

    return () => window.clearTimeout(handle);
  }, [JSON.stringify(appState), session?.user.id, guestMode, stateReady]);

  function openAuthDialog(mode: AuthMode) {
    setAuthMode(mode);
    setAuthMessage('');
    setAuthDialogOpen(true);
  }

  async function handleAuthSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');

    if (!email || !password) {
      setAuthMessage('Введите email и пароль.');
      return;
    }

    setAuthBusy(true);
    setAuthMessage(authMode === 'signup' ? 'Создаём аккаунт...' : 'Входим в аккаунт...');

    try {
      const request =
        authMode === 'signup'
          ? supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
          : supabase.auth.signInWithPassword({ email, password });
      const { data, error } = await request;

      if (error) {
        setAuthMessage(friendlyAuthError(error.message));
      } else if (data.session) {
        setSession(data.session);
        setAuthDialogOpen(false);
        setAuthMessage('');
      } else if (authMode === 'signup') {
        setAuthMode('signin');
        setAuthMessage('Аккаунт создан. Проверь Gmail и подтверди почту, если письмо пришло. Потом войди здесь.');
      } else {
        setAuthMessage('Проверь почту: возможно, аккаунт нужно подтвердить перед входом.');
      }
    } catch {
      setAuthMessage('Не получилось войти. Попробуй ещё раз.');
    } finally {
      setAuthBusy(false);
    }
  }

  async function resetPassword() {
    const email = authEmail.trim();
    if (!email) {
      setAuthMessage('Сначала введи email, потом нажми восстановление пароля.');
      return;
    }

    setAuthBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    setAuthMessage(error ? friendlyAuthError(error.message) : 'Письмо для восстановления пароля отправлено.');
    setAuthBusy(false);
  }

  async function signInWithGoogle() {
    setAuthBusy(true);
    setAuthMessage('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setAuthMessage(friendlyAuthError(error.message));
      setAuthBusy(false);
    }
  }

  function continueAsGuest() {
    localStorage.setItem(guestStorageKey, 'true');
    setGuestMode(true);
  }

  async function leaveApp() {
    if (guestMode) {
      localStorage.removeItem(guestStorageKey);
      setGuestMode(false);
      setLogoutDialogOpen(false);
      return;
    }

    await supabase.auth.signOut();
    setSession(null);
    setLogoutDialogOpen(false);
  }

  function resetProjectForm() {
    setProjectTitle('');
    setProjectGenre('');
    setProjectStatus('idea');
    setEditingProjectId(null);
  }

  function saveProject() {
    const title = projectTitle.trim();
    if (!title) return;

    if (editingProjectId) {
      setProjects((current) =>
        current.map((project) =>
          project.id === editingProjectId
            ? { ...project, title, genre: projectGenre.trim(), status: projectStatus, updatedAt: todayLabel() }
            : project,
        ),
      );
    } else {
      const project = {
        id: Date.now(),
        title,
        genre: projectGenre.trim(),
        status: projectStatus,
        updatedAt: todayLabel(),
      };
      setProjects((current) => [project, ...current]);
      setSelectedProjectId(project.id);
    }
    resetProjectForm();
  }

  function editProject(project: Project) {
    setEditingProjectId(project.id);
    setProjectTitle(project.title);
    setProjectGenre(project.genre);
    setProjectStatus(project.status);
  }

  function deleteProject(id: number) {
    if (!window.confirm('Удалить проект?')) return;
    setProjects((current) => current.filter((project) => project.id !== id));
    if (selectedProjectId === id) setSelectedProjectId(null);
  }

  function resetCharacterForm() {
    setEditingCharacterId(null);
    setCharacterName('');
    setCharacterAge('');
    setCharacterAppearance('');
    setCharacterPersonality('');
    setCharacterFamily('');
    setCharacterRomance('');
    setCharacterRelationships('');
    setCharacterChildhood('');
  }

  function saveCharacter() {
    const name = characterName.trim();
    if (!name) return;
    const character: Character = {
      id: editingCharacterId ?? Date.now(),
      name,
      age: characterAge.trim(),
      appearance: characterAppearance.trim(),
      personality: characterPersonality.trim(),
      family: characterFamily.trim(),
      romance: characterRomance.trim(),
      relationships: characterRelationships.trim(),
      childhood: characterChildhood.trim(),
    };

    setCharacters((current) =>
      editingCharacterId ? current.map((item) => (item.id === editingCharacterId ? character : item)) : [character, ...current],
    );
    resetCharacterForm();
  }

  function editCharacter(character: Character) {
    setEditingCharacterId(character.id);
    setCharacterName(character.name);
    setCharacterAge(character.age);
    setCharacterAppearance(character.appearance);
    setCharacterPersonality(character.personality);
    setCharacterFamily(character.family);
    setCharacterRomance(character.romance);
    setCharacterRelationships(character.relationships);
    setCharacterChildhood(character.childhood);
  }

  function deleteCharacter(id: number) {
    if (window.confirm('Удалить персонажа?')) setCharacters((current) => current.filter((character) => character.id !== id));
  }

  function resetPlotForm() {
    setEditingPlotId(null);
    setPlotCharacter('');
    setPlotStory('');
  }

  function savePlotLine() {
    const character = plotCharacter.trim();
    const story = plotStory.trim();
    if (!character || !story) return;
    const plotLine: PlotLine = { id: editingPlotId ?? Date.now(), character, story };

    setPlotLines((current) =>
      editingPlotId ? current.map((item) => (item.id === editingPlotId ? plotLine : item)) : [plotLine, ...current],
    );
    resetPlotForm();
  }

  function editPlotLine(line: PlotLine) {
    setEditingPlotId(line.id);
    setPlotCharacter(line.character);
    setPlotStory(line.story);
  }

  function deletePlotLine(id: number) {
    if (window.confirm('Удалить сюжетную линию?')) setPlotLines((current) => current.filter((line) => line.id !== id));
  }

  function makeAssistantReply() {
    const hasContext = projects.length > 0 || worldText.trim() || characters.length > 0 || plotLines.length > 0;
    const authorName = authorProfile.penName.trim() || 'автор';
    const genres = authorProfile.favoriteGenres.trim() || 'жанры пока не указаны';

    if (!hasContext) {
      return [
        'Мне пока не хватает памяти из библиотеки, поэтому я не буду притворяться, что знаю твой мир.',
        'Добавь проект, персонажа или правило мира, и я смогу отвечать как StoryForge.',
        `Я учитываю профиль: ${authorName}. Жанры: ${genres}.`,
        'Первый вопрос: какую эмоцию читатель должен почувствовать от этой истории?',
      ].join('\n');
    }

    return [
      `Профиль автора: ${authorName}. Жанры: ${genres}.`,
      `Текущий проект: ${selectedProject?.title ?? 'проект не выбран'}.`,
      `Проекты: ${projects.map((project) => project.title).join(', ') || 'пока нет'}.`,
      `Персонажи: ${characters.map((character) => character.name).join(', ') || 'пока нет'}.`,
      worldText.trim() ? `Канон мира: ${worldText.trim().slice(0, 220)}${worldText.trim().length > 220 ? '...' : ''}` : 'Канон мира пока пустой.',
      `Сюжетные линии:\n${plotLines.map((line) => `${line.character}: ${line.story}`).join('\n') || 'сюжетные линии ещё не добавлены'}`,
      '',
      'Я могу помочь разобрать мотивацию, конфликт, логику мира или слабое место сюжета.',
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
    setChatHistory((current) => [{ id: now, title: text.length > 34 ? `${text.slice(0, 34)}...` : text, updatedAt: 'только что' }, ...current]);
    setPrompt('');
  }

  if (authLoading) {
    return (
      <main className="auth-page theme-green">
        <section className="auth-shell">
          <p className="eyebrow">StoryForge</p>
          <h1>Загружаем мастерскую...</h1>
        </section>
      </main>
    );
  }

  if (!session && !guestMode) {
    return (
      <main className="auth-page theme-green">
        <header className="auth-topbar">
          <p className="eyebrow">StoryForge</p>
          <div className="auth-top-actions">
            <button onClick={() => openAuthDialog('signup')} type="button">Регистрация</button>
            <button onClick={() => openAuthDialog('signin')} type="button">Войти</button>
          </div>
        </header>
        <section className="auth-hero">
          <div className="auth-copy">
            <h1>StoryForge помогает авторам собрать историю в одном месте</h1>
            <p>Рабочая мастерская для книг, новелл и вымышленных миров: черновики, персонажи, лор, сюжетные линии и умный собеседник для обсуждения идей.</p>
            <section className="auth-info-block" aria-label="Для кого StoryForge">
              <h2>StoryForge создан для:</h2>
              <ul>
                <li>начинающих писателей;</li>
                <li>авторов, которым не с кем обсудить сюжет;</li>
                <li>людей, у которых много персонажей и лора;</li>
                <li>авторов, которым нужен собеседник, редактор и помощник.</li>
              </ul>
            </section>
            <section className="auth-info-block" aria-label="Функции StoryForge">
              <h2>Что внутри</h2>
              <ul>
                <li>библиотека проектов с жанром и статусом;</li>
                <li>анкеты персонажей и сюжетные линии;</li>
                <li>канон мира и профиль автора;</li>
                <li>сохранение данных в аккаунт Supabase.</li>
              </ul>
            </section>
            <div className="auth-highlights" aria-label="Что умеет StoryForge">
              <span>Проекты</span>
              <span>Персонажи</span>
              <span>Лор</span>
              <span>AI Forge</span>
            </div>
          </div>
        </section>

        {authDialogOpen && (
          <div className="auth-modal-backdrop" role="presentation">
            <div className="auth-panel auth-modal" role="dialog" aria-modal="true" aria-label={authMode === 'signup' ? 'Регистрация' : 'Войти'}>
              <button className="auth-close" onClick={() => setAuthDialogOpen(false)} aria-label="Закрыть" type="button">×</button>
              <div className="auth-switch" role="tablist" aria-label="Вход или регистрация">
                <button className={authMode === 'signup' ? 'active' : ''} onClick={() => setAuthMode('signup')} type="button">Регистрация</button>
                <button className={authMode === 'signin' ? 'active' : ''} onClick={() => setAuthMode('signin')} type="button">Войти</button>
              </div>

              <form className="auth-form" onSubmit={handleAuthSubmit}>
                <label>
                  <span>Email</span>
                  <input name="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="you@example.com" required type="email" />
                </label>
                <label>
                  <span>Пароль</span>
                  <input name="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} minLength={6} placeholder="Минимум 6 символов" required type="password" />
                </label>
                <button className="auth-primary" disabled={authBusy} type="submit">
                  {authBusy ? 'Подождите...' : authMode === 'signup' ? 'Создать аккаунт' : 'Войти'}
                </button>
              </form>

              {authMode === 'signin' && (
                <button className="link-button" disabled={authBusy} onClick={resetPassword} type="button">Забыли пароль?</button>
              )}

              <div className="auth-divider"><span>или</span></div>

              <button className="google-button" disabled={authBusy} onClick={signInWithGoogle} type="button">Войти через Google</button>
              <button className="guest-button" onClick={continueAsGuest} type="button">Войти как гость</button>

              {authMessage && <p className="auth-message">{authMessage}</p>}
              <p className="auth-note">Гость может посмотреть сайт. Аккаунт сохраняет проекты надёжнее и открывает их с другого устройства.</p>
            </div>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className={`app-shell theme-${palette}`}>
      <header className="topbar">
        <div>
          <p className="eyebrow">StoryForge</p>
          <h1>Мастерская для автора</h1>
          <p className="sync-status">{guestMode ? 'Гостевой режим' : syncStatus}</p>
        </div>
        <div className="app-actions" aria-label="Аккаунт">
          <button className="logout-button" onClick={() => setLogoutDialogOpen(true)} type="button">Выход</button>
        </div>
      </header>

      {logoutDialogOpen && (
        <div className="auth-modal-backdrop" role="presentation">
          <div className="confirm-modal" role="dialog" aria-modal="true" aria-label="Подтверждение выхода">
            <h2>Вы уверены, что хотите выйти?</h2>
            <div className="confirm-actions">
              <button className="confirm-yes" onClick={leaveApp} type="button">Да</button>
              <button className="confirm-no" onClick={() => setLogoutDialogOpen(false)} type="button">Нет</button>
            </div>
          </div>
        </div>
      )}

      {mainPanel === 'library' && (
        <section className="workspace" aria-label="Моя библиотека">
          <aside className="project-rail">
            <div className="section-heading">
              <span>Проекты</span>
              <strong>{projects.length}</strong>
            </div>

            <div className="add-box">
              <input value={projectTitle} onChange={(event) => setProjectTitle(event.target.value)} placeholder="Название проекта" />
              <input value={projectGenre} onChange={(event) => setProjectGenre(event.target.value)} placeholder="Жанр" />
              <select value={projectStatus} onChange={(event) => setProjectStatus(event.target.value as ProjectStatus)}>
                {Object.entries(statusLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
              <button className="add-button" onClick={saveProject} type="button">{editingProjectId ? 'Сохранить проект' : '+ Добавить проект'}</button>
              {editingProjectId && <button className="secondary-button" onClick={resetProjectForm} type="button">Отмена</button>}
            </div>

            {projects.length === 0 ? (
              <div className="empty-state">
                <strong>Пока пусто</strong>
                <p>Создай первый проект: книгу, новеллу, серию или отдельный мир.</p>
              </div>
            ) : (
              <div className="project-list">
                {projects.map((project) => (
                  <article className={selectedProjectId === project.id ? 'project-card active' : 'project-card'} key={project.id}>
                    <button className="project-select" onClick={() => setSelectedProjectId(project.id)} type="button">
                      <h2>{project.title}</h2>
                      <p>{project.genre || 'Жанр не указан'} · {statusLabels[project.status]}</p>
                      <span>Обновлено: {project.updatedAt}</span>
                    </button>
                    <div className="card-actions">
                      <button onClick={() => editProject(project)} type="button">Редактировать</button>
                      <button onClick={() => deleteProject(project.id)} type="button">Удалить</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </aside>

          <section className="library-panel">
            <div className="current-project">
              <span>Текущий проект</span>
              <strong>{selectedProject?.title ?? 'Не выбран'}</strong>
            </div>
            <div className="tabs" role="tablist" aria-label="Разделы библиотеки">
              {[
                { id: 'world' as LibraryTab, label: 'Мир' },
                { id: 'characters' as LibraryTab, label: 'Персонажи' },
                { id: 'plot' as LibraryTab, label: 'Сюжет' },
              ].map((tab) => (
                <button className={libraryTab === tab.id ? 'tab active' : 'tab'} key={tab.id} onClick={() => setLibraryTab(tab.id)} role="tab" type="button">
                  {tab.label}
                </button>
              ))}
            </div>

            <article className="canvas-panel">
              {libraryTab === 'world' && (
                <>
                  <p className="eyebrow">Канон мира</p>
                  <h2>Опиши правила, атмосферу и границы мира</h2>
                  <textarea value={worldText} onChange={(event) => setWorldText(event.target.value)} placeholder="Например: в этом мире магия существует, но каждый заклинатель теряет воспоминание за сильное заклинание..." />
                </>
              )}

              {libraryTab === 'characters' && (
                <>
                  <p className="eyebrow">Анкеты персонажей</p>
                  <h2>{editingCharacterId ? 'Редактирование персонажа' : 'Добавь персонажа'}</h2>
                  <div className="character-form">
                    <div className="two-column">
                      <input value={characterName} onChange={(event) => setCharacterName(event.target.value)} placeholder="Имя" />
                      <input value={characterAge} onChange={(event) => setCharacterAge(event.target.value)} placeholder="Возраст" />
                    </div>
                    <textarea value={characterAppearance} onChange={(event) => setCharacterAppearance(event.target.value)} placeholder="Внешнее описание" />
                    <textarea value={characterPersonality} onChange={(event) => setCharacterPersonality(event.target.value)} placeholder="Характер" />
                    <div className="two-column">
                      <textarea value={characterFamily} onChange={(event) => setCharacterFamily(event.target.value)} placeholder="Семья" />
                      <textarea value={characterRomance} onChange={(event) => setCharacterRomance(event.target.value)} placeholder="Любовная линия" />
                    </div>
                    <textarea value={characterRelationships} onChange={(event) => setCharacterRelationships(event.target.value)} placeholder="Отношения с другими персонажами" />
                    <textarea value={characterChildhood} onChange={(event) => setCharacterChildhood(event.target.value)} placeholder="Детство" />
                    <div className="inline-actions">
                      <button className="add-button" onClick={saveCharacter} type="button">{editingCharacterId ? 'Сохранить персонажа' : '+ Добавить персонажа'}</button>
                      {editingCharacterId && <button className="secondary-button" onClick={resetCharacterForm} type="button">Отмена</button>}
                    </div>
                  </div>

                  <div className="mini-list">
                    {characters.length === 0 ? <p className="muted-text">Персонажей пока нет.</p> : characters.map((character) => (
                      <article className="mini-card character-card" key={character.id}>
                        <div>
                          <strong>{character.name}</strong>
                          <span>{character.age ? `${character.age} лет` : 'Возраст не указан'}</span>
                        </div>
                        <dl className="character-details">
                          <div><dt>Внешность</dt><dd>{character.appearance || 'Пока пусто'}</dd></div>
                          <div><dt>Характер</dt><dd>{character.personality || 'Пока пусто'}</dd></div>
                          <div><dt>Семья</dt><dd>{character.family || 'Пока пусто'}</dd></div>
                          <div><dt>Любовная линия</dt><dd>{character.romance || 'Пока пусто'}</dd></div>
                          <div><dt>Отношения</dt><dd>{character.relationships || 'Пока пусто'}</dd></div>
                          <div><dt>Детство</dt><dd>{character.childhood || 'Пока пусто'}</dd></div>
                        </dl>
                        <div className="card-actions">
                          <button onClick={() => editCharacter(character)} type="button">Редактировать</button>
                          <button onClick={() => deleteCharacter(character.id)} type="button">Удалить</button>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}

              {libraryTab === 'plot' && (
                <>
                  <p className="eyebrow">Сюжетные линии</p>
                  <div className="plot-form">
                    <input value={plotCharacter} onChange={(event) => setPlotCharacter(event.target.value)} placeholder="Персонаж" />
                    <textarea value={plotStory} onChange={(event) => setPlotStory(event.target.value)} placeholder="История / сюжет персонажа" />
                    <div className="inline-actions">
                      <button className="add-button" onClick={savePlotLine} type="button">{editingPlotId ? 'Сохранить сюжет' : '+ Добавить'}</button>
                      {editingPlotId && <button className="secondary-button" onClick={resetPlotForm} type="button">Отмена</button>}
                    </div>
                  </div>
                  <div className="mini-list">
                    {plotLines.map((line) => (
                      <article className="mini-card plot-card" key={line.id}>
                        <strong>{line.character}</strong>
                        <span>{line.story}</span>
                        <div className="card-actions">
                          <button onClick={() => editPlotLine(line)} type="button">Редактировать</button>
                          <button onClick={() => deletePlotLine(line.id)} type="button">Удалить</button>
                        </div>
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
              <span>История</span>
              <button className="history-new" onClick={() => setMessages([])} type="button">+</button>
            </div>
            {chatHistory.length === 0 ? <p className="muted-text">Здесь появятся прошлые разговоры.</p> : (
              <div className="history-list">
                {chatHistory.map((chat) => (
                  <button className="history-item" key={chat.id} type="button">
                    <strong>{chat.title}</strong>
                    <span>{chat.updatedAt}</span>
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
                  <h2>Привет{authorProfile.penName.trim() ? `, ${authorProfile.penName.trim()}` : ''}! Чем займёмся сегодня?</h2>
                </div>
                <div className="hero-composer">
                  <button className="composer-plus" type="button" aria-label="Добавить контекст">+</button>
                  <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Спроси про персонажа, конфликт, мир или сюжет..." />
                  <button className="send-orb" onClick={sendMessage} type="button" aria-label="Отправить">↑</button>
                </div>
                <div className="suggestion-row">
                  {['Разобрать персонажа', 'Проверить канон', 'Связать сюжетные линии', 'Усилить конфликт'].map((suggestion) => (
                    <button key={suggestion} onClick={() => setPrompt(suggestion)} type="button">{suggestion}</button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="chat-header">
                  <div>
                    <p className="eyebrow">AI Forge</p>
                    <h2>Советник по идеям</h2>
                  </div>
                  <span>{projects.length + characters.length + plotLines.length > 0 ? 'Контекст подключён' : 'Нужен контекст'}</span>
                </div>
                <div className="chat-messages">
                  {messages.map((message) => (
                    <article className={`chat-message ${message.role}`} key={message.id}>
                      <p>{message.text}</p>
                    </article>
                  ))}
                </div>
                <div className="chat-composer">
                  <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Продолжи разговор..." />
                  <button className="send-button" onClick={sendMessage} type="button">Отправить</button>
                </div>
              </>
            )}
          </section>
        </section>
      )}

      {mainPanel === 'settings' && (
        <section className="settings-panel" aria-label="Настройки">
          <p className="eyebrow">Настройки</p>
          <h2>Профиль автора</h2>
          <div className="tabs settings-tabs" role="tablist" aria-label="Разделы настроек">
            {[
              { id: 'profile' as SettingsTab, label: 'Профиль автора' },
              { id: 'forge' as SettingsTab, label: 'Поведение AI Forge' },
              { id: 'palette' as SettingsTab, label: 'Палитра интерфейса' },
            ].map((tab) => (
              <button className={settingsTab === tab.id ? 'tab active' : 'tab'} key={tab.id} onClick={() => setSettingsTab(tab.id)} role="tab" type="button">{tab.label}</button>
            ))}
          </div>

          {settingsTab === 'profile' && (
            <div className="settings-form">
              <label>
                <span>Имя или псевдоним</span>
                <input value={authorProfile.penName} onChange={(event) => setAuthorProfile((current) => ({ ...current, penName: event.target.value }))} placeholder="Например: Mereyli" />
              </label>
              <label>
                <span>Язык интерфейса / историй</span>
                <select value={authorProfile.language} onChange={(event) => setAuthorProfile((current) => ({ ...current, language: event.target.value as Language }))}>
                  {languageOptions.map((language) => <option key={language.id} value={language.id}>{language.label}</option>)}
                </select>
              </label>
              <label>
                <span>Любимые жанры</span>
                <input value={authorProfile.favoriteGenres} onChange={(event) => setAuthorProfile((current) => ({ ...current, favoriteGenres: event.target.value }))} placeholder="Фэнтези, романтика, детектив..." />
              </label>
            </div>
          )}

          {settingsTab === 'forge' && (
            <div className="settings-form">
              <label>
                <span>Тон советов</span>
                <select value={forgeBehavior.tone} onChange={(event) => setForgeBehavior((current) => ({ ...current, tone: event.target.value as ForgeTone }))}>
                  <option value="soft">Мягкий наставник</option>
                  <option value="balanced">Баланс поддержки и критики</option>
                  <option value="strict">Строгий редактор</option>
                </select>
              </label>
              <div className="toggle-list">
                <label><input checked={forgeBehavior.wantsQuestions} onChange={(event) => setForgeBehavior((current) => ({ ...current, wantsQuestions: event.target.checked }))} type="checkbox" /><span>Задавать больше вопросов</span></label>
                <label><input checked={forgeBehavior.wantsVariants} onChange={(event) => setForgeBehavior((current) => ({ ...current, wantsVariants: event.target.checked }))} type="checkbox" /><span>Давать несколько вариантов</span></label>
                <label><input checked={forgeBehavior.allowDirectCritique} onChange={(event) => setForgeBehavior((current) => ({ ...current, allowDirectCritique: event.target.checked }))} type="checkbox" /><span>Можно прямо указывать слабые места</span></label>
              </div>
            </div>
          )}

          {settingsTab === 'palette' && (
            <div className="palette-grid">
              {palettes.map((item) => (
                <button className={palette === item ? `palette-card ${item} active` : `palette-card ${item}`} key={item} onClick={() => setPalette(item)} type="button">
                  <span>{paletteLabels[item]}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      <nav className="bottom-nav" aria-label="Навигация">
        <button className={mainPanel === 'library' ? 'nav-item active' : 'nav-item'} onClick={() => setMainPanel('library')} type="button">Библиотека</button>
        <button className={mainPanel === 'forge' ? 'nav-item active' : 'nav-item'} onClick={() => setMainPanel('forge')} type="button">AI Forge</button>
        <button className={mainPanel === 'settings' ? 'nav-item active' : 'nav-item'} onClick={() => setMainPanel('settings')} type="button">Настройки</button>
      </nav>
    </main>
  );
}
