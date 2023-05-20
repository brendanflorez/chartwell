const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './client/src/index.js',
  output: {
    path: path.resolve(__dirname, 'client', 'build'),
    filename: 'static/js/[name].[contenthash:8].js',
    publicPath: '/',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './client/public/index.html',
      inject: 'body',
    }),
  ],
  mode: 'development',
  devServer: {
    // Add these lines to disable caching
    headers: {
      'Cache-Control': 'no-store',
    },
  },
  resolve: {
    fallback: {
      'http2': require.resolve('http2-wrapper'),
      'os': require.resolve('os-browserify/browser'),
      'stream': require.resolve('stream-browserify'),
      'zlib': require.resolve('browserify-zlib'),
      'https': require.resolve('https-browserify'),
      'http': require.resolve('stream-http'),
      'url': require.resolve('url/'),
      'assert': require.resolve('assert/'),
      'buffer': require.resolve('buffer/'),
      'path': require.resolve('path-browserify'),
      
      
    },
  },
};
