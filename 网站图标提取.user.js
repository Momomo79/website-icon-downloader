// ==UserScript==
// @name         网站图标提取（标签页头像下载）
// @namespace    https://momomo.local/site-icon
// @version      0.0.2
// @description  一键提取当前网站的标签页图标（favicon / apple-touch-icon / mask-icon / TileImage），按实际像素取最大尺寸下载到本地。
// @author       Momomo
// @license      MIT
// @homepageURL  https://greasyfork.org/zh-CN/scripts/606228-%E7%BD%91%E7%AB%99%E5%9B%BE%E6%A0%87%E6%8F%90%E5%8F%96-%E6%A0%87%E7%AD%BE%E9%A1%B5%E5%A4%B4%E5%83%8F%E4%B8%8B%E8%BD%BD
// @supportURL   https://greasyfork.org/zh-CN/scripts/606228/feedback
// @source       https://github.com/Momomo79/website-icon-downloader
// @match        *://*/*
// @run-at       document-idle
// @noframes
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @connect      *
// ==/UserScript==

(function () {
    'use strict';

    const TYPE_EXT = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'image/svg+xml': 'svg',
        'image/x-icon': 'ico',
        'image/vnd.microsoft.icon': 'ico',
        'image/avif': 'avif',
        'image/bmp': 'bmp'
    };

    const ICON_REL_RE = /(^|\s)(icon|shortcut|apple-touch-icon|apple-touch-icon-precomposed|mask-icon|fluid-icon)(\s|$)/i;

    function absolute(url, base) {
        if (!url) return null;
        try {
            const u = new URL(url.trim(), base || location.href);
            if (u.protocol !== 'http:' && u.protocol !== 'https:' && u.protocol !== 'data:') return null;
            if (u.protocol === 'data:' && u.href.length < 64) return null;
            return u.href;
        } catch (e) {
            return null;
        }
    }

    function guessType(url) {
        if (/^data:([^;,]+)/i.test(url)) return RegExp.$1.toLowerCase();
        if (/\.svg([?#]|$)/i.test(url)) return 'image/svg+xml';
        if (/\.png([?#]|$)/i.test(url)) return 'image/png';
        if (/\.jpe?g([?#]|$)/i.test(url)) return 'image/jpeg';
        if (/\.webp([?#]|$)/i.test(url)) return 'image/webp';
        if (/\.gif([?#]|$)/i.test(url)) return 'image/gif';
        if (/\.ico([?#]|$)/i.test(url)) return 'image/x-icon';
        return '';
    }

    function parseSize(str) {
        if (!str) return 0;
        const m = /(\d+)\s*[x×]\s*(\d+)/i.exec(str);
        if (m) return Math.min(parseInt(m[1], 10), parseInt(m[2], 10));
        const n = /^(\d+)$/.exec(str.trim());
        return n ? parseInt(n[1], 10) : 0;
    }

    function hostTag() {
        return (location.hostname || 'site').replace(/^www\./i, '').replace(/[\\/:*?"<>|\s]/g, '_');
    }

    function fileName(blob, url, size) {
        let type = ((blob && blob.type) || '').toLowerCase().split(';')[0].trim();
        let ext = TYPE_EXT[type];
        if (!ext) {
            const m = /\.([a-z0-9]{2,5})(?:[?#]|$)/i.exec(url);
            ext = m ? m[1].toLowerCase() : '';
            if (!/^(png|jpe?g|gif|webp|svg|ico|avif|bmp)$/i.test(ext)) ext = 'png';
        }
        const dim = size ? size + 'px' : 'icon';
        return hostTag() + '_' + dim + '.' + ext;
    }

    function collectCandidates() {
        const out = [];
        const seen = new Set();
        const origin = location.origin;

        function push(url, size, label, tier) {
            const abs = absolute(url, location.href);
            if (!abs || seen.has(abs)) return;
            seen.add(abs);
            out.push({
                url: abs,
                size: size || 0,
                tier: tier,
                type: guessType(abs),
                label: label
            });
        }

        let links = [];
        try {
            links = Array.prototype.slice.call(document.querySelectorAll('link[rel]'));
        } catch (e) {}

        links.forEach(function (link) {
            const rel = (link.getAttribute('rel') || '').toLowerCase();
            if (!ICON_REL_RE.test(' ' + rel + ' ')) return;
            const href = link.getAttribute('href');
            if (!href) return;

            let size = parseSize(link.getAttribute('sizes'));
            if (!size) {
                if (/apple-touch-icon/i.test(rel)) size = 180;
                else if (/mask-icon|fluid-icon/i.test(rel)) size = 512;
                else if (/\.svg([?#]|$)/i.test(href)) size = 512;
                else size = 32;
            }
            const label = rel.replace(/\s+/g, ' ') + (size ? ' ' + size + 'px' : '');
            push(href, size, label, 0);
        });

        const tile = document.querySelector('meta[name="msapplication-TileImage"]');
        if (tile && tile.content) push(tile.content, 144, 'msapplication-TileImage', 1);

        if (origin && origin !== 'null') push(origin + '/favicon.ico', 32, 'default /favicon.ico', 2);

        const socialSelectors = [
            'meta[property="og:image"]',
            'meta[name="twitter:image"]',
            'meta[itemprop="image"]'
        ];
        socialSelectors.forEach(function (sel) {
            const el = document.querySelector(sel);
            if (el && el.content) push(el.content, 200, sel, 3);
        });

        return rank(out);
    }

    function score(item) {
        if (item.type === 'image/svg+xml') return 100000;
        let s = item.size || 0;
        if (item.type === 'image/x-icon' || item.type === 'image/vnd.microsoft.icon') s -= 16;
        return s;
    }

    function rank(list) {
        return list.slice().sort(function (a, b) {
            if (a.tier !== b.tier) return a.tier - b.tier;
            return score(b) - score(a);
        });
    }

    function describe(item) {
        const t = item.type ? item.type.replace('image/', '').replace('vnd.microsoft.', '') : 'img';
        return (item.size ? item.size + 'px ' : '') + t.toUpperCase();
    }

    function fetchBlob(url) {
        return new Promise(function (resolve, reject) {
            if (/^data:/i.test(url)) {
                fetch(url).then(function (r) { return r.blob(); }).then(resolve, reject);
                return;
            }
            if (typeof GM_xmlhttpRequest === 'function') {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: url,
                    responseType: 'blob',
                    headers: { 'Accept': 'image/avif,image/webp,image/png,image/svg+xml,image/*,*/*;q=0.8' },
                    timeout: 15000,
                    onload: function (r) {
                        if (r.status >= 200 && r.status < 400 && r.response && r.response.size > 0) {
                            const blob = r.response;
                            if (!blob.type) {
                                const ct = (r.responseHeaders || '').match(/content-type:\s*([^\r\n;]+)/i);
                                if (ct) {
                                    try {
                                        resolve(new Blob([blob], { type: ct[1].trim() }));
                                        return;
                                    } catch (e) {}
                                }
                            }
                            resolve(blob);
                        } else {
                            reject(new Error('HTTP ' + r.status));
                        }
                    },
                    onerror: function () { reject(new Error('network error')); },
                    ontimeout: function () { reject(new Error('timeout')); }
                });
            } else {
                fetch(url, { credentials: 'omit' }).then(function (r) {
                    if (!r.ok) throw new Error('HTTP ' + r.status);
                    return r.blob();
                }).then(resolve, reject);
            }
        });
    }

    function measureByImage(blob, resolve) {
        let url;
        try {
            url = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = function () {
                URL.revokeObjectURL(url);
                resolve(img.naturalWidth || img.naturalHeight || 0);
            };
            img.onerror = function () {
                URL.revokeObjectURL(url);
                resolve(0);
            };
            img.src = url;
        } catch (e) {
            if (url) URL.revokeObjectURL(url);
            resolve(0);
        }
    }

    function measure(blob) {
        return new Promise(function (resolve) {
            try {
                if (!blob || !blob.size) { resolve(0); return; }
                if (blob.type === 'image/svg+xml') { resolve(4096); return; }
                if (typeof createImageBitmap === 'function') {
                    createImageBitmap(blob).then(function (bmp) {
                        const w = (bmp && (bmp.width || bmp.height)) || 0;
                        if (bmp && bmp.close) bmp.close();
                        if (w) resolve(w);
                        else measureByImage(blob, resolve);
                    }).catch(function () { measureByImage(blob, resolve); });
                    return;
                }
                measureByImage(blob, resolve);
            } catch (e) {
                resolve(0);
            }
        });
    }

    function save(blob, name) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.rel = 'noopener';
        a.style.display = 'none';
        (document.body || document.documentElement).appendChild(a);
        a.click();
        setTimeout(function () {
            URL.revokeObjectURL(url);
            if (a.parentNode) a.parentNode.removeChild(a);
        }, 5000);
    }

    async function downloadBest(list) {
        if (!list.length) {
            console.warn('[图标提取] 未找到可用图标');
            return;
        }
        const queue = list.slice(0, 5);
        let best = null;
        let fallback = null;

        for (let i = 0; i < queue.length; i++) {
            const item = queue[i];
            let blob;
            try {
                blob = await fetchBlob(item.url);
            } catch (e) {
                console.warn('[图标提取] 跳过 ' + item.url + ' — ' + e.message);
                continue;
            }
            if (!fallback) fallback = { blob: blob, width: 0, url: item.url };
            const width = await measure(blob);
            if (!width) {
                console.warn('[图标提取] 无法解码 ' + item.url + '，留作兜底');
                continue;
            }
            const candidate = { blob: blob, width: width, url: item.url };

            if (!best || candidate.width > best.width) best = candidate;

            if (blob.type === 'image/svg+xml' || candidate.width >= 256) break;
        }

        if (!best) best = fallback;
        if (!best) {
            console.warn('[图标提取] 所有候选均下载失败');
            return;
        }
        const name = fileName(best.blob, best.url, best.width > 0 && best.width < 4096 ? best.width : 0);
        save(best.blob, name);
        console.log('[图标提取] 已下载 ' + name + ' ← ' + best.url);
    }

    async function downloadOne(item) {
        try {
            const blob = await fetchBlob(item.url);
            const width = await measure(blob);
            const name = fileName(blob, item.url, width > 0 && width < 4096 ? width : 0);
            save(blob, name);
            console.log('[图标提取] 已下载 ' + name + ' ← ' + item.url);
        } catch (e) {
            console.warn('[图标提取] 下载失败 ' + item.url + ' — ' + e.message);
        }
    }

    function copyToClipboard(text) {
        if (typeof GM_setClipboard === 'function') {
            GM_setClipboard(text, 'text');
            return;
        }
        if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {});
    }

    function registerMenu() {
        let list = [];
        try {
            list = collectCandidates();
        } catch (e) {
            console.warn('[图标提取] 收集图标失败：' + e.message);
        }

        const best = list[0];

        GM_registerMenuCommand(
            '⬇ 下载网站图标' + (best ? '（' + describe(best) + '）' : ''),
            function () { downloadBest(collectCandidates()); }
        );

        list.slice(1, 5).forEach(function (item) {
            GM_registerMenuCommand(
                '⬇ 备选：' + describe(item) + ' — ' + item.label.slice(0, 28),
                function () { downloadOne(item); }
            );
        });

        GM_registerMenuCommand('📋 复制图标地址', function () {
            const cur = collectCandidates();
            if (!cur.length) { console.warn('[图标提取] 未找到图标'); return; }
            copyToClipboard(cur[0].url);
            console.log('[图标提取] 已复制 ' + cur[0].url);
        });

        GM_registerMenuCommand('📋 复制全部图标地址', function () {
            const cur = collectCandidates();
            if (!cur.length) { console.warn('[图标提取] 未找到图标'); return; }
            copyToClipboard(cur.map(function (i) { return i.url; }).join('\n'));
            console.log('[图标提取] 已复制 ' + cur.length + ' 条地址');
        });
    }

    if (typeof GM_registerMenuCommand === 'function') {
        registerMenu();
    }
})();
