# IPTV组播自用播放列表

这是一个适用于IPTV的组播播放列表，使用 `udpxy` 来处理IPTV组播信号。
播放源直接指向 http://iptv.laobaitv.net
会自动按照来源IP的省份和运营商信息匹配对应的组播播放列表，想获得某个具体地点的播放列表也可以在例如：/chinaunicom/beijing 等路径找到main.m3u
如无匹配的本地组播播放列表，将会默认引用到fanmingming的公网IPv6直播源

## Udpxy默认设置

- **IP地址：** `192.168.2.1`
- **默认端口：** `4022`
- **状态页面：** [http://192.168.2.1:4022/status](http://192.168.2.1:4022/status)

## 使用命令

默认 `udpxy` 启动命令：

```bash
/usr/bin/udpxy -T -v -S -a br-lan -p 4022 -m eth0 -c 20

-T：启用线程模式
-v：输出详细信息
-S：禁用源地址检测
-a：用户侧接口（默认 br-lan）
-p：指定端口（默认 4022）
-m：IPTV组播信号侧接口（默认 eth0）
-c：设置最大客户端数量（默认 20）
