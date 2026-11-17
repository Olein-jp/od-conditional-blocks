import { describe, test, expect } from 'vitest';
import { conditionOptions, makeRule, validGroup } from '../../src/conditions';
describe( '保存条件の UX 検証', () => {
	test( 'MVP 18 種だけを表示する', () => {
		expect( conditionOptions() ).toHaveLength( 19 );
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
