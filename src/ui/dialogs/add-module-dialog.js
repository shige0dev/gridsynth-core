// src/ui/dialogs/add-module-dialog.js
import { MODULE_REGISTRY } from '../../modules/registry.js?v=679';
import { FACTORY_SUBPATCHES } from '../../presets/subpatches.js';

/**
 * Add Module Dialog (Basic modules, Factory subpatches, User stock)
 */
export function openAddModal(slotIdx, modalManager, ui) {
    modalManager.openModal(slotIdx, 'ADD MODULE', 'w-[calc(100%-16px)]', (body) => {
        const isMain = ui.currentPageId === "0";
        const depth = ui.getNestingDepth(ui.currentPageId);
        const allowSub = depth < 3;

        let currentTab = 'basic'; // 'basic' | 'factory' | 'user'
        let factoryCategory = 'ALL'; // 'ALL' | 'Synth Voice' | 'Percussion' | 'Effect'

        const ALIAS_TYPES = new Set(['CVDELAY']);
        const renderContent = () => {
            const basicTypes = Object.keys(MODULE_REGISTRY).filter(t => {
                if (t === 'SUB') return false; // Placed under User Subpatch area
                if (t === 'SUB_IO') return !isMain;
                if (ALIAS_TYPES.has(t)) return false;
                return true;
            });

            const userSubs = Object.values(ui.getUserSubpatches());
            const factorySubs = Object.values(FACTORY_SUBPATCHES);

            const CATEGORIES = [
                {
                    name: 'SOUND',
                    sub: 'サウンド (音源・音響・出力)',
                    color: 'cyan',
                    types: ['VCO', 'WAVE', 'NOISE', 'FMx3', 'FMCORE', 'FOLD', 'VCF', 'VCA', 'MIX', 'DELAY', 'REVERB', 'SPK']
                },
                {
                    name: 'TRIGGER',
                    sub: 'トリガ (クロック・シーケンサー)',
                    color: 'rose',
                    types: ['CLK', 'SEQ8', 'SEQ16', 'PAT', 'MARKOV', 'DIST4', 'SLCT4', 'KEY', 'PAD']
                },
                {
                    name: 'CV',
                    sub: 'CV (変調・演算・エンベロープ)',
                    color: 'purple',
                    types: ['LFO', 'ADSR', 'RF', 'AR', 'CHORD', 'MATH1', 'MATH2', 'SH', 'COUNT', 'LUT', 'MATRIX', 'LAG', 'VALUE', 'GSENSOR', 'SWITCH', 'SUB_IO']
                },
                {
                    name: 'VISUALIZER',
                    sub: 'ビジュアライザ (波形・スペクトラム)',
                    color: 'teal',
                    types: ['SCOPE', 'LISS', 'SPEC']
                },
                {
                    name: '3D',
                    sub: '3Dグラフィックス (オブジェクト・レンダラー・ディスプレイ)',
                    color: 'purple',
                    types: ['OBJECT', 'ROTATE', 'MOVE', 'SCALE', 'RENDER', 'DISPLAY']
                }
            ];

            const categorizedSet = new Set(CATEGORIES.flatMap(c => c.types));
            const uncategorized = basicTypes.filter(t => !categorizedSet.has(t));
            if (uncategorized.length > 0) {
                CATEGORIES.push({
                    name: 'OTHER',
                    sub: 'その他',
                    color: 'slate',
                    types: uncategorized
                });
            }

            // Top Tab Bar HTML
            const tabsHtml = `
                <div class="flex items-center gap-1 border-b border-slate-800 pb-1.5 mb-1 shrink-0">
                    <button class="modal-tab-btn flex-1 h-6 rounded flex items-center justify-center gap-1 font-bold text-[9px] transition ${currentTab === 'basic' ? 'bg-cyan-950/80 border border-cyan-500/70 text-cyan-200 shadow-sm' : 'bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-slate-200'}" data-tab="basic">
                        <span>MODULES</span>
                        <span class="text-[7.5px] px-1 py-0.2 rounded ${currentTab === 'basic' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-500'} font-mono">${basicTypes.length}</span>
                    </button>
                    ${allowSub ? `
                    <button class="modal-tab-btn flex-1 h-6 rounded flex items-center justify-center gap-1 font-bold text-[9px] transition ${currentTab === 'factory' ? 'bg-purple-950/80 border border-purple-500/70 text-purple-200 shadow-sm' : 'bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-slate-200'}" data-tab="factory">
                        <span>FACTORY SUB</span>
                        <span class="text-[7.5px] px-1 py-0.2 rounded ${currentTab === 'factory' ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-800 text-slate-500'} font-mono">${factorySubs.length}</span>
                    </button>
                    <button class="modal-tab-btn flex-1 h-6 rounded flex items-center justify-center gap-1 font-bold text-[9px] transition ${currentTab === 'user' ? 'bg-emerald-950/80 border border-emerald-500/70 text-emerald-200 shadow-sm' : 'bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-slate-200'}" data-tab="user">
                        <span>USER STOCK</span>
                        <span class="text-[7.5px] px-1 py-0.2 rounded ${currentTab === 'user' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500'} font-mono">${userSubs.length}</span>
                    </button>
                    ` : ''}
                </div>
            `;

            // 1. BASIC MODULES TAB CONTENT
            const categorySectionsHtml = CATEGORIES.map((cat, catIdx) => {
                const items = cat.types.filter(t => basicTypes.includes(t));
                if (items.length === 0) return '';
                return `
                    <div class="${catIdx > 0 ? 'border-t border-slate-800/80 pt-1 mt-0.5' : ''}">
                        <div class="text-[8px] font-bold text-${cat.color}-400 uppercase tracking-wider mb-0.5 px-0.5 flex items-center justify-between">
                            <span class="flex items-center gap-1">
                                <span class="w-1.5 h-1.5 rounded-full bg-${cat.color}-400"></span>
                                <span>${cat.name}</span>
                                <span class="text-[7px] text-slate-400 font-normal">/ ${cat.sub}</span>
                            </span>
                            <div class="flex items-center gap-1">
                                ${!isMain && cat.name === 'CV' ? '<span class="text-[6.5px] text-emerald-400 font-mono">SUBPAGE</span>' : ''}
                                <span class="text-[6.5px] text-slate-500 font-mono">${items.length}</span>
                            </div>
                        </div>
                        <div class="grid grid-cols-6 gap-1">
                            ${items.map(type => {
                                const col = MODULE_REGISTRY[type]?.color || 'cyan';
                                return `<button data-type="${type}" class="h-5 p-0 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-${col}-500/60 rounded text-center text-${col}-300 text-[11px] font-bold tracking-tight transition truncate flex items-center justify-center leading-none">${type}</button>`;
                            }).join('')}
                        </div>
                    </div>
                `;
            }).join('');

            // 2. FACTORY SUBPATCHES TAB CONTENT (3-columns, readable font, category filters)
            const factoryCats = [
                { id: 'ALL', label: 'ALL', count: factorySubs.length },
                { id: 'Synth Voice', label: 'SYNTH', count: factorySubs.filter(s => s.category === 'Synth Voice').length },
                { id: 'Percussion', label: 'PERC', count: factorySubs.filter(s => s.category === 'Percussion').length },
                { id: 'Effect', label: 'FX', count: factorySubs.filter(s => s.category === 'Effect').length },
                { id: 'Function', label: 'FUNC', count: factorySubs.filter(s => s.category === 'Function').length }
            ];

            const filteredFactorySubs = factoryCategory === 'ALL'
                ? factorySubs
                : factorySubs.filter(s => s.category === factoryCategory);

            const factorySubContentHtml = `
                <div class="flex flex-col gap-1">
                    <div class="flex items-center gap-1 px-0.5 overflow-x-auto pb-0.5">
                        ${factoryCats.map(fc => `
                            <button class="factory-cat-btn h-4.5 px-2 rounded-full text-[8px] font-bold transition flex items-center gap-1 shrink-0 ${factoryCategory === fc.id ? 'bg-purple-600 text-white shadow-sm' : 'bg-slate-800/90 text-slate-400 hover:text-slate-200 border border-slate-700/80'}" data-cat="${fc.id}">
                                <span>${fc.label}</span>
                                <span class="text-[7px] opacity-75 font-mono">(${fc.count})</span>
                            </button>
                        `).join('')}
                    </div>
                    <div class="grid grid-cols-3 gap-1">
                        ${filteredFactorySubs.map(sub => `
                            <div class="h-5 bg-slate-800/90 hover:bg-purple-950/60 border border-slate-700/80 hover:border-purple-500/80 rounded flex items-center justify-between px-1.5 transition cursor-pointer factory-sub-item shadow-sm" data-id="${sub.id}">
                                <span class="text-[9.5px] font-bold text-purple-200 truncate pointer-events-none pr-1 leading-none" title="${sub.name}">${sub.name}</span>
                                <div class="flex items-center gap-0.5 shrink-0">
                                    <button class="export-factory-sub-btn w-3.5 h-3.5 flex items-center justify-center bg-slate-900 hover:bg-slate-700 text-cyan-300 rounded border border-slate-700 text-[6.5px]" data-id="${sub.id}" title="JSONエクスポート(コピー)">📋</button>
                                    <button class="sub-info-btn w-3.5 h-3.5 flex items-center justify-center text-slate-400 hover:text-purple-300 rounded text-[7px] hover:bg-slate-700/80" data-id="${sub.id}" title="説明">ℹ️</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            // 3. USER SUBPATCHES TAB CONTENT
            const userSubContentHtml = `
                <div class="flex flex-col gap-1.5">
                    <div class="flex items-center justify-between px-0.5 bg-slate-950/60 border border-slate-800/80 rounded-md p-1">
                        <span class="text-[8px] text-slate-400 font-medium">ストック登録済み: <span class="text-emerald-400 font-bold font-mono">${userSubs.length}</span> 件</span>
                        <div class="flex items-center gap-1.5">
                            <button class="import-user-sub-btn h-4.5 px-2 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/70 hover:border-purple-400 text-purple-300 rounded text-[7.5px] font-bold transition flex items-center gap-1 shadow-sm cursor-pointer" title="サブパッチJSONをインポートしてストックに登録">
                                <span>📥 IMPORT</span>
                            </button>
                            <button data-type="SUB" class="h-4.5 px-2 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/70 hover:border-emerald-400 text-emerald-300 rounded text-[7.5px] font-bold transition flex items-center gap-1 shadow-sm">
                                <span>➕ 新規作成</span>
                            </button>
                        </div>
                    </div>
                    ${userSubs.length > 0 ? `
                    <div class="grid grid-cols-3 gap-1">
                        ${userSubs.map(sub => `
                            <div class="h-5 bg-slate-800/90 hover:bg-emerald-950/60 border border-slate-700/80 hover:border-emerald-500/80 rounded flex items-center justify-between px-1.5 transition cursor-pointer user-sub-item select-user-sub shadow-sm" data-id="${sub.id}">
                                <span class="text-[9.5px] font-bold text-emerald-200 truncate pointer-events-none pr-1 leading-none" title="${sub.name}">${sub.name}</span>
                                <div class="flex items-center gap-0.5 shrink-0">
                                    <button class="export-user-sub-btn w-3.5 h-3.5 flex items-center justify-center bg-slate-900 hover:bg-slate-700 text-cyan-300 rounded border border-slate-700 text-[6.5px]" data-id="${sub.id}" title="JSONエクスポート(コピー)">📋</button>
                                    <button class="edit-user-sub-btn w-3.5 h-3.5 flex items-center justify-center bg-slate-900 hover:bg-slate-700 text-emerald-300 rounded border border-slate-700 text-[6.5px]" data-id="${sub.id}" title="中身を編集">✏️</button>
                                    <button class="delete-user-sub-btn w-3.5 h-3.5 flex items-center justify-center bg-red-950/70 hover:bg-red-900 text-red-300 rounded border border-red-700/60 text-[6.5px]" data-id="${sub.id}" title="削除">🗑️</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    ` : `
                    <div class="py-8 text-center text-slate-500 text-[10px] flex flex-col items-center justify-center gap-1">
                        <span>ストックされたサブパッチはありません</span>
                        <span class="text-[8px] text-slate-600">「➕ 新規作成」または「📥 IMPORT」から登録できます</span>
                    </div>
                    `}
                </div>
            `;

            body.className = "flex flex-col mt-0.5 max-h-[78vh] overflow-y-auto pr-0.5";
            body.innerHTML = `
                ${tabsHtml}
                <div class="flex-1 overflow-y-auto">
                    ${currentTab === 'basic' ? categorySectionsHtml : ''}
                    ${currentTab === 'factory' ? factorySubContentHtml : ''}
                    ${currentTab === 'user' ? userSubContentHtml : ''}
                </div>
            `;

            body.onclick = (e) => {
                const closeShared = () => document.getElementById('shared-modal')?.classList.add('hidden');
                const tabBtn = e.target.closest('.modal-tab-btn');
                if (tabBtn && tabBtn.dataset.tab) {
                    currentTab = tabBtn.dataset.tab;
                    renderContent();
                    return;
                }

                const catBtn = e.target.closest('.factory-cat-btn');
                if (catBtn && catBtn.dataset.cat) {
                    factoryCategory = catBtn.dataset.cat;
                    renderContent();
                    return;
                }

                const btn = e.target.closest('button, .factory-sub-item, .select-user-sub');
                if (!btn || !body.contains(btn)) return;

                if (btn.dataset.type) {
                    closeShared();
                    ui.pageManager.addModuleAtSlot(btn.dataset.type, slotIdx);
                    return;
                }
                if (btn.classList.contains('import-user-sub-btn')) {
                    e.stopPropagation();
                    ui.openSubpatchImportModal(() => renderContent());
                    return;
                }

                const subId = btn.dataset.id;
                if (!subId) return;

                if (btn.classList.contains('export-factory-sub-btn') || btn.classList.contains('export-user-sub-btn')) {
                    e.stopPropagation();
                    const sub = FACTORY_SUBPATCHES[subId] || ui.getUserSubpatches()[subId];
                    if (sub) ui.openSubpatchExportModal(sub);
                } else if (btn.classList.contains('sub-info-btn')) {
                    e.stopPropagation();
                    const sub = FACTORY_SUBPATCHES[subId] || ui.userSubpatches?.[subId];
                    if (sub) modalManager.showToast(`【${sub.name}】${sub.description || '説明なし'}`, 3000);
                } else if (btn.classList.contains('edit-user-sub-btn')) {
                    e.stopPropagation();
                    const res = ui.instantiateSubpatch(subId, slotIdx);
                    if (res?.success) {
                        closeShared();
                        ui.switchPage(res.page);
                        modalManager.showToast(`サブパッチ「${res.subpatch}」の編集画面を開きました（上部の STOCK ボタンで更新可能）`);
                    }
                } else if (btn.classList.contains('delete-user-sub-btn')) {
                    e.stopPropagation();
                    const sub = ui.userSubpatches?.[subId];
                    if (sub && confirm(`サブパッチ「${sub.name}」をライブラリから削除しますか？\n（※配置済みのモジュールには影響しません）`)) {
                        ui.deleteUserSubpatch(subId);
                        renderContent();
                    }
                } else if (btn.classList.contains('factory-sub-item') || btn.classList.contains('select-user-sub')) {
                    ui.instantiateSubpatch(subId, slotIdx);
                    closeShared();
                }
            };
        };

        renderContent();
    });
}

