<h1>网站图标提取（Website Icon Downloader）</h1>

<p>一键把当前网页标签左边那个图标（favicon）的原图下载到本地。</p>

<p><strong>没有悬浮按钮、没有插入面板、没有一行注入样式</strong> —— 页面上完全看不到脚本存在，所有操作都收在油猴菜单里。</p>

<p>作者：<strong>Momomo</strong> · 仓库：<a href="https://github.com/Momomo79/website-icon-downloader">github.com/Momomo79/website-icon-downloader</a></p>

<hr>

<h2>特性</h2>
<ul>
    <li><strong>零注入</strong>：不写 DOM、不加 CSS，只用 <code>GM_registerMenuCommand</code> 注册菜单。</li>
    <li><strong>取最大真图</strong>：不轻信 <code>sizes</code> 声明，解码后按真实像素宽度挑最大的一张。</li>
    <li><strong>不怕跨域</strong>：走 <code>GM_xmlhttpRequest</code> 配 <code>@connect *</code>，放在 CDN 上的图标也拿得到。</li>
    <li><strong>失败自动降级</strong>：首选 404 就换下一个候选；全部解码失败仍会保存首个成功响应。</li>
    <li><strong>适配单页应用</strong>：<code>@run-at document-idle</code>，页面运行时才写入的图标也能识别。</li>
</ul>

<hr>

<h2>安装</h2>
<ol>
    <li>浏览器安装 <a href="https://www.tampermonkey.net/">Tampermonkey</a>（油猴）扩展。</li>
    <li>点下面的安装地址，油猴会直接弹出安装页。</li>
    <li>也可以手动装：油猴面板 → 添加新脚本 → 全选覆盖粘贴 → <kbd>Ctrl</kbd> + <kbd>S</kbd> 保存。</li>
</ol>

<pre><code>https://github.com/Momomo79/website-icon-downloader/raw/main/%E7%BD%91%E7%AB%99%E5%9B%BE%E6%A0%87%E6%8F%90%E5%8F%96.user.js</code></pre>

<p>脚本头已写 <code>@updateURL</code> / <code>@downloadURL</code>，之后有新版本油猴会自动提示更新。</p>

<hr>

<h2>使用</h2>

<p>点浏览器工具栏的油猴图标，菜单里会出现这几条命令：</p>

<table>
    <thead>
        <tr>
            <th>菜单项</th>
            <th>作用</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><code>⬇ 下载网站图标（180px PNG）</code></td>
            <td>下载当前站点质量最高的图标，括号内是自动选中的尺寸与格式</td>
        </tr>
        <tr>
            <td><code>⬇ 备选：48px PNG — icon 48px</code></td>
            <td>手动指定其它尺寸，最多列出 4 条备选，各自标注尺寸与来源</td>
        </tr>
        <tr>
            <td><code>📋 复制图标地址</code></td>
            <td>把首选图标的 URL 复制到剪贴板</td>
        </tr>
        <tr>
            <td><code>📋 复制全部图标地址</code></td>
            <td>复制全部候选 URL，一行一条</td>
        </tr>
    </tbody>
</table>

<p>下载文件名格式为 <code>域名_像素px.扩展名</code>：</p>

<pre><code>douyin.com_180px.png
github.com_icon.svg
bilibili.com_96px.webp</code></pre>

<p>文件按浏览器默认行为存进「下载」目录；想让每次下载都询问位置，可在浏览器设置里打开「下载前询问每个文件的保存位置」。</p>

<hr>

<h2>选图逻辑</h2>

<p>先按四个层级收集候选：</p>

<ol>
    <li><code>&lt;link rel="icon | shortcut icon | apple-touch-icon | apple-touch-icon-precomposed | mask-icon | fluid-icon"&gt;</code></li>
    <li><code>&lt;meta name="msapplication-TileImage"&gt;</code> —— Windows 磁贴图，经常就是站点 Logo 的大图</li>
    <li>站点默认 <code>/favicon.ico</code></li>
    <li><code>og:image</code> / <code>twitter:image</code> / <code>itemprop="image"</code> —— 前三级都空时的兜底</li>
</ol>

<p>再排序：层级优先；同一层级内 <strong>SVG 置顶</strong>（无损可缩放），其余按声明尺寸从大到小，<code>.ico</code> 在同等尺寸下降权。</p>

<p>下载阶段不只看声明：取回二进制后用 <code>createImageBitmap</code> 解码量<strong>真实宽度</strong>，最多试 5 个候选取最大的那张；遇到 SVG 或达到 256px 就提前收手，不做多余请求。</p>

<hr>

<h2>兼容性</h2>

<p>Chrome / Edge / Firefox / Safari，只要装了 Tampermonkey 或 Violentmonkey 即可。脚本用到三个 API：</p>

<ul>
    <li><code>GM_registerMenuCommand</code> —— 菜单命令</li>
    <li><code>GM_xmlhttpRequest</code> —— 跨域取图</li>
    <li><code>GM_setClipboard</code> —— 复制地址</li>
</ul>

<hr>

<h2>常见问题</h2>

<details open>
    <summary>菜单里看不到这些命令？</summary>
    <p>脚本带 <code>@noframes</code>，只在顶层页面注册菜单，iframe 里的页面不会出现命令。如果确认在顶层页仍然看不到，刷新一次页面。</p>
</details>

<details>
    <summary>下下来的图很小、发虚？</summary>
    <p>说明站点本身只提供了小图，或者最大那张放在了没写 <code>sizes</code> 的 <code>apple-touch-icon</code> 上。展开菜单里的「备选」逐个试一次，通常能找到更大的一张。</p>
</details>

<details>
    <summary>点了菜单没反应、也没有文件？</summary>
    <p>先看浏览器是否拦截了「自动下载多个文件」；其次确认页面允许脚本运行（扩展商店页、浏览器内置页不允许油猴注入）。按 <kbd>F12</kbd> 打开控制台，脚本会打印 <code>[图标提取]</code> 开头的日志，说明卡在哪一步。</p>
</details>

<details>
    <summary>为什么后缀有时是 .ico 有时是 .png？</summary>
    <p>后缀先按响应的 <code>Content-Type</code> 反查，猜不到才退回 URL 后缀，避免出现「名叫 .ico 实为 PNG」的错名。遇到这种情况直接改后缀即可，文件本身是好的。</p>
</details>

<hr>

<h2>许可</h2>

<p>MIT © 2026 Momomo</p>
