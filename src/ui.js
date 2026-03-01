import * as state from './state.js';
import { computeAll } from './calc.js';

function app() {
  return window.app;
}

function el(tag, attrs, ...children) {
  const e = document.createElement(tag);
  if (attrs && typeof attrs === 'object' && !attrs.nodeType) {
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'className') e.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k === 'style' && typeof v === 'string') e.setAttribute('style', v);
      else if (k === 'dataset') Object.assign(e.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k !== 'key' && v != null && v !== false) e.setAttribute(k, v === true ? '' : String(v));
    });
  } else if (attrs != null) {
    children = [attrs, ...children];
  }
  children.flat().forEach((c) => {
    if (c == null) return;
    if (typeof c === 'string' || typeof c === 'number') e.appendChild(document.createTextNode(c));
    else e.appendChild(c);
  });
  return e;
}

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function renderHome() {
  const sessions = state.getSessions();
  return el('div', { className: 'view view-home' },
    el('h1', {}, 'Répartition des frais – Cadeaux'),
    el('div', { className: 'toolbar' },
      el('button', { type: 'button', className: 'btn btn-primary', onClick: () => app().createSession() }, 'Nouvelle session'),
      el('button', { type: 'button', className: 'btn', onClick: () => app().exportAll() }, 'Exporter tout'),
      el('label', { className: 'btn btn-import' },
        'Importer',
        el('input', { type: 'file', accept: '.json', style: 'display:none', onChange: (ev) => { app().importFile(ev.target.files?.[0]); ev.target.value = ''; } })
      )
    ),
    sessions.length === 0
      ? el('p', { className: 'empty' }, 'Aucune session. Créez-en une.')
      : el('ul', { className: 'session-list' },
          sessions.map((s) =>
            el('li', { key: s.id, className: 'session-item', dataset: { sessionId: s.id } },
              el('div', { className: 'session-info' },
                el('span', { className: 'session-name' }, s.nom),
                el('span', { className: 'session-meta' },
                  formatDate(s.updatedAt ?? s.createdAt),
                  ' · ',
                  s.participants.length,
                  ' participant(s) · ',
                  s.cadeaux.length,
                  ' cadeau(x)'
                )
              ),
              el('div', { className: 'session-actions' },
                el('button', { type: 'button', className: 'btn btn-sm', onClick: () => app().exportOne(s) }, 'Exporter'),
                el('button', { type: 'button', className: 'btn btn-sm', onClick: () => app().openSession(s.id) }, 'Ouvrir'),
                el('button', { type: 'button', className: 'btn btn-sm btn-danger', onClick: () => app().deleteSession(s.id) }, 'Supprimer')
              )
            )
          )
        )
  );
}

function renderSessionDetail() {
  const session = state.getCurrentSession();
  if (!session) return renderHome();

  const activeTab = window._activeTab ?? 'participants';
  const setTab = (t) => { window._activeTab = t; render(); };

  const tabs = el('div', { className: 'tabs' },
    el('button', { type: 'button', className: 'tab' + (activeTab === 'participants' ? ' active' : ''), onClick: () => setTab('participants') }, 'Participants'),
    el('button', { type: 'button', className: 'tab' + (activeTab === 'cadeaux' ? ' active' : ''), onClick: () => setTab('cadeaux') }, 'Cadeaux'),
    el('button', { type: 'button', className: 'tab' + (activeTab === 'resultats' ? ' active' : ''), onClick: () => setTab('resultats') }, 'Résultats')
  );

  const header = el('div', { className: 'session-header' },
    el('button', { type: 'button', className: 'btn btn-back', onClick: () => app().backToList() }, '← Liste'),
    el('input', {
      type: 'text',
      className: 'session-title',
      value: session.nom,
      onInput: (ev) => app().updateSessionName(session.id, ev.target.value),
      onBlur: (ev) => app().updateSessionName(session.id, ev.target.value),
    })
  );

  let content;
  if (activeTab === 'participants') content = renderParticipants(session);
  else if (activeTab === 'cadeaux') content = renderCadeaux(session);
  else content = renderResultats(session);

  return el('div', { className: 'view view-session' },
    header,
    tabs,
    content
  );
}

function renderParticipants(session) {
  const participants = session.participants;
  const input = el('input', { type: 'text', placeholder: 'Nom du participant', className: 'input-name' });
  const add = () => {
    const nom = input.value.trim();
    if (!nom) return;
    app().addParticipant(session.id, nom);
    input.value = '';
  };
  return el('div', { className: 'panel panel-participants' },
    el('div', { className: 'add-row' },
      input,
      el('button', { type: 'button', className: 'btn btn-primary', onClick: add }, 'Ajouter')
    ),
    participants.length === 0
      ? el('p', { className: 'empty' }, 'Aucun participant.')
      : el('ul', { className: 'participant-list' },
          participants.map((p) => {
            const span = el('span', { className: 'participant-name' }, p.nom);
            const inputEdit = el('input', { type: 'text', value: p.nom, className: 'input-edit' });
            inputEdit.style.display = 'none';
            let editing = false;
            const showEdit = () => {
              editing = true;
              span.style.display = 'none';
              inputEdit.style.display = 'inline';
              inputEdit.value = p.nom;
              inputEdit.focus();
            };
            const hideEdit = () => {
              editing = false;
              span.style.display = '';
              inputEdit.style.display = 'none';
              const nom = inputEdit.value.trim();
              if (nom) app().updateParticipant(session.id, p.id, nom);
            };
            inputEdit.onblur = hideEdit;
            inputEdit.onkeydown = (ev) => { if (ev.key === 'Enter') hideEdit(); };
            return el('li', { className: 'participant-item', key: p.id },
              el('span', { className: 'participant-cell' }, span, inputEdit),
              el('button', { type: 'button', className: 'btn btn-sm', onClick: showEdit }, 'Modifier'),
              el('button', { type: 'button', className: 'btn btn-sm btn-danger', onClick: () => app().removeParticipant(session.id, p.id) }, 'Supprimer')
            );
          })
        )
  );
}

function renderCadeaux(session) {
  const participants = session.participants;
  const form = el('form', { className: 'cadeau-form', onSubmit: (ev) => { ev.preventDefault(); submitCadeau(); } },
    el('input', { type: 'text', name: 'nom', placeholder: 'Nom du cadeau', className: 'input-name' }),
    el('input', { type: 'number', name: 'montant', placeholder: 'Montant (€)', min: '0.01', step: '0.01', className: 'input-amount' }),
    el('select', { name: 'acheteurId', className: 'select-acheteur' },
      el('option', { value: '' }, '— Qui a payé ? —'),
      ...participants.map((p) => el('option', { value: p.id }, p.nom))
    ),
    el('div', { className: 'contributeurs-wrap' },
      el('label', {}, 'Contributeurs :'),
      el('div', { className: 'contributeurs-checks' },
        ...participants.map((p) =>
          el('label', { className: 'checkbox-label' },
            el('input', { type: 'checkbox', name: 'contributeur', value: p.id, className: 'input-contributeur' }),
            ' ',
            p.nom
          )
        )
      )
    ),
    el('button', { type: 'submit', className: 'btn btn-primary' }, 'Ajouter le cadeau')
  );

  function submitCadeau() {
    const fd = new FormData(form);
    const nom = (fd.get('nom') || '').trim() || 'Cadeau';
    const montant = Number(fd.get('montant'));
    const acheteurId = fd.get('acheteurId');
    const contributeurIds = fd.getAll('contributeur').filter(Boolean);
    if (!acheteurId || contributeurIds.length === 0 || !(montant > 0)) {
      alert('Renseignez montant > 0, acheteur et au moins un contributeur.');
      return;
    }
    app().addCadeau(session.id, { nom, montant, acheteurId, contributeurIds });
    form.reset();
  }

  const list = session.cadeaux.length === 0
    ? el('p', { className: 'empty' }, 'Aucun cadeau.')
    : el('ul', { className: 'cadeau-list' },
        session.cadeaux.map((c) => {
          const acheteur = participants.find((p) => p.id === c.acheteurId);
          const contribNames = c.contributeurIds.map((id) => participants.find((p) => p.id === id)?.nom).filter(Boolean).join(', ');
          return el('li', { className: 'cadeau-item', key: c.id },
            el('div', { className: 'cadeau-info' },
              el('strong', {}, c.nom),
              ' — ',
              c.montant.toFixed(2),
              ' € — payé par ',
              acheteur?.nom ?? '?',
              ' — contributeurs : ',
              contribNames
            ),
            el('div', { className: 'cadeau-actions' },
              el('button', { type: 'button', className: 'btn btn-sm btn-danger', onClick: () => app().removeCadeau(session.id, c.id) }, 'Supprimer')
            )
          );
        })
      );

  return el('div', { className: 'panel panel-cadeaux' },
    form,
    el('h3', {}, 'Liste des cadeaux'),
    list
  );
}

function renderResultats(session) {
  const participants = session.participants;
  const { soldes, dettes } = computeAll(participants, session.cadeaux);

  const soldesList = participants.length === 0
    ? el('p', { className: 'empty' }, 'Ajoutez des participants et des cadeaux.')
    : el('ul', { className: 'soldes-list' },
        participants.map((p) => {
          const solde = soldes.get(p.id) ?? 0;
          const className = 'solde ' + (solde > 0 ? 'creancier' : solde < 0 ? 'debiteur' : 'zero');
          return el('li', { className }, p.nom, ' : ', solde.toFixed(2), ' €');
        })
      );

  const dettesList = dettes.length === 0
    ? el('p', { className: 'empty' }, 'Aucune dette à afficher.')
    : el('ul', { className: 'dettes-list' },
        dettes.map((d) => {
          const from = participants.find((p) => p.id === d.fromId)?.nom ?? d.fromId;
          const to = participants.find((p) => p.id === d.toId)?.nom ?? d.toId;
          return el('li', { className: 'dette-item' }, from, ' doit ', d.montant.toFixed(2), ' € à ', to);
        })
      );

  return el('div', { className: 'panel panel-resultats' },
    el('h3', {}, 'Soldes nets'),
    soldesList,
    el('h3', {}, 'Qui doit à qui'),
    dettesList
  );
}

export function render() {
  const root = document.getElementById('app');
  if (!root) return;
  const current = state.getCurrentSession();
  const view = current ? renderSessionDetail() : renderHome();
  root.innerHTML = '';
  root.appendChild(view);
}
