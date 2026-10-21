# AGENTS.md Generator: plan i analiza

Statyczna strona na GitHub Pages, na której użytkownik zaznacza checkboxy z regułami (ogólne i per technologia), a strona w czasie rzeczywistym składa z nich gotowy plik `AGENTS.md` do skopiowania lub pobrania.

## 1. Cel i zakres

**Problem.** Dobry `AGENTS.md` pisze się od zera i kopiuje z innych repozytoriów. Reguły są rozproszone (awesome-cursorrules, skille, AGENTS.md z dużych projektów), niespójne i nieprzefiltrowane pod konkretny stack.

**Rozwiązanie.** Katalog ręcznie wyselekcjonowanych, atomowych reguł, pogrupowanych w kategorie i technologie, z generatorem po stronie przeglądarki.

**Co jest w zakresie (MVP).**
- Wybór reguł checkboxami, podgląd na żywo, kopiowanie, pobieranie `AGENTS.md`.
- Presety (np. "Next.js + TypeScript strict", "Python FastAPI").
- Eksport/import konfiguracji (JSON w URL hash, udostępnianie linkiem).
- Własne reguły wpisane przez użytkownika.

**Poza zakresem MVP.** Konta użytkowników, backend, generowanie reguł przez LLM, skanowanie repozytorium użytkownika.

## 2. Analiza formatu AGENTS.md

Ustalenia z researchu (źródła na końcu):
- Zwykły Markdown, brak wymaganego schematu. To konwencja, nie formalna specyfikacja.
- Plik w korzeniu repo, obsługiwane pliki zagnieżdżone (najbliższy edytowanemu kodu wygrywa).
- Czytany przez wielu agentów: Codex, Copilot, Cursor, Gemini CLI, Jules, Aider, Zed, Windsurf, Devin i inni. Opiekunem jest Agentic AI Foundation pod Linux Foundation.
- Uwaga do zweryfikowania: część źródeł twierdzi, że Claude Code czyta `CLAUDE.md`, a nie `AGENTS.md`. Generator powinien oferować opcję eksportu jako `CLAUDE.md` (lub snippet `@AGENTS.md` / symlink) oraz `.cursor/rules/*.mdc`.
- Liczby adopcji i "o 35-55% mniej błędów" pochodzą z blogów, bez pierwotnych dowodów. Nie używać ich w treści strony.

**Wniosek projektowy.** Dobry plik jest krótki, konkretny i komendowy. Typowe sekcje, które generator powinien wypełniać:

1. Project overview
2. Setup / build / dev commands
3. Testing instructions
4. Code style (formatowanie, indentacja, naming)
5. Architecture / struktura katalogów
6. Git workflow (commity, PR, branche)
7. Security i granice (czego agent nie może robić)
8. Skille i narzędzia specyficzne dla technologii

Generator musi ostrzegać o długości pliku (licznik tokenów/znaków, sugerowany limit ok. 300 linii), bo przeładowany kontekst pogarsza wyniki agentów.

## 3. Architektura techniczna

**Hosting:** GitHub Pages, deploy z GitHub Actions.

**Stack (rekomendacja):** Vite + TypeScript + Preact (lub czysty TS + Web Components), Tailwind lub CSS variables. Powód: brak backendu, mały bundle, szybki start, łatwy deploy statyczny. Astro to dobra alternatywa, jeśli katalog reguł ma być też indeksowalną dokumentacją (SEO).

**Zasady:**
- Cała logika w przeglądarce, zero wysyłania danych na serwer.
- Stan wyboru serializowany do URL hash (lista ID reguł, kompresja), fallback `localStorage` w try/catch.
- Reguły jako dane (YAML/JSON w repo), nie zaszyte w kodzie. Dodanie reguły = PR z jednym plikiem.
- Walidacja schematu reguł w CI (JSON Schema), build failuje przy błędzie.

**Struktura repo:**

```
/content
  /categories        # indentation, naming, logging, design-system, testing, git, security
  /technologies      # typescript, react, nextjs, python, fastapi, go, rust, java, ...
  /presets
  /sources.yml       # rejestr źródeł i licencji
/schema              # JSON Schema reguły
/src                 # aplikacja
/scripts             # walidacja, import, linkcheck
/.github/workflows   # ci.yml, pages.yml, link-check.yml
```

## 4. Model danych reguły

Każda reguła to atom, który można włączyć lub wyłączyć:

```yaml
id: ts-strict-mode
title: Włącz strict w tsconfig
category: typescript-config
technologies: [typescript]
section: code-style
text: |
  - Use `"strict": true` in tsconfig.json. Do not use `any`; prefer `unknown` and narrow.
default: true
tags: [recommended]
conflicts: []
requires: []
weight: 10
source:
  name: ...
  url: ...
  license: MIT
  retrieved: 2026-10-21
```

**Kluczowe pola:**
- `section` mapuje regułę na sekcję wynikowego pliku.
- `conflicts` (np. tabs vs spaces, camelCase vs snake_case) wyłącza wzajemnie wykluczające się opcje, w UI jako radio.
- `requires` włącza zależności (reguła Next.js wymaga React).
- `source` i `license` dla atrybucji (patrz sekcja 8).
- Reguły z parametrami (np. indentacja: 2/4, tabs/spaces; format logów: JSON/logfmt/text) mają `options` i generują tekst z szablonu.

## 5. UX i funkcje

**Układ:** trzy kolumny na desktopie (nawigacja kategorii, lista checkboxów, podgląd na żywo), zakładki na mobile.

**Wybór globalny:**
- Technologie (multi-select), po wyborze UI pokazuje tylko pasujące reguły.
- Presety jako punkt startu.

**Funkcje:**
- Wyszukiwarka i filtry (kategoria, technologia, tag "recommended").
- "Zaznacz wszystkie rekomendowane w sekcji".
- Podgląd Markdown i surowy, licznik tokenów, ostrzeżenie o długości.
- Eksport: `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/*.mdc`, `copilot-instructions.md`, ZIP z kilkoma plikami.
- Wsparcie monorepo: wiele plików zagnieżdżonych (`/`, `/apps/web`, `/services/api`) z osobnym wyborem reguł.
- Tryb jasny/ciemny, dostępność WCAG 2.1 AA (focus, kontrast, nawigacja klawiaturą, `aria` dla grup checkboxów).
- Języki UI: PL i EN (treść reguł zawsze po angielsku, bo agenci działają najlepiej na angielskich instrukcjach).

## 6. Taksonomia treści

### 6.1 Kategorie ogólne (niezależne od technologii)

| Kategoria | Przykładowe wybory |
|---|---|
| Indentacja i formatowanie | tabs / 2 spaces / 4 spaces, długość linii 80/100/120, końce linii, trailing newline |
| Naming conventions | camelCase / snake_case / kebab-case dla plików, PascalCase typy, prefiksy interfejsów, nazwy testów |
| Komentarze i dokumentacja | brak komentarzy / tylko "why" / JSDoc/docstringi dla publicznego API |
| Design system | użycie tokenów, zakaz hardcoded kolorów, biblioteka komponentów (shadcn, MUI, Chakra), a11y |
| Format logów | JSON strukturalny / logfmt / tekst, poziomy, correlation ID, zakaz logowania sekretów/PII |
| Obsługa błędów | typed errors, Result pattern, brak połykania wyjątków |
| Testy | piramida testów, nazewnictwo, mocki vs integracja, próg pokrycia, TDD |
| Git i PR | Conventional Commits, rozmiar PR, reguły branchy, zakaz force push |
| Bezpieczeństwo | sekrety, walidacja wejścia, zależności, OWASP |
| Wydajność | budżety, lazy loading, N+1 |
| Architektura | warstwy, clean/hexagonal, granice modułów, DRY vs duplikacja |
| Zachowanie agenta | plan przed kodem, małe diffy, pytaj przy niejasności, nie dodawaj zależności bez zgody, nie edytuj plików generowanych |
| Komendy projektu | szablony: install, dev, build, test, lint, typecheck |
| CI/CD i DevOps | Docker, IaC, migracje, feature flags |

### 6.2 Technologie (pierwsza fala)

- **JS/TS:** TypeScript, React, Next.js, Vue, Nuxt, Svelte/SvelteKit, Angular, Node.js, Express, NestJS, Tailwind, Vitest/Jest, Playwright
- **Python:** Python (PEP 8, typing), Django, FastAPI, Flask, pytest, Poetry/uv, Ruff
- **Inne języki:** Go, Rust, Java/Spring Boot, Kotlin, C#/.NET, PHP/Laravel, Ruby/Rails, Swift/SwiftUI
- **Mobile:** React Native, Flutter, Android (Compose)
- **Dane i infrastruktura:** PostgreSQL, Prisma, SQLAlchemy, Docker, Kubernetes, Terraform, GitHub Actions
- **AI:** integracje z API LLM, prompt hygiene, RAG

Druga fala: WordPress, Unity, Godot, Elixir, Scala, Solidity i inne zgłaszane przez społeczność.

### 6.3 "Best skills" per technologia

Osobny typ treści obok reguł: **rekomendowane skille** (`SKILL.md`) i narzędzia, np. skille frameworkowe, do testów, do code review, do dokumentacji. Generator wstawia do sekcji "Skills and tools" odwołania (nazwa, kiedy użyć, link), a nie kopiuje pełnej treści skilla. Każdy wpis ma `when_to_use` i link do źródła.

## 7. Źródła contentu

Cel: zebrać i zredagować kilkaset atomowych reguł. Źródła, w kolejności priorytetu:

| Źródło | Co dostarcza | Licencja (do weryfikacji przed użyciem) |
|---|---|---|
| Oficjalna strona i repo agents.md | Format, przykłady, galeria plików z open source | sprawdzić |
| Pliki `AGENTS.md` z dużych repo (np. openai/codex, getsentry/sentry, apache/airflow i inne z galerii agents.md) | Realne wzorce: komendy, testy, git workflow | zależnie od repo, głównie permisywne |
| PatrickJS/awesome-cursorrules | Setki reguł per framework, dobry szkielet taksonomii | CC0-1.0 (do potwierdzenia w repo) |
| Repozytoria skilli (anthropics/skills, community skills) | Wzorce `SKILL.md`, rekomendacje | sprawdzić per skill |
| Oficjalne style guide'y (Google Style Guides, PEP 8, Effective Go, Rust API Guidelines, Airbnb JS) | Formatowanie, naming | różne, parafrazować i linkować |
| Dokumentacja frameworków (React, Next.js, Django, FastAPI, Spring) | Idiomatyczne praktyki | parafrazować i linkować |
| OWASP (Cheat Sheets, ASVS) | Reguły bezpieczeństwa | CC BY-SA, wymaga atrybucji |
| Reguły Copilot, Windsurf, Cline i inne | Uzupełnienie | sprawdzić |

**Proces pozyskiwania (pipeline):**
1. Skrypt `scripts/harvest` pobiera pliki z wybranych repo (GitHub API, tylko pliki publiczne), zapisuje surowe kopie lokalnie, poza repo.
2. Ekstrakcja: podział na pojedyncze polecenia (bullet = kandydat na regułę).
3. Deduplikacja i klastrowanie (embedding lub proste podobieństwo), zliczanie, ile niezależnych źródeł powtarza regułę. Częstość występowania = sygnał jakości i priorytet "recommended".
4. Redakcja ręczna: skrócenie, ujednolicenie trybu rozkazującego, jedna myśl na regułę, testowalność ("Use X" zamiast "Try to use X where possible").
5. Przypisanie kategorii, technologii, konfliktów, źródła.
6. Review w PR, CI waliduje schemat i linki.

Docelowy wolumen: MVP 150-200 reguł (12 technologii, 10 kategorii), v1 ok. 600-800, z wersją 2 po zgłoszeniach społeczności.

## 8. Licencje i atrybucja (ryzyko prawne)

- Nie kopiować treści masowo. Reguły to krótkie instrukcje, ale kopiowanie całych plików bez licencji jest ryzykowne.
- Parafrazować i redagować; przy dosłownych fragmentach zachować licencję i atrybucję.
- `sources.yml` jako rejestr: URL, licencja, data pobrania, sposób użycia.
- Strona "Źródła i podziękowania" generowana automatycznie z rejestru.
- Treści CC BY-SA (OWASP) wymagają atrybucji i odpowiedniej licencji pochodnej; rozważyć linkowanie zamiast kopiowania.
- Własna treść katalogu publikowana na CC0 lub MIT, kod aplikacji na MIT, co ułatwia społeczności wkład.
- Plik wynikowy generowany użytkownikowi nie niesie obowiązku atrybucji; informację o źródłach można dodać opcjonalnym komentarzem w pliku.

## 9. Jakość, testy, utrzymanie

- **Testy jednostkowe** (Vitest): serializacja stanu, rozwiązywanie konfliktów/zależności, kompozycja Markdown.
- **Snapshot testy** wygenerowanych plików dla presetów.
- **E2E** (Playwright): zaznacz reguły, sprawdź podgląd, kopiowanie, pobranie, import z URL.
- **Lint treści:** długość reguły, brak zakazanych sformułowań, brak duplikatów ID, istnienie źródła.
- **Link check** cyklicznie (cron w Actions).
- **Lighthouse CI** (wydajność, a11y, SEO) z progiem.
- **Wersjonowanie katalogu:** `content-version` w URL stanu, aby stare linki nadal odtwarzały wybór.
- **Dependabot/Renovate** dla zależności.
- **CONTRIBUTING.md** z szablonem PR dla nowej reguły i issue template "Zaproponuj regułę/technologię".

## 10. Roadmapa

| Etap | Zakres | Wynik |
|---|---|---|
| 0. Fundament (2-3 dni) | Repo, Vite+TS, CI, deploy Pages, JSON Schema, 20 reguł testowych | Pusta strona działa pod `/AGENTS.md-generator/` |
| 1. Silnik (1 tydzień) | Model danych, rozwiązywanie konfliktów, generator Markdown, UI z checkboxami, podgląd, kopiuj/pobierz | Działający generator na małym katalogu |
| 2. Content MVP (1-2 tygodnie) | Harvest pipeline, 150-200 reguł, 10 presetów, sekcja źródeł | Użyteczny produkt |
| 3. UX (1 tydzień) | Wyszukiwarka, filtry, share link, tryb ciemny, a11y, PL/EN, licznik tokenów | Publiczna beta |
| 4. Eksporty (3-5 dni) | `CLAUDE.md`, `.mdc`, Copilot, ZIP, monorepo | Wielu agentów |
| 5. Społeczność | CONTRIBUTING, szablony, 600+ reguł, druga fala technologii, skille | v1.0 |
| 6. Opcjonalnie | Import istniejącego `AGENTS.md` do checkboxów, linter pliku (długość, sprzeczności), bookmarklet/CLI `npx` | v1.x |

Szacunek: MVP w 3-4 tygodnie pracy jednej osoby, z czego większość to content, nie kod.

## 11. Ryzyka i decyzje do podjęcia

| Ryzyko | Mitygacja |
|---|---|
| Zbyt długi, "przekombinowany" wynikowy plik | Licznik, domyślnie zaznaczone tylko rekomendowane, ostrzeżenia |
| Sprzeczne reguły | `conflicts`, radio zamiast checkboxów, walidacja wyniku |
| Nieaktualne reguły (frameworki się zmieniają) | Data weryfikacji w regule, cykliczny przegląd, wersja frameworka w polu |
| Licencje | Rejestr źródeł, parafraza, atrybucja |
| Rozbieżności między agentami (Claude Code vs AGENTS.md) | Eksport do wielu formatów, weryfikacja w oficjalnej dokumentacji przed publikacją |
| Praca nad contentem przerasta czas | Zacząć od 12 technologii, resztę oddać społeczności |
| Ścieżka `/repo-name/` na Pages psuje zasoby | Ustawić `base` w Vite, test na preview |

**Decyzje do potwierdzenia:**
1. Stack: Vite+Preact (rekomendowane) czy Astro?
2. Język UI: PL+EN czy tylko EN?
3. Licencja katalogu: CC0 czy MIT?
4. Pierwsza fala technologii: czy lista z 6.2 jest właściwa?
5. Czy eksport `CLAUDE.md` i `.mdc` wchodzi do MVP, czy dopiero etap 4?
6. Domena: domyślny `grzmol.github.io/AGENTS.md-generator` czy własna?

## 12. Następny krok

Po zatwierdzeniu decyzji z sekcji 11: etap 0 (szkielet repo, CI, JSON Schema, pierwsze 20 reguł) i równolegle skrypt harvest na 5-10 repozytoriach referencyjnych, aby zmierzyć realny koszt redakcji contentu.

## Źródła researchu

- [6 AGENTS.md Examples From Real Production Repos](https://ssojet.com/blog/agents-md-examples)
- [AGENTS.md na Mintlify](https://www.mintlify.com/agentsmd/agents.md)
- [Tembo: AGENTS.md](https://www.tembo.io/blog/agents-md)
- [Factory: AGENTS.md](https://www.factory.ai/agents-md)
- [What AGENTS.md Does](https://morphllm.com/agents-md-guide)
- [What is AGENTS.md?](https://cobusgreyling.substack.com/p/what-is-agentsmd)
- [12 .cursorrules Files Worth Copying](https://ssojet.com/blog/best-cursorrules-files)
- [awesome-cursorrules (mirror)](https://www.mdskills.ai/rules/awesome-cursorrules?tab=source)

Większość źródeł to blogi i agregatory; fakty o licencjach, statystykach i zachowaniu Claude Code należy zweryfikować w repozytoriach i oficjalnej dokumentacji przed publikacją.
