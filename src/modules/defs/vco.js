import { UIHelpers } from '../../ui/helpers.js';

export const VCO = {
    color: 'blue',
    defaults: () => ({ type: 'VCO', channels: 1, quantize: true, wave: 'sawtooth', freq1: 220, freq2: 220, freq3: 220, freq4: 220 }),
    ports: (m) => ({ in: UIHelpers.getMultiPitchInPorts(m), out: [{ port: 'wave_out', color: 'bg-blue-500' }] }),
    renderGrid: (m) => {
        const isQ = m.quantize !== false;
        const f1 = m.freq1 || 220;
        const noteStr = isQ ? UIHelpers.midiToNoteName(UIHelpers.freqToMidi(f1)) : '';
        return `<div class="flex flex-col items-center justify-center leading-none gap-0.5 pointer-events-none text-cyan-400">
            <span class="text-[9px] font-bold uppercase">${m.wave || 'SAW'}</span>
            ${isQ ? `<span class="text-[13px] font-mono font-bold text-white tracking-tight">${noteStr}</span><span class="text-[8.5px] font-mono text-cyan-400/80">${Math.round(f1)}hz</span>` : `<span class="text-[13px] font-mono font-bold tracking-tight">${Math.round(f1)}<span class="text-[9px] ml-0.5">hz</span></span>`}
        </div>`;
    },
    schema: {
        color: 'blue',
        header: {
            channel: { label: 'OSCS', max: 4 },
            toggle: { key: 'quantize', label: 'QLZ', default: true, color: 'cyan' }
        },
        groups: [
            {
                key: 'wave',
                label: 'Waveform',
                cols: 4,
                options: [
                    { val: 'sawtooth', label: 'SAW' },
                    { val: 'square', label: 'SQR' },
                    { val: 'sine', label: 'SIN' },
                    { val: 'triangle', label: 'TRI' }
                ]
            }
        ],
        sliders: (m) => {
            const isQ = m.quantize !== false;
            const ch = Math.min(4, Math.max(1, m.channels || 1));
            return Array.from({ length: ch }, (_, i) => {
                const c = i + 1;
                const portName = c === 1 ? 'cv_in' : `cv_in${c}`;
                return isQ ? {
                    key: `freq${c}`,
                    label: `OSC${c}`,
                    min: 24, max: 84, step: 1, default: 69,
                    unit: 'note',
                    cvPort: portName,
                    patchedText: '1V/OCT',
                    getVal: (mod) => UIHelpers.freqToMidi(mod[`freq${c}`] ?? 220),
                    setVal: (mod, v) => { mod[`freq${c}`] = UIHelpers.midiToFreq(Math.round(v)); },
                    format: (v) => UIHelpers.midiToNoteName(v)
                } : {
                    key: `freq${c}`,
                    label: `OSC${c}`,
                    min: 40, max: 2000, step: 5, default: 220,
                    unit: 'hz',
                    cvPort: portName,
                    patchedText: '1V/OCT',
                    format: (v) => `${Math.round(v)}hz`
                };
            });
        }
    }
};

export const NOISE = {
    color: 'emerald',
    defaults: () => ({ type: 'NOISE', noiseType: 'white', tone: 8000, level: 0.8 }),
    ports: () => ({ in: [], out: [{ port: 'wave_out', color: 'bg-blue-500' }] }),
    schema: {
        color: 'emerald',
        groups: [{ key: 'noiseType', label: 'Color', cols: 3, options: [{ val: 'white', label: 'WHT' }, { val: 'pink', label: 'PNK' }, { val: 'brown', label: 'BRN' }] }],
        sliders: [
            { key: 'tone', label: 'TONE', min: 200, max: 16000, step: 100, default: 8000, unit: 'hz', format: v => (v>=1000?`${(v/1000).toFixed(1)}k`:Math.round(v))+'hz' },
            { key: 'level', label: 'LEVEL', min: 0, max: 1.0, step: 0.01, default: 0.8, unit: 'lvl', format: v => v.toFixed(2) }
        ]
    },
    renderGrid: (m) => `<div class="flex flex-col items-center justify-center leading-none gap-0.5 pointer-events-none text-cyan-400"><span class="text-[9px] font-bold uppercase">${(m.noiseType||'white').substring(0,3)}</span><span class="text-[13px] font-mono font-bold">${(m.level??0.8).toFixed(2)}</span></div>`
};

export const vcoDefs = {
    VCO,
    NOISE
};
