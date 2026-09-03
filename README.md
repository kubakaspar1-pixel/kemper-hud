# Kemper HUD

Live displej aktuálního rigu pro **Kemper Profiler Player** přes USB MIDI.
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

## Názvy efektů

Kemper posílá jen číselné **ID typu** efektu, ne jméno. Klepnutím na dlaždici
efekt pojmenuješ; mapování se ukládá do localStorage a v nastavení se dá
zkopírovat/zálohovat jako JSON. Dokud název nemáš, dlaždice zobrazuje `typ #NN`.

## Reference

- Kemper *Profiler MIDI Parameter Documentation* (download sekce Kemperu)
- [PySwitch](https://github.com/Tunetown/PySwitch) – referenční implementace protokolu
