import { useState, useMemo } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { store as coreStore } from '@wordpress/core-data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import {
	Button,
	SelectControl,
	ToggleControl,
	Notice,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import TargetTokenField from './target-token-field';
import SingularPicker from './singular-picker';
import { decodeEntities } from '@wordpress/html-entities';
import { conditionOptions, makeRule, needsValue } from './conditions';

function ValuePicker( { rule, update } ) {
	const [ search, setSearch ] = useState( '' );
	const postCategory = rule.type === 'request/post_category';
	const custom = rule.type === 'request/taxonomy_term';
	const postType = rule.type === 'request/post_type_archive_of';
	let taxonomy =
		rule.type === 'request/category_term' || postCategory
			? 'category'
			: 'post_tag';
	if ( custom ) {
		taxonomy = rule.value?.taxonomy;
	}
	const values = useMemo( () => {
		if ( custom ) {
			return rule.value?.terms || [];
		}
		return Array.isArray( rule.value ) ? rule.value : [];
	}, [ custom, rule.value ] );
	const { taxonomies, postTypes, terms, selected, error, publicPostTypes } =
		useSelect(
			( select ) => {
				const core = select( coreStore );
				return {
					publicPostTypes:
						select( blockEditorStore ).getSettings()
							.odConditionalPublicPostTypes || [],
					taxonomies: custom
						? core.getTaxonomies( {
								per_page: -1,
								context: 'edit',
							} )
						: [],
					postTypes: postType
						? core.getPostTypes( { per_page: -1, context: 'edit' } )
						: [],
					terms:
						! postType && taxonomy
							? core.getEntityRecords( 'taxonomy', taxonomy, {
									per_page: 20,
									search,
									context: 'view',
								} )
							: [],
					selected:
						! postType &&
						taxonomy &&
						values.length &&
						values.every( Number.isInteger )
							? core.getEntityRecords( 'taxonomy', taxonomy, {
									include: values,
									per_page: 100,
									context: 'view',
								} )
							: [],
					error:
						! postType && taxonomy
							? core.hasFinishedResolution( 'getEntityRecords', [
									'taxonomy',
									taxonomy,
									{ per_page: 20, search, context: 'view' },
								] ) &&
								! core.getEntityRecords( 'taxonomy', taxonomy, {
									per_page: 20,
									search,
									context: 'view',
								} )
							: null,
				};
			},
			[ taxonomy, postType, custom, search, values ]
		);
	const items = postType
		? ( postTypes || [] )
				.filter(
					( p ) => publicPostTypes.includes( p.slug ) && p.has_archive
				)
				.map( ( p ) => ( { value: p.slug, label: p.name } ) )
		: ( terms || [] ).map( ( t ) => ( {
				value: String( t.id ),
				label: t.name,
			} ) );
	const setValues = ( next ) =>
		update( { value: custom ? { taxonomy, terms: next } : next } );
	return (
		<>
			{ custom && (
				<SelectControl
					label={ __( 'Taxonomy', 'od-conditional-blocks' ) }
					value={ taxonomy || '' }
					options={ [
						{
							value: '',
							label: __(
								'Select taxonomy',
								'od-conditional-blocks'
							),
						},
						...( taxonomies || [] )
							.filter(
								( t ) =>
									t.visibility?.public &&
									! [ 'category', 'post_tag' ].includes(
										t.slug
									)
							)
							.map( ( t ) => ( {
								value: t.slug,
								label: t.name,
							} ) ),
					] }
					onChange={ ( next ) =>
						update( { value: { taxonomy: next, terms: [] } } )
					}
				/>
			) }
			<TargetTokenField
				label={
					postCategory
						? __( 'Add category', 'od-conditional-blocks' )
						: __( 'Add archive target', 'od-conditional-blocks' )
				}
				values={ values }
				items={ [
					...items,
					...( selected || [] ).map( ( term ) => ( {
						value: String( term.id ),
						label: term.name,
					} ) ),
				].map( ( item ) => ( {
					value: postType ? item.value : Number( item.value ),
					label: `${ decodeEntities( item.label ) } (${ item.value })`,
				} ) ) }
				onSearch={ setSearch }
				onChange={ setValues }
			/>
			{ error && (
				<Notice status="warning" isDismissible={ false }>
					{ postCategory
						? __(
								'Categories could not be loaded. Check your permissions and taxonomy REST support.',
								'od-conditional-blocks'
							)
						: __(
								'Archive targets could not be loaded. Check your permissions and taxonomy REST support.',
								'od-conditional-blocks'
							) }
				</Notice>
			) }
			{ values.length > 0 &&
				selected &&
				! postType &&
				values.every( Number.isInteger ) &&
				selected.length !== values.length && (
					<Notice status="warning" isDismissible={ false }>
						{ __(
							'One or more saved targets are unavailable. Remove or reselect them; the public site will produce no output.',
							'od-conditional-blocks'
						) }
					</Notice>
				) }

			<p>
				{ postCategory
					? __(
							'Matches any selected category assigned directly to the displayed post. NOT matches posts with none of them. Outside single post pages or with missing targets, neither branch is displayed.',
							'od-conditional-blocks'
						)
					: __(
							'Matches the requested archive, not terms assigned to a post in a loop. Missing or private targets produce no output.',
							'od-conditional-blocks'
						) }
			</p>
		</>
	);
}
export default function ConditionEditor( { group, onChange } ) {
	const rules = Array.isArray( group?.conditions )
		? group.conditions.filter(
				( rule ) => rule && typeof rule === 'object'
			)
		: [];
	const update = ( index, patch ) =>
		onChange( {
			...group,
			conditions: rules.map( ( rule, i ) =>
				i === index ? { ...rule, ...patch } : rule
			),
		} );
	return (
		<>
			{ rules.length > 1 && (
				<SelectControl
					label={ __( 'Match conditions', 'od-conditional-blocks' ) }
					value={ group.operator }
					options={ [
						{
							value: 'AND',
							label: __( 'All (AND)', 'od-conditional-blocks' ),
						},
						{
							value: 'OR',
							label: __( 'Any (OR)', 'od-conditional-blocks' ),
						},
					] }
					onChange={ ( operator ) =>
						onChange( { ...group, operator } )
					}
				/>
			) }
			{ rules.map( ( rule, index ) => (
				<div className="od-rule" key={ rule.id }>
					<SelectControl
						label={ __( 'Page type', 'od-conditional-blocks' ) }
						value={ rule.type }
						options={ conditionOptions() }
						onChange={ ( type ) =>
							update( index, makeRule( rule.id, type ) )
						}
					/>
					{ rule.type === 'request/specific_singular' ? (
						<SingularPicker
							key={ rule.type }
							rule={ rule }
							update={ ( patch ) => update( index, patch ) }
						/>
					) : (
						needsValue( rule.type ) && (
							<ValuePicker
								key={ rule.type }
								rule={ rule }
								update={ ( patch ) => update( index, patch ) }
							/>
						)
					) }
					<ToggleControl
						label={ __(
							'Invert condition (NOT)',
							'od-conditional-blocks'
						) }
						checked={ !! rule.negate }
						onChange={ ( negate ) => update( index, { negate } ) }
					/>
					<Button
						variant="tertiary"
						isDestructive
						onClick={ () =>
							onChange( {
								...group,
								conditions: rules.filter(
									( _, i ) => i !== index
								),
							} )
						}
					>
						{ __( 'Remove condition', 'od-conditional-blocks' ) }
					</Button>
				</div>
			) ) }
			<div style={ { paddingBlockStart: '16px' } }>
				<Button
					variant="secondary"
					disabled={ rules.length >= 20 }
					onClick={ () =>
						onChange( {
							operator: group?.operator || 'AND',
							conditions: [
								...rules,
								makeRule(
									`rule-${ Date.now() }-${ Math.random().toString( 36 ).slice( 2 ) }`
								),
							],
						} )
					}
				>
					{ __( 'Add condition', 'od-conditional-blocks' ) }
				</Button>
			</div>
		</>
	);
}
