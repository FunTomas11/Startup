let fileswatch = 'html,htm,txt,json,md,woff2' // List of files extensions for watching & hard reload

const { src, dest, parallel, series, watch } = require('gulp')
const browserSync  = require('browser-sync').create()
const bssi         = require('browsersync-ssi')
const ssi          = require('ssi')
const webpack      = require('webpack-stream')
const styl         = require('gulp-stylus')
const cleancss     = require('gulp-clean-css')
const autoprefixer = require('gulp-autoprefixer')
const rename       = require('gulp-rename')
const imagemin     = require('gulp-imagemin')
const newer        = require('gulp-newer')
const del 				 = require('del')

function browsersync() {
	browserSync.init({
		server: { 
			baseDir: 'app/',
			middleware: bssi({ baseDir: 'app/', ext: '.html' })
		},
		ghostMode: { clicks: false },
		notify: false,
		online: true,
		// tunnel: 'yousutename', // Attempt to use the URL https://yousutename.loca.lt
	})
}

function scripts() {
	return src('app/js/app.js')
	.pipe(webpack({
		mode: 'production',
		performance: { hints: false },
		module: {
			rules: [
				{
					test: /\.(js)$/,
					exclude: /(node_modules)/,
					loader: 'babel-loader',
					query: {
						presets: ['@babel/env'],
						plugins: ['babel-plugin-root-import']
					}
				}
			]
		}
	})).on('error', function handleError() {
		this.emit('end')
	})
	.pipe(rename('app.min.js'))
	.pipe(dest('app/js'))
	.pipe(browserSync.stream())
}

function styles() {
	return src('app/styl/main.styl')
	.pipe(styl())
	.pipe(autoprefixer({ overrideBrowserslist: ['last 10 versions'], grid: true }))
	.pipe(cleancss({ level: { 1: { specialComments: 0 } },/* format: 'beautify' */ }))
	.pipe(rename('app.min.css'))
	.pipe(dest('app/css'))
	.pipe(browserSync.stream())
}

function images() {
	return src('app/img/src/**/*')
	.pipe(newer('app/img/dest'))
	.pipe(imagemin())
	.pipe(dest('app/img/dest'))
}


function buildCopy() {
	return src([
		'app/css/**/*.min.css',
		'app/js/**/*.min.js',
		'app/img/dest/**/*',
		'app/fonts/**/*',
		'app/**/*.html'

], { base: 'app' })
.pipe(dest('dist'));
}

async function buildhtml() {
	let includes = new ssi('app/', 'dist/', '/**/*.html')
	includes.compile()
	del('dist/parts', { force: true })
}

function cleanDist() {
	return del('dist/**/*', { force: true })
}

function cleanImg() {
	return del('app/img/dest/**/*', { force: true })
}

function startwatch() {
	watch('app/styl/**/*', { usePolling: true }, styles)
	watch(['app/js/**/*.js', '!app/js/**/*.min.js'], { usePolling: true }, scripts)
	watch('app/img/src/**/*.{jpg,jpeg,png,webp,svg,gif}', { usePolling: true }, images)
	watch(`app/**/*.{${fileswatch}}`, { usePolling: true }).on('change', browserSync.reload)
}


exports.scripts  = scripts
exports.styles   = styles
exports.cleanImg = cleanImg 
exports.images   = images
exports.build 	 = series(cleanDist, images, scripts, styles, buildCopy, buildhtml)
exports.default  = series(images, scripts, styles, parallel(browsersync, startwatch))
