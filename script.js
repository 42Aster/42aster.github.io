// Date: 2025-16-07
// Version: 01.01.1
// This program fetches and displays League of Legends items for Ornn
// 
// ------------------------- SCRIPT LOGIC ---------------------------------


// Utility function to decode HTML entities
function decodeHTML(html) {
  const txt = document.createElement('textarea');
  txt.innerHTML = html;
  return txt.value;
}

// Function to extract and clean item descriptions
// It processes the raw HTML to extract stats, passives, and active attributes
function extractCleanDescription(rawHtml) {
  const html = decodeHTML(rawHtml);

  const result = {
    stats: [],
    passives: {},
    active: null
  };

  // Extract <stats>
  const statsMatch = html.match(/<stats>(.*?)<\/stats>/s);
  if (statsMatch) {
    const statsRaw = statsMatch[1];
    const statsLines = statsRaw.split(/<br\s*\/?>/i);
    result.stats = statsLines
      .map(line => stripTags(line).trim())
      .filter(line => line.length > 0);
  }

  // Extract all <passive> blocks
  const passiveRegex = /<passive>(.*?)<\/passive>\s*<br\s*\/?>\s*(.*?)(?=(<passive>|<active>|<\/mainText>))/gis;
  let passiveMatch;
  while ((passiveMatch = passiveRegex.exec(html)) !== null) {
    const name = stripTags(passiveMatch[1]).trim();
    const description = stripTags(passiveMatch[2]).trim();
    if (name && description) {
      result.passives[name] = { description };
    }
  }

  // Extract the first <active> block
  const activeRegex = /<active>(.*?)<\/active>\s*<br\s*\/?>\s*(.*?)(?=(<passive>|<\/mainText>))/is;
  const activeMatch = html.match(activeRegex);
  if (activeMatch) {
    const name = stripTags(activeMatch[1]).trim();
    const description = stripTags(activeMatch[2]).trim();
    result.active = { name, description };
  }

  return result;
}

// Utility to strip all HTML-like tags
function stripTags(str) {
  return str.replace(/<\/?[^>]+>/g, '');
}

// ------------------------- MASTERWORK LOGIC ---------------------------------

const goldValues = {
  "Ability Haste": 31.25,
  "Ability Power": 20,
  "Attack Damage": 35,
  "Attack Speed": 30,
  "Armor": 20,
  "Magic Resistance": 18,
  "Health": 2.6, // Default value, other than that handled separately
};

const healthGoldValues = {
  1: 2.666666666666,
  2: 2.702702702702,
  3: 2.666666666666,
  4: 2.777777777777,
};

const goldPerItem = 1000; // Total gold available for upgrade

// Function to adjust stats based on the gold values
function adjustStats(stats) {
  // Parse stats to extract valid upgradeable ones
  const parsedStats = stats.map(s => {
    const match = s.match(/^(\d+(?:\.\d+)?)\s(.+)$/);
    return match ? { original: s, value: Number(match[1]), name: match[2].trim() } : { original: s, value: null, name: null };
  });

  // Count only upgradeable stats
  const upgradeableCount = parsedStats.filter(stat => goldValues.hasOwnProperty(stat.name)).length;

  // Map back to adjusted stat strings
  return parsedStats.map(stat => {
    if (!goldValues.hasOwnProperty(stat.name)) {
      return stat.original; // Return unmodified stats
    }
    // Calculate the gold pool available to upgrade each stat
    let goldPoolPerStat = goldPerItem / (upgradeableCount || 1);

    let newValue;
    if (stat.name === "Health") {
      const goldPerPoint = healthGoldValues[upgradeableCount] || goldValues[stat.name];
      newValue = stat.value + (goldPoolPerStat / goldPerPoint);
    } else {
      const goldPerPoint = goldValues[stat.name];
      newValue = stat.value + (goldPoolPerStat / goldPerPoint);
    }

    return `${newValue.toFixed(2)} ${stat.name}`;
  });
}

// Function to fetch items from the API
// It filters items based on specific criteria
async function fetchItems(version) {
  const IMAGE_BASE = `https://ddragon.leagueoflegends.com/cdn/${version}/img/item/`;
  const DATA_URL = `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/item.json`;

  try {
    const res = await fetch(DATA_URL);
    const json = await res.json();
    const items = json.data;

    const baseIDs = new Set();

    // Collect 4 digit IDs to filter duplicates
    for (const id of Object.keys(items)) {
    if (id.length === 4) {
        baseIDs.add(id);
        }
    }

    const filteredItems = {};

    for (const [id, item] of Object.entries(items)) {
      const {
        maps,
        gold,
        depth,
        description,
        name,
        plaintext,
        tags,
        stats
      } = item;

      const last4 = id.slice(-4);
      if (id.length > 4 && baseIDs.has(last4)) {
        continue; // Skip duplicate
      }

      // Filter items based on specific criteria
      // 1. Must be purchasable (gold.purchasable)
      // 2. Must be from Summoner's Rift (maps["11"])
      // 3. Must be at depth === 3 OR depth === 2 AND the item does not have the "into" property.
      // 4. Must not be a type of Boots (tags.includes("Boots") === false)
      if (
        maps?.["11"] &&                    // Summoner's Rift
        gold?.purchasable &&
        !tags?.includes("Boots") &&
        (
          depth === 3 || 
          (depth === 2 && !item.hasOwnProperty("into"))
        )
      ) 
      {
        // Prepare the item data
        const cleanDescription = extractCleanDescription(description || '');

        filteredItems[id] = {
          id,
          name,
          stats,
          plaintext,
          description: cleanDescription,
          image: `${IMAGE_BASE}${id}.png`
        };
      }
    }

    console.log('#Items:', Object.keys(filteredItems).length); // Approx. 101

    displayItems(filteredItems);
  } catch (err) {
    console.error('Error fetching or parsing items:', err);
  }
}


// Function to display items in the HTML
// It creates two columns: original and adjusted
function displayItems(items) {
  const container = document.getElementById('item-container');
  container.innerHTML = '';

  Object.values(items).forEach(item => {
    const row = document.createElement('div');
    row.className = 'item-row';
    row.setAttribute('data-name', item.name.toLowerCase());

    const { stats, passives, active, description } = item.description;

    const originalCol = document.createElement('div');
    originalCol.className = 'item-column';
    originalCol.innerHTML = `
      <h2>${item.name}<br>(ID: ${item.id})</h2>
      <img src="${item.image}" alt="${item.name}">

      ${item.plaintext
        ? `<p><em>${item.plaintext}</em></p>`
        : ''}

      ${passives && Object.keys(passives).length
        ? `<div>
            <h3>Passives</h3>
            <ul class="clean-list">
              ${Object.entries(passives)
                .map(([name, data]) => `<li><strong>${name}:</strong> ${data.description}</li>`)
                .join('')}
            </ul>
          </div>`
        : ''}

      ${active
        ? `<div>
            <h3>Active</h3>
            <p><strong>${active.name}:</strong> ${active.description}</p>
          </div>
          `
        : ''}

      ${description
        ? `<div>
            <h3>Description</h3>
            <p>${description}</p>
          </div>`
        : ''}

      ${stats && stats.length
        ? `<div class="stats">
            <h3>Stats</h3>
            <ul class="clean-list">
              ${stats.map(stat => `<li>${stat}</li>`).join('')}
            </ul>
          </div>`
        : ''}
    `;

    // Adjust stats for Masterwork items
    const adjustedStats = adjustStats(stats || []);        

    const adjustedCol = document.createElement('div');
    adjustedCol.className = 'item-column';
    adjustedCol.innerHTML = `
      <h2>${item.name}<br>*Masterwork*</h2>
      <div class="corrupt-container">
        <img src="${item.image}" alt="${item.name}" class="corrupt-image">

        <svg class="corrupt-overlay" viewBox="0 0 64 64" width="64" height="64" preserveAspectRatio="none">
          <defs>
            <filter id="veinCorruption" x="0" y="0" width="100%" height="100%">
              <!-- High-detail fractal noise -->
              <feTurbulence type="fractalNoise" baseFrequency="0.45" numOctaves="4" result="turbulence" />

              <!-- Strong contrast boost -->
              <feComponentTransfer in="turbulence" result="highContrast">
                <feFuncR type="gamma" amplitude="3" exponent="0.9" offset="0"/>
                <feFuncG type="gamma" amplitude="2" exponent="1" offset="0"/>
                <feFuncB type="gamma" amplitude="1" exponent="1.3" offset="0"/>
                <feFuncA type="linear" slope="1"/>
              </feComponentTransfer>

              <!-- Vein coloring: intense reds & oranges -->
              <feColorMatrix in="highContrast" type="matrix"
                values="2.5 0.4 0   0  0
                        0.3 1.8 0.1 0  0
                        0.1 0.2 0.5 0  0
                        0   0   0   1  0"
                result="coloredVeins" />

              <!-- Blend with source image -->
              <feBlend in="SourceGraphic" in2="coloredVeins" mode="screen"/>
            </filter>
          </defs>

          <!-- Rectangle that applies the filter -->
          <rect x="0" y="0" width="64" height="64" fill="transparent" filter="url(#veinCorruption)" />
        </svg>

      </div>

      ${item.plaintext
        ? `<p><em>${item.plaintext}</em></p>`
        : ''}

      ${passives && Object.keys(passives).length
        ? `<div>
            <h3>Passives</h3>
            <ul class="clean-list">
              ${Object.entries(passives)
                .map(([name, data]) => `<li><strong>${name}:</strong> ${data.description}</li>`)
                .join('')}
            </ul>
          </div>`
        : ''}

      ${active
        ? `<div>
            <h3>Active</h3>
            <p><strong>${active.name}:</strong> ${active.description}</p>
          </div>
          `
        : ''}

      ${description
        ? `<div>
            <h3>Description</h3>
            <p>${description}</p>
          </div>`
        : ''}

      ${adjustedStats && adjustedStats.length
        ? `<div class="stats">
            <h3>Stats</h3>
            <ul class="clean-list">
              ${adjustedStats.map(stat => `<li>${stat}</li>`).join('')}
            </ul>
          </div>`
        : ''}
    `;

    row.appendChild(originalCol);
    row.appendChild(adjustedCol);
    container.appendChild(row);
  });
}

// ------------------------- SEARCH LOGIC ---------------------------------

document.getElementById('search-button').addEventListener('click', () => {
  const query = document.getElementById('search-input').value.toLowerCase().trim();
  const itemRows = document.querySelectorAll('.item-row');

  itemRows.forEach(row => {
    const name = row.getAttribute('data-name');
    if (name.includes(query)) {
      row.style.display = 'flex';
    } else {
      row.style.display = 'none';
    }
  });
});

document.getElementById('search-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('search-button').click();
  }
});

// ------------------------- MAIN LOGIC ---------------------------------

document.addEventListener('DOMContentLoaded', () => {
  const versionSelect = document.getElementById('version-select');

  let currentVersion = versionSelect.value;

  versionSelect.addEventListener('change', async () => {
    currentVersion = versionSelect.value;
    await fetchItems(currentVersion);
  });

  fetchItems(currentVersion); // Initial load
});

