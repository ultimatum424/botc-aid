export function summarize(dataset) {
  const players=dataset.players.map(profile=>{
    const appearances=dataset.games.flatMap(game=>game.participants.filter(p=>p.publicId===profile.publicId));
    const roles={};for(const p of appearances) roles[p.finalRoleId]=(roles[p.finalRoleId]??0)+1;
    return {...profile,games:appearances.length,dead:appearances.filter(p=>p.isDead).length,
      ghostVotes:appearances.filter(p=>p.usedGhostVote).length,roles};
  });
  const participants=dataset.games.flatMap(g=>g.participants);
  return {players,gameCount:dataset.games.length,snapshots:dataset.games.reduce((n,g)=>n+g.snapshots.length,0),
    identified:participants.filter(p=>p.publicId!==null).length,guests:participants.filter(p=>p.publicId===null).length,
    totalParticipants:participants.length,good:dataset.games.filter(g=>g.winner==='GOOD_WINS').length,
    evil:dataset.games.filter(g=>g.winner==='EVIL_WINS').length,unknown:dataset.games.filter(g=>g.winner==='NOT_RECORDED').length};
}
export function filterGames(games,script='',publicId='') {
  return games.filter(game=>(!script || game.script.name===script) &&
    (!publicId || game.participants.some(p=>p.publicId===publicId)));
}
