# IPTV Multicast Playlist - China Unicom - China Telecom - China Mobile

## User Guide https://iptv.laobaitv.net/ This is a public welfare project, open-source and free. Please do not believe in various advertisements.
## If you have new region requirements, please submit issues, I need some local test environment for cooperation.

## Udpxy Default Settings
- **IP Address:** `192.168.2.1`
- **Default Port:** `4022`
- **Status Page:** [http://192.168.2.1:4022/status](http://192.168.2.1:4022/status)

## Usage Commands

Default `udpxy` startup command:

```bash
/usr/bin/udpxy -T -v -S -a br-lan -p 4022 -m eth0 -c 20

-v
# Enable verbose output[default = disabled ]

-S
# Enable client statistics[default = disabled ]

-T
# Do not run as a daemon[default = daemon if root ]

-a <listenaddr>
# IPv4 address/interface to listen on[default = 0.0.0.0 ]

-m <mcast_ifc_addr>
# (Multicast) IPv4 address/interface for the source[default = 0.0.0.0 ]

-c <clients>
# Maximum number of clients to accept[default = 3，max = 5000 ]

-l <logfile>
# Log output to file[default = stderr ]

-B <sizeK>
# Buffer size for inbound (multicast) data (65536, 32Kb, 1Mb)[default = 2048 bytes ]

-R <msgs>
# Maximum number of messages to buffer (-1 = all)[default = 1 ]

-H <sec>
# Maximum time to store data in buffer (in seconds) (-1 = unlimited)[default value= 1 ]

-n <nice_incr>
# Nice increment value[default = 0 ]

-M <sec>
# Update multicast subscriptions every M milliseconds (0 to skip)[default = 0 ]

-p <port>
# Port number
```
