const params = new URLSearchParams(location.search);
let alt = params.get('alt') === 'hybrid' ? 'hybrid' : 'option3';
let state = ['browse','edit','create','delete','unsaved','empty','max10'].includes(params.get('state')) ? params.get('state') : 'browse';
if (params.get('capture') === '1') document.body.classList.add('capture');

const players = [
  { rank: 'RB1', name: 'Bijan Robinson', meta: 'RB #1 · ATL', sub: 'W6 #2 · 18.7 pts', value: 76, predicted: 82 },
  { rank: 'RB2', name: 'Jahmyr Gibbs', meta: 'RB #2 · DET', sub: 'W6 #5 · 16.9 pts', value: 65, predicted: 68 },
  { rank: 'RB3', name: 'Jaylen Wright', meta: 'RB #7 · MIA', sub: 'W6 #18 · 11.4 pts', value: 58, predicted: 61, moved: true },
  { rank: 'RB4', name: 'Breece Hall', meta: 'RB #3 · NYJ', sub: 'W6 #9 · 14.2 pts', value: 52, predicted: 56 },
  { rank: 'RB5', name: 'Bucky Irving', meta: 'RB #4 · TB', sub: 'W6 #12 · 13.1 pts', value: 46, predicted: 49 },
  { rank: 'RB6', name: 'TreVeyon Henderson', meta: 'RB #5 · NE', sub: 'W6 #16 · 12.0 pts', value: 40, predicted: 44 },
];
const boardNames = ['Zero RB Rescue','Playoff Push','Value Hunter','Late-Season Floor','Opponent Block','Week 6 Aggro','Balanced Core','Upside Bench','No-QB Spend','Final Four'];
const builtIns = ['Max VORP','Weeks-as-Starter','Safe','Aggressive','VoRP'];

const icons = {
  swap: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m7 7-4 4 4 4M3 11h13M17 17l4-4-4-4M21 13H8"/></svg>',
  info: '<svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  edit: '<svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m4 20 4-.8L19 8.2a2.2 2.2 0 0 0-3.1-3.1L4.8 16Z"/><path d="m14.5 6.5 3 3"/></svg>',
  more: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>',
  plus: '<svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
  close: '<svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 6 12 12M18 6 6 18"/></svg>',
  copy: '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3"/></svg>',
  trash: '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13"/></svg>'
};

function setView(nextAlt, nextState) {
  alt = nextAlt || alt;
  state = nextState || state;
  const query = new URLSearchParams(location.search);
  query.set('alt', alt);
  query.set('state', state);
  history.replaceState({}, '', `${location.pathname}?${query}`);
  render();
}

function strategyNav() {
  if (state === 'empty') {
    const tabs = builtIns.map(name => `<button class="strategy-tab">${name}</button>`).join('');
    return `<div class="strategy-wrap"><div class="strategy-rail" id="strategyRail" aria-label="Valuation strategy">${tabs}${alt === 'option3' ? '<button class="strategy-tab new active" data-open-create>＋ New custom</button>' : '<button class="strategy-tab custom active">Custom</button>'}</div></div>`;
  }
  if (alt === 'hybrid') {
    return `<div class="strategy-wrap"><div class="strategy-rail" id="strategyRail" aria-label="Valuation strategy">
      ${builtIns.map(name => `<button class="strategy-tab">${name}</button>`).join('')}
      <button class="strategy-tab custom active" aria-current="page">Custom</button>
    </div></div>
    ${state === 'max10' ? '' : `<div class="board-bar">
      <div class="field"><label for="boardSelect">Custom board</label><select class="select" id="boardSelect" aria-label="Custom board"><option>Zero RB Rescue · last used</option><option>Playoff Push</option><option>Value Hunter</option><option>Late-Season Floor</option></select></div>
      <button class="action compact" data-open-create>${icons.plus}<span class="button-label">New</span></button>
      <button class="icon-btn" data-open-delete aria-label="Manage Zero RB Rescue">${icons.more}</button>
    </div>`}`;
  }
  const optionBoards = state === 'max10' ? boardNames : ['Zero RB Rescue','Playoff Push','Value Hunter'];
  return `<div class="strategy-wrap"><div class="strategy-rail" id="strategyRail" aria-label="Valuation strategy">
    ${builtIns.map(name => `<button class="strategy-tab">${name}</button>`).join('')}
    ${optionBoards.map((name, i) => `<button class="strategy-tab custom ${i === 0 ? 'active' : ''}" ${i === 0 ? 'aria-current="page"' : ''}>${name}</button>`).join('')}
    <button class="strategy-tab new" ${state === 'max10' ? 'disabled aria-disabled="true" title="10-board limit reached"' : 'data-open-create'}>＋ New</button>
  </div></div>
  <div class="overflow-cue"><span>← 5 built-in strategies</span><strong>${optionBoards.length} named custom ${optionBoards.length === 1 ? 'board' : 'boards'} · horizontal scroll</strong><span>→</span></div>`;
}

function boardIdentity() {
  if (state === 'empty' || state === 'max10') return '';
  const unsaved = state === 'edit' || state === 'unsaved';
  return `<section class="board-identity" aria-label="Selected custom board">
    <div><strong>Zero RB Rescue</strong><div class="board-formula">FantasyCalc · max($0, 3 × Max VORP − $30) · frozen W6</div>${unsaved ? '<div class="unsaved-pill">Unsaved changes</div>' : ''}</div>
    <span class="board-count">${alt === 'option3' ? 'custom tab' : '4 / 10'}</span>
  </section>`;
}

function positionAndEdit() {
  const editing = state === 'edit' || state === 'unsaved';
  return `<div class="position-row">
    <div class="position-tabs" aria-label="Position filter">${['ALL','QB','RB','WR','TE'].map(p => `<button class="position-tab ${p === 'RB' ? 'active' : ''}">${p}</button>`).join('')}</div>
    <div class="edit-actions">
      ${editing ? '<button class="action compact quiet" data-state="unsaved">Cancel</button><button class="action compact primary" data-state="browse">✓ <span class="text-label">Save</span></button>' : `<button class="action compact" data-state="edit">${icons.edit}<span class="text-label">Edit values</span></button>`}
    </div>
  </div>`;
}

function conceptKey() {
  return `<div class="concept-key" aria-label="Value definitions">
    <div class="key-item custom-value"><span>Your custom value</span><strong>$58</strong></div>
    <div class="key-item market"><span>Predicted winning bid</span><strong>$61</strong></div>
    <div class="key-item rank"><span>Source-relative rank</span><strong>RB #7</strong></div>
  </div>`;
}

function playerCard(player, index) {
  const editing = state === 'edit' || state === 'unsaved';
  const moved = editing && player.moved;
  const editable = editing && index === 2;
  return `<article class="player-card ${moved ? 'moved' : ''}">
    ${editing ? `<div class="reorder-tools" aria-label="Reorder ${player.name}"><button title="Move up one value slot" aria-label="Move ${player.name} up one value slot">↑</button><button title="Move down one value slot" aria-label="Move ${player.name} down one value slot">↓</button></div>` : ''}
    <button class="player-main" aria-label="Open ${player.name} player details">
      <span class="rank-slot">${player.rank}</span>
      <span class="player-copy"><span class="player-name">${player.name}</span><span class="player-meta">${player.meta}</span><span class="player-sub">${player.sub}${editing ? ' · <span class="detail-hint">Details</span>' : ''}</span></span>
    </button>
    <div class="value-panel">
      ${editable ? `<div class="value-editor"><label for="value-${index}">Your value · commit before resort</label><input class="money-input" id="value-${index}" value="$58" inputmode="numeric" aria-label="Custom value for ${player.name}"><button class="commit" aria-label="Commit ${player.name} value">✓</button></div>` : `<div class="value-line"><span>Your value</span><strong>$${player.value}</strong></div><div class="prediction">Predicted bid <span class="mono">$${player.predicted}</span></div>`}
    </div>
  </article>`;
}

function boardContent() {
  if (state === 'empty') {
    return `<section class="empty-state"><div class="empty-icon">＋</div><h2>No custom boards yet</h2><p>Build a durable value board from FantasyCalc, FantasyPros, Sleeper, or a blank slate. Provider-native values stay unchanged.</p><button class="action primary" data-open-create>${icons.plus} Create first board</button></section>`;
  }
  if (state === 'max10') {
    return `<div class="cap-banner"><strong>10-board limit reached.</strong> Duplicate and + New are disabled until a board is deleted. Existing boards remain editable.</div>
      ${alt === 'hybrid' ? `<div class="board-bar"><div class="field"><label for="maxBoardSelect">Custom board · 10 / 10</label><select class="select" id="maxBoardSelect"><option>Zero RB Rescue · last used</option>${boardNames.slice(1).map(n => `<option>${n}</option>`).join('')}</select></div><button class="action compact" disabled>${icons.plus}<span class="button-label">New</span></button><button class="icon-btn" data-open-delete aria-label="Manage custom boards">${icons.more}</button></div>` : ''}
      <div class="cap-grid">${boardNames.map((n,i) => `<div class="board-chip"><span>${n}</span><span>${i === 0 ? 'last used' : `#${i+1}`}</span></div>`).join('')}</div>
      <button class="action danger" data-open-delete>${icons.trash} Manage or delete boards</button>`;
  }
  const editing = state === 'edit' || state === 'unsaved';
  return `${positionAndEdit()}
    ${conceptKey()}
    ${editing ? `<div class="reorder-toast"><strong>Slot-preserving reorder:</strong> Jaylen Wright moved RB7 → RB3 and took RB3's prior <span class="mono">$58</span> slot. Breece Hall, Bucky Irving, and TreVeyon Henderson shifted through the existing <span class="mono">$52 / $46 / $40</span> slots. Drag is optional; arrow controls provide keyboard/mobile parity.</div>` : `<p class="explain">${icons.info}<span>Your custom value controls ordering and the green value only. Player/name opens details, where predicted bidding, completed bids, and Team Impact remain separate.</span></p>`}
    <div class="cards">${(editing && params.get('focus') === 'moved' ? players.slice(2, 6) : players.slice(0, editing ? 5 : 6)).map(player => playerCard(player, players.indexOf(player))).join('')}</div>`;
}

function createDialog() {
  return `<div class="backdrop" role="presentation"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="create-title">
    <header class="dialog-head"><div><h2 id="create-title">Create custom board</h2><p>${alt === 'option3' ? 'This board becomes its own strategy tab.' : 'This board appears in the Custom selector and becomes last used.'}</p></div><button class="icon-btn" data-close aria-label="Close create board dialog">${icons.close}</button></header>
    <div class="dialog-body"><div class="form-grid">
      <div class="field wide"><label for="boardName">Board name</label><input class="input" id="boardName" value="Zero RB Rescue" maxlength="32"></div>
      <div class="field"><label for="rankingSource">Base ranking source</label><select class="select" id="rankingSource"><option>FantasyCalc</option><option>FantasyPros</option><option>Sleeper ROS</option><option>Blank board</option></select></div>
      <div class="field"><label for="baseStrategy">Base strategy</label><select class="select" id="baseStrategy"><option>Max VORP</option><option>Weeks-as-Starter</option><option>Safe</option><option>Aggressive</option><option>VoRP</option></select></div>
      <div class="field"><label for="multiplier">Multiplier</label><input class="input mono" id="multiplier" value="3.0×" inputmode="decimal"></div>
      <div class="field"><label for="adjustment">Adjustment</label><input class="input mono" id="adjustment" value="− $30" inputmode="decimal"></div>
      <div class="field wide"><span class="field-label">Minimum value</span><div class="toggle-field"><span>Floor every result at <strong class="mono">$0</strong></span><span class="switch" role="switch" aria-checked="true" aria-label="Zero dollar floor enabled"></span></div></div>
    </div>
    <div class="preview"><div class="preview-title">Live preview</div><div class="formula">max($0, 3 × Max VORP − $30)</div><div class="preview-example">Example: a player with Max VORP <span class="mono">$28</span> becomes <strong class="mono">$54</strong>. Negative results stop at <strong class="mono">$0</strong>. Creates a frozen Week 6 snapshot; later rebases require review.</div></div></div>
    <footer class="dialog-foot"><span class="label">1 of 10 boards</span><div class="dialog-foot-right"><button class="action quiet" data-close>Cancel</button><button class="action primary" data-close>Create board</button></div></footer>
  </section></div>`;
}

function deleteDialog() {
  return `<div class="backdrop"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="manage-title">
    <header class="dialog-head"><div><h2 id="manage-title">Manage board</h2><p>Zero RB Rescue · frozen Week 6 snapshot</p></div><button class="icon-btn" data-close aria-label="Close manage board dialog">${icons.close}</button></header>
    <div class="dialog-body">
      <div class="manage-list">
        <div class="manage-row"><span aria-hidden="true">✎</span><div class="manage-copy"><strong>Rename board</strong><span>Change identity without changing values</span></div><button class="action compact">Rename</button></div>
        <div class="manage-row"><span aria-hidden="true">${icons.copy}</span><div class="manage-copy"><strong>Duplicate</strong><span>Creates a separate frozen copy · 5 / 10</span></div><button class="action compact">Duplicate</button></div>
      </div>
      <div class="delete-box" style="margin-top:12px"><strong>Delete “Zero RB Rescue”?</strong><p>This permanently removes its custom values and manual ordering. Built-in rankings, predicted bids, bidding history, and Team Impact are not affected.</p></div>
    </div>
    <footer class="dialog-foot"><button class="action quiet" data-close>Keep board</button><div class="dialog-foot-right"><button class="action danger" data-close>${icons.trash} Delete board</button></div></footer>
  </section></div>`;
}

function unsavedDialog() {
  return `<div class="backdrop"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="unsaved-title">
    <header class="dialog-head"><div><h2 id="unsaved-title">Unsaved changes</h2><p>Zero RB Rescue has 2 value edits and 1 reorder.</p></div><button class="icon-btn" data-close aria-label="Close unsaved changes dialog">${icons.close}</button></header>
    <div class="dialog-body"><div class="warning"><span aria-hidden="true">⚠</span><span>Leaving now would discard your changes. Save keeps the committed values and slot order; continue editing returns to the board.</span></div></div>
    <footer class="dialog-foot"><button class="action danger" data-state="browse">Discard</button><div class="dialog-foot-right"><button class="action quiet" data-close>Continue editing</button><button class="action primary" data-state="browse">Save changes</button></div></footer>
  </section></div>`;
}

function app() {
  return `<div class="app-shell">
    <header class="topbar"><button class="league" aria-label="Switch league"><span class="league-name">Cascade Guillotine</span><span class="season">2026</span></button><button class="icon-btn" aria-label="Switch league">${icons.swap}</button></header>
    <main>
      <h1 class="page-title">Waivers</h1><p class="league-meta">Budget $1,000 · Your FAAB remaining $614 · 22 teams left · ~10 wks to final</p>
      <div class="controls-row"><div class="field"><label for="source">Player values</label><select id="source" class="select source-select"><option>FantasyCalc · redraft</option><option>FantasyPros · ROS</option><option>Sleeper ROS</option></select></div>${state !== 'empty' && state !== 'max10' ? '<button class="action compact" data-open-delete>'+icons.more+' <span class="button-label">Board</span></button>' : ''}</div>
      ${strategyNav()}
      ${boardIdentity()}
      ${boardContent()}
    </main>
    <nav class="bottom-nav" aria-label="Main navigation"><div class="bottom-inner"><button class="nav-item"><span class="nav-icon">⌖</span>Hub</button><button class="nav-item active"><span class="nav-icon">▱</span>Waivers</button><button class="nav-item"><span class="nav-icon">♕</span>League</button><button class="nav-item"><span class="nav-icon">♟</span>Teams</button></div></nav>
    ${state === 'create' ? createDialog() : state === 'delete' ? deleteDialog() : state === 'unsaved' ? unsavedDialog() : ''}
  </div>`;
}

function render() {
  document.querySelectorAll('[data-alt]').forEach(btn => btn.classList.toggle('active', btn.dataset.alt === alt));
  const picker = document.getElementById('statePicker');
  if (picker) picker.value = state;
  const notes = document.getElementById('reviewNotes');
  if (notes) notes.innerHTML = alt === 'option3'
    ? '<strong>Option 3:</strong> every named board is a peer strategy tab. Direct identity, but the current five built-ins plus up to ten custom boards force horizontal discovery.'
    : '<strong>Hybrid:</strong> one stable Custom strategy tab; board identity stays visible in a selector beneath it. Scales cleanly while adding one selection step.';
  document.getElementById('prototype').innerHTML = app();
  bind();
  requestAnimationFrame(() => {
    const rail = document.getElementById('strategyRail');
    const active = rail?.querySelector('.active');
    if (rail && active) rail.scrollLeft = Math.max(0, active.offsetLeft - (rail.clientWidth - active.clientWidth) / 2);
  });
}

function bind() {
  document.querySelectorAll('[data-state]').forEach(el => el.addEventListener('click', () => setView(null, el.dataset.state)));
  document.querySelectorAll('[data-open-create]').forEach(el => el.addEventListener('click', () => setView(null, 'create')));
  document.querySelectorAll('[data-open-delete]').forEach(el => el.addEventListener('click', () => setView(null, 'delete')));
  document.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', () => setView(null, state === 'unsaved' ? 'edit' : 'browse')));
  document.querySelectorAll('.backdrop').forEach(el => el.addEventListener('click', event => { if (event.target === el) setView(null, state === 'unsaved' ? 'edit' : 'browse'); }));
}

document.querySelectorAll('[data-alt]').forEach(btn => btn.addEventListener('click', () => setView(btn.dataset.alt, null)));
document.getElementById('statePicker').addEventListener('change', e => setView(null, e.target.value));
document.addEventListener('keydown', e => { if (e.key === 'Escape' && ['create','delete','unsaved'].includes(state)) setView(null, state === 'unsaved' ? 'edit' : 'browse'); });
render();
