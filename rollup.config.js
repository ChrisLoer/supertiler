import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
    input: './main.js',
    output: {
        file: './main.cjs',
        format: 'cjs'
    },
    plugins: [nodeResolve({resolveOnly: ['supercluster', 'kdbush']})]
}