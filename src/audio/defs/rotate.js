// src/audio/defs/rotate.js
// Audio / Engine side implementation for ROTATE module
// Modifies geometry transform rotation around selectable X, Y, or Z axis in radians.
// Driven by manual slider or external CV (PIN4).

import { AudioHelpers } from '../helpers.js';

export const ROTATE = {
    create: (ctx, d, patch, eng) => {
        let patchState = patch || null;
        const cvReader = AudioHelpers.createCvReader(ctx, eng);

        return {
            nodes: { gIn: cvReader.input, anIn: cvReader.analyser },
            inputs: {
                cv_in: cvReader.input,
                obj_in: null
            },
            outputs: {
                obj_out: null
            },
            data: d,
            getGeometryPacket: () => {
                const incoming = AudioHelpers.getSourcePackets(eng, d, ['obj_in'], patchState, true);
                if (incoming.length === 0) return null;

                // Priority: External CV if patched, otherwise internal slider (radians)
                const isCvPatched = AudioHelpers.isPortPatched(d, patchState, 'cv_in');
                // 1.0 = 2*PI radians (1 full turn / 360 degrees)
                const turn = isCvPatched ? cvReader.read(0) : Number(d.angle ?? 0.0);
                const angle = turn * (2 * Math.PI);

                const axis = (d.axis || 'x').toLowerCase();
                const axisIdx = axis === 'y' ? 1 : (axis === 'z' ? 2 : 0);

                if (incoming.length === 1) {
                    const pkt = incoming[0];
                    const prevRot = [...(pkt.transform?.rotation || [0, 0, 0])];
                    prevRot[axisIdx] += angle;

                    return {
                        ...pkt,
                        transform: {
                            ...pkt.transform,
                            position: pkt.transform?.position ? [...pkt.transform.position] : [0, 0, 0],
                            rotation: prevRot,
                            scale: pkt.transform?.scale ? [...pkt.transform.scale] : [1.0, 1.0, 1.0]
                        }
                    };
                }

                // Multiple cables: automatic container group
                const groupRot = [0, 0, 0];
                groupRot[axisIdx] = angle;

                return {
                    type: 'GROUP',
                    id: d.id,
                    transform: {
                        position: [0, 0, 0],
                        rotation: groupRot,
                        scale: [1.0, 1.0, 1.0]
                    },
                    children: incoming
                };
            },
            read: () => {
                const isCvPatched = AudioHelpers.isPortPatched(d, patchState, 'cv_in');
                const isGeoPatched = AudioHelpers.isPortPatched(d, patchState, 'obj_in');
                const angle = isCvPatched ? cvReader.read(0) * (2 * Math.PI) : Number(d.angle ?? 0.0);

                return {
                    axis: d.axis || 'x',
                    angle,
                    isCvPatched,
                    isGeoPatched
                };
            },
            updatePatchState: (p) => {
                patchState = p;
            },
            destroy: () => {
                try { cvReader.input.disconnect(); } catch (e) {}
                try { cvReader.analyser.disconnect(); } catch (e) {}
            }
        };
    },
    update: (ctx, inst, d, patch) => {
        inst.data = d;
        if (patch !== undefined && inst.updatePatchState) {
            inst.updatePatchState(patch);
        }
    }
};

export const rotateAudioDefs = {
    ROTATE
};
export default rotateAudioDefs;
