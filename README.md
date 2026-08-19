# Agnes AI 图片视频生成 - uTools 插件

基于 [Agnes AI](https://agnes-ai.com) 模型的 uTools 插件，支持 AI 图片生成（文生图 / 图生图）和视频生成（文生视频 / 图生视频），并提供会话历史记录管理。

## 功能概览

| 功能 | 说明 |
|------|------|
| 文生图 | 输入提示词，生成 AI 图片 |
| 图生图 | 上传本地图片或输入 URL，基于参考图生成新图片 |
| 文生视频 | 输入提示词，生成 AI 视频 |
| 图生视频 | 上传本地图片，基于参考图生成视频 |
| 历史记录 | 自动保存所有生成记录，支持查看、下载、删除 |
| API 设置 | 配置 Agnes API Key，支持连接测试 |

## 技术栈

- **框架**: Vue 3 + Vite
- **UI**: 纯 CSS（无第三方 UI 库）
- **运行环境**: uTools（基于 Electron）
- **API**: Agnes AI API（`https://apihub.agnes-ai.com/v1`）
- **存储**: uTools dbStorage（本地持久化）

## 项目结构

```
Agnes-AI图片视频生成/
├── public/                     # 静态资源（构建时复制到 dist/）
│   ├── plugin.json              # uTools 插件配置
│   ├── logo.png                 # 插件图标（256×256 透明 PNG）
│   └── preload/                 # preload 脚本（CommonJS）
│       ├── services.js          # API 调用、API Key 管理、历史记录
│       └── package.json        # CommonJS 配置
├── src/                         # Vue 源码
│   ├── App.vue                  # 根组件（导航 + 路由）
│   ├── main.js                  # 入口文件
│   ├── main.css                 # 全局样式
│   ├── dev-mock.js              # 开发环境 mock（浏览器调试用）
│   ├── ImageGen/
│   │   └── index.vue            # 图片生成页面
│   ├── VideoGen/
│   │   └── index.vue            # 视频生成页面
│   ├── Settings/
│   │   └── index.vue           # 设置页面
│   └── History/
│       └── index.vue           # 历史记录页面
├── index.html                   # Vite 入口 HTML
├── vite.config.js               # Vite 配置
├── package.json
└── dist/                        # 构建产物（uTools 插件）
    ├── plugin.json
    ├── index.html
    ├── logo.png
    ├── assets/
    │   └── index.js             # IIFE 格式 JS
    └── preload/
        ├── services.js
        └── package.json
```

## 快速开始

### 1. 获取 API Key

1. 访问 [Agnes AI 平台](https://platform.agnes-ai.com/settings/apiKeys)
2. 注册 / 登录账号
3. 创建 API Key 并复制

### 2. 安装依赖

```bash
npm install
```

### 3. 开发模式

```bash
npm run dev
```

浏览器访问 `http://localhost:5173` 即可调试（开发环境自带 mock 数据，无需真实 API Key）。

### 4. 构建插件

```bash
npm run build
```

构建产物在 `dist/` 目录。

### 5. 在 uTools 中加载

1. 打开 uTools → 右键托盘 → 开发者中心
2. 点击「选择工程 plugin.json 文件夹」
3. 选择 `dist/plugin.json`
4. 在 uTools 输入以下关键词使用：

| 关键词 | 功能 |
|--------|------|
| 图片生成 / AI画图 / 生图 | 打开图片生成 |
| 视频生成 / AI视频 / 生视频 | 打开视频生成 |
| Agnes设置 / API Key | 打开设置页 |
| 历史记录 / 生成记录 | 打开历史记录 |

## 使用指南

### 图片生成

1. **文生图**: 输入提示词 → 选择分辨率、模型、生成数量 → 点击生成
2. **图生图**: 切换到图生图模式 → 上传本地图片或输入 URL → 输入提示词 → 生成
3. **高级选项**: 可设置负面提示词、随机种子
4. **分辨率**: 支持 1K / 1.5K / 2K 多种尺寸
5. **多图生成**: 支持 1-4 张并行生成
6. 生成完成后可下载、复制图片

![image-20260819151817935](E:\Stu\Agnes-AI\Agnes-AI图片视频生成\image-20260819151817935.png)

### 视频生成

1. **文生视频**: 输入提示词 → 选择时长、分辨率 → 点击生成
2. **图生视频**: 切换到图生视频模式 → 上传参考图 → 输入提示词 → 生成
3. **分辨率**: 支持 720P / 1080P 多种比例
4. **时长**: 5 秒 / 10 秒
5. 生成过程显示实时进度，完成后可预览、下载

![image-20260819152046039](E:\Stu\Agnes-AI\Agnes-AI图片视频生成\image-20260819152046039.png)

### 历史记录

- 自动保存所有生成记录（图片 + 视频）
- 支持按类型筛选（全部 / 图片 / 视频）
- 可查看完整提示词、参数、结果
- 支持单条删除和清空全部
- 最多保留 200 条记录

![image-20260819152204438](E:\Stu\Agnes-AI\Agnes-AI图片视频生成\image-20260819152204438.png)

### API 设置

- 在设置页输入 API Key
- 点击「测试连接」验证有效性
- API Key 通过 uTools dbStorage 本地加密存储

![image-20260819151554897](E:\Stu\Agnes-AI\Agnes-AI图片视频生成\image-20260819151554897.png)

## API 参考

### 图片生成

```
POST https://apihub.agnes-ai.com/v1/images/generations
Authorization: Bearer {API_KEY}

{
  "model": "agnes-image-2.0-flash",
  "prompt": "...",
  "n": 1,
  "size": "1024x1024",
  "response_format": "url",
  "extra_body": {
    "image": ["..."],
    "negative_prompt": "...",
    "seed": 12345
  }
}
```

**可用模型**: `agnes-image-2.0-flash`, `agnes-image-2.1-flash`

### 视频生成

```
POST https://apihub.agnes-ai.com/v1/videos
Authorization: Bearer {API_KEY}

{
  "model": "agnes-video-v2.0",
  "prompt": "...",
  "image": "...",
  "width": 1152,
  "height": 768,
  "num_frames": 120,
  "frame_rate": 24,
  "negative_prompt": "...",
  "seed": 12345
}
```

**查询视频结果**:

```
GET https://apihub.agnes-ai.com/agnesapi?video_id={video_id}
Authorization: Bearer {API_KEY}
```

返回 `status`（completed/processing/failed）、`progress`、`metadata.url` 等字段。

## 构建说明

本项目使用 Vite 构建，配置了以下特殊处理以兼容 uTools（Electron）环境：

- **IIFE 格式**: 输出立即执行函数，不依赖 ES 模块
- **去除 `type="module"`**: 使用普通 `<script defer>` 标签
- **去除 `crossorigin`**: 避免 `file://` 协议下的 CORS 问题
- **CommonJS preload**: preload 脚本使用 CommonJS 格式，不经过压缩

## 常见问题

### 页面空白

- 确保 uTools 加载的是 `dist/plugin.json`（不是项目根目录）
- 删除插件后重新添加（不要只刷新）

### 图标不更新

- uTools 只在添加插件时读取 logo，刷新不生效
- 删除插件 → 重新添加 `dist/plugin.json`

### 视频生成卡在 100%

- 可能是 API 返回的视频 URL 字段不在预期位置
- 已兼容 `metadata.url`、`video_url`、`url`、`output_url`、`result_url` 等多个字段
- 如果状态为完成但 URL 为空，会自动重试获取链接

### API 调用报 401

- 检查 API Key 是否正确
- 前往 [API Key 管理页面](https://platform.agnes-ai.com/settings/apiKeys) 确认 Key 有效

### 视频查询频率受限

- 自动退避重试：遇到 rate limit 自动延长轮询间隔（10s → 15s → ... → 60s）
- 请求成功后恢复正常间隔

## License

MIT
