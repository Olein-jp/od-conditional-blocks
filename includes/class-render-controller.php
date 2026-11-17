<?php
/** 子の実行前に分岐を短絡する。
 *
 * @package ODConditionalBlocks
 */

namespace Olein\ODConditionalBlocks;

/** WordPress の通常レンダリングを維持する。 */
final class Render_Controller {
	/**
	 * 保存データを検査・処理する。
	 *
	 * @param array $block パース済み親.
	 * @return bool
	 */
	public static function structure( $block ) {
		$names = array_column( $block['innerBlocks'] ?? array(), 'blockName' );
		if ( array( 'od-conditional/if' ) !== $names && array( 'od-conditional/if', 'od-conditional/else' ) !== $names ) {
			return false;
		}
		foreach ( $block['innerContent'] ?? array() as $fragment ) {
			if ( null !== $fragment && '' !== trim( $fragment ) ) {
				return false;
			}
		}
		return true;
	}

	/**
	 * 保存データを検査・処理する。
	 *
	 * @param string|null    $pre 先行フィルター結果.
	 * @param array          $block パース済みブロック.
	 * @param \WP_Block|null $parent_block 直接親.
	 * @return string|null
	 */
	public static function filter( $pre, $block, $parent_block = null ) {
		if ( null !== $pre ) {
			return $pre;
		}
		if ( 'od-conditional/conditional' === $block['blockName'] ) {
			if ( ! self::structure( $block ) ) {
				return '';
			}
			$result = Condition_Evaluator::evaluate( $block['attrs'] );
			return null === $result || ( false === $result && count( $block['innerBlocks'] ) < 2 ) ? '' : null;
		}
		if ( ! in_array( $block['blockName'], array( 'od-conditional/if', 'od-conditional/else' ), true ) ) {
			return null;
		}
		if ( ! $parent_block || 'od-conditional/conditional' !== $parent_block->name || ! self::structure( $parent_block->parsed_block ) ) {
			return '';
		}
		$result = Condition_Evaluator::evaluate( $parent_block->parsed_block['attrs'] );
		if ( null === $result ) {
			return '';
		}
		return ( $result ? 'od-conditional/if' : 'od-conditional/else' ) === $block['blockName'] ? null : '';
	}
}
