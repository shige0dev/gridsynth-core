import { UIHelpers } from '../../ui/helpers.js?v=297';

export const SUB = {
    color: 'cyan',
    defaults: () => ({ type: 'SUB', targetPage: 1 }),
    ports: (m, ctx) => {
        const allPins = [
            { port: 'PIN1_in', slot: 1 }, { port: 'PIN2_in', slot: 2 }, { port: 'PIN3_in', slot: 3 }, { port: 'PIN4_in', slot: 4 },
            { port: 'PIN5_in', slot: 5 }, { port: 'PIN6_in', slot: 6 }, { port: 'PIN7_in', slot: 7 },
            { port: 'PIN8_out', slot: 8 }, { port: 'PIN9_out', slot: 9 }, { port: 'PIN10_out', slot: 10 },
            { port: 'PIN11_out', slot: 11 }, { port: 'PIN12_out', slot: 12 }, { port: 'PIN13_out', slot: 13 }, { port: 'PIN14_out', slot: 14 }
        ];
        const active = ctx?.subActivePorts;
        const visiblePins = active ? allPins.filter(p => active.has(p.port) || active.has(`PIN${p.slot}`) || active.has(`PIN${p.slot}_in`) || active.has(`PIN${p.slot}_out`)) : allPins;
        const inList = visiblePins.filter(p => p.slot <= 7).map(p => ({
            port: p.port,
            color: ctx?.getPortColor ? ctx.getPortColor(p.port) : 'bg-slate-500'
        }));
        const outList = visiblePins.filter(p => p.slot >= 8).map(p => ({
            port: p.port,
            color: ctx?.getPortColor ? ctx.getPortColor(p.port) : 'bg-slate-500'
        }));
        return { in: inList, out: outList };
    },
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    renderGrid: () => `
        <div class="flex flex-col items-center justify-center leading-none pointer-events-none">
            <svg class="w-5 h-5 text-cyan-400 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2"/>
                <path d="M11 9h4a2 2 0 0 0 2-2V3"/>
                <circle cx="9" cy="9" r="2"/>
                <path d="M7 21v-4a2 2 0 0 1 2-2h4"/>
                <circle cx="15" cy="15" r="2"/>
            </svg>
        </div>`,
    renderModal: (m, ctx) => {
        const curP = m.targetPage ?? 1;
        const existingPages = ctx?.pagesData ? Object.keys(ctx.pagesData).map(Number).filter(n => n > 0 && !isNaN(n)) : [];
        const availablePages = Array.from(new Set([1, 2, 3, 4, curP, ...existingPages])).sort((a, b) => a - b);
        return `
            <div class="space-y-2 p-1">
                <div class="flex items-center justify-between pb-1 border-b border-slate-800">
                    <span class="text-[8px] text-slate-400 font-semibold uppercase">TARGET SUBPAGE</span>
                    <span class="text-[9px] font-mono font-bold text-cyan-300">PAGE ${curP}${m.subType ? ` (${m.subType})` : ''}</span>
                </div>
                <div>
                    <label class="block text-[8px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">Select Page Number</label>
                    <div class="grid grid-cols-4 gap-1">
                        ${availablePages.map(p => {
                             const pName = ctx?.pagesData ? ctx.pagesData[String(p)]?.name : null;
                            return `
                            <button class="sub-page-btn py-1 rounded text-[8.5px] font-bold border transition-colors flex flex-col items-center justify-center ${curP === p ? 'bg-cyan-600 text-white border-cyan-500 shadow-sm shadow-cyan-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'}" data-page="${p}">
                                <span>PAGE ${p}</span>
                                ${pName ? `<span class="text-[7px] opacity-80 truncate max-w-[40px]">${pName}</span>` : ''}
                            </button>`;
                        }).join('')}
                    </div>
                </div>
                <div class="pt-1">
                    <button id="sub-open-page-btn" class="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg border border-cyan-400 text-xs font-bold shadow-md shadow-cyan-500/30 flex items-center justify-center gap-1.5 transition">
                        <span>OPEN SUBPATCH (PAGE ${curP})</span> →
                    </button>
                </div>
            </div>`;
    },
    bindEvents: (m, ctx, cb) => {
        document.querySelectorAll('.sub-page-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                m.targetPage = parseInt(e.currentTarget.dataset.page) || 1;
                ctx.reRenderModal();
                cb();
            });
        });
        document.getElementById('sub-open-page-btn')?.addEventListener('click', () => {
            document.getElementById('shared-modal')?.classList.add('hidden');
            ctx.openSubpage?.(m.targetPage || 1);
        });
    },
    onDestroy: async (m, ctx) => {
        const target = m.targetPage ? String(m.targetPage) : null;
        if (!target || target === "0") return;
        const targetPageData = ctx.pagesData ? ctx.pagesData[target] : null;
        if (targetPageData?.modules) {
            const childIds = Object.keys(targetPageData.modules);
            for (const childId of childIds) {
                await ctx.destroyModule?.(target, childId);
            }
        }
        ctx.destroyPage?.(target);
    }
};

export const SUB_IO = {
    color: 'emerald',
    defaults: () => ({ type: 'SUB_IO' }),
    ports: (m, ctx) => {
        const allPins = [
            { port: 'PIN1_out', slot: 1 }, { port: 'PIN2_out', slot: 2 }, { port: 'PIN3_out', slot: 3 }, { port: 'PIN4_out', slot: 4 },
            { port: 'PIN5_out', slot: 5 }, { port: 'PIN6_out', slot: 6 }, { port: 'PIN7_out', slot: 7 },
            { port: 'PIN8_in', slot: 8 }, { port: 'PIN9_in', slot: 9 }, { port: 'PIN10_in', slot: 10 },
            { port: 'PIN11_in', slot: 11 }, { port: 'PIN12_in', slot: 12 }, { port: 'PIN13_in', slot: 13 }, { port: 'PIN14_in', slot: 14 }
        ];
        const outList = allPins.filter(p => p.slot <= 7).map(p => ({
            port: p.port,
            color: ctx?.getPortColor ? ctx.getPortColor(p.port) : 'bg-slate-500'
        }));
        const inList = allPins.filter(p => p.slot >= 8).map(p => ({
            port: p.port,
            color: ctx?.getPortColor ? ctx.getPortColor(p.port) : 'bg-slate-500'
        }));
        return { in: inList, out: outList };
    },
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    renderGrid: () => `
        <div class="flex flex-col items-center justify-center leading-none pointer-events-none">
            <svg class="w-5 h-5 text-cyan-400 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2"/>
                <path d="M11 9h4a2 2 0 0 0 2-2V3"/>
                <circle cx="9" cy="9" r="2"/>
                <path d="M7 21v-4a2 2 0 0 1 2-2h4"/>
                <circle cx="15" cy="15" r="2"/>
            </svg>
        </div>`,
    renderModal: (m, ctx) => {
        const pageName = ctx?.getPageName ? ctx.getPageName() : (m.name || 'SUBPATCH');
        return `
            <div class="space-y-2 p-1">
                <div class="flex items-center justify-between pb-1 border-b border-slate-800">
                    <span class="text-[8px] text-slate-400 font-semibold uppercase">SUBPATCH NAME</span>
                    <button id="sub-io-rename-btn" class="h-4 px-1.5 rounded text-[8px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/60 hover:bg-emerald-900 transition leading-none inline-flex items-center gap-1">
                        <span class="font-mono font-bold">${pageName}</span>
                        <span class="text-[8px]">✏️</span>
                    </button>
                </div>
                <div class="text-center py-1">
                    <span class="text-[10px] font-bold text-emerald-300 uppercase">SUBPATCH I/O ROOT</span>
                    <p class="text-[8.5px] text-slate-400 mt-1">メイングリッドの SUB モジュールと12本の対称端子で通信します。</p>
                    <div class="mt-1.5 p-1 bg-slate-950/80 rounded border border-slate-800 text-[7.5px] text-left text-slate-300 space-y-0.5">
                        <div><span class="font-mono text-cyan-300 font-bold">PIN1〜7 [OUT]</span>: 親からの送り (CV / Gate / Clock)</div>
                        <div><span class="font-mono text-emerald-300 font-bold">PIN8〜14 [IN]</span>: 親への戻り (Audio L/R / Mod還元)</div>
                        <div class="text-[7px] text-slate-400 pt-0.5">左: PIN1〜4 (上➔下) / 下: PIN5〜10 (左➔右) / 右: PIN11〜14 (下➔上)</div>
                    </div>
                    <p class="text-[8px] text-amber-400/80 mt-1">※ このモジュールは削除できません（保護中）</p>
                </div>
                <div class="flex gap-1.5 pt-1">
                    <button id="sub-io-save-btn" class="flex-1 py-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 rounded-lg border border-emerald-500/70 text-[10px] font-bold shadow-sm flex items-center justify-center gap-1 transition">
                        <span>💾 ライブラリに保存 (CUSTOM)</span>
                    </button>
                </div>
                <div class="pt-0.5">
                    <button id="sub-io-back-btn" class="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg border border-emerald-400 text-xs font-bold shadow-md shadow-emerald-500/30 flex items-center justify-center gap-1.5 transition">
                        ← <span>RETURN TO MAIN (PAGE 0)</span>
                    </button>
                </div>
            </div>`;
    },
    bindEvents: (m, ctx, cb) => {
        document.getElementById('sub-io-rename-btn')?.addEventListener('click', async () => {
            const curName = ctx.getPageName ? ctx.getPageName() : (m.name || 'SUBPATCH');
            const res = await ctx.prompt('SUBPATCH NAME', curName);
            if (res !== null && res.trim() !== '') {
                ctx.setPageName?.(res.trim());
                ctx.reRenderModal();
                cb?.();
            }
        });
        document.getElementById('sub-io-save-btn')?.addEventListener('click', async () => {
            const curName = ctx.getPageName ? ctx.getPageName() : (m.name || 'SUBPATCH');
            const res = await ctx.prompt('SAVE SUBPATCH AS', curName);
            if (res !== null && res.trim() !== '') {
                ctx.saveSubpatchToLibrary?.(res.trim());
            }
        });
        document.getElementById('sub-io-back-btn')?.addEventListener('click', () => {
            document.getElementById('shared-modal')?.classList.add('hidden');
            ctx.openSubpage?.(0);
        });
    }
};

export const subDefs = {
    SUB,
    SUB_IO
};
