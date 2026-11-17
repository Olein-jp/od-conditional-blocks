<?php
/** 実 WordPress コアでの早期中断・保存フォールバックの検証。 */
$counts = array( 'if' => 0, 'else' => 0 );
$parents = array();
register_block_type( 'od-spike/probe', array( 'render_callback' => function ( $attrs ) use ( &$counts ) { ++$counts[ $attrs['branch'] ]; return $attrs['branch']; } ) );
foreach ( array( 'conditional', 'if', 'else' ) as $name ) {
 register_block_type( 'od-spike/' . $name, array() );
}
$filter = function ( $pre, $block, $parent ) use ( &$parents ) {
 if ( in_array( $block['blockName'], array( 'od-spike/if', 'od-spike/else' ), true ) ) {
  $parents[] = $parent ? $parent->name : null;
  if ( 'od-spike/else' === $block['blockName'] ) { return ''; }
 }
 return $pre;
};
$content = '<!-- wp:od-spike/conditional --><!-- wp:od-spike/if --><!-- wp:od-spike/probe {"branch":"if"} /--><!-- /wp:od-spike/if --><!-- wp:od-spike/else --><!-- wp:od-spike/probe {"branch":"else"} /--><!-- /wp:od-spike/else --><!-- /wp:od-spike/conditional -->';
add_filter( 'pre_render_block', $filter, 10, 3 );
$output = do_blocks( $content );
if ( 'if' !== $output || array( 'if' => 1, 'else' => 0 ) !== $counts || array( 'od-spike/conditional', 'od-spike/conditional' ) !== $parents ) { throw new Exception( '早期中断に失敗' ); }
remove_filter( 'pre_render_block', $filter );
foreach ( array( 'conditional', 'if', 'else' ) as $name ) { unregister_block_type( 'od-spike/' . $name ); }
$saved = '<!-- wp:od-spike/conditional --><!-- wp:od-spike/if --><p>IF retained</p><!-- /wp:od-spike/if --><!-- wp:od-spike/else --><p>ELSE retained</p><!-- /wp:od-spike/else --><!-- /wp:od-spike/conditional -->';
$fallback = do_blocks( $saved );
if ( '<p>IF retained</p><p>ELSE retained</p>' !== $fallback || serialize_blocks( parse_blocks( $saved ) ) !== $saved ) { throw new Exception( '保存形式に不整合' ); }
echo wp_json_encode( array( 'wordpress' => get_bloginfo( 'version' ), 'counts' => $counts, 'parents' => $parents, 'output' => $output, 'fallback' => $fallback, 'roundtrip' => true ), JSON_PRETTY_PRINT );
