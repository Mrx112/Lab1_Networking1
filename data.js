/* Data topologi Home Server ↔ Warehouse — disalin dari file Packet Tracer yang sudah dikonfigurasi.
   Koordinat = viewBox SVG 1240×620. IP/route/ACL persis seperti startup-config di docs/configs/. */
window.NET = (() => {
  const zones = [
    { id: 'home', label: 'RUMAH — Home Server', x: 20, y: 115, w: 585, h: 490 },
    { id: 'public', label: 'JARINGAN PUBLIK', x: 615, y: 15, w: 220, h: 95 },
    { id: 'wh', label: 'WAREHOUSE — AI Cluster', x: 815, y: 115, w: 410, h: 490 },
  ];

  // type: router | switch | ap | cloud | server | pc | laptop | printer | solar | attacker
  const nodes = [
    // ---- Rumah ----
    { id: 'rh', name: 'R-HomeCloud', type: 'router', x: 310, y: 160, zone: 'home',
      ifaces: {
        'Gi0/0.110': { ip: '192.168.110.1', mask: 24 }, 'Gi0/0.111': { ip: '192.168.111.254', mask: 24 },
        'Gi0/0.112': { ip: '192.168.112.254', mask: 24 }, 'Gi0/0.113': { ip: '192.168.113.254', mask: 24 },
        'Gi1/0': { ip: '192.168.109.1', mask: 24 }, 'Gi2/0': { ip: '10.0.0.1', mask: 30 }, 'Gi3/0': { ip: '203.0.113.2', mask: 30 },
      },
      routes: [
        { net: '192.168.120.0', mask: 24, via: '10.0.0.2', ad: 1 },
        { net: '192.168.120.0', mask: 24, via: '203.0.113.1', ad: 10 },
        { net: '0.0.0.0', mask: 0, via: '203.0.113.1', ad: 1 },
      ] },
    { id: 'swh', name: 'SW-HomeCloud', type: 'switch', x: 230, y: 285, zone: 'home', mgmt: '192.168.110.250' },
    { id: 'aph', name: 'AP Home', type: 'ap', x: 520, y: 160, zone: 'home' },
    { id: 'n1', name: 'Server Node 1', type: 'server', x: 60, y: 410, zone: 'home', ip: '192.168.111.1', mask: 24, gw: '192.168.111.254', vlan: 111 },
    { id: 'n2', name: 'Server Node 2', type: 'server', x: 140, y: 410, zone: 'home', ip: '192.168.112.1', mask: 24, gw: '192.168.112.254', vlan: 112 },
    { id: 'n3', name: 'Server Node 3', type: 'server', x: 220, y: 410, zone: 'home', ip: '192.168.113.1', mask: 24, gw: '192.168.113.254', vlan: 113 },
    { id: 'adm', name: 'Admin PC (Adi)', type: 'pc', x: 300, y: 410, zone: 'home', ip: '192.168.110.2', mask: 24, gw: '192.168.110.1', vlan: 110 },
    { id: 'prn', name: 'Printer Office', type: 'printer', x: 380, y: 410, zone: 'home', ip: '192.168.110.5', mask: 24, gw: '192.168.110.1', vlan: 110 },
    { id: 'solh', name: 'Solar Panel Home', type: 'solar', x: 460, y: 410, zone: 'home', ip: '192.168.110.30', mask: 24, gw: '192.168.110.1', vlan: 110 },
    { id: 'l1', name: 'Laptop Adi', type: 'laptop', x: 450, y: 265, zone: 'home', ip: '192.168.109.10', mask: 24, gw: '192.168.109.1', dhcp: true },
    { id: 'l2', name: 'Laptop Hasna', type: 'laptop', x: 520, y: 265, zone: 'home', ip: '192.168.109.11', mask: 24, gw: '192.168.109.1', dhcp: true },
    { id: 'l3', name: 'Laptop Raska', type: 'laptop', x: 590, y: 265, zone: 'home', ip: '192.168.109.12', mask: 24, gw: '192.168.109.1', dhcp: true },
    // ---- Publik ----
    { id: 'inet', name: 'Internet', type: 'cloud', x: 665, y: 62, zone: 'public' },
    { id: 'isp', name: 'ISP-Public', type: 'router', x: 775, y: 62, zone: 'public',
      ifaces: { 'Gi0/0': { ip: '203.0.113.1', mask: 30 }, 'Gi0/1': { ip: '198.51.100.1', mask: 30 }, 'Gi0/2': { ip: '100.64.0.1', mask: 24 } },
      routes: [
        { net: '192.168.109.0', mask: 24, via: '203.0.113.2', ad: 1 }, { net: '192.168.110.0', mask: 24, via: '203.0.113.2', ad: 1 },
        { net: '192.168.111.0', mask: 24, via: '203.0.113.2', ad: 1 }, { net: '192.168.112.0', mask: 24, via: '203.0.113.2', ad: 1 },
        { net: '192.168.113.0', mask: 24, via: '203.0.113.2', ad: 1 }, { net: '192.168.120.0', mask: 24, via: '198.51.100.2', ad: 1 },
      ] },
    { id: 'atk', name: 'Penyerang (Internet)', type: 'attacker', x: 455, y: 45, zone: 'public', ip: '100.64.0.66', mask: 24, gw: '100.64.0.1' },
    // ---- Warehouse ----
    { id: 'rw', name: 'R-Warehouse', type: 'router', x: 900, y: 160, zone: 'wh',
      ifaces: { 'Gi0/0': { ip: '10.0.0.2', mask: 30 }, 'Gi0/1': { ip: '198.51.100.2', mask: 30, aclIn: 'PUBLIC-IN' }, 'Gi0/2': { ip: '192.168.120.1', mask: 24 } },
      routes: [
        ...['109', '110', '111', '112', '113'].map(o => ({ net: `192.168.${o}.0`, mask: 24, via: '10.0.0.1', ad: 1 })),
        ...['109', '110', '111', '112', '113'].map(o => ({ net: `192.168.${o}.0`, mask: 24, via: '198.51.100.1', ad: 10 })),
        { net: '0.0.0.0', mask: 0, via: '198.51.100.1', ad: 1 },
      ],
      acls: {
        'PUBLIC-IN': [
          { action: 'permit', src: '192.168.108.0', wild: 22, note: 'Home 109–111 via failover' },
          { action: 'permit', src: '192.168.112.0', wild: 23, note: 'Home 112–113' },
          { action: 'permit', src: '198.51.100.1', wild: 32, proto: 'icmp', note: 'Ping monitoring ISP' },
          { action: 'deny', src: '0.0.0.0', wild: 0, note: 'Drop sisanya dari publik' },
        ],
      } },
    { id: 'sw1', name: 'SW-Warehouse-1', type: 'switch', x: 900, y: 285, zone: 'wh', mgmt: '192.168.120.2' },
    { id: 'sw2', name: 'SW-Warehouse-2', type: 'switch', x: 1040, y: 285, zone: 'wh', mgmt: '192.168.120.3' },
    { id: 'sw3', name: 'SW-Warehouse-3', type: 'switch', x: 1180, y: 285, zone: 'wh', mgmt: '192.168.120.4' },
    { id: 'swh0', name: 'Server Warehouse', type: 'server', x: 860, y: 410, zone: 'wh', ip: '192.168.120.10', mask: 24, gw: '192.168.120.1' },
    { id: 'pcw', name: 'PC Warehouse', type: 'pc', x: 940, y: 410, zone: 'wh', ip: '192.168.120.20', mask: 24, gw: '192.168.120.1' },
    { id: 'ai1', name: 'AI Server 1', type: 'server', x: 1005, y: 410, zone: 'wh', ip: '192.168.120.11', mask: 24, gw: '192.168.120.1' },
    { id: 'ai2', name: 'AI Server 2', type: 'server', x: 1080, y: 410, zone: 'wh', ip: '192.168.120.12', mask: 24, gw: '192.168.120.1' },
    { id: 'ai3', name: 'AI Server 3', type: 'server', x: 1145, y: 410, zone: 'wh', ip: '192.168.120.13', mask: 24, gw: '192.168.120.1' },
    { id: 'solw', name: 'Solar Panel Warehouse', type: 'solar', x: 1210, y: 410, zone: 'wh', ip: '192.168.120.30', mask: 24, gw: '192.168.120.1' },
  ];

  // kind: copper | trunk | wifi | antenna | public
  const links = [
    { a: 'rh', ai: 'Gi0/0', b: 'swh', bi: 'Gi8/1', kind: 'trunk', label: 'Trunk 802.1Q' },
    { a: 'rh', ai: 'Gi1/0', b: 'aph', bi: 'Port 0', kind: 'copper' },
    { a: 'aph', ai: 'Port 1', b: 'l1', bi: 'Wireless0', kind: 'wifi' },
    { a: 'aph', ai: 'Port 1', b: 'l2', bi: 'Wireless0', kind: 'wifi' },
    { a: 'aph', ai: 'Port 1', b: 'l3', bi: 'Wireless0', kind: 'wifi' },
    { a: 'swh', ai: 'Fa0/1', b: 'n1', bi: 'Fa0', kind: 'copper' },
    { a: 'swh', ai: 'Fa1/1', b: 'n2', bi: 'Fa0', kind: 'copper' },
    { a: 'swh', ai: 'Fa2/1', b: 'n3', bi: 'Fa0', kind: 'copper' },
    { a: 'swh', ai: 'Fa3/1', b: 'adm', bi: 'Fa0', kind: 'copper' },
    { a: 'swh', ai: 'Fa4/1', b: 'prn', bi: 'Fa0', kind: 'copper' },
    { a: 'swh', ai: 'Fa5/1', b: 'solh', bi: 'Fa3', kind: 'copper' },
    { a: 'rh', ai: 'Gi3/0', b: 'isp', bi: 'Gi0/0', kind: 'public', label: '203.0.113.0/30' },
    { a: 'isp', ai: 'Gi0/2', b: 'inet', bi: 'Eth6', kind: 'public' },
    { a: 'inet', ai: 'Eth6', b: 'atk', bi: 'Eth0', kind: 'public' },
    { a: 'isp', ai: 'Gi0/1', b: 'rw', bi: 'Gi0/1', kind: 'public', label: '198.51.100.0/30' },
    { a: 'rh', ai: 'Gi2/0', b: 'rw', bi: 'Gi0/0', kind: 'antenna', label: 'Antena PtP 10.0.0.0/30 · 10–15 km' },
    { a: 'rw', ai: 'Gi0/2', b: 'sw1', bi: 'Gi0/1', kind: 'copper', label: '192.168.120.1' },
    { a: 'sw1', ai: 'Gi0/2', b: 'sw2', bi: 'Gi0/1', kind: 'trunk' },
    { a: 'sw2', ai: 'Gi0/2', b: 'sw3', bi: 'Gi0/1', kind: 'trunk' },
    { a: 'sw1', ai: 'Fa0/1', b: 'swh0', bi: 'Fa0', kind: 'copper' },
    { a: 'sw1', ai: 'Fa0/2', b: 'pcw', bi: 'Fa0', kind: 'copper' },
    { a: 'sw2', ai: 'Fa0/1', b: 'ai1', bi: 'Fa0', kind: 'copper' },
    { a: 'sw2', ai: 'Fa0/2', b: 'ai2', bi: 'Fa0', kind: 'copper' },
    { a: 'sw3', ai: 'Fa0/1', b: 'ai3', bi: 'Fa0', kind: 'copper' },
    { a: 'sw3', ai: 'Fa0/2', b: 'solw', bi: 'Fa3', kind: 'copper' },
  ];

  const configs = {
    rh: `hostname R-HomeCloud
ip cef
!
ip dhcp excluded-address 192.168.109.1 192.168.109.9
ip dhcp pool WIFI_HOME
 network 192.168.109.0 255.255.255.0
 default-router 192.168.109.1
 dns-server 192.168.111.1
!
interface GigabitEthernet0/0
 no ip address
 no shutdown
interface GigabitEthernet0/0.110
 description VLAN110_ADMIN_PC
 encapsulation dot1Q 110
 ip address 192.168.110.1 255.255.255.0
interface GigabitEthernet0/0.111
 description VLAN111_NODE1
 encapsulation dot1Q 111
 ip address 192.168.111.254 255.255.255.0
interface GigabitEthernet0/0.112
 description VLAN112_NODE2
 encapsulation dot1Q 112
 ip address 192.168.112.254 255.255.255.0
interface GigabitEthernet0/0.113
 description VLAN113_NODE3
 encapsulation dot1Q 113
 ip address 192.168.113.254 255.255.255.0
!
interface GigabitEthernet1/0
 description WIFI_HOME_AP
 ip address 192.168.109.1 255.255.255.0
 no shutdown
interface GigabitEthernet2/0
 description ANTENA_PTP_TO_WAREHOUSE
 ip address 10.0.0.1 255.255.255.252
 no shutdown
interface GigabitEthernet3/0
 description PUBLIC_LINK_TO_ISP
 ip address 203.0.113.2 255.255.255.252
 no shutdown
!
ip route 192.168.120.0 255.255.255.0 10.0.0.2
ip route 192.168.120.0 255.255.255.0 203.0.113.1 10
ip route 0.0.0.0 0.0.0.0 203.0.113.1
!
end
write memory`,
    rw: `hostname R-Warehouse
ip cef
!
ip dhcp excluded-address 192.168.120.1 192.168.120.19
ip dhcp pool WAREHOUSE
 network 192.168.120.0 255.255.255.0
 default-router 192.168.120.1
 dns-server 192.168.111.1
!
interface GigabitEthernet0/0
 description ANTENA_PTP_TO_HOME
 ip address 10.0.0.2 255.255.255.252
 no shutdown
interface GigabitEthernet0/1
 description PUBLIC_LINK_TO_ISP
 ip address 198.51.100.2 255.255.255.252
 ip access-group PUBLIC-IN in
 no shutdown
interface GigabitEthernet0/2
 description WAREHOUSE_LAN
 ip address 192.168.120.1 255.255.255.0
 no shutdown
!
ip route 192.168.109.0 255.255.255.0 10.0.0.1
ip route 192.168.110.0 255.255.255.0 10.0.0.1
ip route 192.168.111.0 255.255.255.0 10.0.0.1
ip route 192.168.112.0 255.255.255.0 10.0.0.1
ip route 192.168.113.0 255.255.255.0 10.0.0.1
ip route 192.168.109.0 255.255.255.0 198.51.100.1 10
ip route 192.168.110.0 255.255.255.0 198.51.100.1 10
ip route 192.168.111.0 255.255.255.0 198.51.100.1 10
ip route 192.168.112.0 255.255.255.0 198.51.100.1 10
ip route 192.168.113.0 255.255.255.0 198.51.100.1 10
ip route 0.0.0.0 0.0.0.0 198.51.100.1
!
ip access-list extended PUBLIC-IN
 remark Allow Home networks 109-111 via ISP failover
 permit ip 192.168.108.0 0.0.3.255 any
 remark Allow Home networks 112-113
 permit ip 192.168.112.0 0.0.1.255 any
 remark ISP monitoring ping
 permit icmp host 198.51.100.1 any
 remark Drop everything else from public
 deny ip any any
!
end
write memory`,
    isp: `hostname ISP-Public
ip cef
!
interface GigabitEthernet0/0
 description TO_HOME_CPE
 ip address 203.0.113.1 255.255.255.252
 no shutdown
interface GigabitEthernet0/1
 description TO_WAREHOUSE_CPE
 ip address 198.51.100.1 255.255.255.252
 no shutdown
interface GigabitEthernet0/2
 description INTERNET_UPSTREAM
 ip address 100.64.0.1 255.255.255.0
 no shutdown
!
ip route 192.168.109.0 255.255.255.0 203.0.113.2
ip route 192.168.110.0 255.255.255.0 203.0.113.2
ip route 192.168.111.0 255.255.255.0 203.0.113.2
ip route 192.168.112.0 255.255.255.0 203.0.113.2
ip route 192.168.113.0 255.255.255.0 203.0.113.2
ip route 192.168.120.0 255.255.255.0 198.51.100.2
!
end
write memory`,
    swh: `hostname SW-HomeCloud
!
vlan 110
 name PC_VLAN
vlan 111
 name NODE1_VLAN
vlan 112
 name NODE2_VLAN
vlan 113
 name NODE3_VLAN
!
interface FastEthernet0/1
 description CONNECTION_TO_NODE1
 switchport mode access
 switchport access vlan 111
interface FastEthernet1/1
 description CONNECTION_TO_NODE2
 switchport mode access
 switchport access vlan 112
interface FastEthernet2/1
 description CONNECTION_TO_NODE3
 switchport mode access
 switchport access vlan 113
interface FastEthernet3/1
 description CONNECTION_TO_PC
 switchport mode access
 switchport access vlan 110
interface FastEthernet4/1
 description CONNECTION_TO_PRINTER
 switchport mode access
 switchport access vlan 110
interface FastEthernet5/1
 description TO_SOLAR_PANEL_HOME
 switchport mode access
 switchport access vlan 110
interface GigabitEthernet8/1
 description TRUNK_TO_ROUTER
 switchport mode trunk
!
interface Vlan110
 ip address 192.168.110.250 255.255.255.0
 no shutdown
interface Vlan111
 no ip address
 shutdown
interface Vlan112
 no ip address
 shutdown
interface Vlan113
 no ip address
 shutdown
ip default-gateway 192.168.110.1
!
end
write memory`,
    sw1: `hostname SW-Warehouse-1
!
interface GigabitEthernet0/1
 description UPLINK_TO_ROUTER
 switchport mode access
interface GigabitEthernet0/2
 description TO_SW2
 switchport mode trunk
interface FastEthernet0/1
 description TO_SERVER_WAREHOUSE
 switchport mode access
interface FastEthernet0/2
 description TO_PC_WAREHOUSE
 switchport mode access
!
interface Vlan1
 ip address 192.168.120.2 255.255.255.0
 no shutdown
ip default-gateway 192.168.120.1
!
end
write memory`,
    sw2: `hostname SW-Warehouse-2
!
interface GigabitEthernet0/1
 description TO_SW1
 switchport mode trunk
interface GigabitEthernet0/2
 description TO_SW3
 switchport mode trunk
interface FastEthernet0/1
 description TO_AI_SERVER_1
 switchport mode access
interface FastEthernet0/2
 description TO_AI_SERVER_2
 switchport mode access
!
interface Vlan1
 ip address 192.168.120.3 255.255.255.0
 no shutdown
ip default-gateway 192.168.120.1
!
end
write memory`,
    sw3: `hostname SW-Warehouse-3
!
interface GigabitEthernet0/1
 description TO_SW2
 switchport mode trunk
interface FastEthernet0/1
 description TO_AI_SERVER_3
 switchport mode access
interface FastEthernet0/2
 description TO_SOLAR_PANEL_WAREHOUSE
 switchport mode access
!
interface Vlan1
 ip address 192.168.120.4 255.255.255.0
 no shutdown
ip default-gateway 192.168.120.1
!
end
write memory`,
  };

  // Penjelasan per blok config (dipakai mode "jalankan langkah demi langkah")
  const explain = {
    'hostname': 'Memberi nama perangkat supaya prompt CLI & log mudah dikenali.',
    'ip cef': 'Mengaktifkan Cisco Express Forwarding — forwarding paket lebih cepat.',
    'ip dhcp': 'Pool DHCP: laptop/PC yang bergabung otomatis dapat IP, gateway, dan DNS.',
    'encapsulation dot1Q': 'Sub-interface router-on-a-stick: satu kabel trunk membawa banyak VLAN, tiap VLAN punya gateway sendiri.',
    'ip address': 'Alamat IP interface. Tanpa ini interface tetap "down".',
    'no shutdown': 'Menyalakan interface — bawaan router interface fisik mati.',
    'ip route 0.0.0.0': 'Default route: apa pun yang tidak dikenal dikirim ke ISP.',
    'ip route': 'Static route. Angka di ujung (10) = administrative distance → jalur cadangan (floating static).',
    'ip access-list': 'ACL PUBLIC-IN: hanya subnet rumah yang boleh masuk dari jalur publik; sumber lain dibuang.',
    'ip access-group': 'Memasang ACL pada interface arah masuk (in).',
    'switchport mode trunk': 'Port trunk membawa semua VLAN ke router / switch lain.',
    'switchport access vlan': 'Port access: host di port ini masuk ke VLAN tertentu.',
    'switchport mode access': 'Port untuk satu host (bukan trunk).',
    'vlan ': 'Membuat VLAN di database switch.',
    'interface Vlan': 'SVI (IP manajemen switch). VLAN 111–113 dimatikan karena IP-nya dulu bentrok dengan gateway router.',
    'ip default-gateway': 'Gateway untuk trafik manajemen switch.',
    'write memory': 'Simpan running-config ke startup-config supaya tidak hilang saat reboot.',
    'description': 'Label dokumentasi pada interface.',
    'end': 'Keluar dari mode konfigurasi.',
    'remark': 'Komentar di dalam ACL.',
    'permit': 'Baris ACL: izinkan.',
    'deny': 'Baris ACL: tolak. Implicit deny selalu ada di akhir ACL.',
  };

  const tests = [
    { from: 'adm', to: '192.168.111.1', label: 'Admin PC → Server Node 1 (antar-VLAN)', expect: 'ok' },
    { from: 'adm', to: '192.168.113.1', label: 'Admin PC → Server Node 3', expect: 'ok' },
    { from: 'n1', to: '192.168.112.1', label: 'Server Node 1 → Node 2', expect: 'ok' },
    { from: 'l2', to: '192.168.120.10', label: 'Laptop Hasna (WiFi) → Server Warehouse', expect: 'ok' },
    { from: 'adm', to: '192.168.120.13', label: 'Admin PC → AI Server 3 (via antena)', expect: 'ok' },
    { from: 'pcw', to: '192.168.110.2', label: 'PC Warehouse → Admin PC', expect: 'ok' },
    { from: 'solw', to: '192.168.110.2', label: 'Solar Warehouse → Admin PC', expect: 'ok' },
    { from: 'solh', to: '192.168.120.11', label: 'Solar Home → AI Server 1', expect: 'ok' },
    { from: 'ai1', to: '192.168.111.1', label: 'AI Server 1 → Server Node 1 (DNS)', expect: 'ok' },
    { from: 'adm', to: '192.168.120.10', label: 'Failover: antena putus → lewat ISP', expect: 'ok', antennaDown: true },
    { from: 'atk', to: '192.168.120.11', label: 'Penyerang Internet → AI Server 1 (ACL)', expect: 'drop' },
  ];

  // Penjelasan tiap perangkat (ditampilkan saat node diklik)
  const info = {
    rh: { role: 'Router gateway rumah (router-on-a-stick)', desc: 'Menjadi gateway untuk VLAN 110–113 lewat sub-interface dot1Q di satu kabel trunk, memberi DHCP ke WiFi, dan memegang dua route ke warehouse: antena (AD 1) dan ISP (AD 10, cadangan). Default route ke ISP untuk Internet.', real: 'Router/firewall rumah (mis. MikroTik/pfSense) dengan port trunk ke switch, port ke AP, port ke radio antena, dan port WAN ke modem ISP.' },
    swh: { role: 'Switch akses rumah, 4 VLAN', desc: 'Memisahkan lalu lintas: VLAN 110 (PC, printer, solar), 111/112/113 (satu VLAN per server node) — jika satu node bermasalah, yang lain tidak terganggu. Gi8/1 trunk ke router. IP SVI 192.168.110.250 hanya untuk manajemen.', real: 'Switch managed 8–16 port (VLAN + trunk 802.1Q).' },
    aph: { role: 'Access point WiFi rumah', desc: 'Bridge WiFi ke port Gi1/0 router; laptop mendapat IP 192.168.109.x dari DHCP router.', real: 'AP WiFi 5/6 dengan SSID keluarga.' },
    n1: { role: 'Server rumah #1 — juga DNS internal', desc: 'VLAN 111 sendiri, gateway 192.168.111.254. Semua host memakai 192.168.111.1 sebagai DNS.', real: 'NAS / DNS (Pi-hole/AdGuard) + layanan rumah; menjalankan server_guard.py.' },
    n2: { role: 'Server rumah #2', desc: 'VLAN 112 sendiri, gateway 192.168.112.254.', real: 'Media/backup server; menjalankan server_guard.py.' },
    n3: { role: 'Server rumah #3', desc: 'VLAN 113 sendiri, gateway 192.168.113.254.', real: 'Home automation / lab; menjalankan server_guard.py.' },
    adm: { role: 'PC admin (Adi)', desc: 'IP statis 192.168.110.2 di VLAN 110 — masuk whitelist server_guard sehingga tidak pernah diblokir. Titik awal sebagian besar uji ping.', real: 'Workstation admin.' },
    prn: { role: 'Printer kantor', desc: 'IP statis 192.168.110.5, VLAN 110 (sebelumnya salah di VLAN 1).', real: 'Printer jaringan.' },
    solh: { role: 'Solar panel rumah (IoT)', desc: 'Menyuplai listrik gedung rumah; dimonitor lewat LAN dengan IP 192.168.110.30 (kabel ke Fa5/1, VLAN 110).', real: 'Inverter surya dengan modul monitoring Ethernet/WiFi.' },
    l1: { role: 'Laptop Adi (WiFi, DHCP)', desc: 'IP 192.168.109.10 dari pool WIFI_HOME.', real: 'Laptop keluarga.' },
    l2: { role: 'Laptop Hasna (WiFi, DHCP)', desc: 'IP 192.168.109.11 dari pool WIFI_HOME.', real: 'Laptop keluarga.' },
    l3: { role: 'Laptop Raska (WiFi, DHCP)', desc: 'IP 192.168.109.12 dari pool WIFI_HOME. Di tab Serangan bisa dipakai sebagai contoh perangkat internal yang terinfeksi.', real: 'Laptop keluarga.' },
    inet: { role: 'Internet (cloud)', desc: 'Upstream ISP-Public (100.64.0.0/24). Tempat penyerang berada.', real: 'Internet publik.' },
    isp: { role: 'Router ISP (jaringan publik)', desc: 'Menghubungkan rumah (203.0.113.0/30) dan warehouse (198.51.100.0/30). Dipakai hanya saat antena putus (floating static di kedua router).', real: 'Dua langganan ISP + VPN antar-router; di PT disederhanakan menjadi static route.' },
    atk: { role: 'Penyerang dari Internet', desc: 'IP 100.64.0.66. Paketnya tiba di R-Warehouse lewat Gi0/1 dan dibuang ACL PUBLIC-IN baris 40 — tidak pernah menyentuh server.', real: 'Bot/scanner di Internet.' },
    rw: { role: 'Router gateway warehouse', desc: 'LAN 192.168.120.0/24, DHCP untuk host baru (.20+), 5 route ke subnet rumah via antena + 5 floating via ISP, ACL PUBLIC-IN pada Gi0/1 masuk.', real: 'Router warehouse dengan port ke radio antena, WAN ISP, dan switch.' },
    sw1: { role: 'Switch warehouse 1 (uplink)', desc: 'Terhubung ke router (Gi0/1), trunk ke SW2 (Gi0/2); host: Server Warehouse & PC Warehouse.', real: 'Switch managed 24 port.' },
    sw2: { role: 'Switch warehouse 2', desc: 'Trunk ke SW1 & SW3; host: AI Server 1 & 2.', real: 'Switch managed 24 port.' },
    sw3: { role: 'Switch warehouse 3', desc: 'Trunk ke SW2; host: AI Server 3 & Solar Panel Warehouse.', real: 'Switch managed 24 port.' },
    swh0: { role: 'Server pusat warehouse', desc: 'IP 192.168.120.10 — penyimpanan pusat yang diakses dari rumah lewat antena (atau ISP saat failover). Menjalankan server_guard.py.', real: 'Server storage/NAS pusat.' },
    pcw: { role: 'PC warehouse', desc: 'IP 192.168.120.20, workstation operator; whitelist server_guard.', real: 'PC operator gudang.' },
    ai1: { role: 'AI Server 1', desc: 'IP 192.168.120.11 — node cluster AI. Target default simulasi serangan; server_guard memblokir flood/brute/scan.', real: 'Server GPU untuk inference/training.' },
    ai2: { role: 'AI Server 2', desc: 'IP 192.168.120.12 — node cluster AI.', real: 'Server GPU.' },
    ai3: { role: 'AI Server 3', desc: 'IP 192.168.120.13 — node cluster AI.', real: 'Server GPU.' },
    solw: { role: 'Solar panel warehouse (IoT)', desc: 'Menyuplai listrik gedung warehouse; dimonitor dengan IP 192.168.120.30 (kabel ke SW3 Fa0/2).', real: 'Inverter surya dengan monitoring.' },
  };

  // Penjelasan lengkap untuk panel "Penjelasan" di dashboard
  const about = [
    { title: 'Apa ini?', body: `<p>Ini simulasi jaringan dua gedung milik Adi: <b>rumah</b> (home server, PC admin, printer, WiFi keluarga) dan <b>warehouse</b> (server pusat + cluster AI). Keduanya dihubungkan oleh <b>antena point-to-point</b> jarak 10–15 km sebagai jalur utama dan <b>jaringan publik lewat ISP</b> sebagai cadangan otomatis. Tiap gedung punya <b>solar panel</b> yang menyuplai listriknya sendiri dan ikut dimonitor lewat jaringan.</p><p>Semua alamat, tabel routing, VLAN, dan ACL di halaman ini <b>sama persis</b> dengan file Packet Tracer <code>Rancangan_Bagan_Home_Server_-_Configured.pkt</code> yang sudah diverifikasi ping 4/4 di semua arah. Mesin simulasi di halaman ini menghitung jalur paket dengan aturan yang sama dengan router sungguhan: cek subnet → ARP/gateway → longest-prefix match → administrative distance → ACL.</p>` },
    { title: 'Segmen jaringan & alamat', body: `<table class="mini"><tr><th>Segmen</th><th>Subnet</th><th>Gateway</th><th>Isi</th></tr>
<tr><td>Rumah VLAN 110</td><td>192.168.110.0/24</td><td>.1</td><td>Admin PC .2, Printer .5, Solar Home .30, SVI switch .250</td></tr>
<tr><td>Rumah VLAN 111/112/113</td><td>192.168.111–113.0/24</td><td>.254</td><td>Server Node 1/2/3 = .1 (Node 1 = DNS)</td></tr>
<tr><td>Rumah WiFi</td><td>192.168.109.0/24</td><td>.1</td><td>Laptop DHCP .10–.12</td></tr>
<tr><td>Antena PtP</td><td>10.0.0.0/30</td><td>—</td><td>R-HomeCloud .1 ↔ R-Warehouse .2 (jalur utama)</td></tr>
<tr><td>Publik rumah / warehouse</td><td>203.0.113.0/30 · 198.51.100.0/30</td><td>—</td><td>lewat ISP-Public (cadangan)</td></tr>
<tr><td>Warehouse</td><td>192.168.120.0/24</td><td>.1</td><td>Server Warehouse .10, AI 1/2/3 .11–.13, PC .20, Solar .30, switch .2–.4, DHCP .20+</td></tr></table>` },
    { title: 'Bagaimana paket berjalan (tab Simulasi)', body: `<ol><li><b>Satu subnet?</b> Host membandingkan IP tujuan dengan subnet-nya. Jika sama (mis. Laptop Adi → Laptop Hasna) → ARP lalu kirim langsung lewat switch/AP.</li><li><b>Beda subnet</b> → kirim ke gateway. Switch meneruskan frame di VLAN host (SW-HomeCloud memisahkan VLAN 110–113), AP meneruskan lewat WiFi.</li><li><b>Router</b> mencari route paling spesifik (longest prefix). Jika ada dua route dengan prefix sama, dipilih <b>administrative distance</b> terkecil: antena (AD 1) menang atas ISP (AD 10).</li><li><b>ACL</b> diperiksa saat paket masuk interface yang punya <code>ip access-group … in</code> (R-Warehouse Gi0/1). Cocok baris permit → lanjut; cocok deny / tidak ada yang cocok → paket dibuang (tanda ✖ merah).</li><li><b>Directly connected</b> → router ARP ke host tujuan dan mengirim lewat switch. Host menjawab <b>echo reply</b> (titik hijau) yang menempuh jalur balik dengan aturan yang sama.</li></ol><p>Panel kanan menampilkan keputusan setiap hop: gateway, VLAN, route yang dipilih beserta AD dan interface keluar, hasil ACL, dan TTL.</p>` },
    { title: 'Failover antena → jalur publik', body: `<p>Kedua router punya route ganda ke gedung seberang: <code>ip route … 10.0.0.x</code> (AD 1) dan <code>ip route … &lt;ISP&gt; 10</code> (AD 10, <i>floating static</i>). IOS hanya memasang route ber-AD terkecil. Saat antena putus (toggle <b>Putus antena</b>), route AD 1 hilang karena interface-nya down, dan route AD 10 otomatis masuk tabel routing — tanpa protokol dinamis, tanpa intervensi.</p><p>Di Packet Tracer ini diuji nyata: <code>shutdown Gi2/0</code> → <code>show ip route static</code> menampilkan <code>[10/0] via 203.0.113.1</code>, ping tetap 4/4 dengan TTL 125 (3 router), dan <code>tracert</code> berpindah lewat 198.51.100.1.</p>` },
    { title: 'Keamanan: ACL router + server_guard.py (tab Serangan)', body: `<p><b>Lapisan 1 — ACL PUBLIC-IN</b> di R-Warehouse Gi0/1 (arah masuk): <code>permit 192.168.108.0/22</code> (rumah 109–111), <code>permit 192.168.112.0/23</code> (rumah 112–113), <code>permit icmp host 198.51.100.1</code> (ping ISP), <code>deny any</code>. Penyerang dari Internet berhenti di sini — coba sumber "Penyerang (Internet)" di tab Simulasi atau Serangan.</p><p><b>Lapisan 2 — server_guard.py</b> berjalan di setiap server sungguhan. Ia mencatat <i>siapa</i> yang mengakses (IP → nama dari daftar host, hostname, MAC, subnet, path, User-Agent) ke <code>access.log</code>, mendeteksi <b>flood/DoS</b> (&gt;60 request/menit per IP), <b>brute force</b> (≥5 login gagal), <b>port scan</b> (≥3 port umpan 21/23/3389/5900/6379), exploit web dan scanner; lalu mengonter: blacklist + blok firewall OS + tarpit + alert Telegram + opsional push ACL ke router. Blokir lepas otomatis; IP whitelist (Admin PC, PC Warehouse, router) tidak pernah diblokir.</p><p>Tab <b>Serangan</b> memutar ulang perilaku itu: pilih sumber & target, tekan Flood / Brute force / Port scan, lihat request naik, status berubah waspada → DIBLOKIR, dan paket berikutnya ditolak di server. Jika sumbernya "Penyerang (Internet)", paket sudah dibuang router sehingga server tidak perlu turun tangan.</p>` },
    { title: 'Tab Konfigurasi & Pengujian', body: `<p><b>Konfigurasi</b> memutar config asli tiap router/switch perintah demi perintah (prompt berubah mengikuti mode IOS) dan menampilkan arti setiap blok di bawahnya. Terminal mini menjawab <code>show running-config</code>, <code>show ip route</code> (ikut berubah saat antena putus), <code>show ip interface brief</code>, <code>show vlan brief</code>, <code>show access-lists</code>, dan <code>ping</code> yang menjalankan simulasi sungguhan.</p><p><b>Pengujian</b> menjalankan 11 skenario yang sama dengan verifikasi di Packet Tracer — antar-VLAN, WiFi, rumah ↔ warehouse, solar ↔ solar, failover, dan penyerang Internet (harapan: DROP) — lalu menandai PASS/FAIL.</p>` },
    { title: 'Solar panel & catatan implementasi nyata', body: `<p>Solar Panel Home (192.168.110.30) dan Solar Panel Warehouse (192.168.120.30) adalah perangkat IoT yang menyuplai listrik gedung masing-masing; di jaringan mereka dikabel ke switch supaya alamatnya pasti (Packet Tracer tidak bisa memaksa IoT memilih AP tertentu).</p><p>Di lapangan: antena PtP = sepasang radio 5 GHz (airFiber/LiteBeam) dengan Ethernet ke router — IP sama persis; jalur publik = dua langganan ISP + VPN (WireGuard/IPsec) antar-router, ACL tetap di sisi warehouse; Server-PT tidak bisa menjalankan Python, jadi <code>server_guard.py</code> dipasang di server fisik/VM yang menggantikan Server Node 1–3, Server Warehouse, dan AI Server 1–3.</p>` },
  ];

  return { zones, nodes, links, configs, explain, tests, info, about };
})();
