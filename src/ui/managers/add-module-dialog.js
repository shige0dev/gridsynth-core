// src/ui/managers/add-module-dialog.js
import { MODULE_REGISTRY } from '../../modules/registry.js?v=620';
import { FACTORY_SUBPATCHES } from '../../presets/subpatches.js';

export class AddModuleDialog {
    static render(modalManager, slotIdx, body) {
        const ui = modalManager.ui;
        const isMain = ui.currentPageId === "0";
        const depth = ui.getNestingDepth(ui.currentPageId);
        const allowSub = depth < 3;

        let currentTab = 'basic'; // 'basic' | 'factory' | 'user'
        let factoryCategory = 'ALL'; // 'ALL' | 'Synth Voice' | 'Percussion' | 'Effect'

        const renderContent = () => {
            const basicTypes = Object.keys(MODULE_REGISTRY).filter(t => {
                if (t === 'SUB') return false;
                if (t === 'SUB_IO') return !isMain;
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
                    types: ['CLK', 'SEQ8', 'SEQ16', 'PAT', 'MARKOV', 'DIST4', 'ARP', 'KEY', 'PAD']
                },
                {
                    name: 'CV',
                    sub: 'CV (変調・演算・エンベロープ)',
                    color: 'purple',
                    types: ['LFO', 'ADSR', 'RF', 'AR', 'CHORD', 'SCALE', 'MATH1', 'MATH2', 'SH', 'COUNT', 'LUT', 'MATRIX', 'CVDELAY', 'VALUE', 'THROUGH', 'SUB_IO']
                },
                {
                    name: 'VISUALIZER',
                    sub: 'ビジュアライザ (波形・スペクトラム)',
                    color: 'emerald',
                    types: ['SCOPE', 'LISS', 'SPEC']
                }
            ];

            const filteredFactorySubs = factoryCategory === 'ALL'
                ? factorySubs
                : factorySubs.filter(s => s.category === factoryCategory);

            body.innerHTML = `
                <div class="space-y-2 select-none">
                    <!-- Tab Switcher -->
                    <div class="flex items-center justify-between border-b border-slate-800 pb-1.5">
                        <div class="flex gap-1">
                            <button id="tab-basic" class="px-2 py-1 text-[10px] font-bold rounded transition-colors ${currentTab === 'basic' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}">
                                BASIC MODULES (${basicTypes.length})
                            </button>
                            <button id="tab-factory" class="px-2 py-1 text-[10px] font-bold rounded transition-colors flex items-center gap-1 ${currentTab === 'factory' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}">
                                <span>FACTORY PRESETS (${factorySubs.length})</span>
                                ${!allowSub ? '<span class="text-[8px] bg-rose-900/80 text-rose-300 px-1 rounded">階層制限</span>' : ''}
                            </button>
                            <button id="tab-user" class="px-2 py-1 text-[10px] font-bold rounded transition-colors flex items-center gap-1 ${currentTab === 'user' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}">
                                <span>USER SUBPATCHES (${userSubs.length})</span>
                                ${!allowSub ? '<span class="text-[8px] bg-rose-900/80 text-rose-300 px-1 rounded">階層制限</span>' : ''}
                            </button>
                        </div>
                        <div class="text-[9px] font-mono text-slate-500">
                            NESTING: ${depth}/3
                        </div>
                    </div>

                    <!-- TAB 1: BASIC MODULES -->
                    ${currentTab === 'basic' ? `
                        <div class="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                            ${CATEGORIES.map(cat => {
                                const avail = cat.types.filter(t => basicTypes.includes(t));
                                if (avail.length === 0) return '';
                                const headerColor = cat.color === 'cyan' ? 'text-cyan-400 border-cyan-500/30' :
                                    cat.color === 'rose' ? 'text-rose-400 border-rose-500/30' :
                                    cat.color === 'purple' ? 'text-purple-400 border-purple-500/30' :
                                    'text-emerald-400 border-emerald-500/30';
                                return `
                                    <div class="space-y-1">
                                        <div class="text-[9px] font-bold ${headerColor} border-b pb-0.5 flex items-center justify-between">
                                            <span>${cat.name}</span>
                                            <span class="text-[8px] font-normal text-slate-500">${cat.sub}</span>
                                        </div>
                                        <div class="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                                            ${avail.map(type => {
                                                const reg = MODULE_REGISTRY[type];
                                                const bg = reg?.color === 'cyan' ? 'hover:border-cyan-400 hover:bg-cyan-950/40' :
                                                    reg?.color === 'rose' ? 'hover:border-rose-400 hover:bg-rose-950/40' :
                                                    reg?.color === 'purple' ? 'hover:border-purple-400 hover:bg-purple-950/40' :
                                                    reg?.color === 'teal' ? 'hover:border-teal-400 hover:bg-teal-950/40' :
                                                    reg?.color === 'amber' ? 'hover:border-amber-400 hover:bg-amber-950/40' :
                                                    'hover:border-slate-400 hover:bg-slate-800';
                                                return `
                                                    <button class="select-basic-mod p-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-left transition-all flex flex-col justify-between h-[46px] ${bg} active:scale-95" data-type="${type}">
                                                        <span class="text-[10px] font-extrabold text-white tracking-wide">${type}</span>
                                                        <span class="text-[7.5px] font-mono text-slate-400 truncate">${reg?.name || type}</span>
                                                    </button>
                                                `;
                                            }).join('')}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    ` : ''}

                    <!-- TAB 2: FACTORY PRESETS -->
                    ${currentTab === 'factory' ? `
                        <div class="space-y-2">
                            <!-- Category Filter Chips -->
                            <div class="flex items-center gap-1 overflow-x-auto pb-1 text-[8.5px] font-bold">
                                ${['ALL', 'Synth Voice', 'Percussion', 'Effect'].map(c => `
                                    <button class="filter-factory-cat px-2 py-0.5 rounded-full border transition-colors shrink-0 ${factoryCategory === c ? 'bg-amber-600 text-white border-amber-400' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'}" data-cat="${c}">
                                        ${c}
                                    </button>
                                `).join('')}
                            </div>

                            ${!allowSub ? `
                                <div class="p-2 rounded bg-rose-950/40 border border-rose-800/80 text-rose-300 text-[10px]">
                                    ⚠️ ネスト制限（最大3階層）に達しているため、現在のページ内にはサブパッチを追加できません。
                                </div>
                            ` : ''}

                            <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-[320px] overflow-y-auto pr-1">
                                ${filteredFactorySubs.map(sub => `
                                    <div class="p-2 rounded-lg bg-slate-900/90 border border-slate-700/80 hover:border-amber-400 hover:bg-amber-950/20 transition-all flex flex-col justify-between gap-1 group ${!allowSub ? 'opacity-50 pointer-events-none' : ''}">
                                        <div class="cursor-pointer factory-sub-item flex-1 min-w-0" data-sub-id="${sub.id}">
                                            <div class="flex items-center justify-between gap-1">
                                                <span class="text-[10px] font-extrabold text-amber-300 truncate">${sub.name}</span>
                                                <span class="text-[7.5px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400 shrink-0">${sub.category}</span>
                                            </div>
                                            <p class="text-[8px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">${sub.description || '説明なし'}</p>
                                        </div>
                                        <div class="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[7.5px] font-mono text-slate-500">
                                            <span>MODS: ${Object.keys(sub.patch?.modules || {}).length}</span>
                                            <div class="flex gap-1 items-center">
                                                <button class="export-factory-sub-btn px-1 py-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-amber-300" data-sub-id="${sub.id}" title="JSONエクスポート">
                                                    JSON
                                                </button>
                                                <button class="factory-sub-item px-1.5 py-0.5 rounded bg-amber-600/80 hover:bg-amber-500 text-white font-bold" data-sub-id="${sub.id}">
                                                    配置
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <!-- TAB 3: USER SUBPATCHES -->
                    ${currentTab === 'user' ? `
                        <div class="space-y-2">
                            ${!allowSub ? `
                                <div class="p-2 rounded bg-rose-950/40 border border-rose-800/80 text-rose-300 text-[10px]">
                                    ⚠️ ネスト制限（最大3階層）に達しているため、現在のページ内にはサブパッチを追加できません。
                                </div>
                            ` : ''}

                            <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-[320px] overflow-y-auto pr-1">
                                <!-- Create Empty Subpatch Card -->
                                <button class="select-basic-mod p-3 rounded-lg bg-purple-950/30 border-2 border-dashed border-purple-600/70 hover:border-purple-400 hover:bg-purple-950/60 transition-all flex flex-col items-center justify-center gap-1 text-center h-[96px] ${!allowSub ? 'opacity-50 pointer-events-none' : ''}" data-type="SUB">
                                    <span class="text-sm">➕</span>
                                    <span class="text-[10px] font-extrabold text-purple-200">新規空サブパッチ</span>
                                    <span class="text-[7.5px] font-mono text-slate-400">カスタム構成を一から作成</span>
                                </button>

                                ${userSubs.map(sub => `
                                    <div class="p-2 rounded-lg bg-slate-900/90 border border-slate-700/80 hover:border-purple-400 hover:bg-purple-950/20 transition-all flex flex-col justify-between gap-1 group h-[96px] ${!allowSub ? 'opacity-50 pointer-events-none' : ''}">
                                        <div class="cursor-pointer select-user-sub flex-1 min-w-0" data-sub-id="${sub.id}">
                                            <div class="flex items-center justify-between gap-1">
                                                <span class="text-[10px] font-extrabold text-purple-300 truncate">${sub.name}</span>
                                                <span class="text-[7.5px] font-mono text-slate-500 shrink-0">${new Date(sub.updatedAt || Date.now()).toLocaleDateString()}</span>
                                            </div>
                                            <p class="text-[8px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">${sub.description || 'ユーザー作成サブパッチ'}</p>
                                        </div>
                                        <div class="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[7.5px] font-mono text-slate-500">
                                            <span>MODS: ${Object.keys(sub.patch?.modules || {}).length}</span>
                                            <div class="flex gap-1 items-center">
                                                <button class="edit-user-sub-btn px-1 py-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-purple-300" data-sub-id="${sub.id}" title="編集画面を開く">
                                                    編集
                                                </button>
                                                <button class="export-user-sub-btn px-1 py-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-purple-300" data-sub-id="${sub.id}" title="JSONエクスポート">
                                                    JSON
                                                </button>
                                                <button class="delete-user-sub-btn px-1 py-0.5 rounded hover:bg-rose-950/80 text-rose-400" data-sub-id="${sub.id}" title="ライブラリから削除">
                                                    ✕
                                                </button>
                                                <button class="select-user-sub px-1.5 py-0.5 rounded bg-purple-600/80 hover:bg-purple-500 text-white font-bold" data-sub-id="${sub.id}">
                                                    配置
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;

            // Bind Tabs
            body.querySelector('#tab-basic')?.addEventListener('click', () => { currentTab = 'basic'; renderContent(); });
            body.querySelector('#tab-factory')?.addEventListener('click', () => { currentTab = 'factory'; renderContent(); });
            body.querySelector('#tab-user')?.addEventListener('click', () => { currentTab = 'user'; renderContent(); });

            // Bind Factory Category Filter Chips
            body.querySelectorAll('.filter-factory-cat').forEach(b => {
                b.addEventListener('click', (e) => {
                    factoryCategory = e.currentTarget.dataset.cat;
                    renderContent();
                });
            });

            const closeShared = () => document.getElementById('shared-modal')?.classList.add('hidden');

            // Bind Basic module selection
            body.querySelectorAll('.select-basic-mod').forEach(b => {
                b.addEventListener('click', (e) => {
                    const type = e.currentTarget.dataset.type;
                    if (type === 'SUB') {
                        ui.createSubModule(slotIdx);
                    } else {
                        ui.addModule(slotIdx, type);
                    }
                    closeShared();
                });
            });

            // Bind Event Delegation for Factory & User Subpatches
            body.onclick = (e) => {
                const btn = e.target.closest('button, .factory-sub-item, .select-user-sub');
                if (!btn) return;
                const subId = btn.dataset.subId;
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
    }
}
