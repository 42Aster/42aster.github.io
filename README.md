# Page for League of legends Masterwork items
# Champion: Ornn

### To get to the the visual interface [click here](https://42aster.github.io/)

## Overview

The webpage utilizes two of Riot's data endpoints (registered under Data Dragon):
 - https://ddragon.leagueoflegends.com/cdn/15.13.1/data/en_US/item.json
 - https://ddragon.leagueoflegends.com/cdn/15.13.1/img/item/item-id.png

The items are filtered using multiple attributes:
 - `maps` = **11** (*Summoner's Rift*)
 - `gold.purchaseable` = **true**
 - `depth` = **3**
 - `tags` *exclude* **Boots**
 - `id` *duplicated `id`s which add 2 digits in front, but are the same item*

## To do

- [x] Loading items and images from enpoints
- [ ] Checking if there are only the right items
- [x] Formatting the stats + making sure the stats are correct
- [ ] Masterwork item image differentiation 
- [ ] Implementing the formula for masterwork items




