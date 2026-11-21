import { baseRoleId } from './scenarios.mjs?v=2';

const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
let labelId=0;
function curvedLabel(name){
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
  svg.setAttribute('viewBox','0 0 150 150');svg.classList.add('token-label');svg.setAttribute('aria-label',name);
  const path=document.createElementNS(ns,'path'),id=`role-curve-${++labelId}`;
  path.id=id;path.setAttribute('d','M 17 78 A 58 58 0 0 0 133 78');path.setAttribute('fill','none');
  const text=document.createElementNS(ns,'text'),tp=document.createElementNS(ns,'textPath');
  tp.setAttribute('href',`#${id}`);tp.setAttribute('startOffset','50%');tp.setAttribute('text-anchor','middle');
  if(name.length>16){tp.setAttribute('textLength','150');tp.setAttribute('lengthAdjust','spacingAndGlyphs');}tp.textContent=name;
  text.append(tp);svg.append(path,text);return svg;
}
export function roleArt(id, label, character) {
  const box=el('span','role-art'),fallback=el('span','art-fallback',String(label||'?').slice(0,2));
  const slug = baseRoleId(character?.id ?? id);
  const local = /^[a-z0-9]+$/.test(slug) && character?.id !== '_root'
    ? `./assets/roles/${slug}.webp`
    : null;
  const remote = typeof character?.image === 'string' && /^https:\/\/(botc\.1nv\.is|bloodstar\.clocktica\.com)\//.test(character.image)
    ? character.image
    : null;
  const sources = [local, remote].filter(Boolean);
  box.append(fallback);
  if (!sources.length) return box;
  const img = el('img');
  img.alt = '';
  img.loading = 'lazy';
  img.referrerPolicy = 'no-referrer';
  img.onerror = () => {
    if (sources.length) img.src = sources.shift();
    else {
      img.remove();
      fallback.hidden = false;
    }
  };
  fallback.hidden = true;
  img.src = sources.shift();
  box.append(img);
  return box;
}
export function renderGrimoire(page, role, characterFor) {
  const art = (id, name) => roleArt(id, name, characterFor(id));
  const wrap=el('div','grimoire-view'),board=el('div','grim-board grim-board-orbit');
  const tokens=[...page.tokens].sort((a,b)=>a.order-b.order),n=tokens.length;
  board.style.setProperty('--seat-count',n);
  const center=el('div','grim-center');center.append(el('span','grim-page-number',String(page.index+1)),el('span','','Страница гримуара'));board.append(center);
  tokens.forEach((t,i)=>{
    const seat=el('article','grim-seat');const angle=-Math.PI/2+2*Math.PI*i/n;
    seat.style.setProperty('--x', `${50 + 39 * Math.cos(angle)}%`);
    seat.style.setProperty('--orbit-y', `${331 * Math.sin(angle)}px`);
    const team=t.alignment==='GOOD'?'good':t.alignment==='EVIL'?'evil':'neutral';
    const face=el('div',`role-token team-${team}${t.is_dead?' is-dead':''}`);
    face.append(art(t.role_id,role(t.role_id)),curvedLabel(String(role(t.role_id))));
    const ability = characterFor(t.role_id)?.ability;
    if (ability) face.title = ability;
    if(t.is_dead){const shroud=el('img','token-shroud');shroud.src='./assets/tokens/shroud.png';shroud.alt='Мёртв';face.append(shroud);}
    if(t.related_role_id){const related=el('span','related-token');related.title=`Связанная роль: ${role(t.related_role_id)}`;related.append(art(t.related_role_id,role(t.related_role_id)));face.append(related);}
    const name=el('div','seat-name',t.player_name||'Без имени');name.prepend(el('span','seat-order',String(t.order+1)));
    seat.append(face,name);
    if(t.used_ghost_vote)seat.append(el('span','ghost-status','Голос использован'));
    const reminders=el('div','seat-reminders');
    for (const reminder of t.reminders || []) {
      const badge = el('button', 'reminder-badge');
      badge.type = 'button';
      const roleName = role(reminder.role_id);
      const fullText = reminder.role_id ? `${roleName}: ${reminder.reminder}` : reminder.reminder;
      const label = el('span', '', reminder.reminder);
      badge.title = fullText;
      badge.setAttribute('aria-label', fullText);
      badge.setAttribute('aria-expanded', 'false');
      badge.append(art(reminder.role_id, roleName), label);
      badge.onclick = () => {
        const expanded = badge.classList.toggle('expanded');
        badge.setAttribute('aria-expanded', String(expanded));
        label.textContent = expanded ? fullText : reminder.reminder;
      };
      reminders.append(badge);
    }
    seat.append(reminders);board.append(seat);
  });
  const legend=el('p','grim-legend','Синий ободок — добро · красный — зло · саван — мёртв. Нажми на напоминание, чтобы увидеть его роль и полный текст.');
  wrap.append(board,legend);return wrap;
}
