/**
 * Webpack Configuration for Schillinger SDK Bundle
 *
 * Fallback bundler if esbuild is not available.
 */

const path = require('path');

module.exports = {
  mode: 'production',
  entry: './src/sdk-bundle.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'schillinger-sdk.js',
    library: {
      name: 'SchillingerSDK',
      type: 'iife'
    }
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  optimization: {
    minimize: true
  },
  devtool: false
};
