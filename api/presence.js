// Shared party state: who's online, everyone's score, and the party feed.
// Backed by Upstash Redis (Vercel Marketplace) over its REST API, so no npm deps.

const PLAYERS_KEY = 'bingo:players';
const FEED_KEY = 'bingo:feed';
const ONLINE_WINDOW_MS = 25 * 1000;
const STALE_PLAYER_MS = 12 * 60 * 60 * 1000;
const FEED_LENGTH = 40;
const KEY_TTL_SECONDS = 2 * 24 * 60 * 60;
const INBOX_LENGTH = 20;
const MAX_SPOTS_PER_REQUEST = 5;
const FULL_BOARD_SCORE = 24;
const FULL_BOARD_LINES = [
  'filled the entire board #GGFrickinEazyyyyy #GOAT 😼',
  'filled the whole board. Somebody give them a crown 👑',
  'knows more about you than you do 🕵️',
  'is wayyyy too popular 🙄 how tf do you even fill out the whole board'
];

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(commands) {
  const response = await fetch(`${REDIS_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(commands)
  });

  if (!response.ok) {
    throw new Error(`Redis request failed: ${response.status}`);
  }

  const results = await response.json();
  return results.map((entry) => {
    if (entry.error) {
      throw new Error(entry.error);
    }
    return entry.result;
  });
}

function inboxKey(playerId) {
  return `bingo:inbox:${playerId}`;
}

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

function toPlayerMap(hashResult) {
  const players = {};
  for (let index = 0; index < (hashResult || []).length; index += 2) {
    const player = parseJson(hashResult[index + 1]);
    if (player) {
      players[hashResult[index]] = player;
    }
  }
  return players;
}

function cleanText(value, maxLength, fallback) {
  const text = typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
  return text || fallback;
}

function cleanInt(value, max) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) ? Math.min(Math.max(number, 0), max) : 0;
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  return parseJson(req.body) || {};
}

function buildSnapshot(players, feed, now) {
  const list = Object.entries(players)
    .filter(([, player]) => now - player.lastSeen < STALE_PLAYER_MS)
    .map(([id, player]) => ({
      id,
      name: player.name,
      emoji: player.emoji,
      score: player.score,
      bingos: player.bingos,
      online: !player.left && now - player.lastSeen < ONLINE_WINDOW_MS
    }));

  return {
    now,
    players: list,
    onlineCount: list.filter((player) => player.online).length,
    feed: (feed || []).map(parseJson).filter(Boolean)
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (!REDIS_URL || !REDIS_TOKEN) {
    res.status(503).json({ error: 'Shared storage is not configured.' });
    return;
  }

  const now = Date.now();

  try {
    if (req.method === 'GET') {
      const [playerHash, feed] = await redis([
        ['HGETALL', PLAYERS_KEY],
        ['LRANGE', FEED_KEY, 0, FEED_LENGTH - 1]
      ]);
      res.status(200).json(buildSnapshot(toPlayerMap(playerHash), feed, now));
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed.' });
      return;
    }

    const body = readBody(req);
    const id = cleanText(body.id, 64, '');
    if (!id) {
      res.status(400).json({ error: 'Missing player id.' });
      return;
    }

    const isLeaving = body.leave === true;
    const secret = cleanText(body.secret, 64, '');
    const [playerHash, feed, inbox] = await redis([
      ['HGETALL', PLAYERS_KEY],
      ['LRANGE', FEED_KEY, 0, FEED_LENGTH - 1],
      ['LRANGE', inboxKey(id), 0, INBOX_LENGTH - 1]
    ]);
    const players = toPlayerMap(playerHash);
    const previous = players[id];

    // Player ids are visible to everyone, so a per-device secret stops other phones from
    // posting as someone else (and reading their private spotted notifications).
    if (previous && previous.secret && previous.secret !== secret) {
      res.status(403).json({ error: 'This player belongs to another device.' });
      return;
    }

    const player = {
      name: cleanText(body.name, 40, 'Guest'),
      emoji: cleanText(body.emoji, 16, '🐸'),
      score: cleanInt(body.score, 24),
      bingos: cleanInt(body.bingos, 12),
      lastSeen: now,
      left: isLeaving,
      secret: secret || (previous && previous.secret) || ''
    };
    players[id] = player;

    const events = [];
    const addEvent = (type, text) => {
      events.push({ id: `${now}-${id}-${type}`, type, playerId: id, emoji: player.emoji, name: player.name, text });
    };
    if (!previous) {
      addEvent('join', 'joined the party');
    } else if (previous.left && !player.left && now - previous.lastSeen > 10 * 60 * 1000) {
      addEvent('return', 'is back');
    }
    if (previous && (previous.name !== player.name || previous.emoji !== player.emoji)) {
      addEvent('rename', `is the new look for ${previous.emoji} ${previous.name}`);
    }
    const isFullBoard =player.score === FULL_BOARD_SCORE && (!previous || previous.score < FULL_BOARD_SCORE);
    if (isFullBoard) {
      addEvent('fullBoard', FULL_BOARD_LINES[Math.floor(Math.random() * FULL_BOARD_LINES.length)]);
    } else if (previous && player.score > previous.score) {
      addEvent('score', `is up to ${player.score} square${player.score === 1 ? '' : 's'}`);
    }
    if (!isFullBoard && player.bingos > (previous ? previous.bingos : 0)) {
      addEvent('bingo', player.bingos > 1 ? `got another BINGO bitchesss! 🤙😎 (${player.bingos} lines) 🎉` : 'got BINGO! 🤪');
    }

    const writes = [
      ['HSET', PLAYERS_KEY, id, JSON.stringify(player)],
      ['EXPIRE', PLAYERS_KEY, KEY_TTL_SECONDS]
    ];
    const newFeedEntries = events.map((event) => JSON.stringify({ ...event, at: now }));
    if (newFeedEntries.length) {
      writes.push(['LPUSH', FEED_KEY, ...newFeedEntries]);
      writes.push(['LTRIM', FEED_KEY, 0, FEED_LENGTH - 1]);
      writes.push(['EXPIRE', FEED_KEY, KEY_TTL_SECONDS]);
    }
    // Spots go only to the spotted player's private inbox, never the shared feed, so other
    // guests with the same square don't get the answer.
    const spots = (Array.isArray(body.spots) ? body.spots : []).slice(0, MAX_SPOTS_PER_REQUEST);
    spots.forEach((spot, index) => {
      const targetId = cleanText(spot && spot.targetId, 64, '');
      const prompt = cleanText(spot && spot.prompt, 160, '');
      if (!targetId || targetId === id || !players[targetId] || !prompt) {
        return;
      }
      const notification = { id: `${now}-${id}-${index}`, fromName: player.name, fromEmoji: player.emoji, prompt, at: now };
      writes.push(['LPUSH', inboxKey(targetId), JSON.stringify(notification)]);
      writes.push(['LTRIM', inboxKey(targetId), 0, INBOX_LENGTH - 1]);
      writes.push(['EXPIRE', inboxKey(targetId), KEY_TTL_SECONDS]);
    });

    // A leave beacon's response is never read, so keep the inbox for the next visit.
    const spotted = isLeaving ? [] : (inbox || []).map(parseJson).filter(Boolean).reverse();
    if (spotted.length) {
      // New spots are pushed to the head, so trim only the delivered ones off the tail.
      writes.push(['LTRIM', inboxKey(id), 0, -(spotted.length + 1)]);
    }

    const staleIds = Object.keys(players).filter((playerId) => now - players[playerId].lastSeen >= STALE_PLAYER_MS);
    if (staleIds.length) {
      writes.push(['HDEL', PLAYERS_KEY, ...staleIds]);
    }
    await redis(writes);

    const combinedFeed = [...newFeedEntries.reverse(), ...(feed || [])].slice(0, FEED_LENGTH);
    res.status(200).json({ ...buildSnapshot(players, combinedFeed, now), spotted });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not reach shared storage.' });
  }
};
