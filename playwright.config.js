const { defineConfig } = require( '@playwright/test' );
module.exports = defineConfig( {
	testDir: './tests/e2e',
	timeout: 60000,
	workers: 1,
	use: {
		baseURL: process.env.WP_BASE_URL || 'http://localhost:8897',
		headless: true,
		actionTimeout: 10000,
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
	},
	reporter: [ [ 'list' ] ],
} );
