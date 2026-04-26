/**
 * normalize-stream.js
 * 一次性标准化 stream/stream.m3u
 * 规则：
 *   - 港澳台：走 EPG alias 匹配，标准化 tvg-id/name/logo，group=港澳台
 *   - 棋牌：去掉平台前缀，按内容归类（斗地主/掼蛋），group=棋牌
 *   - 电竞：英雄联盟赛事→英雄联盟，group=电竞
 *   - 影视：去掉平台前缀取内容名，海外影视频道走 EPG 匹配，group=影视
 *   - 体育：走 EPG 匹配，group=体育（含海外体育频道）
 *   - 其他：原样保留
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const LOGO_BASE = 'https://logo.laobaitv.net/';
const CHANNELS_API = 'https://laobaiepg.laobaitv.net/channels.json';

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'normalize-stream/1.0' } }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

// ── 归一化/匹配工具（与 iptv-editor 保持一致） ──────────────────────────────

const T2S = { '臺':'台','衛':'卫','視':'视','電':'电','頻':'频','華':'华','國':'国','際':'际','經':'经','濟':'济','財':'财','軍':'军','農':'农','業':'业','紀':'纪','實':'实','藝':'艺','樂':'乐','體':'体','動':'动','畫':'画','聯':'联','網':'网','訊':'讯','報':'报','綜':'综','節':'节','劇':'剧','廣':'广','東':'东','長':'长','開':'开','運':'运','鳳':'凤','黃':'黄','飛':'飞','時':'时','戰':'战','號':'号','機':'机','愛':'爱','陽':'阳','萬':'万','連':'连','龍':'龙' };
function t2s(str) { let r = ''; for (const c of str) r += T2S[c] || c; return r; }

function normalizeName(name) {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/[\uff01-\uff5e]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/\u3000/g, ' ').replace(/[\s\-_]/g, '')
    .replace(/(高清|标清|hd|4k|8k|uhd|超清|蓝光|hdr|\[hdr\])$/gi, '').trim();
}

const CCTV_REGEX = /^cctv[\-\s]*(\d{1,2}(?:\s*(?:plus|\+|k))?)/i;
function normalizeCCTV(name) {
  const cleaned = name.replace(/[\s\-]/g, '').toLowerCase();
  const m = cleaned.match(CCTV_REGEX);
  if (!m) return null;
  let num = m[1].replace(/\s+/g, '').toLowerCase().replace(/plus/i, '+');
  return 'CCTV' + num.toUpperCase();
}

function buildAliasIndex(channels) {
  const idx = new Map();
  for (const ch of channels) {
    const names = [ch.id, ch.name, ...(ch.aliases || [])].filter(Boolean);
    for (const n of names) {
      if (!idx.has(n)) idx.set(n, ch);
      if (!idx.has(n.toLowerCase())) idx.set(n.toLowerCase(), ch);
      const norm = normalizeName(n);
      if (norm && !idx.has(norm)) idx.set(norm, ch);
      const s = t2s(n);
      if (s !== n) {
        if (!idx.has(s)) idx.set(s, ch);
        const ns = normalizeName(s);
        if (ns && !idx.has(ns)) idx.set(ns, ch);
      }
    }
  }
  return idx;
}

function findChannel(name, idx) {
  if (!name) return null;
  if (idx.has(name)) return idx.get(name);
  const norm = normalizeName(name);
  if (norm && idx.has(norm)) return idx.get(norm);
  const s = t2s(name);
  if (s !== name) {
    if (idx.has(s)) return idx.get(s);
    const ns = normalizeName(s);
    if (ns && idx.has(ns)) return idx.get(ns);
  }
  const cctvId = normalizeCCTV(name);
  if (cctvId && idx.has(cctvId)) return idx.get(cctvId);
  return null;
}

// ── 平台前缀剥离 ──────────────────────────────────────────────────────────────
// 去掉"虎牙 "/"斗鱼 "/"咪咕 "等平台前缀，返回纯内容名
function stripPlatformPrefix(name) {
  return name.replace(/^(虎牙|斗鱼|咪咕|bilibili|B站)\s*/i, '').trim();
}

// ── 棋牌/电竞内容归一化规则 ──────────────────────────────────────────────────
// 返回 { name, logoSlug } 或 null（不处理）
function resolveGameContent(displayName) {
  const stripped = stripPlatformPrefix(displayName);
  // 斗地主系列
  if (/斗地主/.test(stripped)) return { name: '斗地主', logoSlug: '斗地主' };
  // 掼蛋系列
  if (/掼蛋/.test(stripped)) return { name: '掼蛋', logoSlug: '掼蛋' };
  // 英雄联盟
  if (/英雄联盟/.test(stripped)) return { name: '英雄联盟', logoSlug: '英雄联盟' };
  return null;
}

// ── 影视内容名处理 ────────────────────────────────────────────────────────────
function resolveVideoContent(displayName) {
  return stripPlatformPrefix(displayName);
}

// ── 解析 M3U ─────────────────────────────────────────────────────────────────
function parseM3U(content) {
  const lines = content.split(/\r?\n/);
  const entries = [];
  let currentInfo = null;
  for (const line of lines) {
    if (line.startsWith('#EXTINF:')) {
      currentInfo = line;
    } else if (currentInfo && line.trim() && !line.startsWith('#')) {
      entries.push({ info: currentInfo, url: line.trim() });
      currentInfo = null;
    } else if (!line.startsWith('#EXTM3U') && line.trim() === '' && currentInfo) {
      // 空行重置
      currentInfo = null;
    }
  }
  return entries;
}

function getAttr(info, attr) {
  const m = info.match(new RegExp(attr + '="([^"]*)"'));
  return m ? m[1] : '';
}

function getDisplayName(info) {
  const m = info.match(/,(.+)$/);
  return m ? m[1].trim() : '';
}

function setAttr(info, attr, value) {
  const regex = new RegExp(`${attr}="[^"]*"`);
  if (regex.test(info)) return info.replace(regex, `${attr}="${value}"`);
  // 插入到逗号前
  return info.replace(/,/, ` ${attr}="${value}",`);
}

function buildLine(info, updates) {
  let line = info;
  for (const [k, v] of Object.entries(updates)) {
    line = setAttr(line, k, v);
  }
  return line;
}

// ── 主处理逻辑 ────────────────────────────────────────────────────────────────
async function main() {
  const channels = await fetchJSON(CHANNELS_API);
  const idx = buildAliasIndex(channels);

  const inputPath = path.join(__dirname, 'stream/stream.m3u');
  const content = fs.readFileSync(inputPath, 'utf8');
  const entries = parseM3U(content);

  const lines = ['#EXTM3U x-tvg-url="https://epg.laobaitv.net"', ''];
  let stats = { epgMatched: 0, gameNorm: 0, videoNorm: 0, kept: 0 };

  for (const { info, url } of entries) {
    const rawGroup = getAttr(info, 'group-title');
    const displayName = getDisplayName(info);

    // 取 group 第一级（去掉分号后的子分类）
    const baseGroup = rawGroup.split(';')[0].trim();
    // 互联网前缀的 group 去掉"互联网"
    const cleanGroup = baseGroup.replace(/^互联网$/, '其他频道');

    // ── 港澳台：EPG 匹配标准化 ──────────────────────────────
    if (baseGroup === '港澳台') {
      const ch = findChannel(displayName, idx);
      if (ch) {
        stats.epgMatched++;
        const newInfo = buildLine(info, {
          'tvg-id': ch.id,
          'tvg-name': ch.name,
          'tvg-logo': LOGO_BASE + encodeURIComponent(ch.name),
          'group-title': '港澳台',
        }).replace(/,(.+)$/, ',' + ch.name);
        lines.push(newInfo, url, '');
      } else {
        // 匹配不上保留原样，只修正 group
        const newInfo = setAttr(info, 'group-title', '港澳台');
        lines.push(newInfo, url, '');
        stats.kept++;
      }
      continue;
    }

    // ── 棋牌 / 电竞：内容归一化 ────────────────────────────
    if (baseGroup === '互联网' && (rawGroup.includes('棋牌') || rawGroup.includes('电竞'))) {
      const game = resolveGameContent(displayName);
      if (game) {
        stats.gameNorm++;
        const newGroup = rawGroup.includes('电竞') ? '电竞' : '棋牌';
        const newInfo = buildLine(info, {
          'tvg-id': '',
          'tvg-name': game.name,
          'tvg-logo': LOGO_BASE + encodeURIComponent(game.logoSlug),
          'group-title': newGroup,
        }).replace(/,(.+)$/, ',' + game.name);
        lines.push(newInfo, url, '');
      } else {
        lines.push(setAttr(info, 'group-title', rawGroup.includes('电竞') ? '电竞' : '棋牌'), url, '');
        stats.kept++;
      }
      continue;
    }

    // ── 影视（互联网;影视）：去平台前缀，group=影视 ─────────
    if (baseGroup === '互联网' && rawGroup.includes('影视')) {
      const contentName = resolveVideoContent(displayName);
      stats.videoNorm++;
      const newInfo = buildLine(info, {
        'tvg-id': '',
        'tvg-name': contentName,
        'tvg-logo': LOGO_BASE + encodeURIComponent(contentName),
        'group-title': '影视',
      }).replace(/,(.+)$/, ',' + contentName);
      lines.push(newInfo, url, '');
      continue;
    }

    // ── 体育（体育 / 海外体育）：EPG 匹配，group=体育 ──────
    if (baseGroup === '体育' || baseGroup === '海外体育') {
      const ch = findChannel(displayName, idx);
      if (ch) {
        stats.epgMatched++;
        const newInfo = buildLine(info, {
          'tvg-id': ch.id,
          'tvg-name': ch.name,
          'tvg-logo': LOGO_BASE + encodeURIComponent(ch.name),
          'group-title': '体育',
        }).replace(/,(.+)$/, ',' + ch.name);
        lines.push(newInfo, url, '');
      } else {
        lines.push(setAttr(info, 'group-title', '体育'), url, '');
        stats.kept++;
      }
      continue;
    }

    // ── 海外（海外影视）：EPG 匹配，group=影视 ─────────────
    if (baseGroup === '海外' || baseGroup === '海外娱乐') {
      const ch = findChannel(displayName, idx);
      if (ch) {
        stats.epgMatched++;
        const newInfo = buildLine(info, {
          'tvg-id': ch.id,
          'tvg-name': ch.name,
          'tvg-logo': LOGO_BASE + encodeURIComponent(ch.name),
          'group-title': '影视',
        }).replace(/,(.+)$/, ',' + ch.name);
        lines.push(newInfo, url, '');
      } else {
        lines.push(setAttr(info, 'group-title', '影视'), url, '');
        stats.kept++;
      }
      continue;
    }

    // ── 其他：group 清理后原样保留 ─────────────────────────
    stats.kept++;
    const newInfo = setAttr(info, 'group-title', cleanGroup);
    lines.push(newInfo, url, '');
  }

  // 写回
  const output = lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
  fs.writeFileSync(inputPath, output, 'utf8');

  console.log('✅ 标准化完成');
  console.log(`   EPG匹配: ${stats.epgMatched} | 棋牌/电竞归一化: ${stats.gameNorm} | 影视去前缀: ${stats.videoNorm} | 原样保留: ${stats.kept}`);
  console.log('\n处理结果预览:');

  // 预览
  const resultEntries = parseM3U(output);
  for (const { info, url } of resultEntries) {
    const id = getAttr(info, 'tvg-id');
    const name = getAttr(info, 'tvg-name');
    const logo = getAttr(info, 'tvg-logo').replace(LOGO_BASE, '/');
    const group = getAttr(info, 'group-title');
    const display = getDisplayName(info);
    console.log(`[${group}] id="${id}" name="${name}" logo="${logo}" display="${display}"`);
  }
}

main().catch(console.error);
