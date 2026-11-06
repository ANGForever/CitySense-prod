# 青唐冰雪烩 · AI 伴游小程序

微信小程序 + 高德三维园区地图 + AI 讲解与游线推荐的 Demo。

> 本阶段交付的是**可演示的 Demo**，不是正式一期。点位坐标是演示数据，部分点位名称待主办方书面确认。

## 形态

```
微信小程序（Taro 4 + React）
  └─ <WebView> 全屏
       └─ H5 页面（本仓库 /snow）
            ├─ 高德 JS API 2.0 三维场景 + Three.js 冰块
            ├─ AI 伴游对话抽屉
            └─ 路线高亮 / 打卡
  └─ 原生页：首页 / 展品详情 / 媒体页 / 入口错误页
```

`mp/` 是独立的 Taro 4 子工程（有自己的 package.json、tsconfig 与构建产物），
根工程的 `tsconfig.json` / `eslint.config.mjs` / `.gitignore` 都已把它排除或忽略。

后端与 H5 同处这个 Next.js 包，接口在 `app/api/snow/*`。

## 快速开始

```bash
pnpm install
cp .env.example .env      # 至少填 AMAP_JS_API_KEY、AMAP_SECURITY_JS_CODE、SNOW_LLM_API_KEY
pnpm dev
```

打开：

| 路径 | 说明 |
|---|---|
| `/` | 入口与数据体检 |
| `/snow` | 三维园区地图；`?mode=schematic` 强制二维、`?spot=` / `?route=` / `?openAgent=1` / `?entry=` 为受控入口参数 |
| `/snow/social` | 非微信环境的官方媒体降级页 |
| `/snow/preview` | 园区布局校对（分区 / 40 个点位 / 3 条游线） |
| `/api/snow/bootstrap` | 小程序与 H5 共用的数据契约 |
| `/api/snow/health` | 最小可观测状态 |

## 校验

```bash
pnpm typecheck   # tsc --noEmit
pnpm lint        # eslint
pnpm test        # 数据完整性与几何换算
pnpm build       # 路由表应只剩 / 、/snow/*、/api/snow/*
```

## 目录

```
app/
  layout.tsx  page.tsx  globals.css
  snow/preview/          园区布局校对页
  api/snow/bootstrap/    数据出口
components/snow/
  SnowMapShell.tsx       地图外壳、筛选、路线、AI 抽屉入口
  Amap3DScene.tsx        高德 GLCustomLayer + Three.js 生命周期
  miniprogram.ts         微信 JSSDK 原生页跳转与非微信降级
  map-view.ts            全园视角的纯几何计算（可单测）
  SnowSchematicMap.tsx   俯视示意图（也是 3D 不可用时的兜底）
server/
  ai/chat-client.ts      流式 Chat Completions 客户端（零依赖，原样复用）
  ai/chat-redis.ts       Redis 单例
  snow/types.ts          数据契约
  snow/data.ts           40 点位 / 3 路线 / 3 门 / 3 湖 / 4 分区
  snow/layout.ts         设计图区域级落位与街道骨架
  snow/geo.ts            局部米制网格 → 经纬度
  snow/validation.ts     数据完整性校验
tests/snow/              数据、几何、Agent、配置与全园视角单测
mp/                      Taro 4 小程序子工程（独立构建）
```

## 小程序工程（mp/）

```bash
cd mp
pnpm install
# 构建前设置两个公开域名（仅 https origin，不带路径）：
#   TARO_APP_H5_BASE  = https://<主域名>     web-view 业务域名
#   TARO_APP_API_BASE = https://<主域名>     request 合法域名
pnpm build:weapp         # 产物在 mp/dist/
pnpm typecheck
```

用微信开发者工具**导入 `mp/` 目录**（不是 `mp/dist/`），`miniprogramRoot` 已在
`project.config.json` 指向 `dist/`。

必做的账号配置（G0，均未完成）：

1. 把 `project.config.json` 的 `appid` 从占位的 `touristappid` 换成真实 AppID，
   并确认主体类型支持 `web-view`。
2. 在小程序后台登记 **web-view 业务域名**与 **request 合法域名**，放置域名校验文件。
3. 真机验证 WebView 能加载 H5、原生页能请求 `/api/snow/bootstrap`。

页面：`pages/index`（三入口）、`pages/map`（只有 WebView）、`pages/spot`（二维码/NFC 共用）、
`pages/social`（视频号 API + 抖音信息展示）、`pages/entry-error`。
`src/shared/snow.ts` 是**只读纯类型契约**，小程序不 import 任何 `server/` 代码；
`src/services/entry.ts` 只从扫码内容提取受控 `spotId`，绝不把扫码结果当跳转 URL。

未配置域名时小程序不会拼 localhost 请求：首页明确提示，展品页使用打包的最小离线清单
（5 个核心点位，只有编号和名称，不虚构故事），并标明资料来源。

## 关于密钥

- `AMAP_JS_API_KEY` 会经 `/api/snow/config` 下发给浏览器。JS API Key 本身是公开凭据（靠高德控制台的域名白名单保护），走接口而不是 `NEXT_PUBLIC_*`，好处是换 key 不用重新构建。
- 当前 Demo 的 `AMAP_SECURITY_JS_CODE` 也经 `/api/snow/config` 下发，由高德 SDK 在浏览器使用。不存在地图服务代理；配置域名白名单和配额保护，正式部署前需重新评估安全代理。模型凭据只保存在服务器。

## 部署（反向代理）

`/api/snow/chat` 只接受同源请求。Next 用 `Host` 头推导 `request.url`，所以代理必须保留原始 Host，
否则浏览器发来的 `Origin` 会对不上而被 403。

不要用 `X-Forwarded-Host` 来绕过——那是客户端可伪造的头，信任它等于取消同源限制。

```nginx
server {
  listen 443 ssl http2;
  server_name snow.example.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;

    # 必须：保留公开 Host，Next 据此推导同源判断
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

    # 覆盖 /api/snow/chat 的 25s 预算，否则网关会先于应用超时
    proxy_read_timeout 40s;
    proxy_send_timeout 40s;
  }
}
```

如果代理确实要改写 Host（例如统一到内网域名），把公开地址显式加进白名单：

```
SNOW_ALLOWED_ORIGINS="https://snow.example.com,https://demo.example.com"
```

小程序侧还有两道应用之外的配置：`web-view` 业务域名与 `request` 合法域名都要在小程序后台登记，
且都需要能访问 `https://域名/校验文件.txt`。代理链路要保持该路径可访问。

## 已部署环境（2026-11-06）

| 项 | 值 |
|---|---|
| 主机 | `server@server.angforever.top`（Ubuntu 24.04 / Node 22.23 / pnpm 10.22） |
| 目录 | `/home/server/snow` |
| 监听 | `127.0.0.1:32221`，由 `systemd --user` 的 `snow.service` 常驻（enabled，Linger=yes） |
| 公开地址 | `https://snow.angforever.top`（反向代理已验证可用） |
| 凭据 | `/home/server/snow/.env`，权限 600，不进源码包、不进 git |

部署方式：本地打包源码（排除 `node_modules`、`.next`、`.git`、`.env`、`mp` 产物）→ scp → 服务器
`pnpm install --frozen-lockfile` → `pnpm typecheck` / `pnpm test` / `pnpm build`。`.env` 单独传输，
密钥不会出现在压缩包里。服务器不做 git clone，因为本地改动尚未提交。

生产环境必须额外配置（`frp` 会改写 Host，不配这一条 `/api/snow/chat` 会 403）：

```
SNOW_ALLOWED_ORIGINS="https://snow.angforever.top"
```

小程序域名是编译期注入的，域名变更后要重新构建：

```bash
cd mp
TARO_APP_H5_BASE=https://snow.angforever.top \
TARO_APP_API_BASE=https://snow.angforever.top \
pnpm build:weapp
```

常用运维：

```bash
systemctl --user status snow.service
systemctl --user restart snow.service
journalctl --user -u snow.service -f
```

## 小程序业务域名与校验文件

`mp/` 的 `web-view` src 只能来自编译期注入的 https origin，**代码里不会拼 localhost**。
要让微信开发者工具 / 真机能加载 H5，小程序后台和 H5 服务器需要各做一步：

**小程序后台**（`appid: wxcb8e7ac425cdafde`）

| 位置 | 配置 |
|---|---|
| 开发管理 → 开发设置 → 业务域名 | `https://snow.angforever.top`，并上传校验文件完成域名归属校验 |
| 开发管理 → 开发设置 → 服务器域名 → request 合法域名 | `https://snow.angforever.top` |
| 高德开放平台 → JS API Key | 域名白名单加入 `snow.angforever.top`，否则 WebView 里地图加载会被拒 |

业务域名要求域名已 ICP 备案、证书有效，且**主体类型支持 web-view**（个人主体不支持）。
这两项属于账号/平台资格，代码层无法代劳。

**H5 服务器：校验文件放进去即可，不用重新构建**

微信后台下载的校验文件有两种命名：`MP_verify_XXXX.txt`，**或随机名**
（本项目实际拿到的是 `kfxW3OKXVQ.txt`，内容为 32 位 token）。
`app/[domainVerify]/route.ts` 会在运行时从 `public/` 读取同名文件并以 `text/plain` 返回，
白名单限制为这两类命名，其他单段路径一律 404。**必须保留后台给的原文件名**，
改名会导致校验失败。所以：

```bash
scp kfxW3OKXVQ.txt server@server.angforever.top:/home/server/snow/public/
curl https://snow.angforever.top/kfxW3OKXVQ.txt   # 应返回文件内容
```

本项目已放置 `kfxW3OKXVQ.txt` 并从公网验证：200、`text/plain`、32 字节、与原件一致。

不需要 `pnpm build`，也不需要重启服务。这是因为 `next start` 的 `public/` 静态清单
是构建时快照，运行时新建文件原本会 404；改用路由读取后才做到「放文件即生效」。

`components/snow/miniprogram.ts` 会在微信 WebView 内按需加载微信 JSSDK，
使地图工具条的「官方媒体」能 `wx.miniProgram.navigateTo` 到原生媒体页；
非微信环境不发起这个请求，点击落到 `/snow/social` 降级页。

## 底图与手机布局（2026-11-06）

底图选 **标准全彩**：`amap://styles/normal`，`features` 四类全开（区域面 / 道路 / 兴趣点 / 建筑物），
`showBuildingBlock: true`，天空配淡蓝。三处值统一收在 `server/snow/map-config.ts`，
服务端下发、客户端 fallback、地图实例共用，避免异常路径才暴露的漂移；
`tests/snow/map-config.test.ts` 锁住这个选择。

**彩色只出现在地图画布**，顶栏、底部面板、展品卡、聊天面板仍是 CitySense 的纸白 + 深青 + 白卡。
这是「内容区彩色 / 控件克制」的分层，不是把整套设计语言换掉。

配套的三件事：

- `park-scene.ts` 给每个点位加了**分类色地锚**，把 `bootstrap.categories` 里已有、
  但三维链路一直没用的 6 个分类色接上；选中环外面加白边，避免低饱和冰蓝模型
  在绿地、米白路、水域上糊掉。地锚是不透明圆环，每个点位只多一次 draw call。
- 二维兜底示意图的底板从纯纸白改到极淡绿灰、道路改米白，降级时是「彩色地图变简」
  而不是突然跳到一张白纸。
- 手机端（≤700px）压缩顶栏、把地图工具条由右侧竖排 6 层改成横向一排、
  触控目标提到 40px、AI 伴游入口收进底部面板标题栏（去掉 `bottom:255px` 这种
  跟面板内容高度绑定的死值），并用 `--snow-top-gap` / `--snow-panel-h` /
  `--snow-bottom-gap` 三个变量统一所有浮层定位。

390×844 视口实测（无重叠）：顶栏 12–123、分类筛选 131–175、工具条 185–235、
降级提示 243–280、底部面板 688–832、合规标注 657–680。
桌面端布局保持不变（工具条仍是右侧竖排，AI 仍是右下浮动胶囊）。

## 已知限制

- 除园区中心外，所有坐标由设计图的相对关系推算（`isMock: true`），**不得用于施工定位或安全疏散**。
- `park.coordSystem` 为 `UNCONFIRMED`。若锚点是 WGS-84，全部点位会整体偏移 300–500 米。
- 部分点位名称识读自设计图、尚未经主办方确认（`verified: false`），界面上带「待确认」标记。
- 展品故事为演示文案，描述主题而非声称史实。

## 数据来源

园区结构取自主办方《总体规则布局》与《景观落位图》两张设计图：一核（青唐冰鼓）三区（冰雪燃灯娱乐区 / 新春年味互动区 / 雪韵商街活力区）、三湖彩灯（3/4/5 号湖）、三大门（福禄迎宾 / 平安纳福 / 福满青唐）。点位分类沿用设计图的五色标签体系。


## AI 伴游（本地实现）

`/snow` 的「AI 伴游」及景点卡「听 AI 讲解」打开对话面板。入口支持 `?spot=CT-CORE-01&openAgent=1`，打开不会自动消费模型请求。

- `POST /api/snow/chat`：完整 JSON 回复；严格校验 UUID 会话、1000 字消息和已知点位/路线。
- 两个工具：`get_spot_info`、`recommend_park_route`；最多一次工具轮、两个工具调用、一次最终回答。
- 40 分钟预算会排除 60 分钟亲子路线，可选择 30 分钟短时线；15 分钟返回无匹配。卡片按钮点击后才触发地图动作。
- `GET /api/snow/health` 仅返回安全配置状态；`llmConfigured: true` 表示能构造出模型客户端，不代表调用成功。
- 无凭据、上游故障和超时均返回 `meta.mode: fallback`，界面显示「静态资料 · AI 暂不可用」；静态内容不计为真实工具调用。
- 对话历史使用有界进程内存、24 小时 TTL、最多 10 轮，以 HttpOnly 随机浏览器 Cookie 和会话 UUID 隔离。进程重启清空；多实例部署尚需共享存储。
- 当前频控：每浏览器 8 请求/分钟、每进程 60 请求/分钟、每进程滚动 24 小时最多 500 请求。公网部署还需在可信反向代理增加 IP 频控和持久总额度。

### 凭据变量的坑

真实环境变量**优先于** `.env` 文件（Node 与 Next 都是这条规则）。`OPENAI_API_KEY` 是被大量工具占用的通用名，
开发机上一旦在 User 级设过它，`.env` 里写对的凭据会被静默覆盖，表现为「配置明明是对的却一直 401」。

因此本项目用 `SNOW_LLM_API_KEY`，优先级高于 `OPENAI_API_KEY`。`/api/snow/health` 的 `llmConfigured`
反映的是「能否构造出客户端」，不读单一变量名。

2026-11-05 联调：Ark 曾报 401 `The API key format is incorrect`，根因是上述覆盖问题，不是代码缺陷。
改用 `SNOW_LLM_API_KEY` 后三个场景实测通过：景观讲解（`get_spot_info`，1 卡）、40 分钟亲子请求（选 30 分钟替代线并说明不匹配）、
15 分钟请求（无匹配且拒绝压缩时长）。另发现上游在「未声明 tools」的轮次里可能把调用语法当正文输出，
`server/snow/agent.ts` 的 `sanitizeAnswer` 负责剔除。
