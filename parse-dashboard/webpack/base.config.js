var path = require('path');
var SvgPrepPlugin = require('./plugins/svg-prep');

var webpack = require('webpack');
var fs = require('fs');
var json = JSON.parse(fs.readFileSync('package.json', 'utf8'));
var version = json.version;

module.exports = {
  context: path.join(__dirname, '../src'),
  output: {
    filename: '[name].bundle.js',
    publicPath:'bundles/'
  },
  resolve: {
    root: [__dirname, path.join(__dirname, '../src'), path.join(__dirname, 'node_modules')]
  },
  resolveLoader: {
    root: path.join(__dirname, '../node_modules')
  },
  module: {
    loaders: [{
      test: /\.js$/,
      exclude: /node_modules/,
      loader: 'babel-loader',
      query: {
        optional: ['runtime', 'es7.decorators']
      }
    }, {
      test: /\.scss$/,
        loader: "style-loader!css-loader?modules&localIdentName=[local]__[hash:base64:5]!sass-loader?includePaths[]=" +
          encodeURIComponent(path.resolve(__dirname, '../src'))
    }, {
      test: /\.css$/,
      loader: 'style-loader!css-loader'
    }, {
      test: /\.png$/,
      loader: 'file-loader?name=img/[hash].[ext]',
    }, {
      test: /\.jpg$/,
      loader: 'file-loader?name=img/[hash].[ext]'
    }]
  },
  plugins: [
    new SvgPrepPlugin({
      source: path.join(__dirname, '../src', 'icons')
    }),
    new webpack.DefinePlugin({
      'process.env': {
        'version': JSON.stringify(version)
      }
    })
  ]
};


