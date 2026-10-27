import { NOTES, midiToNoteName, midiToFreq, freqToMidi, cvToNoteName } from '../core/musical.js?v=367';

export const UIHelpers = {
    NOTES,
    midiToNoteName,
    midiToFreq,
    freqToMidi,
    cvToNoteName,
    formatTime: (v) => {
        if (v < 0.01) return (v * 1000).toFixed(1) + 'ms';
        if (v < 1.0) return Math.round(v * 1000) + 'ms';
        return v.toFixed(2) + 's';
    },
    /**
     * Standardized 2D canvas grid and crosshair renderer
     * Used across SCOPE, LISS / XY, and PAD
     */
    drawGraticule: (ctx2d, w, h, options = {}) => {
        const isModal = options.isModal ?? false;
        const cols = options.cols ?? (options.divisions ?? (isModal ? 8 : 4));
        const rows = options.rows ?? (options.divisions ?? (isModal ? 8 : 4));
        const showSubgrid = options.showSubgrid ?? isModal;
        const gridColor = options.gridColor ?? (isModal ? '#1e293b' : 'rgba(30, 41, 59, 0.5)');
        const axisColor = options.axisColor ?? (isModal ? '#334155' : '#1e293b');
        const axisWidth = options.axisWidth ?? (isModal ? 1.0 : 0.8);
        const gridWidth = options.gridWidth ?? 0.5;

        // Subgrid lines
        if (showSubgrid) {
            ctx2d.save();
            ctx2d.strokeStyle = gridColor;
            ctx2d.lineWidth = gridWidth;
            ctx2d.beginPath();
            for (let i = 1; i < cols; i++) {
                const x = (w / cols) * i;
                ctx2d.moveTo(x, 0);
                ctx2d.lineTo(x, h);
            }
            for (let i = 1; i < rows; i++) {
                const y = (h / rows) * i;
                ctx2d.moveTo(0, y);
                ctx2d.lineTo(w, y);
            }
            ctx2d.stroke();
            ctx2d.restore();
        }

        const showAxisX = options.showAxisX ?? true;
        const showAxisY = options.showAxisY ?? true;

        // Center crosshair axes
        if (showAxisX || showAxisY) {
            ctx2d.save();
            ctx2d.strokeStyle = axisColor;
            ctx2d.lineWidth = axisWidth;
            ctx2d.beginPath();
            if (showAxisY) {
                ctx2d.moveTo(0, h / 2);
                ctx2d.lineTo(w, h / 2);
            }
            if (showAxisX) {
                ctx2d.moveTo(w / 2, 0);
                ctx2d.lineTo(w / 2, h);
            }
            ctx2d.stroke();
            ctx2d.restore();
        }
    },
    createVSliderHTML: (id, label, min, max, step, val, unitStr, accentColor = 'cyan', isPatched = false, customDisp = null, power = 1) => {
        const disp = customDisp ?? (Math.abs(val) < 10 && step < 1 ? Number(val).toFixed(2) : Math.round(val));
        let sMin = min, sMax = max, sStep = step, sVal = val;
        if (power && power !== 1) {
            sMin = 0; sMax = 1; sStep = 0.001;
            const norm = Math.max(0, Math.min(1, (val - min) / (max - min)));
            sVal = Math.pow(norm, 1 / power);
        }
        const unitHtml = (unitStr !== undefined && unitStr !== null && unitStr !== '') ? unitStr : '&nbsp;';
        return `
            <div class="flex flex-col items-center gap-1 flex-1 min-w-0 ${isPatched ? 'opacity-30 pointer-events-none' : ''}">
                <span class="text-[8px] font-bold text-slate-400 uppercase tracking-tight truncate w-full text-center leading-none">${label}</span>
                <span id="${id}-disp" class="inline-flex items-center justify-center min-w-[28px] min-h-[18px] text-[9px] text-${accentColor}-300 font-mono font-bold cursor-ns-resize touch-none select-none hover:bg-slate-800/80 px-1 py-0.5 rounded transition-colors leading-none">${disp}</span>
                <div class="h-12 min-h-[48px] flex items-center justify-center my-0.5 shrink-0 touch-none">
                    <input type="range" id="${id}" min="${sMin}" max="${sMax}" step="${sStep}" value="${sVal}" class="native-vslider accent-${accentColor}-500 shrink-0" ${isPatched ? 'disabled' : ''}>
                </div>
                <span class="text-[8px] font-mono text-slate-400 truncate min-h-[12px] flex items-center justify-center leading-none">${unitHtml}</span>
            </div>`;
    },
    bindScrubber: (dispId, sliderId, formatter, cb, power = 1, min = null, max = null) => {
        const disp = typeof dispId === 'string' ? document.getElementById(dispId) : dispId;
        const slider = typeof sliderId === 'string' ? document.getElementById(sliderId) : sliderId;
        if (!disp || !slider) return;
        if (disp._hasScrubber) return;
        disp._hasScrubber = true;

        let isScrub = false, startY = 0, startVal = 0;

        const onPointerMove = (e) => {
            if (!isScrub) return;
            e.preventDefault();
            const sMin = (min !== null && min !== undefined) ? min : (parseFloat(slider.min) || 0);
            const sMax = (max !== null && max !== undefined) ? max : (parseFloat(slider.max) || 100);
            const sStep = parseFloat(slider.step) || 1;
            if (power && power !== 1) {
                const delta = (startY - e.clientY) / 400;
                let u = Math.max(0, Math.min(1, startVal + delta));
                slider.value = u;
                let v = sMin + (sMax - sMin) * Math.pow(u, power);
                disp.textContent = formatter ? formatter(v) : (v < 1 ? v.toFixed(3) : v.toFixed(2));
                cb(v);
            } else if (sStep >= 1) {
                const stepCount = Math.round((startY - e.clientY) / 15);
                let n = Math.max(sMin, Math.min(sMax, Math.round(startVal + stepCount * sStep)));
                slider.value = n;
                disp.textContent = formatter ? formatter(n) : Math.round(n);
                cb(n);
            } else {
                const fineStep = sStep * 0.1 || 0.001, delta = (startY - e.clientY) * ((sMax - sMin) / 1000);
                let n = Math.max(sMin, Math.min(sMax, Math.round((startVal + delta) / fineStep) * fineStep));
                slider.value = n;
                disp.textContent = formatter ? formatter(n) : n.toFixed(fineStep < 0.1 ? 2 : 1);
                cb(n);
            }
        };

        const stop = (e) => {
            if (!isScrub) return;
            isScrub = false;
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', stop);
            window.removeEventListener('pointercancel', stop);
            try { disp.releasePointerCapture(e.pointerId); } catch(err){}
            disp.classList.remove('ring-1', 'ring-yellow-400/80', 'bg-yellow-950/60', 'text-yellow-200');
        };

        disp.addEventListener('pointerdown', (e) => {
            if (slider.disabled) return;
            e.preventDefault();
            e.stopPropagation();
            isScrub = true;
            try { disp.setPointerCapture(e.pointerId); } catch(_) {}
            startY = e.clientY;
            startVal = parseFloat(slider.value) || 0;
            disp.classList.add('ring-1', 'ring-yellow-400/80', 'bg-yellow-950/60', 'text-yellow-200');

            window.addEventListener('pointermove', onPointerMove, { passive: false });
            window.addEventListener('pointerup', stop);
            window.addEventListener('pointercancel', stop);
        });
    },
    bindSlider: (id, formatter, cb, power = 1, min = null, max = null) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', (e) => {
            const raw = parseFloat(e.target.value);
            let v = raw;
            if (power && power !== 1) {
                const sMin = (min !== null && min !== undefined) ? min : (parseFloat(el.min) || 0);
                const sMax = (max !== null && max !== undefined) ? max : (parseFloat(el.max) || 100);
                v = sMin + (sMax - sMin) * Math.pow(Math.max(0, Math.min(1, raw)), power);
            }
            const disp = document.getElementById(`${id}-disp`);
            if (disp) disp.textContent = formatter(v);
            cb(v);
        });
        UIHelpers.bindScrubber(`${id}-disp`, id, formatter, cb, power, min, max);
    },
    bindButtonGroup: (selector, activeCls, inactiveCls, cb) => {
        document.querySelectorAll(selector).forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll(selector).forEach(b => b.className = `${b.className.replace(activeCls, '').replace(inactiveCls, '')} ${inactiveCls}`);
                e.target.className = `${e.target.className.replace(inactiveCls, '')} ${activeCls}`;
                cb(e.target.dataset.val);
            });
        });
    },
    getMultiPitchInPorts: (m, maxCh = 4) => {
        const ch = Math.min(maxCh, Math.max(1, m?.channels || 1));
        const inPorts = [];
        for (let c = 1; c <= ch; c++) inPorts.push({ port: c === 1 ? 'cv_in' : `cv_in${c}`, color: 'bg-yellow-400' });
        return inPorts;
    },
    resolveSliderState: (sl, mod, ctx) => {
        const hasPatched = (portDef) => {
            if (!portDef || !ctx?.patched) return false;
            return Array.isArray(portDef) ? portDef.some(p => ctx.patched.has(p)) : ctx.patched.has(portDef);
        };

        const isP = sl.cvPort ? hasPatched(sl.cvPort) : false;
        const isReqMissing = sl.requirePort ? !hasPatched(sl.requirePort) : false;
        const customDisabled = typeof sl.disabled === 'function' ? sl.disabled(mod, ctx) : !!sl.disabled;
        const isDisabled = !!(isP || isReqMissing || customDisabled);

        const curRaw = sl.getVal ? sl.getVal(mod) : (mod[sl.key] ?? sl.default ?? sl.min);
        const val = isP ? (sl.patchedVal ?? sl.min) : curRaw;

        let customText = null;
        if (isP) {
            customText = sl.patchedText || 'EXT';
        } else if (isReqMissing && sl.unpatchedText) {
            customText = sl.unpatchedText;
        } else if (sl.format) {
            customText = sl.format(val);
        }

        let unitText = sl.unit || '';
        if (isP) {
            unitText = sl.patchedUnit || 'PATCHED';
        } else if (isReqMissing && sl.unpatchedUnit) {
            unitText = sl.unpatchedUnit;
        }

        return { isP, isReqMissing, isDisabled, val, customText, unitText };
    },
    renderSchemaModal: (mod, ctx, schemaDef) => {
        const s = typeof schemaDef === 'function' ? schemaDef(mod, ctx) : schemaDef;
        let html = '';

        // 1. Header controls (channel selector, toggles, inline group buttons)
        if (s.header) {
            const h = s.header;
            let leftHtml = '';
            let rightHtml = '';

            // Channel count control: e.g. { label: 'OSCS', min: 1, max: 4 }
            if (h.channel) {
                const ch = Math.min(h.channel.max || 4, Math.max(h.channel.min || 1, mod.channels || 1));
                leftHtml = `
                    <div class="flex items-center gap-1.5">
                        <span class="text-[8px] text-slate-400 font-semibold uppercase">${h.channel.label || 'CH'}</span>
                        <div class="flex items-center gap-1 bg-slate-950 px-1 py-0.5 rounded border border-slate-800">
                            <button id="schema-header-ch-dec" class="w-4 h-4 rounded bg-slate-800 text-[10px] font-bold leading-none">−</button>
                            <span class="w-4 text-center text-[10px] font-mono font-bold text-cyan-300">${ch}</span>
                            <button id="schema-header-ch-inc" class="w-4 h-4 rounded bg-slate-800 text-[10px] font-bold leading-none">＋</button>
                        </div>
                    </div>`;
            }

            // Header Toggle button: e.g. { key: 'quantize', label: 'QLZ', color: 'cyan' }
            if (h.toggle) {
                const t = h.toggle;
                const isVal = mod[t.key] !== false;
                const tColor = t.color || 'cyan';
                rightHtml = `<button id="schema-header-toggle-${t.key}" class="h-4 px-1.5 rounded text-[7.5px] font-bold border leading-none inline-flex items-center justify-center transition-colors ${isVal ? `bg-${tColor}-600 text-white border-${tColor}-500` : 'bg-slate-800 text-slate-400 border-slate-700'}">${t.label}: ${isVal ? (t.onText || 'ON') : (t.offText || 'OFF')}</button>`;
            }

            // Header button groups: e.g. [ { key: 'syncMode', options: [...] }, { key: 'polarity', options: [...] } ]
            if (h.groups && h.groups.length > 0) {
                const renderHGroup = (g) => {
                    const cur = mod[g.key] ?? g.options[0].val;
                    return `<div class="flex items-center gap-0.5">${g.options.map(o => `
                        <button class="schema-header-btn-${g.key} h-4 px-1.5 rounded text-[7.5px] font-bold border leading-none inline-flex items-center justify-center transition-colors ${cur === o.val ? `bg-${s.color}-600 text-white border-${s.color}-500 shadow-sm shadow-${s.color}-500/30` : 'bg-slate-800 text-slate-400 border-slate-700'}" data-val="${o.val}">${o.label}</button>
                    `).join('')}</div>`;
                };

                if (!leftHtml) {
                    leftHtml = renderHGroup(h.groups[0]);
                    if (h.groups.length > 1 && !rightHtml) {
                        rightHtml = renderHGroup(h.groups[1]);
                    }
                } else if (!rightHtml) {
                    rightHtml = renderHGroup(h.groups[0]);
                }
            }

            if (leftHtml || rightHtml) {
                html += `<div class="flex items-center justify-between pb-1 border-b border-slate-800">${leftHtml}${rightHtml}</div>`;
            }
        }

        // 2. Body Groups
        const groups = typeof s.groups === 'function' ? s.groups(mod, ctx) : (s.groups || []);
        if (groups.length > 0) {
            groups.forEach(g => {
                const cur = mod[g.key] ?? g.options[0].val;
                html += `
                    <div class="my-1.5"><label class="block text-[8px] text-slate-400 mb-0.5 uppercase tracking-wider font-semibold">${g.label}</label>
                    <div class="grid grid-cols-${g.cols || g.options.length} gap-0.5">${g.options.map(o => `
                        <button class="schema-btn-${g.key} h-4 rounded text-[7.5px] font-bold border leading-none inline-flex items-center justify-center transition-colors ${cur === o.val ? `bg-${s.color}-600 text-white border-${s.color}-500 shadow-sm shadow-${s.color}-500/30` : 'bg-slate-800 text-slate-400 border-slate-700'}" data-val="${o.val}">${o.label}</button>`).join('')}
                    </div></div>`;
            });
        }

        // 3. Body Sliders
        const sliders = typeof s.sliders === 'function' ? s.sliders(mod, ctx) : (s.sliders || []);
        if (sliders.length > 0) {
            html += `<div class="flex items-center justify-around py-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80 gap-1 mt-1">`;
            sliders.forEach(sl => {
                const state = UIHelpers.resolveSliderState(sl, mod, ctx);
                html += UIHelpers.createVSliderHTML(
                    `schema-slider-${sl.key}`,
                    sl.label,
                    sl.min,
                    sl.max,
                    sl.step,
                    state.val,
                    state.unitText,
                    sl.color || s.color,
                    state.isDisabled,
                    state.customText,
                    sl.power || 1
                );
            });
            html += `</div>`;
        }
        return html;
    },
    bindSchemaEvents: (mod, ctx, schemaDef, onChange) => {
        const s = typeof schemaDef === 'function' ? schemaDef(mod, ctx) : schemaDef;

        // 1. Header events
        if (s.header) {
            const h = s.header;
            if (h.channel) {
                const minCh = h.channel.min || 1;
                const maxCh = h.channel.max || 4;
                const portPrefix = h.channel.portPrefix;

                document.getElementById('schema-header-ch-dec')?.addEventListener('click', () => {
                    const ch = Math.min(maxCh, Math.max(minCh, mod.channels || 1));
                    if (ch > minCh) {
                        const dropPort = portPrefix === 'wave_in' ? `wave_in${ch}` : (ch === 2 ? 'cv_in2' : `cv_in${ch}`);
                        ctx.removeConnectionsForPort?.(dropPort);
                        mod.channels = ch - 1;
                        ctx.rebuildModule?.();
                        ctx.reRenderModal();
                        onChange();
                    }
                });

                document.getElementById('schema-header-ch-inc')?.addEventListener('click', () => {
                    const ch = Math.min(maxCh, Math.max(minCh, mod.channels || 1));
                    if (ch < maxCh) {
                        mod.channels = ch + 1;
                        ctx.rebuildModule?.();
                        ctx.reRenderModal();
                        onChange();
                    }
                });
            }

            if (h.toggle) {
                const t = h.toggle;
                document.getElementById(`schema-header-toggle-${t.key}`)?.addEventListener('click', () => {
                    mod[t.key] = !(mod[t.key] !== false);
                    ctx.reRenderModal();
                    onChange();
                });
            }

            if (h.groups) {
                h.groups.forEach(g => {
                    UIHelpers.bindButtonGroup(
                        `.schema-header-btn-${g.key}`,
                        `bg-${s.color}-600 text-white border-${s.color}-500 shadow-sm shadow-${s.color}-500/30`,
                        'bg-slate-800 text-slate-400 border-slate-700',
                        val => {
                            mod[g.key] = val;
                            if (g.reRender) ctx.reRenderModal();
                            onChange();
                        }
                    );
                });
            }
        }

        // 2. Body Groups
        const groups = typeof s.groups === 'function' ? s.groups(mod, ctx) : (s.groups || []);
        groups.forEach(g => {
            UIHelpers.bindButtonGroup(
                `.schema-btn-${g.key}`,
                `bg-${s.color}-600 text-white border-${s.color}-500 shadow-sm shadow-${s.color}-500/30`,
                'bg-slate-800 text-slate-400 border-slate-700',
                val => {
                    mod[g.key] = val;
                    if (g.reRender) ctx.reRenderModal();
                    onChange();
                }
            );
        });

        // 3. Body Sliders
        const sliders = typeof s.sliders === 'function' ? s.sliders(mod, ctx) : (s.sliders || []);
        sliders.forEach(sl => {
            const state = UIHelpers.resolveSliderState(sl, mod, ctx);
            if (state.isDisabled) return;
            const setter = sl.setVal || ((m, v) => { m[sl.key] = v; });
            const fmt = sl.format || (v => Math.round(v));

            UIHelpers.bindSlider(
                `schema-slider-${sl.key}`,
                fmt,
                val => {
                    setter(mod, val);
                    if (sl.reRender) ctx.reRenderModal();
                    onChange();
                },
                sl.power || 1,
                sl.min,
                sl.max
            );
        });
    },
    /**
     * Standard chassis terminal renderer (PIN0 - PIN14, 14px center-to-center pitch).
     *
     * Physical Chassis Grid:
     * - Left Edge: PIN3 (bottom 16px), PIN2 (bottom 30px), PIN1 (bottom 44px), PIN0 (bottom 58px)
     * - Bottom Edge: PIN4, PIN5, PIN6, PIN7, PIN8, PIN9 (6 slots, 14px pitch, margin 2px)
     * - Right Edge: PIN10 (bottom 16px), PIN11 (bottom 30px), PIN12 (bottom 44px), PIN13 (bottom 58px), PIN14 (bottom 72px)
     */
    renderChassisPorts: (renderP, portsOrIn = {}, outPortsOrMap = null, customPinMap = null) => {
        let inPorts = [];
        let outPorts = [];
        let pinMap = null;

        if (Array.isArray(portsOrIn)) {
            inPorts = portsOrIn;
            outPorts = Array.isArray(outPortsOrMap) ? outPortsOrMap : [];
            pinMap = (!Array.isArray(outPortsOrMap) && outPortsOrMap && typeof outPortsOrMap === 'object') ? outPortsOrMap : customPinMap;
        } else if (portsOrIn && typeof portsOrIn === 'object') {
            inPorts = portsOrIn.in || [];
            outPorts = portsOrIn.out || [];
            pinMap = (outPortsOrMap && typeof outPortsOrMap === 'object' && !Array.isArray(outPortsOrMap)) ? outPortsOrMap : customPinMap;
        }
        const allPorts = [...inPorts, ...outPorts];

        const parsePin = (val) => {
            if (val === undefined || val === null) return null;
            if (typeof val === 'number' && val >= 0 && val <= 14) return val;
            if (typeof val === 'string') {
                const m = val.match(/^PIN?([0-9]|1[0-4])(?:_(?:in|out))?$/i);
                if (m) return parseInt(m[1], 10);
            }
            return null;
        };

        const pinSlots = new Array(15).fill(null);
        const unassignedIn = [];
        const unassignedOut = [];

        // 1. Assign ports with explicit pin definitions or pinMap
        allPorts.forEach(p => {
            const mappedPin = pinMap ? pinMap[p.port] : null;
            const explicit = parsePin(p.pin ?? mappedPin ?? p.port);
            if (explicit !== null) {
                pinSlots[explicit] = p;
            } else if (inPorts.includes(p)) {
                unassignedIn.push(p);
            } else {
                unassignedOut.push(p);
            }
        });

        // 2. Default fallback mapping for inputs: PIN4, PIN3, PIN2, PIN1, PIN5, PIN6
        const defaultInOrder = [4, 3, 2, 1, 5, 6];
        let inIdx = 0;
        unassignedIn.forEach(p => {
            while (inIdx < defaultInOrder.length && pinSlots[defaultInOrder[inIdx]]) {
                inIdx++;
            }
            if (inIdx < defaultInOrder.length) {
                pinSlots[defaultInOrder[inIdx]] = p;
                inIdx++;
            }
        });

        // 3. Default fallback mapping for outputs: PIN9, PIN10, PIN11, PIN12, PIN8, PIN7
        const defaultOutOrder = [9, 10, 11, 12, 8, 7];
        let outIdx = 0;
        unassignedOut.forEach(p => {
            while (outIdx < defaultOutOrder.length && pinSlots[defaultOutOrder[outIdx]]) {
                outIdx++;
            }
            if (outIdx < defaultOutOrder.length) {
                pinSlots[defaultOutOrder[outIdx]] = p;
                outIdx++;
            }
        });

        const emptySlot = '<div class="w-2 h-2 pointer-events-none opacity-0"></div>';
        const renderSlot = (slotNum) => {
            const p = pinSlots[slotNum];
            return p ? renderP([p]) : emptySlot;
        };

        let html = '';

        // Left Edge: PIN3, PIN2, PIN1, PIN0 (bottom to top, 14px center-to-center / gap 6px)
        if (pinSlots[0] || pinSlots[1] || pinSlots[2] || pinSlots[3]) {
            const leftSlots = [3, 2, 1];
            if (pinSlots[0]) leftSlots.push(0);
            const leftPins = leftSlots.map(renderSlot).join('');
            html += `<div class="absolute left-[2px] bottom-[16px] flex flex-col-reverse gap-[6px] items-center pointer-events-none z-10">${leftPins}</div>`;
        }

        // Right Edge: PIN10, PIN11, PIN12, PIN13, PIN14 (bottom to top, 14px center-to-center / gap 6px)
        if (pinSlots[10] || pinSlots[11] || pinSlots[12] || pinSlots[13] || pinSlots[14]) {
            const rightSlots = [10, 11, 12];
            if (pinSlots[13]) rightSlots.push(13);
            if (pinSlots[14]) rightSlots.push(14);
            const rightPins = rightSlots.map(renderSlot).join('');
            html += `<div class="absolute right-[2px] bottom-[16px] flex flex-col-reverse gap-[6px] items-center pointer-events-none z-10">${rightPins}</div>`;
        }

        // Bottom Edge: PIN4, PIN5, PIN6, PIN7, PIN8, PIN9 (6 slots, 14px center-to-center / gap 6px)
        if (pinSlots[4] || pinSlots[5] || pinSlots[6] || pinSlots[7] || pinSlots[8] || pinSlots[9]) {
            const bottomPins = [4, 5, 6, 7, 8, 9].map(renderSlot).join('');
            html += `<div class="absolute bottom-[2px] left-[2px] right-[2px] flex justify-between items-center pointer-events-none z-10">${bottomPins}</div>`;
        }

        return html;
    },
    renderStandardPorts: (renderP, inPorts = [], outPorts = []) => {
        return UIHelpers.renderChassisPorts(renderP, { in: inPorts, out: outPorts });
    },
    /**
     * Renders standardized module panel bars (VCA, ADSR, SEQ8, SEQ16, SPK, MIX, SLIDER).
     * Height is standardized to h-7 (28px) across all modules.
     */
    renderPanelBars: (bars = [], options = {}) => {
        const heightCls = options.heightCls || 'h-7';
        const defaultWidth = options.widthCls || 'w-2';
        const gapCls = options.gapCls || 'gap-1.5';
        const theme = options.theme || 'audio';
        const themeColor = theme === 'cv'
            ? 'bg-gradient-to-t from-amber-600 to-yellow-400'
            : 'bg-gradient-to-t from-blue-600 to-cyan-400';
        const defaultColor = options.color || themeColor;

        const barsHTML = bars.map(bar => {
            const b = typeof bar === 'number' ? { pct: bar } : (bar || {});
            const pct = Math.max(0, Math.min(100, Math.round(b.pct ?? 0)));
            const w = b.width || defaultWidth;
            const color = b.color || defaultColor;
            const innerCls = b.innerCls || '';
            const outerCls = b.outerCls || '';
            const attrs = b.attrs ? ` ${b.attrs}` : '';
            return `<div class="${w} ${heightCls} rounded-sm p-[1px] flex flex-col justify-end border border-slate-600 bg-slate-950/40 relative panel-bar-slot ${outerCls}"${attrs}><div class="w-full ${color} rounded-xs ${innerCls}" style="height: ${pct}%;"></div></div>`;
        }).join('');

        if (options.noWrapper) return barsHTML;
        const containerCls = options.containerCls || '';
        return `<div class="flex items-end justify-center ${gapCls} ${containerCls}">${barsHTML}</div>`;
    }
};

