# IPTV组播自用播放列表

这是一个适用于IPTV的组播播放列表，使用 `udpxy` 来处理IPTV组播信号。

播放源直接指向 http://iptv.laobaitv.net 即刻开看！

会自动按照来源IP的省份和运营商信息匹配对应的组播播放列表。

- 2025.06.25 完全参数支持，例如`https://iptv.laobaitv.net/?isp=chinaunicom&region=shandong&city=zibo&ip=192.168.100.1&port=4200`
- 2025.06.16 部分地区组播信息是城市区分并非省份区分，增加对山东联通城市支持，因为`CF-ipcity`的信息不准确，请手动使用参数`?city=zibo`
- 2025.05.15 添加debug信息，自动匹配地理位置不对的时候可以检查是否是cf识别有误，电脑浏览器网页访问`iptv.laobaitv.net`在第一行会显示识别到的来源ip的地理位置和isp信息等debug info

如想获得某个具体地点的播放列表也可以在例如：/chinaunicom/beijing 等路径找到main.m3u

如无匹配的本地组播播放列表，将会默认引用到肥羊的公网IPv6直播源，通过live.laobaitv.net部署

如果本地的ip及端口有区别，如果自动识别的地区及宽带有误，请使用参数自定义
支持的自定义参数
- **本地组播路由IP：** `ip`
- **本地组播路由Port：** `port`
- **iptv宽带提供商ISP：** `isp`
- **iptv宽带地区（省份）：** `region`
- **iptv宽带城市：** `city`

- 例如 `https://iptv.laobaitv.net/?isp=chinaunicom&region=shandong&city=zibo&ip=192.168.100.1&port=4200`
- 即是 `中国联通` `山东` `淄博` `udpxy所在端ip 192.168.100.1` `udpxy端口 4200`


## 如直接使用此组播源需将组播环境IP按如下配置
## Udpxy默认设置
- **IP地址：** `192.168.2.1`
- **默认端口：** `4022`
- **状态页面：** [http://192.168.2.1:4022/status](http://192.168.2.1:4022/status)

## 使用命令

默认 `udpxy` 启动命令：

```bash
/usr/bin/udpxy -T -v -S -a br-lan -p 4022 -m eth0 -c 20

-v
# 启用详细输出[default = disabled ]。

-S
# 启用客户端统计信息[default = disabled ]。

-T
# 不要作为守护进程运行[default = daemon if root ]。

-a <listenaddr>
# 要侦听的IPv4地址/接口[default = 0.0.0.0 ]。

-m <mcast_ifc_addr>
# （组播）源的IPv4地址/接口[默认= 0.0.0.0 ]。

-c <clients>
# 要接受的最大客户端数[default = 3，max = 5000 ]。

-l <logfile>
# 将输出记录到文件[default = stderr ]。

-B <sizeK>
# 入站（多播）数据的缓冲区大小（65536,32Kb，1Mb）[默认= 2048字节 ]。

-R <msgs>
# 要缓冲的最大消息数（-1 = 全部）[default = 1 ]。

-H <sec>
# 在缓冲区中保存数据的最长时间（以秒为单位）（- 1 = 无限制）[默认值= 1 ]。

-n <nice_incr>
# 好的值增量[default = 0 ]。

-M <sec>
# 每M秒更新一次多播订阅（如果为0则跳过）[default = 0 ]。

-p <port>
# 端口。
