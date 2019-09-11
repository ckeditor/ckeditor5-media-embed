/**
 * @license Copyright (c) 2003-2019, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

/**
 * @module media-embed/mediaembedediting
 */

import Plugin from '@ckeditor/ckeditor5-core/src/plugin';

import { modelToViewUrlAttributeConverter } from './converters';
import MediaEmbedCommand from './mediaembedcommand';
import MediaRegistry from './mediaregistry';
import { toMediaWidget, createMediaFigureElement } from './utils';

import '../theme/mediaembedediting.css';

/**
 * The media embed editing feature.
 *
 * @extends module:core/plugin~Plugin
 */
export default class MediaEmbedEditing extends Plugin {
	/**
	 * @inheritDoc
	 */
	static get pluginName() {
		return 'MediaEmbedEditing';
	}

	/**
	 * @inheritDoc
	 */
	constructor(editor) {
		super(editor);

		editor.config.define('mediaEmbed', {
			providers: [
				{
					name: 'vidyard',
					url: /^salesforce\.vidyard\.com\/watch\/([\w-]+)/,
					html: match => {
						const id = match[1];

						return (
							`<iframe class="vidyard_iframe" src="//play.vidyard.com/${id}.html?v=3.1.1" width="640" height="360" scrolling="no" frameborder="0" allowtransparency="true" allowfullscreen></iframe>`
						);
					}
				},
			]
		});

		/**
		 * The media registry managing the media providers in the editor.
		 *
		 * @member {module:media-embed/mediaregistry~MediaRegistry} #registry
		 */
		this.registry = new MediaRegistry(editor.locale, editor.config.get('mediaEmbed'));
	}

	/**
	 * @inheritDoc
	 */
	init() {
		const editor = this.editor;
		const schema = editor.model.schema;
		const t = editor.t;
		const conversion = editor.conversion;
		const renderMediaPreview = editor.config.get('mediaEmbed.previewsInData');
		const registry = this.registry;

		editor.commands.add('mediaEmbed', new MediaEmbedCommand(editor));

		// Configure the schema.
		schema.register('media', {
			isObject: true,
			isBlock: true,
			allowWhere: '$block',
			allowAttributes: ['url']
		});

		// Model -> Data
		conversion.for('dataDowncast').elementToElement({
			model: 'media',
			view: (modelElement, viewWriter) => {
				const url = modelElement.getAttribute('url');

				return createMediaFigureElement(viewWriter, registry, url, {
					renderMediaPreview: url && renderMediaPreview
				});
			}
		});

		// Model -> Data (url -> data-oembed-url)
		conversion.for('dataDowncast').add(
			modelToViewUrlAttributeConverter(registry, {
				renderMediaPreview
			}));

		// Model -> View (element)
		conversion.for('editingDowncast').elementToElement({
			model: 'media',
			view: (modelElement, viewWriter) => {
				const url = modelElement.getAttribute('url');
				const figure = createMediaFigureElement(viewWriter, registry, url, {
					renderForEditingView: true
				});

				return toMediaWidget(figure, viewWriter, t('media widget'));
			}
		});

		// Model -> View (url -> data-oembed-url)
		conversion.for('editingDowncast').add(
			modelToViewUrlAttributeConverter(registry, {
				renderForEditingView: true
			}));

		// View -> Model (data-oembed-url -> url)
		conversion.for('upcast')
			// Upcast semantic media.
			.elementToElement({
				view: {
					name: 'oembed',
					attributes: {
						url: true
					}
				},
				model: (viewMedia, modelWriter) => {
					const url = viewMedia.getAttribute('url');

					if (registry.hasMedia(url)) {
						return modelWriter.createElement('media', { url });
					}
				}
			})
			// Upcast non-semantic media.
			.elementToElement({
				view: {
					name: 'div',
					attributes: {
						'data-oembed-url': true
					}
				},
				model: (viewMedia, modelWriter) => {
					const url = viewMedia.getAttribute('data-oembed-url');

					if (registry.hasMedia(url)) {
						return modelWriter.createElement('media', { url });
					}
				}
			});
	}
}
