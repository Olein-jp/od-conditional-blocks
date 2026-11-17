<?php
// This file is generated. Do not modify it manually.
return array(
	'conditional' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'od-conditional/conditional',
		'version' => '0.1.0',
		'title' => 'Conditional',
		'category' => 'design',
		'icon' => 'randomize',
		'textdomain' => 'od-conditional-blocks',
		'editorScript' => 'file:./index.js',
		'supports' => array(
			'html' => false
		),
		'description' => 'Edit IF and ELSE content with server-side page conditions.',
		'allowedBlocks' => array(
			'od-conditional/if',
			'od-conditional/else'
		),
		'editorStyle' => 'file:./index.css',
		'attributes' => array(
			'schemaVersion' => array(
				'type' => 'number',
				'default' => 1
			),
			'enabled' => array(
				'type' => 'boolean',
				'default' => true
			),
			'label' => array(
				'type' => 'string',
				'default' => ''
			),
			'conditionGroup' => array(
				'type' => 'object',
				'default' => array(
					'operator' => 'AND',
					'conditions' => array(
						array(
							'id' => 'rule-1',
							'type' => '',
							'operator' => 'is',
							'value' => true,
							'negate' => false
						)
					)
				)
			)
		)
	),
	'else' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'od-conditional/else',
		'version' => '0.1.0',
		'title' => 'ELSE',
		'category' => 'design',
		'icon' => 'randomize',
		'textdomain' => 'od-conditional-blocks',
		'editorScript' => 'file:./index.js',
		'supports' => array(
			'html' => false,
			'inserter' => false,
			'multiple' => true,
			'reusable' => false,
			'lock' => false
		),
		'parent' => array(
			'od-conditional/conditional'
		),
		'attributes' => array(
			'lock' => array(
				'type' => 'object',
				'default' => array(
					'move' => true,
					'remove' => false
				)
			)
		)
	),
	'if' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'od-conditional/if',
		'version' => '0.1.0',
		'title' => 'IF',
		'category' => 'design',
		'icon' => 'randomize',
		'textdomain' => 'od-conditional-blocks',
		'editorScript' => 'file:./index.js',
		'supports' => array(
			'html' => false,
			'inserter' => false,
			'multiple' => true,
			'reusable' => false,
			'lock' => false
		),
		'parent' => array(
			'od-conditional/conditional'
		),
		'attributes' => array(
			'lock' => array(
				'type' => 'object',
				'default' => array(
					'move' => true,
					'remove' => true
				)
			)
		)
	)
);
