<?php
/** メインリクエストの三状態評価。
 *
 * @package ODConditionalBlocks
 */

namespace Olein\ODConditionalBlocks;

/** 判定不能を表す null は NOT の対象外。 */
final class Condition_Evaluator {
	/**
	 * 検証済み条件をメインリクエストに対して評価する。
	 *
	 * @param array $attrs 保存属性.
	 * @return bool|null
	 */
	public static function evaluate( $attrs ) {
		if ( ! Condition_Validator::metadata( $attrs ) ) {
			return null;
		}
		if ( false === ( $attrs['enabled'] ?? true ) ) {
			return true;
		}
		if ( ! Condition_Validator::valid( $attrs ) ) {
			return null;
		}
		global $wp_the_query;
		if ( is_admin() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) || ! $wp_the_query instanceof \WP_Query || empty( $wp_the_query->query_vars ) ) {
			return null;
		}
		$results = array();
		foreach ( $attrs['conditionGroup']['conditions'] as $rule ) {
			$method = Condition_Registry::all()[ $rule['type'] ];
			if ( 'request/post_category' === $rule['type'] ) {
				if ( ! $wp_the_query->is_singular( 'post' ) ) {
					return null;
				}
				$post_id = $wp_the_query->get_queried_object_id();
				if ( ! $post_id ) {
					return null;
				}
				$result = is_object_in_term( $post_id, 'category', $rule['value'] );
				if ( is_wp_error( $result ) ) {
					return null;
				}
			} elseif ( 'request/taxonomy_term' === $rule['type'] ) {
				$result = $wp_the_query->$method( $rule['value']['taxonomy'], $rule['value']['terms'] );
			} elseif ( 'in' === $rule['operator'] ) {
				$result = $wp_the_query->$method( $rule['value'] );
			} else {
				$result = $wp_the_query->$method();
			}
			$results[] = ! empty( $rule['negate'] ) ? ! $result : $result;
		}
		return 'AND' === $attrs['conditionGroup']['operator'] ? ! in_array( false, $results, true ) : in_array( true, $results, true );
	}
}
