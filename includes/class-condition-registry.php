<?php
/** 条件 ID と WordPress 判定 API の対応。
 *
 * @package ODConditionalBlocks
 */

namespace Olein\ODConditionalBlocks;

/** MVP の内部条件レジストリ。 */
final class Condition_Registry {
	/**
	 * 登録情報を構築する。
	 *
	 * @return array 安定 ID と API。 */
	public static function all() {
		return array(
			'request/front_page'           => 'is_front_page',
			'request/posts_page'           => 'is_home',
			'request/single_post'          => 'is_single',
			'request/post_category'        => 'is_object_in_term',
			'request/page'                 => 'is_page',
			'request/singular'             => 'is_singular',
			'request/category_archive'     => 'is_category',
			'request/tag_archive'          => 'is_tag',
			'request/taxonomy_archive'     => 'is_tax',
			'request/post_type_archive'    => 'is_post_type_archive',
			'request/date_archive'         => 'is_date',
			'request/author_archive'       => 'is_author',
			'request/any_archive'          => 'is_archive',
			'request/search'               => 'is_search',
			'request/not_found'            => 'is_404',
			'request/category_term'        => 'is_category',
			'request/tag_term'             => 'is_tag',
			'request/taxonomy_term'        => 'is_tax',
			'request/post_type_archive_of' => 'is_post_type_archive',
		);
	}
}
