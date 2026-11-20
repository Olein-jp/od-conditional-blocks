<?php
/** 実コア・DB・動的ブロックでの結合テスト。 */
use Olein\ODConditionalBlocks\Condition_Evaluator as Engine;
use Olein\ODConditionalBlocks\Condition_Registry as Registry;
use Olein\ODConditionalBlocks\Render_Controller as Renderer;

class OD_Conditional_Test extends WP_UnitTestCase {
 private $counts;
 private $category;
 private $tag;
 public function set_up() {
  parent::set_up();
  $this->counts = array( 'if' => 0, 'else' => 0 );
  $this->category = self::factory()->category->create();
  $this->tag = self::factory()->tag->create();
  register_block_type( 'od-test/probe', array( 'attributes' => array( 'branch' => array( 'type' => 'string' ) ), 'render_callback' => function ( $attrs ) { ++$this->counts[ $attrs['branch'] ]; return $attrs['branch']; } ) );
  $this->go_to( get_category_link( $this->category ) );
 }
 public function tear_down() {
  unregister_block_type( 'od-test/probe' );
  parent::tear_down();
 }
 private function rule( $type = 'request/category_archive', $negate = false ) {
  return array( 'id' => uniqid( 'rule-' ), 'type' => $type, 'operator' => 'is', 'value' => true, 'negate' => $negate );
 }
 private function attrs( $rules = null, $operator = 'AND' ) {
  return array( 'schemaVersion' => 1, 'enabled' => true, 'conditionGroup' => array( 'operator' => $operator, 'conditions' => $rules ?? array( $this->rule() ) ) );
 }
 private function markup( $attrs = null, $else = true, $if_content = null ) {
  return '<!-- wp:od-conditional/conditional ' . wp_json_encode( $attrs ?? $this->attrs() ) . ' --><!-- wp:od-conditional/if -->' . ( $if_content ?? '<!-- wp:od-test/probe {"branch":"if"} /-->' ) . '<!-- /wp:od-conditional/if -->' . ( $else ? '<!-- wp:od-conditional/else --><!-- wp:od-test/probe {"branch":"else"} /--><!-- /wp:od-conditional/else -->' : '' ) . '<!-- /wp:od-conditional/conditional -->';
 }
 public function test_early_abort_true_false_and_no_else() {
  $this->assertSame( 'if', do_blocks( $this->markup() ) );
  $this->assertSame( array( 'if' => 1, 'else' => 0 ), $this->counts );
  $this->counts = array( 'if' => 0, 'else' => 0 );
  $this->go_to( get_tag_link( $this->tag ) );
  $this->assertSame( 'else', do_blocks( $this->markup() ) );
  $this->assertSame( array( 'if' => 0, 'else' => 1 ), $this->counts );
  $this->counts = array( 'if' => 0, 'else' => 0 );
  $this->assertSame( '', do_blocks( $this->markup( null, false ) ) );
  $this->assertSame( array( 'if' => 0, 'else' => 0 ), $this->counts );
 }
 public function test_all_boolean_combinations() {
  foreach ( array( 'AND', 'OR' ) as $operator ) {
   foreach ( array( false, true ) as $left ) {
    foreach ( array( false, true ) as $right ) {
     $attrs = $this->attrs( array( $this->rule( 'request/category_archive', ! $left ), $this->rule( 'request/category_archive', ! $right ) ), $operator );
     $this->assertSame( 'AND' === $operator ? ( $left && $right ) : ( $left || $right ), Engine::evaluate( $attrs ) );
    }
   }
  }
 }
 public function test_invalid_never_renders_either_branch() {
  $bad = array();
  $bad[] = $this->attrs( array() );
  $bad[] = $this->attrs( array( $this->rule( 'unknown', true ) ) );
  $bad[] = $this->attrs( array( $this->rule(), $this->rule( 'unknown' ) ), 'OR' );
  $attrs = $this->attrs(); $attrs['schemaVersion'] = 99; $bad[] = $attrs;
  $attrs = $this->attrs(); $attrs['enabled'] = 'false'; $bad[] = $attrs;
  $attrs = $this->attrs(); $attrs['conditionGroup']['operator'] = 'XOR'; $bad[] = $attrs;
  $attrs = $this->attrs(); $attrs['conditionGroup']['conditions'][0]['value'] = array(); $bad[] = $attrs;
  $attrs = $this->attrs(); $attrs['conditionGroup']['conditions'] = array_fill( 0, 21, $this->rule() ); $bad[] = $attrs;
  $attrs = $this->attrs(); $attrs['conditionGroup']['conditions'][0]['negate'] = 'yes'; $bad[] = $attrs;
  foreach ( array( 'schemaVersion', 'enabled', 'label' ) as $key ) { $attrs = $this->attrs(); $attrs[$key] = null; $bad[] = $attrs; }
  $attrs = $this->attrs(); $attrs['conditionGroup']['conditions'][0]['negate'] = null; $bad[] = $attrs;
  foreach ( $bad as $attrs ) { $this->assertNull( Engine::evaluate( $attrs ) ); $this->assertSame( '', do_blocks( $this->markup( $attrs ) ) ); }
  $this->assertSame( array( 'if' => 0, 'else' => 0 ), $this->counts );
 }
 public function test_disabled_and_invalid_structure() {
  $attrs = $this->attrs( array() ); $attrs['enabled'] = false;
  $this->assertSame( 'if', do_blocks( $this->markup( $attrs ) ) );
  $this->counts = array( 'if' => 0, 'else' => 0 );
  $bad = str_replace( '<!-- /wp:od-conditional/conditional -->', '<!-- wp:od-conditional/if --><!-- wp:od-test/probe {"branch":"if"} /--><!-- /wp:od-conditional/if --><!-- /wp:od-conditional/conditional -->', $this->markup( $attrs ) );
  $this->assertSame( '', do_blocks( $bad ) );
  $this->assertSame( array( 'if' => 0, 'else' => 0 ), $this->counts );
  $this->assertSame( '', do_blocks( '<!-- wp:od-conditional/if --><!-- wp:od-test/probe {"branch":"if"} /--><!-- /wp:od-conditional/if -->' ) );
 }
 public function test_nested_and_direct_wp_block_render() {
  $this->assertSame( 'if', do_blocks( $this->markup( null, true, $this->markup() ) ) );
  $this->assertSame( array( 'if' => 1, 'else' => 0 ), $this->counts );
  $block = new WP_Block( parse_blocks( $this->markup() )[0] );
  $this->assertSame( 'if', $block->render() );
 }
 public function test_main_query_survives_secondary_loop() {
  global $wp_query;
  $main = $wp_query;
  $post = self::factory()->post->create();
  $wp_query = new WP_Query( array( 'p' => $post ) );
  $this->assertTrue( Engine::evaluate( $this->attrs() ) );
  $wp_query = $main;
 }
 public function test_uninitialized_query_is_unknown() {
  global $wp_the_query;
  $main = $wp_the_query; $wp_the_query = new WP_Query();
  $this->assertNull( Engine::evaluate( $this->attrs() ) );
  $wp_the_query = $main;
 }
 public function test_term_validation_and_deleted_terms() {
  $rule = $this->rule( 'request/category_term' ); $rule['operator'] = 'in'; $rule['value'] = array( $this->category );
  $this->assertTrue( Engine::evaluate( $this->attrs( array( $rule ) ) ) );
  wp_delete_term( $this->category, 'category' );
  $this->assertNull( Engine::evaluate( $this->attrs( array( $rule ) ) ) );
 }
 public function test_post_category_membership_and_branches() {
  $other = self::factory()->category->create();
  $post = self::factory()->post->create( array( 'post_category' => array( $this->category ) ) );
  $this->go_to( get_permalink( $post ) );
  $rule = $this->rule( 'request/post_category' ); $rule['operator'] = 'in';
  foreach ( array( array( $this->category ), array( get_term( $this->category )->slug ), array( $other, $this->category ) ) as $values ) {
   $rule['value'] = $values;
   $this->assertTrue( Engine::evaluate( $this->attrs( array( $rule ) ) ) );
   $this->assertSame( 'if', do_blocks( $this->markup( $this->attrs( array( $rule ) ) ) ) );
   $rule['negate'] = true;
   $this->assertFalse( Engine::evaluate( $this->attrs( array( $rule ) ) ) );
   $this->assertSame( 'else', do_blocks( $this->markup( $this->attrs( array( $rule ) ) ) ) );
   $rule['negate'] = false;
  }
  $rule['value'] = array( $other );
  $this->assertFalse( Engine::evaluate( $this->attrs( array( $rule ) ) ) );
  $rule['negate'] = true;
  $this->assertTrue( Engine::evaluate( $this->attrs( array( $rule ) ) ) );
  wp_delete_term( $other, 'category' );
  $this->assertNull( Engine::evaluate( $this->attrs( array( $rule ) ) ) );
  $this->assertSame( '', do_blocks( $this->markup( $this->attrs( array( $rule ) ) ) ) );
 }
 public function test_post_category_uses_main_post_and_direct_terms() {
  global $wp_query, $post;
  $child = self::factory()->category->create( array( 'parent' => $this->category ) );
  $main_post = self::factory()->post->create( array( 'post_category' => array( $child ) ) );
  $this->go_to( get_permalink( $main_post ) );
  $rule = $this->rule( 'request/post_category' ); $rule['operator'] = 'in'; $rule['value'] = array( $this->category );
  $this->assertFalse( Engine::evaluate( $this->attrs( array( $rule ) ) ) );
  $main_query = $wp_query; $main_global_post = $post;
  try {
   $secondary = self::factory()->post->create();
   $wp_query = new WP_Query( array( 'p' => $secondary ) ); $post = get_post( $secondary );
   $rule['value'] = array( $child );
   $this->assertTrue( Engine::evaluate( $this->attrs( array( $rule ) ) ) );
  } finally { $wp_query = $main_query; $post = $main_global_post; }
 }
 public function test_post_category_outside_single_post_is_unknown_even_with_not() {
  $page = self::factory()->post->create( array( 'post_type' => 'page' ) );
  foreach ( array( get_category_link( $this->category ), get_permalink( $page ), '/?s=category-test', '/?p=999999999' ) as $url ) {
   $this->go_to( $url );
   foreach ( array( false, true ) as $negate ) {
    $rule = $this->rule( 'request/post_category', $negate ); $rule['operator'] = 'in'; $rule['value'] = array( $this->category );
    $this->assertNull( Engine::evaluate( $this->attrs( array( $rule ) ) ) );
    $this->assertSame( '', do_blocks( $this->markup( $this->attrs( array( $rule ) ) ) ) );
    $this->assertNull( Engine::evaluate( $this->attrs( array( $this->rule( 'request/front_page', true ), $rule ), 'OR' ) ) );
   }
  }
 }
 public function test_specific_posts_and_pages_match_only_selected_ids() {
  $post = self::factory()->post->create();
  $page = self::factory()->post->create( array( 'post_type' => 'page' ) );
  $other = self::factory()->post->create();
  $rule = $this->rule( 'request/specific_singular' ); $rule['operator'] = 'in'; $rule['value'] = array( $post, $page );
  foreach ( array( $post, $page ) as $id ) {
   $this->go_to( get_permalink( $id ) );
   $this->assertTrue( Engine::evaluate( $this->attrs( array( $rule ) ) ) );
   $this->assertSame( 'if', do_blocks( $this->markup( $this->attrs( array( $rule ) ) ) ) );
   $rule['negate'] = true;
   $this->assertFalse( Engine::evaluate( $this->attrs( array( $rule ) ) ) );
   $rule['negate'] = false;
  }
  foreach ( array( get_permalink( $other ), get_category_link( $this->category ), '/?s=targets', '/?p=999999999' ) as $url ) {
   $this->go_to( $url );
   $this->assertFalse( Engine::evaluate( $this->attrs( array( $rule ) ) ) );
   $this->assertSame( 'else', do_blocks( $this->markup( $this->attrs( array( $rule ) ) ) ) );
   $rule['negate'] = true;
   $this->assertTrue( Engine::evaluate( $this->attrs( array( $rule ) ) ) );
   $rule['negate'] = false;
  }
  update_option( 'show_on_front', 'page' ); update_option( 'page_on_front', $page );
  $this->go_to( '/' );
  $this->assertTrue( Engine::evaluate( $this->attrs( array( $rule ) ) ) );
 }
 public function test_specific_targets_reject_invalid_and_unpublished_ids_even_with_not_or() {
  $post = self::factory()->post->create();
  $draft = self::factory()->post->create( array( 'post_status' => 'draft' ) );
  $private = self::factory()->post->create( array( 'post_status' => 'private' ) );
  $attachment = self::factory()->post->create( array( 'post_type' => 'attachment' ) );
  register_post_type( 'od_book', array( 'public' => true ) );
  $book = self::factory()->post->create( array( 'post_type' => 'od_book' ) );
  $this->go_to( get_permalink( $post ) );
  $rule = $this->rule( 'request/specific_singular', true ); $rule['operator'] = 'in';
  foreach ( array( array(), array( (string) $post ), array( 'contact' ), array( 0 ), array( $draft ), array( $private ), array( $attachment ), array( $book ), array( $post, 999999999 ) ) as $values ) {
   $rule['value'] = $values;
   $this->assertNull( Engine::evaluate( $this->attrs( array( $rule ) ) ) );
   $this->assertNull( Engine::evaluate( $this->attrs( array( $this->rule( 'request/singular' ), $rule ), 'OR' ) ) );
   $this->assertSame( '', do_blocks( $this->markup( $this->attrs( array( $rule ) ) ) ) );
  }
  unregister_post_type( 'od_book' );
  $rule['value'] = array( $post ); $rule['operator'] = 'is';
  $this->assertNull( Engine::evaluate( $this->attrs( array( $rule ) ) ) );
  $rule['operator'] = 'in'; wp_trash_post( $post );
  $this->assertNull( Engine::evaluate( $this->attrs( array( $rule ) ) ) );
 }
 public function test_specific_targets_use_main_query_after_title_change() {
  global $wp_query, $post;
  $page = self::factory()->post->create( array( 'post_type' => 'page', 'post_title' => 'Contact' ) );
  $this->go_to( get_permalink( $page ) );
  $rule = $this->rule( 'request/specific_singular' ); $rule['operator'] = 'in'; $rule['value'] = array( $page );
  wp_update_post( array( 'ID' => $page, 'post_title' => 'New Contact', 'post_name' => 'new-contact' ) );
  $main = $wp_query; $main_post = $post;
  try {
   $other = self::factory()->post->create();
   $wp_query = new WP_Query( array( 'p' => $other ) ); $post = get_post( $other );
   $this->assertTrue( Engine::evaluate( $this->attrs( array( $rule ) ) ) );
  } finally { $wp_query = $main; $post = $main_post; }
  wp_delete_post( $page, true );
  $this->assertNull( Engine::evaluate( $this->attrs( array( $rule ) ) ) );
 }
 public function test_custom_taxonomy_and_post_type() {
  register_taxonomy( 'od_genre', 'post', array( 'public' => true ) );
  $term = self::factory()->term->create( array( 'taxonomy' => 'od_genre' ) );
  $this->go_to( get_term_link( $term, 'od_genre' ) );
  $rule = $this->rule( 'request/taxonomy_term' ); $rule['operator'] = 'in'; $rule['value'] = array( 'taxonomy' => 'od_genre', 'terms' => array( $term ) );
  $this->assertTrue( Engine::evaluate( $this->attrs( array( $rule ) ) ) );
  unregister_taxonomy( 'od_genre' );
  $this->assertNull( Engine::evaluate( $this->attrs( array( $rule ) ) ) );
  register_post_type( 'od_book', array( 'public' => true, 'has_archive' => true ) );
  $this->go_to( '/?post_type=od_book' );
  $rule = $this->rule( 'request/post_type_archive_of' ); $rule['operator'] = 'in'; $rule['value'] = array( 'od_book' );
  $this->assertTrue( Engine::evaluate( $this->attrs( array( $rule ) ) ) );
  unregister_post_type( 'od_book' );
  $this->assertNull( Engine::evaluate( $this->attrs( array( $rule ) ) ) );
 }
 public function test_front_page_and_posts_page() {
  update_option( 'show_on_front', 'posts' ); $this->go_to( '/' );
  $this->assertTrue( Engine::evaluate( $this->attrs( array( $this->rule( 'request/front_page' ) ) ) ) );
  $this->assertTrue( Engine::evaluate( $this->attrs( array( $this->rule( 'request/posts_page' ) ) ) ) );
  $front = self::factory()->post->create( array( 'post_type' => 'page' ) );
  $blog = self::factory()->post->create( array( 'post_type' => 'page' ) );
  update_option( 'show_on_front', 'page' ); update_option( 'page_on_front', $front ); update_option( 'page_for_posts', $blog );
  $this->go_to( get_permalink( $front ) );
  $this->assertTrue( Engine::evaluate( $this->attrs( array( $this->rule( 'request/front_page' ) ) ) ) );
  $this->assertFalse( Engine::evaluate( $this->attrs( array( $this->rule( 'request/posts_page' ) ) ) ) );
  $this->go_to( get_permalink( $blog ) );
  $this->assertFalse( Engine::evaluate( $this->attrs( array( $this->rule( 'request/front_page' ) ) ) ) );
  $this->assertTrue( Engine::evaluate( $this->attrs( array( $this->rule( 'request/posts_page' ) ) ) ) );
 }
 public function test_every_registered_api_can_be_evaluated() {
  foreach ( Registry::all() as $type => $method ) {
   if ( in_array( $type, array( 'request/specific_singular', 'request/post_category', 'request/category_term', 'request/tag_term', 'request/taxonomy_term', 'request/post_type_archive_of' ), true ) ) { continue; }
   $this->assertIsBool( Engine::evaluate( $this->attrs( array( $this->rule( $type ) ) ) ) );
  }
 }
 public function test_editor_public_archive_candidates() {
  register_post_type( 'od_public', array( 'public' => true, 'has_archive' => 'od-books' ) );
  register_post_type( 'od_private', array( 'public' => false, 'publicly_queryable' => true, 'has_archive' => true ) );
  $settings = apply_filters( 'block_editor_settings_all', array(), null );
  $this->assertContains( 'od_public', $settings['odConditionalPublicPostTypes'] );
  $this->assertNotContains( 'od_private', $settings['odConditionalPublicPostTypes'] );
  unregister_post_type( 'od_public' );
  unregister_post_type( 'od_private' );
 }
 public function test_request_routes() {
  $author = self::factory()->user->create( array( 'role' => 'author' ) );
  $post = self::factory()->post->create( array( 'post_author' => $author, 'post_date' => '2026-01-15 12:00:00' ) );
  $page = self::factory()->post->create( array( 'post_type' => 'page' ) );
  $routes = array(
   array( get_permalink( $post ), 'request/single_post' ),
   array( get_permalink( $page ), 'request/page' ),
   array( get_permalink( $page ), 'request/singular' ),
   array( '/?s=OD-test-search', 'request/search' ),
   array( '/?p=999999999', 'request/not_found' ),
   array( '/?m=202601', 'request/date_archive' ),
   array( '/?author=' . $author, 'request/author_archive' ),
   array( get_tag_link( $this->tag ), 'request/tag_archive' ),
  );
  foreach ( $routes as $route ) {
   $this->go_to( $route[0] );
   $this->assertTrue( Engine::evaluate( $this->attrs( array( $this->rule( $route[1] ) ) ) ), $route[1] );
  }
 }
 public function test_prior_filter_is_preserved() {
  $filter = function ( $pre, $block ) { return 'od-conditional/conditional' === $block['blockName'] ? 'external' : $pre; };
  remove_filter( 'pre_render_block', array( Renderer::class, 'filter' ), 10 );
  add_filter( 'pre_render_block', $filter, 10, 2 );
  add_filter( 'pre_render_block', array( Renderer::class, 'filter' ), 10, 3 );
  $this->assertSame( 'external', do_blocks( $this->markup() ) );
  remove_filter( 'pre_render_block', $filter, 10 );
 }
 public function test_pattern_template_part_and_query_loop() {
  register_block_pattern( 'od-test/conditional', array( 'title' => 'test', 'content' => $this->markup() ) );
  $this->assertSame( 'if', do_blocks( serialize_blocks( resolve_pattern_blocks( parse_blocks( '<!-- wp:pattern {"slug":"od-test/conditional"} /-->' ) ) ) ) );
  unregister_block_pattern( 'od-test/conditional' );
  $part = self::factory()->post->create( array( 'post_type' => 'wp_template_part', 'post_name' => 'od-test', 'post_status' => 'publish', 'post_content' => $this->markup(), 'tax_input' => array( 'wp_theme' => array( get_stylesheet() ) ) ) );
  wp_set_object_terms( $part, get_stylesheet(), 'wp_theme' );
  $this->assertStringContainsString( 'if', do_blocks( '<!-- wp:template-part {"slug":"od-test","tagName":"div"} /-->' ) );
  self::factory()->post->create( array( 'post_category' => array( $this->category ) ) );
  $this->go_to( get_category_link( $this->category ) );
  $html = do_blocks( '<!-- wp:query {"query":{"inherit":true}} --><!-- wp:post-template -->' . $this->markup() . '<!-- /wp:post-template --><!-- /wp:query -->' );
  $this->assertStringContainsString( 'if', $html );
  $this->assertStringNotContainsString( 'else', $html );
 }
 public function test_rest_preview_is_closed() {
  $request = new WP_REST_Request( 'GET', '/wp/v2/block-renderer/od-conditional/conditional' );
  $request->set_param( 'attributes', array() );
  $request->set_param( 'context', 'edit' );
  wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );
  $response = rest_do_request( $request );
  // 静的保存ブロックに block-renderer は適用されない。編集は JS で行う。
  $this->assertSame( 404, $response->get_status() );
  $this->assertSame( 'block_invalid', $response->get_data()['code'] );
 }
 public function test_deactivation_fallback_and_roundtrip() {
  $markup = '<!-- wp:od-conditional/conditional --><!-- wp:od-conditional/if --><p>IF</p><!-- /wp:od-conditional/if --><!-- wp:od-conditional/else --><p>ELSE</p><!-- /wp:od-conditional/else --><!-- /wp:od-conditional/conditional -->';
  $this->assertSame( $markup, serialize_blocks( parse_blocks( $markup ) ) );
  remove_filter( 'pre_render_block', array( Renderer::class, 'filter' ), 10 );
  $this->assertSame( '<p>IF</p><p>ELSE</p>', do_blocks( $markup ) );
  add_filter( 'pre_render_block', array( Renderer::class, 'filter' ), 10, 3 );
 }
}
