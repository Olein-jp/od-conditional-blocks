import { describe, test, expect } from 'vitest';
import { conditionOptions, makeRule, validGroup } from '../../src/conditions';
describe( '保存条件の UX 検証', () => {
	test( '20 種の条件と未設定を表示する', () => {
		expect( conditionOptions() ).toHaveLength( 21 );
	} );
	test( '未設定は公開不可', () => {
		expect(
			validGroup( { operator: 'AND', conditions: [ makeRule( 'one' ) ] } )
		).toBe( false );
	} );
	test( '通常条件と NOT を保持', () => {
		const rule = makeRule( 'one', 'request/category_archive' );
		expect(
			validGroup( {
				operator: 'OR',
				conditions: [ { ...rule, negate: true } ],
			} )
		).toBe( true );
	} );
	test( '比較対象は明示的に必要', () => {
		const rule = makeRule( 'one', 'request/taxonomy_term' );
		expect( validGroup( { operator: 'AND', conditions: [ rule ] } ) ).toBe(
			false
		);
		expect(
			validGroup( {
				operator: 'AND',
				conditions: [
					{ ...rule, value: { taxonomy: 'genre', terms: [ 3 ] } },
				],
			} )
		).toBe( true );
	} );
	test( '投稿カテゴリーは対象が必要で NOT に対応する', () => {
		const rule = makeRule( 'category', 'request/post_category' );
		expect( rule.operator ).toBe( 'in' );
		expect( validGroup( { operator: 'AND', conditions: [ rule ] } ) ).toBe(
			false
		);
		for ( const value of [ [ 3 ], [ 'news' ], [ 3, 4 ] ] ) {
			expect(
				validGroup( {
					operator: 'AND',
					conditions: [ { ...rule, value, negate: true } ],
				} )
			).toBe( true );
		}
		for ( const value of [ [], true, [ 0 ], [ '' ] ] ) {
			expect(
				validGroup( {
					operator: 'AND',
					conditions: [ { ...rule, value } ],
				} )
			).toBe( false );
		}
	} );
	test( '特定の投稿・固定ページは正整数 ID のみを受け付ける', () => {
		const rule = makeRule( 'target', 'request/specific_singular' );
		expect( rule.operator ).toBe( 'in' );
		for ( const value of [
			[],
			[ '123' ],
			[ 'contact' ],
			[ 0 ],
			[ -1 ],
			[ 1.5 ],
			true,
		] ) {
			expect(
				validGroup( {
					operator: 'AND',
					conditions: [ { ...rule, value } ],
				} )
			).toBe( false );
		}
		expect(
			validGroup( {
				operator: 'OR',
				conditions: [ { ...rule, value: [ 3, 4 ], negate: true } ],
			} )
		).toBe( true );
	} );
	test( '不正演算子、未知条件、空、重複 ID、上限超過を拒否', () => {
		const rule = makeRule( 'one', 'request/search' );
		for ( const group of [
			{ operator: 'XOR', conditions: [ rule ] },
			{ operator: 'AND', conditions: [] },
			{ operator: 'AND', conditions: [ rule, rule ] },
			{ operator: 'OR', conditions: [ { ...rule, type: 'unknown' } ] },
			{
				operator: 'AND',
				conditions: Array.from( { length: 21 }, ( _, i ) => ( {
					...rule,
					id: String( i ),
				} ) ),
			},
		] ) {
			expect( validGroup( group ) ).toBe( false );
		}
	} );
} );
