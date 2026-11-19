# 网站图标提取（Website Icon Downloader）

一个极简的 Tampermonkey 油猴脚本：**一键把当前网页标签左边那个图标（favicon）原图下载到本地**。

没有悬浮按钮、没有插入面板、没有一行注入样式 —— 页面上完全看不到脚本存在，所有操作都在油猴菜单里。

作者：**Momomo**

---

## 安装

1. 浏览器安装 [Tampermonkey](https://www.tampermonkey.net/)（油猴）扩展。
2. 打开 `website-icon-downloader.user.js`，点 Tampermonkey 的 **Raw / 安装**；
   或油猴面板 → 添加新脚本 → 全选覆盖粘贴 → `Ctrl+S` 保存。
3. 打开任意网页，点油猴图标，菜单里会出现本脚本的命令。

## 使用

点浏览器工具栏的油猴图标 → 在菜单里选择：

| 菜单项 | 作用 |
| --- | --- |
| `⬇ 下载网站图标（180px PNG）` | 下载当前站点**质量最高**的图标，括号内是自动选中的尺寸/格式 |
| `⬇ 备选：48px PNG — icon 48px` | 手动指定其它尺寸，最多列出 4 条备选（带尺寸与来源） |
| `📋 复制图标地址` | 把首选图标 URL 复制到剪贴板 |
| `📋 复制全部图标地址` | 复制全部候选 URL，一行一条 |

下载文件名格式：`域名_<像素>px.<扩展名>`，例如 `douyin.com_180px.png`、`github.com_icon.svg`。
浏览器默认保存到「下载」目录（Chrome 可在设置里开启"下载前询问保存位置"）。

## 选图逻辑

脚本按 4 个层级收集候选，再从里面挑真实像素最大的一张：

1. `<link rel="icon | shortcut icon | apple-touch-icon | apple-touch-icon-precomposed | mask-icon | fluid-icon">`
2. `meta[name="msapplication-TileImage"]`（Windows 磁贴图，常是站点 Logo 大图）
3. 站点默认 `/favicon.ico`
4. `og:image` / `twitter:image` / `itemprop="image"`（前三级都没有时的兜底）

排序规则：层级优先；同层级内 **SVG 置顶**（无损可缩放），其余按声明尺寸从大到小，`.ico` 同尺寸降权。

下载阶段不只看声明尺寸：用 `GM_xmlhttpRequest` 取回二进制、`createImageBitmap` 解码量**真实宽度**，
最多试 5 个候选取最大的那张；遇到 SVG 或 ≥256px 提前收敛，不做无意义的请求。

## 健壮性

- **跨域**：走 `GM_xmlhttpRequest` + `@connect *`，不受 CORS 限制，CDN 图标也能拿。
- **首选 404**：自动降级到下一个候选，不中断。
- **全部解码失败**：仍会把第一个成功响应的原始文件存下来，不当场放弃。
- **动态站点**：`@run-at document-idle`，SPA 运行时写入的 `<link rel=icon>` 也能识别。
- **文件名后缀**：先按响应 `Content-Type` 反查，猜不到才退回 URL 后缀，避免 `.ico` 实为 PNG 的错名。
- **`@noframes`**：只在顶层页面注册菜单，iframe 里不会重复执行。

## 兼容性

Chrome / Edge / Firefox / Safari 等支持 Tampermonkey 或 Violentmonkey 的浏览器。
需要 `GM_registerMenuCommand`、`GM_xmlhttpRequest`、`GM_setClipboard` 三个 API（Violentmonkey 同名支持）。

## 许可

MIT © 2026 Momomo
