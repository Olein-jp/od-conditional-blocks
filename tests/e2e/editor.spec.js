const { test, expect } = require( '@playwright/test' );

async function login( page ) {
	await page.goto( '/wp-login.php' );
	await page
		.locator( '#user_login' )
		.fill( process.env.WP_USERNAME || 'od-conditional-e2e' );
	await page
		.locator( '#user_pass' )
		.fill( process.env.WP_PASSWORD || 'password' );
	await page.locator( '#wp-submit' ).click();
}
async function dismiss( page ) {
	const close = page.getByRole( 'button', {
		name: /Close|閉じる/,
		exact: true,
	} );
	if ( await close.count() ) {
		await close.first().click();
	}
	const welcome = page.getByRole( 'button', { name: /Get started|始める/ } );
	if ( await welcome.count() ) {
		await welcome.first().click();
	}
}
async function ready( page ) {
	await page.waitForFunction(
		() =>
			!! window.wp?.blocks?.getBlockType(
				'od-conditional/conditional'
			) && !! window.wp?.data?.select( 'core/block-editor' )
	);
	await page
		.getByRole( 'dialog', { name: /Welcome/ } )
		.waitFor( { timeout: 1500 } )
		.catch( () => {} );
	await dismiss( page );
}
async function seed( page ) {
	return page.evaluate( () => {
		const block = wp.blocks.createBlock(
			'od-conditional/conditional',
			{
				enabled: false,
				conditionGroup: {
					operator: 'AND',
					conditions: [
						{
							id: 'rule-1',
							type: 'request/category_archive',
							operator: 'is',
							value: true,
							negate: false,
						},
					],
				},
			},
			[
				wp.blocks.createBlock( 'od-conditional/if', {}, [
					wp.blocks.createBlock( 'core/paragraph', {
						content: 'OD IF CONTENT',
					} ),
				] ),
			]
		);
		wp.data.dispatch( 'core/block-editor' ).insertBlocks( block );
		wp.data.dispatch( 'core/block-editor' ).selectBlock( block.clientId );
		return block.clientId;
	} );
}
async function selectParent( page, id ) {
	await page.evaluate(
		( clientId ) =>
			wp.data.dispatch( 'core/block-editor' ).selectBlock( clientId ),
		id
	);
}
async function branches( page, id ) {
	return page.evaluate(
		( clientId ) =>
			wp.data
				.select( 'core/block-editor' )
				.getBlocks( clientId )
				.map( ( b ) => b.name ),
		id
	);
}
const canvas = ( page ) => page.frameLocator( 'iframe[name="editor-canvas"]' );

test( '投稿: IF-only、ELSE、表示モード、リスト選択、保存再編集、Undo/Redo', async ( {
	page,
} ) => {
	await login( page );
	await page.goto( '/wp-admin/post-new.php' );
	await ready( page );
	const id = await seed( page );
	await expect
		.poll( () => branches( page, id ) )
		.toEqual( [ 'od-conditional/if' ] );
	await page.getByRole( 'button', { name: 'Add ELSE', exact: true } ).click();
	await expect
		.poll( () => branches( page, id ) )
		.toEqual( [ 'od-conditional/if', 'od-conditional/else' ] );
	await page.evaluate( ( clientId ) => {
		const branch = wp.data
			.select( 'core/block-editor' )
			.getBlocks( clientId )[ 1 ];
		wp.data.dispatch( 'core/block-editor' ).insertBlocks(
			wp.blocks.createBlock( 'core/paragraph', {
				content: 'OD ELSE CONTENT',
			} ),
			0,
			branch.clientId
		);
	}, id );
	await selectParent( page, id );
	await expect(
		canvas( page ).getByText( 'OD ELSE CONTENT', { exact: true } )
	).toBeVisible();
	await expect(
		canvas( page ).getByText( 'OD IF CONTENT', { exact: true } )
	).toBeHidden();
	await page.evaluate( async () => {
		wp.data
			.dispatch( 'core/editor' )
			.editPost( { title: 'OD conditional E2E' } );
		await wp.data.dispatch( 'core/editor' ).savePost();
	} );
	await expect
		.poll( () =>
			page.evaluate( () =>
				wp.data.select( 'core/editor' ).isEditedPostDirty()
			)
		)
		.toBe( false );
	const before = await page.evaluate( () =>
		wp.data.select( 'core/editor' ).getEditedPostContent()
	);
	for ( const name of [ 'IF', 'ELSE', 'Both', 'IF' ] ) {
		await page.getByRole( 'button', { name, exact: true } ).click();
		await expect
			.poll( () =>
				page.evaluate( () =>
					wp.data.select( 'core/editor' ).isEditedPostDirty()
				)
			)
			.toBe( false );
	}
	expect(
		await page.evaluate( () =>
			wp.data.select( 'core/editor' ).getEditedPostContent()
		)
	).toBe( before );
	await page.evaluate( ( clientId ) => {
		const branch = wp.data
			.select( 'core/block-editor' )
			.getBlocks( clientId )[ 1 ];
		wp.data
			.dispatch( 'core/block-editor' )
			.selectBlock( branch.innerBlocks[ 0 ].clientId );
	}, id );
	await expect(
		canvas( page ).getByText( 'OD ELSE CONTENT', { exact: true } )
	).toBeVisible();
	await selectParent( page, id );
	await page
		.getByRole( 'button', { name: 'Remove ELSE', exact: true } )
		.click();
	await page
		.getByRole( 'dialog' )
		.getByRole( 'button', { name: 'Remove ELSE', exact: true } )
		.click();
	await expect
		.poll( () => branches( page, id ) )
		.toEqual( [ 'od-conditional/if' ] );
	await page.evaluate( () => wp.data.dispatch( 'core/editor' ).undo() );
	await expect
		.poll( () => branches( page, id ) )
		.toEqual( [ 'od-conditional/if', 'od-conditional/else' ] );
	await page.evaluate( () => wp.data.dispatch( 'core/editor' ).redo() );
	await expect
		.poll( () => branches( page, id ) )
		.toEqual( [ 'od-conditional/if' ] );
	await page.evaluate( () => wp.data.dispatch( 'core/editor' ).undo() );
	await page.evaluate( async () => {
		await wp.data.dispatch( 'core/editor' ).savePost();
	} );
	const postId = await page.evaluate( () =>
		wp.data.select( 'core/editor' ).getCurrentPostId()
	);
	await page.goto( `/wp-admin/post.php?post=${ postId }&action=edit` );
	await ready( page );
	const blocks = await page.evaluate( () =>
		wp.data.select( 'core/block-editor' ).getBlocks()
	);
	expect( blocks[ 0 ].innerBlocks ).toHaveLength( 2 );
	expect( blocks[ 0 ].isValid ).toBe( true );
	expect( blocks[ 0 ].innerBlocks.every( ( b ) => b.isValid ) ).toBe( true );
	expect(
		blocks[ 0 ].innerBlocks[ 1 ].innerBlocks[ 0 ].attributes.content
	).toBe( 'OD ELSE CONTENT' );
} );

test( 'サイトエディター: 切替、dirty、保存再編集', async ( { page } ) => {
	await login( page );
	await page.goto(
		'/wp-admin/site-editor.php?postType=wp_template&postId=twentytwentyfive%2F%2Farchive&canvas=edit'
	);
	await ready( page );
	await canvas( page )
		.locator( '[data-type="core/template-part"]' )
		.first()
		.waitFor();
	const original = await page.evaluate( async () =>
		wp.apiFetch( {
			path: '/wp/v2/templates/twentytwentyfive//archive?context=edit',
		} )
	);
	try {
		const id = await seed( page );
		await page
			.getByRole( 'button', { name: 'Add ELSE', exact: true } )
			.click();
		await expect.poll( () => branches( page, id ) ).toHaveLength( 2 );
		await page.evaluate(
			async ( templateId ) =>
				wp.data
					.dispatch( 'core' )
					.saveEditedEntityRecord(
						'postType',
						'wp_template',
						templateId
					),
			original.id
		);
		await expect
			.poll( () =>
				page.evaluate(
					( templateId ) =>
						wp.data
							.select( 'core' )
							.hasEditsForEntityRecord(
								'postType',
								'wp_template',
								templateId
							),
					original.id
				)
			)
			.toBe( false );
		for ( const name of [ 'IF', 'ELSE', 'Both' ] ) {
			await page.getByRole( 'button', { name, exact: true } ).click();
			if ( name === 'ELSE' ) {
				await expect(
					canvas( page ).getByText( 'OD IF CONTENT', { exact: true } )
				).toBeHidden();
			} else {
				await expect(
					canvas( page ).getByText( 'OD IF CONTENT', { exact: true } )
				).toBeVisible();
			}
			expect(
				await page.evaluate(
					( templateId ) =>
						wp.data
							.select( 'core' )
							.hasEditsForEntityRecord(
								'postType',
								'wp_template',
								templateId
							),
					original.id
				)
			).toBe( false );
		}
		await page.reload();
		await ready( page );
		const saved = await page.evaluate( () =>
			wp.data
				.select( 'core/block-editor' )
				.getBlocks()
				.find( ( b ) => b.name === 'od-conditional/conditional' )
		);
		expect( saved.isValid ).toBe( true );
		expect( saved.innerBlocks ).toHaveLength( 2 );
		await expect(
			canvas( page ).getByText( 'OD IF CONTENT', { exact: true } )
		).toBeVisible();
	} finally {
		await page.evaluate( async ( template ) => {
			if ( template.wp_id ) {
				await wp.apiFetch( {
					path: `/wp/v2/templates/${ template.id }`,
					method: 'POST',
					data: { content: template.content.raw },
				} );
			} else {
				await wp.apiFetch( {
					path: `/wp/v2/templates/${ template.id }?force=true`,
					method: 'DELETE',
				} );
			}
		}, original );
	}
} );

test( '新規挿入の IF-only、条件設定、複製、ネスト、リストビュー、キーボード', async ( {
	page,
} ) => {
	await login( page );
	await page.goto( '/wp-admin/post-new.php' );
	await ready( page );
	const id = await page.evaluate( () => {
		const block = wp.blocks.createBlock( 'od-conditional/conditional' );
		wp.data.dispatch( 'core/block-editor' ).insertBlocks( block );
		wp.data.dispatch( 'core/block-editor' ).selectBlock( block.clientId );
		return block.clientId;
	} );
	await expect
		.poll( () => branches( page, id ) )
		.toEqual( [ 'od-conditional/if' ] );
	if (
		! ( await page
			.getByRole( 'button', { name: 'Add condition', exact: true } )
			.count() )
	) {
		await page
			.getByRole( 'button', { name: 'Settings', exact: true } )
			.click();
	}

	await page
		.getByRole( 'combobox', { name: 'Page type', exact: true } )
		.selectOption( 'request/category_archive' );
	await page
		.getByRole( 'checkbox', {
			name: 'Invert condition (NOT)',
			exact: true,
		} )
		.check();
	await page
		.getByRole( 'button', { name: 'Add condition', exact: true } )
		.click();
	await page
		.getByRole( 'combobox', { name: 'Page type', exact: true } )
		.nth( 1 )
		.selectOption( 'request/tag_archive' );
	await page
		.getByRole( 'combobox', { name: 'Match conditions', exact: true } )
		.selectOption( 'OR' );
	await page.getByRole( 'button', { name: 'Add ELSE', exact: true } ).click();
	const elseChild = await page.evaluate( ( clientId ) => {
		const branch = wp.data
			.select( 'core/block-editor' )
			.getBlocks( clientId )[ 1 ];
		const child = wp.blocks.createBlock( 'core/paragraph', {
			content: 'OD LIST SELECTION',
		} );
		wp.data
			.dispatch( 'core/block-editor' )
			.insertBlocks( child, 0, branch.clientId );
		return child.clientId;
	}, id );
	await selectParent( page, id );
	await page.getByRole( 'button', { name: 'IF', exact: true } ).click();
	await page
		.getByRole( 'button', {
			name: /Document Overview|List View/,
			exact: true,
		} )
		.click();
	const tree = page.getByRole( 'treegrid', {
		name: 'Block navigation structure',
	} );
	await tree.locator( `a[href="#block-${ id }"]` ).press( 'ArrowRight' );
	const elseId = await page.evaluate(
		( clientId ) =>
			wp.data.select( 'core/block-editor' ).getBlocks( clientId )[ 1 ]
				.clientId,
		id
	);
	await tree.locator( `a[href="#block-${ elseId }"]` ).press( 'ArrowRight' );
	await tree.locator( `a[href="#block-${ elseChild }"]` ).click();
	await expect(
		canvas( page ).getByText( 'OD LIST SELECTION', { exact: true } )
	).toBeVisible();
	// リストビュー選択後、非表示側の編集可能な子へフォーカスできる。
	await canvas( page ).locator( `[data-block="${ elseChild }"]` ).focus();
	await expect(
		canvas( page ).locator( `[data-block="${ elseChild }"]` )
	).toBeFocused();
	await page.evaluate( ( clientId ) => {
		const store = wp.data.select( 'core/block-editor' );
		const block = store.getBlock( clientId );
		wp.data
			.dispatch( 'core/block-editor' )
			.insertBlocks( wp.blocks.cloneBlock( block ) );
		const branch = store.getBlocks( clientId )[ 0 ];
		wp.data
			.dispatch( 'core/block-editor' )
			.insertBlocks(
				wp.blocks.createBlock( 'od-conditional/conditional' ),
				0,
				branch.clientId
			);
	}, id );
	await expect
		.poll( () =>
			page.evaluate(
				() =>
					wp.data
						.select( 'core/block-editor' )
						.getBlocks()
						.filter(
							( b ) => b.name === 'od-conditional/conditional'
						).length
			)
		)
		.toBe( 2 );
	const movedId = await page.evaluate( () => {
		const blocks = wp.data.select( 'core/block-editor' ).getBlocks();
		const last = blocks[ blocks.length - 1 ].clientId;
		wp.data
			.dispatch( 'core/block-editor' )
			.moveBlocksToPosition( [ last ], '', '', 0 );
		return last;
	} );
	await expect
		.poll( () =>
			page.evaluate(
				() =>
					wp.data.select( 'core/block-editor' ).getBlocks()[ 0 ]
						.clientId
			)
		)
		.toBe( movedId );
	const group = await page.evaluate(
		( clientId ) =>
			wp.data.select( 'core/block-editor' ).getBlockAttributes( clientId )
				.conditionGroup,
		id
	);
	expect( group.operator ).toBe( 'OR' );
	expect( group.conditions[ 0 ].negate ).toBe( true );
	await page.evaluate( async () => {
		wp.data
			.dispatch( 'core/editor' )
			.editPost( { title: 'OD UI settings E2E' } );
		await wp.data.dispatch( 'core/editor' ).savePost();
	} );
	await page.reload();
	await ready( page );
	expect(
		await page.evaluate(
			() =>
				wp.data.select( 'core/block-editor' ).getBlocks()[ 0 ]
					.attributes.conditionGroup
		)
	).toEqual( group );
} );

test( '実アーカイブと無効化時の両分岐露出・データ保持', async ( {
	page,
	request,
} ) => {
	await login( page );
	await page.goto( '/wp-admin/post-new.php' );
	await ready( page );
	const fixture = await page.evaluate( async () => {
		const slug = `od-e2e-${ Date.now() }`;
		const attrs = {
			schemaVersion: 1,
			enabled: true,
			conditionGroup: {
				operator: 'AND',
				conditions: [
					{
						id: 'rule-1',
						type: 'request/category_archive',
						operator: 'is',
						value: true,
						negate: false,
					},
				],
			},
		};
		const content = `<!-- wp:od-conditional/conditional ${ JSON.stringify( attrs ) } --><!-- wp:od-conditional/if --><!-- wp:paragraph --><p>OD PUBLIC IF</p><!-- /wp:paragraph --><!-- /wp:od-conditional/if --><!-- wp:od-conditional/else --><!-- wp:paragraph --><p>OD PUBLIC ELSE</p><!-- /wp:paragraph --><!-- /wp:od-conditional/else --><!-- /wp:od-conditional/conditional -->`;
		const category = await wp.apiFetch( {
			path: '/wp/v2/categories',
			method: 'POST',
			data: { name: slug, slug },
		} );
		const tag = await wp.apiFetch( {
			path: '/wp/v2/tags',
			method: 'POST',
			data: { name: slug, slug },
		} );
		const post = await wp.apiFetch( {
			path: '/wp/v2/posts',
			method: 'POST',
			data: {
				title: slug,
				status: 'publish',
				categories: [ category.id ],
				tags: [ tag.id ],
				content,
			},
		} );
		const templates = [];
		for ( const type of [ 'category', 'tag' ] ) {
			templates.push(
				await wp.apiFetch( {
					path: '/wp/v2/templates',
					method: 'POST',
					data: {
						slug: `${ type }-${ slug }`,
						title: slug,
						content,
						status: 'publish',
					},
				} )
			);
		}
		return { category, tag, post, templates, content };
	} );
	try {
		const categoryHtml = await (
			await request.get( fixture.category.link )
		).text();
		expect( categoryHtml ).toContain( 'OD PUBLIC IF' );
		expect( categoryHtml ).not.toContain( 'OD PUBLIC ELSE' );
		const tagHtml = await ( await request.get( fixture.tag.link ) ).text();
		expect( tagHtml ).toContain( 'OD PUBLIC ELSE' );
		expect( tagHtml ).not.toContain( 'OD PUBLIC IF' );
		expect( categoryHtml ).not.toContain(
			'plugins/od-conditional-blocks/build/'
		);
		await page.evaluate( async () =>
			wp.apiFetch( {
				path: '/wp/v2/plugins/od-conditional-blocks/od-conditional-blocks',
				method: 'POST',
				data: { status: 'inactive' },
			} )
		);
		const stopped = await (
			await request.get( fixture.category.link )
		).text();
		expect( stopped ).toContain( 'OD PUBLIC IF' );
		expect( stopped ).toContain( 'OD PUBLIC ELSE' );
		const saved = await page.evaluate(
			async ( id ) =>
				wp.apiFetch( { path: `/wp/v2/posts/${ id }?context=edit` } ),
			fixture.post.id
		);
		expect( saved.content.raw ).toBe( fixture.content );
	} finally {
		await page.evaluate( async ( f ) => {
			await wp.apiFetch( {
				path: '/wp/v2/plugins/od-conditional-blocks/od-conditional-blocks',
				method: 'POST',
				data: { status: 'active' },
			} );
			for ( const template of f.templates ) {
				await wp.apiFetch( {
					path: `/wp/v2/templates/${ template.id }?force=true`,
					method: 'DELETE',
				} );
			}
			await wp.apiFetch( {
				path: `/wp/v2/posts/${ f.post.id }?force=true`,
				method: 'DELETE',
			} );
			await wp.apiFetch( {
				path: `/wp/v2/categories/${ f.category.id }?force=true`,
				method: 'DELETE',
			} );
			await wp.apiFetch( {
				path: `/wp/v2/tags/${ f.tag.id }?force=true`,
				method: 'DELETE',
			} );
		}, fixture );
	}
} );

test( '日本語のブロック名・ツールバーと最小限の分岐ラベル', async ( {
	page,
} ) => {
	await login( page );
	await page.goto( '/wp-admin/post-new.php' );
	await ready( page );
	await page.evaluate( async () =>
		wp.apiFetch( {
			path: '/wp/v2/users/me',
			method: 'POST',
			data: { locale: 'ja' },
		} )
	);
	try {
		await page.goto( '/wp-admin/post-new.php' );
		await ready( page );
		await seed( page );
		const conditionType = page.getByRole( 'combobox', {
			name: '表示しているページの種類',
			exact: true,
		} );
		if ( ! ( await conditionType.count() ) ) {
			await page
				.getByRole( 'button', { name: '設定', exact: true } )
				.click();
		}
		await expect(
			conditionType.getByRole( 'option', {
				name: '投稿が指定カテゴリーに属する',
				exact: true,
			} )
		).toHaveCount( 1 );
		await conditionType.selectOption( 'request/post_category' );
		await expect(
			page.getByRole( 'combobox', {
				name: 'カテゴリーを追加',
				exact: true,
			} )
		).toBeVisible();
		await expect(
			canvas( page ).locator( '.od-branch-label' )
		).toBeHidden();
		await expect(
			canvas( page ).locator( '.od-conditional-label' )
		).toHaveCount( 0 );
		await expect(
			canvas( page ).getByText(
				'ELSE はありません。条件に一致しない場合は何も出力しません。',
				{ exact: true }
			)
		).toHaveCount( 0 );
		await expect(
			canvas( page ).locator( '[data-type="od-conditional/conditional"]' )
		).toHaveAttribute( 'data-title', '条件分岐' );
		await expect(
			page.getByRole( 'button', { name: '両方', exact: true } )
		).toBeVisible();
		await expect(
			page.getByRole( 'button', { name: 'ELSE を追加', exact: true } )
		).toBeVisible();
		await page
			.getByRole( 'button', { name: 'ELSE を追加', exact: true } )
			.click();
		await expect(
			canvas( page ).locator( '.od-branch-else > .od-branch-label' )
		).toBeHidden();
		await page.getByRole( 'button', { name: '両方', exact: true } ).click();
		for ( const branch of [ 'if', 'else' ] ) {
			const label = canvas( page ).locator(
				`.od-branch-${ branch } > .od-branch-label`
			);
			await expect( label ).toBeVisible();
			await expect( label ).toHaveText( branch.toUpperCase() );
			await expect( label ).toHaveCSS( 'position', 'absolute' );
		}
	} finally {
		await page.evaluate( async () =>
			wp.apiFetch( {
				path: '/wp/v2/users/me',
				method: 'POST',
				data: { locale: 'en_US' },
			} )
		);
	}
} );

for ( const type of [ 'request/category_term', 'request/post_category' ] ) {
	test( `${ type }: カテゴリーを REST 候補から選択して保存・再読込する`, async ( {
		page,
	} ) => {
		await login( page );
		await page.goto( '/wp-admin/post-new.php' );
		await ready( page );
		const category = await page.evaluate( async () =>
			wp.apiFetch( {
				path: '/wp/v2/categories',
				method: 'POST',
				data: { name: `OD picker ${ Date.now() }` },
			} )
		);
		try {
			const id = await seed( page );
			if (
				! ( await page
					.getByRole( 'combobox', { name: 'Page type', exact: true } )
					.count() )
			) {
				await page
					.getByRole( 'button', { name: 'Settings', exact: true } )
					.click();
			}
			await page
				.getByRole( 'combobox', { name: 'Page type', exact: true } )
				.selectOption( type );
			const picker = page.getByRole( 'combobox', {
				name:
					type === 'request/post_category'
						? 'Add category'
						: 'Add archive target',
				exact: true,
			} );
			await Promise.all( [
				page.waitForResponse( ( response ) => {
					const url = new URL( response.url() );
					return (
						url.pathname.includes( '/wp/v2/categories' ) &&
						url.searchParams.get( 'search' ) === category.name &&
						response.ok()
					);
				} ),
				picker.fill( category.name ),
			] );
			await expect(
				page.getByRole( 'option', { name: category.name, exact: true } )
			).toBeVisible();
			await picker.press( 'ArrowDown' );
			await picker.press( 'Enter' );
			expect(
				await page.evaluate(
					( clientId ) =>
						wp.data
							.select( 'core/block-editor' )
							.getBlockAttributes( clientId ).conditionGroup
							.conditions[ 0 ].value,
					id
				)
			).toEqual( [ category.id ] );
			const invert = page.getByRole( 'checkbox', {
				name: 'Invert condition (NOT)',
				exact: true,
			} );
			await expect( async () => {
				if ( ! ( await invert.isVisible() ) ) {
					await page
						.getByRole( 'button', {
							name: 'Settings',
							exact: true,
						} )
						.click();
				}
				await invert.focus();
				if ( ! ( await invert.isChecked() ) ) {
					await invert.press( 'Space' );
				}
				await expect( invert ).toBeChecked();
			} ).toPass( { timeout: 30000 } );
			const savedId = await page.evaluate( async () => {
				wp.data
					.dispatch( 'core/editor' )
					.editPost( { title: 'OD category condition E2E' } );
				await wp.data.dispatch( 'core/editor' ).savePost();
				return wp.data.select( 'core/editor' ).getCurrentPostId();
			} );
			await page.reload();
			await ready( page );
			const block = await page.evaluate( () =>
				wp.data
					.select( 'core/block-editor' )
					.getBlocks()
					.find(
						( item ) => item.name === 'od-conditional/conditional'
					)
			);
			expect( block.isValid ).toBe( true );
			expect(
				block.attributes.conditionGroup.conditions[ 0 ]
			).toMatchObject( {
				type,
				operator: 'in',
				value: [ category.id ],
				negate: true,
			} );
			await page.evaluate(
				async ( postId ) =>
					wp.apiFetch( {
						path: `/wp/v2/posts/${ postId }?force=true`,
						method: 'DELETE',
					} ),
				savedId
			);
		} finally {
			await page.evaluate(
				async ( categoryId ) =>
					wp.apiFetch( {
						path: `/wp/v2/categories/${ categoryId }?force=true`,
						method: 'DELETE',
					} ),
				category.id
			);
		}
	} );
}
