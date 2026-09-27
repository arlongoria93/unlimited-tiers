# Unlimited Tiers — Roblox build prompt

Rebuild the game around this math. Do not invent a different haste formula. Do not divide by 1.1.

## Swing

```
swing = max(0.20, 1 / (1 + haste))
```

Haste is a fraction. 0.15 means +15%. A full set of one tier adds exactly that tier's haste. VIP adds +0.05. The wolf rite adds +0.03. Nothing else is passive haste.

## Tiers

| Tier | Name | Instance | Haste | Hit | HP | Rooms |
|---|---|---|---|---|---|---|
| 0 | Rust | Mall | 0.05 | 16 | 160 | 0 |
| 1 | Ember | Ember Pit | 0.15 | 20 | 200 | 5 |
| 2 | Wolfkeep | Wolfkeep | 0.28 | 22 | 240 | 5 |
| 3 | Hollow | Pure Hollow | 0.42 | 24 | 280 | 6 |
| 4 | Gilded | Gilded Sty | 0.60 | 26 | 340 | 6 |
| 5 | Cloister | Silent Cloister | 0.80 | 28 | 400 | 7 |
| 6 | Blackwater | Blackwater Cut | 1.05 | 30 | 470 | 7 |
| 7 | Coil | Coil of Stone | 1.35 | 32 | 550 | 7 |
| 8 | Vault | Optional Vault | 1.40 | 33 | 580 | 5 |
| 9 | Gronn | Gronn Gate | 1.70 | 36 | 680 | 8 |
| 10 | Arc | Arc Cage | 2.05 | 38 | 800 | 8 |
| 11 | Bloodworks | Bloodworks | 2.30 | 40 | 900 | 8 |
| 12 | Titan | Titan Vault | 2.60 | 42 | 1000 | 9 |
| 13 | Pale | Pale Sanctum | 2.90 | 44 | 1120 | 8 |
| 14 | Crucible | Ashen Crucible | 3.20 | 46 | 1250 | 8 |
| 15 | Court | Sunken Court | 3.50 | 48 | 1400 | 8 |
| 16 | Crown | Crown of the First | 3.80 | 50 | 1600 | 9 |

Hit comes from the worn main hand. Health comes from the worn chest. A missing piece adds no haste for that slot.

## Sixteen slots

A full set is 100% of that tier's haste, split like this:

- Main hand 32%, off hand 18%
- Ring 1 6%, ring 2 6%, trinket 1 6%, trinket 2 6%
- Neck 2.5%, back 2%
- Head 3%, shoulders 2.5%, chest 4%, wrists 2%, hands 2.5%, waist 2%, legs 3.5%, feet 2%

There is no offset slot.

Mark costs are `base × tier`:

- Main hand 48, off hand 28, chest 18, legs 16, head 14, shoulders 14
- Hands 12, waist 12, feet 12, wrists 10
- Neck, back, both rings, both trinkets: 16

## Economy

Mobs drop that tier's marks only. Trash 1, elite 3, boss 12. You buy pieces from that tier's vendor. You never drop the piece itself.

- Tier 1 main hand is not at the vendor. The element forge sells it for 24 cinders.
- Tiers 5, 6, 7, 8, 9, 10, 11, and 15 sell no weapons. The last main hand keeps swinging. Those bosses have 1.5× health.
- Tier 8 sells jewelry only: neck, back, rings, trinkets.
- Tier 12 main hand also costs one Upgrade Mark from the Titan boss.
- If you are short marks, medallions buy only the gap. 2 medallions per mark at tiers 1–4, 3 at 5–8, 4 at 9–16. VIP is a permanent +5% haste.

## Kill times

Enemy health is full-set DPS times a time-to-kill. Trash seconds: tier 1 = 1.6, tiers 2–3 = 2.4, 4–7 = 3.5, 8–11 = 4.5, 12–14 = 6, 15–16 = 8. Elites are 2.6× trash. Bosses are 10× trash at tiers 1–2, 14× at 3–8, 18× after that. Weapon-drought bosses are another 1.5×.

## Feel

Early pits die fast so the first swings feel good. The wall is the missing piece, the weapon drought, and the medallion price sitting on the death screen and the clear screen. Grind or pay. Do not sell the piece. Sell the marks they did not farm.
