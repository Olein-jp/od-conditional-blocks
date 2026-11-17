import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';
export function BranchEdit( { branch } ) {
	const props = useInnerBlocksProps(
		useBlockProps( { className: `od-branch od-branch-${ branch }` } ),
		{ templateLock: false }
	);
	return (
		<section { ...props }>
			<div className="od-branch-label" contentEditable={ false }>
				{ branch === 'if'
					? __( 'IF: matches conditions', 'od-conditional-blocks' )
					: __(
							'ELSE: does not match conditions',
							'od-conditional-blocks'
						) }
			</div>
			{ props.children }
		</section>
	);
}
