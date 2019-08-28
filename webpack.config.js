

const path = require("path");

const config = {
	devtool: "source-map",
	entry: "./client/src/extension.ts",
	externals: {
		vscode: "commonjs vscode",
	},
	module: {
		rules: [{
			exclude: /node_modules/,
			test: /\.ts$/,
			loader: "ts-loader",
		}
	],
		
	},
	output: {
		filename: "extension.js",
		libraryTarget: "commonjs2",
		path: path.resolve(__dirname, "dist"),
		devtoolModuleFilenameTemplate: "../[resource-path]"
	},
	resolve: {
		extensions: [".ts", ".js"],
	},
	target: "node",
};


module.exports = config;