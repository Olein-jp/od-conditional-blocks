import { FormTokenField } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export default function TargetTokenField( {
	label,
	values,
	items,
	onSearch,
	onChange,
} ) {
	const byValue = new Map(
		items.map( ( item ) => [ item.value, item.label ] )
	);
	const selected = values.map( ( value ) => ( {
		value,
		label: byValue.get( value ) || String( value ),
	} ) );
	const byLabel = new Map(
		[ ...items, ...selected ].map( ( item ) => [ item.label, item.value ] )
	);
	return (
		<FormTokenField
			label={ label }
			value={ selected.map( ( item ) => item.label ) }
			suggestions={ [
				...new Set(
					items
						.filter( ( item ) => ! values.includes( item.value ) )
						.map( ( item ) => item.label )
				),
			] }
			onInputChange={ onSearch }
			onChange={ ( tokens ) =>
				onChange(
					[
						...new Set(
							tokens
								.map( ( token ) =>
									byLabel.get(
										typeof token === 'string'
											? token
											: token.value
									)
								)
								.filter( ( value ) => value !== undefined )
						),
					].slice( 0, 100 )
				)
			}
			__experimentalValidateInput={ ( token ) => byLabel.has( token ) }
			maxLength={ 100 }
			help={ __(
				'Choose existing targets from the suggestions. Remove a token to deselect it.',
				'od-conditional-blocks'
			) }
		/>
	);
}
