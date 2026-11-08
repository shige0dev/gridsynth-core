// src/ui/dialogs/alert-dialog.js

/**
 * Custom Alert & Error Dialog with Copy Report capability
 */
export function openCustomAlert(title, message, details = [], options = {}, ui = null) {
    return new Promise(res => {
        const md = document.getElementById('custom-alert-modal');
        const dialogBox = document.getElementById('alert-dialog-box');
        const titleEl = document.getElementById('alert-title');
        const msgEl = document.getElementById('alert-message');
        const detailsEl = document.getElementById('alert-details');
        const okBtn = document.getElementById('alert-ok-btn');
        const backdrop = document.getElementById('alert-backdrop');
        const copyBtn = document.getElementById('alert-copy-btn');
        const copyBtnText = document.getElementById('alert-copy-btn-text');
        const iconEl = document.getElementById('alert-icon');

        const isError = options.isError ?? (title.toUpperCase().includes('ERROR') || title.includes('エラー'));
        const showCopy = options.showCopy ?? true;
        const copyBtnLabel = options.copyBtnLabel || (isError ? 'COPY ERROR' : 'COPY REPORT');

        // Build copyable text
        let copyText = options.copyText;
        if (!copyText) {
            const parts = [
                `[${title}]`,
                message
            ];
            if (details && details.length > 0) {
                parts.push('', '--- DETAILS ---');
                const arr = Array.isArray(details) ? details : [details];
                arr.forEach(d => parts.push(typeof d === 'string' ? d : JSON.stringify(d)));
            }
            copyText = parts.filter(Boolean).join('\n');
        }

        if (!md) {
            alert(`${title}\n\n${copyText}`);
            return res();
        }

        if (titleEl) {
            titleEl.textContent = title;
            titleEl.classList.remove('text-amber-300', 'text-rose-300');
            titleEl.classList.add(isError ? 'text-rose-300' : 'text-amber-300');
        }
        if (msgEl) msgEl.textContent = message;

        if (dialogBox) {
            dialogBox.classList.remove('border-amber-500/80', 'border-rose-500/80');
            dialogBox.classList.add(isError ? 'border-rose-500/80' : 'border-amber-500/80');
        }
        if (iconEl) {
            iconEl.classList.remove('text-amber-400', 'text-rose-400');
            iconEl.classList.add(isError ? 'text-rose-400' : 'text-amber-400');
        }
        if (okBtn) {
            okBtn.classList.remove('bg-amber-600', 'hover:bg-amber-500', 'shadow-amber-600/30', 'bg-rose-600', 'hover:bg-rose-500', 'shadow-rose-600/30');
            if (isError) {
                okBtn.classList.add('bg-rose-600', 'hover:bg-rose-500', 'shadow-rose-600/30');
            } else {
                okBtn.classList.add('bg-amber-600', 'hover:bg-amber-500', 'shadow-amber-600/30');
            }
        }

        if (detailsEl) {
            if (details && (Array.isArray(details) ? details.length > 0 : !!details)) {
                detailsEl.classList.remove('hidden');
                const lines = Array.isArray(details) ? details : [details];
                detailsEl.innerHTML = lines.map(d => {
                    const line = typeof d === 'string' ? d : JSON.stringify(d);
                    const safe = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    return `<div class="py-0.5 border-b border-slate-800/60 last:border-0 font-mono">${safe}</div>`;
                }).join('');
            } else {
                detailsEl.classList.add('hidden');
            }
        }

        let copyTimer = null;
        if (copyBtn) {
            if (showCopy) {
                copyBtn.classList.remove('hidden');
                if (copyBtnText) copyBtnText.textContent = copyBtnLabel;
                copyBtn.onclick = async (e) => {
                    e.stopPropagation();
                    let copied = false;
                    if (navigator?.clipboard?.writeText) {
                        try {
                            await navigator.clipboard.writeText(copyText);
                            copied = true;
                        } catch (err) {}
                    }
                    if (!copied) {
                        try {
                            const ta = document.createElement('textarea');
                            ta.value = copyText;
                            ta.style.position = 'fixed';
                            ta.style.opacity = '0';
                            document.body.appendChild(ta);
                            ta.focus();
                            ta.select();
                            copied = document.execCommand('copy');
                            document.body.removeChild(ta);
                        } catch (err) {}
                    }
                    if (copyBtnText) copyBtnText.textContent = 'COPIED! ✅';
                    copyBtn.classList.add('bg-emerald-800', 'text-emerald-200', 'border-emerald-500');
                    if (copyTimer) clearTimeout(copyTimer);
                    copyTimer = setTimeout(() => {
                        if (copyBtnText) copyBtnText.textContent = copyBtnLabel;
                        copyBtn.classList.remove('bg-emerald-800', 'text-emerald-200', 'border-emerald-500');
                    }, 1800);
                    ui?.showToast?.('クリップボードにコピーしました');
                };
            } else {
                copyBtn.classList.add('hidden');
            }
        }

        md.classList.remove('hidden');
        if (typeof lucide !== 'undefined') lucide.createIcons();

        let keyHandler = null;
        const finish = () => {
            md.classList.add('hidden');
            if (okBtn) okBtn.onclick = null;
            if (backdrop) backdrop.onclick = null;
            if (copyBtn) copyBtn.onclick = null;
            if (copyTimer) clearTimeout(copyTimer);
            if (keyHandler) window.removeEventListener('keydown', keyHandler);
            res();
        };

        keyHandler = (e) => {
            if (e.key === 'Escape' || e.key === 'Enter') {
                e.preventDefault();
                finish();
            }
        };

        if (okBtn) okBtn.onclick = finish;
        if (backdrop) backdrop.onclick = finish;
        window.addEventListener('keydown', keyHandler);
    });
}
