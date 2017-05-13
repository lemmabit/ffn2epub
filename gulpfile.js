var gulp = require('gulp');

var rollup      = require('rollup-stream');
var nodeResolve = require('rollup-plugin-node-resolve');
var commonjs    = require('rollup-plugin-commonjs');
var string      = require('rollup-plugin-string');
var source      = require('vinyl-source-stream');
var header      = require('gulp-header');
var fs          = require('fs');

gulp.task('default', function() {
  return rollup({
    entry: './src/main.js',
    plugins: [
      nodeResolve(),
      commonjs({
        include: 'node_modules/**',
      }),
      string({
        include: 'src/resources/**',
      }),
    ],
    format: 'es',
  })
  .pipe(source('fimfiction-to-epub.js', './src'))
  .pipe(header(fs.readFileSync('./src/header.js')))
  .pipe(gulp.dest('.'));
});
