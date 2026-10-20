// src/ui/json-io-dialog.js
import { safeClone } from '../core/utils.js?v=282';

export function analyzeJsonError(rawText, err) {
    let cleanText = (rawText || '').trim();
    if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
    }

    const lines = cleanText.split('\n');
    let line = 1;
    let col = 1;

    const lineColMatch = err?.message?.match(/line\s+(\d+)\s+column\s+(\d+)/i);
    const posMatch = err?.message?.match(/position\s+(\d+)/i) || err?.message?.match(/char\s+(\d+)/i);

    if (lineColMatch) {
        line = parseInt(lineColMatch[1], 10);
        col = parseInt(lineColMatch[2], 10);
    } else if (posMatch) {
        const pos = parseInt(posMatch[1], 10);
        const prefix = cleanText.slice(0, pos);
        const prefixLines = prefix.split('\n');
        line = prefixLines.length;
        col = prefixLines[prefixLines.length - 1].length + 1;
    }

    const contextLines = [];
    const startL = Math.max(1, line - 2);
    const endL = Math.min(lines.length, line + 2);

    for (let i = startL; i <= endL; i++) {
        const lineContent = lines[i - 1] || '';
        const lineNumStr = String(i).padStart(4, ' ');
        if (i === line) {
            contextLines.push(`> ${lineNumStr} | ${lineContent}`);
            const pointerPad = ' '.repeat(Math.max(0, col - 1));
            contextLines.push(`       | ${pointerPad}^`);
        } else {
            contextLines.push(`  ${lineNumStr} | ${lineContent}`);
        }
    }

    return {
        line,
        col,
        snippet: contextLines.join('\n'),
        message: err?.message || 'Unknown syntax error'
    };
}

export const JsonIoDialog = {
    /**
     * Serializes a single module's data in the exact same structure as exportPatch.
     */
    exportModuleData(m, onExport = null) {
        if (!m) return {};
        const { col, row, id: _id, ...props } = m;
        const cleanProps = {};
        Object.entries(props).forEach(([k, v]) => {
            if (!k.startsWith('_')) cleanProps[k] = v;
        });
        const cloned = safeClone(cleanProps);
        if (typeof onExport === 'function') {
            onExport(cloned, m);
        } else if (m.type === 'WAVE' && m._isLinked) {
            cloned.data = '';
            cloned.peaks = null;
        }
        return { type: m.type, ...cloned };
    },

    /**
     * Strips markdown code fences and parses JSON text.
     */
    parseJsonText(rawText) {
        const trimmed = (rawText || '').trim();
        if (!trimmed) {
            return { ok: false, empty: true };
        }
        let text = trimmed;
        if (text.startsWith('```')) {
            text = text.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
        }
        try {
            const parsed = JSON.parse(text);
            return { ok: true, data: parsed, cleanText: text };
        } catch (err) {
            return {
                ok: false,
                syntaxError: true,
                err,
                info: analyzeJsonError(text, err)
            };
        }
    },

    /**
     * Opens the shared #json-io-modal in Export mode.
     * @param {Object} opts
     * @param {string} opts.title - Modal header title
     * @param {string} [opts.icon='upload'] - Lucide icon name
     * @param {string} opts.jsonStr - Text to display and copy
     * @param {string[]} [opts.infoBadges=[]] - Info strings on the left side of footer
     * @param {string} [opts.btnColorCls='bg-cyan-600 hover:bg-cyan-500 shadow-cyan-600/30'] - Copy button color classes
     * @param {string} [opts.copyToast='JSONをクリップボードにコピーしました'] - Toast message on copy
     * @param {Function} [opts.showToast] - Toast callback
     * @param {string} [opts.leftActionHtml=''] - Optional custom HTML on the left side of footer
     * @param {Function} [opts.onBindFooter] - Optional callback after footer HTML is injected
     */
    openExport({
        title = 'JSON EXPORT',
        icon = 'upload',
        jsonStr = '',
        infoBadges = [],
        btnColorCls = 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-600/30',
        copyToast = 'JSONをクリップボードにコピーしました',
        showToast = null,
        leftActionHtml = '',
        onBindFooter = null
    } = {}) {
        const modal = document.getElementById('json-io-modal');
        const titleEl = document.getElementById('json-io-title');
        const iconEl = document.getElementById('json-io-icon');
        const textarea = document.getElementById('json-io-textarea');
        const footer = document.getElementById('json-io-footer');
        if (!modal || !textarea) return;

        const toast = (msg) => {
            if (typeof showToast === 'function') showToast(msg);
            else window.__GS_UI__?.showToast?.(msg);
        };

        if (titleEl) titleEl.textContent = title;
        if (iconEl) iconEl.setAttribute('data-lucide', icon);
        textarea.value = jsonStr;
        textarea.readOnly = true;

        if (footer) {
            const leftContent = leftActionHtml || `
                <div class="text-[8px] text-slate-400 font-mono flex items-center gap-2">
                    ${infoBadges.map(b => `<span>${b}</span>`).join('')}
                </div>
            `;
            footer.innerHTML = `
                ${leftContent}
                <div class="flex items-center gap-1.5">
                    <button id="json-copy-btn" class="h-6 px-3 ${btnColorCls} text-white font-bold text-[9px] rounded-lg transition flex items-center gap-1 shadow-md cursor-pointer">
                        <i data-lucide="copy" class="w-3 h-3 pointer-events-none"></i>
                        <span id="json-copy-btn-text" class="pointer-events-none">COPY TO CLIPBOARD</span>
                    </button>
                    <button id="json-close-btn" class="h-6 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[9px] rounded-lg transition border border-slate-700 cursor-pointer">
                        CLOSE
                    </button>
                </div>
            `;

            document.getElementById('json-copy-btn')?.addEventListener('click', () => {
                navigator.clipboard.writeText(jsonStr).then(() => {
                    const btnText = document.getElementById('json-copy-btn-text');
                    if (btnText) btnText.textContent = 'COPIED! ✅';
                    toast(copyToast);
                    setTimeout(() => {
                        const bt = document.getElementById('json-copy-btn-text');
                        if (bt) bt.textContent = 'COPY TO CLIPBOARD';
                    }, 2000);
                }).catch(() => {
                    textarea.focus();
                    textarea.select();
                    document.execCommand('copy');
                    toast('選択部分をコピーしました');
                });
            });

            document.getElementById('json-close-btn')?.addEventListener('click', () => {
                modal.classList.add('hidden');
            });

            if (typeof onBindFooter === 'function') {
                onBindFooter(footer, modal, textarea);
            }
        }

        modal.classList.remove('hidden');
        if (typeof lucide !== 'undefined') lucide.createIcons();
        setTimeout(() => {
            textarea.focus();
            textarea.select();
        }, 50);
    },

    /**
     * Opens the shared #json-io-modal in Import mode.
     * @param {Object} opts
     * @param {string} opts.title - Modal header title
     * @param {string} [opts.icon='download'] - Lucide icon name
     * @param {string} [opts.placeholder='ここに JSON テキストを貼り付けてください...'] - Textarea placeholder
     * @param {Array<{id: string, label: string, icon?: string, cls?: string, onClick: (rawText: string, modal: HTMLElement, textarea: HTMLTextAreaElement) => void}>} opts.actions - Right-side action buttons
     * @param {Function} [opts.showToast] - Toast callback
     */
    openImport({
        title = 'JSON IMPORT',
        icon = 'download',
        placeholder = 'ここに JSON テキストを貼り付けてください...',
        actions = [],
        showToast = null
    } = {}) {
        const modal = document.getElementById('json-io-modal');
        const titleEl = document.getElementById('json-io-title');
        const iconEl = document.getElementById('json-io-icon');
        const textarea = document.getElementById('json-io-textarea');
        const footer = document.getElementById('json-io-footer');
        if (!modal || !textarea) return;

        const toast = (msg) => {
            if (typeof showToast === 'function') showToast(msg);
            else window.__GS_UI__?.showToast?.(msg);
        };

        if (titleEl) titleEl.textContent = title;
        if (iconEl) iconEl.setAttribute('data-lucide', icon);
        textarea.value = '';
        textarea.placeholder = placeholder;
        textarea.readOnly = false;

        if (footer) {
            const buttonsHtml = actions.map(act => {
                const cls = act.cls || 'bg-cyan-700 hover:bg-cyan-600 text-white';
                const ic = act.icon ? `<i data-lucide="${act.icon}" class="w-3 h-3 pointer-events-none"></i>` : '';
                return `
                    <button id="${act.id}" class="h-6 px-2.5 ${cls} font-bold text-[9px] rounded-lg transition flex items-center gap-1 cursor-pointer">
                        ${ic}
                        <span>${act.label}</span>
                    </button>
                `;
            }).join('');

            footer.innerHTML = `
                <button id="json-paste-btn" class="h-6 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[9px] rounded-lg transition border border-slate-700 flex items-center gap-1 cursor-pointer">
                    <i data-lucide="clipboard" class="w-3 h-3 pointer-events-none"></i>PASTE
                </button>
                <div class="flex items-center gap-1.5">
                    ${buttonsHtml}
                </div>
            `;

            document.getElementById('json-paste-btn')?.addEventListener('click', async () => {
                try {
                    const text = await navigator.clipboard.readText();
                    if (text) {
                        textarea.value = text;
                        toast('クリップボードから貼り付けました');
                    }
                } catch (e) {
                    toast('貼り付けは手動 (Ctrl+V) で行ってください');
                }
            });

            actions.forEach(act => {
                document.getElementById(act.id)?.addEventListener('click', () => {
                    act.onClick?.(textarea.value, modal, textarea);
                });
            });
        }

        modal.classList.remove('hidden');
        if (typeof lucide !== 'undefined') lucide.createIcons();
        setTimeout(() => {
            textarea.focus();
            textarea.select();
        }, 50);
    }
};

export default JsonIoDialog;
