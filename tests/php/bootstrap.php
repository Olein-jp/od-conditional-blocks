<?php
/** WordPress コアのテスト環境を使用。 */
define( 'WP_TESTS_PHPUNIT_POLYFILLS_PATH', dirname( __DIR__, 2 ) . '/vendor/yoast/phpunit-polyfills' );
require_once '/wordpress-phpunit/includes/functions.php';
tests_add_filter( 'muplugins_loaded', function () {
 require dirname( __DIR__, 2 ) . '/od-conditional-blocks.php';
} );
require '/wordpress-phpunit/includes/bootstrap.php';
