/**
 * normalize-stream.js
 * 一次性标准化 stream/stream.m3u
 * 规则：
 *   - 港澳台：走 EPG alias 匹配，标准化 tvg-id/name/logo，group=港澳台
 *   - 棋牌：去掉平台前缀后保留原名（tvg-name/显示名），logo 用内容关键词（斗地主/掼蛋），group=棋牌
 *   - 电竞：英雄联盟赛事→tvg-name/显示名保留"英雄联盟赛事"，logo 用"英雄联盟"，group=电竞
 *   - 影视：去掉平台前缀取内容名，特殊映射（电影轮播→周星驰），group=影视
 *   - 体育：走 EPG 匹配，group=体育（含海外体育频道）
 *   - Cloudflare TV：group-title 保留原样
 *   - 其他：原样保留
 *
 * EXTINF 属性顺序：tvg-id → tvg-name → tvg-logo → group-title
 * Logo slug：先去空格再 encodeURIComponent（URL 无 %20）
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

// ── Logo URL 生成（去空格后再 encode） ─────────────────────────────────────────
function logoUrl(slug) {
  return LOGO_BASE + encodeURIComponent(slug.replace(/\s+/g, ''));
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
function stripPlatformPrefix(name) {
  return name.replace(/^(虎牙|斗鱼|咪咕|bilibili|B站)\s*/i, '').trim();
}

// ── 棋牌内容处理 ─────────────────────────────────────────────────────────────
// 返回 { name, logoSlug } —— name=去前缀后的原名，logoSlug=内容关键词
function resolveGameContent(displayName) {
  const stripped = stripPlatformPrefix(displayName);
  if (/斗地主/.test(stripped)) return { name: stripped, logoSlug: '斗地主' };
  if (/掼蛋/.test(stripped)) return { name: stripped, logoSlug: '掼蛋' };
  return null;
}

// ── 电竞内容处理 ─────────────────────────────────────────────────────────────
// 返回 { name, logoSlug } —— name 保留原名，logoSlug 用大类
function resolveEsportsContent(displayName) {
  const stripped = stripPlatformPrefix(displayName);
  if (/英雄联盟/.test(stripped)) return { name: stripped, logoSlug: '英雄联盟' };
  return null;
}

// ── 影视内容处理 ─────────────────────────────────────────────────────────────
// 特殊映射 + 去平台前缀
const VIDEO_SPECIAL_MAP = {
  '电影轮播': '周星驰',
  '电影轮播-1': '电影轮播',
};

function resolveVideoContent(displayName) {
  const stripped = stripPlatformPrefix(displayName);
  // 检查特殊映射
  if (VIDEO_SPECIAL_MAP[stripped]) return VIDEO_SPECIAL_MAP[stripped];
  // 去掉尾部 -数字 后缀（如 蜡笔小新-2 → 蜡笔小新）
  return stripped.replace(/-\d+$/, '').trim();
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

// ── 重建 EXTINF 行（保证属性顺序：tvg-id → tvg-name → tvg-logo → group-title）──
function rebuildInfoLine(tvgId, tvgName, tvgLogo, groupTitle, displayName) {
  return `#EXTINF:-1 tvg-id="${tvgId}" tvg-name="${tvgName}" tvg-logo="${tvgLogo}" group-title="${groupTitle}",${displayName}`;
}

// ── 判断 group 归属（兼容原始和已处理过的数据）──────────────────────────────
function classifyGroup(rawGroup) {
  const base = rawGroup.split(';')[0].trim();
  // 已处理过的 clean group
  if (base === '港澳台') return '港澳台';
  if (base === '棋牌') return '棋牌';
  if (base === '电竞') return '电竞';
  if (base === '影视') return '影视';
  if (base === '体育') return '体育';
  if (base === '海外体育') return '体育';
  if (base === '海外' || base === '海外娱乐') return '海外影视';
  // 原始 group 格式
  if (base === '互联网直播频道' || base === '互联网') {
    if (rawGroup.includes('棋牌')) return '棋牌';
    if (rawGroup.includes('电竞')) return '电竞';
    if (rawGroup.includes('影视')) return '影视';
    return '其他';
  }
  // 特殊：Cloudflare TV 等带自定义 group 的保留原样
  if (rawGroup.includes('老白TV赞助')) return 'cloudflare';
  return '其他';
}

// ── 主处理逻辑 ────────────────────────────────────────────────────────────────
async function main() {
  const channels = await fetchJSON(CHANNELS_API);
  const idx = buildAliasIndex(channels);

  const inputPath = path.join(__dirname, 'stream/stream.m3u');
  const content = fs.readFileSync(inputPath, 'utf8');
  const entries = parseM3U(content);

  const lines = ['#EXTM3U x-tvg-url="https://epg.laobaitv.net"', ''];
  let stats = { epgMatched: 0, gameNorm: 0, esportsNorm: 0, videoNorm: 0, kept: 0 };

  for (const { info, url } of entries) {
    const rawGroup = getAttr(info, 'group-title');
    const displayName = getDisplayName(info);
    const category = classifyGroup(rawGroup);

    // ── 港澳台：EPG 匹配标准化 ──────────────────────────────
    if (category === '港澳台') {
      const ch = findChannel(displayName, idx);
      if (ch) {
        stats.epgMatched++;
        lines.push(rebuildInfoLine(ch.id, ch.name, logoUrl(ch.name), '港澳台', ch.name), url, '');
      } else {
        // 匹配不上：保留原 tvg-name/displayName，修正 logo 和 group
        const tvgName = getAttr(info, 'tvg-name') || displayName;
        const tvgId = getAttr(info, 'tvg-id') || '';
        lines.push(rebuildInfoLine(tvgId, tvgName, logoUrl(tvgName), '港澳台', displayName), url, '');
        stats.kept++;
      }
      continue;
    }

    // ── 棋牌：去平台前缀保留原名，logo 归一 ─────────────────
    if (category === '棋牌') {
      const game = resolveGameContent(displayName);
      if (game) {
        stats.gameNorm++;
        lines.push(rebuildInfoLine('', game.name, logoUrl(game.logoSlug), '棋牌', game.name), url, '');
      } else {
        // 无法归类的棋牌频道，保留原样但修正格式
        const stripped = stripPlatformPrefix(displayName);
        lines.push(rebuildInfoLine('', stripped, logoUrl(stripped), '棋牌', stripped), url, '');
        stats.kept++;
      }
      continue;
    }

    // ── 电竞：logo 用大类，name 保留 ────────────────────────
    if (category === '电竞') {
      const esports = resolveEsportsContent(displayName);
      if (esports) {
        stats.esportsNorm++;
        lines.push(rebuildInfoLine('', esports.name, logoUrl(esports.logoSlug), '电竞', esports.name), url, '');
      } else {
        // 其他电竞频道（如 Dota2），保留原名
        const stripped = stripPlatformPrefix(displayName);
        lines.push(rebuildInfoLine('', stripped, logoUrl(stripped), '电竞', stripped), url, '');
        stats.kept++;
      }
      continue;
    }

    // ── 影视（互联网;影视 或已处理的 影视）：去平台前缀 ─────
    if (category === '影视') {
      // 海外影视频道（bee.laobaitv.net）走 EPG 匹配
      if (url.includes('bee.laobaitv.net')) {
        const ch = findChannel(displayName, idx);
        if (ch) {
          stats.epgMatched++;
          lines.push(rebuildInfoLine(ch.id, ch.name, logoUrl(ch.name), '影视', ch.name), url, '');
        } else {
          const tvgName = getAttr(info, 'tvg-name') || displayName;
          const tvgId = getAttr(info, 'tvg-id') || '';
          lines.push(rebuildInfoLine(tvgId, tvgName, logoUrl(tvgName), '影视', displayName), url, '');
          stats.kept++;
        }
      } else {
        // 国内互联网影视：去平台前缀 + 特殊映射
        const contentName = resolveVideoContent(displayName);
        stats.videoNorm++;
        lines.push(rebuildInfoLine('', contentName, logoUrl(contentName), '影视', contentName), url, '');
      }
      continue;
    }

    // ── 海外影视：EPG 匹配，group=影视 ──────────────────────
    if (category === '海外影视') {
      const ch = findChannel(displayName, idx);
      if (ch) {
        stats.epgMatched++;
        lines.push(rebuildInfoLine(ch.id, ch.name, logoUrl(ch.name), '影视', ch.name), url, '');
      } else {
        const tvgName = getAttr(info, 'tvg-name') || displayName;
        const tvgId = getAttr(info, 'tvg-id') || '';
        lines.push(rebuildInfoLine(tvgId, tvgName, logoUrl(tvgName), '影视', displayName), url, '');
        stats.kept++;
      }
      continue;
    }

    // ── 体育：EPG 匹配，group=体育 ──────────────────────────
    if (category === '体育') {
      const ch = findChannel(displayName, idx);
      if (ch) {
        stats.epgMatched++;
        lines.push(rebuildInfoLine(ch.id, ch.name, logoUrl(ch.name), '体育', ch.name), url, '');
      } else {
        const tvgName = getAttr(info, 'tvg-name') || displayName;
        const tvgId = getAttr(info, 'tvg-id') || '';
        lines.push(rebuildInfoLine(tvgId, tvgName, logoUrl(tvgName), '体育', displayName), url, '');
        stats.kept++;
      }
      continue;
    }

    // ── Cloudflare TV：保留 group-title 原样 ─────────────────
    if (category === 'cloudflare') {
      const tvgName = getAttr(info, 'tvg-name') || displayName;
      const tvgId = getAttr(info, 'tvg-id') || '';
      lines.push(rebuildInfoLine(tvgId, tvgName, logoUrl(tvgName), rawGroup, displayName), url, '');
      stats.kept++;
      continue;
    }

    // ── 其他：group 清理后原样保留 ─────────────────────────
    stats.kept++;
    const tvgName = getAttr(info, 'tvg-name') || displayName;
    const tvgId = getAttr(info, 'tvg-id') || '';
    const cleanGroup = rawGroup.replace(/^互联网直播频道$/, '其他频道').replace(/^互联网$/, '其他频道') || '其他频道';
    lines.push(rebuildInfoLine(tvgId, tvgName, logoUrl(tvgName), cleanGroup, displayName), url, '');
  }

  // 写回
  const output = lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
  fs.writeFileSync(inputPath, output, 'utf8');

  console.log('✅ 标准化完成');
  console.log(`   EPG匹配: ${stats.epgMatched} | 棋牌归一化: ${stats.gameNorm} | 电竞归一化: ${stats.esportsNorm} | 影视去前缀: ${stats.videoNorm} | 原样保留: ${stats.kept}`);
  console.log('\n处理结果预览:');

  // 预览
  const resultEntries = parseM3U(output);
  for (const { info, url: u } of resultEntries) {
    const id = getAttr(info, 'tvg-id');
    const name = getAttr(info, 'tvg-name');
    const logo = getAttr(info, 'tvg-logo').replace(LOGO_BASE, '/');
    const group = getAttr(info, 'group-title');
    const display = getDisplayName(info);
    console.log(`[${group}] id="${id}" name="${name}" logo="${logo}" display="${display}"`);
  }
}

main().catch(console.error);
