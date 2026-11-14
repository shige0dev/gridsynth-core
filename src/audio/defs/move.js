// src/audio/defs/move.js
// Audio / Engine side implementation for MOVE module
// Modifies geometry transform position (X, Y, or Z axis).
// Supports multi-cable summing on obj_in (groups multiple objects automatically).
// Driven by manual slider or external CV (PIN4).

import { AudioHelpers } from '../helpers.js';

export const MOVE = {
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
                const offset = isCvPatched ? cvReader.read(0) * 2.0 : Number(d.offset ?? 0.0);

                const axis = (d.axis || 'x').toLowerCase();
                const axisIdx = axis === 'y' ? 1 : (axis === 'z' ? 2 : 0);

                if (incoming.length === 1) {
                    const pkt = incoming[0];
                    const prevPos = [...(pkt.transform?.position || [0, 0, 0])];
                    prevPos[axisIdx] += offset;

                    return {
                        ...pkt,
                        transform: {
                            ...pkt.transform,
                            position: prevPos,
                            rotation: pkt.transform?.rotation ? [...pkt.transform.rotation] : [0, 0, 0],
                            scale: pkt.transform?.scale ? [...pkt.transform.scale] : [1.0, 1.0, 1.0]
                        }
                    };
                }

                // Multiple cables: automatic container group
                const groupPos = [0, 0, 0];
                groupPos[axisIdx] = offset;

                return {
                    type: 'GROUP',
                    id: d.id,
                    transform: {
                        position: groupPos,
                        rotation: [0, 0, 0],
                        scale: [1.0, 1.0, 1.0]
                    },
                    children: incoming
                };
            },
            read: () => {
                const isCvPatched = AudioHelpers.isPortPatched(d, patchState, 'cv_in');
                const isGeoPatched = AudioHelpers.isPortPatched(d, patchState, 'obj_in');
                const offset = isCvPatched ? cvReader.read(0) * 2.0 : Number(d.offset ?? 0.0);

                return {
                    axis: d.axis || 'x',
                    offset,
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

export const moveAudioDefs = {
    MOVE
};
export default moveAudioDefs;
