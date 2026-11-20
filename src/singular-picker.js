import { useState, useMemo } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { store as coreStore } from '@wordpress/core-data';
import { Notice } from '@wordpress/components';
import { decodeEntities } from '@wordpress/html-entities';
import { __, sprintf } from '@wordpress/i18n';
import TargetTokenField from './target-token-field';

export default function SingularPicker( { rule, update } ) {
	const [ search, setSearch ] = useState( '' );
	const values = useMemo(
		() => ( Array.isArray( rule.value ) ? rule.value : [] ),
		[ rule.value ]
	);
	const data = useSelect(
		( select ) => {
			const core = select( coreStore );
			const recordsByType = {};
			for ( const type of [ 'post', 'page' ] ) {
				const query = {
					per_page: 20,
					search,
					status: 'publish',
					context: 'view',
				};
				const savedQuery = {
					per_page: 100,
					include: values,
					status: 'publish',
					context: 'view',
				};
				recordsByType[ type ] = core.getEntityRecords(
					'postType',
					type,
					query
				);
				recordsByType[ `${ type }Saved` ] = values.length
					? core.getEntityRecords( 'postType', type, savedQuery )
					: null;
				recordsByType[ `${ type }Error` ] =
					( core.hasFinishedResolution( 'getEntityRecords', [
						'postType',
						type,
						query,
					] ) &&
						! recordsByType[ type ] ) ||
					( values.length > 0 &&
						core.hasFinishedResolution( 'getEntityRecords', [
							'postType',
							type,
							savedQuery,
						] ) &&
						! recordsByType[ `${ type }Saved` ] );
			}
			return recordsByType;
		},
		[ search, values ]
	);
	const results = [ 'post', 'page' ].map( ( type ) => ( {
		type,
		records: data[ type ],
		saved: values.length ? data[ `${ type }Saved` ] : [],
		error: data[ `${ type }Error` ],
	} ) );
	const items = results.flatMap( ( result ) =>
		[ ...( result.records || [] ), ...( result.saved || [] ) ].map(
			( post ) => ( {
				value: post.id,
				label: sprintf(
					/* translators: 1: post title, 2: post type label, 3: post ID. */
					__( '%1$s — %2$s (%3$d)', 'od-conditional-blocks' ),
					decodeEntities( post.title?.rendered || '' ) ||
						__( '(Untitled)', 'od-conditional-blocks' ),
					result.type === 'post'
						? __( 'Post', 'od-conditional-blocks' )
						: __( 'Page', 'od-conditional-blocks' ),
					post.id
				),
			} )
		)
	);
	const missing =
		values.length > 0 &&
		results.every( ( result ) => Array.isArray( result.saved ) ) &&
		values.some(
			( id ) =>
				! results.some( ( result ) =>
					result.saved.some( ( post ) => post.id === id )
				)
		);
	return (
		<>
			<TargetTokenField
				label={ __( 'Add post or page', 'od-conditional-blocks' ) }
				values={ values }
				items={ items }
				onSearch={ setSearch }
				onChange={ ( value ) => update( { value } ) }
			/>
			{ results.some( ( result ) => result.error ) && (
				<Notice status="warning" isDismissible={ false }>
					{ __(
						'Posts or pages could not be loaded. Check your permissions and REST API access.',
						'od-conditional-blocks'
					) }
				</Notice>
			) }
			{ missing && (
				<Notice status="warning" isDismissible={ false }>
					{ __(
						'One or more saved targets are unavailable. Remove or reselect them; the public site will produce no output.',
						'od-conditional-blocks'
					) }
				</Notice>
			) }
			<p>
				{ __(
					'Matches any selected published post or page. Other pages do not match. Missing or unpublished targets produce no output, even with NOT.',
					'od-conditional-blocks'
				) }
			</p>
		</>
	);
}
