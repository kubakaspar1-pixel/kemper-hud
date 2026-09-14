# Rig Viewer

Zobrazení a ovládání aktuálního rigu **Kemper Profiler Playeru** přes USB MIDI.
PWA – běží v Chrome na Androidu (tablet/telefon) a na desktopu. Offline, fullscreen, bez serveru.

## Rychlý test na desktopu

```
python3 -m http.server 8765 -d .
```
Otevři `http://localhost:8765` v Chrome, připoj Player USB kabelem, povol MIDI.
Porty se detekují samy (hledá se „Kemper / Profiler / Player“ v názvu).

## Nasazení na tablet

Web MIDI vyžaduje **secure context** – `http://192.168.x.x` NEfunguje.
Nejjednodušší je GitHub Pages (https zdarma):

```
git init && git add . && git commit -m "kemper hud"
gh repo create kemper-hud --public --source=. --push
gh api -X POST repos/:owner/kemper-hud/pages -f source[branch]=main -f source[path]=/
```

Pak na tabletu otevři `https://<user>.github.io/kemper-hud/` v Chrome
→ menu → *Přidat na plochu*. Po prvním spuštění funguje offline (service worker).

Na tabletu potřebuješ USB-C OTG. Pro delší hraní použij USB-C hub s PD napájením,
jinak tablet z Playeru nebere proud a vybije se.

## Jak to funguje

Player sám od sebe nic neposílá. Aplikace mu proto posílá **beacon**
(bidirekční protokol, `func 0x7e`) a obnovuje ho po polovině time-lease (5 s).
Player pak automaticky hlásí změny z vybrané sady parametrů: název rigu,
typ a stav slotů, ladičku. Jako záloha se každé 3 s dotáže na vše znovu –
při přepnutí rigu přímo na přístroji totiž nepřijde Program Change.

Adresy (`F0 00 20 33 02 7F <func> 00 <page> <param> … F7`):

| co | func | page / param |
|---|---|---|
| beacon | `7e` | `40 02 <flags> 05` |
| název rigu | `43` → `03` | `00 / 01` |
| datum rigu | `43` → `03` | `00 / 03` |
| typ efektu | `41` → `01` | slot / `00` |
| stav efektu | `41` → `01` | slot / `03` |
| ladička: mode / nota / odchylka | `41` → `01` | `7f/7e`, `7d/54`, `7c/0f` |

Slot pages: A `32`, B `33`, C `34`, D `35`, X `38`, MOD `3a`, DLY `3c`, REV `3d`.
Pro velký Profiler (Stage/Head/Rack) přepni v nastavení zařízení na product type `0x00`.

## Jazyky

Čeština, angličtina, němčina. Přepíná se v ⚙ → *Jazyk*, uloží se do zařízení
a projeví se okamžitě bez restartu. Při prvním spuštění se jazyk vezme
z nastavení systému (`navigator.language`), neznámý jazyk spadne na angličtinu.

Texty jsou v objektu `I18N` nahoře ve skriptu, klíče jsou stabilní a překládá se
až při zobrazení — i statistika provozu, takže i popisky jako „slot A typ“
vyjdou ve zvoleném jazyce. Přidat další jazyk znamená zkopírovat jeden blok.

## Ovládání

Dlaždice nejsou jen displej:

| | co udělá |
|---|---|
| **klepnutí na dlaždici** | zapne / vypne efekt v tom slotu |
| **„názvy" v liště** | režim pojmenování — v něm klepnutí efekt pojmenuje místo přepnutí |
| **„odemčeno / zamčeno"** | zámek ovládání, na pódiu proti nechtěnému šlápnutí |

Časované přidržení tady zpočátku bylo a neosvědčilo se: 500 ms pevnější klepnutí
na telefonu snadno překročí a místo přepnutí se otevřelo přejmenování. Režim je
jednoznačný — tlačítko zoranžoví a napíše „názvy: zapnuto", dlaždice dostanou
čárkovaný oranžový rámeček a ✏️ v rohu. Neukládá se, takže po restartu jsi
vždycky v ovládání.

Tlačítka v liště jsou schválně **textová, ne ikony**: ✎ (U+270E) je dingbat,
který se na Androidu nemusí vykreslit vůbec, a malý šedý glyph se přehlédne.

Posílají se CC podle slotu: A–D `17`–`20`, X `22`, MOD `24`, DLY `27`, REV `29`,
hodnota `1` = zapnout, `0` = vypnout. U delay a reverbu jsou schválně varianty
**se spilloverem**, takže po vypnutí dozní a neuseknou se.

Prázdný slot (typ 0) klepnutí ignoruje. Dlaždice se překreslí okamžitě a za
150 ms si aplikace vyžádá skutečný stav — kdyby příkaz neprošel, vrátí se zpět.

Když ovládání nereaguje, zkontroluj v ⚙ **MIDI kanál** (default 1). Zobrazení
funguje přes SysEx bez ohledu na kanál, ale CC příkazy musí jít na ten, na
kterém Player poslouchá.

## Názvy efektů

**Kemper je posílá sám.** Kromě běžné odpovědi s číslem typu chodí i zpráva
s funkčním kódem `0x3c`, která nese číslo **i jméno**:

```
f0 00 20 33 02 7f 3c 00 32 00 00 31 43 4f 4d 50 00 f7
                        │     │     └─ "COMP"
                        │     └─ typ 49
                        └─ slot A (page 0x32)
```

V dokumentaci to není, vypadlo to až z odposlechu reálného provozu. Jména se
ukládají do `khud.fxauto` a použijí se automaticky. Ruční pojmenování přes
režim „názvy" zůstalo a **má přednost**, takže si můžeš přepsat, co se ti nelíbí.

## Obsah banky

Funkční kód `0x07` nese název banky a jména všech pěti rigů v ní:

```
index 0 → "Bank 3"
index 1 → "TH Amb Cln"   index 2 → "3P Black T"   index 3 → "56 Pro 8"
index 4 → "63 BMaster ODR"   index 5 → "72 Marshall 1 2"
```

Zobrazuje se jako pruh pod názvem rigu, aktuální rig je zvýrazněný barvou banky.
Vypnout se dá v ⚙ → *Obsah banky*. Taky to není v dokumentaci.

## Diagnostika připojení

Výpis MIDI zařízení a portů je schovaný pod ⚙ → *Diagnostika připojení*,
default vypnutý. Zapni ho, když se Player nehlásí — ukáže, co systém vidí,
včetně zařízení, která jsou offline, a přidá tlačítko *hledat znovu*.
Název připojeného zařízení je vidět vždycky, i s vypnutou diagnostikou.

## Reference

- Kemper *Profiler MIDI Parameter Documentation* (download sekce Kemperu)
- [PySwitch](https://github.com/Tunetown/PySwitch) – referenční implementace protokolu

---

# Barvy bank

Player svítí u každé banky jinou barvou a cyklí je po pěti. Aplikace to
zrcadlí: číslo rigu má barvu banky a vlevo u něj je svislý pruh, který je
vidět i koutkem oka.

| banka | LED na Playeru | v aplikaci (tmavý / světlý) |
|---|---|---|
| 1, 6, 11… | modrá `rgb(0,0,255)` | `#5B8CFF` / `#1B46C8` |
| 2, 7, 12… | žlutá `rgb(255,255,0)` | `#E3C341` / `#8A6B00` |
| 3, 8, 13… | červená `rgb(255,0,0)` | `#FF5D5D` / `#C62828` |
| 4, 9, 14… | světle zelená `rgb(100,255,100)` | `#5BE07A` / `#1F7A3A` |
| 5, 10, 15… | purpurová `rgb(180,0,120)` | `#D96BC6` / `#9A1E7A` |

Surové hodnoty LED se na displeji použít nedají — čistá `#0000FF` je na tmavém
pozadí nečitelná a `#FFFF00` na světlém taky. Odstín proto zůstal a přeladil se
jen jas a sytost, zvlášť pro každý motiv.

Banka se počítá z `CC 32 × 128 + Program Change`, děleno pěti. Barva je pak
`banka % 5`.

# Motiv a barvy

Aplikace se řídí **nastavením systému** (světlý / tmavý) a v ⚙ → *Motiv* se dá
vynutit ručně: `podle systému`, `světlý`, `tmavý`. Na přepnutí systému za běhu
reaguje okamžitě, restart není potřeba. Volba se ukládá do zařízení.

Zelená je odvozená z palety Rig Manageru — v jeho `Colors.txt` je výběrová barva
`rgb(100,135,113)` a jeho ikona stojí na `#1B705B`. Je to odstín 165°:

| | tmavý motiv | světlý motiv |
|---|---|---|
| akcent a zapnutý slot | `#3BCEA9` (zesvětlená) | `#1B705B` (původní tmavá) |
| pozadí | `#0B0D10` | `#EEF1F4` |
| panely | `#15191F` | `#FFFFFF` |

Všechny barvy jsou CSS proměnné na `:root`; světlá sada se definuje jednou
v `@media (prefers-color-scheme: light)` pro automatiku a podruhé
v `:root[data-theme="light"]` pro ruční volbu. V iOS aplikaci se stejně
přebarvuje i pozadí WKWebView, aby při startu ve světlém motivu neproblikla
tmavá plocha.

# Ikona a název

Aplikace se jmenuje **Kemper Rig Control**, na ploše se zkráceně zobrazí
*Rig Control*. Ikona je vygenerovaná vektorově v CoreGraphics:

```
swiftc -O -framework AppKit -o make_icon make_icon.swift
./make_icon L 512  icon-512.png            # zaoblená, s alfou (PWA)
./make_icon L 512  icon-512-maskable.png --square
./make_icon L 1024 ios/KemperHUD/Assets.xcassets/AppIcon.appiconset/icon-1024.png --square
```

`--square` udělá plný čtverec bez alfa kanálu. Pro iOS je to **povinné** —
průhlednost v ikoně aplikace systém nepřijme a roh si zaobluje sám. Totéž
platí pro `maskable` ikonu na Androidu, kde si tvar maskuje launcher.

V `make_icon.swift` je několik variant (A–M), použitá je `L`.

## K ochranné známce

V ikoně je slovo „Kemper" použité **popisně**, běžným systémovým groteskem,
jako určení toho, k čemu aplikace patří — nikoliv jejich logotyp. Chráněná je
značka, ne typografie; problém by dělalo napodobení jejich nápisu nebo
navození dojmu, že aplikaci vydává Kemper. Proto je hlavním prvkem *RIG
CONTROL* a Kemper je menší, nad linkou, jako kvalifikátor.

Pro aplikaci na vlastní zařízení to stejně nikdo neřeší. Kdybys ji někdy chtěl
šířit, tohle je ta forma, která obstojí.

---

# Apple Watch: rozbor (nepostaveno)

Nápad: hodinky ukazují aktivní preset a při přepnutí zavibrují. Jde to, ale
naráží to na dvě systémová omezení, která stojí za to znát předem.

## Hodinky umí jen telefon

Apple Watch se párují výhradně s iPhonem a WatchConnectivity je komunikace mezi
watchOS aplikací a jejím protějškem na telefonu. **iPad v té rovnici není.**
Řetěz tedy musí být `Kemper --USB--> iPhone --WatchConnectivity--> Watch`.
Pokud je kabel v iPadu, hodinky se k datům nedostanou jinak než přes síť,
což znamená další server navíc.

## Vibrace jen v popředí

`WKInterfaceDevice.play()` zahraje haptiku jen když je aplikace aktivní na
displeji. Po spuštění zápěstí watchOS aplikaci uspí a vibrace nepřijdou.
Scénář „hraju a ono mi to cvakne do zápěstí" tedy sám o sobě nefunguje.

Obejít se to dá dvěma způsoby:

| | funguje | cena |
|---|---|---|
| `WKExtendedRuntimeSession` | desítky minut | Apple to určil pro jiné typy aplikací |
| workout session | celý koncert, displej v Always On | zapíše trénink, žere baterku |

Druhou cestou jde spousta aplikací pro muzikanty. Pro vlastní potřebu legitimní,
do App Store s tím nechodit.

## Co by se stavělo

Nový watchOS target do stejného projektu: číslo banky a rigu v barvě banky,
pod tím název presetu, haptika při změně. Z iOS aplikace by se posílalo přes
`sendMessage` (okamžité, když jsou hodinky dosažitelné) s `updateApplicationContext`
jako zálohou. Odhadem pár desítek řádků na každé straně.

Xcode 26.6 má watchOS 26.5 SDK, simulátor hodinek se dá vytvořit přes
`simctl create` a spárovat, takže se to dá ověřit stejně jako iOS část.
