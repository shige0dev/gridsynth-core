// src/ui/dialogs/numpad-dialog.js

/**
 * On-screen Numeric Keypad Dialog for precise constant editing
 */
export function openNumpadPrompt(title, init, min = -10.0, max = 10.0) {
    return new Promise(res => {
        const md = document.getElementById('custom-numpad-modal');
        const disp = document.getElementById('numpad-display');
        const titleEl = document.getElementById('numpad-title');
        const rangeEl = document.getElementById('numpad-range');
        const backdrop = document.getElementById('numpad-backdrop');
        const okBtn = document.getElementById('numpad-ok-btn');
        const cancelBtn = document.getElementById('numpad-cancel-btn');
        if (!md || !disp || !backdrop) return res(null);

        if (titleEl) titleEl.textContent = title || 'SET VALUE';
        if (rangeEl) rangeEl.textContent = `${min} ~ ${max}`;

        let curVal = init !== undefined && init !== null ? Number(init) : 0;
        if (isNaN(curVal)) curVal = 0;
        let buf = String(curVal);
        let fresh = true; // Replace buffer on first digit typed

        const updateDisp = () => {
            disp.textContent = buf;
        };
        updateDisp();

        md.classList.remove('hidden');

        const finish = (val) => {
            md.classList.add('hidden');
            window.removeEventListener('keydown', onKeyDown);
            backdrop.onclick = null;
            if (okBtn) okBtn.onclick = null;
            if (cancelBtn) cancelBtn.onclick = null;
            md.querySelectorAll('.numpad-key, .numpad-preset-btn').forEach(btn => {
                btn.onclick = null;
            });
            res(val);
        };

        const handleDigit = (d) => {
            if (fresh) {
                buf = d;
                fresh = false;
            } else {
                if (buf === '0') buf = d;
                else if (buf === '-0') buf = '-' + d;
                else if (buf.replace('-', '').length < 6) buf += d;
            }
            updateDisp();
        };

        const handleDot = () => {
            if (fresh) {
                buf = '0.';
                fresh = false;
            } else if (!buf.includes('.')) {
                buf += '.';
            }
            updateDisp();
        };

        const handleSign = () => {
            if (buf.startsWith('-')) buf = buf.slice(1);
            else buf = '-' + buf;
            if (buf === '' || buf === '-') buf = buf === '-' ? '-0' : '0';
            fresh = false;
            updateDisp();
        };

        const handleBackspace = () => {
            if (fresh) {
                buf = '0';
                fresh = false;
            } else {
                buf = buf.slice(0, -1);
                if (buf === '' || buf === '-') buf = '0';
            }
            updateDisp();
        };

        const handleClear = () => {
            buf = '0';
            fresh = false;
            updateDisp();
        };

        const handleInvert = () => {
            const num = parseFloat(buf);
            if (!isNaN(num) && num !== 0) {
                buf = String(Math.round((1.0 / num) * 100) / 100);
            }
            fresh = true;
            updateDisp();
        };

        const handleConfirm = () => {
            const num = parseFloat(buf);
            if (isNaN(num)) finish(null);
            else {
                const clamped = Math.max(min, Math.min(max, Math.round(num * 100) / 100));
                finish(clamped);
            }
        };

        // Keypad buttons
        md.querySelectorAll('.numpad-key').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const k = btn.dataset.key;
                if (k >= '0' && k <= '9') handleDigit(k);
                else if (k === '.') handleDot();
                else if (k === 'sign') handleSign();
                else if (k === 'backspace') handleBackspace();
                else if (k === 'clear') handleClear();
                else if (k === 'invert') handleInvert();
            };
        });

        // Preset buttons
        md.querySelectorAll('.numpad-preset-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                buf = btn.dataset.val || '0';
                fresh = true;
                updateDisp();
            };
        });

        if (okBtn) okBtn.onclick = handleConfirm;
        if (cancelBtn) cancelBtn.onclick = () => finish(null);
        backdrop.onclick = () => finish(null);

        const onKeyDown = (e) => {
            if (e.key >= '0' && e.key <= '9') {
                e.preventDefault();
                handleDigit(e.key);
            } else if (e.key === '.') {
                e.preventDefault();
                handleDot();
            } else if (e.key === '-' || e.key === '_') {
                e.preventDefault();
                handleSign();
            } else if (e.key === 'Backspace') {
                e.preventDefault();
                handleBackspace();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                finish(null);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                handleConfirm();
            }
        };
        window.addEventListener('keydown', onKeyDown);
    });
}

