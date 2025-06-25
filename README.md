# IPTV组播自用播放列表

这是一个适用于IPTV的组播播放列表，使用 `udpxy` 来处理IPTV组播信号。

播放源直接指向 http://iptv.laobaitv.net 即刻开看！

会自动按照来源IP的省份和运营商信息匹配对应的组播播放列表。

- 2025.06.25 完全参数支持，例如https://iptv.laobaitv.net/?isp=chinaunicom&region=shandong&city=zibo&ip=192.168.100.1&port=4200
- 2025.06.16 部分地区组播信息是城市区分并非省份区分，增加对山东联通城市支持，因为CF-ipcity的信息不准确，请手动使用参数?city=zibo
- 2025.05.15 添加debug信息，自动匹配地理位置不对的时候可以检查是否是cf识别有误，电脑浏览器网页访问iptv.laobaitv.net在第一行会显示识别到的来源ip的地理位置和isp信息等debug info

如想获得某个具体地点的播放列表也可以在例如：/chinaunicom/beijing 等路径找到main.m3u

如无匹配的本地组播播放列表，将会默认引用到肥羊的公网IPv6直播源，通过live.laobaitv.net部署

如果本地的ip及端口有区别，请使用?ip=****&port=****参数自定义
例如  http://iptv.laobaitv.net/?ip=192.168.8.1&port=10086


## 如直接使用此组播源需将组播环境IP按如下配置
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
