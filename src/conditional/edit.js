import {
	BlockControls,
	InspectorControls,
	useBlockProps,
	useInnerBlocksProps,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { createBlock } from '@wordpress/blocks';
import { useSelect, useDispatch } from '@wordpress/data';
import { useState, useEffect } from '@wordpress/element';
import {
	PanelBody,
	ToggleControl,
	TextControl,
	ToolbarGroup,
	ToolbarButton,
	Notice,
	Modal,
	Button,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import ConditionEditor from '../condition-editor';
import { validGroup } from '../conditions';
import './editor.scss';

const TEMPLATE = [ [ 'od-conditional/if' ] ];
export default function Edit( { clientId, attributes, setAttributes } ) {
	const [ confirmRemove, setConfirmRemove ] = useState( false );
	const [ mode, setMode ] = useState( 'if' );
	const { branches, selectedBranch } = useSelect(
		( select ) => {
			const store = select( blockEditorStore );
			const children = store.getBlocks( clientId );
			const selected = store.getSelectedBlockClientId();
			return {
				branches: children,
				selectedBranch: children
					.find(
						( child ) =>
							child.clientId === selected ||
							store
								.getBlockParents( selected || '' )
								.includes( child.clientId )
					)
					?.name.split( '/' )[ 1 ],
			};
		},
		[ clientId ]
	);
	const { replaceInnerBlocks, selectBlock } = useDispatch( blockEditorStore );
	useEffect( () => {
		if ( selectedBranch ) {
			setMode( ( current ) =>
				current === 'both' ? current : selectedBranch
			);
		}
	}, [ selectedBranch ] );
	const hasElse = branches.some( ( b ) => b.name === 'od-conditional/else' );
	const validStructure =
		branches.length >= 1 &&
		branches.length <= 2 &&
		branches[ 0 ]?.name === 'od-conditional/if' &&
		( branches.length === 1 ||
			branches[ 1 ]?.name === 'od-conditional/else' );
	const props = useInnerBlocksProps(
		useBlockProps( { className: `od-conditional od-mode-${ mode }` } ),
		{
			allowedBlocks: [ 'od-conditional/if', 'od-conditional/else' ],
			template: TEMPLATE,
			templateLock: 'insert',
			renderAppender: false,
		}
	);
	const changeMode = ( next ) => {
		selectBlock( clientId );
		setMode( next );
	};
	const addElse = () => {
		if ( hasElse || ! validStructure ) {
			return;
		}
		replaceInnerBlocks(
			clientId,
			[ ...branches, createBlock( 'od-conditional/else' ) ],
			false
		);
		changeMode( 'else' );
	};
	return (
		<>
			{ confirmRemove && (
				<Modal
					title={ __(
						'Remove ELSE and its content?',
						'od-conditional-blocks'
					) }
					onRequestClose={ () => setConfirmRemove( false ) }
				>
					<p>
						{ __(
							'This deletes all content in ELSE. You can undo this change.',
							'od-conditional-blocks'
						) }
					</p>
					<Button
						variant="secondary"
						onClick={ () => setConfirmRemove( false ) }
					>
						{ __( 'Cancel', 'od-conditional-blocks' ) }
					</Button>
					<Button
						variant="primary"
						isDestructive
						onClick={ () => {
							replaceInnerBlocks(
								clientId,
								branches.filter(
									( b ) => b.name !== 'od-conditional/else'
								),
								false
							);
							changeMode( 'if' );
							setConfirmRemove( false );
						} }
					>
						{ __( 'Remove ELSE', 'od-conditional-blocks' ) }
					</Button>
				</Modal>
			) }

			<InspectorControls>
				<PanelBody
					title={ __(
						'Display conditions',
						'od-conditional-blocks'
					) }
				>
					<ToggleControl
						label={ __(
							'Enable conditions',
							'od-conditional-blocks'
						) }
						checked={ attributes.enabled }
						onChange={ ( enabled ) => setAttributes( { enabled } ) }
						help={ __(
							'When disabled, IF is displayed. Invalid structure always produces no output.',
							'od-conditional-blocks'
						) }
					/>
					<TextControl
						label={ __( 'Admin label', 'od-conditional-blocks' ) }
						value={ attributes.label }
						onChange={ ( label ) => setAttributes( { label } ) }
					/>
					<ConditionEditor
						group={ attributes.conditionGroup }
						onChange={ ( conditionGroup ) =>
							setAttributes( { conditionGroup } )
						}
					/>
					{ ! hasElse && (
						<p className="components-base-control__help">
							{ __(
								'No ELSE branch. A false condition produces no output.',
								'od-conditional-blocks'
							) }
						</p>
					) }
					{ attributes.enabled &&
						( attributes.schemaVersion !== 1 ||
							! validGroup( attributes.conditionGroup ) ) && (
							<Notice status="warning" isDismissible={ false }>
								{ __(
									'Conditions are missing or invalid. Neither branch will appear on the public site.',
									'od-conditional-blocks'
								) }
							</Notice>
						) }
				</PanelBody>
			</InspectorControls>
			<BlockControls>
				<ToolbarGroup
					label={ __( 'Edit branch', 'od-conditional-blocks' ) }
				>
					<ToolbarButton
						isPressed={ mode === 'if' }
						onClick={ () => changeMode( 'if' ) }
					>
						IF
					</ToolbarButton>
					<ToolbarButton
						disabled={ ! hasElse }
						isPressed={ mode === 'else' }
						onClick={ () => changeMode( 'else' ) }
					>
						ELSE
					</ToolbarButton>
					<ToolbarButton
						isPressed={ mode === 'both' }
						onClick={ () => changeMode( 'both' ) }
					>
						{ __( 'Both', 'od-conditional-blocks' ) }
					</ToolbarButton>
					{ hasElse && (
						<ToolbarButton
							onClick={ () => setConfirmRemove( true ) }
						>
							{ __( 'Remove ELSE', 'od-conditional-blocks' ) }
						</ToolbarButton>
					) }
					{ ! hasElse && (
						<ToolbarButton onClick={ addElse }>
							{ __( 'Add ELSE', 'od-conditional-blocks' ) }
						</ToolbarButton>
					) }
				</ToolbarGroup>
			</BlockControls>
			<div { ...props }>
				{ ! validStructure && branches.length > 0 && (
					<Notice status="error" isDismissible={ false }>
						{ __(
							'Invalid branch structure. Keep one IF followed by at most one ELSE. No public output will be produced.',
							'od-conditional-blocks'
						) }
					</Notice>
				) }
				{ props.children }
			</div>
		</>
	);
}
