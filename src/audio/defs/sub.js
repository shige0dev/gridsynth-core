export const SUB = {
    create: (ctx, d) => {
        const nodes = {}, inputs = {}, outputs = {};
        // Slots 1..6: Inputs (Send: Parent -> Child)
        for (let i = 1; i <= 6; i++) {
            const pin = `PIN${i}_in`;
            const inGain = ctx.createGain();
            inGain.gain.value = 1.0;
            nodes[pin] = inGain;
            inputs[pin] = inGain;
            inputs[`PIN${i}`] = inGain;
            inputs[`io_${i}`] = inGain;
        }
        // Slots 7..12: Outputs (Return: Child -> Parent)
        for (let i = 7; i <= 12; i++) {
            const pin = `PIN${i}_out`;
            const outGain = ctx.createGain();
            outGain.gain.value = 1.0;
            nodes[pin] = outGain;
            outputs[pin] = outGain;
            outputs[`PIN${i}`] = outGain;
            outputs[`io_${i}`] = outGain;
        }
        outputs['io_9'] = outputs['PIN7_out'];
        return { nodes, inputs, outputs, targetPage: d.targetPage ?? 1 };
    },
    update: (ctx, inst, d) => {
        inst.targetPage = d.targetPage ?? 1;
    }
};

export const SUB_IO = {
    create: (ctx) => {
        const nodes = {}, inputs = {}, outputs = {};
        // Slots 1..6: Outputs (Receive from Parent)
        for (let i = 1; i <= 6; i++) {
            const pin = `PIN${i}_out`;
            const outGain = ctx.createGain();
            outGain.gain.value = 1.0;
            nodes[pin] = outGain;
            outputs[pin] = outGain;
            outputs[`PIN${i}`] = outGain;
            outputs[`io_${i}`] = outGain;
        }
        // Slots 7..12: Inputs (Send back to Parent)
        for (let i = 7; i <= 12; i++) {
            const pin = `PIN${i}_in`;
            const inGain = ctx.createGain();
            inGain.gain.value = 1.0;
            nodes[pin] = inGain;
            inputs[pin] = inGain;
            inputs[`PIN${i}`] = inGain;
            inputs[`io_${i}`] = inGain;
        }
        inputs['io_9'] = inputs['PIN7_in'];
        return { nodes, inputs, outputs };
    }
};

export const subAudioDefs = {
    SUB,
    SUB_IO
};
