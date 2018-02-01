export default {
    entry: 'src/WebScroll.js',
    indent: '\t',
    plugins: [],
    targets: [
        {
            format: 'umd',
            moduleName: 'WebScroll',
            dest: 'build/webscroll.js'
        },
        {
            format: 'es',
            dest: 'build/webscroll.module.js'
        }
    ]
};