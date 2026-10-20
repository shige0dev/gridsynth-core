export class MarkovProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.state = 0;
        this.initOn = false;
        this.stateVal = 0.0;
        this.stayWeight = 10;
        this.weights = [0, 0, 0, 0];
        this.holdClocks = 1;
        this.clockCount = 0;
        this.clkActive = false;
        this.trigOutCh = -1;
        this.shotActive = false;

        this.port.onmessage = e => {
            if (e.data.type === 'SET_STATE') {
                if (e.data.initOn !== undefined) this.initOn = !!e.data.initOn;
                if (e.data.state !== undefined) this.state = e.data.state ? 1 : 0;
                if (e.data.stateVal !== undefined) this.stateVal = e.data.stateVal;
                if (e.data.stayWeight !== undefined) this.stayWeight = e.data.stayWeight;
                if (e.data.weights) this.weights = e.data.weights;
                if (e.data.holdClocks !== undefined) this.holdClocks = Math.max(1, Math.round(e.data.holdClocks));
            } else if (e.data.type === 'TRIGGER_TOGGLE') {
                this.state = this.state ? 0 : 1;
                this.clockCount = 0;
                this.trigOutCh = -1;
                this.clkActive = false;
                this.shotActive = false;
                this.port.postMessage({ type: 'STATE_CHANGED', state: this.state });
            } else if (e.data.type === 'RESET') {
                this.state = this.initOn ? 1 : 0;
                this.clockCount = 0;
                this.trigOutCh = -1;
                this.clkActive = false;
                this.shotActive = false;
                this.port.postMessage({ type: 'STATE_CHANGED', state: this.state });
            }
        };
    }

    process(ins, outs) {
        const inClk = ins[0]?.[0];
        const inTrig = ins[1]?.[0];

        const o1 = outs[0]?.[0], o2 = outs[1]?.[0], o3 = outs[2]?.[0], o4 = outs[3]?.[0];
        const cvOut = outs[4]?.[0], gtOut = outs[5]?.[0], stepGtOut = outs[6]?.[0];
        const outArr = [o1, o2, o3, o4];
        const len = 128;

        for (let i = 0; i < len; i++) {
            const clkV = inClk ? inClk[i] : 0.0;
            const trigV = inTrig ? inTrig[i] : 0.0;
            const isClkHi = clkV >= 0.5;

            // 1. 莉悶ヮ繝ｼ繝峨°繧峨・驕ｷ遘ｻ繝医Μ繧ｬ繝ｼ蜿嶺ｿ｡・医ヰ繝医Φ蜿励￠蜿｣・・            if (trigV >= 0.5) {
                if (this.state === 0) {
                    this.state = 1;
                    this.clockCount = 1;
                    this.clkActive = true; // 迴ｾ蝨ｨ縺ｮ遶九■荳翫′繧頑牛縺ｧ繝舌ヨ繝ｳ繧貞女縺大叙縺｣縺溘・縺ｧ蜷梧牛縺ｧ縺ｮ蜊ｳ譎る・遘ｻ繧帝亟豁｢
                    this.shotActive = true; // 繝弱・繝臥匱陦梧凾縺ｮ繝ｯ繝ｳ繧ｷ繝ｧ繝・ヨ繝医Μ繧ｬ繝ｼ繧偵％縺ｮ諡阪〒逋ｺ轣ｫ
                    this.port.postMessage({ type: 'STATE_CHANGED', state: 1 });
                }
            }

            // 2. 繧ｯ繝ｭ繝・け蜈･蜉帙・遶九■荳九′繧頑､懃衍・医Ο繝・け隗｣髯､繝ｻ繝医Μ繧ｬ繝ｼ豸育・・・            if (clkV < 0.3) {
                this.clkActive = false;
                this.trigOutCh = -1;
                this.shotActive = false; // 1諡阪・繧ｯ繝ｭ繝・け邨ゆｺ・〒繝ｯ繝ｳ繧ｷ繝ｧ繝・ヨ繝医Μ繧ｬ繝ｼ豸育・
            }

            // 3. 繧ｯ繝ｭ繝・け遶九■荳翫′繧頑､懃衍縺ｨ迥ｶ諷矩・遘ｻ
            const isRising = (isClkHi && !this.clkActive);
            if (isRising) {
                this.clkActive = true;

                if (this.state === 1) {
                    if (this.clockCount === 0) {
                        // 蛻晄悄襍ｷ蜍輔ヮ繝ｼ繝峨・隨ｬ1諡咲岼
                        this.clockCount = 1;
                        this.shotActive = true; // 蛻晏屓逋ｺ陦梧凾縺ｮ繝ｯ繝ｳ繧ｷ繝ｧ繝・ヨ繝医Μ繧ｬ繝ｼ逋ｺ轣ｫ
                    } else {
                        // 譛菴惹ｿ晄戟繧ｯ繝ｭ繝・け謨ｰ・・oldClocks・峨↓驕斐＠縺ｦ縺・ｋ蝣ｴ蜷医∫｢ｺ邇・・遘ｻ繧貞愛螳・                        if (this.clockCount >= this.holdClocks) {
                            let totalW = Math.max(0, this.stayWeight);
                            for (let k = 0; k < 4; k++) {
                                totalW += Math.max(0, this.weights[k] || 0);
                            }

                            if (totalW > 0) {
                                const r = Math.random() * totalW;
                                let acc = Math.max(0, this.stayWeight);
                                if (r >= acc) {
                                    let chosen = -1;
                                    for (let k = 0; k < 4; k++) {
                                        acc += Math.max(0, this.weights[k] || 0);
                                        if (r < acc) {
                                            chosen = k;
                                            break;
                                        }
                                    }
                                    if (chosen !== -1) {
                                        // 蜊ｳ蠎ｧ縺ｫ谺｡繝弱・繝峨∈驕ｷ遘ｻ・・                                        this.state = 0;
                                        this.clockCount = 0;
                                        this.trigOutCh = chosen;
                                        this.shotActive = false;
                                        this.port.postMessage({ type: 'STATE_CHANGED', state: 0 });
                                    }
                                }
                            }
                        }

                        // 驕ｷ遘ｻ縺帙★逡吶∪繧句ｴ蜷医∵ｻ槫惠繧ｯ繝ｭ繝・け謨ｰ繧貞刈邂・                        if (this.state === 1) {
                            this.clockCount++;
                        }
                    }
                }
            }

            // 4. 繝医Μ繧ｬ蜃ｺ蜉幢ｼ・rig_out1..4・・ 繧ｯ繝ｭ繝・けHigh縺ｮ髢薙・・遘ｻ蜈医・繝ｼ繝医∈繝代Ν繧ｹ蜃ｺ蜉・            for (let k = 0; k < 4; k++) {
                const outCh = outArr[k];
                if (outCh) {
                    outCh[i] = (this.trigOutCh === k && isClkHi) ? 1.0 : 0.0;
                }
            }

            // 5. CV蜃ｺ蜉幢ｼ・v_out・・ 繧｢繧ｯ繝・ぅ繝匁凾縺ｯ髻ｳ遞気V縲∵ｬ｡繧ｯ繝ｭ繝・け遶九■荳翫′繧翫∪縺ｧ菫晄戟
            if (cvOut) {
                cvOut[i] = this.state === 1 ? this.stateVal : 0.0;
            }

            // 6. 謖∫ｶ壹ご繝ｼ繝亥・蜉幢ｼ・ate_out・・ 谺｡縺ｫ驕ｷ遘ｻ縺吶ｋ縺ｾ縺ｧ縺壹▲縺ｨON・・.0V・・            if (gtOut) {
                gtOut[i] = this.state === 1 ? 1.0 : 0.0;
            }

            // 7. 繝ｯ繝ｳ繧ｷ繝ｧ繝・ヨ繝医Μ繧ｬ蜃ｺ蜉幢ｼ・tep_gate・・
            // 繝弱・繝峨′繧｢繧ｯ繝・ぅ繝厄ｼ育匱陦鯉ｼ峨＆繧後◆譛蛻昴・諡阪↓縲∝・蜉帙ヨ繝ｪ繧ｬ繝ｼ・医け繝ｭ繝・けHigh・峨→蜷後§譎る俣縺縺・.0V繧貞・蜉・            if (stepGtOut) {
                stepGtOut[i] = (this.state === 1 && this.shotActive && isClkHi) ? 1.0 : 0.0;
            }
        }

        return true;
    }
}

registerProcessor('markov-processor', MarkovProcessor);

