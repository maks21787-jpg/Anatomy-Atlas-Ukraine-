# Жіноча модель (тулуб) — джерела й ліцензія

Файли в цій теці (`atlas.json`, `body-*.bin`, `body-*.bin.gz`, `names-uk.json`, `names-la.json`) поширюються за ліцензією **Creative Commons Attribution 4.0 International (CC BY 4.0)**: https://creativecommons.org/licenses/by/4.0/

## Ланцюжок авторства

1. **Visible Human Female** — U.S. National Library of Medicine, National Institutes of Health. https://www.nlm.nih.gov/research/visible/visible_human.html
2. **Human Reference Atlas (HRA) 3D Reference Organ Library**, HuBMAP Consortium / NIH, digital object `ref-organ/united-female` v1.5. CC BY 4.0. https://humanatlas.io/ · https://cdn.humanatlas.io/digital-objects/ref-organ/united-female/v1.5/  
   Цитування: Börner K, et al. Human Reference Atlas.
3. **Вибірка й латинська номенклатура Anatria3D**: 264 структури з 888, зіставлені з Terminologia Anatomica 2, стиснення Draco. Файли `public/anatomy/*_female.glb` і `manifest_female.json` з https://github.com/Nurkan1/Anatria-3D (для цих файлів — CC BY 4.0; код Anatria3D тут не використано).
4. **Зміни в цьому атласі**: перетворення у формат переглядача (`scripts/convert-female-hra.mjs`), зварювання збіжних вершин, спрощення геометрії meshoptimizer з межею відносної похибки 0,2 % для кожної структури, групування структур за ієрархією джерела, український переклад назв.

Модель охоплює тулуб (хребет, таз, органи черевної порожнини й малого таза, судини, молочні залози), а не все тіло. Атлас навчальний і не призначений для діагностики.
