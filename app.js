import {summarize,filterGames} from './model.mjs';
import {renderGrimoire} from './grimoire.mjs?v=6';

const $=id=>document.getElementById(id);
const alignments={GOOD:'Добро',EVIL:'Зло',NEUTRAL:'Нейтральная'};
const winners={GOOD_WINS:'Победа добра',EVIL_WINS:'Победа зла',NOT_RECORDED:'Результат не указан'};
// Display aliases only. Machine role IDs in the generated dataset stay unchanged.
const roles={poisoner:'Отравитель',washerwoman:'Прачка',slayer:'Истребитель',recluse:'Затворник',imp:'Бес',empath:'Эмпат',
  fortune_teller:'Гадалка',fortuneteller:'Гадалка',ravenkeeper:'Хранитель воронов',drunk:'Пьяница',chef:'Повар',baron:'Барон',
  professor:'Профессор',zombuul:'Зомбуль',goon:'Головорез',apprentice:'Подмастерье',angel:'Ангел',klutz:'Неуклюжий',
  fanggu:'Фан Гу',philosopher:'Философ',oracle:'Оракул',vigormortis:'Вигормортис',gambler:'Азартный Игрок',gossip:'Сплетница',
  grandmother:'Бабушка',godfather:'Крёстный отец',devilsadvocate:'Адвокат дьявола',moonchild:'Лунное дитя',
  fool:'Шут',sailor:'Матрос',pacifist:'Пацифист',chambermaid:'Горничная',exorcist:'Экзорцист',
  snakecharmer:'Заклинатель змей',witch:'Ведьма',pithag:'Ведьма ямы',sweetheart:'Милочка',
  cerenovus:'Цереновус',dreamer:'Сновидец',artist:'Художник',seamstress:'Швея',sage:'Мудрец',mathematician:'Математик',
  librarian:'Библиотекарь',butler:'Дворецкий',monk:'Монах',undertaker:'Гробовщик',virgin:'Девственница',
  scarletwoman:'Алая женщина',spy:'Шпион',soldier:'Солдат',mayor:'Мэр',investigator:'Следователь',
  juggler:'Жонглёр',courtier:'Придворный',assassin:'Ассасин',flowergirl:'Цветочница',innkeeper:'Трактирщик',
  mastermind:'Кукловод',mutant:'Мутант',nodashii:'Но Даши',pukka:'Пукка',savant:'Учёный',shabaloth:'Шабалот',tinker:'Лудильщик',towncrier:'Глашатай'};
const role=value=>roles[value]??roles[String(value??'').toLowerCase().replace(/[\s_'’\-]+/g,'')]??value??'—';
const node=(tag,text,className)=>{const el=document.createElement(tag);if(text!=null)el.textContent=String(text);if(className)el.className=className;return el;};
function tag(text,team){return node('span',text,`tag ${team==='GOOD'||team==='GOOD_WINS'?'good':team==='EVIL'||team==='EVIL_WINS'?'evil':'neutral'}`);}
function table(headers,rows){
  const wrap=node('div',null,'table-wrap'),t=node('table'),head=node('thead'),tr=node('tr');
  for(const h of headers){const th=node('th',h);th.scope='col';tr.append(th);}head.append(tr);t.append(head);
  const body=node('tbody');for(const values of rows){const row=node('tr');for(const value of values){const cell=node('td');cell.append(value instanceof Node ? value : node('span',value));row.append(cell);}body.append(row);}t.append(body);wrap.append(t);return wrap;
}
function profileCell(p){const cell=node('span');cell.append(node('span',p.gameNickname));cell.append(node('br'));
  cell.append(node('span',p.publicId?`Профиль: ${p.databaseName}`:'Гость · без привязки',p.publicId?'small':'guest'));return cell;}
function roleChain(p){
  const chain=node('div',null,'role-chain');
  const entries=[{name:role(p.dealtRoleLabel),title:'При раздаче'},
    {name:role(p.finalRoleId),title:'В конце'},
    ...(p.relatedRoleId?[{name:role(p.relatedRoleId),title:'Связанная роль / способность'}]:[])];
  const unique=entries.filter((entry,i)=>i===0||entry.name.toLowerCase()!==entries[i-1].name.toLowerCase());
  unique.forEach((entry,i)=>{if(i){const arrow=node('span','→','role-arrow');arrow.setAttribute('aria-hidden','true');chain.append(arrow);}const pill=tag(entry.name,p.finalAlignment);pill.title=entry.title;chain.append(pill);});
  chain.setAttribute('aria-label',unique.map(e=>`${e.title}: ${e.name}`).join(' → '));return chain;
}
function dateLabel(value){const date=new Date(value);return Number.isNaN(date.valueOf())?value:date.toLocaleDateString('ru-RU',{dateStyle:'medium'});}
function countLabel(value,one,few,many){const n=Math.abs(value)%100,last=n%10;return `${value} ${n>10&&n<20?many:last===1?one:last>1&&last<5?few:many}`;}
function gameCard(game){
  const details=node('details',null,'game');details.id=`game-${game.gameId}`;
  const summary=node('summary'),title=node('div',null,'game-title-wrap');
  title.append(node('div',`${dateLabel(game.date)} · ${game.script.name}`,'game-title'));
  title.append(node('div',`${countLabel(game.participants.length,'игрок','игрока','игроков')} · ${countLabel(game.snapshots.length,'страница гримуара','страницы гримуара','страниц гримуара')}`,'game-subtitle'));
  summary.append(title,tag(winners[game.winner]??game.winner,game.winner));details.append(summary);
  const body=node('div',null,'game-body');if(game.title)body.append(node('p',game.title,'notes'));body.append(node('h3','Итоговый состав'));
  const roster=table(['Место','Игрок / профиль','Роли'],game.participants.map(p=>[
    p.order+1,profileCell(p),roleChain(p)]));roster.classList.add('roster-table');body.append(roster);
  if(game.fabled.length || game.demonBluffs.length || game.travelerCountAsExported){
    body.append(node('p',`Путешественников: ${game.travelerCountAsExported}. Легендарные: ${game.fabled.map(role).join(', ')||'—'}. Блефы Демона: ${game.demonBluffs.map(role).join(', ')||'—'}.`,'notes'));
  }
  const controls=node('div',null,'snapshot-control'),label=node('label','Гримуар'),select=node('select');select.setAttribute('aria-label',`Страница гримуара игры ${game.caseNumber}`);
  for(const page of game.snapshots){const option=node('option',`Страница ${page.index+1}`);option.value=String(page.index);select.append(option);}
  select.value=String(game.snapshots.at(-1).index);label.append(select);controls.append(label,node('p','Номера страниц — последовательность сохранённых состояний.','hint'));body.append(controls);
  const modes=node('div',null,'grim-modes');let visual=true;
  const tokensButton=node('button','Жетоны','button'),tableButton=node('button','Таблица','button');
  tokensButton.type=tableButton.type='button';modes.append(tokensButton,tableButton);controls.append(modes);
  const snapshot=node('div');body.append(snapshot);
  tokensButton.onclick=()=>{visual=true;renderSnapshot();};tableButton.onclick=()=>{visual=false;renderSnapshot();};
  function renderSnapshot(){const page=game.snapshots.find(p=>p.index===Number(select.value));
    tokensButton.setAttribute('aria-pressed',String(visual));tableButton.setAttribute('aria-pressed',String(!visual));
    if(visual){snapshot.replaceChildren(renderGrimoire(page,role));return;}
    snapshot.replaceChildren(table(['Место','Игровой ник','Роль / способность','Команда','Состояние','Голос мёртвого','Напоминания'],page.tokens.map(t=>[
    t.order+1,t.player_name,role(t.role_id)+(t.related_role_id?` → ${role(t.related_role_id)}`:''),tag(alignments[t.alignment]??t.alignment,t.alignment),
    t.is_dead?'Мёртв':'Жив',t.used_ghost_vote?'Использован':'Не использован',t.reminders.map(r=>`${r.reminder} (${role(r.role_id)})`).join('; ')||'—'])));}
  select.addEventListener('change',renderSnapshot);renderSnapshot();
  body.append(node('p',`ID игры: ${game.gameId}`,'muted small'));details.append(body);return details;
}
let currentData=null,currentHash=null,loading=false,explicitType=false,activeTab='games';
function setActiveTab(name,{focus=false}={}){
  activeTab=name==='players'?'players':'games';
  for(const tabName of ['games','players']){
    const selected=tabName===activeTab,tab=$(`${tabName}-tab`),panel=$(`${tabName}-panel`);
    tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;panel.hidden=!selected;
  }
  if(focus)$(`${activeTab}-tab`).focus();
}
for(const tabName of ['games','players']){
  $(`${tabName}-tab`).addEventListener('click',()=>setActiveTab(tabName));
  $(`${tabName}-tab`).addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();
    const next=event.key==='Home'?'games':event.key==='End'?'players':tabName==='games'?'players':'games';
    setActiveTab(next,{focus:true});
  });
}
function renderPage(dataset){
  const oldScript=$('script-filter').value,oldPlayer=$('player-filter').value;
  if(!explicitType)$('type-filter').value=dataset.games.some(g=>!g.isTest)?'real':'test';
  const mode=$('type-filter').value;
  const data={...dataset,games:dataset.games.filter(g=>mode==='all' || (mode==='test')===g.isTest)};
  $('test-notice').hidden=!data.games.some(g=>g.isTest);
  const stats=summarize(data);
  $('players').replaceChildren();
  $('script-filter').replaceChildren(node('option','Все сценарии'));$('script-filter').firstChild.value='';
  $('player-filter').replaceChildren(node('option','Все игроки и гости'));$('player-filter').firstChild.value='';
  for(const player of stats.players){
    const row=node('tr'),button=node('button',player.name,'profile-link');button.type='button';button.title=player.publicId;
    button.addEventListener('click',()=>{$('player-filter').value=player.publicId;renderGames();setActiveTab('games');$('games-heading').scrollIntoView({behavior:'smooth'});});
    const name=node('td');name.append(button);row.append(name);
    for(const value of [player.games,player.dead,player.ghostVotes,Object.entries(player.roles).map(([r,n])=>`${role(r)}${n>1?` ×${n}`:''}`).join(', ')||'—'])row.append(node('td',value));
    row.lastChild.className='role-list';$('players').append(row);
    const option=node('option',player.name);option.value=player.publicId;$('player-filter').append(option);
  }
  for(const script of [...new Set(data.games.map(g=>g.script.name))]){const option=node('option',script);option.value=script;$('script-filter').append(option);}
  if([...$('script-filter').options].some(o=>o.value===oldScript))$('script-filter').value=oldScript;
  if([...$('player-filter').options].some(o=>o.value===oldPlayer))$('player-filter').value=oldPlayer;
  function renderGames(){const games=filterGames(data.games,$('script-filter').value,$('player-filter').value);
    $('game-count').textContent=`Показано ${games.length} из ${data.games.length}`;
    $('games').replaceChildren(...(games.length?games.map(gameCard):[node('p','Нет игр с выбранными фильтрами.','empty')]));}
  $('script-filter').onchange=renderGames;$('player-filter').onchange=renderGames;
  $('reset').onclick=()=>{$('script-filter').value='';$('player-filter').value='';renderGames();};
  renderGames();setActiveTab(activeTab);$('updated').textContent=`Данные от ${dateLabel(data.generatedAt)}`;
  $('status').hidden=true;$('content').hidden=false;
}
async function load(){
  if(loading)return;loading=true;
  try {
    const response=await fetch(`./data/version.json?t=${Date.now()}`,{cache:'no-store',signal:AbortSignal.timeout(15_000)});
    let version=null;
    if(response.ok){version=await response.json();if(!/^[0-9a-f]{64}$/.test(version.sha256))throw Error('Invalid version');}
    else if(response.status!==404)throw Error('Version unavailable');
    if(version && version.sha256===currentHash){$('status').hidden=true;return;}
    const json=await fetch(`./data/dataset.json?v=${version?.sha256??Date.now()}`,{cache:'no-store',signal:AbortSignal.timeout(15_000)});
    if(!json.ok)throw Error('Dataset unavailable');
    const bytes=await json.arrayBuffer();
    if(version){const digest=await crypto.subtle.digest('SHA-256',bytes);const actual=[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');if(actual!==version.sha256)throw Error('Dataset changed');}
    const data=JSON.parse(new TextDecoder().decode(bytes));
    if(data.schemaVersion!==1 || !Array.isArray(data.games) || !Array.isArray(data.players))throw Error('Invalid dataset');
    currentData=data;currentHash=version?.sha256??null;renderPage(data);
    $('content').dataset.revision=String(data.publicationRevision??0);
    $('content').dataset.sha256=currentHash??'';
    $('content').querySelectorAll('details.game').forEach(card=>{if(card.id===location.hash.slice(1))card.open=true;});
  } catch {
    $('status').hidden=false;$('status').textContent=currentData?'Не удалось обновить данные. Показана предыдущая версия; повторим автоматически.':'Не удалось загрузить статистику. Повторим автоматически; можно обновить страницу.';
  } finally {loading=false;}
}
$('type-filter').addEventListener('change',()=>{explicitType=true;if(currentData)renderPage(currentData);});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')load();});
window.addEventListener('focus',load);
setInterval(()=>{if(document.visibilityState==='visible')load();},60_000);
load();
