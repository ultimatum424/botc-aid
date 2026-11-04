import {summarize,filterGames} from './model.mjs';

const $=id=>document.getElementById(id);
const alignments={GOOD:'Добро',EVIL:'Зло',NEUTRAL:'Нейтральная'};
const winners={GOOD_WINS:'Победа добра',EVIL_WINS:'Победа зла',NOT_RECORDED:'Результат не указан'};
// Display aliases only. Machine role IDs are retained unchanged in the downloadable JSON.
const roles={poisoner:'Отравитель',washerwoman:'Прачка',slayer:'Истребитель',recluse:'Затворник',imp:'Бес',empath:'Эмпат',
  fortune_teller:'Гадалка',fortuneteller:'Гадалка',ravenkeeper:'Хранитель воронов',drunk:'Пьяница',chef:'Повар',baron:'Барон',
  professor:'Профессор',zombuul:'Зомбуль',goon:'Головорез',apprentice:'Подмастерье',angel:'Ангел',klutz:'Неуклюжий',
  fanggu:'Фан Гу',philosopher:'Философ',oracle:'Оракул',vigormortis:'Вигормортис',gambler:'Игрок',
  grandmother:'Бабушка',godfather:'Крёстный отец',devilsadvocate:'Адвокат дьявола',moonchild:'Лунное дитя',
  fool:'Шут',sailor:'Матрос',pacifist:'Пацифист',chambermaid:'Горничная',exorcist:'Экзорцист',
  snakecharmer:'Заклинатель змей',witch:'Ведьма',pithag:'Ведьма ямы',sweetheart:'Милочка',
  cerenovus:'Цереновус',dreamer:'Сновидец',artist:'Художник',seamstress:'Швея',sage:'Мудрец',mathematician:'Математик',
  librarian:'Библиотекарь',butler:'Дворецкий',monk:'Монах',undertaker:'Гробовщик',virgin:'Девственница',
  scarletwoman:'Алая женщина',spy:'Шпион',soldier:'Солдат',mayor:'Мэр',investigator:'Следователь'};
const role=value=>roles[value]??value??'—';
const node=(tag,text,className)=>{const el=document.createElement(tag);if(text!=null)el.textContent=String(text);if(className)el.className=className;return el;};
function tag(text,team){return node('span',text,`tag ${team==='GOOD'||team==='GOOD_WINS'?'good':team==='EVIL'||team==='EVIL_WINS'?'evil':'neutral'}`);}
function table(headers,rows){
  const wrap=node('div',null,'table-wrap'),t=node('table'),head=node('thead'),tr=node('tr');
  for(const h of headers){const th=node('th',h);th.scope='col';tr.append(th);}head.append(tr);t.append(head);
  const body=node('tbody');for(const values of rows){const row=node('tr');for(const value of values){const cell=node('td');cell.append(value instanceof Node ? value : node('span',value));row.append(cell);}body.append(row);}t.append(body);wrap.append(t);return wrap;
}
function profileCell(p){const cell=node('span');cell.append(node('span',p.gameNickname));cell.append(node('br'));
  cell.append(node('span',p.publicId?`Профиль: ${p.databaseName}`:'Гость · без привязки',p.publicId?'small':'guest'));return cell;}
function dateLabel(value){const date=new Date(value);return Number.isNaN(date.valueOf())?value:date.toLocaleString('ru-RU',{dateStyle:'short',timeStyle:'short'});}
function gameCard(game){
  const details=node('details',null,'game');details.id=`game-${game.gameId}`;
  const summary=node('summary'),title=node('div',null,'game-title-wrap');
  title.append(node('div',`#${String(game.caseNumber).padStart(2,'0')} · ${game.script.name}`,'game-title'));
  title.append(node('div',`${dateLabel(game.date)} · ${game.participants.length} участников · ${game.snapshots.length} страниц`,'game-subtitle'));
  summary.append(title,tag(winners[game.winner]??game.winner,game.winner));details.append(summary);
  const body=node('div',null,'game-body');body.append(node('p',game.title,'notes'),node('h3','Итоговый состав'));
  body.append(table(['Место','Игрок / профиль','При раздаче','В конце','Команда','Состояние','Голос мёртвого'],game.participants.map(p=>[
    p.order+1,profileCell(p),p.dealtRoleLabel??'—',role(p.finalRoleId)+(p.relatedRoleId?` → ${role(p.relatedRoleId)}`:''),
    tag(alignments[p.finalAlignment]??p.finalAlignment,p.finalAlignment),p.isDead?'Мёртв':'Жив',p.usedGhostVote?'Использован':'Не использован'])));
  if(game.fabled.length || game.demonBluffs.length || game.travelerCountAsExported){
    body.append(node('p',`Путешественников: ${game.travelerCountAsExported}. Легендарные: ${game.fabled.map(role).join(', ')||'—'}. Блефы Демона: ${game.demonBluffs.map(role).join(', ')||'—'}.`,'notes'));
  }
  const controls=node('div',null,'snapshot-control'),label=node('label','Гримуар'),select=node('select');select.setAttribute('aria-label',`Страница гримуара игры ${game.caseNumber}`);
  for(const page of game.snapshots){const option=node('option',`Страница ${page.index+1}`);option.value=String(page.index);select.append(option);}
  select.value=String(game.snapshots.at(-1).index);label.append(select);controls.append(label,node('p','Номера страниц — последовательность сохранённых состояний.','hint'));body.append(controls);
  const snapshot=node('div');body.append(snapshot);
  function renderSnapshot(){const page=game.snapshots.find(p=>p.index===Number(select.value));snapshot.replaceChildren(table(['Место','Игровой ник','Роль / способность','Команда','Состояние','Голос мёртвого','Напоминания'],page.tokens.map(t=>[
    t.order+1,t.player_name,role(t.role_id)+(t.related_role_id?` → ${role(t.related_role_id)}`:''),tag(alignments[t.alignment]??t.alignment,t.alignment),
    t.is_dead?'Мёртв':'Жив',t.used_ghost_vote?'Использован':'Не использован',t.reminders.map(r=>`${r.reminder} (${role(r.role_id)})`).join('; ')||'—'])));}
  select.addEventListener('change',renderSnapshot);renderSnapshot();
  body.append(node('p',`ID игры: ${game.gameId}`,'muted small'));details.append(body);return details;
}
async function init(){
  const response=await fetch('./data/dataset.json');if(!response.ok)throw Error(`HTTP ${response.status}`);
  const data=await response.json();if(data.schemaVersion!==1 || !data.isTest || !Array.isArray(data.games))throw Error('Неподдерживаемый формат');
  const stats=summarize(data);
  for(const [count,label] of [[stats.gameCount,'тестовых игр'],[data.players.length,'профилей в базе'],[stats.identified,'участий с профилем'],[stats.snapshots,'страниц гримуара']]){
    const box=node('div',null,'metric');box.append(node('strong',count),node('span',label));$('overview').append(box);}
  $('results').textContent=`Добро: ${stats.good} побед · Зло: ${stats.evil} побед · Без результата: ${stats.unknown} · Всего участий: ${stats.totalParticipants}, из них гостей: ${stats.guests}`;
  for(const player of stats.players){
    const row=node('tr'),button=node('button',player.name,'profile-link');button.type='button';button.title=player.publicId;
    button.addEventListener('click',()=>{$('player-filter').value=player.publicId;renderGames();$('games-heading').scrollIntoView({behavior:'smooth'});});
    const name=node('td');name.append(button);row.append(name);
    for(const value of [player.games,player.dead,player.ghostVotes,Object.entries(player.roles).map(([r,n])=>`${role(r)}${n>1?` ×${n}`:''}`).join(', ')||'—'])row.append(node('td',value));
    row.lastChild.className='role-list';$('players').append(row);
    const option=node('option',player.name);option.value=player.publicId;$('player-filter').append(option);
  }
  for(const script of [...new Set(data.games.map(g=>g.script.name))]){const option=node('option',script);option.value=script;$('script-filter').append(option);}
  function renderGames(){const games=filterGames(data.games,$('script-filter').value,$('player-filter').value);
    $('game-count').textContent=`Показано ${games.length} из ${data.games.length}`;
    $('games').replaceChildren(...(games.length?games.map(gameCard):[node('p','Нет игр с выбранными фильтрами.','empty')]));}
  $('script-filter').addEventListener('change',renderGames);$('player-filter').addEventListener('change',renderGames);
  $('reset').addEventListener('click',()=>{$('script-filter').value='';$('player-filter').value='';renderGames();});
  renderGames();$('updated').textContent=`Выгрузка из Firebase: ${dateLabel(data.generatedAt)}. Обновление страницы выполняется отдельной публикацией.`;
  $('status').hidden=true;$('content').hidden=false;
}
init().catch(error=>{$('status').textContent=`Не удалось загрузить статистику. Обновите страницу или скачайте JSON. ${error.message}`;});
