const definitions = [
  {
    id: 'gentle-night',
    title: 'Спокойной ночи',
    aliases: ['Gentle Night AID', 'Gentle Night'],
  },
  {
    id: 'who-me-definitely-not',
    title: 'Who me? Definitely not!',
    aliases: ['who? me? definitely not! ru', 'who? me? definitely not!'],
  },
];

// The first script references standard roles by ID. Only their names and types are supplied here.
const standardTypes = {
  townsfolk: 'chef investigator librarian highpriestess chambermaid towncrier undertaker acrobat juggler soldier sage mayor virgin',
  outsider: 'butler drunk sweetheart barber',
  minion: 'marionette poisoner spy goblin scarletwoman baron',
  demon: 'pukka imp',
};
const standardNames = new Map(Object.entries({
  librarian: 'Библиотекарь',
  highpriestess: 'Верховная жрица',
  acrobat: 'Акробат',
  marionette: 'Марионетка',
  barber: 'Парикмахер',
  goblin: 'Гоблин',
}));
const typesByRole = new Map(Object.entries(standardTypes).flatMap(
  ([type, ids]) => ids.split(' ').map(id => [id, type]),
));

const scriptKey = value => String(value ?? '').normalize('NFKC').trim().toLowerCase();
export const roleKey = value => scriptKey(value).replace(/[\s_'’\-]+/g, '');
export const baseRoleId = id => String(id ?? '').trim().toLowerCase().replace(/_ru$/, '').replace(/[_-]/g, '');
const definitionsByName = new Map(definitions.flatMap(definition =>
  [definition.title, ...definition.aliases].map(name => [scriptKey(name), definition]),
));

export const scenarioFor = name => definitionsByName.get(scriptKey(name));
export const scenarioTitle = name => scenarioFor(name)?.title ?? name;
export const standardRoleName = id => standardNames.get(roleKey(id));

export async function loadScenarioCatalog() {
  const results = await Promise.allSettled(definitions.map(async definition => {
    const url = `./scripts/${definition.id}.json?rev=1`;
    const response = await fetch(url, {signal: AbortSignal.timeout(8000)});
    if (!response.ok) throw new Error(`Scenario unavailable: ${definition.id}`);
    const entries = await response.json();
    if (!Array.isArray(entries)) throw new Error(`Invalid scenario: ${definition.id}`);
    const meta = entries.find(entry => entry?.id === '_meta') ?? {};
    const characters = entries.flatMap(entry => {
      if (typeof entry === 'string') return [{id: entry, team: typesByRole.get(entry)}];
      return entry?.id && entry.id !== '_meta' ? [entry] : [];
    });
    const lookup = new Map();
    for (const character of characters) {
      for (const alias of [character.id, baseRoleId(character.id), character.name]) {
        if (alias) lookup.set(roleKey(alias), character);
      }
    }
    return [definition.id, {...definition, url, meta, characters, lookup}];
  }));
  return new Map(results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []));
}

const groups = {
  townsfolk: 'Горожане', outsider: 'Изгои', minion: 'Приспешники', demon: 'Демоны',
  fabled: 'Легендарные', other: 'Другие роли',
};
const nightSteps = {
  dusk: 'Начало ночи', dawn: 'Рассвет', minioninfo: 'Информация приспешников',
  demoninfo: 'Информация демона',
};

export function renderScenarioCards(container, catalog, roleName, art, create) {
  for (const scenario of catalog.values()) {
    const card = create('article', null, 'scenario-card');
    card.id = `script-${scenario.id}`;
    const header = create('div', null, 'scenario-header');
    const title = create('div');
    title.append(create('h3', scenario.title));
    if (scenario.meta.author) title.append(create('p', `Автор · ${scenario.meta.author}`, 'muted'));
    const download = create('a', 'Скачать JSON', 'button');
    download.href = scenario.url;
    download.download = `${scenario.id}.json`;
    header.append(title, download);
    card.append(header);
    const roles = create('details', null, 'scenario-section');
    roles.append(create('summary', `Состав сценария · ${scenario.characters.length}`));
    for (const [type, label] of Object.entries(groups)) {
      const characters = scenario.characters.filter(character =>
        type === (Object.hasOwn(groups, character.team) ? character.team : 'other'),
      );
      if (!characters.length) continue;
      roles.append(create('h4', label));
      const list = create('ul', null, 'scenario-roles');
      for (const character of characters) {
        const name = character.name || roleName(character.id);
        const row = create('li', null, 'scenario-role');
        const info = create('div');
        info.append(create('strong', name));
        if (character.setup) info.append(create('span', 'Меняет подготовку', 'scenario-setup'));
        if (character.ability) info.append(create('p', character.ability));
        const reminders = [...(character.reminders ?? []), ...(character.remindersGlobal ?? [])];
        if (reminders.length) info.append(create('p', `Напоминания · ${reminders.join(' · ')}`, 'muted'));
        row.append(art(character.id, name, character), info);
        list.append(row);
      }
      roles.append(list);
    }
    card.append(roles);
    for (const [key, label] of [['firstNight', 'Первая ночь'], ['otherNight', 'Последующие ночи']]) {
      if (!scenario.meta[key]?.length) continue;
      const night = create('details', null, 'scenario-section');
      const list = create('ol', null, 'scenario-night');
      for (const id of scenario.meta[key]) {
        const character = scenario.lookup.get(roleKey(id));
        const row = create('li');
        row.append(create('strong', character?.name || nightSteps[id] || roleName(id)));
        if (character?.[`${key}Reminder`]) row.append(create('p', character[`${key}Reminder`]));
        list.append(row);
      }
      night.append(create('summary', label), list);
      card.append(night);
    }
    container.append(card);
  }
  if (catalog.size < definitions.length) {
    container.append(create('p', 'Не удалось загрузить часть каталога сценариев. Обновите страницу, чтобы повторить.', 'muted'));
  }
}
