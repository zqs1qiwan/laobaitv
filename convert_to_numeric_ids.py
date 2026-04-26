#!/usr/bin/env python3
"""
Convert text-based tvg-ids to numeric IDs based on EPG mapping
Only use this if you need to switch EPG sources with numeric IDs
"""

import re
import sys

# Mapping from channel names to numeric IDs (from epg.51zmt.top)
CHANNEL_ID_MAP = {
    'CCTV1': '1',
    'CCTV2': '2',
    'CCTV3': '3',
    'CCTV4': '4',
    'CCTV5': '5',
    'CCTV5+': '6',
    'CCTV6': '7',
    'CCTV7': '8',
    'CCTV8': '9',
    'CCTV9': '10',
    'CCTV10': '11',
    'CCTV11': '12',
    'CCTV12': '13',
    'CCTV13': '14',
    'CCTV14': '15',
    'CCTV15': '16',
    'CCTV17': '17',
    'CCTV4K': '106',
    'CGTN': '20',
    '湖南卫视': '27',
    '浙江卫视': '28',
    '江苏卫视': '29',
    '北京卫视': '30',
    '东方卫视': '31',
    '安徽卫视': '32',
    '广东卫视': '33',
    '深圳卫视': '34',
    '辽宁卫视': '36',
    '旅游卫视': '37',
    '山东卫视': '38',
    '天津卫视': '39',
    '重庆卫视': '40',
    '东南卫视': '41',
    '甘肃卫视': '42',
    '广西卫视': '43',
    '贵州卫视': '44',
    '河北卫视': '45',
    '黑龙江卫视': '46',
    '河南卫视': '47',
    '湖北卫视': '48',
    '江西卫视': '50',
    '吉林卫视': '51',
    '内蒙古卫视': '52',
    '宁夏卫视': '53',
    '山西卫视': '54',
    '陕西卫视': '55',
    '四川卫视': '56',
    '新疆卫视': '57',
    '云南卫视': '58',
    '青海卫视': '59',
    '西藏卫视': '71',
}

def convert_m3u_to_numeric(input_file, output_file, dry_run=False):
    """Convert text tvg-id to numeric IDs"""
    
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"❌ Error reading file: {e}", file=sys.stderr)
        return False
    
    lines = content.split('\n')
    converted_count = 0
    skipped_count = 0
    
    new_lines = []
    for line in lines:
        if line.startswith('#EXTINF') and 'tvg-id=' in line:
            # Extract current tvg-id
            match = re.search(r'tvg-id="([^"]*)"', line)
            if match:
                current_id = match.group(1)
                
                # Try to find numeric mapping
                numeric_id = CHANNEL_ID_MAP.get(current_id)
                
                if numeric_id:
                    new_line = line.replace(f'tvg-id="{current_id}"', f'tvg-id="{numeric_id}"')
                    new_lines.append(new_line)
                    converted_count += 1
                    if dry_run:
                        print(f"  {current_id} → {numeric_id}")
                else:
                    new_lines.append(line)
                    skipped_count += 1
            else:
                new_lines.append(line)
        else:
            new_lines.append(line)
    
    if dry_run:
        print(f"\n📊 Summary:")
        print(f"  ✅ Would convert: {converted_count} channels")
        print(f"  ⏭️  Would skip: {skipped_count} channels (no mapping)")
        return True
    
    # Write output
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(new_lines))
        print(f"✅ Converted {converted_count} channels")
        print(f"⏭️  Skipped {skipped_count} channels (no mapping)")
        print(f"📝 Output: {output_file}")
        return True
    except Exception as e:
        print(f"❌ Error writing file: {e}", file=sys.stderr)
        return False

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Convert M3U text-based tvg-ids to numeric IDs")
        print("\nUsage:")
        print("  python3 convert_to_numeric_ids.py <input.m3u> [output.m3u]")
        print("  python3 convert_to_numeric_ids.py <input.m3u> --dry-run")
        print("\nExamples:")
        print("  # Preview changes")
        print("  python3 convert_to_numeric_ids.py main.m3u --dry-run")
        print("")
        print("  # Convert in-place")
        print("  python3 convert_to_numeric_ids.py main.m3u")
        print("")
        print("  # Convert to new file")
        print("  python3 convert_to_numeric_ids.py main.m3u main_numeric.m3u")
        sys.exit(1)
    
    input_file = sys.argv[1]
    
    # Check for dry-run flag
    if len(sys.argv) > 2 and sys.argv[2] == '--dry-run':
        print(f"🔍 Dry run for: {input_file}\n")
        success = convert_m3u_to_numeric(input_file, None, dry_run=True)
    else:
        # Determine output file
        output_file = sys.argv[2] if len(sys.argv) > 2 else input_file
        success = convert_m3u_to_numeric(input_file, output_file)
    
    sys.exit(0 if success else 1)
