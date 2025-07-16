const CORS_PROXY = 'https://corsproxy.io/?';
const IMAGE_BASE = 'https://ddragon.leagueoflegends.com/cdn/15.13.1/img/item/';
const DATA_URL = 'https://ddragon.leagueoflegends.com/cdn/15.13.1/data/en_US/item.json';
const PROXIED_URL = `${CORS_PROXY}${encodeURIComponent(DATA_URL)}`;

function decodeHTML(html) {
  const txt = document.createElement('textarea');
  txt.innerHTML = html;
  return txt.value;
}

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

async function fetchItems() {
  try {
    const res = await fetch(PROXIED_URL);
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

      if (
        maps?.["11"] && // Summoner's Rift
        gold?.purchasable &&
        depth === 3 &&
        !tags?.includes("Boots")
      ) {

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

function displayItems(items) {
  const container = document.getElementById('item-container');
  container.innerHTML = '';

  Object.values(items).forEach(item => {
    const row = document.createElement('div');
    row.className = 'item-row';

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
        ? `<div>
            <h3>Stats</h3>
            <ul class="clean-list">
              ${stats.map(stat => `<li>${stat}</li>`).join('')}
            </ul>
          </div>`
        : ''}
    `;


    const adjustedCol = document.createElement('div');
    adjustedCol.className = 'item-column';
    adjustedCol.innerHTML = `
      <h2>${item.name}<br>*Masterwork*</h2>
      <img src="${item.image}" alt="${item.name}">
      <p>(awaiting formula)</p>

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
        ? `<div>
            <h3>Stats</h3>
            <ul class="clean-list">
              ${stats.map(stat => `<li>${stat}</li>`).join('')}
            </ul>
          </div>`
        : ''}
    `;

    row.appendChild(originalCol);
    row.appendChild(adjustedCol);
    container.appendChild(row);
  });
}

fetchItems();
