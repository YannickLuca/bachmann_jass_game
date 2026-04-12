export const RULE_PROFILES = {
  bieter: {
    id: 'bieter',
    name: 'Bieterjass (3 Spieler)',
    players: 3,
    localOnly: true,
    summary: 'Solo-Modus mit Gebotsrunde und Trumpfwahl durch den Höchstbietenden.',
  },
  schieber: {
    id: 'schieber',
    name: 'Schieber Jass (4 Spieler)',
    players: 4,
    localOnly: true,
    summary: 'Partner-Modus mit Trumpfwahl durch Vorhand oder nach dem Schieben durch den Partner.',
  },
};

export const PROJECT_STATUS = {
  frontend: 'lokale Web-App in public/',
  backend: 'Express-Server für Auslieferung und späteres Online-Upgrade',
  nextStep: 'Room-/Matchmaking-Layer für Multiplayer über denselben Spielkern',
};
