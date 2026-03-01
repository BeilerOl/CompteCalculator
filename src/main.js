import * as state from './state.js';
import * as storage from './storage.js';
import { render } from './ui.js';

function persist() {
  storage.saveSessions(state.getSessions());
}

function init() {
  const loaded = storage.loadSessions();
  state.setSessions(loaded);
  state.setCurrentSessionId(null);
  render();
}

function openSession(id) {
  state.setCurrentSessionId(id);
  render();
}

function backToList() {
  state.setCurrentSessionId(null);
  render();
}

function createSession() {
  const nom = prompt('Nom de la session :', 'Nouvelle session') || 'Nouvelle session';
  const session = state.createSession(nom);
  persist();
  state.setCurrentSessionId(session.id);
  render();
}

function deleteSession(id) {
  if (!confirm('Supprimer cette session ?')) return;
  state.deleteSession(id);
  persist();
  render();
}

function updateSessionName(id, nom) {
  state.updateSessionName(id, nom);
  persist();
  render();
}

function addParticipant(sessionId, nom) {
  try {
    state.addParticipant(sessionId, nom);
    persist();
    render();
  } catch (e) {
    alert(e.message || 'Erreur');
  }
}

function updateParticipant(sessionId, participantId, nom) {
  state.updateParticipant(sessionId, participantId, nom);
  persist();
  render();
}

function removeParticipant(sessionId, participantId) {
  if (!confirm('Supprimer ce participant ? Les cadeaux le concernant seront aussi modifiés.')) return;
  state.removeParticipant(sessionId, participantId);
  persist();
  render();
}

function addCadeau(sessionId, data) {
  try {
    state.addCadeau(sessionId, data);
    persist();
    render();
  } catch (e) {
    alert(e.message || 'Montant > 0 et au moins un contributeur requis.');
  }
}

function updateCadeau(sessionId, cadeauId, data) {
  try {
    state.updateCadeau(sessionId, cadeauId, data);
    persist();
    render();
  } catch (e) {
    alert(e.message || 'Erreur');
  }
}

function removeCadeau(sessionId, cadeauId) {
  if (!confirm('Supprimer ce cadeau ?')) return;
  state.removeCadeau(sessionId, cadeauId);
  persist();
  render();
}

function exportAll() {
  storage.exportSessions(state.getSessions());
}

function exportOne(session) {
  storage.exportSessions([session], `${session.nom.replace(/\s+/g, '-')}.json`);
}

function importFile(file) {
  if (!file) return;
  storage.importSessionsFromFile(file, state.getSessions()).then((merged) => {
    state.setSessions(merged);
    persist();
    render();
  }).catch((e) => {
    alert('Import impossible : ' + (e.message || 'fichier invalide'));
  });
}

window.app = {
  init,
  openSession,
  backToList,
  createSession,
  deleteSession,
  updateSessionName,
  addParticipant,
  updateParticipant,
  removeParticipant,
  addCadeau,
  updateCadeau,
  removeCadeau,
  exportAll,
  exportOne,
  importFile,
  get state() { return state; },
};

document.addEventListener('DOMContentLoaded', init);
