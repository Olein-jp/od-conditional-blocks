import { __ } from '@wordpress/i18n';
export const conditionOptions = () =>
	[
		[ '', __( 'Not configured', 'od-conditional-blocks' ) ],
		[ 'front_page', __( 'Front page', 'od-conditional-blocks' ) ],
		[ 'posts_page', __( 'Posts page', 'od-conditional-blocks' ) ],
		[ 'single_post', __( 'Single post', 'od-conditional-blocks' ) ],
		[ 'page', __( 'Page', 'od-conditional-blocks' ) ],
		[ 'singular', __( 'Any singular page', 'od-conditional-blocks' ) ],
		[
			'category_archive',
			__( 'Category archive', 'od-conditional-blocks' ),
		],
		[ 'tag_archive', __( 'Tag archive', 'od-conditional-blocks' ) ],
		[
			'taxonomy_archive',
			__( 'Custom taxonomy archive', 'od-conditional-blocks' ),
		],
		[
			'post_type_archive',
			__( 'Post type archive', 'od-conditional-blocks' ),
		],
		[ 'date_archive', __( 'Date archive', 'od-conditional-blocks' ) ],
		[ 'author_archive', __( 'Author archive', 'od-conditional-blocks' ) ],
		[ 'any_archive', __( 'Any archive', 'od-conditional-blocks' ) ],
		[ 'search', __( 'Search results', 'od-conditional-blocks' ) ],
		[ 'not_found', __( '404 page', 'od-conditional-blocks' ) ],
		[
			'category_term',
			__( 'Specific category archive', 'od-conditional-blocks' ),
		],
		[ 'tag_term', __( 'Specific tag archive', 'od-conditional-blocks' ) ],
		[
			'taxonomy_term',
			__(
				'Specific custom taxonomy term archive',
				'od-conditional-blocks'
			),
		],
		[
			'post_type_archive_of',
			__( 'Specific post type archive', 'od-conditional-blocks' ),
		],
	].map( ( [ value, label ] ) => ( {
		value: value ? `request/${ value }` : '',
		label,
	} ) );
export const needsValue = ( type ) => /(?:_term|_archive_of)$/.test( type );
export function makeRule( id, type = '' ) {
	let value = true;
	if ( needsValue( type ) ) {
		value = [];
	}
	if ( type === 'request/taxonomy_term' ) {
		value = { taxonomy: '', terms: [] };
	}
	return {
		id,
		type,
		operator: needsValue( type ) ? 'in' : 'is',
		value,
		negate: false,
	};
}
export function validValues( values ) {
	return (
		Array.isArray( values ) &&
		values.length > 0 &&
		values.length <= 100 &&
		values.every(
			( value ) =>
				( Number.isInteger( value ) && value > 0 ) ||
				( typeof value === 'string' &&
					value.length > 0 &&
					value.length <= 200 )
		)
	);
}
export function validRule( rule ) {
	if (
		! rule ||
		typeof rule !== 'object' ||
		typeof rule.id !== 'string' ||
		! rule.id.length ||
		rule.id.length > 100 ||
		! conditionOptions().some(
			( option ) => option.value && option.value === rule.type
		) ||
		( rule.negate !== undefined && typeof rule.negate !== 'boolean' )
	) {
		return false;
	}
	if ( ! needsValue( rule.type ) ) {
		return rule.operator === 'is' && rule.value === true;
	}
	if ( rule.operator !== 'in' ) {
		return false;
	}
	if ( rule.type === 'request/taxonomy_term' ) {
		return (
			typeof rule.value?.taxonomy === 'string' &&
			!! rule.value.taxonomy &&
			! [ 'category', 'post_tag' ].includes( rule.value.taxonomy ) &&
			validValues( rule.value.terms )
		);
	}
	return (
		validValues( rule.value ) &&
		( rule.type !== 'request/post_type_archive_of' ||
			rule.value.every( ( value ) => typeof value === 'string' ) )
	);
}
export function validGroup( group ) {
	if (
		! group ||
		! [ 'AND', 'OR' ].includes( group.operator ) ||
		! Array.isArray( group.conditions ) ||
		! group.conditions.length ||
		group.conditions.length > 20 ||
		! group.conditions.every( validRule )
	) {
		return false;
	}
	return (
		new Set( group.conditions.map( ( rule ) => rule.id ) ).size ===
		group.conditions.length
	);
}
