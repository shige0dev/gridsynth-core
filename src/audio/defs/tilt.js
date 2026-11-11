// TILT - Smartphone 3-Axis Tilt CV Module
// Uses ConstantSourceNode x3 for minimal CPU overhead.
// Reads devicemotion (accelerationIncludingGravity) throttled to ~30Hz.
// Low-pass exponential smoothing filters out road vibration and hand tremors.

const THROTTLE_MS = 30; // ~30Hz sampling rate
const G = 9.80665;

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

export const GSENSOR = {
    create: (ctx, d, patch, eng) => {
        const makeAxis = () => {
            const src = ctx.createConstantSource();
            const gain = ctx.createGain();
            src.offset.value = 0;
            src.connect(gain);
            src.start();
            if (eng?.silentSink) gain.connect(eng.silentSink);
            return { src, gain };
        };

        const axX = makeAxis();
        const axY = makeAxis();
        const axZ = makeAxis();

        let cfg = {
            smooth: d.smooth ?? 0.7,
            tareX: d.tareX ?? 0,
            tareY: d.tareY ?? 0,
            tareZ: d.tareZ ?? 0
        };

        let smoothedX = 0;
        let smoothedY = 0;
        let smoothedZ = 0;
        let lastRawX = 0;
        let lastRawY = 0;
        let lastRawZ = 0;
        let hasEvent = false;
        let lastMs = 0;

        let liveData = {
            x: 0,
            y: 0,
            z: 0,
            rawX: 0,
            rawY: 0,
            rawZ: 0,
            active: false
        };

        const motionHandler = (e) => {
            const g = e.accelerationIncludingGravity;
            if (!g || (g.x === null && g.y === null && g.z === null)) return;

            const now = Date.now();
            if (now - lastMs < THROTTLE_MS) return;
            lastMs = now;

            const rx = g.x ?? 0;
            const ry = g.y ?? 0;
            const rz = g.z ?? 0;
            lastRawX = rx;
            lastRawY = ry;
            lastRawZ = rz;

            if (!hasEvent) {
                // Initialize on first reading to avoid sudden ramp
                smoothedX = rx;
                smoothedY = ry;
                smoothedZ = rz;
                hasEvent = true;
            } else {
                const s = clamp(cfg.smooth, 0, 0.95);
                const alpha = 1.0 - s * 0.9;
                smoothedX += alpha * (rx - smoothedX);
                smoothedY += alpha * (ry - smoothedY);
                smoothedZ += alpha * (rz - smoothedZ);
            }

            const x = clamp((smoothedX - cfg.tareX) / G, -1, 1);
            const y = clamp((smoothedY - cfg.tareY) / G, -1, 1);
            const z = clamp((smoothedZ - cfg.tareZ) / G, -1, 1);

            const t = ctx.currentTime;
            axX.src.offset.setTargetAtTime(x, t, 0.015);
            axY.src.offset.setTargetAtTime(y, t, 0.015);
            axZ.src.offset.setTargetAtTime(z, t, 0.015);

            liveData = {
                x, y, z,
                rawX: rx, rawY: ry, rawZ: rz,
                active: true
            };
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('devicemotion', motionHandler, { passive: true });
        }

        const inst = {
            nodes: { axX, axY, axZ },
            inputs: {},
            outputs: {
                x_out: axX.gain,
                y_out: axY.gain,
                z_out: axZ.gain
            },
            read: () => liveData,
            setCfg: (newCfg) => {
                cfg = { ...cfg, ...newCfg };
            },
            getRaw: () => ({ x: lastRawX, y: lastRawY, z: lastRawZ }),
            _cleanup: () => {
                if (typeof window !== 'undefined') {
                    window.removeEventListener('devicemotion', motionHandler);
                }
                axX.src.stop();
                axY.src.stop();
                axZ.src.stop();
            }
        };

        return inst;
    },

    update: (ctx, inst, d) => {
        if (inst.setCfg) {
            inst.setCfg({
                smooth: d.smooth ?? 0.7,
                tareX: d.tareX ?? 0,
                tareY: d.tareY ?? 0,
                tareZ: d.tareZ ?? 0
            });
        }
    },

    destroy: (inst) => {
        inst._cleanup?.();
    }
};

export const tiltAudioDefs = { GSENSOR };
