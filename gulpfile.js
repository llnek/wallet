"use strict";
const gulp = require('gulp');
const uglify = require('gulp-terser');
const notify = require('gulp-notify');
const concat = require('gulp-concat');
const rename = require('gulp-rename');
const jsdoc=require("gulp-jsdoc3");
const sourcemaps = require('gulp-sourcemaps');

const jsFiles = [
  "src/tpcl/crypto-js.min.js",
  "src/crypto/blockchain.js",
  "src/crypto/tx.js",
  "src/crypto/p2p.js",
  "src/crypto/wallet.js"
];

var destDir = 'dist'; //or any folder inside your public asset folder
//To concat and Uglify All JS files in a particular folder
gulp.task("bundleJS", function(){
    return gulp.src(jsFiles)
        .pipe(concat("crypto_wallet.js")) //this will concat all the files into concat.js
        .pipe(gulp.dest("dist")) //this will save concat.js in a temp directory defined above
        .pipe(uglify()) //this will uglify/minify uglify.js
        .pipe(rename("crypto_wallet.min.js")) //this will rename concat.js to uglify.js
        .pipe(gulp.dest("dist")); //this will save uglify.js into destination Directory defined above
});

gulp.task('doc', function (cb) {
  gulp.src(['README.md', './src/crypto/**/*.js'], {read: false}).pipe(jsdoc(cb));
});

gulp.task("default", gulp.series("bundleJS"), function(){
  console.log("Gulp started");
});


