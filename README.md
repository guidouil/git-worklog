# git-worklog

`git-worklog` est un CLI local qui analyse l’historique Git et estime les périodes de travail d’un développeur. Il fusionne les commits proches en sessions, y compris lorsqu’ils proviennent de plusieurs dépôts, puis produit des rapports terminal, JSON, CSV et HTML.

> Les résultats sont des **estimations fondées sur l’activité Git**, jamais un relevé exact du temps de travail.

## Installation

Node.js 22 ou 24 et Git sont requis.

```bash
npm install -g git-worklog
git-worklog --version
```

Depuis les sources :

```bash
npm install
npm run dev -- month
npm run build
node dist/cli.js month
```

## Commandes

```bash
git-worklog today
git-worklog yesterday
git-worklog week
git-worklog last-week
git-worklog month
git-worklog last-month
git-worklog range 2026-06-01 2026-06-30
git-worklog stats month
git-worklog dashboard
git-worklog config init
git-worklog config show
```

La semaine commence le lundi. `week`, `last-week`, `month` et `last-month` sont des périodes civiles calculées dans le fuseau local. Les deux journées de `range` sont incluses intégralement.

### Options principales

```text
--author <nom>             filtre par nom (répétable)
--email <email>            filtre par email exact (répétable)
--all-authors              désactive le filtrage d’auteur
--repo <chemin>            dépôt à analyser (répétable)
--repos-file <fichier>     liste JSON de dépôts
--since <date>             remplace le début de période
--until <date>             remplace la fin de période
--date-source author|commit
--session-gap <minutes>
--minimum-session <minutes>
--padding-before <minutes>
--padding-after <minutes>
--compact
--verbose
--no-color
--locale fr|en
--json
--csv
--output <fichier>
--debug
```

Les dates acceptent `YYYY-MM-DD` et les dates ISO, par exemple `2026-07-01T09:00:00`. Sans filtre explicite, l’identité courante est détectée avec `git config user.name` et `git config user.email`. Si elle est absente, le CLI indique comment utiliser `--author`, `--email` ou `--all-authors`.

## Méthode d’estimation

Les commits sont triés par date auteur (ou date de commit avec `--date-source commit`) sur une chronologie unique. Par défaut :

- un écart inférieur ou égal à 90 minutes conserve les commits dans la même session ;
- un écart supérieur ouvre une session ;
- 15 minutes sont ajoutées avant le premier commit et après le dernier ;
- une session dure au moins 30 minutes ;
- les paddings sont écrêtés au milieu de l’intervalle si deux sessions risquent de se chevaucher ;
- une session traversant minuit est répartie entre les jours locaux, sans double comptage.

Ces paramètres sont tous configurables. Le temps d’une session multi-dépôts n’est compté qu’une fois.

## Exemple

```text
Git Worklog — 20 juillet 2026 → 26 juillet 2026
Estimation approximative fondée sur l’activité Git.

lundi 20 juillet
09:12 → 12:01  2h49  6 commits   project-a
13:41 → 17:58  4h17  11 commits  project-a, project-b
                 Total  7h06

Total période: 7h06
Jours actifs: 1
Sessions: 2
Commits: 17
Moyenne quotidienne: 7h06
Durée moyenne d’une session: 3h33
Premier commit moyen: 09:12
Dernier commit moyen: 17:43
```

Le mode `--verbose` liste les commits sous leur session. `--compact` affiche une ligne par journée active. `git-worklog stats month` se concentre sur les statistiques globales : total, jours, sessions, moyenne quotidienne, durée moyenne, heures moyennes du premier et du dernier commit, dépôts, jours de semaine et heures d’activité. Les répartitions horaires et hebdomadaires détaillées sont également disponibles dans le JSON et le dashboard.

## Plusieurs dépôts

```bash
git-worklog month --repo .
git-worklog month --repo ../project-a --repo "../project avec espaces"
git-worklog month --repos-file repos.json
```

Format de `repos.json` :

```json
{
  "repositories": ["/Users/gui/projects/project-a", "../project-b"]
}
```

Les chemins du fichier sont résolus relativement au fichier, normalisés via Git et dédupliqués. Les dépôts sans commits sont acceptés. Un chemin qui n’est pas un dépôt déclenche une erreur explicite.

## Exports

```bash
git-worklog month --json
git-worklog month --json --output worklog.json
git-worklog month --csv --output sessions.csv
```

Sans `--output`, l’export est écrit sur stdout. Avec `--output`, seul un message de confirmation est écrit sur stderr. Le JSON contient la période, les paramètres, dépôts, auteurs filtrés, commits, sessions, jours et statistiques. Le CSV contient une ligne par portion journalière de session, pratique pour les tableurs :

```text
date,start,end,durationMinutes,commitCount,repositories,authors,firstCommit,lastCommit
```

## Dashboard HTML

```bash
git-worklog dashboard
git-worklog dashboard last-month --output rapport.html
```

Le dashboard est un fichier HTML autonome et responsive : résumé, tableau journalier, chronologie, dépôts, activité par jour et par heure, et paramètres d’estimation. Il ne charge aucun CDN ni ressource réseau et suit `prefers-color-scheme`.

## Configuration

`git-worklog config init` crée `.git-worklog.json`. `git-worklog config init --global` crée la configuration utilisateur dans `$XDG_CONFIG_HOME/git-worklog/config.json` (ou `~/.config/git-worklog/config.json`, et `%APPDATA%` sous Windows). `config show` affiche la configuration fusionnée et les chemins consultés.

```json
{
  "sessionGapMinutes": 90,
  "minimumSessionMinutes": 30,
  "paddingBeforeMinutes": 15,
  "paddingAfterMinutes": 15,
  "locale": "fr",
  "dateSource": "author",
  "authors": [
    {
      "name": "Guillaume",
      "emails": ["gui@example.com"]
    }
  ],
  "repositories": ["/Users/gui/projects/project-a"]
}
```

Priorité : options CLI, configuration locale, configuration globale, valeurs par défaut. Une liste définie dans une couche plus prioritaire remplace la liste précédente.

## Confidentialité et sécurité

`git-worklog` fonctionne exclusivement en local :

- aucune donnée n’est envoyée ;
- aucune télémétrie n’est intégrée ;
- aucun service distant n’est requis ;
- aucun dépôt n’est modifié ;
- seules les commandes Git non destructives `rev-parse`, `config` et `log` sont exécutées.

## Limites

Git ne permet pas de connaître :

- le temps passé avant le premier commit ;
- le travail non commité ;
- les pauses réelles ;
- les réunions ;
- les recherches et lectures ;
- le travail effectué dans un autre outil.

Les commits irréguliers, antidatés, importés ou réécrits peuvent aussi fausser l’estimation. Les résultats servent à reconstituer une tendance personnelle, pas à surveiller ni facturer sans vérification.

## Développement

```bash
npm run dev -- week
npm run test
npm run test:watch
npm run lint
npm run format
npm run typecheck
npm run check
```

`npm run check` vérifie le formatage, ESLint, TypeScript, Vitest et le build. Le projet est publié sous licence MIT.
