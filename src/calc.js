/**
 * Calcul des soldes et des dettes entre personnes.
 * @typedef {{ id: string, nom: string }} Participant
 * @typedef {{ id: string, nom: string, montant: number, acheteurId: string, contributeurIds: string[] }} Cadeau
 */

const ROUND = (v) => Math.round(v * 100) / 100;

/**
 * Calcule le solde net par participant (payé - doit).
 * @param {Participant[]} participants
 * @param {Cadeau[]} cadeaux
 * @returns {Map<string, number>} participantId -> solde (positif = créancier, négatif = débiteur)
 */
export function computeSoldes(participants, cadeaux) {
  const paye = new Map();
  const doit = new Map();
  for (const p of participants) {
    paye.set(p.id, 0);
    doit.set(p.id, 0);
  }
  for (const c of cadeaux) {
    const part = c.contributeurIds.length ? ROUND(c.montant / c.contributeurIds.length) : 0;
    const payeActuel = paye.get(c.acheteurId) ?? 0;
    paye.set(c.acheteurId, ROUND(payeActuel + c.montant));
    for (const id of c.contributeurIds) {
      const doitActuel = doit.get(id) ?? 0;
      doit.set(id, ROUND(doitActuel + part));
    }
  }
  const soldes = new Map();
  for (const p of participants) {
    const pPaye = paye.get(p.id) ?? 0;
    const pDoit = doit.get(p.id) ?? 0;
    let solde = ROUND(pPaye - pDoit);
    soldes.set(p.id, solde);
  }
  return soldes;
}

/**
 * Répartit les centimes d'arrondi : on ajuste les premiers contributeurs pour que la somme des parts = montant.
 * @param {number} montant
 * @param {string[]} contributeurIds
 * @returns {Map<string, number>} id -> part exacte
 */
function repartirMontant(montant, contributeurIds) {
  const n = contributeurIds.length;
  if (n === 0) return new Map();
  const base = Math.floor((montant * 100) / n) / 100;
  const restCents = Math.round(ROUND(montant - base * n) * 100);
  const parts = new Map();
  contributeurIds.forEach((id, i) => {
    const extra = i < restCents ? 0.01 : 0;
    parts.set(id, ROUND(base + extra));
  });
  return parts;
}

/**
 * Retourne pour un cadeau la répartition : montant total, acheteur, et part due par chaque contributeur.
 * @param {Cadeau} cadeau
 * @returns {{ montantTotal: number, acheteurId: string, parts: Map<string, number> }}
 */
export function getRepartitionCadeau(cadeau) {
  const parts = repartirMontant(cadeau.montant, cadeau.contributeurIds || []);
  return {
    montantTotal: cadeau.montant,
    acheteurId: cadeau.acheteurId,
    parts,
  };
}

/**
 * Recalcule soldes en utilisant des parts ajustées pour éviter les écarts d'un centime.
 * @param {Participant[]} participants
 * @param {Cadeau[]} cadeaux
 * @returns {Map<string, number>}
 */
export function computeSoldesExact(participants, cadeaux) {
  // #region agent log
  const _participants = participants.map((p) => ({ id: p.id, nom: p.nom }));
  const _cadeaux = cadeaux.map((c) => ({ id: c.id, nom: c.nom, montant: c.montant, acheteurId: c.acheteurId, contributeurIds: c.contributeurIds }));
  fetch('http://127.0.0.1:7815/ingest/7a9aea5e-7949-4341-811c-9f60874ab754', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '7bf1d6' }, body: JSON.stringify({ sessionId: '7bf1d6', location: 'calc.js:computeSoldesExact:input', message: 'Input participants and cadeaux', data: { participants: _participants, cadeaux: _cadeaux }, timestamp: Date.now(), hypothesisId: 'H2,H5' }) }).catch(() => {});
  // #endregion
  const paye = new Map();
  const doit = new Map();
  for (const p of participants) {
    paye.set(p.id, 0);
    doit.set(p.id, 0);
  }
  for (const c of cadeaux) {
    const contribIds = c.contributeurIds ?? [];
    const parts = repartirMontant(c.montant, contribIds);
    // #region agent log
    const partsArr = Array.from(parts.entries()).map(([id, part]) => ({ id, part }));
    fetch('http://127.0.0.1:7815/ingest/7a9aea5e-7949-4341-811c-9f60874ab754', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '7bf1d6' }, body: JSON.stringify({ sessionId: '7bf1d6', location: 'calc.js:computeSoldesExact:perCadeau', message: 'Cadeau parts', data: { cadeauNom: c.nom, montant: c.montant, acheteurId: c.acheteurId, contributeurIds: contribIds, parts: partsArr }, timestamp: Date.now(), hypothesisId: 'H1,H2' }) }).catch(() => {});
    // #endregion
    paye.set(c.acheteurId, ROUND((paye.get(c.acheteurId) ?? 0) + c.montant));
    parts.forEach((part, id) => {
      doit.set(id, ROUND((doit.get(id) ?? 0) + part));
    });
  }
  const soldes = new Map();
  let sumSoldes = 0;
  for (const p of participants) {
    const payeVal = paye.get(p.id) ?? 0;
    const doitVal = doit.get(p.id) ?? 0;
    const solde = ROUND(payeVal - doitVal);
    soldes.set(p.id, solde);
    sumSoldes += solde;
  }
  // #region agent log
  const soldesDetail = participants.map((p) => ({ id: p.id, nom: p.nom, paye: paye.get(p.id) ?? 0, doit: doit.get(p.id) ?? 0, solde: soldes.get(p.id) ?? 0 }));
  fetch('http://127.0.0.1:7815/ingest/7a9aea5e-7949-4341-811c-9f60874ab754', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '7bf1d6' }, body: JSON.stringify({ sessionId: '7bf1d6', location: 'calc.js:computeSoldesExact:output', message: 'Soldes per participant and sum', data: { soldesDetail, sumSoldes: ROUND(sumSoldes) }, timestamp: Date.now(), hypothesisId: 'H4,H5' }) }).catch(() => {});
  // #endregion
  return { soldes, paye, doit };
}

/**
 * À partir des soldes, produit une liste minimale de virements (qui doit combien à qui).
 * Algorithme glouton : plus gros débiteur -> plus gros créancier.
 * @param {Participant[]} participants
 * @param {Map<string, number>} soldes
 * @returns {{ fromId: string, toId: string, montant: number }[]}
 */
export function computeDettes(soldes) {
  const creanciers = [];
  const debiteurs = [];
  soldes.forEach((solde, id) => {
    if (solde > 0) creanciers.push({ id, solde });
    if (solde < 0) debiteurs.push({ id, solde: -solde });
  });
  const result = [];
  let i = 0;
  let j = 0;
  creanciers.sort((a, b) => b.solde - a.solde);
  debiteurs.sort((a, b) => b.solde - a.solde);
  while (i < creanciers.length && j < debiteurs.length) {
    const cr = creanciers[i];
    const deb = debiteurs[j];
    const montant = ROUND(Math.min(cr.solde, deb.solde));
    if (montant <= 0) break;
    result.push({ fromId: deb.id, toId: cr.id, montant });
    cr.solde = ROUND(cr.solde - montant);
    deb.solde = ROUND(deb.solde - montant);
    if (cr.solde <= 0) i++;
    if (deb.solde <= 0) j++;
  }
  return result;
}

/**
 * Dettes brutes par paire (A, B) : pour chaque cadeau où B a payé et A a contribué, somme des parts de A.
 * Chaque entrée = A doit montant € à B (total sur tous les achats concernés).
 * @param {Participant[]} participants
 * @param {Cadeau[]} cadeaux
 * @returns {{ fromId: string, toId: string, montant: number }[]}
 */
export function getDettesBrutes(participants, cadeaux) {
  const allPairs = participants.flatMap((from) =>
    participants.filter((to) => to.id !== from.id).map((to) => ({ fromId: from.id, toId: to.id }))
  );
  const map = new Map();
  for (const c of cadeaux) {
    const rep = getRepartitionCadeau(c);
    for (const { fromId, toId } of allPairs) {
      if (rep.acheteurId === toId) {
        const part = rep.parts.get(fromId);
        if (part != null && part > 0) {
          const key = `${fromId}-${toId}`;
          map.set(key, ROUND((map.get(key) ?? 0) + part));
        }
      }
    }
  }
  return allPairs
    .map(({ fromId, toId }) => ({ fromId, toId, montant: map.get(`${fromId}-${toId}`) ?? 0 }))
    .filter((d) => d.montant > 0);
}

/**
 * Combine soldes exacts + dettes pour l'affichage.
 * @param {Participant[]} participants
 * @param {Cadeau[]} cadeaux
 * @returns {{ soldes: Map<string, number>, paye: Map<string, number>, doit: Map<string, number>, dettes: { fromId: string, toId: string, montant: number }[], dettesBrutes: { fromId: string, toId: string, montant: number }[] }}
 */
export function computeAll(participants, cadeaux) {
  const { soldes, paye, doit } = computeSoldesExact(participants, cadeaux);
  const dettes = computeDettes(soldes);
  const dettesBrutes = getDettesBrutes(participants, cadeaux);
  return { soldes, paye, doit, dettes, dettesBrutes };
}
