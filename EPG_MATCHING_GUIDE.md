# EPG 4K Channel Matching Guide

## Problem Summary

4K channel variants (北京卫视4K, 山东卫视4K) don't match EPG data because:
- Your M3U uses: `tvg-id="北京卫视"`  
- EPG uses numeric IDs: `<channel id="30"><display-name>北京卫视</display-name></channel>`
- IPTV players need to match `tvg-id` → EPG `<display-name>` (requires fuzzy matching)

## ✅ Your Current Configuration is CORRECT

Your M3U files already use the right format:
```m3u
#EXTINF:-1 tvg-id="北京卫视" tvg-name="北京卫视4K" tvg-logo="..." group-title="卫视",北京卫视4K
```

This is the **portable, EPG-source-independent method**. Keep it this way!

## Solutions

### Solution 1: Use IPTV Player with Fuzzy Matching (Easiest) ✅

**Compatible Players** (auto-match "北京卫视" ↔ "北京卫视4K"):
- ✅ **TiviMate** (Android/Fire TV) - RECOMMENDED
- ✅ **Perfect Player** (Android)
- ✅ **IPTV Smarters Pro** (Multi-platform)
- ✅ **GSE Smart IPTV** (iOS/tvOS)

**Incompatible Players** (need exact ID match):
- ❌ Kodi PVR IPTV Simple (requires exact match)
- ❌ VLC (no EPG support)

### Solution 2: Switch to Better EPG Source

Find EPG providers that use **text-based channel IDs**:

```xml
<!-- Good: Text ID matches tvg-id directly -->
<channel id="北京卫视">
  <display-name>北京卫视</display-name>
</channel>

<!-- Better: Multiple display names -->
<channel id="beijingws">
  <display-name>北京卫视</display-name>
  <display-name>北京卫视4K</display-name>
  <display-name>北京卫视HD</display-name>
</channel>
```

**Alternative EPG Sources to Try:**
- `http://epg.112114.xyz/pp.xml.gz` (might use text IDs)
- `https://epg.pw/xmltv/epg_CN.xml.gz`
- `http://diyp.112114.xyz/` (DIY EPG with customization)

### Solution 3: Enhance EPG Automatically

Use the provided `enhance_epg.py` script to add 4K/HD variants:

```bash
# Download original EPG
curl -o e1.xml.gz http://epg.51zmt.top:8000/e1.xml.gz

# Enhance it
python3 enhance_epg.py e1.xml.gz e1_enhanced.xml.gz

# Update M3U to point to enhanced EPG
# Change: x-tvg-url="https://epg.laobaitv.net"
# To:     x-tvg-url="file:///path/to/e1_enhanced.xml.gz"
```

The script adds these variants automatically:
- 北京卫视 → 北京卫视4K, 北京卫视4k, 北京卫视HD, 北京卫视高清, 北京卫视超清

### Solution 4: Use Numeric IDs (Not Recommended)

Map channels to numeric IDs from your EPG:

```m3u
#EXTINF:-1 tvg-id="30" tvg-name="北京卫视4K" ...
#EXTINF:-1 tvg-id="38" tvg-name="山东卫视4K" ...
#EXTINF:-1 tvg-id="27" tvg-name="湖南卫视4K" ...
```

**Common Channel ID Mapping:**
| Channel    | Numeric ID |
|------------|------------|
| 北京卫视   | 30         |
| 山东卫视   | 38         |
| 湖南卫视   | 27         |
| 浙江卫视   | 28         |
| 江苏卫视   | 29         |
| 东方卫视   | 31         |
| 广东卫视   | 33         |
| 深圳卫视   | 34         |
| 四川卫视   | 56         |

⚠️ **Downside:** IDs change if you switch EPG sources.

## Recommended Workflow

1. **Keep your current M3U format** (text-based tvg-id)
2. **Use TiviMate or IPTV Smarters** (best EPG matching)
3. **Or enhance your EPG** with the Python script
4. **Test different EPG sources** to find one with text IDs

## Testing Your Setup

```bash
# Check what your player sees
curl -sS "http://epg.51zmt.top:8000/e1.xml.gz" | gunzip | grep -A 2 "北京卫视"

# Verify M3U format
grep "北京卫视4K" chinamobile/shandong/main.m3u
```

## Why This Happens

XMLTV EPG standard allows two formats:

**Format A: Numeric IDs** (your current EPG)
```xml
<channel id="30">
  <display-name>北京卫视</display-name>
</channel>
```
- Player must match `tvg-id` → `<display-name>` (fuzzy)

**Format B: Text IDs** (better for matching)
```xml
<channel id="北京卫视">
  <display-name>北京卫视</display-name>
</channel>
```
- Player matches `tvg-id` → `<channel id>` (exact)

Your EPG uses Format A, so you need fuzzy matching support.
