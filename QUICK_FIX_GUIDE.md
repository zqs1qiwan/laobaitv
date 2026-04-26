# Quick Fix Guide: 4K EPG Matching Issue

## 🔴 Problem
Your 4K channels (北京卫视4K, 山东卫视4K) don't show EPG data.

## ✅ Solution (Pick ONE)

---

### Option 1: Switch to TiviMate 🥇 **EASIEST & BEST**

**What to do:**
1. Install [TiviMate](https://play.google.com/store/apps/details?id=ar.tvplayer.tv) (Android/Fire TV)
2. Import your existing M3U playlist (no changes needed!)
3. Add EPG source: `http://epg.51zmt.top:8000/e1.xml.gz`
4. Done! ✅

**Why it works:**
- TiviMate automatically matches "北京卫视4K" → "北京卫视" EPG
- No M3U changes required
- Works with any EPG source

**Compatible players:**
- ✅ TiviMate (Android/Fire TV) - **BEST**
- ✅ IPTV Smarters Pro (Android/iOS/Fire TV)
- ✅ Perfect Player (Android)
- ✅ GSE Smart IPTV (iOS/tvOS)

---

### Option 2: Enhance Your EPG 🥈 **BEST FOR COMPATIBILITY**

**What to do:**
```bash
# 1. Download EPG
curl -o epg_original.xml.gz http://epg.51zmt.top:8000/e1.xml.gz

# 2. Enhance it (adds 4K/HD variants)
python3 enhance_epg.py epg_original.xml.gz epg_enhanced.xml.gz

# 3. Host it somewhere accessible (GitHub Pages, your server, etc.)
# Or use it locally: file:///path/to/epg_enhanced.xml.gz

# 4. Update M3U header to point to enhanced EPG
# Change: x-tvg-url="http://epg.51zmt.top:8000/e1.xml.gz"
# To:     x-tvg-url="https://yourdomain.com/epg_enhanced.xml.gz"
```

**Why it works:**
- Adds multiple display names to each channel
- Example: 北京卫视 gets 北京卫视4K, 北京卫视HD, 北京卫视超清
- Works with ALL IPTV players
- Portable across EPG sources

**Automation:**
Add to GitHub Actions to auto-update:
```yaml
- name: Download and enhance EPG
  run: |
    curl -o epg.xml.gz http://epg.51zmt.top:8000/e1.xml.gz
    python3 enhance_epg.py epg.xml.gz public/epg_enhanced.xml.gz
    
- name: Commit enhanced EPG
  run: |
    git add public/epg_enhanced.xml.gz
    git commit -m "Update enhanced EPG"
    git push
```

Then use: `https://raw.githubusercontent.com/yourusername/laobaitv/main/public/epg_enhanced.xml.gz`

---

### Option 3: Use Numeric Channel IDs 🥉 **NOT RECOMMENDED**

**What to do:**
```bash
# Test what would change
python3 convert_to_numeric_ids.py chinamobile/shandong/main.m3u --dry-run

# Apply changes
python3 convert_to_numeric_ids.py chinamobile/shandong/main.m3u
```

**Changes M3U from:**
```m3u
#EXTINF:-1 tvg-id="北京卫视" tvg-name="北京卫视4K" ...
```

**To:**
```m3u
#EXTINF:-1 tvg-id="30" tvg-name="北京卫视4K" ...
```

**Why NOT recommended:**
- ❌ Numeric IDs change if you switch EPG sources
- ❌ Not portable
- ❌ Harder to maintain
- ❌ Only works for current EPG

---

## 🧪 Testing

### Test if EPG is loading:
```bash
# Check EPG has your channels
curl -sS "http://epg.51zmt.top:8000/e1.xml.gz" | gunzip | grep "北京卫视"
```

### Test if your M3U is correct:
```bash
# Should show: tvg-id="北京卫视"
grep "北京卫视4K" chinamobile/shandong/main.m3u
```

### Test your IPTV player:
1. Open channel "北京卫视4K"
2. Check if EPG shows program info
3. If NO → Player doesn't support fuzzy matching (use Option 1 or 2)

---

## 🎯 My Recommendation

**For most users:**
→ **Option 1** (Switch to TiviMate)

**If you need to support multiple players:**
→ **Option 2** (Enhance EPG)

**Only if nothing else works:**
→ Option 3 (Numeric IDs)

---

## 📊 Why epg.pw Doesn't Help

You asked about `https://epg.pw/xmltv/epg_CN.xml.gz`:

❌ **Same numeric ID problem:**
```xml
<channel id="464608">  <!-- Numeric, not "北京卫视" -->
  <display-name>北京卫视</display-name>
</channel>
```

❌ **No 4K channels** (only CCTV4K)

❌ **Duplicate entries** (北京卫视 appears 3 times with different IDs)

**Verdict:** Stick with your current EPG source.

---

## 🚀 Quick Start (5 minutes)

**If you have Android/Fire TV:**
```
1. Install TiviMate from Play Store
2. Add your M3U URL
3. Done! EPG will work immediately ✅
```

**If you need broader compatibility:**
```bash
# In your laobaitv directory:
curl -o epg.xml.gz http://epg.51zmt.top:8000/e1.xml.gz
python3 enhance_epg.py epg.xml.gz epg_enhanced.xml.gz

# Upload epg_enhanced.xml.gz to your server/GitHub
# Update M3U header with new URL
```

---

## 📞 Need Help?

1. Check if files were created: `ls -la enhance_epg.py convert_to_numeric_ids.py`
2. Read detailed docs: `EPG_MATCHING_GUIDE.md`
3. Compare EPG sources: `EPG_SOURCE_COMPARISON.md`

**Your M3U format is already correct - don't change it!** 
Just pick Option 1 or Option 2 above.
