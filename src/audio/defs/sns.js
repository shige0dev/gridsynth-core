// SNS - Smartphone Sensor CV Module
// Uses ConstantSourceNode x3 (no AudioWorklet) for minimal CPU overhead.
// Sensor events throttled to ~30Hz via timestamp gating.

const THROTTLE_MS = 33; // ~30Hz

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

// Scale sensor raw values to -1..+1 range
const SCALE = {
    ACCEL:  10,   // m/s², typical max ~±10
    GRAV:   10,   // m/s²
    GYRO:   200,  // deg/s, typical fast shake
    ORIENT: 180   // degrees (beta/gamma capped)
};

export const SNS = {
    create: (ctx, d, patch, eng) => {
        // 3 ConstantSourceNodes — one per axis
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

        let liveData = { x: 0, y: 0, z: 0 };
        let lastMs = 0;
        let motionHandler = null;
        let orientHandler = null;

        const setValues = (rawX, rawY, rawZ, scale) => {
            const now = Date.now();
            if (now - lastMs < THROTTLE_MS) return;
            lastMs = now;
            const x = clamp((rawX ?? 0) / scale, -1, 1);
            const y = clamp((rawY ?? 0) / scale, -1, 1);
            const z = clamp((rawZ ?? 0) / scale, -1, 1);
            axX.src.offset.value = x;
            axY.src.offset.value = y;
            axZ.src.offset.value = z;
            liveData = { x, y, z };
        };

        const startSensor = (sensor) => {
            // Remove old listeners
            if (motionHandler) window.removeEventListener('devicemotion', motionHandler);
            if (orientHandler) window.removeEventListener('deviceorientation', orientHandler);
            motionHandler = null;
            orientHandler = null;

            const scale = SCALE[sensor] || 10;

            if (sensor === 'ACCEL') {
                motionHandler = (e) => setValues(
                    e.acceleration?.x, e.acceleration?.y, e.acceleration?.z, scale);
                window.addEventListener('devicemotion', motionHandler, { passive: true });

            } else if (sensor === 'GRAV') {
                motionHandler = (e) => setValues(
                    e.accelerationIncludingGravity?.x,
                    e.accelerationIncludingGravity?.y,
                    e.accelerationIncludingGravity?.z, scale);
                window.addEventListener('devicemotion', motionHandler, { passive: true });

            } else if (sensor === 'GYRO') {
                motionHandler = (e) => setValues(
                    e.rotationRate?.alpha, e.rotationRate?.beta, e.rotationRate?.gamma, scale);
                window.addEventListener('devicemotion', motionHandler, { passive: true });

            } else if (sensor === 'ORIENT') {
                orientHandler = (e) => setValues(e.alpha, e.beta, e.gamma, scale);
                window.addEventListener('deviceorientation', orientHandler, { passive: true });
            }
        };

        startSensor(d.sensor || 'ACCEL');

        const inst = {
            nodes: { axX, axY, axZ },
            inputs: {},
            outputs: {
                x_out: axX.gain,
                y_out: axY.gain,
                z_out: axZ.gain
            },
            read: () => liveData,
            _startSensor: startSensor,
            _cleanup: () => {
                if (motionHandler) window.removeEventListener('devicemotion', motionHandler);
                if (orientHandler) window.removeEventListener('deviceorientation', orientHandler);
                axX.src.stop(); axY.src.stop(); axZ.src.stop();
            }
        };
        return inst;
    },

    update: (ctx, inst, d) => {
        inst._startSensor?.(d.sensor || 'ACCEL');
    },

    destroy: (inst) => {
        inst._cleanup?.();
    }
};

export const snsAudioDefs = { SNS };

