# IPTV组播播放列表 中国联通 中国电信 中国移动

## 使用教程 https://iptv.laobaitv.net/
## 有新的地区需求请提交issues，我需要一些本地测试环境配合


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
