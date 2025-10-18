import { system, world, EntityTypes} from "@minecraft/server";
import { ActionFormData, ModalFormData, MessageFormData  } from "@minecraft/server-ui"


const version_info = {
  name: "Mob Randomizer",
  version: "v.1.0.0",
  build: "B001",
  release_type: 0, // 0 = Development version (with debug); 1 = Beta version; 2 = Stable version
  unix: 1760803053,
  uuid: "a0295f55-cc32-43da-af55-22e6cd006777",
  changelog: {
    // new_features
    new_features: [
    ],
    // general_changes
    general_changes: [
    ],
    // bug_fixes
    bug_fixes: [
    ]
  }
}

const links = [
  {name: "§l§5Github:§r", link: "github.com/TheFelixLive/mob_randomizer"},
]

console.log("Hello from " + version_info.name + " - "+version_info.version+" ("+version_info.build+") - Further debugging is "+ (version_info.release_type == 0? "enabled" : "disabled" ) + " by the version")

const entity_blocklist = [
  {
    id: "minecraft:agent" // WTF
  },
  {
    id: "minecraft:area_effect_cloud" // WTF
  },
  {
    id: "minecraft:armor_stand"
  },
  {
    id: "minecraft:arrow"
  },
  {
    id: "minecraft:boat"
  },
  {
    id: "minecraft:breeze_wind_charge_projectile"
  },
  {
    id: "minecraft:chest_boat"
  },
  {
    id: "minecraft:chest_minecart"
  },
  {
    id: "minecraft:command_block_minecart"
  },
  {
    id: "minecraft:dragon_fireball"
  },
  {
    id: "minecraft:egg"
  },
  {
    id: "minecraft:ender_crystal"
  },
  {
    id: "minecraft:ender_pearl"
  },
  {
    id: "minecraft:eye_of_ender_signal"
  },
  {
    id: "minecraft:fireball"
  },
  {
    id: "minecraft:fireworks_rocket"
  },
  {
    id: "minecraft:fishing_hook"
  },
  {
    id: "minecraft:hopper_minecart"
  },
  {
    id: "minecraft:lightning_bolt"
  },
  {
    id: "minecraft:lingering_potion"
  },
  {
    id: "minecraft:llama_spit"
  },
  {
    id: "minecraft:minecart"
  },
  {
    id: "minecraft:npc"
  },
  {
    id: "minecraft:ominous_item_spawner"
  },
  {
    id: "minecraft:player" // I can't
  },
  {
    id: "minecraft:shulker_bullet"
  },
  {
    id: "minecraft:small_fireball"
  },
  {
    id: "minecraft:snowball"
  },
  {
    id: "minecraft:splash_potion"
  },
  {
    id: "minecraft:thrown_trident"
  },
  {
    id: "minecraft:tnt"
  },
  {
    id: "minecraft:tnt_minecart"
  },
  {
    id: "minecraft:tripod_camera" // WTF
  },
  {
    id: "minecraft:wind_charge_projectile"
  },
  {
    id: "minecraft:wither_skull"
  },
  {
    id: "minecraft:wither_skull_dangerous"
  },
  {
    id: "minecraft:xp_bottle"
  },
  {
    id: "minecraft:xp_orb"
  },
  {
    id: "minecraft:zombie_horse" // Have you ever found it in survival?
  },
  // Minecraft still has the V1 Villagers in the code, the ones before 1.14, which you will no longer find because they are all replaced by V2 automatically
  {
    id: "minecraft:zombie_villager"
  },
  {
    id: "minecraft:villager"
  },
  // Only available if edu is activated
  {
    id: "minecraft:balloon"
  },
  {
    id: "minecraft:ice_bomb"
  }
]


/*------------------------
  Challenge Communication System V2
-------------------------*/

// Status
let is_initialized = false
let challenge_running = false

system.afterEvents.scriptEventReceive.subscribe(async event=> {
   if (event.id === "ccs:data") {
    let player = event.sourceEntity, data, scoreboard = world.scoreboard.getObjective("ccs_data")

    // Reads data from the scoreboard
    if (scoreboard) {
      try {
        data = JSON.parse(scoreboard.getParticipants()[0].displayName)
      } catch (e) {
        print("Wrong formated data: "+scoreboard.getParticipants()[0]) // Scoreboard IS available but contains garbisch
        world.scoreboard.removeObjective("ccs_data")
        return -1
      }
    } else {
      // print("No Scoreboard!")
      return -1 // Scoreboard is not available: happens when an addon has already processed the request e.g. "open main menu"
    }


    // Initializing
    if (data.event == "ccs_initializing_v2") {
      scoreboard.removeParticipant(JSON.stringify(data))

      data.data.push({
        uuid: version_info.uuid,
        name: version_info.name,
        icon: "textures/ui/bad_omen_effect",
        config_available: true,
        about_available: true,
        incompatibilities: [], // List of UUIDs which are incompatible with this challenge
      })

      is_initialized = true

      // Saves data in to the scoreboard
      scoreboard.setScore(JSON.stringify(data), 1)
    }

    if (!is_initialized) return -1;

    // Will open the configuration menu of the challenge
    if (data.event == "ccs_config" && data.data.target == version_info.uuid) {
      world.scoreboard.removeObjective("ccs_data")
      config(player)
    }

    if (data.event == "ccs_about" && data.data.target == version_info.uuid) {
      world.scoreboard.removeObjective("ccs_data")
      dictionary_about(player)
    }

    // Will start the challenge running scripts
    if ((data.event == "ccs_start" || data.event == "ccs_resume") && data.data.target.includes(version_info.uuid)) {
      scoreboard.removeParticipant(JSON.stringify(data))

      // Removes itself from the target list
      data.data.target = data.data.target.filter(uuid => uuid !== version_info.uuid);

      // Saves data in to the scoreboard
      if (data.data.target.length == 0) world.scoreboard.removeObjective("ccs_data")
      else scoreboard.setScore(JSON.stringify(data), 1)

      if (data.event == "ccs_start") {
        system.run(() => {
          let save_data = load_save_data()
          save_data[0].entity_replace_key = create_entity_replace_key()
          save_data[0].is_in_challenge = true
          update_save_data(save_data)
        });
      }

      challenge_running = true
    }

    // Will stop the challenge running scripts
    if ((data.event == "ccs_stop" || data.event == "ccs_pause") && data.data.target == version_info.uuid) {
      scoreboard.removeParticipant(JSON.stringify(data))

      // Removes itself from the target list
      data.data.target = data.data.target.filter(uuid => uuid !== version_info.uuid);

      // Saves data in to the scoreboard
      if (data.data.target.length == 0) world.scoreboard.removeObjective("ccs_data")
      else scoreboard.setScore(JSON.stringify(data), 1)

      if (data.event == "ccs_stop") {
        system.run(() => {
          let save_data = load_save_data()
          world.sendMessage("§l§7[§fMob Randomizer§7]§r The Seed was: "+save_data[0].seed)
          save_data[0].seed = generateSeed()
          save_data[0].is_in_challenge = false
          update_save_data(save_data)
        });
      }

      challenge_running = false
    }
   }
})

/*------------------------
 Save Data
-------------------------*/

// Creates or Updates Save Data if not present
system.run(() => {
  let save_data = load_save_data();

  const default_save_data_structure = {seed: generateSeed(), entity_replace_key: undefined, is_in_challenge: false};

  if (!save_data) {
      save_data = [default_save_data_structure];
      print("Creating save_data...");
  } else {
      let data_entry = save_data[0];
      let changes_made = false;

      function merge_defaults(target, defaults) {
          for (const key in defaults) {
              if (defaults.hasOwnProperty(key)) {
                  if (!target.hasOwnProperty(key)) {
                      target[key] = defaults[key];
                      changes_made = true;
                  } else if (typeof defaults[key] === 'object' && defaults[key] !== null && !Array.isArray(defaults[key])) {
                      if (typeof target[key] !== 'object' || target[key] === null || Array.isArray(target[key])) {
                          target[key] = defaults[key];
                          changes_made = true;
                      } else {
                          merge_defaults(target[key], defaults[key]);
                      }
                  }
              }
          }
      }

      merge_defaults(data_entry, default_save_data_structure);
      if (!Array.isArray(save_data) || save_data.length === 0) {
          save_data = [data_entry];
          changes_made = true;
      } else {
          save_data[0] = data_entry;
      }

      if (changes_made) {
          print("Missing save_data attributes found and added.");
      }
  }

  update_save_data(save_data);
})

// Load & Save Save data
function load_save_data() {
    let rawData = world.getDynamicProperty("m_r:save_data");

    if (!rawData) {
        return;
    }

    return JSON.parse(rawData);
}

function update_save_data(input) {
  world.setDynamicProperty("m_r:save_data", JSON.stringify(input))
};

/*------------------------
 Helper functions
-------------------------*/

function print(input) {
  if (version_info.release_type === 0) {
    console.log(version_info.name + " - " + JSON.stringify(input))
  }
}

function create_entity_replace_key() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}


function generateSeed(seedString) {
  let seed;
  if (!seedString) {
    seed = BigInt.asIntN(64, BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)) << 32n | BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)));
  } else {
    let hash = 0n;
    for (let i = 0; i < seedString.length; i++) {
      hash = BigInt.asIntN(64, hash * 31n + BigInt(seedString.charCodeAt(i)));
    }
    seed = hash;
  }
  return seed.toString();
}

function markdownToMinecraft(md) {
  if (typeof md !== 'string') return '';

  // normalize newlines
  md = md.replace(/\r\n?/g, '\n');

  const UNSUPPORTED_MSG = '§o§7Tabelles are not supported! Visit GitHub for this.';

  // helper: map admonition type -> minecraft color code (choose sensible defaults)
  function admonColor(type) {
    const t = (type || '').toLowerCase();
    if (['caution', 'warning', 'danger', 'important'].includes(t)) return '§c'; // red
    if (['note', 'info', 'tip', 'hint'].includes(t)) return '§b'; // aqua
    return '§e'; // fallback: yellow
  }

  // inline processor (handles code spans first, then bold/italic/strike, links/images, etc.)
  function processInline(text) {
    if (!text) return '';

    // tokenise code spans to avoid further processing inside them
    const tokens = [];
    text = text.replace(/(`+)([\s\S]*?)\1/g, (m, ticks, code) => {
      const safe = code.replace(/\n+/g, ' '); // inline code -> single line
      const repl = '§7' + safe + '§r';
      tokens.push(repl);
      return `__MD_TOKEN_${tokens.length - 1}__`;
    });

    // images -> unsupported (replace whole image with message)
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, () => UNSUPPORTED_MSG);

    // links -> keep link text only (no URL)
    text = text.replace(/\[([^\]]+)\]\((?:[^)]+)\)/g, '$1');

    // bold: **text** or __text__ -> §ltext§r
    text = text.replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, '§l$2§r');

    // italic: *text* or _text_ -> §otext§r
    // (do after bold so that **...** won't be partially matched)
    text = text.replace(/(\*|_)(?=\S)([\s\S]*?\S)\1/g, '§o$2§r');

    // strikethrough: ~~text~~ -> use italic+gray as fallback (no §m)
    text = text.replace(/~~([\s\S]*?)~~/g, '§o§7$1§r');

    // simple HTML tags or raw tags -> treat as unsupported (avoid exposing markup)
    if (/<\/?[a-z][\s\S]*?>/i.test(text)) return UNSUPPORTED_MSG;

    // restore code tokens
    text = text.replace(/__MD_TOKEN_(\d+)__/g, (m, idx) => tokens[Number(idx)] || '');

    return text;
  }

  // 1) Replace fenced code blocks (```...```) with unsupported message
  md = md.replace(/```[\s\S]*?```/g, () => UNSUPPORTED_MSG);

  // 2) Replace GitHub-style admonition blocks: ::: type\n...\n:::
  md = md.replace(/::: *([A-Za-z0-9_-]+)\s*\n([\s\S]*?)\n:::/gmi, (m, type, content) => {
    // flatten content lines, then process inline inside
    const inner = processInline(content.replace(/\n+/g, ' ').trim());
    const cap = type.charAt(0).toUpperCase() + type.slice(1);
    return `§l${admonColor(type)}${cap}: ${inner}§r`;
  });

  // now process line-by-line for tables / headings / lists / blockquotes / admonitions-as-blockquotes
  const lines = md.split('\n');
  const out = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // trim trailing CR/ spaces
    const raw = line;

    //  ---- detect table: a row with '|' and a following separator row like "| --- | --- |" or "---|---"
    const nextLine = lines[i + 1] || '';
    const isTableRow = /\|/.test(line);
    const nextIsSeparator = /^\s*\|?[:\-\s|]+$/.test(nextLine);
    if (isTableRow && nextIsSeparator) {
      // consume all contiguous table rows
      out.push(UNSUPPORTED_MSG);
      i++; // skip the separator
      while (i + 1 < lines.length && /\|/.test(lines[i + 1])) i++;
      continue;
    }

    //  ---- headings (#, ##, ###) -> §l + content + §r + \n
    const hMatch = line.match(/^(#{1,3})\s*(.*)$/);
    if (hMatch) {
      const content = hMatch[2].trim();
      out.push('§l' + processInline(content) + '§r\n');
      continue;
    }

    //  ---- GitHub-style single-line admonition in > or plain "Caution: ..." at line start
    const admonLineMatch = raw.match(/^\s*(?:>\s*)?(?:\*\*)?(Caution|Warning|Note|Tip|Important|Danger|Info)(?:\*\*)?:\s*(.+)$/i);
    if (admonLineMatch) {
      const type = admonLineMatch[1];
      const content = admonLineMatch[2].trim();
      out.push(`§l${admonColor(type)}${type}: ${processInline(content)}§r`);
      continue;
    }

    //  ---- blockquote lines starting with '>'
    if (/^\s*>/.test(line)) {
      const content = line.replace(/^\s*>+\s?/, '');
      out.push('§o' + processInline(content) + '§r');
      continue;
    }

    //  ---- images or html inline -> unsupported
    if (/^!\[.*\]\(.*\)/.test(line) || /<[^>]+>/.test(line)) {
      out.push(UNSUPPORTED_MSG);
      continue;
    }

    //  ---- unordered list (-, *, +) -> bullet + inline
    if (/^\s*[-*+]\s+/.test(line)) {
      const item = line.replace(/^\s*[-*+]\s+/, '');
      out.push('• ' + processInline(item));
      continue;
    }

    //  ---- ordered list (1. 2. ...) -> bullet as well
    if (/^\s*\d+\.\s+/.test(line)) {
      const item = line.replace(/^\s*\d+\.\s+/, '');
      out.push('• ' + processInline(item));
      continue;
    }

    //  ---- default: process inline formatting
    // empty line -> keep empty
    if (line.trim() === '') {
      out.push('');
      continue;
    }

    out.push(processInline(line));
  }

  // join with newline and return
  return out.join('\n');
}

// Time
function getRelativeTime(diff) {
  let seconds = diff;
  let minutes = Math.floor(seconds / 60);
  let hours = Math.floor(minutes / 60);
  let days = Math.floor(hours / 24);
  let months = Math.floor(days / 30);
  let years = Math.floor(days / 365);

  if (years > 0) {
    return `${years} year${years > 1 ? 's' : ''}`;
  }
  if (months > 0) {
    return `${months} month${months > 1 ? 's' : ''}`;
  }
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}`;
  }
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
  return `a few seconds`;
}

function convertUnixToDate(unixSeconds, utcOffset) {
  const date = new Date(unixSeconds*1000);
  const localDate = new Date(date.getTime() + utcOffset * 60 * 60 * 1000);

  // Format the date (YYYY-MM-DD HH:MM:SS)
  const year = localDate.getUTCFullYear();
  const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(localDate.getUTCDate()).padStart(2, '0');
  const hours = String(localDate.getUTCHours()).padStart(2, '0');
  const minutes = String(localDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(localDate.getUTCSeconds()).padStart(2, '0');

  return {
    day: day,
    month: month,
    year: year,
    hours: hours,
    minutes: minutes,
    seconds: seconds,
    utcOffset: utcOffset
  };
}

// Internet API
async function fetchViaInternetAPI(url, timeoutMs = 20) {
  await system.waitTicks(1); // If mm_host gets initialisiert later

  // Wait until the line (the scoreboard) is free
  let objective = world.scoreboard.getObjective("mm_data");

  if (objective !== undefined) {
    await waitForNoObjective("mm_data");
  }

  world.scoreboard.addObjective("mm_data");
  objective = world.scoreboard.getObjective("mm_data");

  return new Promise((resolve, reject) => {
    try {
      // Payload bauen
      const payload = {
        event: "internet_api",
        data: {
          source: version_info.uuid,
          url: url
        }
      };

      // In Scoreboard schreiben und Event auslösen
      objective.setScore(JSON.stringify(payload), 1);
      world.getDimension("overworld").runCommand("scriptevent multiple_menu:data");

      // State für Cleanup
      let finished = false;
      let timerHandle = null;

      // Helper: safe cleanup (einmalig)
      const cleanup = () => {
        if (finished) return;
        finished = true;
        try { world.scoreboard.removeObjective("mm_data"); } catch (_) {}
        try { system.afterEvents.scriptEventReceive.unsubscribe(subscription); } catch (_) {}
        // Timer stoppen (versuche verschiedene API-Namen)
        try {
          if (timerHandle !== null) {
            if (typeof system.runTimeout === "function") system.runTimeout(timerHandle);
            else if (typeof system.runInterval === "function") system.runInterval(timerHandle);
            else if (typeof clearTimeout === "function") clearTimeout(timerHandle);
            else if (typeof clearInterval === "function") clearInterval(timerHandle);
          }
        } catch (_) {}
      };

      // Subscription für scriptevent
      const subscription = system.afterEvents.scriptEventReceive.subscribe(event => {
        if (event.id !== "multiple_menu:data") return;

        try {
          const board = world.scoreboard.getObjective("mm_data");
          if (!board) {
            // wurde möglicherweise bereits entfernt
            cleanup();
            return reject(new Error("Scoreboard mm_data nicht vorhanden nach Event."));
          }

          const participants = board.getParticipants();
          if (!participants || participants.length === 0) {
            // noch keine Daten — weiterwarten
            return;
          }

          const raw = participants[0].displayName;
          let data;
          try {
            data = JSON.parse(raw);
          } catch (e) {
            cleanup();
            return reject(new Error("Falsches Format im Scoreboard: " + e));
          }

          if (data.event === "internet_api" && data.data && data.data.target === version_info.uuid) {
            try {
              const answer = JSON.parse(data.data.answer);
              cleanup();
              return resolve(answer);
            } catch (e) {
              cleanup();
              return reject(new Error("Antwort konnte nicht als JSON geparst werden: " + e));
            }
          }
          // sonst: nicht für uns bestimmt -> ignorieren
        } catch (e) {
          cleanup();
          return reject(e);
        }
      });

      // Timeout einrichten: system.runTimeout bevorzugen, sonst runInterval-Fallback
      if (typeof system.runTimeout === "function") {
        timerHandle = system.runTimeout(() => {
          if (finished) return;
          cleanup();
          return reject(new Error("Timeout: keine Antwort von der Internet-API innerhalb " + timeoutMs + " ms"));
        }, timeoutMs);
      } else if (typeof system.runInterval === "function") {
        const start = Date.now();
        // poll alle 100ms auf Timeout
        timerHandle = system.runInterval(() => {
          if (finished) return;
          if (Date.now() - start >= timeoutMs) {
            cleanup();
            return reject(new Error("Timeout: keine Antwort von der Internet-API innerhalb " + timeoutMs + " ms"));
          }
        }, 100);
      } else {
        // Kein Timer verfügbar -> sofort aufräumen & Fehler
        cleanup();
        return reject(new Error("Keine Timer-Funktionen verfügbar (kein runTimeout/runInterval)."));
      }

    } catch (err) {
      try { world.scoreboard.removeObjective("mm_data"); } catch (_) {}
      return reject(err);
    }
  });
}

async function waitForNoObjective(name) {
  let obj = world.scoreboard.getObjective(name);
  while (obj) {
    // kleine Pause (z. B. 100ms), um den Server nicht zu blockieren
    await new Promise(resolve => system.runTimeout(resolve, 5)); // 5 Ticks warten
    obj = world.scoreboard.getObjective(name);
  }
}

// Update data (github)
let github_data

system.run(() => {
  update_github_data()
});

async function update_github_data() {
  try {
    fetchViaInternetAPI("https://api.github.com/repos/TheFelixLive/mob_randomizer/releases")
    .then(result => {
      print("API-Antwort erhalten");

      github_data = result.map(release => {
        const totalDownloads = release.assets?.reduce((sum, asset) => sum + (asset.download_count || 0), 0) || 0;
        return {
          tag: release.tag_name,
          name: release.name,
          prerelease: release.prerelease,
          published_at: release.published_at,
          body: release.body,
          download_count: totalDownloads
        };
      });

    })
    .catch(err => {
      print("Fehler beim Abruf: " + err);
    });

  } catch (e) {
  }
}

function compareVersions(version1, version2) {
  if (!version1 || !version2) return 0;

  // Entfernt 'v.' oder 'V.' am Anfang
  version1 = version1.replace(/^v\./i, '').trim();
  version2 = version2.replace(/^v\./i, '').trim();

  // Extrahiere Beta-Nummer aus "_1" oder " Beta 1"
  function extractBeta(version) {
    const betaMatch = version.match(/^(.*?)\s*(?:_|\sBeta\s*)(\d+)$/i);
    if (betaMatch) {
      return {
        base: betaMatch[1].trim(),
        beta: parseInt(betaMatch[2], 10)
      };
    }
    return {
      base: version,
      beta: null
    };
  }

  const v1 = extractBeta(version1);
  const v2 = extractBeta(version2);

  const v1Parts = v1.base.split('.').map(Number);
  const v2Parts = v2.base.split('.').map(Number);

  // Vergleicht Major, Minor, Patch
  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const num1 = v1Parts[i] || 0;
    const num2 = v2Parts[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }

  // Wenn gleich, vergleiche Beta
  if (v1.beta !== null && v2.beta === null) return -1; // Beta < Vollversion
  if (v1.beta === null && v2.beta !== null) return 1;  // Vollversion > Beta

  if (v1.beta !== null && v2.beta !== null) {
    if (v1.beta > v2.beta) return 1;
    if (v1.beta < v2.beta) return -1;
  }

  return 0;
}

function buildEntityRandomizerTable(list, seed) {
  const mulberry32 = s => {
    s >>>= 0;
    return () => {
      let t = (s += 0x6D2B79F5) >>> 0;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t = (t ^ (t + Math.imul(t ^ (t >>> 7), t | 61))) >>> 0;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  const shuffleArray = (arr, seed) => {
    const r = mulberry32(seed);
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const keyOf = e => (e && typeof e === 'object' && 'id' in e) ? e.id : e;
  const keys = list.map(keyOf);
  const pool = list.map(keyOf);

  // Beispiel: anpassbar von außen oder statisch wie vorher
  const fixed = new Map([['minecraft:ender_dragon', 'minecraft:ender_dragon']]);
  const forbidden = new Map([['minecraft:shulker', new Set(['minecraft:blaze'])]]);

  // Ergebnis-Map
  const table = new Map();

  // 1) Fixed-Zuordnungen vornehmen (sofern möglich) und diese Werte aus dem Pool entfernen
  const poolCopy = pool.slice();
  const usedValues = new Set();

  for (const k of keys) {
    if (fixed.has(k)) {
      const want = fixed.get(k);
      // wenn fixed value nicht im Pool vorhanden ist -> fallback
      const idx = poolCopy.findIndex(v => v === want);
      if (idx === -1) {
        console.warn('Fixed value fehlt im Pool:', k, '->', want);
        // Fallback auf Identity-Mapping
        keys.forEach(x => table.set(x, x));
        return table;
      }
      // fixed darf nicht verboten sein für diesen key
      const forbiddenSet = forbidden.get(k) || new Set();
      if (forbiddenSet.has(want)) {
        console.warn('Fixed value ist forbidden für key:', k, '->', want);
        keys.forEach(x => table.set(x, x));
        return table;
      }
      // fest zuordnen und aus pool entfernen (nur ein Exemplar)
      table.set(k, want);
      usedValues.add(want);
      poolCopy.splice(idx, 1);
    }
  }

  // 2) Verbleibenden Pool randomisieren (deterministisch durch seed)
  let availablePool = shuffleArray(poolCopy, seed);

  // 3) Für jeden nicht-fixed Key einen passenden Wert aus availablePool wählen
  for (const k of keys) {
    if (table.has(k)) continue; // already fixed

    const forbiddenSet = forbidden.get(k) || new Set();

    // Finde ersten Index in availablePool, der nicht verboten ist und nicht self (v !== k)
    // (Self-Assignment vermeiden – außer, es wäre fixed oben)
    let foundIdx = -1;
    for (let i = 0; i < availablePool.length; i++) {
      const v = availablePool[i];
      if (forbiddenSet.has(v)) continue;
      if (v === k) continue; // kein self assignment
      foundIdx = i;
      break;
    }

    if (foundIdx === -1) {
      // Kein zulässiger Wert mehr vorhanden -> Fallback
      console.warn('Keine gültige Zuordnung für key:', k, '— Fallback: Identity-Mapping.');
      keys.forEach(x => table.set(x, x));
      return table;
    }

    const chosen = availablePool[foundIdx];
    table.set(k, chosen);
    availablePool.splice(foundIdx, 1); // remove used value
  }

  // Falls alles gut ging: return mapping
  return table;
}

/*------------------------
 Welcome Message
-------------------------*/

world.afterEvents.playerSpawn.subscribe(async (eventData) => {
  const { player, initialSpawn } = eventData;
  if (!initialSpawn) return -1

  await system.waitTicks(40); // Wait for the player to be fully joined

  if (version_info.release_type !== 2 && player.playerPermissionLevel === 2) {
    player.sendMessage("§l§7[§f" + ("System") + "§7]§r "+ player.name +" how is your experiences with "+ version_info.version +"? Does it meet your expectations? Would you like to change something and if so, what? Do you have a suggestion for a new feature? Share it at §l"+links[0].link)
    player.playSound("random.pop")
  }
});

/*------------------------
 Test Menu
-------------------------*/

function config(player) {
  let save_data = load_save_data()
  let seed = save_data[0].seed
  let form = save_data[0].is_in_challenge? new ActionFormData() : new ModalFormData()
  let actions = []

  form.title("Mob Randomizer")

  if (save_data[0].is_in_challenge) {
    form.body("Seed: "+seed)
    form.label("§7The challenge is currently running, more can not be adjusted here!");

    form.divider()
    form.button("");
    actions.push(() => {
      world.scoreboard.addObjective("ccs_data");
      world.scoreboard.getObjective("ccs_data").setScore(JSON.stringify({event: "ccs_main", data:{source: version_info.uuid}}), 1);
      player.runCommand("scriptevent ccs:data");
    });

    form.show(player).then((response) => {
      if (response.selection == undefined ) {
        world.scoreboard.addObjective("ccs_data");
        world.scoreboard.getObjective("ccs_data").setScore(JSON.stringify({event: "ccs_close_menu", data:{target: "main"}}), 1);
        player.runCommand("scriptevent ccs:data");
      }
      if (response.selection !== undefined && actions[response.selection]) {
        actions[response.selection]();
      }
    });
  } else {
    form.textField("Enter a seed for the randomizer", String(seed))

    form.show(player).then((response) => {
      if (response.canceled) {
        world.scoreboard.addObjective("ccs_data");
        world.scoreboard.getObjective("ccs_data").setScore(JSON.stringify({event: "ccs_close_menu", data:{target: "main"}}), 1);
        player.runCommand("scriptevent ccs:data");
        return -1;
      }

      if (response.formValues[0] !== "") {
        if (/^-?\d+$/.test(response.formValues[0])) {
          save_data[0].seed = Number(response.formValues[0]);
        } else {
          save_data[0].seed = generateSeed(response.formValues[0]);
        }
        update_save_data(save_data)
      }
      world.scoreboard.addObjective("ccs_data");
      world.scoreboard.getObjective("ccs_data").setScore(JSON.stringify({event: "ccs_main", data:{source: version_info.uuid}}), 1);
      player.runCommand("scriptevent ccs:data");
    });
  }

}

/*------------------------
 Dictionary
-------------------------*/

function dictionary_about(player) {
  let form = new ActionFormData()
  let actions = []

  let save_data = load_save_data()

  let build_date = convertUnixToDate(version_info.unix, save_data[0].utc || 0);
  form.title("About")

  form.body("§lGeneral")
  form.label(
    "Name: " + version_info.name+ "\n"+
    "UUID: "+ version_info.uuid
  )

  form.label("§lVersion")
  form.label(
    "Version: " + version_info.version + "\n" +
    "Build: " + version_info.build + "\n" +
    "Release type: " + ["dev", "preview", "stable"][version_info.release_type] + "\n" +
    "Build date: " + (getRelativeTime(Math.floor(Date.now() / 1000) - version_info.unix, player) + " ago") + "\n" +
    "Status: " + (github_data? (compareVersions((version_info.release_type === 2 ? github_data.find(r => !r.prerelease)?.tag : github_data[0]?.tag), version_info.version) !== 1? "§aLatest version" : "§6Update available!"): "§cFailed to fetch!")
  );

  form.label("§7© "+ (build_date.year > 2025 ? "2025 - " + build_date.year : build_date.year ) + " TheFelixLive. Licensed under the MIT License.")

  if (version_info.changelog.new_features.length > 0 || version_info.changelog.general_changes.length > 0 || version_info.changelog.bug_fixes.length > 0) {
    form.button("§9Changelog"+(github_data?"s":""));
    actions.push(() => {
      github_data? dictionary_about_changelog(player) : dictionary_about_changelog_legacy(player, build_date)
    });
  }

  form.button("§3Contact");
  actions.push(() => {
    dictionary_contact(player, build_date)
  });

  form.divider()
  form.button("");
  actions.push(() => {
    world.scoreboard.addObjective("ccs_data");
    world.scoreboard.getObjective("ccs_data").setScore(JSON.stringify({event: "ccs_about", data:{target: "main"}}), 1);
    player.runCommand("scriptevent ccs:data");
  });

  form.show(player).then((response) => {
    if (response.selection == undefined ) {
      world.scoreboard.addObjective("ccs_data");
      world.scoreboard.getObjective("ccs_data").setScore(JSON.stringify({event: "ccs_close_menu", data:{target: "main"}}), 1);
      player.runCommand("scriptevent ccs:data");
    }
    if (response.selection !== undefined && actions[response.selection]) {
      actions[response.selection]();
    }
  });
}

function dictionary_about_changelog(player) {
  const form = new ActionFormData();
  let save_data = load_save_data()
  const actions = [];

  // ---- 1) Hilfsdaten ----------------------------------------------------
  const installed   = version_info.version;        // z.B. "v1.5.0"
  const buildName   = version_info.build;          // z.B. "B123"
  const installDate = version_info.unix;           // z.B. "1700000000"

  // ---- 3) Neue Instanzen finden -----------------------------------------
  const latest_stable = github_data.find(r => !r.prerelease);
  let   latest_beta   = github_data.find(r => r.prerelease);

  // ---- 4) Beta-Versions-Filter (nach release_type) --------------------
  if (version_info.release_type === 2) { // „nur Beta zulassen“
    if (latest_beta && latest_stable) {
      const isBetaNewer = compareVersions(latest_beta.name, latest_stable.name) > 0;
      if (isBetaNewer) {
        // Nur die neueste Beta behalten
        github_data = github_data.filter(r => r === latest_beta || !r.prerelease);
      } else {
        // Stable neuer oder gleich → Betas entfernen
        github_data = github_data.filter(r => !r.prerelease);
        latest_beta = undefined;
      }
    } else {
      // Sicherheit: Alle Betas entfernen
      github_data = github_data.filter(r => !r.prerelease);
      latest_beta = undefined;
    }
  } else {
    // Wenn Stable neuer als Beta ist → Beta Label unterdrücken
    if (latest_beta && latest_stable) {
      const isStableNewer = compareVersions(latest_stable.name, latest_beta.name) > 0;
      if (isStableNewer) {
        latest_beta = undefined; // Kein Beta-Label später anzeigen
      }
    }
  }


  // ---- 5) Alle Einträge, inkl. eventuell fehlenden Installations‑Eintrag --
  const allData = [...github_data];

  // Prüfen, ob die installierte Version überhaupt in der Liste vorkommt
  const isInstalledListed = github_data.some(r => r.name === installed);
  if (!isInstalledListed) {
    // Dummy‑Objekt – so sieht es aus wie ein reguläres GitHub‑Release
    allData.push({
      name:        installed,
      published_at: installDate,
      prerelease:  false,          // wichtig, damit das Label nicht „(latest beta)“ bekommt
    });
  }

  // Sortieren (nach Version)
  allData.sort((a, b) => compareVersions(b.name, a.name));

  // ---- 6) UI bauen ----------------------------------------------------
  form.title("About");
  form.body("Select a version");

  allData.forEach(r => {
    // Prüfen, ob r.published_at schon Unix-Sekunden ist
    const publishedUnix = (typeof r.published_at === 'number' && r.published_at < 1e12)
      ? r.published_at // schon in Sekunden
      : Math.floor(new Date(r.published_at).getTime() / 1000); // in Sekunden umrechnen

    let label;
    let build_date = convertUnixToDate(publishedUnix, save_data[0].utc || 0);

    let build_text = (
      save_data[0].utc === undefined
        ? getRelativeTime(Math.floor(Date.now() / 1000) - publishedUnix, player) + " ago"
        : `${build_date.day}.${build_date.month}.${build_date.year}`
    );

    if (r === latest_beta && r.name === installed) {
      label = `${r.name} (${buildName})\n${build_text} §9(latest beta)`;
    } else {
      label = `${r.name}\n${build_text}`;

      if (r === latest_stable) {
        label += ' §a(latest version)';
      } else if (r === latest_beta) {
        label += ' §9(latest beta)';
      } else if (r.name === installed) {
        label += ' §6(installed version)';
      }
    }

    form.button(label);

    actions.push(() => {
      dictionary_about_changelog_view(player, r);
    });
  });


  // ---- 7) Footer‑Button -------------------------------------------------
  form.divider();
  form.button("");
  actions.push(() => {
    dictionary_about(player);
  });

  // ---- 8) Anzeigen -----------------------------------------------------
  form.show(player).then(response => {
    if (response.selection === undefined) {
      world.scoreboard.addObjective("ccs_data");
      world.scoreboard.getObjective("ccs_data").setScore(JSON.stringify({event: "ccs_close_menu", data:{target: "main"}}), 1);
      player.runCommand("scriptevent ccs:data");
    }
    if (actions[response.selection]) actions[response.selection]();
  });
}

function dictionary_about_changelog_view(player, version) {
  let save_data = load_save_data()
  const publishedUnix = (typeof version.published_at === 'number' && version.published_at < 1e12)
  ? version.published_at // schon in Sekunden
  : Math.floor(new Date(version.published_at).getTime() / 1000);

  let build_date = convertUnixToDate(publishedUnix, save_data[0].utc || 0);

  if (version.name == version_info.version) return dictionary_about_changelog_legacy(player, build_date)
  const form = new ActionFormData().title("Changelog - " + version.name);

  // TODO: Markdown support
  form.body(markdownToMinecraft(version.body))


  const dateStr = `${build_date.day}.${build_date.month}.${build_date.year}`;
  const relative = getRelativeTime(Math.floor(Date.now() / 1000) - publishedUnix);
  form.label(`§7As of ${dateStr} (${relative} ago)`);
  form.button("");

  form.show(player).then(res => {
    if (res.selection === 0) dictionary_about_changelog(player);
    else {
      world.scoreboard.addObjective("ccs_data");
      world.scoreboard.getObjective("ccs_data").setScore(JSON.stringify({event: "ccs_close_menu", data:{target: "main"}}), 1);
      player.runCommand("scriptevent ccs:data");
    }
  });
}

function dictionary_about_changelog_legacy(player, build_date) {
  const { new_features, general_changes, bug_fixes } = version_info.changelog;
  const { unix } = version_info
  const sections = [
    { title: "§l§bNew Features§r", items: new_features },
    { title: "§l§aGeneral Changes§r", items: general_changes },
    { title: "§l§cBug Fixes§r", items: bug_fixes }
  ];

  const form = new ActionFormData().title("Changelog - " + version_info.version);

  let bodySet = false;
  for (let i = 0; i < sections.length; i++) {
    const { title, items } = sections[i];
    if (items.length === 0) continue;

    const content = title + "\n\n" + items.map(i => `- ${i}`).join("\n\n");

    if (!bodySet) {
      form.body(content);
      bodySet = true;
    } else {
      form.label(content);
    }

    // Add divider if there's at least one more section with items
    if (sections.slice(i + 1).some(s => s.items.length > 0)) {
      form.divider();
    }
  }

  const dateStr = `${build_date.day}.${build_date.month}.${build_date.year}`;
  const relative = getRelativeTime(Math.floor(Date.now() / 1000) - unix);
  form.label(`§7As of ${dateStr} (${relative} ago)`);
  form.button("");

  form.show(player).then(res => {
    if (res.selection === 0) github_data? dictionary_about_changelog(player) : dictionary_about(player);
    else {
      world.scoreboard.addObjective("ccs_data");
      world.scoreboard.getObjective("ccs_data").setScore(JSON.stringify({event: "ccs_close_menu", data:{target: "main"}}), 1);
      player.runCommand("scriptevent ccs:data");
    }
  });
}

function dictionary_contact(player) {
  let form = new ActionFormData()
  let save_data = load_save_data();

  // This adds information about the dump date and version to ensure whether a dump matches a bug
  save_data.push({ dump_unix:Math.floor(Date.now() / 1000), name:version_info.name, version:version_info.version, build:version_info.build });

  let actions = []
  form.title("Contact")
  form.body("If you need want to report a bug, need help, or have suggestions to improvements to the project, you can reach me via these platforms:\n");

  for (const entry of links) {
    if (entry !== links[0]) form.divider()
    form.label(`${entry.name}\n${entry.link}`);
  }

  if (player.playerPermissionLevel === 2) {
    form.button("Dump SD" + (version_info.release_type !== 2? "\nvia. privat chat" : ""));
    actions.push(() => {
      player.sendMessage("§l§7[§f"+ ("System") + "§7]§r SD Dump:\n"+JSON.stringify(save_data))
      world.scoreboard.addObjective("ccs_data");
      world.scoreboard.getObjective("ccs_data").setScore(JSON.stringify({event: "ccs_close_menu", data:{target: "main"}}), 1);
      player.runCommand("scriptevent ccs:data");
    });

    if (version_info.release_type !== 2) {
      form.button("Dump SD\nvia. server console");
      actions.push(() => {
        print(JSON.stringify(save_data))
        world.scoreboard.addObjective("ccs_data");
        world.scoreboard.getObjective("ccs_data").setScore(JSON.stringify({event: "ccs_close_menu", data:{target: "main"}}), 1);
        player.runCommand("scriptevent ccs:data");
      });
    }
  }
  form.divider()
  form.button("");
  actions.push(() => {
    dictionary_about(player)
  });

  form.show(player).then((response) => {
    if (response.selection == undefined ) {
      world.scoreboard.addObjective("ccs_data");
      world.scoreboard.getObjective("ccs_data").setScore(JSON.stringify({event: "ccs_close_menu", data:{target: "main"}}), 1);
      player.runCommand("scriptevent ccs:data");
    }
    if (response.selection !== undefined && actions[response.selection]) {
      actions[response.selection]();
    }
  });
}

/*------------------------
 Update loop
-------------------------*/

async function update_loop() {
  await system.waitTicks(3);

  if (!is_initialized) {
    for (const player of world.getAllPlayers()) {
      player.sendMessage('§l§4[§cError§4]§r The timer is not installed correctly! Check that the timer is active and has the correct CCS version.');
      player.playSound("random.pop");
    }
    return -1;
  }


  while (true) {

    if (challenge_running) {
      const save_data = load_save_data();
      const seed = save_data[0].seed;

      const blocklistIds = new Set(entity_blocklist.map(e => e.id));

      const fullEntityTypes = EntityTypes.getAll().filter(e => !blocklistIds.has(e.id));

      const entityMap = buildEntityRandomizerTable(fullEntityTypes, seed);
      const getMappedType = (typeId) => (entityMap instanceof Map) ? entityMap.get(typeId) : entityMap[typeId];

      const trySpawn = (dim, newType, location) => {
        try {
          return dim.spawnEntity(newType, location);
        } catch (err) {
          print(`spawnEntity failed ${newType} for location ${JSON.stringify(location)}: ${err}`);
          return null;
        }
      };

      for (const player of world.getAllPlayers()) {
        const dim = player.dimension;
        const entities = dim.getEntities();

        for (const entity of entities) {
          if (entity.typeId === "minecraft:player" || entity.getDynamicProperty("m_r:key") == save_data[0].entity_replace_key) continue;

          const newType = getMappedType(entity.typeId);
          if (!newType || newType === entity.typeId) continue;

          const location = entity.location;
          entity.remove();

          const spawned = trySpawn(dim, newType, location);
          if (spawned) spawned.setDynamicProperty("m_r:key", save_data[0].entity_replace_key)

        }
      }
    }

    await system.waitTicks(1);
  }
}

system.run(() => update_loop());