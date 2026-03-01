/**
 * @typedef {{ id: string, nom: string }} Participant
 * @typedef {{ id: string, nom: string, montant: number, acheteurId: string, contributeurIds: string[] }} Cadeau
 * @typedef {{ id: string, nom: string, participants: Participant[], cadeaux: Cadeau[], createdAt?: number, updatedAt?: number }} Session
 */

/** @type {Session[]} */
let sessions = [];

/** @type {string | null} id de la session courante */
let currentSessionId = null;

/**
 * @returns {Session[]}
 */
export function getSessions() {
  return sessions;
}

/**
 * @returns {Session | null}
 */
export function getCurrentSession() {
  if (!currentSessionId) return null;
  return sessions.find((s) => s.id === currentSessionId) ?? null;
}

/**
 * @returns {string | null}
 */
export function getCurrentSessionId() {
  return currentSessionId;
}

/**
 * @param {Session[]} newSessions
 */
export function setSessions(newSessions) {
  sessions = newSessions;
}

/**
 * @param {string | null} id
 */
export function setCurrentSessionId(id) {
  currentSessionId = id;
}

function generateId() {
  return crypto.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function touchSession(session) {
  session.updatedAt = Date.now();
  if (!session.createdAt) session.createdAt = session.updatedAt;
}

/**
 * @param {string} nom
 * @returns {Session}
 */
export function createSession(nom) {
  const session = {
    id: generateId(),
    nom: nom.trim() || 'Nouvelle session',
    participants: [],
    cadeaux: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  sessions.push(session);
  return session;
}

/**
 * @param {string} sessionId
 * @param {string} nom
 */
export function updateSessionName(sessionId, nom) {
  const s = sessions.find((x) => x.id === sessionId);
  if (!s) return;
  s.nom = nom.trim() || s.nom;
  touchSession(s);
}

/**
 * @param {string} sessionId
 */
export function deleteSession(sessionId) {
  sessions = sessions.filter((s) => s.id !== sessionId);
  if (currentSessionId === sessionId) currentSessionId = null;
}

/**
 * @param {string} sessionId
 * @param {string} nom
 * @returns {Participant}
 */
export function addParticipant(sessionId, nom) {
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) throw new Error('Session not found');
  const participant = { id: generateId(), nom: nom.trim() || 'Sans nom' };
  session.participants.push(participant);
  touchSession(session);
  return participant;
}

/**
 * @param {string} sessionId
 * @param {string} participantId
 * @param {string} nom
 */
export function updateParticipant(sessionId, participantId, nom) {
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) return;
  const p = session.participants.find((x) => x.id === participantId);
  if (!p) return;
  p.nom = nom.trim() || p.nom;
  touchSession(session);
}

/**
 * @param {string} sessionId
 * @param {string} participantId
 */
export function removeParticipant(sessionId, participantId) {
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) return;
  session.participants = session.participants.filter((p) => p.id !== participantId);
  session.cadeaux = session.cadeaux.filter(
    (c) => c.acheteurId !== participantId && !c.contributeurIds.includes(participantId)
  );
  touchSession(session);
}

/**
 * @param {string} sessionId
 * @param {{ nom: string, montant: number, acheteurId: string, contributeurIds: string[] }} data
 * @returns {Cadeau}
 */
export function addCadeau(sessionId, data) {
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) throw new Error('Session not found');
  if (data.montant <= 0 || !data.contributeurIds?.length) throw new Error('Montant > 0 et au moins un contributeur');
  const cadeau = {
    id: generateId(),
    nom: (data.nom || '').trim() || 'Cadeau',
    montant: Number(data.montant),
    acheteurId: data.acheteurId,
    contributeurIds: [...data.contributeurIds],
  };
  session.cadeaux.push(cadeau);
  touchSession(session);
  return cadeau;
}

/**
 * @param {string} sessionId
 * @param {string} cadeauId
 * @param {{ nom?: string, montant?: number, acheteurId?: string, contributeurIds?: string[] }} data
 */
export function updateCadeau(sessionId, cadeauId, data) {
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) return;
  const c = session.cadeaux.find((x) => x.id === cadeauId);
  if (!c) return;
  if (data.nom !== undefined) c.nom = (data.nom || '').trim() || c.nom;
  if (data.montant !== undefined) c.montant = Number(data.montant);
  if (data.acheteurId !== undefined) c.acheteurId = data.acheteurId;
  if (data.contributeurIds !== undefined) c.contributeurIds = [...data.contributeurIds];
  if (c.montant <= 0 || !c.contributeurIds.length) return;
  touchSession(session);
}

/**
 * @param {string} sessionId
 * @param {string} cadeauId
 */
export function removeCadeau(sessionId, cadeauId) {
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) return;
  session.cadeaux = session.cadeaux.filter((c) => c.id !== cadeauId);
  touchSession(session);
}

export default {
  getSessions,
  getCurrentSession,
  getCurrentSessionId,
  setSessions,
  setCurrentSessionId,
  createSession,
  updateSessionName,
  deleteSession,
  addParticipant,
  updateParticipant,
  removeParticipant,
  addCadeau,
  updateCadeau,
  removeCadeau,
};
