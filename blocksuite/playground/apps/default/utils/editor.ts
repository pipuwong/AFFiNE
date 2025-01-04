import type { EditorHost, ExtensionType } from '@blocksuite/block-std';
import {
  CommunityCanvasTextFonts,
  DocModeExtension,
  DocModeProvider,
  EditorSettingExtension,
  FontConfigExtension,
  GenerateDocUrlExtension,
  GenerateDocUrlProvider,
  NotificationExtension,
  OverrideThemeExtension,
  ParseDocUrlExtension,
  RefNodeSlotsProvider,
  SpecProvider,
} from '@blocksuite/blocks';
import { AffineEditorContainer } from '@blocksuite/presets';
import type { Workspace } from '@blocksuite/store';

import { AttachmentViewerPanel } from '../../_common/components/attachment-viewer-panel.js';
import { CollabDebugMenu } from '../../_common/components/collab-debug-menu.js';
import { DocsPanel } from '../../_common/components/docs-panel.js';
import { LeftSidePanel } from '../../_common/components/left-side-panel.js';
import {
  getDocFromUrlParams,
  listenHashChange,
  setDocModeFromUrlParams,
} from '../../_common/history.js';
import {
  mockDocModeService,
  mockEditorSetting,
  mockGenerateDocUrlService,
  mockNotificationService,
  mockParseDocUrlService,
  mockPeekViewExtension,
  themeExtension,
} from '../../_common/mock-services.js';
import { getExampleSpecs } from '../specs-examples/index.js';

export async function mountDefaultDocEditor(collection: Workspace) {
  const app = document.getElementById('app');
  if (!app) return;

  const url = new URL(location.toString());
  const doc = getDocFromUrlParams(collection, url);

  const attachmentViewerPanel = new AttachmentViewerPanel();

  const editor = new AffineEditorContainer();
  const specs = getExampleSpecs();
  editor.pageSpecs = patchPageRootSpec([...specs.pageModeSpecs]);
  editor.edgelessSpecs = patchPageRootSpec([...specs.edgelessModeSpecs]);

  SpecProvider.getInstance().extendSpec('edgeless:preview', [
    OverrideThemeExtension(themeExtension),
  ]);
  editor.doc = doc;
  editor.mode = 'page';
  editor.std
    .get(RefNodeSlotsProvider)
    .docLinkClicked.on(({ pageId: docId }) => {
      const target = collection.getDoc(docId);
      if (!target) {
        throw new Error(`Failed to jump to doc ${docId}`);
      }

      const url = editor.std
        .get(GenerateDocUrlProvider)
        .generateDocUrl(target.id);
      if (url) history.pushState({}, '', url);

      target.load();
      editor.doc = target;
    });

  app.append(editor);
  await editor.updateComplete;
  const modeService = editor.host!.std.get(DocModeProvider);
  editor.mode = modeService.getPrimaryMode(doc.id);
  setDocModeFromUrlParams(modeService, url.searchParams, doc.id);
  editor.slots.docUpdated.on(({ newDocId }) => {
    editor.mode = modeService.getPrimaryMode(newDocId);
  });

  const leftSidePanel = new LeftSidePanel();

  const docsPanel = new DocsPanel();
  docsPanel.editor = editor;

  const collabDebugMenu = new CollabDebugMenu();
  collabDebugMenu.collection = collection;
  collabDebugMenu.editor = editor;
  collabDebugMenu.leftSidePanel = leftSidePanel;
  collabDebugMenu.docsPanel = docsPanel;

  document.body.append(attachmentViewerPanel);
  document.body.append(leftSidePanel);
  document.body.append(collabDebugMenu);

  // debug info
  window.editor = editor;
  window.doc = doc;
  Object.defineProperty(globalThis, 'host', {
    get() {
      return document.querySelector<EditorHost>('editor-host');
    },
  });
  Object.defineProperty(globalThis, 'std', {
    get() {
      return document.querySelector<EditorHost>('editor-host')?.std;
    },
  });

  listenHashChange(collection, editor, docsPanel);

  return editor;

  function patchPageRootSpec(spec: ExtensionType[]) {
    const setEditorModeCallBack = editor.switchEditor.bind(editor);
    const getEditorModeCallback = () => editor.mode;
    const newSpec: typeof spec = [
      ...spec,
      DocModeExtension(
        mockDocModeService(getEditorModeCallback, setEditorModeCallBack)
      ),
      OverrideThemeExtension(themeExtension),
      ParseDocUrlExtension(mockParseDocUrlService(collection)),
      GenerateDocUrlExtension(mockGenerateDocUrlService(collection)),
      NotificationExtension(mockNotificationService(editor)),
      FontConfigExtension(CommunityCanvasTextFonts),
      mockPeekViewExtension(attachmentViewerPanel),
      EditorSettingExtension(mockEditorSetting()),
    ];
    return newSpec;
  }
}
