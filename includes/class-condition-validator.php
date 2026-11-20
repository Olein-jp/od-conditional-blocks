<?php
/** 保存属性の厳密な検証。
 *
 * @package ODConditionalBlocks
 */

namespace Olein\ODConditionalBlocks;

/** 不明な設定を安全に拒否する。 */
final class Condition_Validator {
	/**
	 * 保存データを検査・処理する。
	 *
	 * @param array $attrs 保存属性.
	 * @return bool
	 */
	public static function valid( $attrs ) {
		if ( ! self::metadata( $attrs ) ) {
			return false;
		}
		$group = $attrs['conditionGroup'] ?? null;
		if ( ! is_array( $group ) || ! in_array( $group['operator'] ?? null, array( 'AND', 'OR' ), true ) || ! is_array( $group['conditions'] ?? null ) || count( $group['conditions'] ) < 1 || count( $group['conditions'] ) > 20 || array_values( $group['conditions'] ) !== $group['conditions'] ) {
			return false;
		}
		$ids = array();
		foreach ( $group['conditions'] as $rule ) {
			if ( ! self::rule( $rule ) || in_array( $rule['id'], $ids, true ) ) {
				return false;
			}
			$ids[] = $rule['id'];
		}
		return true;
	}

	/**
	 * 共通属性の型とスキーマ版を検査する。
	 *
	 * @param mixed $attrs 保存属性.
	 * @return bool
	 */
	public static function metadata( $attrs ) {
		if ( ! is_array( $attrs ) ) {
			return false;
		}
		$attrs = array_merge(
			array(
				'schemaVersion' => 1,
				'enabled'       => true,
				'label'         => '',
			),
			$attrs
		);
		return 1 === $attrs['schemaVersion'] && is_bool( $attrs['enabled'] ) && is_string( $attrs['label'] );
	}

	/**
	 * 保存データを検査・処理する。
	 *
	 * @param mixed $rule 条件.
	 * @return bool
	 */
	public static function rule( $rule ) {
		if ( ! is_array( $rule ) || ! is_string( $rule['id'] ?? null ) || '' === $rule['id'] || strlen( $rule['id'] ) > 100 || ! is_string( $rule['type'] ?? null ) || ! isset( Condition_Registry::all()[ $rule['type'] ] ) || ( array_key_exists( 'negate', $rule ) && ! is_bool( $rule['negate'] ) ) ) {
			return false;
		}
		$type = $rule['type'];
		if ( 'request/specific_singular' === $type ) {
			if ( 'in' !== ( $rule['operator'] ?? null ) || ! self::values( $rule['value'] ?? null ) ) {
				return false;
			}
			foreach ( $rule['value'] as $id ) {
				$post = is_int( $id ) ? get_post( $id ) : null;
				if ( ! $post || ! in_array( $post->post_type, array( 'post', 'page' ), true ) || 'publish' !== $post->post_status ) {
					return false;
				}
			}
			return true;
		}
		if ( 'request/post_type_archive_of' === $type ) {
			if ( 'in' !== ( $rule['operator'] ?? null ) || ! self::values( $rule['value'] ?? null ) ) {
				return false;
			}
			foreach ( $rule['value'] as $name ) {
				$object = is_string( $name ) ? get_post_type_object( $name ) : null;
				if ( ! $object || ! $object->public || ! $object->has_archive ) {
					return false;
				}
			}
			return true;
		}
		$taxonomy = array(
			'request/category_term' => 'category',
			'request/post_category' => 'category',
			'request/tag_term'      => 'post_tag',
		)[ $type ] ?? null;
		$values   = $rule['value'] ?? null;
		if ( 'request/taxonomy_term' === $type ) {
			if ( ! is_array( $values ) || ! is_string( $values['taxonomy'] ?? null ) ) {
				return false;
			}
			$taxonomy = $values['taxonomy'];
			$values   = $values['terms'] ?? null;
			if ( in_array( $taxonomy, array( 'category', 'post_tag' ), true ) ) {
				return false;
			}
		}
		if ( null !== $taxonomy ) {
			$object = get_taxonomy( $taxonomy );
			if ( 'in' !== ( $rule['operator'] ?? null ) || ! $object || ! $object->public || ! self::values( $values ) ) {
				return false;
			}
			foreach ( $values as $value ) {
				$term = is_int( $value ) ? get_term( $value, $taxonomy ) : get_term_by( 'slug', $value, $taxonomy );
				if ( ! $term || is_wp_error( $term ) ) {
					return false;
				}
			}
			return true;
		}
		return 'is' === ( $rule['operator'] ?? null ) && true === ( $rule['value'] ?? null );
	}

	/**
	 * 保存データを検査・処理する。
	 *
	 * @param mixed $values 比較値リスト.
	 * @return bool
	 */
	private static function values( $values ) {
		if ( ! is_array( $values ) || empty( $values ) || count( $values ) > 100 || array_values( $values ) !== $values ) {
			return false;
		}
		foreach ( $values as $value ) {
			if ( ! ( is_int( $value ) && $value > 0 ) && ! ( is_string( $value ) && '' !== $value && strlen( $value ) <= 200 ) ) {
				return false;
			}
		}
		return true;
	}
}
