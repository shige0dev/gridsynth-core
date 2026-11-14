// src/audio/defs/scale.js
// Audio / Engine side implementation for SCALE module
// Modifies geometry transform scale (ALL axes, X, Y, or Z).
// Centers on the topmost object local axis.
// Supports multi-cable summing on obj_in (groups multiple objects automatically).
// Driven by manual slider or external CV (PIN4).

import { AudioHelpers } from '../helpers.js';

export const SCALE = {
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

                // Priority: External CV if patched, otherwise internal slider
                const isCvPatched = AudioHelpers.isPortPatched(d, patchState, 'cv_in');
                const scaleFactor = Math.max(0.001, isCvPatched ? cvReader.read(0) : Number(d.scale ?? 1.0));

                const axis = (d.axis || 'all').toLowerCase();
                const axisIdx = axis === 'y' ? 1 : (axis === 'z' ? 2 : (axis === 'x' ? 0 : -1));

                if (incoming.length === 1) {
                    const pkt = incoming[0];
                    const prevScale = [...(pkt.transform?.scale || [1.0, 1.0, 1.0])];

                    if (axis === 'all' || axisIdx === -1) {
                        prevScale[0] *= scaleFactor;
                        prevScale[1] *= scaleFactor;
                        prevScale[2] *= scaleFactor;
                    } else {
                        prevScale[axisIdx] *= scaleFactor;
                    }

                    return {
                        ...pkt,
                        transform: {
                            ...pkt.transform,
                            position: pkt.transform?.position ? [...pkt.transform.position] : [0, 0, 0],
                            rotation: pkt.transform?.rotation ? [...pkt.transform.rotation] : [0, 0, 0],
                            scale: prevScale
                        }
                    };
                }

                // Multiple cables: automatic container group centered on topmost local axis
                const groupScale = [1.0, 1.0, 1.0];
                if (axis === 'all' || axisIdx === -1) {
                    groupScale[0] = scaleFactor;
                    groupScale[1] = scaleFactor;
                    groupScale[2] = scaleFactor;
                } else {
                    groupScale[axisIdx] = scaleFactor;
                }

                return {
                    type: 'GROUP',
                    id: d.id,
                    transform: {
                        position: [0, 0, 0],
                        rotation: [0, 0, 0],
                        scale: groupScale
                    },
                    children: incoming
                };
            },
            read: () => {
                const isCvPatched = AudioHelpers.isPortPatched(d, patchState, 'cv_in');
                const isGeoPatched = AudioHelpers.isPortPatched(d, patchState, 'obj_in');
                const scaleFactor = Math.max(0.001, isCvPatched ? cvReader.read(0) : Number(d.scale ?? 1.0));

                return {
                    axis: d.axis || 'all',
                    scale: scaleFactor,
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

export const scaleAudioDefs = {
    SCALE
};
export default scaleAudioDefs;
